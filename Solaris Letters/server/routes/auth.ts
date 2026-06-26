import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();
const SECRET = process.env.JWT_SECRET || 'cosmimail_secret_key_xyz_2024';

function sanitizeInput(text: any, maxLength?: number): string {
  if (typeof text !== 'string') return '';
  const stripped = text.replace(/<[^>]*>/g, '');
  if (maxLength !== undefined) {
    return stripped.slice(0, maxLength);
  }
  return stripped;
}

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
      return res.status(500).json({ error: 'Failed to inspect email registry', message: 'Request failed' });
    }

    const exists = data.users && data.users.some(u => u.email?.toLowerCase() === cleanEmail);
    return res.json({ available: !exists });
  } catch (err: any) {
    console.error('[check-email] crash:', err.message);
    return res.status(500).json({ error: 'Server error checking email', message: 'Request failed' });
  }
});

// Note: POST /api/auth/register and POST /api/auth/login are obsolete/unused.
// User authentication is managed directly via Supabase Auth on the frontend.
// Synced user profile data is queried via /api/users/sync and /api/users/me.

export default router;
