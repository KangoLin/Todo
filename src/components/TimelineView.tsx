import { useRef } from 'react'
import { Calendar, Clock, Plus } from 'lucide-react'

import type { Card, Item } from '../lib/types'
import { CARD_COLORS } from '../lib/constants'
import { calcMinutes, timeToMinutes, formatDateLabel } from '../lib/utils'
import { TimeGrid } from './TimeGrid'

export function TimelineView({ cards, onOpenItem, onUpdateItem, onTimelineAddItem, isTouch, onOpenMoveMenu }: {
  cards: Card[];
  onOpenItem: (cardId: string, itemId: string) => void;
  onUpdateItem: (cardId: string, itemId: string, field: keyof Item, value: unknown) => void;
  onTimelineAddItem: (date: string) => void;
  isTouch: boolean;
  onOpenMoveMenu: (cardId: string, itemId: string, x: number, y: number) => void;
}) {
  const today = new Date().toISOString().slice(0, 10)

  // 触屏长按检测（同 NoteCard）：按住 0.5s 且位移 < 10px 视为长按，松手打开移动菜单
  const touchRef = useRef<{ x: number; y: number; timer: ReturnType<typeof setTimeout> | null; fired: boolean } | null>(null)
  const suppressClickRef = useRef(false)

  const clearTouch = () => {
    const st = touchRef.current
    if (!st) return
    if (st.timer) clearTimeout(st.timer)
    touchRef.current = null
  }

  const startTouch = (e: React.TouchEvent) => {
    if (!isTouch) return
    suppressClickRef.current = false
    const t = e.touches[0]
    const st = { x: t.clientX, y: t.clientY, timer: null as ReturnType<typeof setTimeout> | null, fired: false }
    touchRef.current = st
    st.timer = setTimeout(() => { st.fired = true }, 500)
  }

  const moveTouch = (e: React.TouchEvent) => {
    const st = touchRef.current
    if (!st) return
    const t = e.touches[0]
    if (Math.hypot(t.clientX - st.x, t.clientY - st.y) > 10) clearTouch()
  }

  const endTouch = (e: React.TouchEvent, cardId: string, itemId: string) => {
    const st = touchRef.current
    clearTouch()
    if (!st || !st.fired) return
    const t = e.changedTouches[0]
    suppressClickRef.current = true
    onOpenMoveMenu(cardId, itemId, t.clientX, t.clientY)
  }

  const handleClick = (cardId: string, itemId: string) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    onOpenItem(cardId, itemId)
  }

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
                          <button key={it.id}
                            onTouchStart={(e) => startTouch(e)}
                            onTouchMove={moveTouch}
                            onTouchEnd={(e) => endTouch(e, it.cardId, it.id)}
                            onTouchCancel={clearTouch}
                            onClick={() => handleClick(it.cardId, it.id)}
                            className="w-full text-left flex items-center gap-2 pr-2.5 py-1.5 text-xs rounded-lg touch-manipulation hover:bg-[var(--bg-surface)]/20 transition-colors active:scale-[0.98]"
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
