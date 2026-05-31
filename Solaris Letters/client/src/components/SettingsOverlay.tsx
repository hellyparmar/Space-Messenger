/* eslint-disable react/forbid-dom-props, react/forbid-component-props */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';

const CUTE_DOODLES = [
  { 
    id: 'astronaut', 
    svg: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2c-4.4 0-8 3.6-8 8v4c0 2.2 1.8 4 4 4h8c2.2 0 4-1.8 4-4v-4c0-4.4-3.6-8-8-8z"/><rect x="7" y="7" width="10" height="7" rx="2"/><path d="M8 18v2M16 18v2M4 10H2M22 10h-2M12 22a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/><path d="M9 10a2 2 0 1 1 6 0"/></svg>
  },
  { 
    id: 'saturn', 
    svg: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><ellipse cx="12" cy="12" rx="11" ry="3" transform="rotate(-20 12 12)"/><path d="M9 10a4 4 0 0 0 6 0" strokeDasharray="1 2"/><circle cx="3" cy="17" r="1" fill="currentColor"/><circle cx="21" cy="7" r="0.5" fill="currentColor"/></svg>
  },
  { 
    id: 'ufo', 
    svg: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a4 4 0 0 0-4 4v2h8V7a4 4 0 0 0-4-4z"/><ellipse cx="12" cy="10" rx="9" ry="3"/><path d="M8 12l-2 5a9 9 0 0 0 12 0l-2-5" strokeDasharray="2 2"/><circle cx="8" cy="10" r="0.5" fill="currentColor"/><circle cx="12" cy="10.5" r="0.5" fill="currentColor"/><circle cx="16" cy="10" r="0.5" fill="currentColor"/></svg>
  },
  { 
    id: 'satellite', 
    svg: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="8" width="5" height="8" rx="1"/><rect x="17" y="8" width="5" height="8" rx="1"/><path d="M7 12h3M14 12h3M10 10h4v4h-4z"/><path d="M12 10V4M9.5 6.5A3.5 3.5 0 0 1 14.5 6.5M11 5a1.5 1.5 0 0 1 2 0"/><circle cx="12" cy="12" r="0.5" fill="currentColor"/></svg>
  },
  { 
    id: 'telescope', 
    svg: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 5l4 4-8 8-4-4 8-8z"/><path d="M18 9l2 2M6 13l-2-2"/><path d="M10 14l-2 6M12 12l2 8"/><path d="M8 20h6M19 4a2 2 0 1 1-2.83 2.83"/><circle cx="13" cy="10" r="0.5" fill="currentColor"/></svg>
  },
  { 
    id: 'galaxy', 
    svg: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 12c-2.76 0-5 2.24-5 5s5 2 5-3c0-3.3-3.7-6-6.5-4s-3.5 5.5-1 7c2 1 4.5.5 5.5-1.5"/><path d="M12 12c2.76 0 5-2.24 5-5s-5-2-5 3c0 3.3 3.7 6 6.5 4s3.5-5.5 1-7c-2-1-4.5-.5-5.5 1.5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="5" cy="5" r="0.5" fill="currentColor"/><circle cx="20" cy="19" r="0.5" fill="currentColor"/><circle cx="19" cy="6" r="0.5" fill="currentColor"/><circle cx="4" cy="18" r="0.5" fill="currentColor"/></svg>
  },
  { 
    id: 'shuttle', 
    svg: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C10 5 9 8 9 12v6h6v-6c0-4-1-7-3-10z"/><path d="M9 14H4l1.5-4 3.5 1M15 14h5l-1.5-4-3.5 1"/><path d="M10 18l-1 4h6l-1-4"/><circle cx="12" cy="9" r="1"/><path d="M11 22v1M13 22v1"/></svg>
  },
  { 
    id: 'meteor', 
    svg: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="16" cy="16" r="5"/><path d="M12.5 12.5L3 3M17 11l-3-8M11 17l-8-3M7 7l3 3M5 10l3 3"/><circle cx="15" cy="15" r="1" fill="currentColor"/><circle cx="17.5" cy="17" r="0.5" fill="currentColor"/></svg>
  }
];

