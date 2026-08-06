import type { Item } from '../lib/types'
import { TimePicker } from './TimePicker'

export function TimeGrid({ items, minHour, maxHour, showNow, onOpenItem, onUpdateItem }: {
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