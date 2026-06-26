import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

if (typeof global.WebSocket === 'undefined') {
  (global as any).WebSocket = WebSocket;
}

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const router = Router();

function sanitizeInput(text: any, maxLength?: number): string {
  if (typeof text !== 'string') return '';
  const stripped = text.replace(/<[^>]*>/g, '');
  if (maxLength !== undefined) {
    return stripped.slice(0, maxLength);
  }
  return stripped;
}

// GET /api/users/check-userid?id=xxx  — PUBLIC, no auth required
router.get('/check-userid', async (req: Request, res: Response) => {
  try {
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Valid id query parameter required' });
    }
    const validFormat = /^[a-z0-9][a-z0-9_]{1,18}[a-z0-9]$/.test(id);
    if (!validFormat) {
      return res.json({ available: false, reason: 'invalid_format' });
    }
    const existingUser = await prisma.user.findFirst({ where: { cosmic_id: id.toLowerCase() } });
    return res.json({ available: !existingUser });
  } catch (err: any) {
    console.error('[check-userid] error:', err.message);
    return res.status(500).json({ error: 'Server error', message: 'Request failed' });
  }
});

// GET /api/users/search?q=searchterm
router.get('/search', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }
    const term = q.trim().toLowerCase();
    const selfId = req.user?.id;
    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: selfId } },
          {
            OR: [
              { display_name: { contains: term, mode: 'insensitive' } },
              { cosmic_id:    { contains: term, mode: 'insensitive' } },
            ],
          }
        ]
      },
      select: {
        id:           true,
        cosmic_id:    true,
        display_name: true,
        bio:          true,
        planet_type:  true,
      },
      take: 10,
    });
    // Add username alias so frontend can use either field
    const mapped = users.map(u => ({ ...u, username: u.cosmic_id }));
    return res.json({ users: mapped });
  } catch (err: any) {
    console.error('[search] error:', err.message);
    return res.status(500).json({ error: 'Search failed', message: 'Request failed' });
  }
});

// POST /api/users/sync — sync Supabase auth user to our database
router.post('/sync', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { display_name, cosmic_id } = req.body;
    const userId    = req.user!.id;
    const userEmail = req.user!.email || '';

    // Check if already synced
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (existing) {
      return res.json({ user: existing });
    }

    const sanitizedCosmicId = sanitizeInput(cosmic_id, 30);
    const sanitizedDisplayName = sanitizeInput(display_name, 50);

    // Check cosmic_id availability
    const baseId = sanitizedCosmicId || userEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 30);
    const cosmicIdExists = await prisma.user.findUnique({ where: { cosmic_id: baseId } });
    const finalCosmicId  = cosmicIdExists
      ? `${baseId}_${Date.now().toString().slice(-4)}`.slice(0, 30)
      : baseId;

    const user = await prisma.user.create({
      data: {
        id:           userId,
        cosmic_id:    finalCosmicId,
        display_name: sanitizedDisplayName || userEmail.split('@')[0].slice(0, 50),
      }
    });

    res.status(201).json({ user });
  } catch (err: any) {
    console.error('Sync error:', err);
    res.status(500).json({ message: 'Request failed' });
  }
});

// GET /api/users/me — get current user profile
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id }
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (err: any) {
    res.status(500).json({ message: 'Request failed' });
  }
});

