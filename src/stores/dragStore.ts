import { create } from 'zustand'

interface DragState {
  draggedCardId: string | null
  dragOverColumnId: string | null
  setDraggedCardId: (id: string | null) => void
  setDragOverColumnId: (id: string | null) => void
  clearDragState: () => void
}

export const useDragStore = create<DragState>((set) => ({
  draggedCardId: null,
  dragOverColumnId: null,
  setDraggedCardId: (id) => set({ draggedCardId: id }),
  setDragOverColumnId: (id) => set({ dragOverColumnId: id }),
  clearDragState: () => set({ draggedCardId: null, dragOverColumnId: null }),
}))
