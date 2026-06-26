import dotenv from 'dotenv';
import path from 'path';
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
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
import helmet from 'helmet';

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
const PORT   = Number(process.env.PORT) || 4000;

// Allow comma-separated origins via CORS_ORIGIN env var
// e.g. "https://your-app.netlify.app,http://localhost:5173"
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || 'https://space-messengerr.netlify.app,http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((o) => o.trim());

// ── Socket.io ────────────────────────────────────────────────────────────────
const io = new SocketServer(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin) || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  },
});
app.set('io', io);

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) return next(new Error('Unauthorized'));
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return next(new Error('Invalid token'));
    }
    (socket as any).userId = user.id;
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
app.use(helmet());
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "blob:"],
    connectSrc: ["'self'", "wss:", "https:"],
    frameSrc: ["'none'"],
    objectSrc: ["'none'"]
  }
}));

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (ALLOWED_ORIGINS.includes(origin) || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});
app.use(express.json());

// ── Public routes (NO auth) ───────────────────────────────────────────────────
app.get(['/ping', '/api/ping'], (_req, res) => res.json({ status: 'ok' }));
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

// Security logs store
const securityFlags = new Map<string, { count: number, attempts: string[] }>();

app.post(['/security/flag', '/api/security/flag'], authenticate, (req: any, res: any) => {
  const userId = req.userId;
  const timestamp = req.body.timestamp || new Date().toISOString();
  if (!userId) {
    return res.status(400).json({ error: 'User ID missing' });
  }
  const record = securityFlags.get(userId) || { count: 0, attempts: [] };
  record.count += 1;
  record.attempts.push(timestamp);
  securityFlags.set(userId, record);
  console.log(`[security] Flagged attempt logged for user: ${userId} at ${timestamp}. Total count: ${record.count}`);
  return res.json({ success: true, count: record.count });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack); // log internally only
  res.status(err.status || 500).json({ error: 'Something went wrong. Please try again.' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`✅ Health: http://localhost:${PORT}/api/health`);
});

export default app;
