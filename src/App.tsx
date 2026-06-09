import { invoke } from '@tauri-apps/api/core'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Clock, X, Trash2, GripVertical, Calendar, Search, Check, ChevronDown, Moon, Sun, Download, Upload, LayoutGrid, CalendarDays } from 'lucide-react'
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
}

interface Card {
  id: string
  title: string
  date: string | null
  items: Item[]
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

  const totalMin = card.items.reduce((s, it) => s + calcMinutes(it.start, it.end), 0)
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
              className={'border rounded-lg transition-all duration-200 overflow-hidden cursor-pointer hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgb(var(--shadow-rgb)/var(--shadow-hover-opacity))] active:scale-[0.98] ' +
                (item.done
                  ? 'border-rose-200 bg-rose-50 hover:bg-rose-100 border-l-[3px] border-l-rose-300'
                  : 'border-[var(--border-item)] bg-transparent hover:bg-[var(--bg-surface-hover)] border-l-[3px] border-l-transparent hover:border-l-[var(--accent)]')}>
              <div className="flex items-center gap-1 px-2.5 py-1.5 border-b border-[var(--border-divider)]/50 bg-[var(--bg-surface)]">
                <span onClick={e => e.stopPropagation()} className="text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-400 hover:bg-stone-200/50 dark:hover:bg-stone-700/40 cursor-grab active:cursor-grabbing shrink-0 rounded p-1">
                  <GripVertical size={12} />
                </span>
                <button onClick={e => { e.stopPropagation(); onUpdateItem(card.id, item.id, 'done', !item.done) }}
                  className={'w-5 h-5 border shrink-0 flex items-center justify-center transition-all duration-200 rounded ' + (item.done ? 'bg-[var(--accent)] border-[var(--accent)] scale-100' : 'border-stone-300 dark:border-stone-600 hover:border-[var(--accent)] hover:bg-stone-100 dark:hover:bg-stone-800/60')}>
                  {item.done && <svg viewBox="0 0 12 12" className="w-3 h-3 text-white animate-scale-in" fill="none" stroke="currentColor" strokeWidth="3"><path d="M2 6l3 3 5-5" /></svg>}
                </button>
                {item.priority !== 'none' && (
                  <button onClick={e => { e.stopPropagation(); const nxt = item.priority === 'p0' ? 'p1' : item.priority === 'p1' ? 'p2' : item.priority === 'p2' ? 'p3' : 'p0'; onUpdateItem(card.id, item.id, 'priority', nxt) }}
                    className={'text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 leading-none transition-all active:scale-[0.9] ' + (
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
                <div className="flex items-center gap-1.5 bg-[var(--time-bg)] border border-[var(--border-time)] rounded-md px-2.5 py-1 shrink-0 cursor-pointer">
                  <Clock size={12} className="text-stone-400 dark:text-stone-500 shrink-0 hover:text-[var(--accent)] transition-colors" />
                  <div onClick={e => e.stopPropagation()}>
                    <TimePicker value={item.start} onChange={v => onUpdateItem(card.id, item.id, 'start', v)} />
                  </div>
                  <span className="text-stone-300 dark:text-stone-600 font-medium hover:text-stone-500 dark:hover:text-stone-400 transition-colors">—</span>
                  <div onClick={e => e.stopPropagation()}>
                    <TimePicker value={item.end} onChange={v => onUpdateItem(card.id, item.id, 'end', v)} />
                  </div>
                </div>
                <button onClick={e => { e.stopPropagation(); onDeleteItem(card.id, item.id) }} className="text-stone-400 dark:text-stone-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0 rounded p-1 ml-auto"><X size={13} /></button>
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
            className="group flex items-center justify-center gap-1 w-full py-2 text-xs text-stone-400 dark:text-stone-500 hover:text-[var(--accent)] hover:bg-white/60 dark:hover:bg-[var(--bg-surface-hover)] transition-all border border-dashed border-[var(--border-dashed)] rounded-lg active:scale-[0.98]">
            <Plus size={14} className="group-hover:rotate-90 transition-transform duration-300" /> 添加
          </button>
          <div ref={bottomRef} />
        </div>
        <div className="bg-[var(--bg-surface)] rounded-lg px-3 py-2 -mx-1 mt-1 text-xs shrink-0 space-y-0.5">
          <div className="text-stone-500 dark:text-stone-400">{card.title || '无标题'} · <span className={doneCount === card.items.length && card.items.length > 0 ? 'text-[var(--accent)] font-medium' : ''}>{doneCount}/{card.items.length}</span> 项完成</div>
          {totalMin > 0 && <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-white bg-[var(--accent-muted)] rounded-full px-2.5 py-0.5">总计 {formatDuration(totalMin)}</div>}
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
      .filter(it => it.start && it.end && it.text.trim())
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
    card.items.filter(it => !it.start || !it.end || !it.text.trim()).map(it => ({
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
                style={{ top: ((nowMin - minHour * 60) / HOUR_HEIGHT) + 15 + 'px' }}>
                <div className="flex items-center gap-1 ml-9">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                  <span className="h-px flex-1 bg-[var(--accent)]/40" />
                </div>
              </div>
            )}

            <div className="absolute left-9 right-0 top-[15px]" style={{ bottom: 0 }}>
              {items.map((item, _, all) => {
                const topPx = (item.startMin - minHour * 60) / HOUR_HEIGHT
                const heightPx = Math.max(item.endMin - item.startMin, 18) / HOUR_HEIGHT
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
    loadCards()
  }, [])

  useEffect(() => {
    if (!openItem) return
    const card = cards.find(c => c.id === openItem.cardId)
    const item = card?.items.find(i => i.id === openItem.itemId)
    if (!card || !item) setOpenItem(null)
  }, [cards, openItem])

  const loadCards = async () => {
    try {
      let data = await invoke<Card[]>('get_cards')
      if (data.length === 0) {
        data = [await invoke<Card>('create_card')]
      }
      setCards(data)
    } catch {
      const id = genId()
      const itemId = genId()
      setCards([{ id, title: '', date: null, items: [{ id: itemId, text: '', description: '', start: '', end: '', done: false, priority: 'none', tags: [], subtasks: [] }] }])
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
      const card = await invoke<Card>('create_card')
      setCards(prev => [...prev, card])
    } catch {
      const id = genId()
      const itemId = genId()
      setCards(prev => [...prev, { id, title: '', date: null, items: [{ id: itemId, text: '', description: '', start: '', end: '', done: false, priority: 'none', tags: [], subtasks: [] }] }])
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
      const item: Item = { id: genId(), text: '', description: '', start: '', end: '', done: false, priority: 'none', tags: [], subtasks: [] }
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
      <div className="shrink-0 flex items-center gap-3 mb-4">
        <div className="relative w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-300 dark:text-stone-600" />
          <input ref={searchRef}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="搜索便签...  (⌘K /)"
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
        <button onClick={() => setDark(!dark)}
          className="p-2 rounded-lg text-stone-400 dark:text-stone-500 hover:text-[var(--accent)] hover:bg-[var(--bg-surface)] transition-all active:scale-[0.95]"
          title={dark ? '切换浅色' : '切换暗色'}>
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button onClick={() => setViewMode(viewMode === 'grid' ? 'timeline' : 'grid')}
          className="p-2 rounded-lg text-stone-400 dark:text-stone-500 hover:text-[var(--accent)] hover:bg-[var(--bg-surface)] transition-all active:scale-[0.95]"
          title={viewMode === 'grid' ? '时间线视图' : '卡片视图'}>
          {viewMode === 'grid' ? <CalendarDays size={16} /> : <LayoutGrid size={16} />}
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
        }} className="p-2 rounded-lg text-stone-400 dark:text-stone-500 hover:text-[var(--accent)] hover:bg-[var(--bg-surface)] transition-all active:scale-[0.95]"
          title="导出数据">
          <Download size={16} />
        </button>
        <button onClick={() => importRef.current?.click()}
          className="p-2 rounded-lg text-stone-400 dark:text-stone-500 hover:text-[var(--accent)] hover:bg-[var(--bg-surface)] transition-all active:scale-[0.95]"
          title="导入数据">
          <Upload size={16} />
        </button>
        <input ref={importRef} type="file" hidden accept=".json"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            if (!window.confirm('导入将覆盖所有现有数据，确定继续？')) return
            try {
              const text = await file.text()
              await invoke('import_data', { json: text })
              loadCards()
            } catch (err) {
              alert('导入失败：' + err)
            }
            e.target.value = ''
          }} />
        <div className="text-xs text-stone-400 dark:text-stone-500">
          {searchQuery ? `找到 ${filteredCards.length} 个结果` : `${cards.length} 个便签`}
        </div>
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
            className="group w-[300px] h-12 shrink-0 flex items-center justify-center border-2 border-dashed border-stone-300 dark:border-stone-600 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-400 hover:border-stone-400 dark:hover:border-stone-500 transition-all text-xs rounded-lg active:scale-[0.98]">
            <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" /> 添加便签
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
    </div>
  )
}
