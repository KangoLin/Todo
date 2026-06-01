import { useState, useRef } from 'react'
import { Plus, Clock } from 'lucide-react'

interface Item {
  text: string
  start: string
  end: string
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

function TimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div className="relative">
      <button onClick={() => ref.current?.showPicker()}
        className="text-xs font-mono text-gray-500 hover:text-[#6366f1] transition-colors bg-transparent border-0 cursor-pointer px-0 py-0">
        {value || '--:--'}
      </button>
      <input ref={ref} type="time" value={value} onChange={e => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 w-full cursor-pointer" />
    </div>
  )
}

export default function App() {
  const [title, setTitle] = useState('')
  const [items, setItems] = useState<Item[]>([{ text: '', start: '', end: '' }])
  const bottomRef = useRef<HTMLDivElement>(null)

  const addItem = () => {
    setItems([...items, { text: '', start: '', end: '' }])
    setTimeout(() => bottomRef.current?.scrollIntoView({ block: 'nearest' }), 0)
  }
  const updateItem = (i: number, field: keyof Item, value: string) => {
    const next = [...items]
    next[i] = { ...next[i], [field]: value }
    setItems(next)
  }

  const totalMin = items.reduce((s, it) => s + calcMinutes(it.start, it.end), 0)

  return (
    <div className="h-screen bg-[#1a1a2e] flex items-start p-6">
      <div className="w-[240px] h-full bg-white flex flex-col overflow-hidden" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
        <div className="h-1.5 shrink-0 bg-[#6366f1]" />
        <div className="flex-1 p-4 flex flex-col gap-3 min-h-0">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="标题"
            className="w-full text-base font-bold bg-transparent border-none outline-none px-0 shrink-0"
          />
          <div className="border-t border-gray-100 shrink-0" />
          <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
            {items.map((item, i) => (
              <div key={i} className="border border-gray-200 bg-gray-50 hover:border-[#6366f1]/30 transition-colors overflow-hidden">
                <div className="flex items-center gap-1.5 px-2.5 py-1 border-b border-gray-200/60">
                  <Clock size={11} className="text-gray-300 shrink-0" />
                  <TimePicker value={item.start} onChange={v => updateItem(i, 'start', v)} />
                  <span className="text-gray-300">—</span>
                  <TimePicker value={item.end} onChange={v => updateItem(i, 'end', v)} />
                  {calcMinutes(item.start, item.end) > 0 && (
                    <span className="text-xs text-gray-400 ml-auto">{formatDuration(calcMinutes(item.start, item.end))}</span>
                  )}
                </div>
                <input
                  value={item.text}
                  onChange={e => updateItem(i, 'text', e.target.value)}
                  placeholder="新增事项..."
                  className="w-full px-2.5 py-2 text-sm bg-transparent border-none outline-none"
                />
              </div>
            ))}
            <button onClick={addItem}
              className="flex items-center justify-center gap-1 w-full py-2 text-xs text-gray-400 hover:text-[#6366f1] hover:bg-gray-50 transition-colors border border-dashed border-gray-200">
              <Plus size={14} /> 添加
            </button>
            <div ref={bottomRef} />
          </div>
          <div className="text-xs text-gray-400 shrink-0 pt-2 border-t border-gray-100 space-y-0.5">
            <div>{title || '无标题'} · {items.length} 项</div>
            {totalMin > 0 && <div className="font-medium text-[#6366f1]">总计 {formatDuration(totalMin)}</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
