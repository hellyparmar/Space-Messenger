// In dev: BASE_URL is '' so Vite proxy handles /api/* → localhost:4000
// In production: BASE_URL is the full Render backend URL (VITE_API_URL)
// NEVER sends Authorization header on /auth/ routes

import { supabase } from './supabase';

const BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };

  // Only attach token on protected routes (not /auth/)
  if (!path.includes('/auth/') && !path.includes('/health')) {
    const { data: { session } } = await supabase.auth.getSession();
    let token = session?.access_token || localStorage.getItem('cosmimail_token');
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('cosmimail_token', token);
    }
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(body.message ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
};

export const api = {
  get:    <T>(path: string)                    => request<T>(path, { method: 'GET' }),
  post:   <T>(path: string, body: unknown)     => request<T>(path, { method: 'POST',  body: JSON.stringify(body) }),
  patch:  <T>(path: string, body: unknown)     => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string)                    => request<T>(path, { method: 'DELETE' }),
};
