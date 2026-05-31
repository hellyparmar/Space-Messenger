import { Router, Response } from 'express';
import { prisma } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/groups — fetch groups the user belongs to
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const memberships = await prisma.groupMember.findMany({
      where: { user_id: userId },
      include: {
        group: {
          include: {
            members: {
              include: { user: { select: { cosmic_id: true, display_name: true } } }
            }
          }
        }
      }
    });

    const groups = memberships.map(m => ({
      id:          m.group.id,
      name:        m.group.name,
      theme_color: m.group.theme_color,
      cosmic_position: m.group.cosmic_position,
      memberCount: m.group.members.length,
      members:     m.group.members.map(gm => ({ cosmic_id: gm.user.cosmic_id, display_name: gm.user.display_name })),
      role:        m.role,
    }));

    return res.json(groups);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/groups — create a group
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { name, theme_color } = req.body;
    if (!name) return res.status(400).json({ message: 'name required' });

    const group = await prisma.group.create({
      data: {
        name,
        theme_color: theme_color || '#7c3aed',
        created_by:  userId,
        members: { create: { user_id: userId, role: 'owner' } },
      },
    });

    return res.status(201).json(group);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/groups/:id/message — send message to group
router.post('/:id/message', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { content } = req.body;
    const msg = await prisma.groupMessage.create({
      data: { group_id: req.params.id, sender_id: req.userId!, content }
    });
    res.status(201).json({ message: msg });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

// GET /api/groups/:id/messages — get group messages
router.get('/:id/messages', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const messages = await prisma.groupMessage.findMany({
      where: { group_id: req.params.id },
      include: { sender: { select: { display_name:true, cosmic_id:true } } },
      orderBy: { created_at: 'asc' },
      take: 100
    });
    res.json({ messages });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

export default router;
