import { Router, Response } from 'express';
import { prisma } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

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

    // RECEIVED: only letters delivered to the user that are due now or in the past
    // (future-scheduled letters stay hidden until delivery time)
    const received = await prisma.letter.findMany({
      where: {
        recipient_id: userId,
        sender_id:    { not: userId }, // exclude future-self (already in sent)
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
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    let { recipient_id, body, paper_skin, stickers, is_future_self, deliver_at } = req.body;
    
    if (is_future_self) {
      recipient_id = req.userId;
    }

    if (!recipient_id || !body)
      return res.status(400).json({ message: 'recipient_id and body required' });

    const receiver = await prisma.user.findUnique({ where: { id: recipient_id } });
    if (!receiver) return res.status(404).json({ message: 'Receiver not found' });

    const letter = await prisma.letter.create({
      data: {
        sender_id:     req.userId!,
        recipient_id:  receiver.id,
        body,
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
      req.app.get('io')?.to(receiver.id).emit('new_letter', payload);
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
    const letter = await prisma.letter.findUnique({ where: { id: req.params.id } });
    if (!letter) return res.status(404).json({ message: 'Letter not found' });
    if (letter.recipient_id !== req.userId)
      return res.status(403).json({ message: 'Forbidden' });

    const updated = await prisma.letter.update({
      where: { id: req.params.id },
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
