import { Sprout, CalendarDays, Settings } from 'lucide-react'
export type TabId = 'base' | 'today' | 'settings'

const TABS: { id: TabId; label: string; icon: typeof Sprout }[] = [
  { id: 'base', label: '土豆基地', icon: Sprout },
  { id: 'today', label: '今日', icon: CalendarDays },
  { id: 'settings', label: '设置', icon: Settings },
]

export function BottomTabBar({ tab, onChange }: { tab: TabId; onChange: (t: TabId) => void }) {
  return (
    <nav className="shrink-0 border-t border-[var(--border-divider)]/40 bg-[var(--bg-surface)]/80 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-7xl px-4 py-1.5 flex items-stretch gap-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => onChange(t.id)}
            className={'flex flex-1 flex-col items-center gap-0.5 py-2 rounded-xl text-[11px] transition-all active:scale-[0.97] ' +
              (tab === t.id ? 'text-[var(--accent)] bg-[var(--accent)]/8 font-semibold' : 'text-stone-400 dark:text-stone-500 hover:text-[var(--accent)] hover:bg-[var(--bg-surface-hover)]')}>
            <t.icon size={18} strokeWidth={1.75} />
            {t.label}
          </button>
        ))}
      </div>
    </nav>
  )
}
