"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/blackhole — get all blackholed users for current user
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const entries = await db_1.prisma.$queryRawUnsafe(`SELECT * FROM blackhole_entries WHERE user_id = $1 ORDER BY created_at DESC`, req.userId);
        return res.json(entries);
    }
    catch (err) {
        console.error('[blackhole GET]', err);
        return res.status(500).json({ message: 'Server error' });
    }
});
// POST /api/blackhole — add a user to the black hole (block or remove)
// Body: { targetId, reason: 'removed' | 'blocked' }
router.post('/', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.userId;
        const { targetId, reason = 'removed' } = req.body;
        if (!targetId)
            return res.status(400).json({ message: 'targetId required' });
        // Fetch target user info
        const target = await db_1.prisma.user.findUnique({
            where: { id: targetId },
            select: { id: true, display_name: true, cosmic_id: true },
        });
        if (!target)
            return res.status(404).json({ message: 'User not found' });
        // Upsert into blackhole_entries
        await db_1.prisma.$executeRawUnsafe(`INSERT INTO blackhole_entries (user_id, target_id, target_display_name, target_cosmic_id, reason)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, target_id) DO UPDATE SET reason = $5, created_at = now()`, userId, target.id, target.display_name, target.cosmic_id, reason);
        // Also remove friendship + planet assignment
        await db_1.prisma.friendship.deleteMany({
            where: {
                OR: [
                    { user_id: userId, friend_id: targetId },
                    { user_id: targetId, friend_id: userId },
                ],
            },
        });
        await db_1.prisma.planetAssignment.deleteMany({
            where: {
                OR: [
                    { user_id: userId, friend_id: targetId },
                    { user_id: targetId, friend_id: userId },
                ],
            },
        }).catch(() => { }); // ignore if no assignment
        return res.status(201).json({ message: 'User sent to black hole' });
    }
    catch (err) {
        console.error('[blackhole POST]', err);
        return res.status(500).json({ message: 'Server error' });
    }
});
// DELETE /api/blackhole/:targetId — remove from black hole (unblock)
router.delete('/:targetId', auth_1.authenticate, async (req, res) => {
    try {
        await db_1.prisma.$executeRawUnsafe(`DELETE FROM blackhole_entries WHERE user_id = $1 AND target_id = $2`, req.userId, req.params.targetId);
        return res.json({ message: 'Removed from black hole' });
    }
    catch (err) {
        console.error('[blackhole DELETE]', err);
        return res.status(500).json({ message: 'Server error' });
    }
});
exports.default = router;
//# sourceMappingURL=blackhole.js.map