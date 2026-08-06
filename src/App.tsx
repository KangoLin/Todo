import { invoke } from '@tauri-apps/api/core'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Clock, X, Trash2, Calendar, Search, Check, Moon, Sun, Download, Upload, LayoutGrid, CalendarDays, Edit3, BarChart3, Timer, Play, Pause, RotateCcw } from 'lucide-react'
import DescriptionEditor from './components/DescriptionEditor'
import { TimePicker } from './components/TimePicker'
import { NoteCard } from './components/NoteCard'

import type { Item, Card, Project, ProjectTag } from './lib/types'
import { PROJECT_COLORS, CARD_COLORS } from './lib/constants'
import { calcMinutes, formatDuration, timeToMinutes, genId, formatDateLabel } from './lib/utils'
import { THEME_PRESETS, applyTheme } from './lib/theme'

function TaskDetailModal({ card, item, projectTags, onClose, onUpdate, onDelete }: {
  card: Card
  item: Item
  projectTags: ProjectTag[]
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
              placeholder="标签名称..."
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
          {projectTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-[var(--border-divider)]/30">
              {projectTags.filter(pt => !item.tags.some(t => t.name === pt.name)).map(pt => (
                <button key={pt.id} onClick={() => onUpdate(card.id, item.id, 'tags', [...item.tags, { name: pt.name, color: pt.color }])}
                  className="text-[10px] px-2 py-0.5 rounded-full border border-stone-300 dark:border-stone-600 text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all active:scale-[0.95]"
                  style={{ borderColor: pt.color + '40' }}>
                  +{pt.name}
                </button>
              ))}
            </div>
          )}
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

function TodayBriefing({ cards, onReschedule }: { cards: Card[]; onReschedule: (cardId: string, itemId: string, start: string, end: string) => void }) {
  const today = new Date().toISOString().split('T')[0]
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const todayCards = cards.filter(c => c.date === today)
  const allItems = todayCards.flatMap(c => c.items)
  const total = allItems.length
  const done = allItems.filter(i => i.done).length
  const pct = total > 0 ? Math.round(done / total * 100) : 0

  const interrupted = allItems.filter(i => {
    if (i.done || !i.start || !i.end) return false
    const endMin = parseInt(i.end.split(':')[0]) * 60 + parseInt(i.end.split(':')[1])
    return endMin < currentMinutes
  })

  const handleReschedule = (cardId: string, itemId: string, start: string, end: string) => {
    onReschedule(cardId, itemId, start, end)
  }

  if (total === 0) return null

  return (
    <div className="shrink-0 mb-3 p-4 rounded-xl bg-white/60 dark:bg-stone-800/60 backdrop-blur-sm border border-stone-200 dark:border-stone-700">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm font-medium text-stone-700 dark:text-stone-300">
          <Calendar className="w-4 h-4" />
          今日简报
        </div>
        <span className="text-xs text-stone-400">{formatDateLabel(today)}</span>
      </div>
      <div className="flex items-center gap-3 mb-2">
        <div className="flex-1 h-2 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500 bg-[var(--accent)]" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs font-semibold text-stone-600 dark:text-stone-400 shrink-0">{done}/{total} ({pct}%)</span>
      </div>
      {interrupted.length > 0 && (
        <div className="mt-2 pt-2 border-t border-stone-200 dark:border-stone-700">
          <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 mb-1.5">
            <Clock className="w-3 h-3" />
            <span>可能被打断的事项（{interrupted.length}项）</span>
          </div>
          {interrupted.map(item => {
            const card = todayCards.find(c => c.items.some(i => i.id === item.id))
            if (!card) return null
            return (
              <div key={item.id} className="flex items-center justify-between py-1 text-xs text-stone-600 dark:text-stone-400">
                <span className="truncate flex-1">
                  <span className="text-stone-400">{item.start}-{item.end}</span> {item.text}
                </span>
                <button
                  onClick={() => {
                    const nowH = String(now.getHours()).padStart(2, '0')
                    const nowM = String(now.getMinutes()).padStart(2, '0')
                    const nowStr = `${nowH}:${nowM}`
                    const origStartMin = parseInt(item.start!.split(':')[0]) * 60 + parseInt(item.start!.split(':')[1])
                    const origEndMin = parseInt(item.end!.split(':')[0]) * 60 + parseInt(item.end!.split(':')[1])
                    const dur = origEndMin - origStartMin
                    const newEndMin = currentMinutes + dur
                    const endH = String(Math.floor(newEndMin / 60) % 24).padStart(2, '0')
                    const endM = String(newEndMin % 60).padStart(2, '0')
                    handleReschedule(card.id, item.id, nowStr, `${endH}:${endM}`)
                  }}
                  className="ml-2 shrink-0 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800/60 transition-colors"
                >
                  推迟到现在
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TimeGrid({ items, minHour, maxHour, showNow, onOpenItem, onUpdateItem }: {
  items: (Item & { cardId: string; cardTitle: string; color: string; startMin: number; endMin: number })[];
  minHour: number; maxHour: number; showNow: boolean;
  onOpenItem: (cardId: string, itemId: string) => void;
  onUpdateItem: (cardId: string, itemId: string, field: keyof Item, value: unknown) => void;
}) {
  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const HOUR_HEIGHT = 54

  return (
    <div className="relative" style={{ height: (maxHour - minHour) * HOUR_HEIGHT + 36 + 'px' }}>
      <div className="absolute left-0 right-0 top-[18px] bottom-0">
        {Array.from({ length: maxHour - minHour }, (_, i) => {
          const hour = minHour + i
          return (
            <div key={hour} className="absolute left-0 right-0"
              style={{ top: i * HOUR_HEIGHT + 'px', height: HOUR_HEIGHT + 'px' }}>
              <div className="absolute inset-0 border-t border-[var(--border-divider)]/14" />
              <div className="absolute left-0 right-0 border-t border-dashed border-[var(--border-divider)]/8"
                style={{ top: '50%' }} />
              <span className="absolute -top-[9px] left-0 w-10 text-right text-xs text-stone-400 dark:text-stone-500 font-mono tabular-nums select-none">
                {String(hour).padStart(2, '0')}
              </span>
            </div>
          )
        })}
      </div>

      {showNow && nowMin >= minHour * 60 && nowMin <= maxHour * 60 && (
        <div className="absolute left-0 right-0 z-10 pointer-events-none"
          style={{ top: ((nowMin - minHour * 60) * HOUR_HEIGHT / 60) + 18 + 'px' }}>
          <div className="flex items-center gap-1 ml-[44px]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
            <span className="h-px flex-1 bg-[var(--accent)]/25" />
          </div>
        </div>
      )}

      <div className="absolute left-[44px] right-0 top-[18px]" style={{ bottom: 0 }}>
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
              <div className="h-full rounded-lg border border-[var(--border-item)]/12 hover:border-[var(--border-item)]/30 hover:bg-[var(--bg-surface)]/15 transition-colors duration-150 overflow-hidden"
                style={{ borderLeft: `3px solid ${item.color}` }}>
                <div className="flex flex-col justify-center h-full px-3 gap-0" style={{ marginLeft: '6px' }}>
                  <span className="text-sm font-medium text-stone-700 dark:text-stone-200 leading-tight truncate">
                    {item.text || item.cardTitle || '无标题'}
                  </span>
                  <span className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                    <TimePicker compact value={item.start} onChange={v => onUpdateItem(item.cardId, item.id, 'start', v)} />
                    <span className="text-stone-400 dark:text-stone-500 text-[9px]">–</span>
                    <TimePicker compact value={item.end} onChange={v => onUpdateItem(item.cardId, item.id, 'end', v)} />
                    {item.cardTitle && (
                      <span className="text-[10px] text-stone-400 dark:text-stone-500 ml-1">· {item.cardTitle}</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TimelineView({ cards, onOpenItem, onUpdateItem, onTimelineAddItem }: {
  cards: Card[];
  onOpenItem: (cardId: string, itemId: string) => void;
  onUpdateItem: (cardId: string, itemId: string, field: keyof Item, value: unknown) => void;
  onTimelineAddItem: (date: string) => void;
}) {
  const today = new Date().toISOString().slice(0, 10)

  const timedItems = cards.flatMap((card, ci) =>
    card.items
      .filter(it => calcMinutes(it.start, it.end) > 0)
      .map(it => ({
        ...it,
        cardId: card.id,
        cardTitle: card.title,
        cardDate: card.date,
        color: CARD_COLORS[ci % CARD_COLORS.length],
        startMin: timeToMinutes(it.start),
        endMin: timeToMinutes(it.end),
      }))
  )

  const noTimeItems = cards.flatMap((card, ci) =>
    card.items.filter(it => calcMinutes(it.start, it.end) <= 0).map(it => ({
      ...it, cardId: card.id, cardTitle: card.title, cardDate: card.date, color: CARD_COLORS[ci % CARD_COLORS.length],
    }))
  )

  if (!cards.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-stone-400 dark:text-stone-500 gap-1.5">
        <Calendar size={28} strokeWidth={1} className="opacity-30" />
        <p className="text-sm">暂无事项</p>
        <p className="text-xs text-stone-300 dark:text-stone-600">在上方输入框添加新待办</p>
      </div>
    )
  }

  // Get all unique dates from cards (including null)
  const dateSet = new Set(cards.map(c => c.date || ''))
  const sortedDates = Array.from(dateSet).sort()

  // Group items by date
  const timedByDate: Record<string, typeof timedItems> = {}
  timedItems.forEach(it => {
    const key = it.cardDate || ''
    if (!timedByDate[key]) timedByDate[key] = []
    timedByDate[key].push(it)
  })
  const noTimeByDate: Record<string, typeof noTimeItems> = {}
  noTimeItems.forEach(it => {
    const key = it.cardDate || ''
    if (!noTimeByDate[key]) noTimeByDate[key] = []
    noTimeByDate[key].push(it)
  })

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto pr-2">
        <div className="bg-[var(--bg-surface)]/30 dark:bg-[var(--bg-card-start)]/40 rounded-xl border border-[var(--border-item)]/15 p-3 sm:p-4 space-y-5">
          {sortedDates.map(dateKey => {
            const hasTimed = timedByDate[dateKey]?.length > 0
            const hasNoTime = noTimeByDate[dateKey]?.length > 0
            if (!hasTimed && !hasNoTime) return null

            return (
              <div key={dateKey}>
                {/* 日期刻度线 — 横跨整个面板 */}
                <div className="flex items-center gap-2 -mx-3 sm:-mx-4 px-3 sm:px-4 mb-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--accent)] shrink-0" />
                  <span className="text-xs font-semibold text-stone-600 dark:text-stone-300 tracking-wide shrink-0">
                    {dateKey ? formatDateLabel(dateKey) : '未设定日期'}
                  </span>
                  <button onClick={() => onTimelineAddItem(dateKey)}
                    className="shrink-0 w-5 h-5 rounded-full border border-dashed border-stone-300 dark:border-stone-600 hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 text-stone-400 hover:text-[var(--accent)] flex items-center justify-center transition-all active:scale-[0.9]">
                    <Plus size={12} strokeWidth={2} />
                  </button>
                  <div className="flex-1 border-t-2 border-stone-300 dark:border-stone-600" />
                </div>

                {/* 任务边界框 */}
                {(hasTimed || hasNoTime) && (
                  <div className="border-2 border-stone-300 dark:border-stone-600 bg-white/40 dark:bg-stone-800/40 rounded-lg p-2">
                    {hasTimed && (() => {
                      const dateItems = timedByDate[dateKey]
                      const allStart = dateItems.map(i => i.startMin)
                      const allEnd = dateItems.map(i => i.endMin)
                      const minHour = Math.max(0, Math.floor((Math.min(...allStart) - 30) / 60))
                      const maxHour = Math.min(23, Math.ceil((Math.max(...allEnd) + 30) / 60))
                      return (
                        <TimeGrid
                          items={dateItems}
                          minHour={minHour}
                          maxHour={maxHour}
                          showNow={dateKey === today}
                          onOpenItem={onOpenItem}
                          onUpdateItem={onUpdateItem}
                        />
                      )
                    })()}

                    {hasNoTime && (
                      <div className={hasTimed ? 'mt-2 space-y-0.5' : 'space-y-0.5'}>
                        {noTimeByDate[dateKey].map(it => (
                          <button key={it.id} onClick={() => onOpenItem(it.cardId, it.id)}
                            className="w-full text-left flex items-center gap-2 pr-2.5 py-1.5 text-xs rounded-lg hover:bg-[var(--bg-surface)]/20 transition-colors active:scale-[0.98]"
                            style={{ borderLeft: `2px solid ${it.color}`, paddingLeft: '10px' }}>
                            <span className="truncate flex-1 text-stone-600 dark:text-stone-400">{it.text || it.cardTitle || '无标题'}</span>
                            {it.cardTitle && <span className="text-stone-400 dark:text-stone-500 shrink-0 text-[10px]">{it.cardTitle}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {!sortedDates.filter(d => {
            const k = d || ''
            return timedByDate[k]?.length > 0 || noTimeByDate[k]?.length > 0
          }).length && (
            <div className="flex flex-col items-center justify-center h-40 text-stone-400 dark:text-stone-500 gap-1.5">
              <Clock size={22} strokeWidth={1} className="opacity-30" />
              <p className="text-xs">当前日期范围内暂无事项</p>
              <p className="text-[10px] text-stone-300 dark:text-stone-600">点击日期旁的 + 添加事项</p>
            </div>
          )}
        </div>
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
  const [themePreset, setThemePreset] = useState(() => localStorage.getItem('themePreset') || 'terracotta')
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem('accentColor') || '#c2410c')
  const [showThemePicker, setShowThemePicker] = useState(false)
  const dragCardIdx = useRef<string | null>(null)
  const cardsRef = useRef(cards)
  cardsRef.current = cards

  const [draggingTask, setDraggingTask] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const importRef = useRef<HTMLInputElement>(null)

  const [projects, setProjects] = useState<Project[]>([])
  const [currentProjectId, setCurrentProjectId] = useState<string>('')
  const [projectTags, setProjectTags] = useState<ProjectTag[]>([])
  const [showTagManager, setShowTagManager] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#3e7ae0')
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
    applyTheme(themePreset, accentColor, dark)
  }, [dark, themePreset, accentColor])

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
    loadProjectTags(currentProjectId)
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

  const handleTimelineAddItem = (date: string) => {
    const existing = cards.find(c => c.date === date)
    if (existing) {
      handleAddItem(existing.id)
    } else {
      const cardId = genId()
      const itemId = genId()
      const item: Item = { id: itemId, text: '', description: '', start: '', end: '', done: false, priority: 'none', tags: [], subtasks: [], repeat: 'none' }
      setCards(prev => [...prev, { id: cardId, title: '', date, items: [item] }])
      try {
        invoke<Card>('create_card', { projectId: currentProjectId }).then(c => {
          invoke('update_card', { id: c.id, date })
          invoke('create_item', { cardId: c.id })
        })
      } catch {}
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
  }

  const loadProjectTags = async (projectId: string) => {
    try {
      const tags = await invoke<ProjectTag[]>('get_project_tags', { projectId })
      setProjectTags(tags)
    } catch {}
  }

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return
    try {
      const tag = await invoke<ProjectTag>('create_project_tag', { projectId: currentProjectId, name: newTagName.trim(), color: newTagColor })
      setProjectTags(prev => [...prev, tag])
      setNewTagName('')
      setNewTagColor('#3e7ae0')
    } catch {}
  }

  const handleDeleteTag = async (id: string) => {
    try {
      await invoke('delete_project_tag', { id })
      setProjectTags(prev => prev.filter(t => t.id !== id))
    } catch {}
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
    <div className="min-h-[100dvh] bg-gradient-to-b from-[var(--bg-page)] to-[var(--bg-page-to)] flex p-6 gap-4">
      {/* Sidebar */}
      <div className="w-60 shrink-0 bg-[var(--bg-surface)]/40 backdrop-blur-sm rounded-xl border border-[var(--border-item)]/40 p-3 flex flex-col overflow-y-auto">
        {/* App title */}
        <div className="flex items-center gap-2 px-2 py-3 mb-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[var(--accent-from)] to-[var(--accent)] flex items-center justify-center text-white text-xs font-bold">
            T
          </div>
          <span className="text-sm font-bold text-stone-700 dark:text-stone-300">Todo土豆</span>
        </div>

        {/* Project list */}
        <div className="space-y-0.5 mb-2">
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">项目</div>
          {projects.map(p => (
            <div key={p.id}
              className={'flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all group ' + (currentProjectId === p.id ? 'bg-[var(--accent)]/8 text-[var(--accent)]' : 'hover:bg-[var(--bg-surface)] text-stone-600 dark:text-stone-400')}>
              <button onClick={() => switchProject(p.id)}
                className="flex items-center gap-2 flex-1 min-w-0 text-left">
                <span className={'w-2 h-2 rounded-full shrink-0 ' + (currentProjectId === p.id ? 'scale-125 ring-2 ring-offset-1 ring-[var(--accent)]/20' : '')} style={{ backgroundColor: p.color }} />
                {renamingProject === p.id ? (
                  <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)}
                    onBlur={() => handleRenameProject(p.id)}
                    onKeyDown={e => { if (e.key === 'Enter') handleRenameProject(p.id); if (e.key === 'Escape') setRenamingProject(null) }}
                    className="flex-1 text-xs bg-transparent border-b border-[var(--accent)] outline-none px-0 py-0 min-w-[40px]"
                    onClick={e => e.stopPropagation()} />
                ) : (
                  <span className="truncate text-xs font-medium">{p.name}</span>
                )}
              </button>
              <button onClick={e => { e.stopPropagation(); setRenamingProject(p.id); setRenameValue(p.name) }}
                className="opacity-0 group-hover:opacity-100 hover:text-[var(--accent)] transition-all p-0.5 shrink-0">
                <Edit3 size={10} />
              </button>
              <button onClick={e => { e.stopPropagation(); handleDeleteProject(p.id) }}
                className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all p-0.5 shrink-0">
                <X size={10} />
              </button>
            </div>
          ))}
        </div>

        {/* Create project */}
        {showCreateForm ? (
          <div className="px-2 py-2 space-y-2 mb-2 bg-[var(--bg-surface)]/50 rounded-lg">
            <input autoFocus value={newProjectName} onChange={e => setNewProjectName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateProject(newProjectName, newProjectColor); if (e.key === 'Escape') { setShowCreateForm(false); setNewProjectName('') } }}
              placeholder="项目名称"
              className="w-full text-xs bg-[var(--bg-card-start)] border border-[var(--border-item)] rounded-lg px-2 py-1.5 outline-none focus:border-[var(--accent)] text-stone-700 dark:text-stone-300 placeholder-stone-400"
            />
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                {PROJECT_COLORS.slice(0, 5).map(c => (
                  <button key={c} onClick={() => setNewProjectColor(c)}
                    className={'w-3.5 h-3.5 rounded-full transition-all ' + (newProjectColor === c ? 'ring-2 ring-offset-1 ring-[var(--accent)]/40 scale-110' : 'hover:scale-110')}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleCreateProject(newProjectName, newProjectColor)}
                  className="px-2 py-1 text-[10px] font-semibold bg-[var(--accent)] text-white rounded-lg hover:brightness-110 transition-all">
                  创建
                </button>
                <button onClick={() => { setShowCreateForm(false); setNewProjectName('') }}
                  className="px-2 py-1 text-[10px] font-semibold bg-[var(--bg-surface)] text-stone-500 dark:text-stone-400 rounded-lg hover:bg-[var(--bg-surface-hover)] transition-all">
                  取消
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowCreateForm(true)}
            className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-stone-500 dark:text-stone-400 hover:text-[var(--accent)] hover:bg-[var(--bg-surface)] rounded-lg transition-all mb-2">
            <Plus size={12} /> 新建项目
          </button>
        )}

        {/* Tag manager toggle */}
        <button onClick={() => setShowTagManager(!showTagManager)}
          className={'w-full flex items-center gap-1.5 px-2 py-1.5 text-xs rounded-lg transition-all mb-1 ' + (showTagManager ? 'text-[var(--accent)] bg-[var(--accent)]/8' : 'text-stone-500 dark:text-stone-400 hover:text-[var(--accent)] hover:bg-[var(--bg-surface)]')}>
          <span className="w-3 h-3 rounded flex items-center justify-center text-[8px] font-bold border border-current/30 bg-current/5">#</span>
          管理标签
          <span className="ml-auto text-[9px] tabular-nums opacity-60">{projectTags.length}</span>
        </button>
        {showTagManager && (
          <div className="px-2 py-2 space-y-2 mb-2 bg-[var(--bg-surface)]/50 rounded-lg">
            {projectTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {projectTags.map(t => (
                  <span key={t.id} className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded text-white font-medium" style={{ backgroundColor: t.color }}>
                    {t.name}
                    <button onClick={() => handleDeleteTag(t.id)} className="text-white/50 hover:text-white transition-colors">
                      <X size={8} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <input value={newTagName} onChange={e => setNewTagName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreateTag() }}
                placeholder="新标签"
                className="flex-1 text-[10px] bg-[var(--bg-card-start)] border border-[var(--border-item)] rounded px-2 py-1 outline-none focus:border-[var(--accent)] text-stone-700 dark:text-stone-300 placeholder-stone-400" />
              <div className="flex gap-0.5">
                {['#e03e3e','#e07a3e','#e0b03e','#3eb07a','#3e7ae0','#6a3ee0','#e03e7a','#7a8e9a'].map(c => (
                  <button key={c} onClick={() => setNewTagColor(c)}
                    className={'w-3 h-3 rounded-full transition-all ' + (newTagColor === c ? 'ring-2 ring-offset-1 ring-[var(--accent)]/40 scale-110' : 'hover:scale-110')}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
              <button onClick={handleCreateTag}
                className="p-1 rounded text-stone-400 hover:text-[var(--accent)] transition-colors">
                <Plus size={12} />
              </button>
            </div>
          </div>
        )}

        <div className="h-px bg-[var(--border-divider)]/30 my-2" />

        {/* Navigation */}
        <div className="space-y-0.5">
          <button onClick={() => setViewMode(viewMode === 'grid' ? 'timeline' : 'grid')}
            className={'w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-lg transition-all ' + (viewMode === 'timeline' ? 'text-[var(--accent)] bg-[var(--accent)]/8' : 'text-stone-500 dark:text-stone-400 hover:text-[var(--accent)] hover:bg-[var(--bg-surface)]')}>
            {viewMode === 'grid' ? <CalendarDays size={13} /> : <LayoutGrid size={13} />}
            {viewMode === 'grid' ? '时间线视图' : '卡片视图'}
          </button>
          <button onClick={() => setShowStats(true)}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-lg transition-all text-stone-500 dark:text-stone-400 hover:text-[var(--accent)] hover:bg-[var(--bg-surface)]">
            <BarChart3 size={13} /> 统计看板
          </button>
          <button onClick={() => setShowPomodoro(true)}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-lg transition-all text-stone-500 dark:text-stone-400 hover:text-[var(--accent)] hover:bg-[var(--bg-surface)]">
            <Timer size={13} /> 番茄钟
          </button>
        </div>

        <div className="flex-1" />

        <div className="h-px bg-[var(--border-divider)]/30 my-2" />

        {/* Theme & settings */}
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <button onClick={() => setDark(!dark)}
              className="p-1.5 rounded-lg text-stone-400 dark:text-stone-500 hover:text-[var(--accent)] hover:bg-[var(--bg-surface)] transition-all"
              title={dark ? '浅色模式' : '深色模式'}>
              {dark ? <Sun size={13} /> : <Moon size={13} />}
            </button>
            <div className="relative">
              <button onClick={() => setShowThemePicker(!showThemePicker)}
                className="p-1.5 rounded-lg text-stone-400 dark:text-stone-500 hover:text-[var(--accent)] hover:bg-[var(--bg-surface)] transition-all"
                title="主题">
                <span className="block w-3 h-3 rounded-full border border-stone-300 dark:border-stone-600" style={{ backgroundColor: accentColor }} />
              </button>
              {showThemePicker && (
                <div className="absolute left-0 bottom-full mb-1 min-w-[220px] bg-white dark:bg-[var(--bg-card-start)] border border-[var(--border-item)] rounded-xl shadow-[0_8px_32px_rgb(var(--shadow-rgb)/var(--shadow-modal-opacity))] z-50 p-3 animate-fade-in"
                  onClick={e => e.stopPropagation()}>
                  <div className="text-[10px] font-semibold text-stone-500 dark:text-stone-400 mb-1.5">主题预设</div>
                  <div className="grid grid-cols-5 gap-1 mb-2">
                    {THEME_PRESETS.map(p => (
                      <button key={p.id} onClick={() => { setThemePreset(p.id); setAccentColor(p.accent); localStorage.setItem('themePreset', p.id); localStorage.setItem('accentColor', p.accent); setShowThemePicker(false) }}
                        className={'flex flex-col items-center gap-0.5 p-1 rounded transition-all ' + (themePreset === p.id ? 'bg-[var(--bg-surface)] ring-1 ring-[var(--accent)]/30' : 'hover:bg-[var(--bg-surface)]')}>
                        <div className="flex gap-px">
                          {[p.light['--bg-page'], p.light['--border-card'], p.accent].map((c, i) => (
                            <span key={i} className={'w-2.5 h-2.5 ' + (i === 2 ? 'rounded-full' : 'rounded-sm')} style={{ backgroundColor: c }} />
                          ))}
                        </div>
                        <span className="text-[8px] text-stone-500 dark:text-stone-400 leading-none">{p.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="text-[10px] font-semibold text-stone-500 dark:text-stone-400 mb-1">强调色</div>
                  <div className="flex flex-wrap gap-1">
                    {['#c2410c','#2563eb','#059669','#7c3aed','#e03e7a','#d97706','#0d9488','#78716c'].map(c => (
                      <button key={c} onClick={() => setAccentColor(c)}
                        className={'w-4 h-4 rounded transition-all ' + (accentColor === c ? 'ring-2 ring-offset-1 ring-stone-400 dark:ring-offset-stone-800 scale-110' : 'hover:scale-110')}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button onClick={async () => {
              try { const json = await invoke<string>('export_data'); const blob = new Blob([json], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `todopotato-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url) } catch {}
            }} className="p-1.5 rounded-lg text-stone-400 dark:text-stone-500 hover:text-[var(--accent)] hover:bg-[var(--bg-surface)] transition-all"
              title="导出数据">
              <Download size={13} />
            </button>
            <button onClick={() => importRef.current?.click()}
              className="p-1.5 rounded-lg text-stone-400 dark:text-stone-500 hover:text-[var(--accent)] hover:bg-[var(--bg-surface)] transition-all"
              title="导入数据">
              <Upload size={13} />
            </button>
            <input ref={importRef} type="file" hidden accept=".json"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                if (!window.confirm('导入将覆盖所有现有数据，确定继续？')) return
                try { const text = await file.text(); await invoke('import_data', { json: text }); loadProjects() } catch (err) { alert('导入失败：' + err) }
                e.target.value = ''
              }} />
          </div>
          <div className="px-2 py-1 text-[10px] text-stone-400 dark:text-stone-500 tabular-nums">
            {searchQuery ? `${filteredCards.length} 个结果` : `${cards.length} 个便签`}
          </div>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Search bar */}
        <div className="shrink-0 flex items-center gap-2 mb-5 bg-[var(--bg-surface)]/40 backdrop-blur-sm rounded-xl px-3 py-2 border border-[var(--border-item)]/40 relative z-10">
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
        </div>

        <TodayBriefing cards={cards} onReschedule={(cardId, itemId, start, end) => {
          const card = cards.find(c => c.id === cardId)
          const item = card?.items.find(i => i.id === itemId)
          if (!card || !item) return
          const updated = { ...item, start, end }
          setCards(prev => prev.map(c => c.id === cardId ? {
            ...c, items: c.items.map(i => i.id === itemId ? updated : i)
          } : c))
          invoke('update_item', { id: itemId, start, end }).catch(console.error)
        }} />

        {/* Content */}
        <div className="flex-1 flex items-start gap-4 overflow-x-auto">
          {viewMode === 'grid' ? (
            <>
            {filteredCards.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center h-full min-h-[300px] text-stone-400 dark:text-stone-500 gap-2">
                {searchQuery ? (
                  <>
                    <Search size={32} strokeWidth={1} className="opacity-20" />
                    <p className="text-sm font-medium">没有找到匹配的便签</p>
                    <button onClick={() => { setSearchQuery(''); setSearchResults([]) }}
                      className="text-xs text-[var(--accent)] hover:underline transition-colors">清除搜索</button>
                  </>
                ) : (
                  <>
                    <LayoutGrid size={32} strokeWidth={1} className="opacity-20" />
                    <p className="text-sm font-medium">还没有便签</p>
                    <p className="text-xs text-stone-300 dark:text-stone-600">点击下方按钮创建你的第一张便签</p>
                  </>
                )}
              </div>
            ) : (
            filteredCards.map(card => (
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
            ))
            )}
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
              <TimelineView cards={filteredCards} onOpenItem={handleOpenItem} onUpdateItem={handleUpdateItem} onTimelineAddItem={handleTimelineAddItem} />
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {openItem && (() => {
        const card = cards.find(c => c.id === openItem.cardId)
        const item = card?.items.find(i => i.id === openItem.itemId)
        if (!card || !item) return null
        return <TaskDetailModal card={card} item={item} projectTags={projectTags} onClose={() => setOpenItem(null)}
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
  const [workDuration, setWorkDuration] = useState(() => { const v = localStorage.getItem('pomodoroWork'); return v ? parseInt(v) : 25 })
  const [breakDuration, setBreakDuration] = useState(() => { const v = localStorage.getItem('pomodoroBreak'); return v ? parseInt(v) : 5 })
  const [editingWork, setEditingWork] = useState(false)
  const [editingBreak, setEditingBreak] = useState(false)
  const [mode, setMode] = useState<'work' | 'break'>('work')
  const [minutes, setMinutes] = useState(workDuration)
  const [seconds, setSeconds] = useState(0)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [pomodoroStats, setPomodoroStats] = useState<PomodoroStats | null>(null)
  const modeRef = useRef(mode)
  modeRef.current = mode

  useEffect(() => { loadStats() }, [])
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h) }, [onClose])
  useEffect(() => { return () => { if (intervalRef.current) clearInterval(intervalRef.current) } }, [])
  useEffect(() => { setMinutes(mode === 'work' ? workDuration : breakDuration); setSeconds(0) }, [workDuration, breakDuration])

  const saveWork = (v: number) => { const d = Math.max(1, Math.min(120, v)); setWorkDuration(d); localStorage.setItem('pomodoroWork', String(d)); setEditingWork(false) }
  const saveBreak = (v: number) => { const d = Math.max(1, Math.min(60, v)); setBreakDuration(d); localStorage.setItem('pomodoroBreak', String(d)); setEditingBreak(false) }

  const loadStats = async () => {
    try { const s = await invoke<PomodoroStats>('get_pomodoro_stats'); setPomodoroStats(s) } catch {}
  }

  const start = () => {
    setRunning(true)
    intervalRef.current = setInterval(() => {
      setSeconds(prev => {
        if (prev > 0) return prev - 1
        setMinutes(m => {
          if (m > 0) return m - 1
          setRunning(false)
          const currentMode = modeRef.current
          const nextMode = currentMode === 'work' ? 'break' : 'work'
          setMode(nextMode)
          if (currentMode === 'work') {
            invoke('log_pomodoro', { item_id: '', duration_minutes: workDuration }).catch(() => {})
            loadStats()
          }
          return nextMode === 'work' ? workDuration : breakDuration
        })
        return 59
      })
    }, 1000)
  }

  const pause = () => { setRunning(false); if (intervalRef.current) clearInterval(intervalRef.current) }

  const switchMode = (newMode: 'work' | 'break') => {
    pause(); setMode(newMode); setMinutes(newMode === 'work' ? workDuration : breakDuration); setSeconds(0)
  }

  const reset = () => switchMode('work')

  const totalSeconds = minutes * 60 + seconds
  const total = (mode === 'work' ? workDuration : breakDuration) * 60
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

        {/* Duration settings */}
        <div className="flex items-center gap-3 bg-[var(--bg-surface)] rounded-lg p-2 mb-5">
          <div className="flex-1 flex items-center gap-1.5">
            <span className="text-[10px] text-stone-500 dark:text-stone-400 font-medium">专注</span>
            {editingWork ? (
              <input autoFocus type="number" min={1} max={120} defaultValue={workDuration}
                onBlur={e => saveWork(parseInt(e.target.value) || workDuration)}
                onKeyDown={e => { if (e.key === 'Enter') saveWork(parseInt((e.target as HTMLInputElement).value) || workDuration); if (e.key === 'Escape') setEditingWork(false) }}
                className="w-12 text-xs text-center bg-white dark:bg-stone-700 border border-[var(--border-item)] rounded-md px-1 py-1 outline-none focus:border-[var(--accent)] text-stone-700 dark:text-stone-300 tabular-nums" />
            ) : (
              <button onClick={() => { if (!running) setEditingWork(true) }}
                className={'text-sm font-bold tabular-nums px-2 py-0.5 rounded-md transition-all ' + (mode === 'work' ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700')}>
                {workDuration}<span className="text-[10px] font-normal ml-0.5">分</span>
              </button>
            )}
          </div>
          <div className="flex-1 flex items-center gap-1.5">
            <span className="text-[10px] text-stone-500 dark:text-stone-400 font-medium">休息</span>
            {editingBreak ? (
              <input autoFocus type="number" min={1} max={60} defaultValue={breakDuration}
                onBlur={e => saveBreak(parseInt(e.target.value) || breakDuration)}
                onKeyDown={e => { if (e.key === 'Enter') saveBreak(parseInt((e.target as HTMLInputElement).value) || breakDuration); if (e.key === 'Escape') setEditingBreak(false) }}
                className="w-12 text-xs text-center bg-white dark:bg-stone-700 border border-[var(--border-item)] rounded-md px-1 py-1 outline-none focus:border-[var(--accent)] text-stone-700 dark:text-stone-300 tabular-nums" />
            ) : (
              <button onClick={() => { if (!running) setEditingBreak(true) }}
                className={'text-sm font-bold tabular-nums px-2 py-0.5 rounded-md transition-all ' + (mode === 'break' ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700')}>
                {breakDuration}<span className="text-[10px] font-normal ml-0.5">分</span>
              </button>
            )}
          </div>
          {/* Mode toggle */}
          <div className="flex bg-[var(--bg-card-start)] rounded-md p-0.5">
            <button onClick={() => switchMode('work')}
              className={'text-[10px] font-semibold px-2.5 py-1 rounded transition-all ' + (mode === 'work' ? 'bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-200 shadow-sm' : 'text-stone-400 dark:text-stone-500 hover:text-stone-600')}>
              专注
            </button>
            <button onClick={() => switchMode('break')}
              className={'text-[10px] font-semibold px-2.5 py-1 rounded transition-all ' + (mode === 'break' ? 'bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-200 shadow-sm' : 'text-stone-400 dark:text-stone-500 hover:text-stone-600')}>
              休息
            </button>
          </div>
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
