import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCommentsByCard, createComment, deleteComment } from '../lib/tauri-api'

export function useComments(cardId: string | undefined) {
  return useQuery({
    queryKey: ['comments', cardId],
    queryFn: () => getCommentsByCard(cardId!),
    enabled: !!cardId,
  })
}

export function useCreateComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { cardId: string; content: string }) =>
      createComment(params.cardId, params.content),
    onSuccess: (_data, variables) =>
      qc.invalidateQueries({ queryKey: ['comments', variables.cardId] }),
  })
}

export function useDeleteComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { id: string; cardId: string }) => deleteComment(params.id),
    onSuccess: (_data, variables) =>
      qc.invalidateQueries({ queryKey: ['comments', variables.cardId] }),
  })
}
