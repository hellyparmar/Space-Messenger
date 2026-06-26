/* eslint-disable react/forbid-dom-props, react/forbid-component-props */
import { Suspense, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SolarSystem from '../three/SolarSystem';
import { useAppStore } from '../store/useAppStore';
import type { Letter, User, Sticker } from '../store/useAppStore';
import { api } from '../lib/api';
import { connectSocket, disconnectSocket } from '../lib/socket';
import { supabase } from '../lib/supabase';
import LetterComposer from '../components/LetterComposer';
import LetterInbox from '../components/LetterInbox';
import PlanetDetails from '../components/PlanetDetails';
import GroupChat from '../components/GroupChat';
import SettingsOverlay from '../components/SettingsOverlay';
import { CUTE_DOODLES } from '../lib/avatars';
import FriendSearchModal from '../components/FriendSearchModal';
import FriendRequestsModal from '../components/FriendRequestsModal';
import BlackholePanel from '../components/BlackholePanel';
import GroupsModal from '../components/GroupsModal';

export default function HomePage() {
  const {
    user, token, unreadCount, setLetters, addLetter,
    isComposerOpen, setComposerOpen, isInboxOpen, setInboxOpen,
    isBlackholeOpen, setBlackholeOpen, setInboxFriendFilter,
  } = useAppStore();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isRequestsOpen, setIsRequestsOpen] = useState(false);
  const [isGroupsOpen, setIsGroupsOpen] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [toastMessage, setToastMessage] = useState('');

  // Load letters, groups, and pending requests on mount, and poll every 30 seconds
  useEffect(() => {
    if (!token) return;
    
    const fetchL = () => {
      api.get<Record<string, unknown>[]>('/api/letters').then(data => {
        const mapped: Letter[] = data.map(l => ({
          id: String(l.id || ''),
          senderId: String(l.sender_id || ''),
          receiverId: String(l.recipient_id || ''),
          content: String(l.body || ''),
          isRead: !!(l.read_at),
          scheduledAt: l.deliver_at ? String(l.deliver_at) : undefined,
          createdAt: String(l.sent_at || ''),
          paperSkin: l.paper_skin ? String(l.paper_skin) : undefined,
          stickers: Array.isArray(l.stickers) ? (l.stickers as Sticker[]) : [],
          isFutureSelf: Boolean(l.is_future_self),
          isPending: l.deliver_at ? (new Date(l.deliver_at as string) > new Date()) : false,
        }));
        setLetters(mapped);
      }).catch(() => {});
    };

    const fetchRequestsCount = () => {
      api.get<{ requests: { id: string }[] }>('/api/friends/requests/incoming')
        .then(res => setPendingRequestsCount((res.requests || []).length))
        .catch(() => {});
    };

    fetchL();
    fetchRequestsCount();
    // Fetch friends/assignments on mount so PlanetDetails always has data
    useAppStore.getState().fetchFriends();
    
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
      const enriched: User = {
        id: store.user?.id || '',
        userId: store.user?.userId || '',
        email: store.user?.email || '',
        username: store.user?.username || '',
        displayName: store.user?.displayName,
        bio: store.user?.bio,
        avatarIcon: store.user?.avatarIcon,
        cosmicIdChanges: store.user?.cosmicIdChanges,
      };

      // Layer 1: localStorage
      try {
        const raw = localStorage.getItem('cosmimail_user');
        if (raw) {
          const parsed = JSON.parse(raw);
          enriched.id = parsed.id || parsed.userId || enriched.id;
          enriched.userId = parsed.userId || parsed.id || enriched.userId;
          enriched.email = parsed.email || enriched.email;
          enriched.displayName = parsed.displayName || parsed.display_name || parsed.user_metadata?.display_name || parsed.user_metadata?.displayName || enriched.displayName || '';
          enriched.username = parsed.username || parsed.cosmic_id || parsed.user_metadata?.username || enriched.username || '';
        }
      } catch {}

      // Layer 2: Supabase session
      try {
        const { data: { user: supaUser } } = await supabase.auth.getUser();
        if (supaUser) {
          enriched.id = supaUser.id || enriched.id;
          enriched.userId = supaUser.id || enriched.userId;
          enriched.email = supaUser.email || enriched.email;
          if (supaUser.user_metadata) {
            const meta = supaUser.user_metadata;
            if (meta.display_name || meta.displayName) enriched.displayName = meta.display_name || meta.displayName;
            if (meta.username) enriched.username = meta.username;
          }
        }
      } catch {}

      // Layer 3: Backend API
      if (token) {
        try {
          const res = await api.get<{ user?: { id?: string; displayName?: string; display_name?: string; username?: string; cosmic_id?: string; bio?: string; avatar_icon?: string; cosmic_id_changes?: number } }>('/api/users/me');
          if (res.user) {
            enriched.id = res.user.id || enriched.id;
            enriched.userId = res.user.id || enriched.userId;
            if (res.user.displayName || res.user.display_name) enriched.displayName = res.user.displayName || res.user.display_name;
            const usernameVal = res.user.username || res.user.cosmic_id;
            if (usernameVal) enriched.username = usernameVal;
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
    const handleNewLetter = (letter: Record<string, unknown>) => {
      const mapped: Letter = {
        id: String(letter.id || ''),
        senderId: String(letter.sender_id || letter.senderId || ''),
        receiverId: String(letter.recipient_id || letter.receiverId || ''),
        content: String(letter.body || letter.content || ''),
        isRead: !!(letter.read_at || letter.isRead),
        scheduledAt: (letter.deliver_at || letter.scheduledAt) ? String(letter.deliver_at || letter.scheduledAt) : undefined,
        createdAt: String(letter.sent_at || letter.createdAt || ''),
        paperSkin: (letter.paper_skin || letter.paperSkin) ? String(letter.paper_skin || letter.paperSkin) : undefined,
        stickers: Array.isArray(letter.stickers) ? (letter.stickers as Sticker[]) : [],
        isFutureSelf: Boolean(letter.is_future_self || letter.isFutureSelf),
        isPending: (letter.deliver_at || letter.scheduledAt) ? (new Date((letter.deliver_at || letter.scheduledAt) as string) > new Date()) : false,
      };
      addLetter(mapped);
      setToastMessage(`New transmission from @${(letter.fromCosmicId || letter.fromUsername || 'traveler') as string}!`);
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
        <SolarSystem hideReturnButton={isInboxOpen || isComposerOpen || isSettingsOpen || isSearchOpen || isBlackholeOpen || isGroupsOpen} />
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
            <div className="hud-navbar">
              {/* Logo */}
              <div
                className="hud-logo-wrap"
                onClick={() => window.location.reload()}
                role="button" tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && window.location.reload()}
              >
                <div className="hud-logo-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="5"/>
                    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                  </svg>
                </div>
                 <div className="logo-text">
                  <h1 className="hud-logo-title">Space Messenger</h1>
                  <p className="hud-logo-subtitle">@{user.username || user.userId || 'traveler'}</p>
                </div>
              </div>

              {/* Nav buttons */}
              <div className="hud-nav-buttons">
                {/* Search */}
                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="nav-btn"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <span className="nav-label">Search</span>
                </button>


                {/* Requests */}
                <button
                  onClick={() => setIsRequestsOpen(true)}
                  className="nav-btn"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <span className="nav-label">Requests</span>
                  {pendingRequestsCount > 0 && (
                    <motion.div
                      initial={{ scale: 0 }} animate={{ scale: 1 }}
                      className="hud-badge"
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
                        className="hud-unseen-tooltip"
                      >
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Unseen Letter
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    onClick={() => setInboxOpen(true)}
                    className="nav-btn"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    <span className="nav-label">Inbox</span>
                    {unreadCount > 0 && (
                      <motion.div
                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="hud-badge"
                      >
                        {unreadCount}
                      </motion.div>
                    )}
                  </button>
                </div>

                {/* Settings / User */}
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="nav-btn nav-btn--avatar"
                >
                  <div
                    className="hud-user-avatar"
                    style={{ ['--avatar-hue' as any]: navAvatarHue }}
                  >
                    {user.avatarIcon ? (
                      CUTE_DOODLES.find((d: { id: string }) => d.id === user.avatarIcon)?.svg || 
                      (user.displayName?.trim()?.[0] || user.username?.trim()?.[0] || 'U').toUpperCase()
                    ) : (
                      (user.displayName?.trim()?.[0] || user.username?.trim()?.[0] || 'U').toUpperCase()
                    )}
                  </div>
                  <span className="nav-user-name">{user.displayName || user.username || 'Traveler'}</span>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="nav-svg-dim"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <LetterComposer isOpen={isComposerOpen} onClose={() => setComposerOpen(false)} />
      <LetterInbox isOpen={isInboxOpen} onClose={() => { setInboxFriendFilter(null); setInboxOpen(false); }} onCompose={() => { setInboxOpen(false); setComposerOpen(true); }} />
      <PlanetDetails onCompose={() => setComposerOpen(true)} />
      <GroupChat />
      <SettingsOverlay isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <FriendSearchModal 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
        onCompose={() => { setIsSearchOpen(false); setComposerOpen(true); }} 
        onOpenGroups={() => { setIsSearchOpen(false); setIsGroupsOpen(true); }}
      />
      <FriendRequestsModal isOpen={isRequestsOpen} onClose={() => setIsRequestsOpen(false)} />
      <BlackholePanel isOpen={isBlackholeOpen} onClose={() => setBlackholeOpen(false)} />
      <GroupsModal isOpen={isGroupsOpen} onClose={() => setIsGroupsOpen(false)} />

      {/* Global Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="hud-toast-wrapper"
          >
            <div className="hud-toast-inner">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              {toastMessage}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
