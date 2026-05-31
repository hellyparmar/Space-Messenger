"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/users/check-userid?id=xxx  — PUBLIC, no auth required
router.get('/check-userid', async (req, res) => {
    try {
        const { id } = req.query;
        if (!id || typeof id !== 'string') {
            return res.status(400).json({ error: 'Valid id query parameter required' });
        }
        const validFormat = /^[a-z0-9][a-z0-9_]{1,18}[a-z0-9]$/.test(id);
        if (!validFormat) {
            return res.json({ available: false, reason: 'invalid_format' });
        }
        const existingUser = await db_1.prisma.user.findFirst({ where: { cosmic_id: id.toLowerCase() } });
        return res.json({ available: !existingUser });
    }
    catch (err) {
        console.error('[check-userid] error:', err.message);
        return res.status(500).json({ error: 'Server error', message: err.message });
    }
});
// GET /api/users/search?q=searchterm
router.get('/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || typeof q !== 'string' || q.trim().length < 2) {
            return res.status(400).json({ error: 'Query must be at least 2 characters' });
        }
        const term = q.trim().toLowerCase();
        const users = await db_1.prisma.user.findMany({
            where: {
                OR: [
                    { display_name: { contains: term, mode: 'insensitive' } },
                    { cosmic_id: { contains: term, mode: 'insensitive' } },
                ],
            },
            select: {
                id: true,
                cosmic_id: true,
                display_name: true,
                bio: true,
                planet_type: true,
            },
            take: 10,
        });
        return res.json({ users });
    }
    catch (err) {
        console.error('[search] error:', err.message);
        return res.status(500).json({ error: 'Search failed', message: err.message });
    }
});
// POST /api/users/sync — sync Supabase auth user to our database
router.post('/sync', auth_1.authenticate, async (req, res) => {
    try {
        const { display_name, cosmic_id } = req.body;
        const userId = req.user.id;
        const userEmail = req.user.email;
        // Check if already synced
        const existing = await db_1.prisma.user.findUnique({ where: { id: userId } });
        if (existing) {
            return res.json({ user: existing });
        }
        // Check cosmic_id availability
        const baseId = cosmic_id || userEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_');
        const cosmicIdExists = await db_1.prisma.user.findUnique({ where: { cosmic_id: baseId } });
        const finalCosmicId = cosmicIdExists
            ? `${baseId}_${Date.now().toString().slice(-4)}`
            : baseId;
        const user = await db_1.prisma.user.create({
            data: {
                id: userId,
                cosmic_id: finalCosmicId,
                display_name: display_name?.trim() || userEmail.split('@')[0],
            }
        });
        res.status(201).json({ user });
    }
    catch (err) {
        console.error('Sync error:', err);
        res.status(500).json({ message: err.message });
    }
});
// GET /api/users/me — get current user profile
router.get('/me', auth_1.authenticate, async (req, res) => {
    try {
        const user = await db_1.prisma.user.findUnique({
            where: { id: req.user.id }
        });
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        res.json({ user });
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
});
// PATCH /api/users/me — update profile
router.patch('/me', auth_1.authenticate, async (req, res) => {
    try {
        const { display_name, bio, cosmic_id, avatar_icon } = req.body;
        let cosmic_id_changes = undefined;
        if (cosmic_id !== undefined && typeof cosmic_id === 'string' && cosmic_id.trim().length > 0) {
            const existingUser = await db_1.prisma.user.findUnique({ where: { id: req.user.id } });
            if (existingUser && existingUser.cosmic_id !== cosmic_id) {
                if (existingUser.cosmic_id_changes >= 3) {
                    return res.status(400).json({ message: 'Cosmic ID change limit reached.' });
                }
                cosmic_id_changes = existingUser.cosmic_id_changes + 1;
            }
        }
        const safeDisplayName = display_name?.trim() || req.user.email.split('@')[0];
        const safeCosmicId = cosmic_id?.trim().toLowerCase() || req.user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_');
        const user = await db_1.prisma.user.upsert({
            where: { id: req.user.id },
            update: {
                ...(display_name !== undefined && { display_name: display_name.trim() }),
                ...(bio !== undefined && { bio: bio.slice(0, 160) }),
                ...(avatar_icon !== undefined && { avatar_icon }),
                ...(cosmic_id_changes !== undefined && {
                    cosmic_id: cosmic_id.trim().toLowerCase(),
                    cosmic_id_changes
                }),
            },
            create: {
                id: req.user.id,
                display_name: safeDisplayName,
                cosmic_id: safeCosmicId,
                bio: bio !== undefined ? bio.slice(0, 160) : '',
                avatar_icon: avatar_icon || null,
                cosmic_id_changes: cosmic_id_changes !== undefined ? cosmic_id_changes : 0
            }
        });
        res.json({ user });
    }
    catch (err) {
        if (err.code === 'P2002') {
            return res.status(400).json({ message: 'Cosmic ID is already taken.' });
        }
        res.status(500).json({ message: err.message });
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map