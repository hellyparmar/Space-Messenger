import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();
const SECRET = process.env.JWT_SECRET || 'cosmimail_secret_key_xyz_2024';

import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

// Polyfill WebSocket globally for Supabase realtime under Node < 22
if (typeof global.WebSocket === 'undefined') {
  (global as any).WebSocket = WebSocket;
}

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET /api/auth/check-email?email=xxx — PUBLIC, checks email uniqueness in Supabase auth registry
router.get('/check-email', async (req: Request, res: Response) => {
  try {
    const { email } = req.query;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Valid email query parameter required' });
    }
    const cleanEmail = email.trim().toLowerCase();

    // Query Supabase auth users via service role client to inspect the registry
    const { data, error } = await supabase.auth.admin.listUsers({
      perPage: 10000
    });

    if (error) {
      console.error('[check-email] Supabase listUsers error:', error);
      return res.status(500).json({ error: 'Failed to inspect email registry', message: error.message });
    }

    const exists = data.users && data.users.some(u => u.email?.toLowerCase() === cleanEmail);
    return res.json({ available: !exists });
  } catch (err: any) {
    console.error('[check-email] crash:', err.message);
    return res.status(500).json({ error: 'Server error checking email', message: err.message });
  }
});

// POST /api/auth/register — PUBLIC
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { displayName, username, email, password } = req.body;
    console.log('[register] body:', { displayName, username, email });

    if (!displayName || !username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const normalizedEmail    = email.toLowerCase().trim();
    const normalizedUsername = username.toLowerCase().trim();

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: normalizedEmail }, { username: normalizedUsername }] },
    });

    if (existing) {
      return res.status(409).json({
        message: existing.email === normalizedEmail
          ? 'Email already registered'
          : 'Username already taken',
      });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        displayName: displayName.trim(),
        username:    normalizedUsername,
        email:       normalizedEmail,
        password:    hashed,
      },
    });

    const token = jwt.sign({ sub: user.id }, SECRET, { expiresIn: '7d' });
    console.log('[register] success:', user.email);

    return res.status(201).json({
      token,
      user: { id: user.id, displayName: user.displayName, username: user.username, email: user.email },
    });
  } catch (err: any) {
    console.error('[register] crash:', err.message);
    return res.status(500).json({ message: err.message || 'Registration failed' });
  }
});

// POST /api/auth/login — PUBLIC
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;
    console.log('[login] attempt:', identifier);

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Identifier and password required' });
    }

    const norm = identifier.toLowerCase().trim();
    const user = await prisma.user.findFirst({
      where: { OR: [{ email: norm }, { username: norm }] },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ sub: user.id }, SECRET, { expiresIn: '7d' });
    console.log('[login] success:', user.email);

    return res.json({
      token,
      user: { id: user.id, displayName: user.displayName, username: user.username, email: user.email },
    });
  } catch (err: any) {
    console.error('[login] crash:', err.message);
    return res.status(500).json({ message: err.message || 'Login failed' });
  }
});

export default router;
