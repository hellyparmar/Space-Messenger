import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
if (!rawUrl || !rawUrl.startsWith('https://')) {
  console.error('[Supabase] VITE_SUPABASE_URL is missing or not a valid https:// URL.');
}
if (!rawKey || rawKey.length < 20) {
  console.error('[Supabase] VITE_SUPABASE_ANON_KEY is missing or too short.');
}

// Guard: createClient throws if URL doesn't start with https://
const supabaseUrl = rawUrl?.startsWith('https://') ? rawUrl : 'https://placeholder.supabase.co';
const supabaseAnonKey = rawKey && rawKey.length > 20 ? rawKey : 'placeholder-key';

let supabaseClient;
try {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
} catch (e) {
  console.error('[Supabase] createClient() threw an error:', e);
  // fallback so the module doesn't crash the entire bundle
  supabaseClient = createClient('https://placeholder.supabase.co', 'placeholder-key');
}

export const supabase = supabaseClient;
