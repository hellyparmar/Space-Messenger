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

// GET /api/friends — fetch friends via friendships table
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const friendships = await prisma.friendship.findMany({
      where: { user_id: userId },
      include: {
        friend: {
          select: { id: true, cosmic_id: true, display_name: true, bio: true, planet_type: true, unread_count: true }
        }
      },
      orderBy: { interaction_score: 'desc' },
    });

    // Count unread letters per friend
    const unreadCounts = await prisma.letter.groupBy({
      by: ['sender_id'],
      where: { recipient_id: userId, read_at: null },
      _count: true,
    });

    const friends = friendships.map(f => ({
      ...f.friend,
      username: f.friend.cosmic_id,
      displayName: f.friend.display_name,
      interactionCount: f.interaction_score,
      unreadCount: unreadCounts.find(c => c.sender_id === f.friend_id)?._count ?? 0,
    }));

    const dbAssignments = await prisma.planetAssignment.findMany({
      where: { user_id: userId },
      include: { friend: { select: { id: true, cosmic_id: true, display_name: true, bio: true } } }
    });


    const assignments = dbAssignments.map(a => ({
      planetName: a.planet_name,
      friend: {
        id: a.friend.id,
        username: a.friend.cosmic_id,
        displayName: a.friend.display_name,
        bio: a.friend.bio,
      }
    }));

    return res.json({ friends, assignments });
  } catch (err) {
    console.error('[friends]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/friends — add a friend (bidirectional)
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId   = req.userId!;
    const { friend_id } = req.body;
    if (!friend_id) return res.status(400).json({ message: 'friend_id required' });

    // Create both directions of the friendship
    await prisma.friendship.upsert({
      where: { user_id_friend_id: { user_id: userId, friend_id } },
      update: {},
      create: { user_id: userId, friend_id },
    });
    await prisma.friendship.upsert({
      where: { user_id_friend_id: { user_id: friend_id, friend_id: userId } },
      update: {},
      create: { user_id: friend_id, friend_id: userId },
    });

    return res.status(201).json({ message: 'Friendship established' });
  } catch (err) {
    console.error('[friends POST]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/friends/:friendId — remove friend + planet assignment
router.delete('/:friendId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const friendId = req.params.friendId as string;

    // Delete friendships
    await prisma.friendship.deleteMany({
      where: {
        OR: [
          { user_id: userId, friend_id: friendId },
          { user_id: friendId, friend_id: userId },
        ],
      },
    });

    // Delete planet assignments
    await prisma.planetAssignment.deleteMany({
      where: {
        OR: [
          { user_id: userId, friend_id: friendId },
          { user_id: friendId, friend_id: userId },
        ],
      },
    }).catch(() => {});

    res.json({ message: 'Friend removed' });
  } catch (err) {
    console.error('[friends DELETE]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ── NEW ROUTES: Requests and Assignments ──

router.post('/request', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { targetUsername } = req.body;
    const senderId = req.userId!;
    
    const target = await prisma.user.findUnique({ where: { cosmic_id: targetUsername } });
    if (!target) return res.status(404).json({ message: 'User not found' });
    if (target.id === senderId) return res.status(400).json({ message: 'Cannot add yourself' });
    
    const existing = await prisma.friendRequest.findFirst({
      where: { OR: [
        { sender_id: senderId, target_id: target.id },
        { sender_id: target.id, target_id: senderId }
      ]}
    });
    
    const existingFriend = await prisma.friendship.findFirst({
      where: { user_id: senderId, friend_id: target.id }
    });
    if (existingFriend) return res.status(409).json({ message: 'Already friends' });
    if (existing) return res.status(409).json({ message: existing.status === 'pending' ? 'Request already sent' : 'Already friends' });
    
    const request = await prisma.friendRequest.create({
      data: { sender_id: senderId, target_id: target.id, status: 'pending' }
    });
    res.status(201).json({ request });
  } catch (err: any) { res.status(500).json({ message: 'Request failed' }); }
});

router.get('/requests/incoming', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const requests = await prisma.friendRequest.findMany({
      where: { target_id: req.userId!, status: 'pending' },
      include: { sender: { select: { id:true, display_name:true, cosmic_id:true } } }
    });
    res.json({ requests });
  } catch (err: any) { res.status(500).json({ message: 'Request failed' }); }
});

router.get('/requests/outgoing', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const requests = await prisma.friendRequest.findMany({
      where: {
        sender_id: req.userId!,
        status: { in: ['pending', 'accepted'] }
      },
      include: { target: { select: { id:true, display_name:true, cosmic_id:true } } }
    });
    res.json({ requests });
  } catch (err: any) { res.status(500).json({ message: 'Request failed' }); }
});

