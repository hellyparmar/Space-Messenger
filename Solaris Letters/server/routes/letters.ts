import { Router, Response } from 'express';
import { prisma } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import rateLimit from 'express-rate-limit';

const router = Router();

const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: (req) => {
    return (req as AuthRequest).userId || 'anonymous';
  },
  validate: { trustProxy: false },
  handler: (req, res) => {
    res.status(429).json({ error: "Transmission limit reached. Wait before sending another." });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

function sanitizeInput(text: any, maxLength?: number): string {
  if (typeof text !== 'string') return '';
  const stripped = text.replace(/<[^>]*>/g, '');
  if (maxLength !== undefined) {
    return stripped.slice(0, maxLength);
  }
  return stripped;
}

// GET /api/letters — inbox + sent for current user
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const userId = req.userId!;

    const include = {
      sender:   { select: { id: true, cosmic_id: true, display_name: true } },
      receiver: { select: { id: true, cosmic_id: true, display_name: true } },
    };

    // SENT: all letters the user has sent — including scheduled future ones
    // (they should always see their outbox regardless of delivery date)
    const sent = await prisma.letter.findMany({
      where: {
        sender_id:   userId,
        is_archived: false,
      },
      orderBy: { sent_at: 'desc' },
      include,
    });

    // Retrieve blocked user IDs
    const blockedEntries = await prisma.$queryRawUnsafe<any[]>(
      `SELECT target_id FROM blackhole_entries WHERE user_id = $1`,
      userId
    );
    const blockedUserIds = blockedEntries.map(e => e.target_id);

    // RECEIVED: only letters delivered to the user that are due now or in the past
    // (future-scheduled letters stay hidden until delivery time)
    const received = await prisma.letter.findMany({
      where: {
        recipient_id: userId,
        sender_id:    { notIn: [userId, ...blockedUserIds] }, // exclude future-self and blocked users
        is_archived:  false,
        deliver_at:   { lte: now },
      },
      orderBy: { sent_at: 'desc' },
      include,
    });

    // Future-self letters: sent TO yourself — show in both tabs
    // They appear in 'sent' already. For received, only show if deliver_at has passed.
    const futureSelfDelivered = await prisma.letter.findMany({
      where: {
        sender_id:    userId,
        recipient_id: userId,
        is_archived:  false,
        deliver_at:   { lte: now },
        is_future_self: true,
      },
      orderBy: { sent_at: 'desc' },
      include,
    });

    // Merge: deduplicate using a Map keyed by id
    const allMap = new Map<string, any>();
    for (const l of [...sent, ...received, ...futureSelfDelivered]) {
      allMap.set(l.id, l);
    }

    return res.json(Array.from(allMap.values()));
  } catch (err) {
    console.error('[letters GET]', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/letters — send a letter
router.post('/', authenticate, messageLimiter, async (req: AuthRequest, res: Response) => {
  try {
    let { recipient_id, body, paper_skin, stickers, is_future_self, deliver_at } = req.body;
    
    if (is_future_self) {
      recipient_id = req.userId;
    }

    // 1. Message body validations
    if (typeof body !== 'string' || !body.trim()) {
      return res.status(400).json({ error: "Message body must be a non-empty string." });
    }
    if (body.length > 2000) {
      return res.status(400).json({ error: "Message too long. Maximum 2000 characters." });
    }

    // 2. Recipient validations
    if (!recipient_id) {
      return res.status(400).json({ error: "recipient_id is required." });
    }
    if (recipient_id === req.userId && !is_future_self) {
      return res.status(400).json({ error: "Cannot send a transmission to yourself." });
    }

    const receiver = await prisma.user.findUnique({ where: { id: recipient_id } });
    if (!receiver) {
      return res.status(400).json({ error: "Receiver not found." });
    }

    // 3. Database rate limit validation (past 60 seconds)
    const sixtySecondsAgo = new Date(Date.now() - 60 * 1000);
    const recentCount = await prisma.letter.count({
      where: {
        sender_id: req.userId!,
        sent_at: { gte: sixtySecondsAgo }
      }
    });
    if (recentCount >= 5) {
      return res.status(429).json({ error: "Transmission limit reached. Wait before sending another." });
    }

    const cleanBody = sanitizeInput(body, 2000);

    const letter = await prisma.letter.create({
      data: {
        sender_id:     req.userId!,
        recipient_id:  receiver.id,
        body:          cleanBody,
        paper_skin:    paper_skin     || 'parchment',
        stickers:      stickers       || [],
        is_future_self: is_future_self || false,
        deliver_at:    deliver_at ? new Date(deliver_at) : new Date(),
      },
      include: {
        sender:   { select: { id: true, cosmic_id: true, display_name: true } },
        receiver: { select: { id: true, cosmic_id: true, display_name: true } },
      },
    });

    const payload = {
      ...letter,
      from: letter.sender.display_name,
      fromCosmicId: letter.sender.cosmic_id,
      letterId: letter.id,
    };

    // For instant letters (deliver_at <= now), emit immediately.
    // Scheduled future letters will be handled by the persistent scheduler (scheduler.ts).
    const now = new Date();
    if (letter.deliver_at <= now) {
      // Check if receiver has blocked sender
      const blockCheck = await prisma.$queryRawUnsafe<any[]>(
        `SELECT 1 FROM blackhole_entries WHERE user_id = $1 AND target_id = $2`,
        receiver.id, req.userId!
      );
      if (blockCheck.length === 0) {
        req.app.get('io')?.to(receiver.id).emit('new_letter', payload);
      }
      // Mark as notified so scheduler skips it
      await prisma.letter.update({
        where: { id: letter.id },
        data: { notified_at: now },
      });
    }

    return res.status(201).json(letter);
  } catch (err) {
    console.error('[letters POST]', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/letters/:id/read — mark as read
router.patch('/:id/read', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const letter = await prisma.letter.findUnique({ where: { id: req.params.id as string } });
    if (!letter) return res.status(404).json({ message: 'Letter not found' });
    if (letter.recipient_id !== req.userId)
      return res.status(403).json({ message: 'Forbidden' });

    const updated = await prisma.letter.update({
      where: { id: req.params.id as string },
      data: { read_at: new Date() },
    });
    return res.json(updated);
  } catch (err) {
    console.error('[letters PATCH]', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/letters/stats — get stats for a friend
router.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const friendId = req.query.friendId as string;
    if (!friendId) return res.status(400).json({ message: 'friendId required' });
    const userId = req.userId!;

    const sent     = await prisma.letter.count({ where: { sender_id: userId,    recipient_id: friendId } });
    const received = await prisma.letter.count({ where: { sender_id: friendId,  recipient_id: userId } });
    const unread   = await prisma.letter.count({ where: { sender_id: friendId,  recipient_id: userId, read_at: null } });

    return res.json({ sent, received, unread });
  } catch (err) {
    console.error('[letters GET stats]', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
