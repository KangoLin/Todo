import { useState } from 'react'
import { useNavigate } from 'react-router'
import * as Dialog from '@radix-ui/react-dialog'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Plus, MoreHorizontal, Pencil, Trash2, FolderKanban } from 'lucide-react'
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject } from '../hooks/useProjects'
import type { Project } from '../types'


function ProjectDialog({ project, open, onOpenChange }: {
  project?: Project
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [name, setName] = useState(project?.name ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [color, setColor] = useState(project?.color ?? '#6366f1')

  const createMut = useCreateProject()
  const updateMut = useUpdateProject()

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface rounded-xl shadow-xl border border-border p-6 w-full max-w-md z-50">
          <Dialog.Title className="text-lg font-bold mb-4">{project ? '编辑项目' : '新建项目'}</Dialog.Title>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-text-secondary block mb-1">名称</label>
              <input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="项目名称" />
            </div>
            <div>
              <label className="text-sm text-text-secondary block mb-1">描述</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" rows={3} placeholder="项目描述（可选）" />
            </div>
            <div>
              <label className="text-sm text-text-secondary block mb-1">颜色</label>
              <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Dialog.Close className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-surface-secondary">取消</Dialog.Close>
            <button onClick={() => {
              if (project) {
                updateMut.mutate({ id: project.id, name, description, color }, { onSuccess: () => onOpenChange(false) })
              } else {
                createMut.mutate({ name, description, color }, { onSuccess: () => onOpenChange(false) })
              }
            }} disabled={!name.trim() || createMut.isPending || updateMut.isPending} className="px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary-dark disabled:opacity-50">
              {project ? '保存' : '创建'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default function ProjectList() {
  const navigate = useNavigate()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | undefined>()

  const { data: projects, isLoading } = useProjects()

  const deleteMut = useDeleteProject()

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">项目列表</h1>
        <button onClick={() => { setEditingProject(undefined); setDialogOpen(true) }} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary-dark">
          <Plus size={16} /> 新建项目
        </button>
      </div>

      {isLoading ? (
        <div className="text-center text-text-secondary py-12">加载中...</div>
      ) : !projects?.length ? (
        <div className="text-center py-16 text-text-secondary">
          <FolderKanban size={48} className="mx-auto mb-3 opacity-40" />
          <p className="text-lg mb-1">还没有项目</p>
          <p className="text-sm">点击上方按钮创建第一个项目</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {projects.map(p => (
            <div key={p.id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-surface hover:shadow-sm transition-shadow cursor-pointer" onClick={() => navigate(`/project/${p.id}`)}>
              <div className="w-1 h-10 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{p.name}</div>
                {p.description && <div className="text-sm text-text-secondary truncate mt-0.5">{p.description}</div>}
              </div>
              <div className="text-xs text-text-secondary shrink-0">{new Date(p.updated_at).toLocaleDateString('zh-CN')}</div>
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild onClick={e => e.stopPropagation()}>
                  <button className="p-1.5 rounded-lg hover:bg-surface-secondary text-text-secondary"><MoreHorizontal size={16} /></button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content className="bg-surface border border-border rounded-lg shadow-lg p-1 min-w-[120px] z-50">
                    <DropdownMenu.Item onClick={e => { e.stopPropagation(); setEditingProject(p); setDialogOpen(true) }} className="flex items-center gap-2 px-3 py-1.5 text-sm rounded hover:bg-surface-secondary cursor-pointer">
                      <Pencil size={14} /> 编辑
                    </DropdownMenu.Item>
                    <DropdownMenu.Item onClick={e => { e.stopPropagation(); if (confirm('确认删除此项目？')) deleteMut.mutate(p.id) }} className="flex items-center gap-2 px-3 py-1.5 text-sm rounded hover:bg-surface-secondary cursor-pointer text-red-500">
                      <Trash2 size={14} /> 删除
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>
          ))}
        </div>
      )}

      <ProjectDialog project={editingProject} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
