import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Guard: createClient throws if URL doesn't start with https://
const supabaseUrl = rawUrl?.startsWith('https://') ? rawUrl : 'https://placeholder.supabase.co';
const supabaseAnonKey = rawKey && rawKey.length > 20 ? rawKey : 'placeholder-key';

if (!rawUrl?.startsWith('https://') || !rawKey) {
  console.error('[Supabase] Missing or invalid env vars:', { rawUrl, hasKey: !!rawKey });
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

