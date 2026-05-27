import { create } from 'zustand'

interface AppState {
  theme: 'light' | 'dark'
  sidebarOpen: boolean
  currentProjectId: string | null
  currentBoardId: string | null
  setTheme: (theme: 'light' | 'dark') => void
  toggleSidebar: () => void
  setCurrentProjectId: (id: string | null) => void
  setCurrentBoardId: (id: string | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  theme: 'light',
  sidebarOpen: true,
  currentProjectId: null,
  currentBoardId: null,
  setTheme: (theme) => set({ theme }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setCurrentProjectId: (id) => set({ currentProjectId: id }),
  setCurrentBoardId: (id) => set({ currentBoardId: id }),
}))
