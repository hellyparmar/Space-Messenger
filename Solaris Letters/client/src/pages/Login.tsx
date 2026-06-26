import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { supabase } from '../lib/supabase';
import StarfieldBackground from '../components/StarfieldBackground';

const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'login' | 'forgot'>('login');
  const [forgotEmail, setForgotEmail] = useState('');
  
  const navigate = useNavigate();
  const { setToken, setUser } = useAppStore();

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) throw resetError;

      setSuccessMsg('Coordinates sent! Check your email for transmission instructions.');
      setForgotEmail('');
    } catch (err: any) {
      setError(err.message || 'Transmission failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: identifier,
        password,
      });

      if (signInError) throw signInError;

      // Fetch full user profile from backend — wrapped in try/catch so a
      // NetworkError (backend not yet deployed / server down) never blocks login.
      let userProfile = null;
      try {
        const profileRes = await fetch(`${API_BASE}/api/users/me`, {
          headers: { 'Authorization': `Bearer ${data.session.access_token}` }
        });

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          userProfile = profileData.user;
        } else if (profileRes.status === 404) {
          // Profile missing — auto-sync from Supabase metadata
          const syncRes = await fetch(`${API_BASE}/api/users/sync`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${data.session.access_token}`
            },
            body: JSON.stringify({
              display_name: data.user.user_metadata?.display_name || data.user.email?.split('@')[0],
              cosmic_id: data.user.user_metadata?.username
            })
          });
          if (syncRes.ok) {
            const syncData = await syncRes.json();
            userProfile = syncData.user;
          }
        }
      } catch {
        // Backend unreachable — fall back to Supabase identity (app still works)
        console.warn('Backend unavailable, using Supabase profile fallback');
      }

      // Always fall back to Supabase user data if backend profile is missing
      if (!userProfile) {
        userProfile = {
          id: data.user.id,
          email: data.user.email,
          displayName: data.user.user_metadata?.display_name || data.user.email?.split('@')[0],
          username: data.user.user_metadata?.username || data.user.email?.split('@')[0],
        };
      }

      setToken(data.session.access_token);
      setUser(userProfile as any);
      localStorage.setItem('cosmimail_token', data.session.access_token);
      localStorage.setItem('cosmimail_user', JSON.stringify(userProfile));

      setSuccessMsg('Transmission authorized');
      setTimeout(() => navigate('/home'), 1000);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 h-full w-full overflow-hidden bg-[#030201] font-sans selection:bg-amber-500/30 flex items-center justify-center p-4">
      <StarfieldBackground />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-4">
          <h1 className="text-3xl font-black text-[var(--accent-gold)] tracking-widest mb-0.5 font-orbitron">
            SPACE MESSENGER
          </h1>
          <p className="text-[var(--text-dim)]/40 text-[9px] uppercase tracking-[0.4em] font-bold font-orbitron">Transmission Terminal</p>
        </div>

        <div className="cosmic-card p-5 sm:p-6 backdrop-blur-2xl shadow-2xl">
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(-5px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          {viewMode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="identifier-field" className="text-[10px] uppercase tracking-widest text-[var(--text-dim)] font-bold font-orbitron">Email or User ID</label>
                <input
                  id="identifier-field"
                  type="text"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    setError('');
                  }}
                  placeholder="vessel@cosmos.com or starlord_77"
                  className="w-full bg-[var(--input-bg)] border-b border-[var(--input-border)] py-2 px-1 text-[var(--text-primary)] placeholder:text-[var(--text-dim)]/30 focus:outline-none focus:border-[var(--accent-gold)] focus:shadow-[0_2px_0_rgba(200,160,80,0.2)] transition-all font-sans"
                  required
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label htmlFor="password-field" className="text-[10px] uppercase tracking-widest text-[var(--text-dim)] font-bold font-orbitron">Secret Key (Password)</label>
                  <button
                    type="button"
                    onClick={() => { setViewMode('forgot'); setError(''); setSuccessMsg(''); }}
                    className="text-[9px] uppercase tracking-wider text-[var(--accent-gold)] hover:text-[var(--accent-amber)] font-bold font-orbitron transition-all cursor-pointer bg-transparent border-none p-0"
                  >
                    Forgot Key?
                  </button>
                </div>
                <input
                  id="password-field"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="••••••••"
                  className="w-full bg-[var(--input-bg)] border-b border-[var(--input-border)] py-2 px-1 text-[var(--text-primary)] placeholder:text-[var(--text-dim)]/30 focus:outline-none focus:border-[var(--accent-gold)] focus:shadow-[0_2px_0_rgba(200,160,80,0.2)] transition-all font-sans"
                  required
                />
              </div>

              {error && (
                <div style={{
                  background: 'rgba(180, 30, 30, 0.85)',
                  border: '1px solid rgba(255, 80, 80, 0.5)',
                  borderRadius: '2px',
                  padding: '8px 12px',
                  color: '#FFB3B3',
                  fontFamily: 'Orbitron',
                  fontSize: '11px',
                  textAlign: 'center',
                  marginBottom: '10px',
                  animation: 'fadeIn 0.3s ease'
                }}>
                  {error}
                </div>
              )}

              {successMsg && (
                <div style={{
                  background: 'rgba(30, 180, 30, 0.85)',
                  border: '1px solid rgba(80, 255, 80, 0.5)',
                  borderRadius: '2px',
                  padding: '8px 12px',
                  color: '#B3FFB3',
                  fontFamily: 'Orbitron',
                  fontSize: '11px',
                  textAlign: 'center',
                  marginBottom: '10px',
                  animation: 'fadeIn 0.3s ease'
                }}>
                  {successMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-sm bg-[var(--accent-gold)] border border-[var(--accent-gold)] text-[#0A0806] font-bold text-xs uppercase tracking-widest hover:bg-[var(--accent-amber)] hover:border-[var(--accent-amber)] transition-all transform active:scale-[0.98] shadow-lg shadow-[var(--accent-gold)]/10 mt-2 disabled:opacity-30 font-orbitron cursor-pointer"
              >
                {loading ? 'Decrypting...' : 'Initiate Login'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="forgot-email-field" className="text-[10px] uppercase tracking-widest text-[var(--text-dim)] font-bold font-orbitron">Registered Email Address</label>
                <input
                  id="forgot-email-field"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => {
                    setForgotEmail(e.target.value);
                    setError('');
                  }}
                  placeholder="vessel@cosmos.com"
                  className="w-full bg-[var(--input-bg)] border-b border-[var(--input-border)] py-2 px-1 text-[var(--text-primary)] placeholder:text-[var(--text-dim)]/30 focus:outline-none focus:border-[var(--accent-gold)] focus:shadow-[0_2px_0_rgba(200,160,80,0.2)] transition-all font-sans"
                  required
                />
              </div>

              {error && (
                <div style={{
                  background: 'rgba(180, 30, 30, 0.85)',
                  border: '1px solid rgba(255, 80, 80, 0.5)',
                  borderRadius: '2px',
                  padding: '8px 12px',
                  color: '#FFB3B3',
                  fontFamily: 'Orbitron',
                  fontSize: '11px',
                  textAlign: 'center',
                  marginBottom: '10px',
                  animation: 'fadeIn 0.3s ease'
                }}>
                  {error}
                </div>
              )}

              {successMsg && (
                <div style={{
                  background: 'rgba(30, 180, 30, 0.85)',
                  border: '1px solid rgba(80, 255, 80, 0.5)',
                  borderRadius: '2px',
                  padding: '8px 12px',
                  color: '#B3FFB3',
                  fontFamily: 'Orbitron',
                  fontSize: '11px',
                  textAlign: 'center',
                  marginBottom: '10px',
                  animation: 'fadeIn 0.3s ease'
                }}>
                  {successMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-sm bg-[var(--accent-gold)] border border-[var(--accent-gold)] text-[#0A0806] font-bold text-xs uppercase tracking-widest hover:bg-[var(--accent-amber)] hover:border-[var(--accent-amber)] transition-all transform active:scale-[0.98] shadow-lg shadow-[var(--accent-gold)]/10 mt-2 disabled:opacity-30 font-orbitron cursor-pointer"
              >
                {loading ? 'Transmitting...' : 'Send Reset Link'}
              </button>

              <button
                type="button"
                onClick={() => { setViewMode('login'); setError(''); setSuccessMsg(''); }}
                className="w-full text-center text-[var(--accent-gold)] hover:text-[var(--accent-amber)] text-[10px] font-bold tracking-widest uppercase font-orbitron mt-2 cursor-pointer bg-transparent border-none p-0"
              >
                Back to Login
              </button>
            </form>
          )}

          <div className="mt-4 pt-3 border-t border-white/5 text-center">
            <p className="text-[var(--text-dim)]/40 text-[11px] font-medium font-orbitron">
              New to the system?{' '}
              <Link to="/register" className="text-[var(--accent-gold)] hover:text-[var(--accent-amber)] font-bold ml-1 transition-colors">
                Claim your Star Address
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
