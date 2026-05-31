/* eslint-disable react/forbid-dom-props, react/forbid-component-props */
import { Suspense, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SolarSystem from '../three/SolarSystem';
import { useAppStore } from '../store/useAppStore';
import { api } from '../lib/api';
import { getSocket, connectSocket, disconnectSocket } from '../lib/socket';
import { supabase } from '../lib/supabase';
import LetterComposer from '../components/LetterComposer';
import LetterInbox from '../components/LetterInbox';
import PlanetDetails from '../components/PlanetDetails';
import GroupChat from '../components/GroupChat';
import SettingsOverlay from '../components/SettingsOverlay';
import FriendSearchModal from '../components/FriendSearchModal';
import FriendRequestsModal from '../components/FriendRequestsModal';
import BlackholePanel from '../components/BlackholePanel';

export default function HomePage() {
  const {
    user, token, unreadCount, setLetters, addLetter,
    isComposerOpen, setComposerOpen, isInboxOpen, setInboxOpen,
    isBlackholeOpen, setBlackholeOpen,
  } = useAppStore();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isRequestsOpen, setIsRequestsOpen] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [toastMessage, setToastMessage] = useState('');

  // Load letters, groups, and pending requests on mount, and poll every 30 seconds
  useEffect(() => {
    if (!token) return;
    
    const fetchL = () => {
      api.get<any[]>('/api/letters').then(data => {
        const mapped = data.map(l => ({
          id: l.id,
          senderId: l.sender_id,
          receiverId: l.recipient_id,
          content: l.body,
          isRead: !!l.read_at,
          scheduledAt: l.deliver_at,
          createdAt: l.sent_at,
          paperSkin: l.paper_skin,
          stickers: l.stickers || [],
          isFutureSelf: l.is_future_self || false,
          isPending: new Date(l.deliver_at) > new Date(), // true if not yet delivered
        }));
        setLetters(mapped);
      }).catch(() => {});
    };

    const fetchRequestsCount = () => {
      api.get<{ requests: any[] }>('/api/friends/requests/incoming')
        .then(res => setPendingRequestsCount((res.requests || []).length))
        .catch(() => {});
    };

    fetchL();
    fetchRequestsCount();
    
    const interval = setInterval(() => {
      fetchL();
      fetchRequestsCount();
    }, 30000); // 30 seconds

    const store = useAppStore.getState();
    if (store.fetchGroups) store.fetchGroups();

    return () => clearInterval(interval);
  }, [token, setLetters]);

  // Enrich user with displayName from all sources
  useEffect(() => {
    const enrichUser = async () => {
      const store = useAppStore.getState();
      let enriched = { ...(store.user || {}) } as any;

      // Layer 1: localStorage
      try {
        const raw = localStorage.getItem('cosmimail_user');
        if (raw) {
          const parsed = JSON.parse(raw);
          enriched.displayName = parsed.displayName || parsed.display_name || parsed.user_metadata?.display_name || parsed.user_metadata?.displayName || enriched.displayName || '';
          enriched.username = parsed.username || parsed.cosmic_id || parsed.user_metadata?.username || enriched.username || '';
        }
      } catch {}

      // Layer 2: Supabase session
      try {
        const { data: { user: supaUser } } = await supabase.auth.getUser();
        if (supaUser?.user_metadata) {
          const meta = supaUser.user_metadata;
          if (meta.display_name || meta.displayName) enriched.displayName = meta.display_name || meta.displayName;
          if (meta.username) enriched.username = meta.username;
        }
      } catch {}

      // Layer 3: Backend API
      if (token) {
        try {
          const res = await api.get<any>('/api/users/me');
          if (res.user) {
            if (res.user.displayName || res.user.display_name) enriched.displayName = res.user.displayName || res.user.display_name;
            if (res.user.username || res.user.cosmic_id) enriched.username = res.user.username || res.user.cosmic_id;
            enriched.bio = res.user.bio || '';
            enriched.avatarIcon = res.user.avatar_icon || '';
            enriched.cosmicIdChanges = res.user.cosmic_id_changes || 0;
          }
        } catch {}
      }

      if (enriched.displayName || enriched.username) store.setUser(enriched);
    };
    enrichUser();
  }, [token]);

  // Socket: connect and listen for new letters
  useEffect(() => {
    if (!token) return;
    const s = connectSocket(token);
    const handleNewLetter = (letter: any) => {
      const mapped = {
        id: letter.id,
        senderId: letter.sender_id || letter.senderId,
        receiverId: letter.recipient_id || letter.receiverId,
        content: letter.body || letter.content,
        isRead: !!letter.read_at,
        scheduledAt: letter.deliver_at || letter.scheduledAt,
        createdAt: letter.sent_at || letter.createdAt,
        paperSkin: letter.paper_skin || letter.paperSkin,
        stickers: letter.stickers || []
      };
      addLetter(mapped);
      setToastMessage(`New transmission from @${letter.fromCosmicId || letter.fromUsername || 'traveler'}!`);
      setTimeout(() => setToastMessage(''), 4000);
    };
    s.on('new_letter', handleNewLetter);
    return () => {
      s.off('new_letter', handleNewLetter);
      disconnectSocket();
    };
  }, [token, addLetter]);

  const navAvatarHue = (user?.username || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360;

  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      {/* 3D Canvas */}
      <Suspense fallback={<div className="fixed inset-0 bg-black flex items-center justify-center text-white/40">Initializing solar system…</div>}>
        <SolarSystem hideReturnButton={isInboxOpen || isComposerOpen || isSettingsOpen || isSearchOpen || isBlackholeOpen} />
      </Suspense>

      {/* HUD NavBar */}
      <AnimatePresence>
        {user && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed top-0 left-0 right-0 z-40 pointer-events-none"
          >
            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 24px', pointerEvents: 'auto',
                background: 'rgba(10, 8, 6, 0.92)',
                backdropFilter: 'blur(20px)',
                borderBottom: '1px solid rgba(180,140,80,0.15)',
              }}
            >
              {/* Logo */}
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                onClick={() => window.location.reload()}
                role="button" tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && window.location.reload()}
              >
                <div style={{ color: 'var(--accent-gold)', display: 'flex' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="5"/>
                    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                  </svg>
                </div>
                <div>
                  <h1 style={{ fontFamily: 'Orbitron, sans-serif', color: 'var(--accent-gold)', fontSize: 14, letterSpacing: 2, fontWeight: 700, margin: 0, lineHeight: 1 }}>Space Messenger</h1>
                  <p style={{ color: 'var(--text-dim)', fontSize: 10, margin: '3px 0 0', fontFamily: "'Exo 2', sans-serif" }}>@{user.username || user.userId || 'traveler'}</p>
                </div>
              </div>

              {/* Nav buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Search */}
                <button
                  onClick={() => setIsSearchOpen(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 16px', background: 'rgba(200,160,80,0.06)', border: '1px solid rgba(180,140,80,0.2)', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: 2, fontFamily: "'Exo 2', sans-serif", fontSize: 13, transition: 'border-color 0.2s, color 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent-gold)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-gold)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(180,140,80,0.2)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  Search
                </button>

                {/* Requests */}
                <button
                  onClick={() => setIsRequestsOpen(true)}
                  style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 7, padding: '7px 16px', background: 'rgba(200,160,80,0.06)', border: '1px solid rgba(180,140,80,0.2)', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: 2, fontFamily: "'Exo 2', sans-serif", fontSize: 13, transition: 'border-color 0.2s, color 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent-gold)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-gold)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(180,140,80,0.2)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  Requests
                  {pendingRequestsCount > 0 && (
                    <motion.div
                      initial={{ scale: 0 }} animate={{ scale: 1 }}
                      style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: 'var(--accent-gold)', color: '#0A0806', fontSize: 9, fontWeight: 700, fontFamily: 'Orbitron, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(10,8,6,0.8)' }}
                    >
                      {pendingRequestsCount}
                    </motion.div>
                  )}
                </button>

                {/* Inbox */}
                <div className="relative">
                  <AnimatePresence>
                    {unreadCount > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 5, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.9 }}
                        style={{
                          position: 'absolute',
                          top: -30,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          whiteSpace: 'nowrap',
                          background: 'rgba(10, 8, 6, 0.95)',
                          border: '1px solid var(--accent-gold)',
                          borderRadius: '4px',
                          padding: '3px 8px',
                          color: 'var(--accent-gold)',
                          fontSize: '8px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                          fontFamily: 'Orbitron, sans-serif',
                          boxShadow: '0 0 10px rgba(212, 175, 55, 0.3)',
                          pointerEvents: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          zIndex: 50,
                        }}
                      >
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Unseen Letter
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    onClick={() => setInboxOpen(true)}
                    style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 7, padding: '7px 16px', background: 'rgba(200,160,80,0.06)', border: '1px solid rgba(180,140,80,0.2)', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: 2, fontFamily: "'Exo 2', sans-serif", fontSize: 13, transition: 'border-color 0.2s, color 0.2s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent-gold)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-gold)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(180,140,80,0.2)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    Inbox
                    {unreadCount > 0 && (
                      <motion.div
                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                        style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: 'var(--accent-gold)', color: '#0A0806', fontSize: 9, fontWeight: 700, fontFamily: 'Orbitron, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(10,8,6,0.8)' }}
                      >
                        {unreadCount}
                      </motion.div>
                    )}
                  </button>
                </div>

                {/* Settings / User */}
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px 6px 8px', background: 'rgba(200,160,80,0.06)', border: '1px solid rgba(180,140,80,0.2)', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: 2, transition: 'border-color 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent-gold)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(180,140,80,0.2)'; }}
                >
                  <div style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: 10, color: '#F0E8D8', background: `conic-gradient(from 0deg, hsl(${navAvatarHue},35%,22%), hsl(${(navAvatarHue + 60) % 360},30%,28%))`, border: '1px solid rgba(180,140,80,0.3)', flexShrink: 0 }}>
                    {(user.displayName?.[0] || user.username?.[0] || 'U').toUpperCase()}
                  </div>
                  <span style={{ fontFamily: "'Exo 2', sans-serif", fontSize: 13 }}>{user.displayName || user.username || 'Traveler'}</span>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.4 }}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <LetterComposer isOpen={isComposerOpen} onClose={() => setComposerOpen(false)} />
      <LetterInbox isOpen={isInboxOpen} onClose={() => setInboxOpen(false)} onCompose={() => { setInboxOpen(false); setComposerOpen(true); }} />
      <PlanetDetails onCompose={() => setComposerOpen(true)} />
      <GroupChat />
      <SettingsOverlay isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <FriendSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} onCompose={() => { setIsSearchOpen(false); setComposerOpen(true); }} />
      <FriendRequestsModal isOpen={isRequestsOpen} onClose={() => setIsRequestsOpen(false)} />
      <BlackholePanel isOpen={isBlackholeOpen} onClose={() => setBlackholeOpen(false)} />

      {/* Global Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            style={{ position: 'fixed', top: 76, left: '50%', transform: 'translateX(-50%)', zIndex: 50, pointerEvents: 'none' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px', background: 'rgba(18,14,10,0.97)', border: '1px solid var(--accent-gold)', borderRadius: 2, color: 'var(--accent-gold)', fontFamily: 'Orbitron, sans-serif', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', boxShadow: '0 0 20px rgba(200,160,80,0.15)', whiteSpace: 'nowrap' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              {toastMessage}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
