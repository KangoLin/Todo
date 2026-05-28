import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCardsByColumn, getCard, createCard, updateCard, deleteCard, archiveCard, restoreCard, getArchivedCardsByBoard, moveCard, moveCardWithinColumn, copyCard } from '../lib/tauri-api'

export function useCards(columnId: string | undefined) {
  return useQuery({
    queryKey: ['cards', columnId],
    queryFn: () => getCardsByColumn(columnId!),
    enabled: !!columnId,
  })
}

export function useCardDetail(cardId: string | null) {
  return useQuery({
    queryKey: ['card', cardId],
    queryFn: () => getCard(cardId!),
    enabled: !!cardId,
  })
}

export function useArchivedCards(boardId: string | undefined) {
  return useQuery({
    queryKey: ['archived_cards', boardId],
    queryFn: () => getArchivedCardsByBoard(boardId!),
    enabled: !!boardId,
  })
}

export function useCreateCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { columnId: string; title: string }) => createCard(params.columnId, params.title),
    onSuccess: (_data, variables) => qc.invalidateQueries({ queryKey: ['cards', variables.columnId] }),
  })
}

export function useUpdateCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { id: string } & Parameters<typeof updateCard>[1]) => updateCard(params.id, params),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['card', variables.id] })
      qc.invalidateQueries({ queryKey: ['cards'] })
    },
  })
}

export function useDeleteCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCard(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cards'] })
      qc.invalidateQueries({ queryKey: ['archived_cards'] })
    },
  })
}

export function useArchiveCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => archiveCard(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cards'] })
      qc.invalidateQueries({ queryKey: ['archived_cards'] })
    },
  })
}

export function useRestoreCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => restoreCard(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cards'] })
      qc.invalidateQueries({ queryKey: ['archived_cards'] })
    },
  })
}

export function useMoveCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { cardId: string; columnId: string }) =>
      moveCard(params.cardId, params.columnId, 9999),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cards'] }),
  })
}

export function useMoveCardWithinColumn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { cardId: string; targetSortOrder: number }) =>
      moveCardWithinColumn(params.cardId, params.targetSortOrder),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cards'] }),
  })
}

export function useCopyCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { cardId: string; targetColumnId: string }) =>
      copyCard(params.cardId, params.targetColumnId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cards'] }),
  })
}