interface SettingsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsOverlay({ isOpen, onClose }: SettingsOverlayProps) {
  const { user, setUser, logout } = useAppStore();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarIcon, setAvatarIcon] = useState<string | null>(null);
  const [cosmicIdChanges, setCosmicIdChanges] = useState<number>(0);
  const [isChoosingAvatar, setIsChoosingAvatar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Three-layer loading — no early returns
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const raw = localStorage.getItem('cosmimail_user');
        if (raw) {
          const parsed = JSON.parse(raw);
          const dn = parsed.displayName || parsed.display_name || parsed.user_metadata?.display_name || parsed.user_metadata?.displayName || '';
          const un = parsed.username || parsed.cosmic_id || parsed.user_metadata?.username || '';
          if (dn) setDisplayName(dn);
          if (un) setUsername(un);
          if (parsed.bio) setBio(parsed.bio);
        }
      } catch (e: unknown) { console.debug(e); }

      try {
        const { data: { user: supaUser } } = await supabase.auth.getUser();
        if (supaUser?.user_metadata) {
          const meta = supaUser.user_metadata;
          if (meta.display_name || meta.displayName) setDisplayName(meta.display_name || meta.displayName);
          if (meta.username) setUsername(meta.username);
        }
      } catch (e: unknown) { console.debug(e); }

      try {
        const token = localStorage.getItem('cosmimail_token');
        if (token) {
          const res = await fetch('/api/users/me', { headers: { Authorization: `Bearer ${token}` } });
          if (res.ok) {
            const { user: bu } = await res.json();
            if (bu?.displayName || bu?.display_name) setDisplayName(bu.displayName || bu.display_name);
            if (bu?.username || bu?.cosmic_id) setUsername(bu.username || bu.cosmic_id);
            if (bu?.bio) setBio(bu.bio);
            if (bu?.avatar_icon) setAvatarIcon(bu.avatar_icon);
            if (bu?.cosmic_id_changes !== undefined) setCosmicIdChanges(bu.cosmic_id_changes);
          }
        }
      } catch (e: unknown) { console.debug(e); }
    };
    if (isOpen) loadUserData();
  }, [isOpen]);

  const avatarLetter = displayName?.trim()?.[0]?.toUpperCase() || username?.trim()?.[0]?.toUpperCase() || 'U';
  const hue = username.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const r = await api.patch<{ user: Record<string, any> }>('/api/users/me', { 
        display_name: displayName, 
        bio,
        cosmic_id: username,
        avatar_icon: avatarIcon
      });
      if (user) {
        setUser({ 
          ...user, 
          username: r.user.cosmic_id || username,
          displayName: r.user.display_name || displayName,
          bio: r.user.bio || bio,
          avatarIcon: r.user.avatar_icon || avatarIcon,
          cosmicIdChanges: r.user.cosmic_id_changes || cosmicIdChanges
        });
      }
      setUsername(r.user.cosmic_id || username);
      setCosmicIdChanges(r.user.cosmic_id_changes || cosmicIdChanges);
      showToast('Transmission recorded', true);
    } catch (err: any) {
      showToast(err.message || 'Transmission failed', false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('cosmimail_token');
    localStorage.removeItem('cosmimail_user');
    logout();
    onClose();
    window.location.href = '/login';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 150, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 250 }}
            className="cosmic-card parchment-scroll"
            style={{
              position: 'fixed', top: 0, right: 0, height: '100%', width: 380,
              zIndex: 151, display: 'flex', flexDirection: 'column', overflowX: 'hidden',
              backdropFilter: 'blur(24px)',
            }}
          >
            {/* Top accent rule */}
            <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(200,160,80,0.5), transparent)', flexShrink: 0 }} />

            {/* Header */}
            <div style={{ padding: '32px 28px 20px', borderBottom: '1px solid rgba(180,140,80,0.15)', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ fontFamily: 'Orbitron, sans-serif', color: 'var(--accent-gold)', fontSize: 18, letterSpacing: 4, fontWeight: 700, margin: 0 }}>SETTINGS</h2>
                  <p style={{ color: 'var(--text-dim)', fontSize: 10, letterSpacing: 6, margin: '4px 0 0', textTransform: 'uppercase' }}>MISSION CONTROL</p>
                </div>
                <button
                  title="Close"
                  onClick={onClose}
                  style={{ background: 'none', border: '1px solid rgba(180,140,80,0.25)', color: 'var(--text-dim)', cursor: 'pointer', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 2 }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="parchment-scroll" style={{ flex: 1, overflowY: 'auto', padding: '0 28px 28px' }}>
              
              {/* Avatar */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 0 20px', position: 'relative' }}>
                <div 
                  onClick={() => setIsChoosingAvatar(!isChoosingAvatar)}
                  style={{
                    width: 72, height: 72, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'Orbitron, sans-serif', fontSize: 28, fontWeight: 700, color: '#F0E8D8',
                    background: `conic-gradient(from 180deg at 50% 50%, hsl(${hue},40%,20%), hsl(${hue + 60},35%,25%), hsl(${hue},40%,20%))`,
                    border: '1px solid rgba(200,160,80,0.4)',
                    boxShadow: '0 0 20px rgba(0,0,0,0.6)',
                    marginBottom: 12, cursor: 'pointer',
                    transition: 'transform 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  {avatarIcon ? CUTE_DOODLES.find(d => d.id === avatarIcon)?.svg || avatarLetter : avatarLetter}
                </div>
                
                <AnimatePresence>
                  {isChoosingAvatar && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      style={{
                        position: 'absolute', top: 110, background: 'var(--bg-card)', 
                        border: '1px solid rgba(180,140,80,0.25)', borderRadius: 4,
                        padding: 12, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center',
                        width: 220, zIndex: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.8)'
                      }}
                    >
                      <div 
                        onClick={() => { setAvatarIcon(null); setIsChoosingAvatar(false); }}
                        style={{
                          width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', borderRadius: 4, background: !avatarIcon ? 'rgba(200,160,80,0.2)' : 'transparent',
                          color: 'var(--accent-gold)', fontSize: 18, fontFamily: 'Orbitron, sans-serif'
                        }}
                      >
                        {avatarLetter}
                      </div>
                      {CUTE_DOODLES.map(doodle => (
                        <div
                          key={doodle.id}
                          onClick={() => { setAvatarIcon(doodle.id); setIsChoosingAvatar(false); }}
                          style={{
                            width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', borderRadius: 4, background: avatarIcon === doodle.id ? 'rgba(200,160,80,0.2)' : 'transparent',
                            color: 'var(--accent-gold)'
                          }}
                        >
                          {doodle.svg}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <p style={{ fontFamily: 'Orbitron, sans-serif', color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, margin: 0 }}>{displayName || username || 'Unknown'}</p>
                <p style={{ color: 'var(--accent-gold)', fontSize: 11, margin: '4px 0 0', fontFamily: "'Exo 2', sans-serif", opacity: 0.8 }}>@{username}</p>
              </div>

              {/* Divider */}
              <div className="parchment-divider">
                <span style={{ color: 'var(--text-dim)', fontSize: 9, letterSpacing: 3 }}>◆</span>
              </div>

              {/* Display Name */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontFamily: 'Orbitron, sans-serif', color: 'var(--accent-gold)', fontSize: 9, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 8 }}>
                  Display Name
                </label>
                <input
                  className="parchment-input"
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  maxLength={40}
                  placeholder="Your designation..."
                />
              </div>

              {/* Bio */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontFamily: 'Orbitron, sans-serif', color: 'var(--accent-gold)', fontSize: 9, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 8 }}>
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value.slice(0, 160))}
                  rows={3}
                  placeholder="Brief transmission for the records..."
                  style={{
                    background: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                    borderRadius: 2,
                    color: 'var(--text-primary)',
                    padding: '10px 12px',
                    fontFamily: "'Exo 2', sans-serif",
                    fontSize: 13,
                    width: '100%',
                    outline: 'none',
                    resize: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-gold)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--input-border)'; }}
                />
                <p style={{ textAlign: 'right', fontSize: 10, color: 'var(--text-dim)', margin: '4px 0 0', fontFamily: 'monospace' }}>{bio.length}/160</p>
              </div>

              {/* Cosmic ID */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, fontFamily: 'Orbitron, sans-serif', color: 'var(--accent-gold)', fontSize: 9, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    Cosmic ID
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.5 }}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </div>
                  <span style={{ fontSize: 8, color: 'var(--text-dim)', letterSpacing: 1 }}>
                    {Math.max(0, 3 - cosmicIdChanges)} / 3 CHANGES LEFT
                  </span>
                </label>
                
                {cosmicIdChanges < 3 ? (
                  <input
                    className="parchment-input"
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    maxLength={20}
                    placeholder="Enter new Cosmic ID..."
                  />
                ) : (
                  <div style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 2, padding: '10px 12px' }}>
                    <span style={{ color: 'var(--accent-amber)', fontFamily: 'monospace', fontSize: 13 }}>@{username}</span>
                  </div>
                )}
                
                <p style={{ fontSize: 10, color: 'var(--text-dim)', margin: '4px 0 0', fontStyle: 'italic', fontFamily: "'Exo 2', sans-serif" }}>
                  {cosmicIdChanges < 3 ? 'Choose carefully. Cosmic IDs are permanent after 3 changes.' : 'Cosmic ID is immutable. Changes exhausted.'}
                </p>
              </div>

              {/* Save */}
              <button
                onClick={handleSave}
                disabled={isSaving}
                style={{
                  width: '100%', padding: 12,
                  background: 'transparent',
                  border: '1px solid var(--accent-gold)',
                  color: 'var(--accent-gold)',
                  fontFamily: 'Orbitron, sans-serif', fontSize: 10, letterSpacing: 3,
                  textTransform: 'uppercase', cursor: 'pointer', borderRadius: 2,
                  transition: 'background 0.2s, box-shadow 0.2s',
                  opacity: isSaving ? 0.6 : 1,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(200,160,80,0.1)';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 20px rgba(200,160,80,0.2)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
                }}
              >
                {isSaving ? 'TRANSMITTING...' : 'SAVE CHANGES'}
              </button>

              {/* Divider */}
              <div className="parchment-divider" style={{ marginTop: 24 }}>
                <span style={{ color: 'var(--text-dim)', fontSize: 9, letterSpacing: 3 }}>◆</span>
              </div>

              {/* Departure */}
              <p style={{ fontFamily: 'Orbitron, sans-serif', color: '#C06040', fontSize: 9, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 12 }}>
                Departure Protocols
              </p>
              <button
                onClick={handleLogout}
                style={{
                  width: '100%', padding: 12,
                  background: 'transparent',
                  border: '1px solid rgba(139,74,42,0.5)',
                  color: '#C06040',
                  fontFamily: 'Orbitron, sans-serif', fontSize: 10, letterSpacing: 3,
                  textTransform: 'uppercase', cursor: 'pointer', borderRadius: 2,
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(139,74,42,0.1)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                SIGN OUT
              </button>
            </div>

            {/* Toast */}
            <AnimatePresence>
              {toast && (
                <motion.div
                  initial={{ opacity: 0, y: 16, x: '-50%' }}
                  animate={{ opacity: 1, y: 0, x: '-50%' }}
                  exit={{ opacity: 0, x: '-50%' }}
                  style={{
                    position: 'absolute', bottom: 24, left: '50%',
                    padding: '10px 20px', borderRadius: 2, 
                    whiteSpace: 'normal', maxWidth: '340px', textAlign: 'center',
                    fontFamily: 'Orbitron, sans-serif', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase',
                    background: toast.ok ? 'rgba(18,14,10,0.97)' : 'rgba(30,8,8,0.97)',
                    border: toast.ok ? '1px solid var(--accent-gold)' : '1px solid #8B2A2A',
                    color: toast.ok ? 'var(--accent-gold)' : '#C06060',
                    zIndex: 200,
                  }}
                >
                  {toast.msg}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
