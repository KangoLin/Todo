import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import * as Dialog from '@radix-ui/react-dialog'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Checkbox from '@radix-ui/react-checkbox'
import { Plus, MoreHorizontal, Pencil, Trash2, Archive, ArrowLeft, Check, X, ListTodo, Calendar, Tag as TagIcon, GripVertical, RotateCcw, PanelRightOpen, PanelRightClose, Inbox } from 'lucide-react'
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element'
import { useColumns, useCreateColumn, useUpdateColumn, useDeleteColumn, useReorderColumns } from '../hooks/useColumns'
import { useBoardById } from '../hooks/useBoard'
import { useCards, useCardDetail, useCreateCard, useUpdateCard, useDeleteCard, useArchiveCard, useRestoreCard, useMoveCard, useMoveCardWithinColumn, useArchivedCards } from '../hooks/useCards'
import { useCreateSubtask, useToggleSubtask, useDeleteSubtask } from '../hooks/useSubtasks'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useBoardStore } from '../stores/boardStore'
import { useDragStore } from '../stores/dragStore'
import type { Column as ColumnType } from '../types'
import { PRIORITY_LABELS, PRIORITY_COLORS } from '../lib/constants'
import { TagBadge } from '../components/tags/TagBadge'
import { TagSelector } from '../components/tags/TagSelector'
import { TagManager } from '../components/tags/TagManager'
import { RichTextEditor } from '../components/editor/RichTextEditor'

