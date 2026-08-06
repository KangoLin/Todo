import { useEffect, useState } from 'react'
import { Plus, X, Clock, Trash2, Check, Calendar } from 'lucide-react'
import type { Item, Card, ProjectTag } from '../lib/types'
import { genId, calcMinutes, formatDuration } from '../lib/utils'
import DescriptionEditor from './DescriptionEditor'
import { TimePicker } from './TimePicker'

export function TaskDetailModal({ card, item, projectTags, onClose, onUpdate, onDelete }: {
  card: Card
  item: Item
  projectTags: ProjectTag[]
  onClose: () => void
  onUpdate: (cardId: string, itemId: string, field: keyof Item, value: unknown) => void
  onDelete: (cardId: string, itemId: string) => void
}) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  const [tagInput, setTagInput] = useState('')
  const [tagColor, setTagColor] = useState('#3e7ae0')
  const [subtaskInput, setSubtaskInput] = useState('')

  const TAG_PALETTE = ['#e03e3e', '#e07a3e', '#e0b03e', '#3eb07a', '#3e7ae0', '#6a3ee0', '#e03e7a', '#7a8e9a']

  const addTag = () => {
    const name = tagInput.trim()
    if (!name || item.tags.some(t => t.name === name)) return
    onUpdate(card.id, item.id, 'tags', [...item.tags, { name, color: tagColor }])
    setTagInput('')
  }

  const removeTag = (name: string) => {
    onUpdate(card.id, item.id, 'tags', item.tags.filter(t => t.name !== name))
  }

  const addSubtask = () => {
    const text = subtaskInput.trim()
    if (!text) return
    onUpdate(card.id, item.id, 'subtasks', [...item.subtasks, { id: genId(), text, done: false }])
    setSubtaskInput('')
  }

  const toggleSubtask = (id: string) => {
    onUpdate(card.id, item.id, 'subtasks', item.subtasks.map(s => s.id === id ? { ...s, done: !s.done } : s))
  }

  const removeSubtask = (id: string) => {
    onUpdate(card.id, item.id, 'subtasks', item.subtasks.filter(s => s.id !== id))
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}>
      <div className="bg-gradient-to-b from-[var(--bg-card-start)] to-[var(--bg-surface-hover)] border border-[var(--border-card)] rounded-xl shadow-[0_8px_32px_rgb(var(--shadow-rgb)/var(--shadow-modal-opacity))] max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 animate-scale-in"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-stone-400 dark:text-stone-500 flex items-center gap-1.5">
            <Calendar size={12} />
            <span>{card.date || '未设置日期'}</span>
          </div>
          <button onClick={onClose} className="text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors" title="关闭">
            <X size={20} />
          </button>
        </div>

        <input
          value={item.text}
          onChange={e => onUpdate(card.id, item.id, 'text', e.target.value)}
          placeholder="标题"
          className={'w-full text-2xl font-bold bg-transparent border-none outline-none mb-4 px-0 ' + (item.done ? 'line-through text-stone-400 dark:text-stone-500' : 'text-stone-800 dark:text-stone-200')}
          autoFocus
        />

        <div className="flex items-center gap-3 mb-5 py-2.5 px-3 bg-[var(--bg-surface)] rounded-lg">
          <button onClick={() => onUpdate(card.id, item.id, 'done', !item.done)}
            className={'w-5 h-5 border-2 shrink-0 flex items-center justify-center transition-all duration-200 rounded ' + (item.done ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-stone-300 dark:border-stone-600 hover:border-[var(--accent)] hover:bg-stone-100 dark:hover:bg-stone-800/60')}>
            {item.done && <Check size={12} className="text-white animate-scale-in" strokeWidth={3} />}
          </button>
          <div className="flex items-center gap-1.5 bg-[var(--time-bg)] border border-[var(--border-time)] rounded-md px-3 py-1.5 shrink-0 cursor-pointer">
            <Clock size={13} className="text-stone-400 dark:text-stone-500 shrink-0 hover:text-[var(--accent)] transition-colors" />
            <TimePicker value={item.start} onChange={v => onUpdate(card.id, item.id, 'start', v)} />
            <span className="text-stone-300 dark:text-stone-600 font-medium hover:text-stone-500 dark:hover:text-stone-400 transition-colors">—</span>
            <TimePicker value={item.end} onChange={v => onUpdate(card.id, item.id, 'end', v)} />
            {calcMinutes(item.start, item.end) > 0 && (
              <span className="text-[11px] font-semibold text-white bg-[var(--accent-muted)] rounded-full px-2 py-0.5 ml-1">{formatDuration(calcMinutes(item.start, item.end))}</span>
            )}
          </div>
        </div>

        <div className="mb-5">
          <div className="text-xs font-semibold text-stone-500 dark:text-stone-400 mb-2">优先级</div>
          <div className="flex gap-1.5">
            {['none', 'p0', 'p1', 'p2', 'p3'].map(p => (
              <button key={p} onClick={() => onUpdate(card.id, item.id, 'priority', p)}
                className={'text-xs font-semibold px-3 py-1 rounded-lg transition-all active:scale-[0.95] ' + (
                  item.priority === p
                    ? p === 'none' ? 'bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-400' :
                      p === 'p0' ? 'bg-red-500 text-white' :
                      p === 'p1' ? 'bg-orange-500 text-white' :
                      p === 'p2' ? 'bg-blue-500 text-white' :
                      'bg-stone-400 text-white'
                    : p === 'none' ? 'bg-transparent border border-stone-300 dark:border-stone-600 text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800' :
                      'bg-transparent border ' + (
                        p === 'p0' ? 'border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30' :
                        p === 'p1' ? 'border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30' :
                        p === 'p2' ? 'border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30' :
                        'border-stone-300 dark:border-stone-600 text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                      )
                )}>
                {p === 'none' ? '无' : p.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <div className="text-xs font-semibold text-stone-500 dark:text-stone-400 mb-2">重复</div>
          <div className="flex gap-1.5">
            {[
              { value: 'none', label: '不重复' },
              { value: 'daily', label: '每天' },
              { value: 'weekdays', label: '工作日' },
              { value: 'weekly', label: '每周' },
            ].map(r => (
              <button key={r.value} onClick={() => onUpdate(card.id, item.id, 'repeat', r.value)}
                className={'text-xs font-semibold px-3 py-1 rounded-lg transition-all active:scale-[0.95] ' + (
                  item.repeat === r.value
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-transparent border border-stone-300 dark:border-stone-600 text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                )}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <div className="text-xs font-semibold text-stone-500 dark:text-stone-400 mb-2">标签</div>
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            {item.tags.map(tag => (
              <span key={tag.name}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full text-white font-medium"
                style={{ backgroundColor: tag.color }}>
                {tag.name}
                <button onClick={() => removeTag(tag.name)} className="text-white/70 hover:text-white transition-colors">
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addTag() }}
              placeholder="标签名称..."
              className="flex-1 text-xs bg-transparent border border-stone-300 dark:border-stone-600 rounded-lg px-2.5 py-1.5 outline-none focus:border-[var(--accent)] text-stone-700 dark:text-stone-300 placeholder-stone-400 dark:placeholder-stone-500"
            />
            <div className="flex gap-0.5">
              {TAG_PALETTE.map(c => (
                <button key={c} onClick={() => setTagColor(c)}
                  className={'w-4 h-4 rounded-full transition-all ' + (tagColor === c ? 'ring-2 ring-offset-1 ring-stone-400 dark:ring-offset-stone-800' : 'ring-0')}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
            <button onClick={addTag}
              className="text-xs text-stone-500 dark:text-stone-400 hover:text-[var(--accent)] transition-colors shrink-0">
              <Plus size={16} />
            </button>
          </div>
          {projectTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-[var(--border-divider)]/30">
              {projectTags.filter(pt => !item.tags.some(t => t.name === pt.name)).map(pt => (
                <button key={pt.id} onClick={() => onUpdate(card.id, item.id, 'tags', [...item.tags, { name: pt.name, color: pt.color }])}
                  className="text-[10px] px-2 py-0.5 rounded-full border border-stone-300 dark:border-stone-600 text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all active:scale-[0.95]"
                  style={{ borderColor: pt.color + '40' }}>
                  +{pt.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mb-5">
          <div className="text-xs font-semibold text-stone-500 dark:text-stone-400 mb-2">描述</div>
          <DescriptionEditor
            content={item.description}
            onChange={html => onUpdate(card.id, item.id, 'description', html)}
          />
        </div>

        <div className="mb-5">
          <div className="text-xs font-semibold text-stone-500 dark:text-stone-400 mb-2">
            子任务
            {item.subtasks.length > 0 && (
              <span className="ml-1.5 text-stone-400 dark:text-stone-500 font-normal">
                {item.subtasks.filter(s => s.done).length}/{item.subtasks.length}
              </span>
            )}
          </div>
          <div className="space-y-1 mb-2">
            {item.subtasks.map(sub => (
              <div key={sub.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800/40 transition-colors group">
                <button onClick={() => toggleSubtask(sub.id)}
                  className={'w-4 h-4 border shrink-0 flex items-center justify-center transition-all duration-200 rounded ' + (sub.done ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-stone-300 dark:border-stone-600 hover:border-[var(--accent)]')}>
                  {sub.done && <Check size={10} className="text-white" strokeWidth={3} />}
                </button>
                <span className={'text-sm flex-1 ' + (sub.done ? 'line-through text-stone-400 dark:text-stone-500' : 'text-stone-700 dark:text-stone-300')}>{sub.text}</span>
                <button onClick={() => removeSubtask(sub.id)}
                  className="opacity-0 group-hover:opacity-100 text-stone-400 dark:text-stone-500 hover:text-red-500 dark:hover:text-red-400 transition-all">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              value={subtaskInput}
              onChange={e => setSubtaskInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addSubtask() }}
              placeholder="添加子任务..."
              className="flex-1 text-xs bg-transparent border border-dashed border-stone-300 dark:border-stone-600 rounded-lg px-2.5 py-1.5 outline-none focus:border-[var(--accent)] focus:border-solid text-stone-700 dark:text-stone-300 placeholder-stone-400 dark:placeholder-stone-500"
            />
            <button onClick={addSubtask}
              className="text-xs text-stone-500 dark:text-stone-400 hover:text-[var(--accent)] transition-colors shrink-0">
              <Plus size={16} />
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-[var(--border-item)]">
          <button onClick={() => { onDelete(card.id, item.id); onClose() }}
            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm flex items-center gap-1.5 transition-colors">
            <Trash2 size={14} /> 删除任务
          </button>
        </div>
      </div>
    </div>
  )
}
