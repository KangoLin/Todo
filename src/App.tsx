import { invoke } from '@tauri-apps/api/core'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Clock, X, Trash2, GripVertical, Calendar, Search, Check } from 'lucide-react'

interface Item {
  id: string
  text: string
  description: string
  start: string
  end: string
  done: boolean
}

interface Card {
  id: string
  title: string
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

function genId(): string {
  return crypto.randomUUID()
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
  onDeleteCard: (id: string) => void
  onAddItem: (cardId: string) => void
  onUpdateItem: (cardId: string, itemId: string, field: keyof Item, value: string | boolean) => void
  onDeleteItem: (cardId: string, itemId: string) => void
  onDragItemStart: (cardId: string, idx: number) => void
  onDragItemOver: (cardId: string, idx: number) => void
  onDropItem: (cardId: string, idx: number) => void
  onDragItemEnd: () => void
  onOpenItem: (cardId: string, itemId: string) => void
  onCardDragStart: (id: string) => void
  onCardDragOver: (e: React.DragEvent, id: string) => void
  onCardDragEnd: () => void
  draggingTask: boolean
}

function NoteCard({
  card,
  onSetTitle,
  onSetDate,
  onDeleteCard,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onDragItemStart,
  onDragItemOver,
  onDropItem,
  onDragItemEnd,
  onOpenItem,
  onCardDragStart,
  onCardDragOver,
  onCardDragEnd,
  draggingTask,
}: NoteCardProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  const totalMin = card.items.reduce((s, it) => s + calcMinutes(it.start, it.end), 0)
  const doneCount = card.items.filter(i => i.done).length

  return (
    <div draggable
      onDragStart={() => onCardDragStart(card.id)}
      onDragOver={(e) => {
        if (draggingTask) {
          e.preventDefault()
        } else {
          onCardDragOver(e, card.id)
        }
      }}
      onDragEnd={onCardDragEnd}
      className="bg-white flex flex-col overflow-hidden shrink-0 cursor-default w-[240px] h-full"
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
      <div className="h-5 shrink-0 bg-[#6366f1] flex items-center gap-1 px-2">
        <GripVertical size={11} className="text-white/40 cursor-grab active:cursor-grabbing" />
        <div className="flex-1" />
        <button onClick={() => onDeleteCard(card.id)} className="text-white/50 hover:text-white transition-colors" title="删除便签">
          <Trash2 size={11} />
        </button>
      </div>
      <div className="p-4 flex flex-col gap-3 overflow-y-auto">
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
        <div className="space-y-2"
          onDragOver={(e) => {
            if (draggingTask) {
              e.preventDefault()
              onDragItemOver(card.id, card.items.length)
            }
          }}
          onDrop={(e) => { e.preventDefault(); onDropItem(card.id, card.items.length) }}>
          {card.items.map((item, i) => (
            <div key={item.id} draggable
              onDragStart={() => onDragItemStart(card.id, i)}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); onDragItemOver(card.id, i) }}
              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); onDropItem(card.id, i) }}
              onDragEnd={onDragItemEnd}
              onClick={() => onOpenItem(card.id, item.id)}
              className={'border transition-colors overflow-hidden cursor-pointer ' + 
                (item.done 
                  ? 'border-green-300 bg-green-50' 
                  : 'border-gray-200 bg-gray-50')}>
              <div className="flex items-center gap-1 px-2.5 py-1 border-b border-inherit/60">
                <span onClick={e => e.stopPropagation()} className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0">
                  <GripVertical size={12} />
                </span>
                <button onClick={e => { e.stopPropagation(); onUpdateItem(card.id, item.id, 'done', !item.done) }}
                  className={'w-4 h-4 border shrink-0 flex items-center justify-center transition-colors ' + (item.done ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-[#6366f1]')}>
                  {item.done && <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="3"><path d="M2 6l3 3 5-5" /></svg>}
                </button>
                <Clock size={11} className="text-gray-300 shrink-0" />
                <div onClick={e => e.stopPropagation()}>
                  <TimePicker value={item.start} onChange={v => onUpdateItem(card.id, item.id, 'start', v)} />
                </div>
                <span className="text-gray-300">—</span>
                <div onClick={e => e.stopPropagation()}>
                  <TimePicker value={item.end} onChange={v => onUpdateItem(card.id, item.id, 'end', v)} />
                </div>
                {calcMinutes(item.start, item.end) > 0 && (
                  <span className="text-xs text-gray-400 ml-auto">{formatDuration(calcMinutes(item.start, item.end))}</span>
                )}
                <button onClick={e => { e.stopPropagation(); onDeleteItem(card.id, item.id) }} className="text-gray-300 hover:text-red-500 transition-colors shrink-0 ml-0.5"><X size={13} /></button>
              </div>
              <div className="flex items-center gap-2 px-2.5 py-1.5">
                <input
                  value={item.text}
                  onClick={e => e.stopPropagation()}
                  onChange={e => onUpdateItem(card.id, item.id, 'text', e.target.value)}
                  placeholder="新增事项..."
                  className={'flex-1 text-sm bg-transparent border-none outline-none ' + (item.done ? 'line-through text-gray-400' : '')}
                />
              </div>
              <div className={'px-2.5 pb-2 -mt-0.5 text-xs leading-snug line-clamp-2 ' + 
                (item.description 
                  ? 'text-gray-500' 
                  : 'text-gray-300 italic')}>
                {item.description || '点击添加详细描述...'}
              </div>
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
    </div>
  )
}

function TaskDetailModal({ card, item, onClose, onUpdate, onDelete }: {
  card: Card
  item: Item
  onClose: () => void
  onUpdate: (cardId: string, itemId: string, field: keyof Item, value: string | boolean) => void
  onDelete: (cardId: string, itemId: string) => void
}) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-gray-500 flex items-center gap-1.5">
            <Calendar size={12} />
            <span>{card.date || '未设置日期'}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" title="关闭">
            <X size={20} />
          </button>
        </div>

        <input
          value={item.text}
          onChange={e => onUpdate(card.id, item.id, 'text', e.target.value)}
          placeholder="标题"
          className={'w-full text-2xl font-bold bg-transparent border-none outline-none mb-4 px-0 ' + (item.done ? 'line-through text-gray-400' : 'text-gray-800')}
          autoFocus
        />

        <div className="flex items-center gap-3 mb-6 py-2 px-3 bg-gray-50 rounded">
          <button onClick={() => onUpdate(card.id, item.id, 'done', !item.done)}
            className={'w-5 h-5 border-2 shrink-0 flex items-center justify-center transition-colors ' + (item.done ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-[#6366f1]')}>
            {item.done && <Check size={12} className="text-white" strokeWidth={3} />}
          </button>
          <Clock size={14} className="text-gray-400 shrink-0" />
          <TimePicker value={item.start} onChange={v => onUpdate(card.id, item.id, 'start', v)} />
          <span className="text-gray-400">—</span>
          <TimePicker value={item.end} onChange={v => onUpdate(card.id, item.id, 'end', v)} />
          {calcMinutes(item.start, item.end) > 0 && (
            <span className="text-xs text-[#6366f1] font-medium ml-auto">{formatDuration(calcMinutes(item.start, item.end))}</span>
          )}
        </div>

        <div className="mb-4">
          <div className="text-xs font-semibold text-gray-500 mb-2">描述</div>
          <textarea
            value={item.description}
            onChange={e => onUpdate(card.id, item.id, 'description', e.target.value)}
            placeholder="添加详细描述..."
            className="w-full min-h-[140px] text-sm bg-gray-50 border border-gray-200 rounded p-3 outline-none focus:border-[#6366f1] focus:bg-white transition-colors resize-y leading-relaxed"
          />
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button onClick={() => { onDelete(card.id, item.id); onClose() }}
            className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1.5 transition-colors">
            <Trash2 size={14} /> 删除任务
          </button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [cards, setCards] = useState<Card[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [openItem, setOpenItem] = useState<{ cardId: string; itemId: string } | null>(null)
  const dragCardIdx = useRef<string | null>(null)
  const cardsRef = useRef(cards)
  cardsRef.current = cards

  const [draggingTask, setDraggingTask] = useState(false)

  const dragItemInfo = useRef<{
    srcCardId: string
    srcIdx: number
    item: Item
    targetCardId: string | null
    targetIdx: number | null
  } | null>(null)

  useEffect(() => {
    loadCards()
  }, [])

  useEffect(() => {
    if (!openItem) return
    const card = cards.find(c => c.id === openItem.cardId)
    const item = card?.items.find(i => i.id === openItem.itemId)
    if (!card || !item) setOpenItem(null)
  }, [cards, openItem])

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
      setCards([{ id, title: '', date: null, items: [{ id: itemId, text: '', description: '', start: '', end: '', done: false }] }])
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
      const card = await invoke<Card>('create_card')
      setCards(prev => [...prev, card])
    } catch {
      const id = genId()
      const itemId = genId()
      setCards(prev => [...prev, { id, title: '', date: null, items: [{ id: itemId, text: '', description: '', start: '', end: '', done: false }] }])
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
      const item: Item = { id: genId(), text: '', description: '', start: '', end: '', done: false }
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

  const filteredCards = cards.filter(card => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return card.title.toLowerCase().includes(q) ||
      card.items.some(item => item.text.toLowerCase().includes(q))
  })

  return (
    <div className="h-screen bg-[#1a1a2e] flex flex-col p-6">
      <div className="shrink-0 flex items-center gap-3 mb-4">
        <div className="relative w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="搜索便签..."
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-white/10 text-white/70 placeholder-white/30 border border-white/10 rounded outline-none focus:border-[#6366f1]/50 transition-colors"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
              <X size={12} />
            </button>
          )}
        </div>
        <div className="text-xs text-white/30">
          {searchQuery ? `找到 ${filteredCards.length} 个结果` : `${cards.length} 个便签`}
        </div>
      </div>
      <div className="flex-1 flex items-start gap-4 overflow-x-auto">
        {filteredCards.map(card => (
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
        ))}
        <button onClick={handleAddCard}
          className="w-[240px] h-12 shrink-0 flex items-center justify-center border-2 border-dashed border-white/20 text-white/40 hover:text-white/70 hover:border-white/40 transition-colors text-xs">
          <Plus size={16} /> 添加便签
        </button>
      </div>
      {openItem && (() => {
        const card = cards.find(c => c.id === openItem.cardId)
        const item = card?.items.find(i => i.id === openItem.itemId)
        if (!card || !item) return null
        return <TaskDetailModal card={card} item={item} onClose={() => setOpenItem(null)}
          onUpdate={handleUpdateItem} onDelete={handleDeleteItem} />
      })()}
    </div>
  )
}