function CardDetailDialog({ cardId, open, onOpenChange, onDeleted, boardId }: { cardId: string | null; open: boolean; onOpenChange: (open: boolean) => void; onDeleted?: () => void; boardId?: string }) {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const { data: detail, isLoading } = useCardDetail(cardId)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState(0)
  const [dueDate, setDueDate] = useState('')
  const [coverColor, setCoverColor] = useState('')

  useEffect(() => {
    if (detail) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTitle(detail.card.title)
      setDescription(detail.card.description)
      setPriority(detail.card.priority)
      setDueDate(detail.card.due_date ?? '')
      setCoverColor(detail.card.cover_color ?? '')
    }
  }, [detail])

  const updateMut = useUpdateCard()

  const prevDescription = useRef(detail?.card.description)
  useEffect(() => {
    if (detail && description !== detail.card.description && description !== prevDescription.current) {
      prevDescription.current = description
      const timer = setTimeout(() => updateMut.mutate({ id: cardId!, description }), 500)
      return () => clearTimeout(timer)
    }
  }, [description, detail, updateMut])

  const deleteMut = useDeleteCard()

  const archiveMut = useArchiveCard()

  const createSubtaskMut = useCreateSubtask()

  const toggleSubtaskMut = useToggleSubtask()

  const deleteSubtaskMut = useDeleteSubtask()

  if (!cardId) return null

  const doneCount = detail?.subtasks.filter(s => s.is_done).length ?? 0
  const totalCount = detail?.subtasks.length ?? 0

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface rounded-xl shadow-xl border border-border p-0 w-full max-w-lg max-h-[85vh] flex flex-col z-50">
          {isLoading ? (
            <div className="py-16 text-center text-text-secondary">加载中...</div>
          ) : detail ? (
            <>
              {coverColor && <div className="h-2 rounded-t-xl shrink-0" style={{ backgroundColor: coverColor }} />}
              <div className="p-5 overflow-y-auto flex-1">
                <div className="flex items-start gap-3 mb-4">
                  <input value={title} onChange={e => setTitle(e.target.value)} onBlur={() => title !== detail.card.title && updateMut.mutate({ id: cardId!, title })} className="flex-1 text-lg font-bold bg-transparent border-none outline-none px-0 py-0" />
                  <button onClick={() => onOpenChange(false)} className="p-1 text-text-secondary hover:text-text"><X size={18} /></button>
                </div>

                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <span className="text-xs text-text-secondary">优先级</span>
                  {PRIORITY_LABELS.map((label, i) => (
                    <button key={i} onClick={() => { setPriority(i); updateMut.mutate({ id: cardId!, priority: i }) }} className={'px-2.5 py-1 rounded text-xs font-medium border ' + (priority === i ? 'text-white border-transparent' : 'text-text-secondary border-border hover:border-text-secondary')} style={priority === i ? { backgroundColor: PRIORITY_COLORS[i] } : undefined}>
                      {label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-4 mb-4">
                  <div>
                    <label className="text-xs font-medium text-text-secondary block mb-1">截止日期</label>
                    <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} onBlur={() => dueDate !== (detail.card.due_date ?? '') && updateMut.mutate({ id: cardId!, dueDate: dueDate || undefined })} className="px-3 py-1.5 rounded-lg border border-border bg-surface text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-text-secondary block mb-1">封面色</label>
                    <input type="color" value={coverColor || '#6366f1'} onChange={e => setCoverColor(e.target.value)} onBlur={() => updateMut.mutate({ id: cardId!, coverColor })} className="w-9 h-9 rounded cursor-pointer" />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-xs font-medium text-text-secondary block mb-1">描述</label>
                  <RichTextEditor content={description} onChange={setDescription} />
                </div>

                <div className="mb-4">
                  <label className="text-xs font-medium text-text-secondary block mb-2 flex items-center gap-1"><ListTodo size={14} /> 子任务 {totalCount > 0 && <span className="text-text-secondary">({doneCount}/{totalCount})</span>}</label>
                  {totalCount > 0 && (
                    <div className="h-1.5 bg-border rounded-full mb-2 overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(doneCount / totalCount) * 100}%` }} />
                    </div>
                  )}
                  <div className="space-y-1 mb-2">
                    {detail.subtasks.map(st => (
                      <div key={st.id} className="flex items-center gap-2 group py-0.5">
                        <Checkbox.Root checked={!!st.is_done} onCheckedChange={() => toggleSubtaskMut.mutate({ id: st.id, cardId: cardId! })} className="w-4 h-4 rounded border border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary flex items-center justify-center shrink-0">
                          <Checkbox.Indicator><Check size={12} className="text-white" /></Checkbox.Indicator>
                        </Checkbox.Root>
                        <span className={'text-sm flex-1 ' + (st.is_done ? 'line-through text-text-secondary' : '')}>{st.title}</span>
                        <button onClick={() => deleteSubtaskMut.mutate({ id: st.id, cardId: cardId! })} className="p-0.5 text-text-secondary hover:text-red-500 opacity-0 group-hover:opacity-100"><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <input value={newSubtaskTitle} onChange={e => setNewSubtaskTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && newSubtaskTitle.trim() && createSubtaskMut.mutate({ cardId: cardId!, title: newSubtaskTitle.trim() }, { onSuccess: () => setNewSubtaskTitle('') })} className="flex-1 px-2 py-1.5 text-sm rounded border border-border bg-surface focus:outline-none focus:ring-1 focus:ring-primary" placeholder="添加子任务..." />
                    {newSubtaskTitle.trim() && <button onClick={() => createSubtaskMut.mutate({ cardId: cardId!, title: newSubtaskTitle.trim() }, { onSuccess: () => setNewSubtaskTitle('') })} className="px-2 py-1.5 text-sm rounded bg-primary text-white"><Plus size={14} /></button>}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-xs font-medium text-text-secondary block mb-2 flex items-center gap-1"><TagIcon size={14} /> 标签</label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {detail.tags.map(t => (
                      <TagBadge key={t.id} name={t.name} color={t.color} />
                    ))}
                    {boardId && <TagSelector boardId={boardId} cardId={cardId} />}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 px-5 py-3 border-t border-border shrink-0">
                <button onClick={() => archiveMut.mutate(cardId!, { onSuccess: () => onOpenChange(false) })} className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-surface-secondary text-text-secondary"><Archive size={12} /> 归档</button>
                <button onClick={() => { if (confirm('确认删除？')) deleteMut.mutate(cardId!, { onSuccess: () => { onOpenChange(false); onDeleted?.() } }) }} className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-red-200 hover:bg-red-50 text-red-500 ml-auto"><Trash2 size={12} /> 删除</button>
              </div>
            </>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function CardView({ card, columnId, onEdit, onDelete, onArchive }: {
  card: { id: string; title: string; priority: number; due_date: string | null; cover_color: string | null }
  columnId: string
  onEdit: () => void
  onDelete: () => void
  onArchive: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const setDraggedCardId = useDragStore(s => s.setDraggedCardId)
  const draggedCardId = useDragStore(s => s.draggedCardId)
  const isDragging = draggedCardId === card.id

  useEffect(() => {
    const el = ref.current
    if (!el) return
    return draggable({
      element: el,
      getInitialData: () => ({ cardId: card.id, type: 'card', columnId }),
      onDragStart: () => {
        setDraggedCardId(card.id)
      },
      onDrop: () => {
        setDraggedCardId(null)
      },
    })
  }, [card.id, columnId, setDraggedCardId])

  return (
    <div
      ref={ref}
      onClick={onEdit}
      className={'group bg-surface rounded-lg border p-3 cursor-pointer transition-all active:cursor-grabbing ' + (isDragging ? 'opacity-40 shadow-none border-dashed' : 'border-border hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:border-primary/30')}
    >
      {card.cover_color && <div className="h-1.5 -mx-3 -mt-3 mb-2 rounded-t-lg" style={{ backgroundColor: card.cover_color }} />}
      <div className="flex items-start justify-between gap-1">
        <span className="text-sm font-medium leading-snug">{card.title}</span>
        <div onClick={e => e.stopPropagation()}>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="p-1 rounded hover:bg-surface-secondary opacity-0 group-hover:opacity-100 transition-opacity"><MoreHorizontal size={14} /></button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="bg-surface border border-border rounded-lg shadow-lg p-1 min-w-[120px] z-50">
                <DropdownMenu.Item onClick={onEdit} className="flex items-center gap-2 px-3 py-1.5 text-sm rounded hover:bg-surface-secondary cursor-pointer"><Pencil size={14} /> 编辑</DropdownMenu.Item>
                <DropdownMenu.Item onClick={onArchive} className="flex items-center gap-2 px-3 py-1.5 text-sm rounded hover:bg-surface-secondary cursor-pointer"><Archive size={14} /> 归档</DropdownMenu.Item>
                <DropdownMenu.Item onClick={onDelete} className="flex items-center gap-2 px-3 py-1.5 text-sm rounded hover:bg-surface-secondary cursor-pointer text-red-500"><Trash2 size={14} /> 删除</DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>
      {(card.priority > 0 || card.due_date) && (
        <div className="flex items-center gap-2 mt-2 text-xs text-text-secondary">
          {card.priority > 0 && <span className="px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: PRIORITY_COLORS[card.priority] + '20', color: PRIORITY_COLORS[card.priority] }}>{PRIORITY_LABELS[card.priority]}</span>}
          {card.due_date && <span className="flex items-center gap-0.5"><Calendar size={10} />{new Date(card.due_date).toLocaleDateString('zh-CN')}</span>}
        </div>
      )}
    </div>
  )
}

function ColumnView({ column, columnIndex, onEditCard, onDeleteCard, onArchiveCard, onDrop, onColumnDrop, boardId }: {
  column: ColumnType
  columnIndex: number
  onEditCard: (id: string) => void
  onDeleteCard: (id: string) => void
  onArchiveCard: (id: string) => void
  onDrop: (cardId: string, targetColumnId: string, sourceColumnId?: string) => void
  onColumnDrop: (draggedColumnId: string, targetColumnId: string) => void
  boardId: string
}) {
  const [newCardTitle, setNewCardTitle] = useState('')
  const [editing, setEditing] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const dropRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const renameRef = useRef<HTMLInputElement>(null)
  const dragOverColumnId = useDragStore(s => s.dragOverColumnId)
  const setDragOverColumnId = useDragStore(s => s.setDragOverColumnId)
  const draggedColumnId = useDragStore(s => s.draggedColumnId)
  const setDraggedColumnId = useDragStore(s => s.setDraggedColumnId)
  const dragOverColumnIndex = useDragStore(s => s.dragOverColumnIndex)
  const setDragOverColumnIndex = useDragStore(s => s.setDragOverColumnIndex)
  const cardDragOver = dragOverColumnId === column.id
  const columnDragOver = draggedColumnId && draggedColumnId !== column.id && dragOverColumnIndex === columnIndex

  const { data: cards } = useCards(column.id)

  const createCardMut = useCreateCard()

  const deleteMut = useDeleteCard()

  const archiveMut = useArchiveCard()

  const updateColumnMut = useUpdateColumn()
  const deleteColumnMut = useDeleteColumn()

  useEffect(() => {
    if (editing && renameRef.current) renameRef.current.focus()
  }, [editing])

  // Column header: draggable for column reorder
  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    return draggable({
      element: el,
      getInitialData: () => ({ columnId: column.id, type: 'column' }),
      onDragStart: () => setDraggedColumnId(column.id),
      onDrop: () => setDraggedColumnId(null),
    })
  }, [column.id, setDraggedColumnId])

  // Column body: drop target for both cards AND columns
  useEffect(() => {
    const el = dropRef.current
    if (!el) return
    return dropTargetForElements({
      element: el,
      getData: () => ({ columnId: column.id }),
      onDragEnter: ({ source }) => {
        if (source.data.type === 'column') {
          setDragOverColumnIndex(columnIndex)
        } else {
          setDragOverColumnId(column.id)
        }
      },
      onDragLeave: ({ source }) => {
        if (source.data.type === 'column') {
          setDragOverColumnIndex(null)
        } else {
          setDragOverColumnId(null)
        }
      },
      onDrop: ({ source }) => {
        setDragOverColumnId(null)
        setDragOverColumnIndex(null)
        if (source.data.type === 'column') {
          const draggedColId = source.data.columnId as string | undefined
          if (draggedColId && draggedColId !== column.id) {
            onColumnDrop(draggedColId, column.id)
          }
        } else {
          const cardId = source.data.cardId as string | undefined
          const srcColId = source.data.columnId as string | undefined
          if (cardId) onDrop(cardId, column.id, srcColId)
        }
      },
    })
  }, [column.id, columnIndex, onDrop, onColumnDrop, setDragOverColumnId, setDragOverColumnIndex])

  return (
    <div
      className={'flex-shrink-0 w-72 flex flex-col rounded-xl border max-h-full transition-all duration-200 ' + (columnDragOver ? 'border-primary ring-2 ring-primary/20 shadow-lg scale-[1.02]' : cardDragOver ? 'border-primary bg-primary/5' : 'border-border bg-surface-secondary/50')}
    >
      <div ref={headerRef} className="flex items-center gap-1 px-2 py-2.5 border-b border-border shrink-0 cursor-grab active:cursor-grabbing">
        <GripVertical size={14} className="text-text-secondary/40 shrink-0" />
        {editing ? (
          <input
            ref={renameRef}
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && renameValue.trim()) {
                updateColumnMut.mutate({ id: column.id, name: renameValue.trim(), boardId }, { onSuccess: () => setEditing(false) })
              }
              if (e.key === 'Escape') setEditing(false)
            }}
            onBlur={() => setEditing(false)}
            className="flex-1 px-1 py-0 text-sm font-semibold rounded border border-primary bg-surface outline-none"
          />
        ) : (
          <span className="font-semibold text-sm flex-1 truncate">{column.name}</span>
        )}
        <span className="text-xs bg-border/60 px-1.5 py-0.5 rounded-full text-text-secondary">{cards?.length ?? 0}</span>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="p-1 rounded hover:bg-surface-secondary text-text-secondary"><MoreHorizontal size={14} /></button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className="bg-surface border border-border rounded-lg shadow-lg p-1 min-w-[120px] z-50">
              <DropdownMenu.Item onClick={() => { setRenameValue(column.name); setEditing(true) }} className="flex items-center gap-2 px-3 py-1.5 text-sm rounded hover:bg-surface-secondary cursor-pointer"><Pencil size={14} /> 编辑列名</DropdownMenu.Item>
              <DropdownMenu.Item onClick={() => { if (confirm('确认删除此列及其所有卡片？')) deleteColumnMut.mutate({ id: column.id, boardId }) }} className="flex items-center gap-2 px-3 py-1.5 text-sm rounded hover:bg-surface-secondary cursor-pointer text-red-500"><Trash2 size={14} /> 删除列</DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      <div ref={dropRef} className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[60px]">
        {cards?.map(card => (
          <CardView
            key={card.id}
            card={card}
            columnId={column.id}
            onEdit={() => onEditCard(card.id)}
            onDelete={() => { if (confirm('确认删除？')) deleteMut.mutate(card.id); onDeleteCard(card.id) }}
            onArchive={() => { archiveMut.mutate(card.id); onArchiveCard(card.id) }}
          />
        ))}
        {(!cards || cards.length === 0) && (
          <div className="flex flex-col items-center justify-center h-16 text-xs text-text-secondary/50 gap-1 border-2 border-dashed border-border/40 rounded-lg">
            <Inbox size={20} className="text-text-secondary/30" />
            <span>拖拽卡片到此处</span>
          </div>
        )}
      </div>

      <div className="p-2 border-t border-border shrink-0">
        {newCardTitle !== undefined ? (
          <div className="flex items-center gap-1">
            <input value={newCardTitle} onChange={e => setNewCardTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newCardTitle.trim()) createCardMut.mutate({ columnId: column.id, title: newCardTitle.trim() }, { onSuccess: () => setNewCardTitle('') }); if (e.key === 'Escape') setNewCardTitle('') }} placeholder="卡片标题..." autoFocus className="flex-1 px-2 py-1.5 text-sm rounded-lg border border-border bg-surface focus:outline-none focus:ring-1 focus:ring-primary" />
            <button onClick={() => { if (newCardTitle.trim()) createCardMut.mutate({ columnId: column.id, title: newCardTitle.trim() }, { onSuccess: () => setNewCardTitle('') }); else setNewCardTitle('') }} className="p-1.5 rounded text-text-secondary hover:text-text"><X size={14} /></button>
          </div>
        ) : (
          <button onClick={() => setNewCardTitle('')} className="flex items-center gap-1 text-sm text-text-secondary hover:text-text w-full px-2 py-1.5 rounded-lg hover:bg-surface-secondary transition-colors">
            <Plus size={14} /> 添加卡片
          </button>
        )}
      </div>
    </div>
  )
}

