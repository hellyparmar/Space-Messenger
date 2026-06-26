import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { CUTE_DOODLES } from '../lib/avatars';

const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
          const res = await fetch(`${API_BASE}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } });
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
    if (cosmicIdChanges < 3 && user?.username !== username) {
      if (username.length < 3 || username.length > 20) {
        showToast('Cosmic ID must be between 3 and 20 characters.', false);
        return;
      }
      const validFormat = /^[a-z0-9][a-z0-9_]{1,18}[a-z0-9]$/.test(username);
      if (!validFormat) {
        showToast('Cosmic ID must start/end with letters/numbers, and use lowercase, numbers, and underscores only.', false);
        return;
      }
    }

    setIsSaving(true);
    try {
      const r = await api.patch<{ user: Record<string, unknown> }>('/api/users/me', { 
        display_name: displayName, 
        bio,
        cosmic_id: username,
        avatar_icon: avatarIcon
      });
      if (user) {
        setUser({ 
          ...user, 
          username: String(r.user.cosmic_id || username),
          displayName: String(r.user.display_name || displayName),
          bio: String(r.user.bio || bio),
          avatarIcon: r.user.avatar_icon ? String(r.user.avatar_icon) : undefined,
          cosmicIdChanges: typeof r.user.cosmic_id_changes === 'number' ? r.user.cosmic_id_changes : cosmicIdChanges
        });
      }
      setUsername(String(r.user.cosmic_id || username));
      setCosmicIdChanges(typeof r.user.cosmic_id_changes === 'number' ? r.user.cosmic_id_changes : cosmicIdChanges);
      showToast('Transmission recorded', true);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : (typeof err === 'object' && err !== null && 'message' in err ? String((err as Record<string, unknown>).message) : 'Transmission failed');
      showToast(errMsg, false);
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

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await api.delete('/api/users/me');
      await supabase.auth.signOut();
      localStorage.removeItem('cosmimail_token');
      localStorage.removeItem('cosmimail_user');
      logout();
      onClose();
      window.location.href = '/login';
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to delete account';
      showToast(errMsg, false);
      setIsDeleting(false);
    }
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
            className="settings-backdrop-overlay"
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 250 }}
            className="cosmic-card parchment-scroll settings-modal-container"
          >
            {/* Top accent rule */}
            <div className="settings-top-rule" />

            {/* Header */}
            <div className="settings-header">
              <div className="settings-header-row">
                <div>
                  <h2 className="settings-header-title">SETTINGS</h2>
                  <p className="settings-header-subtitle">MISSION CONTROL</p>
                </div>
                <button
                  title="Close"
                  onClick={onClose}
                  className="settings-close-btn"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="parchment-scroll settings-body">
              
              {/* Avatar */}
              <div className="settings-avatar-section">
                <div 
                  onClick={() => setIsChoosingAvatar(!isChoosingAvatar)}
                  className="settings-avatar-circle"
                  style={{ ['--avatar-hue' as any]: hue }}
                >
                  {avatarIcon ? CUTE_DOODLES.find(d => d.id === avatarIcon)?.svg || avatarLetter : avatarLetter}
                </div>
                
                <AnimatePresence>
                  {isChoosingAvatar && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="settings-avatar-dropdown"
                    >
                      <div 
                        onClick={() => { setAvatarIcon(null); setIsChoosingAvatar(false); }}
                        className={`settings-avatar-option initials ${!avatarIcon ? 'selected' : ''}`}
                      >
                        {avatarLetter}
                      </div>
                      {CUTE_DOODLES.map(doodle => (
                        <div
                          key={doodle.id}
                          onClick={() => { setAvatarIcon(doodle.id); setIsChoosingAvatar(false); }}
                          className={`settings-avatar-option ${avatarIcon === doodle.id ? 'selected' : ''}`}
                        >
                          {doodle.svg}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <p className="settings-profile-name">{displayName || username || 'Unknown'}</p>
                <p className="settings-profile-handle">@{username}</p>
              </div>

              {/* Divider */}
              <div className="settings-divider">
                <span>◆</span>
              </div>

              {/* Display Name */}
              <div className="settings-field-group">
                <label className="settings-field-label">
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
              <div className="settings-field-group">
                <label className="settings-field-label">
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value.slice(0, 50))}
                  rows={3}
                  placeholder="Brief transmission for the records..."
                  className="settings-bio-textarea"
                />
                <p style={{ textAlign: 'right', fontSize: 10, color: 'var(--text-dim)', margin: '4px 0 0', fontFamily: 'monospace' }}>{bio.length}/50</p>
              </div>

              {/* Cosmic ID */}
              <div className="settings-field-group cosmic-id">
                <label className="settings-field-label cosmic-id-label">
                  <div className="settings-cosmic-id-label-inner">
                    Cosmic ID
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="settings-cosmic-id-lock-icon"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </div>
                  <span className="settings-cosmic-id-changes-badge">
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
                  <div className="settings-immutable-id-container">
                    <span className="settings-immutable-id-text">@{username}</span>
                  </div>
                )}
                
                <p className="settings-field-helper-text">
                  {cosmicIdChanges < 3 ? 'Choose carefully. Cosmic IDs are permanent after 3 changes.' : 'Cosmic ID is immutable. Changes exhausted.'}
                </p>
              </div>

              {/* Save */}
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="settings-save-btn"
              >
                {isSaving ? 'TRANSMITTING...' : 'SAVE CHANGES'}
              </button>

              {/* Divider */}
              <div className="settings-divider">
                <span>◆</span>
              </div>

              {/* Departure */}
              <p className="settings-danger-label">
                Departure Protocols
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <button
                  onClick={handleLogout}
                  className="settings-signout-btn"
                >
                  SIGN OUT
                </button>

                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="settings-delete-btn"
                  >
                    DELETE ACCOUNT
                  </button>
                ) : (
                  <div className="settings-delete-confirm-box">
                    <p className="settings-delete-confirm-title">Self-Destruct Sequence</p>
                    <p className="settings-delete-confirm-desc">
                      This will delete all your transmissions, friendships, and account logs permanently. This action is irreversible.
                    </p>
                    <div className="settings-delete-confirm-actions">
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="settings-delete-cancel-btn"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDeleteAccount}
                        disabled={isDeleting}
                        className="settings-delete-confirm-btn"
                      >
                        {isDeleting ? 'PURGING...' : 'Confirm'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Toast */}
            <AnimatePresence>
              {toast && (
                <motion.div
                  initial={{ opacity: 0, y: 16, x: '-50%' }}
                  animate={{ opacity: 1, y: 0, x: '-50%' }}
                  exit={{ opacity: 0, x: '-50%' }}
                  className={`settings-toast ${toast.ok ? 'success' : 'error'}`}
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
