import { create } from 'zustand'

export const useSystemStore = create((set) => ({
  hoveredPlanet:  null,
  selectedPlanet: null,
  unreadCount:    3,
  tooltipPos:     { x: 0, y: 0 },
  
  setHoveredPlanet:  (p) => set({ hoveredPlanet: p }),
  setSelectedPlanet: (p) => set({ selectedPlanet: p }),
  clearSelection:    ()  => set({ selectedPlanet: null }),
  setUnreadCount:    (n) => set({ unreadCount: n }),
  setTooltipPos:     (pos) => set({ tooltipPos: pos }),
}))
