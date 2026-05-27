import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTagsByBoard, getTagsByCard, createTag, deleteTag, addTagToCard, removeTagFromCard } from '../lib/tauri-api'

export function useTags(boardId: string | undefined) {
  return useQuery({
    queryKey: ['tags', boardId],
    queryFn: () => getTagsByBoard(boardId!),
    enabled: !!boardId,
  })
}

export function useCardTags(cardId: string | null) {
  return useQuery({
    queryKey: ['card-tags', cardId],
    queryFn: () => getTagsByCard(cardId!),
    enabled: !!cardId,
  })
}

export function useCreateTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { boardId: string; name: string; color?: string }) => createTag(params.boardId, params.name, params.color),
    onSuccess: (_data, variables) => qc.invalidateQueries({ queryKey: ['tags', variables.boardId] }),
  })
}

export function useDeleteTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { id: string; boardId: string }) => deleteTag(params.id),
    onSuccess: (_data, variables) => qc.invalidateQueries({ queryKey: ['tags', variables.boardId] }),
  })
}

export function useAddTagToCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { cardId: string; tagId: string }) => addTagToCard(params.cardId, params.tagId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['card-tags', variables.cardId] })
      qc.invalidateQueries({ queryKey: ['card', variables.cardId] })
    },
  })
}

export function useRemoveTagFromCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { cardId: string; tagId: string }) => removeTagFromCard(params.cardId, params.tagId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['card-tags', variables.cardId] })
      qc.invalidateQueries({ queryKey: ['card', variables.cardId] })
    },
  })
}
