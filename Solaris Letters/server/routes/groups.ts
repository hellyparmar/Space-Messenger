import { Router, Response } from 'express';
import { prisma } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

function sanitizeInput(text: any, maxLength?: number): string {
  if (typeof text !== 'string') return '';
  const stripped = text.replace(/<[^>]*>/g, '');
  if (maxLength !== undefined) {
    return stripped.slice(0, maxLength);
  }
  return stripped;
}

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
      created_by:  m.group.created_by,
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
    const { name, theme_color, memberIds } = req.body;
    if (!name) return res.status(400).json({ message: 'name required' });

    const cleanName = sanitizeInput(name, 50);

    const membersData = [{ user_id: userId, role: 'owner' }];
    if (Array.isArray(memberIds)) {
      for (const mId of memberIds) {
        if (mId && typeof mId === 'string' && mId !== userId) {
          membersData.push({ user_id: mId, role: 'member' });
        }
      }
    }

    const group = await prisma.group.create({
      data: {
        name:        cleanName,
        theme_color: theme_color || '#7c3aed',
        created_by:  userId,
        members: {
          create: membersData
        },
      },
    });

    return res.status(201).json(group);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/groups/:id — delete group
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const groupId = req.params.id as string;

    const group = await prisma.group.findUnique({
      where: { id: groupId }
    });

    if (!group) return res.status(404).json({ error: 'Group not found' });
    console.log('[DELETE GROUP LOG] group.created_by:', group.created_by, 'type:', typeof group.created_by);
    console.log('[DELETE GROUP LOG] userId (req.userId):', userId, 'type:', typeof userId);
    if (group.created_by !== userId) {
      return res.status(403).json({ error: 'Only the creator can delete this group' });
    }

    await prisma.$transaction([
      prisma.groupMessage.deleteMany({ where: { group_id: groupId } }),
      prisma.groupMember.deleteMany({ where: { group_id: groupId } }),
      prisma.group.delete({ where: { id: groupId } }),
    ]);

    return res.json({ message: 'Group deleted successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/groups/:id/leave — leave the group
router.post('/:id/leave', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const groupId = req.params.id as string;
    await prisma.groupMember.delete({
      where: { group_id_user_id: { group_id: groupId, user_id: userId } }
    });
    return res.json({ message: 'Successfully left the group' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/groups/:id/members — add members to group (creator only)
router.post('/:id/members', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const groupId = req.params.id as string;
    const { memberIds } = req.body;

    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ error: 'memberIds array is required' });
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    if (group.created_by !== userId) {
      return res.status(403).json({ error: 'Only the creator can add members to this group' });
    }

    const existingMembers = await prisma.groupMember.findMany({
      where: { group_id: groupId, user_id: { in: memberIds } }
    });
    const existingUserIds = existingMembers.map(m => m.user_id);
    const newUserIds = memberIds.filter(id => !existingUserIds.includes(id));

    if (newUserIds.length > 0) {
      await prisma.groupMember.createMany({
        data: newUserIds.map(mId => ({
          group_id: groupId,
          user_id: mId,
          role: 'member'
        }))
      });
    }

    return res.json({ message: 'Members added successfully', addedCount: newUserIds.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/groups/:id/message — send message to group
router.post('/:id/message', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const groupId = req.params.id as string;
    const userId = req.userId!;

    // Authorization: Check if user is a member of the group
    const membership = await prisma.groupMember.findUnique({
      where: {
        group_id_user_id: { group_id: groupId, user_id: userId }
      }
    });
    if (!membership) {
      return res.status(403).json({ error: 'Access denied. You are not a member of this group.' });
    }

    const { content } = req.body;
    const cleanContent = sanitizeInput(content, 2000);
    const msg = await prisma.groupMessage.create({
      data: { group_id: groupId, sender_id: userId, content: cleanContent }
    });
    res.status(201).json({ message: msg });
  } catch (err: any) { res.status(500).json({ message: 'Request failed' }); }
});

// GET /api/groups/:id/messages — get group messages
router.get('/:id/messages', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const groupId = req.params.id as string;
    const userId = req.userId!;

    // Authorization: Check if user is a member of the group
    const membership = await prisma.groupMember.findUnique({
      where: {
        group_id_user_id: { group_id: groupId, user_id: userId }
      }
    });
    if (!membership) {
      return res.status(403).json({ error: 'Access denied. You are not a member of this group.' });
    }

    const messages = await prisma.groupMessage.findMany({
      where: { group_id: groupId },
      include: { sender: { select: { display_name:true, cosmic_id:true } } },
      orderBy: { created_at: 'asc' },
      take: 100
    });
    res.json({ messages });
  } catch (err: any) { res.status(500).json({ message: 'Request failed' }); }
});

export default router;
