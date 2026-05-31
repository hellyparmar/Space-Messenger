import { motion } from 'framer-motion';
import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { api } from '../lib/api';
import { connectSocket } from '../lib/socket';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ username: '', email: '', password: '', userId: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser, setToken } = useAppStore();

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload = mode === 'login'
        ? { email: form.email, password: form.password }
        : form;
      const res = await api.post<{ token: string; user: any }>(endpoint, payload);
      setToken(res.token);
      setUser(res.user);
      connectSocket(res.token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/60 transition-all duration-300';

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,8,0.85)', backdropFilter: 'blur(20px)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md p-8 rounded-3xl border border-white/10"
        style={{ background: 'linear-gradient(135deg, rgba(20,10,40,0.95) 0%, rgba(10,5,25,0.97) 100%)', boxShadow: '0 0 80px rgba(180,100,255,0.15), 0 0 20px rgba(255,160,50,0.08)' }}
      >
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="inline-block text-5xl mb-3"
          >
            ☀️
          </motion.div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Space Messenger</h1>
          <p className="text-white/40 mt-1 text-sm">Messages across the cosmos</p>
        </div>

        {/* Tab toggle */}
        <div className="flex bg-white/5 rounded-xl p-1 mb-6">
          {(['login', 'register'] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                mode === m ? 'bg-amber-500/80 text-black' : 'text-white/50 hover:text-white'
              }`}
            >
              {m === 'login' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        <form onSubmit={handle} className="space-y-4">
          {mode === 'register' && (
            <>
              <input
                className={inputClass}
                placeholder="Username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
              />
              <input
                className={inputClass}
                placeholder="User ID (unique handle)"
                value={form.userId}
                onChange={(e) => setForm({ ...form, userId: e.target.value })}
                required
              />
            </>
          )}
          <input
            className={inputClass}
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            className={inputClass}
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-400 text-sm text-center"
            >
              {error}
            </motion.p>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-black transition-all duration-300 disabled:opacity-50"
            style={{ background: 'linear-gradient(90deg, #f59e0b, #f97316)' }}
          >
            {loading ? 'Launching…' : mode === 'login' ? 'Enter the Solar System' : 'Create Account'}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