// PATCH /api/users/me — update profile
router.patch('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { display_name, bio, cosmic_id, avatar_icon } = req.body;
    if (bio !== undefined && bio.length > 50) {
      return res.status(400).json({ message: 'Bio cannot exceed 50 characters.' });
    }
    const sanitizedDisplayName = display_name !== undefined ? sanitizeInput(display_name, 50) : undefined;
    const sanitizedCosmicId = cosmic_id !== undefined ? sanitizeInput(cosmic_id, 30) : undefined;
    const sanitizedBio = bio !== undefined ? sanitizeInput(bio, 50) : undefined;

    let cosmic_id_changes = undefined;
    if (sanitizedCosmicId !== undefined && sanitizedCosmicId.trim().length > 0) {
      const trimmedId = sanitizedCosmicId.trim().toLowerCase();
      const validFormat = /^[a-z0-9][a-z0-9_]{1,18}[a-z0-9]$/.test(trimmedId);
      if (!validFormat) {
        return res.status(400).json({ message: 'Cosmic ID must be 3-20 characters, start/end with letters/numbers, and use lowercase letters, numbers, and underscores only.' });
      }

      const existingUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
      if (existingUser && existingUser.cosmic_id !== trimmedId) {
        if (existingUser.cosmic_id_changes >= 3) {
          return res.status(400).json({ message: 'Cosmic ID change limit reached.' });
        }
        const cosmicIdExists = await prisma.user.findFirst({ where: { cosmic_id: trimmedId } });
        if (cosmicIdExists) {
          return res.status(400).json({ message: 'Cosmic ID is already taken.' });
        }
        cosmic_id_changes = existingUser.cosmic_id_changes + 1;
      }
    }

    const safeDisplayName = sanitizedDisplayName || sanitizeInput((req.user!.email || '').split('@')[0], 50);
    const safeCosmicId = sanitizedCosmicId || sanitizeInput((req.user!.email || '').split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_'), 30);

    const user = await prisma.user.upsert({
      where: { id: req.user!.id },
      update: {
        ...(sanitizedDisplayName !== undefined && { display_name: sanitizedDisplayName }),
        ...(sanitizedBio !== undefined && { bio: sanitizedBio }),
        ...(avatar_icon !== undefined && { avatar_icon }),
        ...(cosmic_id_changes !== undefined && { 
            cosmic_id: safeCosmicId,
            cosmic_id_changes
        }),
      },
      create: {
        id: req.user!.id,
        display_name: safeDisplayName,
        cosmic_id: safeCosmicId,
        bio: sanitizedBio !== undefined ? sanitizedBio : '',
        avatar_icon: avatar_icon || null,
        cosmic_id_changes: cosmic_id_changes !== undefined ? cosmic_id_changes : 0
      }
    });
    res.json({ user });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(400).json({ message: 'Cosmic ID is already taken.' });
    }
    res.status(500).json({ message: 'Request failed' });
  }
});

// DELETE /api/users/me — completely delete user account and all cosmic records
router.delete('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // 1. Transaction to delete all user records in proper order to avoid FK constraints
    await prisma.$transaction(async (tx) => {
      // friendships
      await tx.friendship.deleteMany({
        where: {
          OR: [
            { user_id: userId },
            { friend_id: userId }
          ]
        }
      });

      // planet assignments
      await tx.planetAssignment.deleteMany({
        where: {
          OR: [
            { user_id: userId },
            { friend_id: userId }
          ]
        }
      });

      // friend requests
      await tx.friendRequest.deleteMany({
        where: {
          OR: [
            { sender_id: userId },
            { target_id: userId }
          ]
        }
      });

      // group messages sent by user
      await tx.groupMessage.deleteMany({
        where: { sender_id: userId }
      });

      // group memberships of user
      await tx.groupMember.deleteMany({
        where: { user_id: userId }
      });

      // groups created by user
      const createdGroups = await tx.group.findMany({
        where: { created_by: userId },
        select: { id: true }
      });

      if (createdGroups.length > 0) {
        const groupIds = createdGroups.map(g => g.id);

        await tx.groupMessage.deleteMany({
          where: { group_id: { in: groupIds } }
        });

        await tx.groupMember.deleteMany({
          where: { group_id: { in: groupIds } }
        });

        await tx.group.deleteMany({
          where: { id: { in: groupIds } }
        });
      }

      // letters
      await tx.letter.deleteMany({
        where: {
          OR: [
            { sender_id: userId },
            { recipient_id: userId }
          ]
        }
      });

      // blackhole entries
      await tx.blackholeEntry.deleteMany({
        where: { user_id: userId }
      });

      // delete the user
      await tx.user.delete({
        where: { id: userId }
      });
    });

    // 2. Delete user from Supabase Auth Registry using the service role client
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteAuthError) {
      console.error('[delete-account] Supabase auth delete warning:', deleteAuthError.message);
      // We don't fail the request here, since their DB record is already deleted,
      // but logging it is important.
    }

    return res.json({ success: true, message: 'Account and all data successfully deleted' });
  } catch (err: any) {
    console.error('[delete-account] error:', err.message);
    return res.status(500).json({ error: 'Server error', message: 'Failed to delete account' });
  }
});

export default router;

