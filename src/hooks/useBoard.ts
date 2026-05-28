import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getProject, getBoard, getBoardsByProject, createBoard, updateBoard, deleteBoard } from '../lib/tauri-api'

export function useBoardById(id: string | undefined) {
  return useQuery({
    queryKey: ['board', id],
    queryFn: () => getBoard(id!),
    enabled: !!id,
  })
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => getProject(id!),
    enabled: !!id,
  })
}

export function useBoards(projectId: string | undefined) {
  return useQuery({
    queryKey: ['boards', projectId],
    queryFn: () => getBoardsByProject(projectId!),
    enabled: !!projectId,
  })
}

export function useCreateBoard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { projectId: string; name: string }) => createBoard(params.projectId, params.name),
    onSuccess: (_data, variables) => qc.invalidateQueries({ queryKey: ['boards', variables.projectId] }),
  })
}

export function useUpdateBoard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { id: string; name: string; projectId: string; background?: string }) =>
      updateBoard(params.id, params.name, params.background),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['boards', variables.projectId] })
      qc.invalidateQueries({ queryKey: ['board', variables.id] })
    },
  })
}

export function useDeleteBoard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { id: string; projectId: string }) => deleteBoard(params.id),
    onSuccess: (_data, variables) => qc.invalidateQueries({ queryKey: ['boards', variables.projectId] }),
  })
}
