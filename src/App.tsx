import { invoke } from '@tauri-apps/api/core'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Clock, X, Trash2, GripVertical, Calendar, Search, Check, ChevronDown, Moon, Sun, Download, Upload, LayoutGrid, CalendarDays, FolderKanban, Edit3, CheckCheck, BarChart3, Timer, Play, Pause, RotateCcw } from 'lucide-react'
import DescriptionEditor from './components/DescriptionEditor'

interface Tag {
  name: string
  color: string
}

interface Subtask {
  id: string
  text: string
  done: boolean
}

interface Item {
  id: string
  text: string
  description: string
  start: string
  end: string
  done: boolean
  priority: string
  tags: Tag[]
  subtasks: Subtask[]
  repeat: string
}

interface Card {
  id: string
  title: string
  date: string | null
  items: Item[]
}

interface Project {
  id: string
  name: string
  color: string
  sort_order: number
}

function calcMinutes(start: string, end: string): number {
  if (!start || !end) return 0
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const diff = (eh * 60 + em) - (sh * 60 + sm)
  return diff > 0 ? diff : 0
}

function formatDuration(min: number): string {
  if (min <= 0) return ''
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h${m}min`
}

function timeToMinutes(t: string): number {
  if (!t) return 0
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function genId(): string {
  return crypto.randomUUID()
}

function TimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div className="relative cursor-pointer" onClick={() => ref.current?.showPicker()}>
      <span className="block text-xs font-mono text-stone-600 dark:text-stone-400 hover:text-[var(--accent)] hover:bg-stone-200/80 dark:hover:bg-stone-700/50 active:scale-[0.95] transition-all bg-stone-100/60 dark:bg-stone-800/60 px-3 py-1.5 rounded font-medium min-w-[52px] text-center">
        {value || '--:--'}
      </span>
      <input ref={ref} type="time" value={value} onChange={e => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 w-full cursor-pointer" />
    </div>
  )
}

function DatePicker({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div className="relative inline-flex items-center gap-1">
      <button onClick={() => ref.current?.showPicker()}
        className="text-xs text-stone-500 dark:text-stone-400 hover:text-[var(--accent)] transition-colors bg-transparent border-0 cursor-pointer px-0 py-0">
        {value || '设置日期'}
      </button>
      {value && (
        <button onClick={() => onChange(null)} className="text-stone-400 dark:text-stone-500 hover:text-red-500 dark:hover:text-red-400 transition-colors">
          <X size={10} />
        </button>
      )}
      <input ref={ref} type="date" value={value || ''} onChange={e => onChange(e.target.value || null)}
        className="absolute inset-0 opacity-0 w-full cursor-pointer pointer-events-none" />
    </div>
  )
}

interface NoteCardProps {
  card: Card
  onSetTitle: (id: string, title: string) => void
  onSetDate: (id: string, date: string | null) => void
  onDeleteCard: (id: string) => void
  onAddItem: (cardId: string) => void
  onUpdateItem: (cardId: string, itemId: string, field: keyof Item, value: unknown) => void
  onDeleteItem: (cardId: string, itemId: string) => void
  onDragItemStart: (cardId: string, idx: number) => void
  onDragItemOver: (cardId: string, idx: number) => void
  onDropItem: (cardId: string, idx: number) => void
  onDragItemEnd: () => void
  onOpenItem: (cardId: string, itemId: string) => void
  onCardDragStart: (id: string) => void
  onCardDragOver: (e: React.DragEvent, id: string) => void
  onCardDragEnd: () => void
  draggingTask: boolean
}

function NoteCard({
  card,
  onSetTitle,
  onSetDate,
  onDeleteCard,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onDragItemStart,
  onDragItemOver,
  onDropItem,
  onDragItemEnd,
  onOpenItem,
  onCardDragStart,
  onCardDragOver,
  onCardDragEnd,
  draggingTask,
}: NoteCardProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  const doneCount = card.items.filter(i => i.done).length

  const [collapsed, setCollapsed] = useState(false)

  return (
    <div draggable
      onDragStart={() => onCardDragStart(card.id)}
      onDragOver={(e) => {
        if (draggingTask) {
          e.preventDefault()
        } else {
          onCardDragOver(e, card.id)
        }
      }}
      onDragEnd={onCardDragEnd}
      className="bg-gradient-to-b from-[var(--bg-card-start)] to-[var(--bg-surface-hover)] border border-[var(--border-card)] rounded-xl flex flex-col overflow-hidden shrink-0 cursor-default w-[300px] h-full transition-shadow duration-300"
      style={{ boxShadow: '0 2px 16px rgb(var(--shadow-rgb) / var(--shadow-card-opacity)), 0 8px 32px rgb(var(--shadow-rgb) / var(--shadow-card-opacity-2))' }}>
      <div className="h-6 shrink-0 bg-gradient-to-r from-[var(--accent-from)] to-[var(--accent)] flex items-center gap-1 px-2">
        <GripVertical size={11} className="text-white/40 cursor-grab active:cursor-grabbing" />
        <button onClick={() => setCollapsed(!collapsed)}
          className="text-white/50 hover:text-white transition-all p-0.5 rounded hover:bg-white/10 active:scale-[0.9]">
          <ChevronDown size={12} className={'transition-transform duration-200 ' + (collapsed ? '-rotate-90' : 'rotate-0')} />
        </button>
        <div className="flex-1" />
        <button onClick={() => onDeleteCard(card.id)} className="text-white/50 hover:text-white transition-colors" title="删除便签">
          <Trash2 size={11} />
        </button>
      </div>
      <div className="p-4 flex flex-col overflow-y-auto">
        <div className="bg-[var(--bg-surface)] rounded-lg px-3 py-2.5 space-y-2 -mx-1 shrink-0">
          <input
            value={card.title}
            onChange={e => onSetTitle(card.id, e.target.value)}
            placeholder="标题"
            className="w-full text-base font-bold bg-transparent border-none outline-none px-0 text-stone-800 dark:text-stone-200 placeholder-stone-400 dark:placeholder-stone-500"
          />
          <div className="flex items-center gap-1">
            <Calendar size={11} className="text-stone-400 dark:text-stone-500 shrink-0" />
            <DatePicker value={card.date} onChange={v => onSetDate(card.id, v)} />
          </div>
        </div>
        <div className={'grid transition-[grid-template-rows] duration-300 ' + (collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]')}>
          <div className="overflow-hidden min-h-0">
            <div className="border-t border-[var(--border-item)] my-3" />
        <div className="space-y-2"
          onDragOver={(e) => {
            if (draggingTask) {
              e.preventDefault()
              onDragItemOver(card.id, card.items.length)
            }
          }}
          onDrop={(e) => { e.preventDefault(); onDropItem(card.id, card.items.length) }}>
          {card.items.map((item, i) => (
            <div key={item.id} draggable
              onDragStart={() => onDragItemStart(card.id, i)}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); onDragItemOver(card.id, i) }}
              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); onDropItem(card.id, i) }}
              onDragEnd={onDragItemEnd}
              onClick={() => onOpenItem(card.id, item.id)}
              className={'border rounded-lg transition-all duration-200 cursor-pointer hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgb(var(--shadow-rgb)/var(--shadow-hover-opacity))] active:scale-[0.98] ' +
                (item.done
                  ? 'border-rose-200 bg-rose-50 hover:bg-rose-100 border-l-[3px] border-l-rose-300'
                  : 'border-[var(--border-item)] bg-transparent hover:bg-[var(--bg-surface-hover)] border-l-[3px] border-l-transparent hover:border-l-[var(--accent)]')}>
              <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-[var(--border-divider)]/50 bg-[var(--bg-surface)] rounded-t-lg">
                <span onClick={e => e.stopPropagation()} className="text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-400 hover:bg-stone-200/50 dark:hover:bg-stone-700/40 cursor-grab active:cursor-grabbing shrink-0 rounded p-1">
                  <GripVertical size={11} />
                </span>
                <button onClick={e => { e.stopPropagation(); onUpdateItem(card.id, item.id, 'done', !item.done) }}
                  className={'w-4 h-4 border shrink-0 flex items-center justify-center transition-all duration-200 rounded ' + (item.done ? 'bg-[var(--accent)] border-[var(--accent)] scale-100' : 'border-stone-300 dark:border-stone-600 hover:border-[var(--accent)] hover:bg-stone-100 dark:hover:bg-stone-800/60')}>
                  {item.done && <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-white animate-scale-in" fill="none" stroke="currentColor" strokeWidth="3"><path d="M2 6l3 3 5-5" /></svg>}
                </button>
                {item.priority !== 'none' && (
                  <button onClick={e => { e.stopPropagation(); const nxt = item.priority === 'p0' ? 'p1' : item.priority === 'p1' ? 'p2' : item.priority === 'p2' ? 'p3' : 'p0'; onUpdateItem(card.id, item.id, 'priority', nxt) }}
                    className={'text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 leading-none transition-all active:scale-[0.9] ' + (
                      item.priority === 'p0' ? 'bg-red-500/10 dark:bg-red-500/15 text-red-600 dark:text-red-400' :
                      item.priority === 'p1' ? 'bg-orange-500/10 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400' :
                      item.priority === 'p2' ? 'bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400' :
                      'bg-stone-500/10 dark:bg-stone-500/15 text-stone-500 dark:text-stone-400'
                    )}>{item.priority.toUpperCase()}</button>
                )}
                {item.tags.length > 0 && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    {item.tags.slice(0, 3).map(tag => (
                      <span key={tag.name} className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: tag.color }} title={tag.name} />
                    ))}
                    {item.tags.length > 3 && <span className="text-[9px] text-stone-400 dark:text-stone-500 font-medium ml-0.5">+{item.tags.length - 3}</span>}
                  </div>
                )}
                <div className="flex items-center gap-1 bg-[var(--time-bg)] border border-[var(--border-time)] rounded-md px-1.5 py-0.5 cursor-pointer">
                  <Clock size={11} className="text-stone-400 dark:text-stone-500 shrink-0 hover:text-[var(--accent)] transition-colors" />
                  <div onClick={e => e.stopPropagation()}>
                    <TimePicker value={item.start} onChange={v => onUpdateItem(card.id, item.id, 'start', v)} />
                  </div>
                  <span className="text-stone-300 dark:text-stone-600 font-medium hover:text-stone-500 dark:hover:text-stone-400 transition-colors">—</span>
                  <div onClick={e => e.stopPropagation()}>
                    <TimePicker value={item.end} onChange={v => onUpdateItem(card.id, item.id, 'end', v)} />
                  </div>
                </div>
                {calcMinutes(item.start, item.end) > 0 && (
                  <span className="text-[9px] font-semibold text-white bg-[var(--accent-muted)] rounded-full px-1.5 py-[3px] shrink-0">{formatDuration(calcMinutes(item.start, item.end))}</span>
                )}
                <button onClick={e => { e.stopPropagation(); onDeleteItem(card.id, item.id) }} className="text-stone-400 dark:text-stone-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0 rounded p-1 ml-auto"><X size={12} /></button>
              </div>
              <div className="flex items-center gap-2 px-2.5 py-2">
          <input
                  value={item.text}
                  onClick={e => e.stopPropagation()}
                  onChange={e => onUpdateItem(card.id, item.id, 'text', e.target.value)}
                  placeholder="新增事项..."
                  className={'flex-1 text-sm bg-transparent border-none outline-none ' + (item.done ? 'line-through text-stone-400 dark:text-stone-500' : 'text-stone-700 dark:text-stone-300 placeholder-stone-400 dark:placeholder-stone-500')}
                />
              </div>
              <div className={'px-2.5 pb-2.5 text-xs leading-snug line-clamp-2 border-t border-[var(--border-divider)]/40 pt-1.5 [&_img]:max-h-12 [&_img]:rounded [&_img]:inline [&_img]:mx-0.5 ' +
                (item.description && item.description !== '<p></p>'
                  ? 'text-stone-500 dark:text-stone-400'
                  : 'text-stone-300 dark:text-stone-600 italic')}>
                {item.description && item.description !== '<p></p>'
                  ? <span dangerouslySetInnerHTML={{ __html: item.description }} />
                  : '点击添加详细描述...'}
              </div>
              {item.subtasks.length > 0 && (
                <div className="px-2.5 pb-2 text-[10px] text-stone-400 dark:text-stone-500 flex items-center gap-1 border-t border-[var(--border-divider)]/40 pt-1.5">
                  <span>{item.subtasks.filter(s => s.done).length}/{item.subtasks.length} 子任务</span>
                </div>
              )}
            </div>
          ))}
          <button onClick={() => onAddItem(card.id)}
            className="group flex items-center justify-center gap-1.5 w-full py-2 text-xs text-stone-400 dark:text-stone-500 hover:text-[var(--accent)] hover:bg-white/60 dark:hover:bg-[var(--bg-surface-hover)] transition-all border border-dashed border-[var(--border-dashed)] rounded-lg active:scale-[0.97]">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-stone-100 dark:bg-stone-700/50 group-hover:bg-[var(--accent)]/10 group-hover:text-[var(--accent)] transition-all">
              <Plus size={12} className="group-hover:rotate-90 transition-transform duration-300" />
            </span>
            添加任务
          </button>
          <div ref={bottomRef} />
        </div>
        <div className="bg-[var(--bg-surface)] rounded-lg px-3 py-2 -mx-1 mt-1 text-xs shrink-0 space-y-1">
          <div className="text-stone-500 dark:text-stone-400 flex items-center justify-between">
            <span>{card.title || '无标题'}</span>
            <span className={'tabular-nums ' + (doneCount === card.items.length && card.items.length > 0 ? 'text-[var(--accent)] font-semibold' : 'text-stone-400 dark:text-stone-500')}>{doneCount}/{card.items.length}</span>
          </div>
          {card.items.length > 0 && (
            <div className="h-1 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
              <div className="h-full bg-[var(--accent)]/60 rounded-full transition-all duration-500" style={{ width: (doneCount / card.items.length * 100) + '%' }} />
            </div>
          )}
        </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TaskDetailModal({ card, item, onClose, onUpdate, onDelete }: {
  card: Card
  item: Item
  onClose: () => void
  onUpdate: (cardId: string, itemId: string, field: keyof Item, value: unknown) => void
  onDelete: (cardId: string, itemId: string) => void
}) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  const [tagInput, setTagInput] = useState('')
  const [tagColor, setTagColor] = useState('#3e7ae0')
  const [subtaskInput, setSubtaskInput] = useState('')

  const TAG_PALETTE = ['#e03e3e', '#e07a3e', '#e0b03e', '#3eb07a', '#3e7ae0', '#6a3ee0', '#e03e7a', '#7a8e9a']

  const addTag = () => {
    const name = tagInput.trim()
    if (!name || item.tags.some(t => t.name === name)) return
    onUpdate(card.id, item.id, 'tags', [...item.tags, { name, color: tagColor }])
    setTagInput('')
  }

  const removeTag = (name: string) => {
    onUpdate(card.id, item.id, 'tags', item.tags.filter(t => t.name !== name))
  }

  const addSubtask = () => {
    const text = subtaskInput.trim()
    if (!text) return
    onUpdate(card.id, item.id, 'subtasks', [...item.subtasks, { id: genId(), text, done: false }])
    setSubtaskInput('')
  }

  const toggleSubtask = (id: string) => {
    onUpdate(card.id, item.id, 'subtasks', item.subtasks.map(s => s.id === id ? { ...s, done: !s.done } : s))
  }

  const removeSubtask = (id: string) => {
    onUpdate(card.id, item.id, 'subtasks', item.subtasks.filter(s => s.id !== id))
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}>
      <div className="bg-gradient-to-b from-[var(--bg-card-start)] to-[var(--bg-surface-hover)] border border-[var(--border-card)] rounded-xl shadow-[0_8px_32px_rgb(var(--shadow-rgb)/var(--shadow-modal-opacity))] max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 animate-scale-in"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-stone-400 dark:text-stone-500 flex items-center gap-1.5">
            <Calendar size={12} />
            <span>{card.date || '未设置日期'}</span>
          </div>
          <button onClick={onClose} className="text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors" title="关闭">
            <X size={20} />
          </button>
        </div>

        <input
          value={item.text}
          onChange={e => onUpdate(card.id, item.id, 'text', e.target.value)}
          placeholder="标题"
          className={'w-full text-2xl font-bold bg-transparent border-none outline-none mb-4 px-0 ' + (item.done ? 'line-through text-stone-400 dark:text-stone-500' : 'text-stone-800 dark:text-stone-200')}
          autoFocus
        />

        <div className="flex items-center gap-3 mb-5 py-2.5 px-3 bg-[var(--bg-surface)] rounded-lg">
          <button onClick={() => onUpdate(card.id, item.id, 'done', !item.done)}
            className={'w-5 h-5 border-2 shrink-0 flex items-center justify-center transition-all duration-200 rounded ' + (item.done ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-stone-300 dark:border-stone-600 hover:border-[var(--accent)] hover:bg-stone-100 dark:hover:bg-stone-800/60')}>
            {item.done && <Check size={12} className="text-white animate-scale-in" strokeWidth={3} />}
          </button>
          <div className="flex items-center gap-1.5 bg-[var(--time-bg)] border border-[var(--border-time)] rounded-md px-3 py-1.5 shrink-0 cursor-pointer">
            <Clock size={13} className="text-stone-400 dark:text-stone-500 shrink-0 hover:text-[var(--accent)] transition-colors" />
            <TimePicker value={item.start} onChange={v => onUpdate(card.id, item.id, 'start', v)} />
            <span className="text-stone-300 dark:text-stone-600 font-medium hover:text-stone-500 dark:hover:text-stone-400 transition-colors">—</span>
            <TimePicker value={item.end} onChange={v => onUpdate(card.id, item.id, 'end', v)} />
            {calcMinutes(item.start, item.end) > 0 && (
              <span className="text-[11px] font-semibold text-white bg-[var(--accent-muted)] rounded-full px-2 py-0.5 ml-1">{formatDuration(calcMinutes(item.start, item.end))}</span>
            )}
          </div>
        </div>

        <div className="mb-5">
          <div className="text-xs font-semibold text-stone-500 dark:text-stone-400 mb-2">优先级</div>
          <div className="flex gap-1.5">
            {['none', 'p0', 'p1', 'p2', 'p3'].map(p => (
              <button key={p} onClick={() => onUpdate(card.id, item.id, 'priority', p)}
                className={'text-xs font-semibold px-3 py-1 rounded-lg transition-all active:scale-[0.95] ' + (
                  item.priority === p
                    ? p === 'none' ? 'bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-400' :
                      p === 'p0' ? 'bg-red-500 text-white' :
                      p === 'p1' ? 'bg-orange-500 text-white' :
                      p === 'p2' ? 'bg-blue-500 text-white' :
                      'bg-stone-400 text-white'
                    : p === 'none' ? 'bg-transparent border border-stone-300 dark:border-stone-600 text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800' :
                      'bg-transparent border ' + (
                        p === 'p0' ? 'border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30' :
                        p === 'p1' ? 'border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30' :
                        p === 'p2' ? 'border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30' :
                        'border-stone-300 dark:border-stone-600 text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                      )
                )}>
                {p === 'none' ? '无' : p.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <div className="text-xs font-semibold text-stone-500 dark:text-stone-400 mb-2">重复</div>
          <div className="flex gap-1.5">
            {[
              { value: 'none', label: '不重复' },
              { value: 'daily', label: '每天' },
              { value: 'weekdays', label: '工作日' },
              { value: 'weekly', label: '每周' },
            ].map(r => (
              <button key={r.value} onClick={() => onUpdate(card.id, item.id, 'repeat', r.value)}
                className={'text-xs font-semibold px-3 py-1 rounded-lg transition-all active:scale-[0.95] ' + (
                  item.repeat === r.value
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-transparent border border-stone-300 dark:border-stone-600 text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                )}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <div className="text-xs font-semibold text-stone-500 dark:text-stone-400 mb-2">标签</div>
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            {item.tags.map(tag => (
              <span key={tag.name}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full text-white font-medium"
                style={{ backgroundColor: tag.color }}>
                {tag.name}
                <button onClick={() => removeTag(tag.name)} className="text-white/70 hover:text-white transition-colors">
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addTag() }}
              placeholder="新标签名称..."
              className="flex-1 text-xs bg-transparent border border-stone-300 dark:border-stone-600 rounded-lg px-2.5 py-1.5 outline-none focus:border-[var(--accent)] text-stone-700 dark:text-stone-300 placeholder-stone-400 dark:placeholder-stone-500"
            />
            <div className="flex gap-0.5">
              {TAG_PALETTE.map(c => (
                <button key={c} onClick={() => setTagColor(c)}
                  className={'w-4 h-4 rounded-full transition-all ' + (tagColor === c ? 'ring-2 ring-offset-1 ring-stone-400 dark:ring-offset-stone-800' : 'ring-0')}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
            <button onClick={addTag}
              className="text-xs text-stone-500 dark:text-stone-400 hover:text-[var(--accent)] transition-colors shrink-0">
              <Plus size={16} />
            </button>
          </div>
        </div>

        <div className="mb-5">
          <div className="text-xs font-semibold text-stone-500 dark:text-stone-400 mb-2">描述</div>
          <DescriptionEditor
            content={item.description}
            onChange={html => onUpdate(card.id, item.id, 'description', html)}
          />
        </div>

        <div className="mb-5">
          <div className="text-xs font-semibold text-stone-500 dark:text-stone-400 mb-2">
            子任务
            {item.subtasks.length > 0 && (
              <span className="ml-1.5 text-stone-400 dark:text-stone-500 font-normal">
                {item.subtasks.filter(s => s.done).length}/{item.subtasks.length}
              </span>
            )}
          </div>
          <div className="space-y-1 mb-2">
            {item.subtasks.map(sub => (
              <div key={sub.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800/40 transition-colors group">
                <button onClick={() => toggleSubtask(sub.id)}
                  className={'w-4 h-4 border shrink-0 flex items-center justify-center transition-all duration-200 rounded ' + (sub.done ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-stone-300 dark:border-stone-600 hover:border-[var(--accent)]')}>
                  {sub.done && <Check size={10} className="text-white" strokeWidth={3} />}
                </button>
                <span className={'text-sm flex-1 ' + (sub.done ? 'line-through text-stone-400 dark:text-stone-500' : 'text-stone-700 dark:text-stone-300')}>{sub.text}</span>
                <button onClick={() => removeSubtask(sub.id)}
                  className="opacity-0 group-hover:opacity-100 text-stone-400 dark:text-stone-500 hover:text-red-500 dark:hover:text-red-400 transition-all">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              value={subtaskInput}
              onChange={e => setSubtaskInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addSubtask() }}
              placeholder="添加子任务..."
              className="flex-1 text-xs bg-transparent border border-dashed border-stone-300 dark:border-stone-600 rounded-lg px-2.5 py-1.5 outline-none focus:border-[var(--accent)] focus:border-solid text-stone-700 dark:text-stone-300 placeholder-stone-400 dark:placeholder-stone-500"
            />
            <button onClick={addSubtask}
              className="text-xs text-stone-500 dark:text-stone-400 hover:text-[var(--accent)] transition-colors shrink-0">
              <Plus size={16} />
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-[var(--border-item)]">
          <button onClick={() => { onDelete(card.id, item.id); onClose() }}
            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm flex items-center gap-1.5 transition-colors">
            <Trash2 size={14} /> 删除任务
          </button>
        </div>
      </div>
    </div>
  )
}

const CARD_COLORS = ['#c45a4a', '#c4904a', '#8aaa5a', '#4a9a8a', '#4a7fc4', '#8a74c4', '#c46a8a', '#6a7a8a']

function TimelineView({ cards, onOpenItem }: { cards: Card[]; onOpenItem: (cardId: string, itemId: string) => void }) {
  const HOUR_HEIGHT = 54
  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()

  const items = cards.flatMap((card, ci) =>
    card.items
      .filter(it => calcMinutes(it.start, it.end) > 0 && it.text.trim())
      .map(it => ({
        ...it,
        cardId: card.id,
        cardTitle: card.title,
        color: CARD_COLORS[ci % CARD_COLORS.length],
        startMin: timeToMinutes(it.start),
        endMin: timeToMinutes(it.end),
      }))
  )

  const noTimeItems = cards.flatMap((card, ci) =>
    card.items.filter(it => calcMinutes(it.start, it.end) <= 0 || !it.text.trim()).map(it => ({
      ...it, cardId: card.id, cardTitle: card.title, color: CARD_COLORS[ci % CARD_COLORS.length],
    }))
  )

  const minHour = items.length
    ? Math.max(0, Math.floor((Math.min(...items.map(i => i.startMin)) - 30) / 60))
    : 6
  const maxHour = items.length
    ? Math.min(23, Math.ceil((Math.max(...items.map(i => i.endMin)) + 30) / 60))
    : 22

  if (!items.length && !noTimeItems.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-stone-400 dark:text-stone-500 gap-2">
        <Calendar size={32} strokeWidth={1} className="opacity-40" />
        <p className="text-sm">暂无事项，先添加一些吧</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto pr-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-stone-400 dark:text-stone-500 gap-2">
            <Clock size={24} strokeWidth={1} className="opacity-40" />
            <p className="text-xs">事项尚未设定时间块</p>
          </div>
        ) : (
          <div className="relative min-h-[200px]" style={{ height: (maxHour - minHour) * HOUR_HEIGHT + 30 + 'px' }}>
            <div className="absolute left-0 right-0 top-[15px] bottom-0">
              {Array.from({ length: maxHour - minHour }, (_, i) => {
                const hour = minHour + i
                return (
                  <div key={hour} className="absolute left-0 right-0"
                    style={{ top: i * HOUR_HEIGHT + 'px', height: HOUR_HEIGHT + 'px' }}>
                    <div className="absolute inset-0 border-t border-[var(--border-divider)]/20" />
                    <div className="absolute left-0 right-0 border-t border-dashed border-[var(--border-divider)]/8"
                      style={{ top: '50%' }} />
                    <span className="absolute -top-2.5 left-0 text-[10px] text-stone-400 dark:text-stone-500 w-9 text-right font-mono tabular-nums">
                      {String(hour).padStart(2, '0')}
                    </span>
                  </div>
                )
              })}
            </div>

            {nowMin >= minHour * 60 && nowMin <= maxHour * 60 && (
              <div className="absolute left-0 right-0 z-10 pointer-events-none"
                style={{ top: ((nowMin - minHour * 60) * HOUR_HEIGHT / 60) + 15 + 'px' }}>
                <div className="flex items-center gap-1 ml-9">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                  <span className="h-px flex-1 bg-[var(--accent)]/40" />
                </div>
              </div>
            )}

            <div className="absolute left-9 right-0 top-[15px]" style={{ bottom: 0 }}>
              {items.map((item, _, all) => {
                const topPx = (item.startMin - minHour * 60) * HOUR_HEIGHT / 60
                const heightPx = Math.max(item.endMin - item.startMin, 18) * HOUR_HEIGHT / 60
                const overlaps = all.filter(o =>
                  o.id !== item.id && o.startMin < item.endMin && o.endMin > item.startMin
                )
                const col = overlaps.filter(o =>
                  o.startMin < item.startMin || (o.startMin === item.startMin && o.id < item.id)
                ).length
                const totalCols = Math.max(...all.map(o => {
                  const ov = all.filter(x => x.id !== o.id && x.startMin < o.endMin && x.endMin > o.startMin)
                  return ov.filter(x => x.startMin < o.startMin || (x.startMin === o.startMin && x.id < o.id)).length + 1
                }), 1)
                const gap = totalCols > 1 ? 3 : 0
                const w = `calc((100% - ${gap * (totalCols - 1)}px) / ${totalCols})`

                return (
                  <div key={item.id}
                    onClick={() => onOpenItem(item.cardId, item.id)}
                    className="absolute rounded-lg cursor-pointer transition-all duration-150 active:scale-[0.97]"
                    style={{
                      top: topPx + 'px',
                      height: heightPx + 'px',
                      left: `calc(${col} * (${w} + ${gap}px))`,
                      width: w,
                    }}>
                    <div className="h-full rounded-lg bg-[var(--bg-surface)]/50 dark:bg-[var(--bg-card-start)]/60 hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--bg-surface)] transition-colors duration-150 overflow-hidden"
                      style={{ borderLeft: `3px solid ${item.color}`, paddingLeft: 0 }}>
                      <div className="flex items-start gap-1.5 px-2 py-1 h-full" style={{ marginLeft: '6px' }}>
                        <span className="w-1 h-1 rounded-full mt-1.5 shrink-0 opacity-60" style={{ backgroundColor: item.color }} />
                        <div className="min-w-0 flex-1 flex items-baseline gap-1.5">
                          <span className="text-[12px] font-medium text-stone-700 dark:text-stone-300 leading-tight truncate">
                            {item.text}
                          </span>
                          <span className="text-[9px] text-stone-400 dark:text-stone-500 font-mono whitespace-nowrap tabular-nums">
                            {item.start}–{item.end}
                          </span>
                          {item.cardTitle && (
                            <span className="text-[9px] text-stone-400 dark:text-stone-500 hidden sm:inline shrink-0 ml-auto">
                              {item.cardTitle}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {noTimeItems.length > 0 && (
          <div className="mt-3 pt-2 border-t border-[var(--border-divider)]/20">
            <div className="text-[10px] text-stone-400 dark:text-stone-500 mb-1.5 font-medium">未设定时间</div>
            <div className="space-y-0.5">
              {noTimeItems.map(it => (
                <button key={it.id} onClick={() => onOpenItem(it.cardId, it.id)}
                  className="w-full text-left flex items-center gap-2 px-2 py-1 text-xs rounded-lg hover:bg-[var(--bg-surface)] transition-colors active:scale-[0.98] text-stone-600 dark:text-stone-400">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0 opacity-60" style={{ backgroundColor: it.color }} />
                  <span className="truncate">{it.text}</span>
                  {it.cardTitle && <span className="text-stone-400 dark:text-stone-500 shrink-0 ml-auto text-[10px]">{it.cardTitle}</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const PROJECT_COLORS = ['#3d7ae0', '#e03e3e', '#e07a3e', '#e0b03e', '#3eb07a', '#6a3ee0', '#e03e7a', '#7a8e9a']

export default function App() {
  const [cards, setCards] = useState<Card[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid')
  const [openItem, setOpenItem] = useState<{ cardId: string; itemId: string } | null>(null)
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme')
    if (saved) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })
  const dragCardIdx = useRef<string | null>(null)
  const cardsRef = useRef(cards)
  cardsRef.current = cards

  const [draggingTask, setDraggingTask] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const importRef = useRef<HTMLInputElement>(null)

  const [projects, setProjects] = useState<Project[]>([])
  const [currentProjectId, setCurrentProjectId] = useState<string>('')
  const [projectMenuOpen, setProjectMenuOpen] = useState(false)
  const [renamingProject, setRenamingProject] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectColor, setNewProjectColor] = useState(PROJECT_COLORS[0])
  const [showStats, setShowStats] = useState(false)
  const [showPomodoro, setShowPomodoro] = useState(false)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (openItem) return
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault()
        searchRef.current?.focus()
      }
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        searchRef.current?.focus()
      }
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault()
        handleAddCard()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [openItem])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    const backup = () => { invoke('manual_backup').catch(() => {}) }
    backup()
    const id = setInterval(backup, 600000)
    return () => clearInterval(id)
  }, [])

  const dragItemInfo = useRef<{
    srcCardId: string
    srcIdx: number
    item: Item
    targetCardId: string | null
    targetIdx: number | null
  } | null>(null)

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (!currentProjectId) return
    loadCards(currentProjectId)
  }, [currentProjectId])

  useEffect(() => {
    if (!openItem) return
    const card = cards.find(c => c.id === openItem.cardId)
    const item = card?.items.find(i => i.id === openItem.itemId)
    if (!card || !item) setOpenItem(null)
  }, [cards, openItem])

  const loadProjects = async () => {
    try {
      const data = await invoke<Project[]>('get_projects')
      setProjects(data)
      if (data.length > 0) {
        const saved = localStorage.getItem('currentProjectId')
        if (saved && data.some(p => p.id === saved)) {
          setCurrentProjectId(saved)
        } else {
          setCurrentProjectId(data[0].id)
        }
      }
    } catch {
      const fallback: Project = { id: 'default', name: '默认项目', color: '#3d7ae0', sort_order: 0 }
      setProjects([fallback])
      setCurrentProjectId('default')
    }
  }

  const loadCards = async (projectId: string) => {
    try {
      let data = await invoke<Card[]>('get_cards', { projectId })
      if (data.length === 0) {
        data = [await invoke<Card>('create_card', { projectId })]
      }
      setCards(data)
    } catch {
      const id = genId()
      const itemId = genId()
      setCards([{ id, title: '', date: null, items: [{ id: itemId, text: '', description: '', start: '', end: '', done: false, priority: 'none', tags: [], subtasks: [], repeat: 'none' }] }])
    }
  }

  const handleSetTitle = async (id: string, title: string) => {
    setCards(prev => prev.map(c => c.id === id ? { ...c, title } : c))
    try { await invoke('update_card', { id, title }) } catch {}
  }

  const handleSetDate = async (id: string, date: string | null) => {
    setCards(prev => prev.map(c => c.id === id ? { ...c, date } : c))
    try { await invoke('update_card', { id, date }) } catch {}
  }

  const handleAddCard = async () => {
    try {
      const card = await invoke<Card>('create_card', { projectId: currentProjectId })
      setCards(prev => [...prev, card])
    } catch {
      const id = genId()
      const itemId = genId()
      setCards(prev => [...prev, { id, title: '', date: null, items: [{ id: itemId, text: '', description: '', start: '', end: '', done: false, priority: 'none', tags: [], subtasks: [], repeat: 'none' }] }])
    }
  }

  const handleDeleteCard = async (id: string) => {
    setCards(prev => prev.filter(c => c.id !== id))
    try { await invoke('delete_card', { id }) } catch {}
  }

  const handleAddItem = async (cardId: string) => {
    try {
      const item = await invoke<Item>('create_item', { cardId })
      setCards(prev => prev.map(c => c.id === cardId ? { ...c, items: [...c.items, item] } : c))
    } catch {
      const item: Item = { id: genId(), text: '', description: '', start: '', end: '', done: false, priority: 'none', tags: [], subtasks: [], repeat: 'none' }
      setCards(prev => prev.map(c => c.id === cardId ? { ...c, items: [...c.items, item] } : c))
    }
  }

  const handleUpdateItem = async (cardId: string, itemId: string, field: keyof Item, value: unknown) => {
    setCards(prev => prev.map(c => c.id === cardId ? {
      ...c,
      items: c.items.map(it => it.id === itemId ? { ...it, [field]: value } : it)
    } : c))
    const payload: Record<string, unknown> = { id: itemId }
    payload[field] = value
    try { await invoke('update_item', payload) } catch {}
    if (field === 'done' && value === true) {
      try {
        const newItem = await invoke<Item | null>('create_repeat_item', { id: itemId })
        if (newItem) {
          setCards(prev => prev.map(c => c.id === cardId ? { ...c, items: [...c.items, newItem] } : c))
        }
      } catch {}
    }
  }

  const handleOpenItem = (cardId: string, itemId: string) => {
    setOpenItem({ cardId, itemId })
  }

  const handleDeleteItem = async (cardId: string, itemId: string) => {
    setCards(prev => prev.map(c => c.id === cardId ? {
      ...c,
      items: c.items.filter(it => it.id !== itemId)
    } : c))
    try { await invoke('delete_item', { id: itemId }) } catch {}
  }

  const handleDragItemStart = useCallback((cardId: string, idx: number) => {
    const card = cardsRef.current.find(c => c.id === cardId)
    if (!card || !card.items[idx]) return
    setDraggingTask(true)
    dragItemInfo.current = {
      srcCardId: cardId,
      srcIdx: idx,
      item: { ...card.items[idx] },
      targetCardId: null,
      targetIdx: null,
    }
  }, [])

  const handleDragItemOver = useCallback((cardId: string, targetIdx: number) => {
    if (!dragItemInfo.current) return
    const info = dragItemInfo.current
    if (info.srcCardId === cardId) {
      const items = cardsRef.current.find(c => c.id === cardId)?.items
      if (!items || targetIdx > items.length) return
      info.targetCardId = null
      info.targetIdx = null
    } else {
      info.targetCardId = cardId
      info.targetIdx = targetIdx
    }
  }, [])

  const handleDropItem = useCallback((dropCardId: string, dropIdx: number) => {
    if (!dragItemInfo.current) return
    const info = dragItemInfo.current
    setDraggingTask(false)
    dragItemInfo.current = null

    if (dropCardId === info.srcCardId) {
      let ids: string[] = []
      setCards(prev => {
        const next = prev.map(c => ({ ...c, items: [...c.items] }))
        const card = next.find(c => c.id === dropCardId)
        if (!card || info.srcIdx < 0 || info.srcIdx >= card.items.length) return prev
        const insertIdx = info.srcIdx < dropIdx ? dropIdx - 1 : dropIdx
        const [moved] = card.items.splice(info.srcIdx, 1)
        card.items.splice(insertIdx, 0, moved)
        ids = card.items.map(i => i.id)
        return next
      })
      invoke('reorder_items', { ids }).catch(() => {})
    } else {
      let tgtIds: string[] = []
      setCards(prev => {
        const next = prev.map(c => ({ ...c, items: [...c.items] }))
        const srcCard = next.find(c => c.id === info.srcCardId)
        const tgtCard = next.find(c => c.id === dropCardId)
        if (!srcCard || !tgtCard) return prev
        srcCard.items.splice(info.srcIdx, 1)
        tgtCard.items.splice(dropIdx, 0, { ...info.item })
        tgtIds = tgtCard.items.map(i => i.id)
        return next
      })
      invoke('move_item', { id: info.item.id, targetCardId: dropCardId }).catch(() => {})
      invoke('reorder_items', { ids: tgtIds }).catch(() => {})
    }
  }, [])

  const handleDragItemEnd = useCallback(() => {
    if (!dragItemInfo.current) return
    setDraggingTask(false)
    dragItemInfo.current = null
  }, [])

  const handleCardDragStart = useCallback((id: string) => {
    dragCardIdx.current = id
  }, [])

  const handleCardDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault()
    if (dragCardIdx.current === null || dragCardIdx.current === id) return
    const next = [...cardsRef.current]
    const fromIdx = next.findIndex(c => c.id === dragCardIdx.current)
    const toIdx = next.findIndex(c => c.id === id)
    if (fromIdx === -1 || toIdx === -1) return
    const [moved] = next.splice(fromIdx, 1)
    next.splice(toIdx, 0, moved)
    dragCardIdx.current = id
    setCards(next)
  }, [])

  const handleCardDragEnd = useCallback(() => {
    dragCardIdx.current = null
    invoke('reorder_cards', { ids: cardsRef.current.map(c => c.id) }).catch(() => {})
  }, [])

  const handleCreateProject = async (name: string, color: string) => {
    if (!name.trim()) return
    try {
      const project = await invoke<Project>('create_project', { name: name.trim(), color })
      setProjects(prev => [...prev, project])
      setCurrentProjectId(project.id)
      localStorage.setItem('currentProjectId', project.id)
      setShowCreateForm(false)
      setNewProjectName('')
      setNewProjectColor(PROJECT_COLORS[0])
    } catch {}
  }

  const handleDeleteProject = async (id: string) => {
    if (!window.confirm('删除项目将同时删除其下所有便签和数据，确定？')) return
    try {
      await invoke('delete_project', { id })
      setProjects(prev => prev.filter(p => p.id !== id))
      if (currentProjectId === id) {
        const remaining = projects.filter(p => p.id !== id)
        if (remaining.length > 0) {
          setCurrentProjectId(remaining[0].id)
          localStorage.setItem('currentProjectId', remaining[0].id)
        }
      }
    } catch {}
  }

  const handleRenameProject = async (id: string) => {
    if (!renameValue.trim()) return
    try {
      await invoke('update_project', { id, name: renameValue.trim() })
      setProjects(prev => prev.map(p => p.id === id ? { ...p, name: renameValue.trim() } : p))
      setRenamingProject(null)
    } catch {}
  }

  const switchProject = (id: string) => {
    setCurrentProjectId(id)
    localStorage.setItem('currentProjectId', id)
    setProjectMenuOpen(false)
  }

  const filteredCards = cards.filter(card => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return card.title.toLowerCase().includes(q) ||
      card.items.some(item => item.text.toLowerCase().includes(q))
  })

  const [searchResults, setSearchResults] = useState<{ item_id: string; card_id: string; card_title: string; item_text: string; snippet: string }[]>([])

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return }
    const t = setTimeout(async () => {
      try {
        const res = await invoke<typeof searchResults>('search_items', { query: searchQuery })
        setSearchResults(res)
      } catch { setSearchResults([]) }
    }, 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-[var(--bg-page)] to-[var(--bg-page-to)] flex flex-col p-6">
      <div className="shrink-0 flex items-center gap-2 mb-5 bg-[var(--bg-surface)]/40 backdrop-blur-sm rounded-xl px-3 py-2 border border-[var(--border-item)]/40">
        {/* Project switcher */}
        <div className="relative">
          <button onClick={() => setProjectMenuOpen(!projectMenuOpen)}
            className="flex items-center gap-2 px-2.5 py-1.5 text-sm font-medium rounded-lg hover:bg-[var(--bg-surface)] transition-all active:scale-[0.97]"
            style={{ borderLeft: `3px solid ${projects.find(p => p.id === currentProjectId)?.color || 'var(--accent)'}` }}>
            <FolderKanban size={14} style={{ color: projects.find(p => p.id === currentProjectId)?.color || 'var(--accent)' }} />
            <span className="text-stone-700 dark:text-stone-300">{projects.find(p => p.id === currentProjectId)?.name || '加载中...'}</span>
            <ChevronDown size={12} className="text-stone-400 dark:text-stone-500" />
          </button>
          {projectMenuOpen && (
            <div className="absolute top-full left-0 mt-1 min-w-[220px] bg-white dark:bg-[var(--bg-card-start)] border border-[var(--border-item)] rounded-xl shadow-[0_8px_32px_rgb(var(--shadow-rgb)/var(--shadow-modal-opacity))] z-50 py-1 animate-fade-in overflow-hidden">
              {projects.map(p => (
                <div key={p.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-stone-100 dark:hover:bg-[var(--bg-surface-hover)] transition-colors group">
                  <button onClick={() => switchProject(p.id)} className="flex items-center gap-2 flex-1 text-left text-sm text-stone-700 dark:text-stone-300 min-w-0">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                    {renamingProject === p.id ? (
                      <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)}
                        onBlur={() => handleRenameProject(p.id)}
                        onKeyDown={e => { if (e.key === 'Enter') handleRenameProject(p.id); if (e.key === 'Escape') setRenamingProject(null) }}
                        className="flex-1 text-sm bg-transparent border-b border-[var(--accent)] outline-none px-0 py-0 text-stone-700 dark:text-stone-300 min-w-0"
                        onClick={e => e.stopPropagation()} />
                    ) : (
                      <span className="truncate flex-1">{p.name}</span>
                    )}
                    {currentProjectId === p.id && <CheckCheck size={12} className="text-[var(--accent)] shrink-0" />}
                  </button>
                  <button onClick={() => { setRenamingProject(p.id); setRenameValue(p.name) }}
                    className="opacity-0 group-hover:opacity-100 text-stone-400 dark:text-stone-500 hover:text-[var(--accent)] transition-all p-0.5 shrink-0">
                    <Edit3 size={12} />
                  </button>
                  <button onClick={() => handleDeleteProject(p.id)}
                    className="opacity-0 group-hover:opacity-100 text-stone-400 dark:text-stone-500 hover:text-red-500 transition-all p-0.5 shrink-0">
                    <X size={12} />
                  </button>
                </div>
              ))}
              <div className="border-t border-[var(--border-divider)]/40 mt-1 pt-1">
                {showCreateForm ? (
                  <div className="px-3 py-2 space-y-2" onClick={e => e.stopPropagation()}>
                    <input autoFocus value={newProjectName} onChange={e => setNewProjectName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleCreateProject(newProjectName, newProjectColor); if (e.key === 'Escape') { setShowCreateForm(false); setNewProjectName('') } }}
                      placeholder="项目名称..."
                      className="w-full text-sm bg-[var(--bg-surface)] border border-[var(--border-item)] rounded-lg px-2.5 py-1.5 outline-none focus:border-[var(--accent)] text-stone-700 dark:text-stone-300 placeholder-stone-400 dark:placeholder-stone-500 transition-colors" />
                    <div className="flex items-center gap-1.5">
                      {PROJECT_COLORS.map(c => (
                        <button key={c} onClick={() => setNewProjectColor(c)}
                          className={'w-5 h-5 rounded-full transition-all ' + (newProjectColor === c ? 'ring-2 ring-offset-1 ring-stone-400 dark:ring-offset-stone-800 scale-110' : 'ring-0 hover:scale-110')}
                          style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 pt-1">
                      <button onClick={() => handleCreateProject(newProjectName, newProjectColor)}
                        className="flex-1 text-xs font-semibold bg-[var(--accent)] text-white rounded-lg px-3 py-1.5 hover:brightness-110 transition-all active:scale-[0.95]">
                        创建
                      </button>
                      <button onClick={() => { setShowCreateForm(false); setNewProjectName('') }}
                        className="flex-1 text-xs font-semibold bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-400 rounded-lg px-3 py-1.5 hover:bg-stone-200 dark:hover:bg-stone-600 transition-all active:scale-[0.95]">
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowCreateForm(true)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-stone-500 dark:text-stone-400 hover:text-[var(--accent)] hover:bg-stone-100 dark:hover:bg-[var(--bg-surface-hover)] transition-colors">
                    <Plus size={14} /> 新建项目
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-300 dark:text-stone-600" />
          <input ref={searchRef}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="搜索 (⌘K /)"
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-[var(--input-bg)] text-stone-700 dark:text-stone-300 placeholder-stone-400 dark:placeholder-stone-500 border border-[var(--border-item)] rounded-lg outline-none focus:border-[var(--accent)]/50 focus:shadow-[0_0_0_3px_rgb(var(--accent-rgb)/0.08)] transition-all"
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); setSearchResults([]) }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-400">
              <X size={12} />
            </button>
          )}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[var(--bg-card-start)] border border-[var(--border-item)] rounded-lg shadow-[0_8px_24px_rgb(var(--shadow-rgb)/var(--shadow-modal-opacity))] z-50 max-h-64 overflow-y-auto">
              {searchResults.map(r => (
                <button key={r.item_id} onClick={() => { setOpenItem({ cardId: r.card_id, itemId: r.item_id }); setSearchResults([]); setSearchQuery('') }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-stone-100 dark:hover:bg-[var(--bg-surface-hover)] border-b border-[var(--border-divider)]/30 last:border-0 transition-colors">
                  <div className="text-stone-500 dark:text-stone-400 truncate">{r.card_title || '无标题'}</div>
                  <div className="text-stone-700 dark:text-stone-300 font-medium truncate">{r.item_text || '无标题事项'}</div>
                  <div className="text-stone-400 dark:text-stone-500 mt-0.5 truncate [&>mark]:bg-yellow-200 dark:[&>mark]:bg-yellow-700 [&>mark]:text-stone-900 dark:[&>mark]:text-stone-100" dangerouslySetInnerHTML={{ __html: r.snippet }} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-[var(--border-divider)]/40 mx-1" />

        {/* View & tools */}
        <div className="flex items-center gap-0.5">
          <button onClick={() => setViewMode(viewMode === 'grid' ? 'timeline' : 'grid')}
            className="p-1.5 rounded-lg text-stone-400 dark:text-stone-500 hover:text-[var(--accent)] hover:bg-[var(--bg-surface)] transition-all active:scale-[0.95]"
            title={viewMode === 'grid' ? '时间线视图' : '卡片视图'}>
            {viewMode === 'grid' ? <CalendarDays size={15} /> : <LayoutGrid size={15} />}
          </button>
          <button onClick={() => setShowStats(true)}
            className="p-1.5 rounded-lg text-stone-400 dark:text-stone-500 hover:text-[var(--accent)] hover:bg-[var(--bg-surface)] transition-all active:scale-[0.95]"
            title="统计看板">
            <BarChart3 size={15} />
          </button>
          <button onClick={() => setShowPomodoro(true)}
            className="p-1.5 rounded-lg text-stone-400 dark:text-stone-500 hover:text-[var(--accent)] hover:bg-[var(--bg-surface)] transition-all active:scale-[0.95]"
            title="番茄钟">
            <Timer size={15} />
          </button>
        </div>

        <div className="w-px h-5 bg-[var(--border-divider)]/40 mx-1" />

        {/* Utilities */}
        <div className="flex items-center gap-0.5">
          <button onClick={() => setDark(!dark)}
            className="p-1.5 rounded-lg text-stone-400 dark:text-stone-500 hover:text-[var(--accent)] hover:bg-[var(--bg-surface)] transition-all active:scale-[0.95]"
            title={dark ? '浅色模式' : '深色模式'}>
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button onClick={async () => {
            try {
              const json = await invoke<string>('export_data')
              const blob = new Blob([json], { type: 'application/json' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `todopotato-backup-${new Date().toISOString().slice(0, 10)}.json`
              a.click()
              URL.revokeObjectURL(url)
            } catch {}
          }} className="p-1.5 rounded-lg text-stone-400 dark:text-stone-500 hover:text-[var(--accent)] hover:bg-[var(--bg-surface)] transition-all active:scale-[0.95]"
            title="导出数据">
            <Download size={15} />
          </button>
          <button onClick={() => importRef.current?.click()}
            className="p-1.5 rounded-lg text-stone-400 dark:text-stone-500 hover:text-[var(--accent)] hover:bg-[var(--bg-surface)] transition-all active:scale-[0.95]"
            title="导入数据">
            <Upload size={15} />
          </button>
        </div>

        <input ref={importRef} type="file" hidden accept=".json"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            if (!window.confirm('导入将覆盖所有现有数据，确定继续？')) return
            try {
              const text = await file.text()
              await invoke('import_data', { json: text })
              loadProjects()
            } catch (err) {
              alert('导入失败：' + err)
            }
            e.target.value = ''
          }} />

        <span className="text-xs text-stone-400 dark:text-stone-500 ml-auto tabular-nums">
          {searchQuery ? `${filteredCards.length} 个结果` : `${cards.length} 个便签`}
        </span>
      </div>
      <div className="flex-1 flex items-start gap-4 overflow-x-auto">
        {viewMode === 'grid' ? (
          <>
          {filteredCards.map(card => (
            <NoteCard
              key={card.id}
              card={card}
              onSetTitle={handleSetTitle}
              onSetDate={handleSetDate}
              onDeleteCard={handleDeleteCard}
              onAddItem={handleAddItem}
              onUpdateItem={handleUpdateItem}
              onDeleteItem={handleDeleteItem}
              onDragItemStart={handleDragItemStart}
              onDragItemOver={handleDragItemOver}
              onDropItem={handleDropItem}
              onDragItemEnd={handleDragItemEnd}
              onOpenItem={handleOpenItem}
              onCardDragStart={handleCardDragStart}
              onCardDragOver={handleCardDragOver}
              onCardDragEnd={handleCardDragEnd}
              draggingTask={draggingTask}
            />
          ))}
          <button onClick={handleAddCard}
            className="group w-[300px] h-14 shrink-0 flex items-center justify-center gap-2 border-2 border-dashed border-stone-300 dark:border-stone-600 text-stone-400 dark:text-stone-500 hover:text-[var(--accent)] hover:border-[var(--accent)]/40 hover:bg-[var(--bg-surface)]/40 transition-all text-xs rounded-xl active:scale-[0.97]">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-stone-100 dark:bg-stone-700 group-hover:bg-[var(--accent)]/10 group-hover:text-[var(--accent)] transition-all">
              <Plus size={14} className="group-hover:rotate-90 transition-transform duration-300" />
            </span>
            添加便签
          </button>
          </>
        ) : (
          <div className="flex-1 min-h-0">
            <TimelineView cards={filteredCards} onOpenItem={handleOpenItem} />
          </div>
        )}
      </div>
      {openItem && (() => {
        const card = cards.find(c => c.id === openItem.cardId)
        const item = card?.items.find(i => i.id === openItem.itemId)
        if (!card || !item) return null
        return <TaskDetailModal card={card} item={item} onClose={() => setOpenItem(null)}
          onUpdate={handleUpdateItem} onDelete={handleDeleteItem} />
      })()}
      {showStats && <StatisticsPanel onClose={() => setShowStats(false)} />}
      {showPomodoro && <PomodoroTimer onClose={() => setShowPomodoro(false)} />}
    </div>
  )
}

function StatisticsPanel({ onClose }: { onClose: () => void }) {
  const [stats, setStats] = useState<Statistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'overview' | 'daily'>('overview')

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  const load = async () => {
    try {
      const data = await invoke<Statistics>('get_statistics')
      setStats(data)
    } catch {}
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}>
      <div className="bg-gradient-to-b from-[var(--bg-card-start)] to-[var(--bg-surface-hover)] border border-[var(--border-card)] rounded-xl shadow-[0_8px_32px_rgb(var(--shadow-rgb)/var(--shadow-modal-opacity))] max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6 animate-scale-in"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BarChart3 size={18} className="text-[var(--accent)]" />
            <h2 className="text-lg font-bold text-stone-800 dark:text-stone-200">统计看板</h2>
          </div>
          <button onClick={onClose} className="text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-stone-400 dark:text-stone-500 text-sm">加载中...</div>
        ) : !stats ? (
          <div className="flex items-center justify-center py-16 text-stone-400 dark:text-stone-500 text-sm">暂无数据</div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: '总事项', value: stats.total_items, color: 'text-[var(--accent)]' },
                { label: '已完成', value: stats.completed_items, color: 'text-emerald-500' },
                { label: '完成率', value: stats.completion_rate.toFixed(1) + '%', color: stats.completion_rate > 50 ? 'text-emerald-500' : 'text-orange-500' },
                { label: '专注时长', value: formatDuration(stats.total_minutes), color: 'text-blue-500' },
              ].map(s => (
                <div key={s.label} className="bg-[var(--bg-surface)] rounded-lg p-3 text-center">
                  <div className={'text-2xl font-bold ' + s.color}>{s.value}</div>
                  <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-4 border-b border-[var(--border-divider)]/40">
              <button onClick={() => setTab('overview')}
                className={'px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ' + (tab === 'overview' ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300')}>
                概览
              </button>
              <button onClick={() => setTab('daily')}
                className={'px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ' + (tab === 'daily' ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300')}>
                每日明细
              </button>
            </div>

            {tab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Priority distribution */}
                <div className="bg-[var(--bg-surface)] rounded-lg p-4">
                  <div className="text-xs font-semibold text-stone-500 dark:text-stone-400 mb-3">优先级分布</div>
                  <div className="space-y-2">
                    {stats.priority_distribution.map(p => {
                      const max = Math.max(...stats.priority_distribution.map(x => x.count), 1)
                      const pct = (p.count / max * 100)
                      const colors: Record<string, string> = { p0: 'bg-red-500', p1: 'bg-orange-500', p2: 'bg-blue-500', p3: 'bg-stone-400' }
                      const labels: Record<string, string> = { p0: 'P0 紧急', p1: 'P1 高', p2: 'P2 中', p3: 'P3 低', none: '无优先级' }
                      return (
                        <div key={p.label} className="flex items-center gap-2">
                          <span className="text-xs text-stone-600 dark:text-stone-400 w-16 shrink-0">{labels[p.label] || p.label}</span>
                          <div className="flex-1 h-4 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
                            <div className={'h-full rounded-full transition-all ' + (colors[p.label] || 'bg-stone-400')} style={{ width: pct + '%' }} />
                          </div>
                          <span className="text-xs text-stone-500 dark:text-stone-400 w-8 text-right">{p.count}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Items by date */}
                <div className="bg-[var(--bg-surface)] rounded-lg p-4">
                  <div className="text-xs font-semibold text-stone-500 dark:text-stone-400 mb-3">按日期分布</div>
                  {stats.items_by_date.length === 0 ? (
                    <div className="text-xs text-stone-400 dark:text-stone-500 py-4 text-center">暂无带日期的事项</div>
                  ) : (
                    <div className="space-y-1">
                      {stats.items_by_date.slice(0, 10).map(d => (
                        <div key={d.date} className="flex items-center gap-2">
                          <span className="text-xs text-stone-600 dark:text-stone-400 w-24 shrink-0">{d.date}</span>
                          <div className="flex-1 h-3 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
                            <div className="h-full bg-[var(--accent)]/60 rounded-full" style={{ width: Math.min(d.count / Math.max(...stats.items_by_date.map(x => x.count), 1) * 100, 100) + '%' }} />
                          </div>
                          <span className="text-xs text-stone-500 dark:text-stone-400 w-6 text-right">{d.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'daily' && (
              <div className="bg-[var(--bg-surface)] rounded-lg p-4">
                <div className="text-xs font-semibold text-stone-500 dark:text-stone-400 mb-3">每日统计（近 30 天）</div>
                {stats.daily_stats.length === 0 ? (
                  <div className="text-xs text-stone-400 dark:text-stone-500 py-4 text-center">暂无带日期的事项</div>
                ) : (
                  <div className="space-y-1">
                    {stats.daily_stats.map(d => (
                      <div key={d.date} className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-stone-100 dark:hover:bg-[var(--bg-surface-hover)] transition-colors">
                        <span className="text-xs text-stone-600 dark:text-stone-400 w-24 shrink-0">{d.date}</span>
                        <div className="flex-1 flex items-center gap-2">
                          <div className="flex-1 h-3 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden flex">
                            <div className="h-full bg-emerald-400/70 rounded-l-full transition-all" style={{ width: (d.total > 0 ? d.completed / d.total * 100 : 0) + '%', minWidth: d.completed > 0 ? '4px' : '0' }} />
                            <div className="h-full bg-stone-300 dark:bg-stone-600 rounded-r-full transition-all" style={{ width: (d.total > 0 ? (d.total - d.completed) / d.total * 100 : 100) + '%', minWidth: (d.total - d.completed) > 0 ? '4px' : '0' }} />
                          </div>
                          <span className="text-[10px] text-stone-500 dark:text-stone-400 w-16 text-right tabular-nums">{d.completed}/{d.total}</span>
                        </div>
                        {d.minutes > 0 && <span className="text-[10px] text-stone-500 dark:text-stone-400 w-14 text-right tabular-nums">{formatDuration(d.minutes)}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

interface Statistics {
  total_items: number
  completed_items: number
  completion_rate: number
  total_minutes: number
  items_by_date: { date: string; count: number }[]
  priority_distribution: { label: string; count: number }[]
  daily_stats: { date: string; total: number; completed: number; minutes: number }[]
}

function PomodoroTimer({ onClose }: { onClose: () => void }) {
  const MODE_WORK = 25
  const MODE_BREAK = 5
  const [mode, setMode] = useState<'work' | 'break'>('work')
  const [minutes, setMinutes] = useState(MODE_WORK)
  const [seconds, setSeconds] = useState(0)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [pomodoroStats, setPomodoroStats] = useState<PomodoroStats | null>(null)

  useEffect(() => {
    loadStats()
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  const loadStats = async () => {
    try {
      const s = await invoke<PomodoroStats>('get_pomodoro_stats')
      setPomodoroStats(s)
    } catch {}
  }

  const start = () => {
    setRunning(true)
    intervalRef.current = setInterval(() => {
      setSeconds(prev => {
        if (prev > 0) return prev - 1
        setMinutes(m => {
          if (m > 0) return m - 1
          setRunning(false)
          setMode(mode === 'work' ? 'break' : 'work')
          if (mode === 'work') {
            invoke('log_pomodoro', { item_id: '', duration_minutes: MODE_WORK }).catch(() => {})
            loadStats()
          }
          return mode === 'work' ? MODE_BREAK : MODE_WORK
        })
        return 59
      })
    }, 1000)
  }

  const pause = () => {
    setRunning(false)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  const reset = () => {
    pause()
    setMode('work')
    setMinutes(MODE_WORK)
    setSeconds(0)
  }

  const totalSeconds = minutes * 60 + seconds
  const total = (mode === 'work' ? MODE_WORK : MODE_BREAK) * 60
  const progress = total > 0 ? (total - totalSeconds) / total * 100 : 0

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}>
      <div className="bg-gradient-to-b from-[var(--bg-card-start)] to-[var(--bg-surface-hover)] border border-[var(--border-card)] rounded-xl shadow-[0_8px_32px_rgb(var(--shadow-rgb)/var(--shadow-modal-opacity))] max-w-sm w-full p-6 animate-scale-in"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Timer size={18} className="text-[var(--accent)]" />
            <h2 className="text-lg font-bold text-stone-800 dark:text-stone-200">番茄钟</h2>
          </div>
          <button onClick={onClose} className="text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Mode switch */}
        <div className="flex bg-[var(--bg-surface)] rounded-lg p-0.5 mb-6">
          <button onClick={() => { reset(); setMode('work') }}
            className={'flex-1 text-xs font-semibold py-1.5 rounded-md transition-all ' + (mode === 'work' ? 'bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-200 shadow-sm' : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300')}>
            专注 25分
          </button>
          <button onClick={() => { reset(); setMode('break') }}
            className={'flex-1 text-xs font-semibold py-1.5 rounded-md transition-all ' + (mode === 'break' ? 'bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-200 shadow-sm' : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300')}>
            休息 5分
          </button>
        </div>

        {/* Timer display */}
        <div className="relative w-48 h-48 mx-auto mb-6">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="var(--border-item)" strokeWidth="6" />
            <circle cx="50" cy="50" r="45" fill="none" stroke="var(--accent)" strokeWidth="6"
              strokeDasharray={`${progress * 2.83} ${283 - progress * 2.83}`}
              strokeLinecap="round" className="transition-all duration-1000" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold tabular-nums text-stone-800 dark:text-stone-200">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
            <span className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              {mode === 'work' ? '专注中' : '休息中'}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 mb-6">
          {!running ? (
            <button onClick={start}
              className="flex items-center gap-2 px-6 py-2 bg-[var(--accent)] text-white text-sm font-semibold rounded-lg hover:brightness-110 transition-all active:scale-[0.95]">
              <Play size={16} /> 开始
            </button>
          ) : (
            <button onClick={pause}
              className="flex items-center gap-2 px-6 py-2 bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 text-sm font-semibold rounded-lg hover:bg-stone-300 dark:hover:bg-stone-600 transition-all active:scale-[0.95]">
              <Pause size={16} /> 暂停
            </button>
          )}
          <button onClick={reset}
            className="p-2 rounded-lg text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-400 hover:bg-stone-200/50 dark:hover:bg-stone-700/50 transition-all"
            title="重置">
            <RotateCcw size={16} />
          </button>
        </div>

        {/* Stats */}
        {pomodoroStats && (
          <div className="flex items-center justify-around bg-[var(--bg-surface)] rounded-lg p-3 text-center">
            <div>
              <div className="text-lg font-bold text-[var(--accent)]">{pomodoroStats.today_sessions}</div>
              <div className="text-[10px] text-stone-500 dark:text-stone-400">今日专注</div>
            </div>
            <div className="w-px h-8 bg-[var(--border-divider)]/40" />
            <div>
              <div className="text-lg font-bold text-emerald-500">{formatDuration(pomodoroStats.today_minutes)}</div>
              <div className="text-[10px] text-stone-500 dark:text-stone-400">今日时长</div>
            </div>
            <div className="w-px h-8 bg-[var(--border-divider)]/40" />
            <div>
              <div className="text-lg font-bold text-stone-600 dark:text-stone-400">{pomodoroStats.total_sessions}</div>
              <div className="text-[10px] text-stone-500 dark:text-stone-400">总计</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface PomodoroStats {
  total_sessions: number
  total_minutes: number
  today_sessions: number
  today_minutes: number
}
