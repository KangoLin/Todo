import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createSubtask, toggleSubtask, deleteSubtask } from '../lib/tauri-api'

export function useCreateSubtask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { cardId: string; title: string }) => createSubtask(params.cardId, params.title),
    onSuccess: (_data, variables) => qc.invalidateQueries({ queryKey: ['card', variables.cardId] }),
  })
}

export function useToggleSubtask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { id: string; cardId: string }) => toggleSubtask(params.id),
    onSuccess: (_data, variables) => qc.invalidateQueries({ queryKey: ['card', variables.cardId] }),
  })
}

export function useDeleteSubtask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { id: string; cardId: string }) => deleteSubtask(params.id),
    onSuccess: (_data, variables) => qc.invalidateQueries({ queryKey: ['card', variables.cardId] }),
  })
}
