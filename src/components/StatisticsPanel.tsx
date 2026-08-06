import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { BarChart3, X } from 'lucide-react'
import { formatDuration } from '../lib/utils'

export function StatisticsPanel({ onClose }: { onClose: () => void }) {
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

export interface Statistics {
  total_items: number
  completed_items: number
  completion_rate: number
  total_minutes: number
  items_by_date: { date: string; count: number }[]
  priority_distribution: { label: string; count: number }[]
  daily_stats: { date: string; total: number; completed: number; minutes: number }[]
}
