import { useRef } from 'react'

export function TimePicker({ value, onChange, compact }: { value: string; onChange: (v: string) => void; compact?: boolean }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div className="relative cursor-pointer" onClick={() => ref.current?.showPicker()}>
      <span className={'block font-mono text-stone-600 dark:text-stone-400 hover:text-[var(--accent)] hover:bg-stone-200/80 dark:hover:bg-stone-700/50 active:scale-[0.95] transition-all bg-stone-100/60 dark:bg-stone-800/60 rounded font-medium text-center ' + (compact ? 'text-[9px] px-0.5 py-px min-w-[28px]' : 'text-xs px-3 py-1.5 min-w-[52px]')}>
        {value || '--:--'}
      </span>
      <input ref={ref} type="time" value={value} onChange={e => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 w-full cursor-pointer" />
    </div>
  )
}