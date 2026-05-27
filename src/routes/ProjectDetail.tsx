import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import * as Dialog from '@radix-ui/react-dialog'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Plus, MoreHorizontal, Pencil, Trash2, ArrowLeft, LayoutDashboard } from 'lucide-react'
import { useProject, useBoards, useCreateBoard, useUpdateBoard, useDeleteBoard } from '../hooks/useBoard'
import type { Board } from '../types'

function BoardDialog({ projectId, board, open, onOpenChange }: {
  projectId: string
  board?: Board
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [name, setName] = useState(board?.name ?? '')

  const createMut = useCreateBoard()
  const updateMut = useUpdateBoard()

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface rounded-xl shadow-xl border border-border p-6 w-full max-w-md z-50">
          <Dialog.Title className="text-lg font-bold mb-4">{board ? '编辑看板' : '新建看板'}</Dialog.Title>
          <div>
            <label className="text-sm text-text-secondary block mb-1">名称</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="看板名称" />
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Dialog.Close className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-surface-secondary">取消</Dialog.Close>
            <button onClick={() => {
              if (board) {
                updateMut.mutate({ id: board.id, name, projectId }, { onSuccess: () => onOpenChange(false) })
              } else {
                createMut.mutate({ projectId, name }, { onSuccess: () => onOpenChange(false) })
              }
            }} disabled={!name.trim() || createMut.isPending || updateMut.isPending} className="px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary-dark disabled:opacity-50">
              {board ? '保存' : '创建'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBoard, setEditingBoard] = useState<Board | undefined>()

  const { data: project } = useProject(projectId)
  const { data: boards, isLoading } = useBoards(projectId)

  const deleteMut = useDeleteBoard()

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button onClick={() => navigate('/projects')} className="flex items-center gap-1 text-sm text-text-secondary hover:text-text mb-4">
        <ArrowLeft size={16} /> 返回项目列表
      </button>

      {project && (
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-8 rounded-full" style={{ backgroundColor: project.color }} />
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            {project.description && <p className="text-sm text-text-secondary mt-0.5">{project.description}</p>}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg">看板</h2>
        <button onClick={() => { setEditingBoard(undefined); setDialogOpen(true) }} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary-dark">
          <Plus size={16} /> 新建看板
        </button>
      </div>

      {isLoading ? (
        <div className="text-center text-text-secondary py-12">加载中...</div>
      ) : !boards?.length ? (
        <div className="text-center py-16 text-text-secondary">
          <LayoutDashboard size={48} className="mx-auto mb-3 opacity-40" />
          <p className="text-lg mb-1">还没有看板</p>
          <p className="text-sm">创建第一个看板来管理任务</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {boards.map(b => (
            <div key={b.id} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-surface hover:shadow-sm transition-shadow cursor-pointer" onClick={() => navigate(`/board/${b.id}`)}>
              <LayoutDashboard size={20} className="text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{b.name}</div>
              </div>
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild onClick={e => e.stopPropagation()}>
                  <button className="p-1.5 rounded-lg hover:bg-surface-secondary text-text-secondary"><MoreHorizontal size={16} /></button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content className="bg-surface border border-border rounded-lg shadow-lg p-1 min-w-[120px] z-50">
                    <DropdownMenu.Item onClick={e => { e.stopPropagation(); setEditingBoard(b); setDialogOpen(true) }} className="flex items-center gap-2 px-3 py-1.5 text-sm rounded hover:bg-surface-secondary cursor-pointer">
                      <Pencil size={14} /> 编辑
                    </DropdownMenu.Item>
                    <DropdownMenu.Item onClick={e => { e.stopPropagation(); if (confirm('确认删除此看板？')) deleteMut.mutate({ id: b.id, projectId: projectId! }) }} className="flex items-center gap-2 px-3 py-1.5 text-sm rounded hover:bg-surface-secondary cursor-pointer text-red-500">
                      <Trash2 size={14} /> 删除
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>
          ))}
        </div>
      )}

      <BoardDialog projectId={projectId!} board={editingBoard} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
