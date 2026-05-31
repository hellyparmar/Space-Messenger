"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/friends — fetch friends via friendships table
router.get('/', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.userId;
        const friendships = await db_1.prisma.friendship.findMany({
            where: { user_id: userId },
            include: {
                friend: {
                    select: { id: true, cosmic_id: true, display_name: true, bio: true, planet_type: true, unread_count: true }
                }
            },
            orderBy: { interaction_score: 'desc' },
        });
        // Count unread letters per friend
        const unreadCounts = await db_1.prisma.letter.groupBy({
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
        const dbAssignments = await db_1.prisma.planetAssignment.findMany({
            where: { user_id: userId },
            include: { friend: { select: { id: true, cosmic_id: true, display_name: true } } }
        });
        // Determine unassigned friends
        const assignedFriendIds = new Set(dbAssignments.map(a => a.friend_id));
        const assignedPlanets = new Set(dbAssignments.map(a => a.planet_name));
        const unassignedFriends = friends.filter(f => !assignedFriendIds.has(f.id));
        if (unassignedFriends.length > 0) {
            const INNER_PLANETS = ['Mercury', 'Venus', 'Earth', 'Mars'];
            const OUTER_PLANETS = ['Jupiter', 'Saturn', 'Uranus', 'Neptune'];
            const DWARF_PLANETS = ['Pluto', 'Ceres', 'Eris', 'Haumea', 'Makemake'];
            const newAssignments = [];
            for (const f of unassignedFriends) {
                let chosenPlanet = '';
                if (f.interactionCount >= 10 && INNER_PLANETS.some(p => !assignedPlanets.has(p))) {
                    chosenPlanet = INNER_PLANETS.find(p => !assignedPlanets.has(p));
                }
                else if (f.interactionCount >= 3 && OUTER_PLANETS.some(p => !assignedPlanets.has(p))) {
                    chosenPlanet = OUTER_PLANETS.find(p => !assignedPlanets.has(p));
                }
                else if (DWARF_PLANETS.some(p => !assignedPlanets.has(p))) {
                    chosenPlanet = DWARF_PLANETS.find(p => !assignedPlanets.has(p));
                }
                else {
                    // If dwarf planets are also full, just start grabbing anything left over
                    const ALL = [...INNER_PLANETS, ...OUTER_PLANETS, ...DWARF_PLANETS];
                    chosenPlanet = ALL.find(p => !assignedPlanets.has(p)) || '';
                }
                if (chosenPlanet) {
                    assignedPlanets.add(chosenPlanet);
                    newAssignments.push({ user_id: userId, friend_id: f.id, planet_name: chosenPlanet });
                    dbAssignments.push({
                        user_id: userId,
                        friend_id: f.id,
                        planet_name: chosenPlanet,
                        friend: { id: f.id, cosmic_id: f.username, display_name: f.displayName }
                    });
                }
            }
            if (newAssignments.length > 0) {
                await db_1.prisma.planetAssignment.createMany({ data: newAssignments });
            }
        }
        const assignments = dbAssignments.map(a => ({
            planetName: a.planet_name,
            friend: {
                id: a.friend.id,
                username: a.friend.cosmic_id,
                displayName: a.friend.display_name,
            }
        }));
        return res.json({ friends, assignments });
    }
    catch (err) {
        console.error('[friends]', err);
        return res.status(500).json({ error: 'Server error' });
    }
});
// POST /api/friends — add a friend (bidirectional)
router.post('/', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.userId;
        const { friend_id } = req.body;
        if (!friend_id)
            return res.status(400).json({ message: 'friend_id required' });
        // Create both directions of the friendship
        await db_1.prisma.friendship.upsert({
            where: { user_id_friend_id: { user_id: userId, friend_id } },
            update: {},
            create: { user_id: userId, friend_id },
        });
        await db_1.prisma.friendship.upsert({
            where: { user_id_friend_id: { user_id: friend_id, friend_id: userId } },
            update: {},
            create: { user_id: friend_id, friend_id: userId },
        });
        return res.status(201).json({ message: 'Friendship established' });
    }
    catch (err) {
        console.error('[friends POST]', err);
        return res.status(500).json({ error: 'Server error' });
    }
});
// DELETE /api/friends/:friendId — remove friend + planet assignment
router.delete('/:friendId', auth_1.authenticate, async (req, res) => {
    try {
        const userId = req.userId;
        const { friendId } = req.params;
        await db_1.prisma.friendship.deleteMany({
            where: {
                OR: [
                    { user_id: userId, friend_id: friendId },
                    { user_id: friendId, friend_id: userId },
                ],
            },
        });
        res.json({ message: 'Friend removed' });
    }
    catch (err) {
        console.error('[friends DELETE]', err);
        return res.status(500).json({ error: 'Server error' });
    }
});
// ── NEW ROUTES: Requests and Assignments ──
router.post('/request', auth_1.authenticate, async (req, res) => {
    try {
        const { targetUsername } = req.body;
        const senderId = req.userId;
        const target = await db_1.prisma.user.findUnique({ where: { cosmic_id: targetUsername } });
        if (!target)
            return res.status(404).json({ message: 'User not found' });
        if (target.id === senderId)
            return res.status(400).json({ message: 'Cannot add yourself' });
        const existing = await db_1.prisma.friendRequest.findFirst({
            where: { OR: [
                    { sender_id: senderId, target_id: target.id },
                    { sender_id: target.id, target_id: senderId }
                ] }
        });
        const existingFriend = await db_1.prisma.friendship.findFirst({
            where: { user_id: senderId, friend_id: target.id }
        });
        if (existingFriend)
            return res.status(409).json({ message: 'Already friends' });
        if (existing)
            return res.status(409).json({ message: existing.status === 'pending' ? 'Request already sent' : 'Already friends' });
        const request = await db_1.prisma.friendRequest.create({
            data: { sender_id: senderId, target_id: target.id, status: 'pending' }
        });
        res.status(201).json({ request });
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
});
router.get('/requests/incoming', auth_1.authenticate, async (req, res) => {
    try {
        const requests = await db_1.prisma.friendRequest.findMany({
            where: { target_id: req.userId, status: 'pending' },
            include: { sender: { select: { id: true, display_name: true, cosmic_id: true } } }
        });
        res.json({ requests });
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
});
router.post('/request/:id/accept', auth_1.authenticate, async (req, res) => {
    try {
        const { planetName } = req.body;
        const request = await db_1.prisma.friendRequest.update({
            where: { id: req.params.id },
            data: { status: 'active' }
        });
        await db_1.prisma.friendship.upsert({
            where: { user_id_friend_id: { user_id: req.userId, friend_id: request.sender_id } },
            update: {},
            create: { user_id: req.userId, friend_id: request.sender_id },
        });
        await db_1.prisma.friendship.upsert({
            where: { user_id_friend_id: { user_id: request.sender_id, friend_id: req.userId } },
            update: {},
            create: { user_id: request.sender_id, friend_id: req.userId },
        });
        if (planetName) {
            await db_1.prisma.planetAssignment.upsert({
                where: { user_id_friend_id: { user_id: req.userId, friend_id: request.sender_id } },
                create: { user_id: req.userId, friend_id: request.sender_id, planet_name: planetName },
                update: { planet_name: planetName }
            });
        }
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
});
router.delete('/request/:id/decline', auth_1.authenticate, async (req, res) => {
    try {
        await db_1.prisma.friendRequest.delete({ where: { id: req.params.id } });
        res.json({ message: 'Request declined' });
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
});
router.patch('/assign-planet', auth_1.authenticate, async (req, res) => {
    try {
        const { friendId, planetName } = req.body;
        const assignment = await db_1.prisma.planetAssignment.upsert({
            where: { user_id_friend_id: { user_id: req.userId, friend_id: friendId } },
            create: { user_id: req.userId, friend_id: friendId, planet_name: planetName },
            update: { planet_name: planetName }
        });
        res.json({ assignment });
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
});
exports.default = router;
//# sourceMappingURL=friends.js.map