import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import jwt from 'jsonwebtoken';

import authRouter      from './routes/auth';
import lettersRouter   from './routes/letters';
import usersRouter     from './routes/users';
import friendsRouter   from './routes/friends';
import groupsRouter    from './routes/groups';
import blackholeRouter from './routes/blackhole';
import { authenticate } from './middleware/auth';
import { initScheduler } from './scheduler';

const app        = express();
const httpServer = http.createServer(app);
const PORT       = Number(process.env.PORT) || 4000;
const SECRET     = process.env.JWT_SECRET    || 'cosmimail_secret_key_xyz_2024';

// ── Socket.io ────────────────────────────────────────────────────────────────
const io = new SocketServer(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});
app.set('io', io);

io.use((socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) return next(new Error('Unauthorized'));
  try {
    const payload = jwt.verify(token, SECRET) as { sub: string };
    (socket as any).userId = payload.sub;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const userId = (socket as any).userId as string;
  console.log(`[socket] connected: ${userId}`);
  socket.join(userId);
  socket.on('disconnect', () => console.log(`[socket] disconnected: ${userId}`));
});

// Start persistent letter delivery scheduler
initScheduler(io);

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// ── Public routes (NO auth) ───────────────────────────────────────────────────
app.get('/api/health', (_req, res) =>
  res.json({ status: 'alive', timestamp: new Date().toISOString() })
);
app.use('/api/auth', authRouter);

// ── Protected routes (auth required) ─────────────────────────────────────────
app.use('/api/letters',   authenticate, lettersRouter);
app.use('/api/friends',   authenticate, friendsRouter);
app.use('/api/groups',    authenticate, groupsRouter);
app.use('/api/users',     usersRouter);  // auth applied per-route inside
app.use('/api/blackhole', authenticate, blackholeRouter);

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('UNHANDLED ERROR:', err.message);
  res.status(500).json({ message: err.message || 'Server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`✅ Health: http://localhost:${PORT}/api/health`);
});

export default app;
