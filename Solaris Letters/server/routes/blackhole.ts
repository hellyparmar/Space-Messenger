import { Router, Response } from 'express';
import { prisma } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/blackhole — get all blackholed users for current user
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const entries = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM blackhole_entries WHERE user_id = $1 ORDER BY created_at DESC`,
      req.userId
    );
    return res.json(entries);
  } catch (err) {
    console.error('[blackhole GET]', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/blackhole — add a user to the black hole (block or remove)
// Body: { targetId, reason: 'removed' | 'blocked' }
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { targetId, reason = 'removed' } = req.body;
    if (!targetId) return res.status(400).json({ message: 'targetId required' });

    // Fetch target user info
    const target = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, display_name: true, cosmic_id: true },
    });
    if (!target) return res.status(404).json({ message: 'User not found' });

    // Upsert into blackhole_entries
    await prisma.$executeRawUnsafe(
      `INSERT INTO blackhole_entries (user_id, target_id, target_display_name, target_cosmic_id, reason)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, target_id) DO UPDATE SET reason = $5, created_at = now()`,
      userId, target.id, target.display_name, target.cosmic_id, reason
    );

    // Also remove friendship + planet assignment
    await prisma.friendship.deleteMany({
      where: {
        OR: [
          { user_id: userId, friend_id: targetId },
          { user_id: targetId, friend_id: userId },
        ],
      },
    });
    await prisma.planetAssignment.deleteMany({
      where: {
        OR: [
          { user_id: userId, friend_id: targetId },
          { user_id: targetId, friend_id: userId },
        ],
      },
    }).catch(() => {}); // ignore if no assignment

    return res.status(201).json({ message: 'User sent to black hole' });
  } catch (err) {
    console.error('[blackhole POST]', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/blackhole/:targetId — remove from black hole (unblock)
router.delete('/:targetId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM blackhole_entries WHERE user_id = $1 AND target_id = $2`,
      req.userId, req.params.targetId
    );
    return res.json({ message: 'Removed from black hole' });
  } catch (err) {
    console.error('[blackhole DELETE]', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
