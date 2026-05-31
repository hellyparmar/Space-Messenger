import { create } from 'zustand'

export const useStore = create((set) => ({
    // User state
    user: {
        name: 'You (Sun)',
        unreadMessages: 3, // Initial mock data for brightness
    },

    // Contacts mock data
    contacts: [
        // --- Inner Planets ---
        {
            id: 'mercury',
            name: 'Mercury',
            type: 'planet',
            position: [10, 0, 5],
            size: 0.8,
            color: '#A5A5A5',
            textureUrl: null,
            messages: []
        },
        {
            id: 'venus',
            name: 'Venus',
            type: 'planet',
            position: [18, 0, -12],
            size: 1.5,
            color: '#E3BB76',
            textureUrl: null,
            messages: []
        },
        {
            id: 'earth',
            name: 'Earth',
            type: 'planet',
            position: [28, 0, 15],
            size: 1.6,
            color: 'blue',
            textureUrl: '/textures/earth_texture_1768572707260.png',
            messages: ['Hey! Did you see that movie?']
        },
        {
            id: 'mars',
            name: 'Mars',
            type: 'planet',
            position: [-35, 0, 20],
            size: 1.2,
            color: '#c1440e',
            textureUrl: '/textures/mars_texture_1768572725729.png',
            messages: []
        },

        // --- Outer Planets (Gas Giants) ---
        {
            id: 'jupiter',
            name: 'Jupiter',
            type: 'planet',
            position: [55, 0, -30],
            size: 4.5,
            color: '#D9CDB1',
            textureUrl: null,
            messages: []
        },
        {
            id: 'saturn',
            name: 'Saturn',
            type: 'planet',
            position: [-75, 0, 40],
            size: 4,
            color: '#F4D03F',
            textureUrl: null,
            messages: [],
            hasRings: true
        },
        {
            id: 'uranus',
            name: 'Uranus',
            type: 'planet',
            position: [95, 0, 25],
            size: 3,
            color: '#ACE5EE',
            textureUrl: null,
            messages: []
        },
        {
            id: 'neptune',
            name: 'Neptune',
            type: 'planet',
            position: [-110, 0, -15],
            size: 2.9,
            color: '#4b70dd',
            textureUrl: null,
            messages: []
        },

        // --- Stars/Others ---
        { id: 'alpha-centauri', name: 'Alpha Centauri', type: 'star', position: [150, 40, -150], size: 2, color: 'yellow', textureUrl: null, messages: [] },
        { id: 'sirius', name: 'Sirius', type: 'star', position: [-200, -30, 100], size: 2.5, color: 'white', textureUrl: null, messages: [] },
        { id: 'old-friend', name: 'Old Friend', type: 'dead-star', position: [250, 60, 0], size: 1, color: 'grey', textureUrl: null, messages: [] },
        { id: 'ex', name: 'Ex', type: 'blackhole', position: [-300, 0, -300], size: 3, color: 'black', textureUrl: null, messages: [] },
    ],

    // UI State
    activeChat: null,
    setActiveChat: (contactId) => set((state) => ({
        activeChat: state.contacts.find(c => c.id === contactId) || null
    })),
    closeChat: () => set({ activeChat: null }),

    // Flight/Animation State
    flights: [],
    addFlight: (flight) => set((state) => ({
        flights: [...state.flights, { ...flight, id: Math.random().toString(36).substr(2, 9) }]
    })),
    removeFlight: (id) => set((state) => ({
        flights: state.flights.filter(f => f.id !== id)
    })),

    // Actions
    addUnread: () => set((state) => ({
        user: { ...state.user, unreadMessages: state.user.unreadMessages + 1 }
    })),
    clearUnread: () => set((state) => ({
        user: { ...state.user, unreadMessages: 0 }
    })),
}))
