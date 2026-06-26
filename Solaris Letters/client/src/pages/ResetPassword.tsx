import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import StarfieldBackground from '../components/StarfieldBackground';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Ensure the user is actually logged in (Supabase sets the session from URL)
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('No active session found. Please request a new password reset link.');
      }
    };
    checkSession();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.updateUser({
        password: password
      });

      if (resetError) throw resetError;

      setSuccessMsg('Secret key updated. Preparing launch...');
      
      // Clear token and user storage, then force a fresh login
      localStorage.removeItem('cosmimail_token');
      localStorage.removeItem('cosmimail_user');
      
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to reset password';
      setError(errMsg);
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
            SECURE ACCESS
          </h1>
          <p className="text-[var(--text-dim)]/40 text-[9px] uppercase tracking-[0.4em] font-bold font-orbitron">RECONFIGURE PASSWORD</p>
        </div>

        <div className="cosmic-card p-5 sm:p-6 backdrop-blur-2xl shadow-2xl">
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="new-password-field" className="text-[10px] uppercase tracking-widest text-[var(--text-dim)] font-bold font-orbitron">New Secret Key (Password)</label>
              <input
                id="new-password-field"
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

            <div className="space-y-1">
              <label htmlFor="confirm-password-field" className="text-[10px] uppercase tracking-widest text-[var(--text-dim)] font-bold font-orbitron">Confirm New Secret Key</label>
              <input
                id="confirm-password-field"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
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
              {loading ? 'Transmitting...' : 'Update Password'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