router.delete('/request/:id/cancel', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const request = await prisma.friendRequest.findUnique({
      where: { id: req.params.id as string }
    });
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.sender_id !== req.userId!) return res.status(403).json({ message: 'Forbidden' });

    await prisma.friendRequest.delete({ where: { id: req.params.id as string } });
    res.json({ message: 'Request cancelled' });
  } catch (err: any) { res.status(500).json({ message: 'Request failed' }); }
});

router.post('/request/:id/accept', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { planetName } = req.body;
    const request = await prisma.friendRequest.findUnique({
      where: { id: req.params.id as string }
    });
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.target_id !== req.userId!) return res.status(403).json({ message: 'Forbidden' });
    if (request.status !== 'pending') return res.status(400).json({ message: 'Request not pending' });

    const updatedRequest = await prisma.friendRequest.update({
      where: { id: req.params.id as string },
      data: { status: 'accepted' }
    });
    
    await prisma.friendship.upsert({
      where: { user_id_friend_id: { user_id: req.userId!, friend_id: updatedRequest.sender_id } },
      update: {},
      create: { user_id: req.userId!, friend_id: updatedRequest.sender_id },
    });
    
    if (planetName) {
      const cleanPlanetName = sanitizeInput(planetName, 50);
      await prisma.planetAssignment.upsert({
        where: { user_id_friend_id: { user_id: req.userId!, friend_id: updatedRequest.sender_id } },
        create: { user_id: req.userId!, friend_id: updatedRequest.sender_id, planet_name: cleanPlanetName },
        update: { planet_name: cleanPlanetName }
      });
    }
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ message: 'Request failed' }); }
});

router.post('/request/:id/finalize', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { planetName } = req.body;
    if (!planetName) return res.status(400).json({ message: 'planetName required' });
    
    const request = await prisma.friendRequest.findUnique({
      where: { id: req.params.id as string }
    });
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.sender_id !== req.userId!) return res.status(403).json({ message: 'Forbidden' });
    if (request.status !== 'accepted') return res.status(400).json({ message: 'Request is not in accepted state' });
    
    await prisma.friendRequest.update({
      where: { id: req.params.id as string },
      data: { status: 'active' }
    });
    
    await prisma.friendship.upsert({
      where: { user_id_friend_id: { user_id: req.userId!, friend_id: request.target_id } },
      update: {},
      create: { user_id: req.userId!, friend_id: request.target_id },
    });
    
    const cleanPlanetName = sanitizeInput(planetName, 50);
    await prisma.planetAssignment.upsert({
      where: { user_id_friend_id: { user_id: req.userId!, friend_id: request.target_id } },
      create: { user_id: req.userId!, friend_id: request.target_id, planet_name: cleanPlanetName },
      update: { planet_name: cleanPlanetName }
    });
    
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ message: 'Request failed' }); }
});

router.delete('/request/:id/decline', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const request = await prisma.friendRequest.findUnique({
      where: { id: req.params.id as string }
    });
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.target_id !== req.userId!) return res.status(403).json({ message: 'Forbidden' });

    await prisma.friendRequest.delete({ where: { id: req.params.id as string } });
    res.json({ message: 'Request declined' });
  } catch (err: any) { res.status(500).json({ message: 'Request failed' }); }
});

router.patch('/assign-planet', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { friendId, planetName } = req.body;
    const cleanPlanetName = sanitizeInput(planetName, 50);
    const assignment = await prisma.planetAssignment.upsert({
      where: { user_id_friend_id: { user_id: req.userId!, friend_id: friendId } },
      create: { user_id: req.userId!, friend_id: friendId, planet_name: cleanPlanetName },
      update: { planet_name: cleanPlanetName }
    });
    res.json({ assignment });
  } catch (err: any) { res.status(500).json({ message: 'Request failed' }); }
});

export default router;
