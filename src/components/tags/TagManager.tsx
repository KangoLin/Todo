import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Plus, Trash2, X } from 'lucide-react'
import { useTags, useCreateTag, useDeleteTag } from '../../hooks/useTags'
import { TagBadge } from './TagBadge'

const TAG_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#eab308', '#f97316', '#8b5cf6', '#ec4899', '#14b8a6']

interface TagManagerProps {
  boardId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TagManager({ boardId, open, onOpenChange }: TagManagerProps) {
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#3b82f6')

  const { data: tags } = useTags(boardId)

  const createMut = useCreateTag()
  const deleteMut = useDeleteTag()

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface rounded-xl shadow-xl border border-border p-6 w-full max-w-md z-50">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-bold">管理标签</Dialog.Title>
            <Dialog.Close className="p-1 text-text-secondary hover:text-text"><X size={18} /></Dialog.Close>
          </div>

          <div className="space-y-3 mb-4">
            {tags?.map(t => (
              <div key={t.id} className="flex items-center gap-2 group">
                <TagBadge name={t.name} color={t.color} />
                <button
                  onClick={() => { if (confirm(`确认删除标签「${t.name}」？`)) deleteMut.mutate({ id: t.id, boardId }) }}
                  className="p-0.5 text-text-secondary hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {(!tags || tags.length === 0) && (
              <div className="text-sm text-text-secondary/50 py-4 text-center">暂无标签</div>
            )}
          </div>

          <div className="border-t border-border pt-4">
            <div className="text-xs font-medium text-text-secondary mb-2">新建标签</div>
            <div className="flex items-center gap-2">
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && newName.trim() && createMut.mutate({ boardId, name: newName, color: newColor }, { onSuccess: () => setNewName('') })}
                className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="标签名称"
              />
              <div className="flex gap-1">
                {TAG_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className={'w-5 h-5 rounded-full border-2 transition-all ' + (newColor === c ? 'border-text scale-110' : 'border-transparent')}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <button
                onClick={() => newName.trim() && createMut.mutate({ boardId, name: newName, color: newColor }, { onSuccess: () => setNewName('') })}
                disabled={!newName.trim() || createMut.isPending}
                className="p-1.5 rounded-lg bg-primary text-white hover:bg-primary-dark disabled:opacity-50"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
