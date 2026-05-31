"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth_1 = __importDefault(require("./routes/auth"));
const letters_1 = __importDefault(require("./routes/letters"));
const users_1 = __importDefault(require("./routes/users"));
const friends_1 = __importDefault(require("./routes/friends"));
const groups_1 = __importDefault(require("./routes/groups"));
const blackhole_1 = __importDefault(require("./routes/blackhole"));
const auth_2 = require("./middleware/auth");
const app = (0, express_1.default)();
const httpServer = http_1.default.createServer(app);
const PORT = Number(process.env.PORT) || 4000;
const SECRET = process.env.JWT_SECRET || 'cosmimail_secret_key_xyz_2024';
// ── Socket.io ────────────────────────────────────────────────────────────────
const io = new socket_io_1.Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
});
app.set('io', io);
io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token)
        return next(new Error('Unauthorized'));
    try {
        const payload = jsonwebtoken_1.default.verify(token, SECRET);
        socket.userId = payload.sub;
        next();
    }
    catch {
        next(new Error('Invalid token'));
    }
});
io.on('connection', (socket) => {
    const userId = socket.userId;
    console.log(`[socket] connected: ${userId}`);
    socket.join(userId);
    socket.on('disconnect', () => console.log(`[socket] disconnected: ${userId}`));
});
// ── Middleware ────────────────────────────────────────────────────────────────
app.use((0, cors_1.default)({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express_1.default.json());
// ── Public routes (NO auth) ───────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'alive', timestamp: new Date().toISOString() }));
app.use('/api/auth', auth_1.default);
// ── Protected routes (auth required) ─────────────────────────────────────────
app.use('/api/letters', auth_2.authenticate, letters_1.default);
app.use('/api/friends', auth_2.authenticate, friends_1.default);
app.use('/api/groups', auth_2.authenticate, groups_1.default);
app.use('/api/users', auth_2.authenticate, users_1.default);
app.use('/api/blackhole', auth_2.authenticate, blackhole_1.default);
// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
    console.error('UNHANDLED ERROR:', err.message);
    res.status(500).json({ message: err.message || 'Server error' });
});
// ── Start ─────────────────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`✅ Health: http://localhost:${PORT}/api/health`);
});
exports.default = app;
//# sourceMappingURL=index.js.map