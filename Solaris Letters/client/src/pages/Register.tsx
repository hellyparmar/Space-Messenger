import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import StarfieldBackground from '../components/StarfieldBackground';

const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    username: '',
    userId: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isIdAvailable, setIsIdAvailable] = useState<boolean | null>(null);
  const [isCheckingId, setIsCheckingId] = useState(false);
  const [isEmailAvailable, setIsEmailAvailable] = useState<boolean | null>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { setToken, setUser } = useAppStore();

  // Real-time User ID uniqueness check
  useEffect(() => {
    if (formData.userId.length < 3) {
      setIsIdAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingId(true);
      try {
        const res = await api.get<{ available: boolean }>(`/api/users/check-userid?id=${formData.userId}`);
        setIsIdAvailable(res.available);
      } catch {
        setIsIdAvailable(null);
      } finally {
        setIsCheckingId(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.userId]);

  // Real-time Email uniqueness check
  useEffect(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setIsEmailAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingEmail(true);
      try {
        const res = await api.get<{ available: boolean }>(`/api/auth/check-email?email=${encodeURIComponent(formData.email)}`);
        setIsEmailAvailable(res.available);
      } catch {
        setIsEmailAvailable(null);
      } finally {
        setIsCheckingEmail(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [formData.email]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (formData.username.length < 2) newErrors.username = 'Minimum 2 characters';
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(formData.userId)) newErrors.userId = '3-20 chars, alphanumeric only';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email address';
    if (formData.password.length < 8) newErrors.password = 'Minimum 8 characters';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (isIdAvailable === false) newErrors.userId = 'User ID already claimed';
    if (isEmailAvailable === false) newErrors.email = 'Only one account should be made from an email id';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setErrors({});
    setLoading(true);

    try {
      // 1. Create auth user in Supabase
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: { data: { display_name: formData.username, username: formData.userId } }
      });

      if (signUpError) throw signUpError;
      if (!data.session) throw new Error('No session returned — check email confirmation is disabled in Supabase');

      // 2. Sync to our database
      const syncRes = await fetch(`${API_BASE}/api/users/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${data.session.access_token}`
        },
        body: JSON.stringify({ display_name: formData.username, cosmic_id: formData.userId })
      });

      let syncData: any = {};
      if (!syncRes.ok) {
        const syncErr = await syncRes.json();
        console.warn('Sync warning:', syncErr.message);
      } else {
        syncData = await syncRes.json();
      }

      // 3. Store and navigate
      setToken(data.session.access_token);
      setUser(syncData.user || {
        id: data.user!.id,
        email: data.user!.email,
        displayName: formData.username,
        username: formData.userId,
      });
      localStorage.setItem('cosmimail_token', data.session.access_token);
      localStorage.setItem('cosmimail_user', JSON.stringify({
        id: data.user!.id,
        email: data.user!.email,
        displayName: formData.username,
        username: formData.userId,
      }));

      setSuccessMsg('✅ Account created successfully!');
      setTimeout(() => navigate('/home'), 1000);
    } catch (err: any) {
      setErrors({ global: err.message || 'Registration failed' });
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = formData.password.length === 0 ? 0 : formData.password.length < 8 ? 1 : 2;

  return (
    <div className="absolute inset-0 h-full w-full overflow-hidden bg-[#030201] font-sans selection:bg-amber-500/30 flex items-center justify-center p-4">
      <StarfieldBackground />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg relative z-10"
      >
        <div className="text-center mb-4">
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--accent-gold)] tracking-widest mb-0.5 font-orbitron">
            CREATE ACCOUNT
          </h1>
          <p className="text-[var(--text-dim)]/40 text-[9px] uppercase tracking-[0.4em] font-bold font-orbitron">Claim Your Star Address</p>
        </div>

        <div className="cosmic-card p-5 sm:p-6 backdrop-blur-2xl shadow-2xl">
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(-5px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>

          <form onSubmit={handleRegister} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-[var(--text-dim)] font-bold font-orbitron">Display Name</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => {
                    setFormData({ ...formData, username: e.target.value });
                    setErrors((prev) => ({ ...prev, global: '' }));
                  }}
                  placeholder="Jane Doe"
                  className="w-full bg-[var(--input-bg)] border-b border-[var(--input-border)] py-2 px-1 text-[var(--text-primary)] placeholder:text-[var(--text-dim)]/30 focus:outline-none focus:border-[var(--accent-gold)] focus:shadow-[0_2px_0_rgba(200,160,80,0.2)] transition-all font-sans"
                  required
                />
                {errors.username && <p className="text-xs text-red-400 font-bold mt-1">{errors.username}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-[var(--text-dim)] font-bold flex justify-between font-orbitron">
                  User ID
                </label>
                <div className="relative">
                  <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[var(--accent-gold)]/60 font-semibold font-orbitron text-xs">@</span>
                  <input
                    type="text"
                    value={formData.userId}
                    onChange={(e) => {
                      setFormData({ ...formData, userId: e.target.value.toLowerCase().replace(/\s/g, '_') });
                      setErrors((prev) => ({ ...prev, global: '' }));
                    }}
                    placeholder="janedoe_77"
                    className={`w-full bg-[var(--input-bg)] border-b py-2 pl-5 pr-8 text-[var(--text-primary)] placeholder:text-[var(--text-dim)]/30 focus:outline-none transition-all font-sans ${
                      isIdAvailable === true ? 'border-emerald-500/50 focus:border-emerald-500' : isIdAvailable === false ? 'border-red-500/50 focus:border-red-500' : 'border-[var(--input-border)] focus:border-[var(--accent-gold)] focus:shadow-[0_2px_0_rgba(200,160,80,0.2)]'
                    }`}
                    required
                  />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    {isCheckingId && <span className="animate-pulse text-[var(--accent-gold)] text-xs font-orbitron">...</span>}
                    {isIdAvailable === true && <span className="text-emerald-400 text-xs">✓</span>}
                    {isIdAvailable === false && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, userId: '' });
                          setIsIdAvailable(null);
                        }}
                        className="text-red-400 hover:text-red-300 transition-colors text-xs font-bold px-1 pointer-events-auto"
                        title="Clear User ID"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
                {errors.userId && <p className="text-xs text-red-400 font-bold mt-1">{errors.userId}</p>}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest text-[var(--text-dim)] font-bold flex justify-between font-orbitron">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    setErrors((prev) => ({ ...prev, global: '' }));
                  }}
                  placeholder="jane@example.com"
                  className={`w-full bg-[var(--input-bg)] border-b py-2 px-1 pr-8 text-[var(--text-primary)] placeholder:text-[var(--text-dim)]/30 focus:outline-none transition-all font-sans ${
                    isEmailAvailable === true ? 'border-emerald-500/50 focus:border-emerald-500' : isEmailAvailable === false ? 'border-red-500/50 focus:border-red-500' : 'border-[var(--input-border)] focus:border-[var(--accent-gold)] focus:shadow-[0_2px_0_rgba(200,160,80,0.2)]'
                  }`}
                  required
                />
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  {isCheckingEmail && <span className="animate-pulse text-[var(--accent-gold)] text-xs font-orbitron">...</span>}
                  {isEmailAvailable === true && <span className="text-emerald-400 text-xs">✓</span>}
                  {isEmailAvailable === false && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, email: '' });
                        setIsEmailAvailable(null);
                      }}
                      className="text-red-400 hover:text-red-300 transition-colors text-xs font-bold px-1 pointer-events-auto"
                      title="Clear Email"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
              {errors.email && <p className="text-xs text-red-400 font-bold mt-1">{errors.email}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-[var(--text-dim)] font-bold font-orbitron">Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    setErrors((prev) => ({ ...prev, global: '' }));
                  }}
                  placeholder="••••••••"
                  className="w-full bg-[var(--input-bg)] border-b border-[var(--input-border)] py-2 px-1 text-[var(--text-primary)] placeholder:text-[var(--text-dim)]/30 focus:outline-none focus:border-[var(--accent-gold)] focus:shadow-[0_2px_0_rgba(200,160,80,0.2)] transition-all font-sans"
                  required
                />
                <div className="flex gap-1 mt-2 ml-0.5">
                  <div className={`h-1 w-12 rounded-sm transition-all ${passwordStrength >= 1 ? (passwordStrength === 1 ? 'bg-red-500/80 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-[var(--accent-gold)] shadow-[0_0_10px_rgba(200,160,80,0.5)]') : 'bg-white/5'}`} />
                  <div className={`h-1 w-12 rounded-sm transition-all ${passwordStrength >= 2 ? 'bg-[var(--accent-gold)] shadow-[0_0_10px_rgba(200,160,80,0.5)]' : 'bg-white/5'}`} />
                </div>
                {errors.password && <p className="text-xs text-red-400 font-bold mt-1">{errors.password}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-[var(--text-dim)] font-bold font-orbitron">Confirm Password</label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => {
                    setFormData({ ...formData, confirmPassword: e.target.value });
                    setErrors((prev) => ({ ...prev, global: '' }));
                  }}
                  placeholder="••••••••"
                  className="w-full bg-[var(--input-bg)] border-b border-[var(--input-border)] py-2 px-1 text-[var(--text-primary)] placeholder:text-[var(--text-dim)]/30 focus:outline-none focus:border-[var(--accent-gold)] focus:shadow-[0_2px_0_rgba(200,160,80,0.2)] transition-all font-sans"
                  required
                />
                {errors.confirmPassword && <p className="text-xs text-red-400 font-bold mt-1">{errors.confirmPassword}</p>}
              </div>
            </div>

            <AnimatePresence>
              {errors.global && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-950/40 border border-red-500/30 text-red-300 rounded-sm p-2 text-[10px] font-orbitron tracking-widest uppercase text-center overflow-hidden shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                >
                  {errors.global}
                </motion.div>
              )}

              {successMsg && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 rounded-sm p-2 text-[10px] font-orbitron tracking-widest uppercase text-center overflow-hidden shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                >
                  {successMsg}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading || isIdAvailable === false || isEmailAvailable === false}
              className="w-full py-2.5 rounded-sm bg-[var(--accent-gold)] border border-[var(--accent-gold)] text-[#0A0806] font-bold text-xs uppercase tracking-widest hover:bg-[var(--accent-amber)] hover:border-[var(--accent-amber)] transition-all transform active:scale-[0.98] shadow-lg shadow-[var(--accent-gold)]/10 mt-2 disabled:opacity-30 font-orbitron cursor-pointer"
            >
              {loading ? 'TRANSMITTING ADDRESS...' : 'CREATE ACCOUNT'}
            </button>
          </form>

          <div className="mt-4 pt-3 border-t border-white/5 text-center">
            <p className="text-[var(--text-dim)]/40 text-[11px] font-medium font-orbitron">
              Already have an account?{' '}
              <Link to="/login" className="text-[var(--accent-gold)] hover:text-[var(--accent-amber)] font-bold ml-1 transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
