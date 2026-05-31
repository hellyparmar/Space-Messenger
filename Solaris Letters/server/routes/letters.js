"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/letters — inbox + sent for current user
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const letters = await db_1.prisma.letter.findMany({
            where: {
                OR: [{ sender_id: req.userId }, { recipient_id: req.userId }],
                is_archived: false,
                deliver_at: { lte: new Date() },
            },
            orderBy: { sent_at: 'desc' },
            include: {
                sender: { select: { id: true, cosmic_id: true, display_name: true } },
                receiver: { select: { id: true, cosmic_id: true, display_name: true } },
            },
        });
        return res.json(letters);
    }
    catch (err) {
        console.error('[letters GET]', err);
        return res.status(500).json({ message: 'Server error' });
    }
});
// POST /api/letters — send a letter
router.post('/', auth_1.authenticate, async (req, res) => {
    try {
        let { recipient_id, body, paper_skin, stickers, is_future_self, deliver_at } = req.body;
        if (is_future_self) {
            recipient_id = req.userId;
        }
        if (!recipient_id || !body)
            return res.status(400).json({ message: 'recipient_id and body required' });
        const receiver = await db_1.prisma.user.findUnique({ where: { id: recipient_id } });
        if (!receiver)
            return res.status(404).json({ message: 'Receiver not found' });
        const letter = await db_1.prisma.letter.create({
            data: {
                sender_id: req.userId,
                recipient_id: receiver.id,
                body,
                paper_skin: paper_skin || 'parchment',
                stickers: stickers || [],
                is_future_self: is_future_self || false,
                deliver_at: deliver_at ? new Date(deliver_at) : new Date(),
            },
            include: {
                sender: { select: { id: true, cosmic_id: true, display_name: true } },
                receiver: { select: { id: true, cosmic_id: true, display_name: true } },
            },
        });
        const payload = {
            ...letter,
            from: letter.sender.display_name,
            fromCosmicId: letter.sender.cosmic_id,
            letterId: letter.id,
        };
        const now = new Date();
        const delay = letter.deliver_at.getTime() - now.getTime();
        if (delay > 0) {
            // Future letter: set a timeout to emit if within reasonable time (e.g., 24 hours)
            if (delay <= 24 * 60 * 60 * 1000) {
                setTimeout(() => {
                    req.app.get('io')?.to(receiver.id).emit('new_letter', payload);
                }, delay);
            }
        }
        else {
            req.app.get('io')?.to(receiver.id).emit('new_letter', payload);
        }
        return res.status(201).json(letter);
    }
    catch (err) {
        console.error('[letters POST]', err);
        return res.status(500).json({ message: 'Server error' });
    }
});
// PATCH /api/letters/:id/read — mark as read
router.patch('/:id/read', auth_1.authenticate, async (req, res) => {
    try {
        const letter = await db_1.prisma.letter.findUnique({ where: { id: req.params.id } });
        if (!letter)
            return res.status(404).json({ message: 'Letter not found' });
        if (letter.recipient_id !== req.userId)
            return res.status(403).json({ message: 'Forbidden' });
        const updated = await db_1.prisma.letter.update({
            where: { id: req.params.id },
            data: { read_at: new Date() },
        });
        return res.json(updated);
    }
    catch (err) {
        console.error('[letters PATCH]', err);
        return res.status(500).json({ message: 'Server error' });
    }
});
// GET /api/letters/stats — get stats for a friend
router.get('/stats', auth_1.authenticate, async (req, res) => {
    try {
        const friendId = req.query.friendId;
        if (!friendId)
            return res.status(400).json({ message: 'friendId required' });
        const userId = req.userId;
        const sent = await db_1.prisma.letter.count({ where: { sender_id: userId, recipient_id: friendId } });
        const received = await db_1.prisma.letter.count({ where: { sender_id: friendId, recipient_id: userId } });
        const unread = await db_1.prisma.letter.count({ where: { sender_id: friendId, recipient_id: userId, read_at: null } });
        return res.json({ sent, received, unread });
    }
    catch (err) {
        console.error('[letters GET stats]', err);
        return res.status(500).json({ message: 'Server error' });
    }
});
exports.default = router;
//# sourceMappingURL=letters.js.map