import { create } from 'zustand'

interface DragState {
  draggedCardId: string | null
  dragOverColumnId: string | null
  draggedColumnId: string | null
  dragOverColumnIndex: number | null
  setDraggedCardId: (id: string | null) => void
  setDragOverColumnId: (id: string | null) => void
  setDraggedColumnId: (id: string | null) => void
  setDragOverColumnIndex: (idx: number | null) => void
  clearDragState: () => void
}

export const useDragStore = create<DragState>((set) => ({
  draggedCardId: null,
  dragOverColumnId: null,
  draggedColumnId: null,
  dragOverColumnIndex: null,
  setDraggedCardId: (id) => set({ draggedCardId: id }),
  setDragOverColumnId: (id) => set({ dragOverColumnId: id }),
  setDraggedColumnId: (id) => set({ draggedColumnId: id }),
  setDragOverColumnIndex: (idx) => set({ dragOverColumnIndex: idx }),
  clearDragState: () => set({ draggedCardId: null, dragOverColumnId: null, draggedColumnId: null, dragOverColumnIndex: null }),
}))
