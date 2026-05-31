import { createClient } from '@supabase/supabase-js';
import { Request, Response, NextFunction } from 'express';
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

export interface AuthRequest extends Request {
  userId?: string;
  user?: { id: string; email: string; };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No authorization token provided' });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    req.user = { id: user.id, email: user.email! };
    // Keep userId for backward compatibility with existing routes
    req.userId = user.id;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Authentication failed' });
  }
};
