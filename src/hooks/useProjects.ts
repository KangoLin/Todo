import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAllProjects, createProject, updateProject, deleteProject } from '../lib/tauri-api'

export function useProjects() {
  return useQuery({ queryKey: ['projects'], queryFn: getAllProjects })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { name: string; description?: string; color?: string }) =>
      createProject(params.name, params.description, params.color),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { id: string; name?: string; description?: string; color?: string }) =>
      updateProject(params.id, params.name, params.description, params.color),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}
