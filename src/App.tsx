import { invoke } from '@tauri-apps/api/core'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Clock, X, Trash2, GripVertical, ChevronUp, ChevronDown, Calendar } from 'lucide-react'

interface Item {
  id: string
  text: string
  start: string
  end: string
  done: boolean
}

interface Card {
  id: string
  title: string
  collapsed: boolean
  date: string | null
  items: Item[]
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

function DatePicker({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div className="relative inline-flex items-center gap-1">
      <button onClick={() => ref.current?.showPicker()}
        className="text-xs text-gray-400 hover:text-[#6366f1] transition-colors bg-transparent border-0 cursor-pointer px-0 py-0">
        {value || '设置日期'}
      </button>
      {value && (
        <button onClick={() => onChange(null)} className="text-gray-300 hover:text-red-500 transition-colors">
          <X size={10} />
        </button>
      )}
      <input ref={ref} type="date" value={value || ''} onChange={e => onChange(e.target.value || null)}
        className="absolute inset-0 opacity-0 w-full cursor-pointer pointer-events-none" />
    </div>
  )
}

interface NoteCardProps {
  card: Card
  onSetTitle: (id: string, title: string) => void
  onSetDate: (id: string, date: string | null) => void
  onToggleCollapse: (id: string) => void
  onDeleteCard: (id: string) => void
  onAddItem: (cardId: string) => void
  onUpdateItem: (cardId: string, itemId: string, field: keyof Item, value: string | boolean) => void
  onDeleteItem: (cardId: string, itemId: string) => void
  onSetItems: (cardId: string, items: Item[]) => void
  onPersistItemOrder: (cardId: string) => void
  onCardDragStart: (id: string) => void
  onCardDragOver: (e: React.DragEvent, id: string) => void
  onCardDragEnd: () => void
}

function NoteCard({
  card,
  onSetTitle,
  onSetDate,
  onToggleCollapse,
  onDeleteCard,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onSetItems,
  onPersistItemOrder,
  onCardDragStart,
  onCardDragOver,
  onCardDragEnd,
}: NoteCardProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const dragIdx = useRef<number | null>(null)
  const draggingTask = useRef(false)

  const handleTaskDragStart = useCallback((i: number) => {
    draggingTask.current = true
    dragIdx.current = i
  }, [])

  const handleTaskDragOver = useCallback((e: React.DragEvent, i: number) => {
    e.preventDefault()
    if (dragIdx.current === null || dragIdx.current === i) return
    const items = [...card.items]
    const [moved] = items.splice(dragIdx.current, 1)
    items.splice(i, 0, moved)
    dragIdx.current = i
    onSetItems(card.id, items)
  }, [card, onSetItems])

  const handleTaskDragEnd = useCallback(() => {
    draggingTask.current = false
    dragIdx.current = null
    onPersistItemOrder(card.id)
  }, [card.id, onPersistItemOrder])

  const totalMin = card.items.reduce((s, it) => s + calcMinutes(it.start, it.end), 0)
  const doneCount = card.items.filter(i => i.done).length

  return (
    <div draggable
      onDragStart={() => onCardDragStart(card.id)}
      onDragOver={(e) => { if (!draggingTask.current) onCardDragOver(e, card.id) }}
      onDragEnd={onCardDragEnd}
      className={'w-[240px] bg-white flex flex-col overflow-hidden shrink-0 cursor-default transition-all duration-300 ' + (card.collapsed ? 'h-auto' : 'h-full')}
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
      <div className="h-5 shrink-0 bg-[#6366f1] flex items-center gap-1 px-2">
        <GripVertical size={11} className="text-white/40 cursor-grab active:cursor-grabbing" />
        <div className="flex-1" />
        <button onClick={() => onDeleteCard(card.id)} className="text-white/50 hover:text-white transition-colors" title="删除便签">
          <Trash2 size={11} />
        </button>
      </div>
      <button onClick={() => onToggleCollapse(card.id)}
        className="shrink-0 h-4 flex items-center justify-center gap-1 bg-gray-100 hover:bg-gray-200 transition-colors text-gray-400 hover:text-gray-600 border-b border-gray-200">
        {card.collapsed ? <ChevronDown size={10} /> : <ChevronUp size={10} />}
        <span className="text-[9px]">{card.collapsed ? '展开' : '收起'}</span>
      </button>
      {card.collapsed ? (
        <div className="px-4 py-2 text-xs text-gray-400 space-y-0.5">
          <div>{card.title || '无标题'} · {doneCount}/{card.items.length} · {totalMin > 0 ? formatDuration(totalMin) : ''}</div>
          {card.date && <div className="text-[#6366f1]">{card.date}</div>}
        </div>
      ) : (
        <div className="flex-1 p-4 flex flex-col gap-3 min-h-0 overflow-hidden">
          <input
            value={card.title}
            onChange={e => onSetTitle(card.id, e.target.value)}
            placeholder="标题"
            className="w-full text-base font-bold bg-transparent border-none outline-none px-0 shrink-0"
          />
          <div className="flex items-center gap-1 -mt-1">
            <Calendar size={11} className="text-gray-300 shrink-0" />
            <DatePicker value={card.date} onChange={v => onSetDate(card.id, v)} />
          </div>
          <div className="border-t border-gray-100 shrink-0" />
          <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
            {card.items.map((item, i) => (
              <div key={item.id} draggable
                onDragStart={() => handleTaskDragStart(i)}
                onDragOver={(e) => handleTaskDragOver(e, i)}
                onDragEnd={handleTaskDragEnd}
                className={'border transition-colors overflow-hidden ' + (item.done ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50 hover:border-[#6366f1]/30')}>
                <div className="flex items-center gap-1 px-2.5 py-1 border-b border-inherit/60">
                  <span className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0">
                    <GripVertical size={12} />
                  </span>
                  <button onClick={() => onUpdateItem(card.id, item.id, 'done', !item.done)}
                    className={'w-4 h-4 border shrink-0 flex items-center justify-center transition-colors ' + (item.done ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-[#6366f1]')}>
                    {item.done && <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="3"><path d="M2 6l3 3 5-5" /></svg>}
                  </button>
                  <Clock size={11} className="text-gray-300 shrink-0" />
                  <TimePicker value={item.start} onChange={v => onUpdateItem(card.id, item.id, 'start', v)} />
                  <span className="text-gray-300">—</span>
                  <TimePicker value={item.end} onChange={v => onUpdateItem(card.id, item.id, 'end', v)} />
                  {calcMinutes(item.start, item.end) > 0 && (
                    <span className="text-xs text-gray-400 ml-auto">{formatDuration(calcMinutes(item.start, item.end))}</span>
                  )}
                  <button onClick={() => onDeleteItem(card.id, item.id)} className="text-gray-300 hover:text-red-500 transition-colors shrink-0 ml-0.5"><X size={13} /></button>
                </div>
                <input
                  value={item.text}
                  onChange={e => onUpdateItem(card.id, item.id, 'text', e.target.value)}
                  placeholder="新增事项..."
                  className={'w-full px-2.5 py-2 text-sm bg-transparent border-none outline-none ' + (item.done ? 'line-through text-gray-400' : '')}
                />
              </div>
            ))}
            <button onClick={() => onAddItem(card.id)}
              className="flex items-center justify-center gap-1 w-full py-2 text-xs text-gray-400 hover:text-[#6366f1] hover:bg-gray-50 transition-colors border border-dashed border-gray-200">
              <Plus size={14} /> 添加
            </button>
            <div ref={bottomRef} />
          </div>
          <div className="text-xs text-gray-400 shrink-0 pt-2 border-t border-gray-100 space-y-0.5">
            <div>{card.title || '无标题'} · {doneCount}/{card.items.length} 项完成</div>
            {totalMin > 0 && <div className="font-medium text-[#6366f1]">总计 {formatDuration(totalMin)}</div>}
          </div>
        </div>
      )}
    </div>
  )
}

function genId(): string {
  return crypto.randomUUID()
}

export default function App() {
  const [cards, setCards] = useState<Card[]>([])
  const dragCardIdx = useRef<string | null>(null)
  const cardsRef = useRef(cards)
  cardsRef.current = cards

  useEffect(() => {
    loadCards()
  }, [])

  const loadCards = async () => {
    try {
      let data = await invoke<Card[]>('get_cards')
      if (data.length === 0) {
        data = [await invoke<Card>('create_card')]
      }
      setCards(data)
    } catch {
      const id = genId()
      const itemId = genId()
      setCards([{ id, title: '', collapsed: false, date: null, items: [{ id: itemId, text: '', start: '', end: '', done: false }] }])
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

  const handleToggleCollapse = async (id: string) => {
    let collapsed = false
    setCards(prev => prev.map(c => {
      if (c.id === id) { collapsed = !c.collapsed; return { ...c, collapsed } }
      return c
    }))
    try { await invoke('update_card', { id, collapsed }) } catch {}
  }

  const handleAddCard = async () => {
    try {
      const card = await invoke<Card>('create_card')
      setCards(prev => [...prev, card])
    } catch {
      const id = genId()
      const itemId = genId()
      setCards(prev => [...prev, { id, title: '', collapsed: false, date: null, items: [{ id: itemId, text: '', start: '', end: '', done: false }] }])
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
      const item: Item = { id: genId(), text: '', start: '', end: '', done: false }
      setCards(prev => prev.map(c => c.id === cardId ? { ...c, items: [...c.items, item] } : c))
    }
  }

  const handleUpdateItem = async (cardId: string, itemId: string, field: keyof Item, value: string | boolean) => {
    setCards(prev => prev.map(c => c.id === cardId ? {
      ...c,
      items: c.items.map(it => it.id === itemId ? { ...it, [field]: value } : it)
    } : c))
    const payload: Record<string, unknown> = { id: itemId }
    payload[field] = value
    try { await invoke('update_item', payload) } catch {}
  }

  const handleDeleteItem = async (cardId: string, itemId: string) => {
    setCards(prev => prev.map(c => c.id === cardId ? {
      ...c,
      items: c.items.filter(it => it.id !== itemId)
    } : c))
    try { await invoke('delete_item', { id: itemId }) } catch {}
  }

  const handleSetItems = (cardId: string, items: Item[]) => {
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, items } : c))
  }

  const handlePersistItemOrder = async (cardId: string) => {
    const card = cardsRef.current.find(c => c.id === cardId)
    if (!card) return
    try {
      await invoke('reorder_items', { ids: card.items.map(i => i.id) })
    } catch {}
  }

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

  return (
    <div className="h-screen bg-[#1a1a2e] flex items-start p-6 gap-4 overflow-x-auto">
      {cards.map(card => (
        <NoteCard
          key={card.id}
          card={card}
          onSetTitle={handleSetTitle}
          onSetDate={handleSetDate}
          onToggleCollapse={handleToggleCollapse}
          onDeleteCard={handleDeleteCard}
          onAddItem={handleAddItem}
          onUpdateItem={handleUpdateItem}
          onDeleteItem={handleDeleteItem}
          onSetItems={handleSetItems}
          onPersistItemOrder={handlePersistItemOrder}
          onCardDragStart={handleCardDragStart}
          onCardDragOver={handleCardDragOver}
          onCardDragEnd={handleCardDragEnd}
        />
      ))}
      <button onClick={handleAddCard}
        className="w-[240px] h-12 shrink-0 flex items-center justify-center border-2 border-dashed border-white/20 text-white/40 hover:text-white/70 hover:border-white/40 transition-colors text-xs">
        <Plus size={16} /> 添加便签
      </button>
    </div>
  )
}
