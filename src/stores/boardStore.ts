import { create } from 'zustand'

interface BoardState {
  cardDetailId: string | null
  tagManagerOpen: boolean
  setCardDetailId: (id: string | null) => void
  setTagManagerOpen: (open: boolean) => void
}

export const useBoardStore = create<BoardState>((set) => ({
  cardDetailId: null,
  tagManagerOpen: false,
  setCardDetailId: (id) => set({ cardDetailId: id }),
  setTagManagerOpen: (open) => set({ tagManagerOpen: open }),
}))
