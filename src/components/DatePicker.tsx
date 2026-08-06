import { useRef } from 'react'
import { X } from 'lucide-react'

export function DatePicker({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
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