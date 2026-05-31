import { create } from 'zustand';

export interface User {
  id: string;
  userId: string;
  username: string;
  email: string;
  displayName?: string;
  bio?: string;
  avatarIcon?: string;
  cosmicIdChanges?: number;
}

interface Letter {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  scheduledAt?: string;
  createdAt: string;
  paperSkin?: string;
  stickers?: any[];
}

interface Transmission {
  id: string;
  targetPlanet: string;
  data: Record<string, unknown>;
}

interface Friend {
  id: string;
  username: string;
  email?: string;
  isDeactivated?: boolean;
  displayName?: string;
  cosmic_id?: string;
}

interface Assignment {
  planetName: string;
  friend?: Friend;
}

interface Group {
  id: string;
  name: string;
  memberIds: string[];
}

interface ComposerRecipient {
  id: string;
  displayName: string;
  username: string;
  planetName: string;
}

interface AppState {
  user: User | null;
  token: string | null;
  letters: Letter[];
  unreadCount: number;
  selectedPlanet: string | null;
  activeTransmissions: Transmission[];
  isInboxOpen: boolean;
  isComposerOpen: boolean;
  composerRecipient: ComposerRecipient | null;
  friends: Friend[];
  assignments: Assignment[];
  groups: Group[];
  isGroupChatOpen: boolean;
  selectedGroupId: string | null;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLetters: (letters: Letter[]) => void;
  addLetter: (letter: Letter) => void;
  markRead: (id: string) => void;
  setSelectedPlanet: (name: string | null) => void;
  setInboxOpen: (open: boolean) => void;
  setComposerOpen: (open: boolean) => void;
  setComposerRecipient: (recipient: ComposerRecipient | null) => void;
  addTransmission: (targetPlanet: string, data: Record<string, unknown>) => void;
  removeTransmission: (id: string) => void;
  fetchFriends: () => Promise<void>;
  fetchGroups: () => Promise<void>;
  isBlackholeOpen: boolean;
  setBlackholeOpen: (open: boolean) => void;
  setGroupChatOpen: (open: boolean) => void;
  setSelectedGroupId: (id: string | null) => void;
  removeFriend: (friendId: string) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => {
  const storedUser = localStorage.getItem('cosmimail_user');
  let initialUser: User | null = null;
  try {
    if (storedUser) initialUser = JSON.parse(storedUser) as User;
  } catch {
    // ignore malformed stored user
  }

  return {
    user: initialUser,
    token: localStorage.getItem('cosmimail_token'),
    letters: [],
    unreadCount: 0,
    selectedPlanet: null,
    isInboxOpen: false,
    isComposerOpen: false,
    composerRecipient: null,
    activeTransmissions: [],
    friends: [],
    assignments: [],
    groups: [],
    isGroupChatOpen: false,
    selectedGroupId: null,
    isBlackholeOpen: false,

    setUser: (user) => set({ user }),
    setComposerRecipient: (recipient) => set({ composerRecipient: recipient }),
    setToken: (token) => {
      if (token) localStorage.setItem('cosmimail_token', token);
      else localStorage.removeItem('cosmimail_token');
      set({ token });
    },
    setLetters: (letters) =>
      set((s) => {
        const userId = s.user?.id;
        const unreadCount = letters.filter((l: any) => l.senderId !== userId && !l.isRead && !l.isPending).length;
        return { letters, unreadCount };
      }),
    addLetter: (letter) =>
      set((s) => {
        const userId = s.user?.id;
        const isReceivedUnread = letter.senderId !== userId && !letter.isRead && !letter.isPending;
        return {
          letters: [letter, ...s.letters],
          unreadCount: s.unreadCount + (isReceivedUnread ? 1 : 0),
        };
      }),
    markRead: (id) =>
      set((s) => ({
        letters: s.letters.map((l) => (l.id === id ? { ...l, isRead: true } : l)),
        unreadCount: Math.max(0, s.unreadCount - 1),
      })),
    setSelectedPlanet: (name) => set({ selectedPlanet: name }),
    setInboxOpen: (open) => set({ isInboxOpen: open }),
    setComposerOpen: (open) => set({ isComposerOpen: open }),
    addTransmission: (targetPlanet, data) =>
      set((s) => ({
        activeTransmissions: [
          ...s.activeTransmissions,
          { id: Math.random().toString(), targetPlanet, data },
        ],
      })),
    removeTransmission: (id) =>
      set((s) => ({
        activeTransmissions: s.activeTransmissions.filter((t) => t.id !== id),
      })),
    fetchFriends: async () => {
      try {
        const { api } = await import('../lib/api');
        const data = await api.get<{ friends: Friend[]; assignments: Assignment[] }>('/api/friends');
        set({ friends: data.friends, assignments: data.assignments });
      } catch (err) {
        console.error(err);
      }
    },
    fetchGroups: async () => {
      try {
        const { api } = await import('../lib/api');
        const data = await api.get<Group[]>('/api/groups');
        set({ groups: data });
      } catch (err) {
        console.error(err);
      }
    },
    setGroupChatOpen: (open) => set({ isGroupChatOpen: open }),
    setSelectedGroupId: (id) => set({ selectedGroupId: id }),
    setBlackholeOpen: (open) => set({ isBlackholeOpen: open }),
    removeFriend: (friendId) =>
      set((s) => ({
        friends: s.friends.filter((f) => f.id !== friendId),
        assignments: s.assignments.filter((a) => a.friend?.id !== friendId),
      })),
    logout: () => {
      localStorage.removeItem('cosmimail_token');
      set({
        user: null,
        token: null,
        letters: [],
        unreadCount: 0,
        selectedPlanet: null,
        friends: [],
        assignments: [],
        isInboxOpen: false,
        isComposerOpen: false,
      });
    },
  };
});
