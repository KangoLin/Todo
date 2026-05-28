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
    onError: (err: Error) => alert('创建项目失败：' + err.message),
  })
}

export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { id: string; name?: string; description?: string; color?: string }) =>
      updateProject(params.id, params.name, params.description, params.color),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
    onError: (err: Error) => alert('更新项目失败：' + err.message),
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
    onError: (err: Error) => alert('删除项目失败：' + err.message),
  })
}