function ArchivePanel({ boardId, open, onClose }: { boardId: string; open: boolean; onClose: () => void }) {
  const { data: archivedCards } = useArchivedCards(boardId)
  const { data: columns } = useColumns(boardId)
  const restoreMut = useRestoreCard()
  const deleteMut = useDeleteCard()

  const getColumnName = (columnId: string) => columns?.find(c => c.id === columnId)?.name ?? '未知列'

  return (
    <div className={'fixed top-0 right-0 h-full w-80 bg-surface border-l border-border shadow-2xl z-40 transition-transform duration-300 ' + (open ? 'translate-x-0' : 'translate-x-full')}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="font-semibold text-sm flex items-center gap-2"><Archive size={16} /> 已归档</h2>
        <button onClick={onClose} className="p-1 rounded hover:bg-surface-secondary text-text-secondary"><X size={16} /></button>
      </div>
      <div className="overflow-y-auto h-[calc(100%-49px)] p-3 space-y-2">
        {(!archivedCards || archivedCards.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-16 text-text-secondary/50 gap-2">
            <Inbox size={32} />
            <span className="text-xs">没有已归档的卡片</span>
          </div>
        ) : (
          archivedCards.map(card => (
            <div key={card.id} className="p-3 rounded-lg border border-border bg-surface hover:shadow-sm transition-shadow">
              <span className="text-xs text-text-secondary block mb-1">{getColumnName(card.column_id)}</span>
              <p className="text-sm font-medium mb-2 line-clamp-2">{card.title}</p>
              <div className="flex items-center gap-1.5">
                <button onClick={() => restoreMut.mutate(card.id)} className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                  <RotateCcw size={11} /> 恢复
                </button>
                <button onClick={() => { if (confirm('永久删除？')) deleteMut.mutate(card.id) }} className="flex items-center gap-1 px-2 py-1 text-xs rounded text-text-secondary hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                  <Trash2 size={11} /> 删除
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default function BoardView() {
  const { boardId } = useParams<{ boardId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [newColumnName, setNewColumnName] = useState('')
  const [archivePanelOpen, setArchivePanelOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const cardDetailId = useBoardStore(s => s.cardDetailId)
  const setCardDetailId = useBoardStore(s => s.setCardDetailId)
  const tagManagerOpen = useBoardStore(s => s.tagManagerOpen)
  const setTagManagerOpen = useBoardStore(s => s.setTagManagerOpen)

  const { data: columns, isLoading } = useColumns(boardId)

  const { data: board } = useBoardById(boardId)

  const createColumnMut = useCreateColumn()
  const moveCardMut = useMoveCard()
  const moveCardWithinMut = useMoveCardWithinColumn()
  const reorderColumnsMut = useReorderColumns()

  const handleDrop = useCallback((cardId: string, targetColumnId: string, sourceColumnId?: string) => {
    if (sourceColumnId && sourceColumnId === targetColumnId) {
      moveCardWithinMut.mutate({ cardId, targetSortOrder: 0 })
    } else {
      moveCardMut.mutate({ cardId, columnId: targetColumnId })
    }
  }, [moveCardMut, moveCardWithinMut])

  const handleColumnDrop = useCallback((draggedColumnId: string, targetColumnId: string) => {
    if (!columns) return
    const ids = columns.map(c => c.id)
    const fromIdx = ids.indexOf(draggedColumnId)
    const toIdx = ids.indexOf(targetColumnId)
    if (fromIdx === -1 || toIdx === -1) return
    ids.splice(fromIdx, 1)
    ids.splice(toIdx, 0, draggedColumnId)
    reorderColumnsMut.mutate({ ids, boardId: boardId! })
  }, [columns, boardId, reorderColumnsMut])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    return autoScrollForElements({ element: el })
  }, [])

  useKeyboardShortcuts({
    'n': () => { if (newColumnName === undefined) setNewColumnName('') },
    'escape': () => {
      if (cardDetailId) setCardDetailId(null)
      else if (archivePanelOpen) setArchivePanelOpen(false)
    },
  })

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border shrink-0 bg-surface/80 backdrop-blur-sm">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-surface-secondary text-text-secondary transition-colors"><ArrowLeft size={18} /></button>
        <h1 className="font-bold text-base flex-1">{board?.name ?? '看板'}</h1>
        <button onClick={() => setTagManagerOpen(true)} className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-surface-secondary text-text-secondary transition-colors">
          <TagIcon size={14} /> 标签
        </button>
        <button onClick={() => setArchivePanelOpen(v => !v)} className={'flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border transition-colors ' + (archivePanelOpen ? 'bg-primary/10 border-primary text-primary' : 'border-border hover:bg-surface-secondary text-text-secondary')}>
          {archivePanelOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />} 归档
        </button>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-text-secondary">加载中...</div>
      ) : (
        <div ref={scrollRef} className="flex-1 overflow-x-auto">
          <div className="flex gap-4 p-4 h-full items-start" style={{ minHeight: '0' }}>
            {columns?.map((col, idx) => (
              <ColumnView
                key={col.id}
                column={col}
                columnIndex={idx}
                onEditCard={setCardDetailId}
                onDeleteCard={() => queryClient.invalidateQueries({ queryKey: ['cards'] })}
                onArchiveCard={() => queryClient.invalidateQueries({ queryKey: ['cards'] })}
                onDrop={handleDrop}
                onColumnDrop={handleColumnDrop}
                boardId={boardId!}
              />
            ))}

            {newColumnName !== undefined ? (
              <div className="flex-shrink-0 w-72">
                <div className="flex items-center gap-1 p-2 rounded-xl border border-border bg-surface-secondary/50">
                  <input value={newColumnName} onChange={e => setNewColumnName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newColumnName.trim()) createColumnMut.mutate({ boardId: boardId!, name: newColumnName.trim() }, { onSuccess: () => setNewColumnName('') }); if (e.key === 'Escape') setNewColumnName('') }} placeholder="列名称..." autoFocus className="flex-1 px-2 py-1.5 text-sm rounded-lg border border-border bg-surface focus:outline-none focus:ring-1 focus:ring-primary" />
                  <button onClick={() => { if (newColumnName.trim()) createColumnMut.mutate({ boardId: boardId!, name: newColumnName.trim() }, { onSuccess: () => setNewColumnName('') }); else setNewColumnName('') }} className="p-1 text-text-secondary hover:text-text"><X size={14} /></button>
                </div>
              </div>
            ) : (
              <div className="flex-shrink-0 w-72">
                <button onClick={() => setNewColumnName('')} className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text w-full p-3 rounded-xl border-2 border-dashed border-border hover:border-text-secondary hover:bg-surface-secondary/30 transition-colors">
                  <Plus size={16} /> 添加列
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {boardId && <ArchivePanel boardId={boardId} open={archivePanelOpen} onClose={() => setArchivePanelOpen(false)} />}

      <CardDetailDialog key={cardDetailId} cardId={cardDetailId} open={!!cardDetailId} onOpenChange={open => !open && setCardDetailId(null)} onDeleted={() => queryClient.invalidateQueries({ queryKey: ['cards'] })} boardId={boardId} />
      <TagManager boardId={boardId!} open={tagManagerOpen} onOpenChange={setTagManagerOpen} />
    </div>
  )
}
