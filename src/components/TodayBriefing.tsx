import { Calendar, Clock } from 'lucide-react'
import type { Card } from '../lib/types'
import { formatDateLabel } from '../lib/utils'

export function TodayBriefing({ cards, onReschedule }: { cards: Card[]; onReschedule: (cardId: string, itemId: string, start: string, end: string) => void }) {
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