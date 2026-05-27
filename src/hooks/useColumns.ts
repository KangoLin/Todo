import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getColumnsByBoard, createColumn, updateColumn, deleteColumn } from '../lib/tauri-api'

export function useColumns(boardId: string | undefined) {
  return useQuery({
    queryKey: ['columns', boardId],
    queryFn: () => getColumnsByBoard(boardId!),
    enabled: !!boardId,
  })
}

export function useCreateColumn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { boardId: string; name: string; sortOrder?: number }) =>
      createColumn(params.boardId, params.name, params.sortOrder),
    onSuccess: (_data, variables) => qc.invalidateQueries({ queryKey: ['columns', variables.boardId] }),
  })
}

export function useUpdateColumn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { id: string; name?: string; wipLimit?: number; boardId: string }) =>
      updateColumn(params.id, params.name, params.wipLimit),
    onSuccess: (_data, variables) => qc.invalidateQueries({ queryKey: ['columns', variables.boardId] }),
  })
}

export function useDeleteColumn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { id: string; boardId: string }) => deleteColumn(params.id),
    onSuccess: (_data, variables) => qc.invalidateQueries({ queryKey: ['columns', variables.boardId] }),
  })
}
