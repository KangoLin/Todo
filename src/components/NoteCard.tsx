import { useState, useRef } from 'react'
import { Plus, Clock, X, Trash2, GripVertical, Calendar, ChevronDown } from 'lucide-react'
import type { Item, Card } from '../lib/types'
import { calcMinutes, formatDuration } from '../lib/utils'
import { TimePicker } from './TimePicker'
import { DatePicker } from './DatePicker'

export interface NoteCardProps {
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
  isTouch: boolean
  onOpenMoveMenu: (cardId: string, itemId: string, x: number, y: number) => void
}

export function NoteCard({
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
  isTouch,
  onOpenMoveMenu,
}: NoteCardProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  const doneCount = card.items.filter(i => i.done).length

  const [collapsed, setCollapsed] = useState(false)

  // 触屏长按检测：按住 0.5s 且位移 < 10px 视为长按；松手后打开移动菜单
  const touchRef = useRef<{ x: number; y: number; timer: ReturnType<typeof setTimeout> | null; fired: boolean } | null>(null)
  const suppressClickRef = useRef(false)

  const clearItemTouch = () => {
    const st = touchRef.current
    if (!st) return
    if (st.timer) clearTimeout(st.timer)
    touchRef.current = null
  }

  const startItemTouch = (e: React.TouchEvent) => {
    if (!isTouch) return
    suppressClickRef.current = false
    const t = e.touches[0]
    const st = { x: t.clientX, y: t.clientY, timer: null as ReturnType<typeof setTimeout> | null, fired: false }
    touchRef.current = st
    st.timer = setTimeout(() => { st.fired = true }, 500)
  }

  const moveItemTouch = (e: React.TouchEvent) => {
    const st = touchRef.current
    if (!st) return
    const t = e.touches[0]
    if (Math.hypot(t.clientX - st.x, t.clientY - st.y) > 10) clearItemTouch()
  }

  const endItemTouch = (e: React.TouchEvent, cardId: string, itemId: string) => {
    const st = touchRef.current
    clearItemTouch()
    if (!st || !st.fired) return
    const t = e.changedTouches[0]
    suppressClickRef.current = true
    onOpenMoveMenu(cardId, itemId, t.clientX, t.clientY)
  }

  const handleItemClick = (cardId: string, itemId: string) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    onOpenItem(cardId, itemId)
  }

  return (
    <div draggable={!isTouch}
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
            <div key={item.id} draggable={!isTouch}
              onContextMenu={(e) => e.preventDefault()}
              onTouchStart={(e) => startItemTouch(e)}
              onTouchMove={moveItemTouch}
              onTouchEnd={(e) => endItemTouch(e, card.id, item.id)}
              onTouchCancel={clearItemTouch}
              onDragStart={() => onDragItemStart(card.id, i)}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); onDragItemOver(card.id, i) }}
              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); onDropItem(card.id, i) }}
              onDragEnd={onDragItemEnd}
              onClick={() => handleItemClick(card.id, item.id)}
              className={'select-none border rounded-lg transition-all duration-200 cursor-pointer touch-manipulation hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgb(var(--shadow-rgb)/var(--shadow-hover-opacity))] active:scale-[0.98] ' +
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