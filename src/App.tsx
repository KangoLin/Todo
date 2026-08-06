import { invoke } from '@tauri-apps/api/core'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, X, Search, Moon, Sun, Download, Upload, LayoutGrid, CalendarDays, Edit3, BarChart3, Timer } from 'lucide-react'
import { NoteCard } from './components/NoteCard'
import { TaskDetailModal } from './components/TaskDetailModal'
import { TodayBriefing } from './components/TodayBriefing'
import { TimelineView } from './components/TimelineView'
import { StatisticsPanel } from './components/StatisticsPanel'
import { PomodoroTimer } from './components/PomodoroTimer'

import type { Item, Card, Project, ProjectTag } from './lib/types'
import { PROJECT_COLORS } from './lib/constants'
import { genId } from './lib/utils'
import { THEME_PRESETS, applyTheme } from './lib/theme'

export default function App() {
  const [cards, setCards] = useState<Card[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid')
  const [openItem, setOpenItem] = useState<{ cardId: string; itemId: string } | null>(null)
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme')
    if (saved) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })
  const [themePreset, setThemePreset] = useState(() => localStorage.getItem('themePreset') || 'terracotta')
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem('accentColor') || '#c2410c')
  const [showThemePicker, setShowThemePicker] = useState(false)
  const dragCardIdx = useRef<string | null>(null)
  const cardsRef = useRef(cards)
  cardsRef.current = cards

  const [draggingTask, setDraggingTask] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const importRef = useRef<HTMLInputElement>(null)

  const [projects, setProjects] = useState<Project[]>([])
  const [currentProjectId, setCurrentProjectId] = useState<string>('')
  const [projectTags, setProjectTags] = useState<ProjectTag[]>([])
  const [showTagManager, setShowTagManager] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#3e7ae0')
  const [renamingProject, setRenamingProject] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectColor, setNewProjectColor] = useState(PROJECT_COLORS[0])
  const [showStats, setShowStats] = useState(false)
  const [showPomodoro, setShowPomodoro] = useState(false)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (openItem) return
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault()
        searchRef.current?.focus()
      }
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        searchRef.current?.focus()
      }
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault()
        handleAddCard()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [openItem])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
    applyTheme(themePreset, accentColor, dark)
  }, [dark, themePreset, accentColor])

  useEffect(() => {
    const backup = () => { invoke('manual_backup').catch(() => {}) }
    backup()
    const id = setInterval(backup, 600000)
    return () => clearInterval(id)
  }, [])

  const dragItemInfo = useRef<{
    srcCardId: string
    srcIdx: number
    item: Item
    targetCardId: string | null
    targetIdx: number | null
  } | null>(null)

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (!currentProjectId) return
    loadCards(currentProjectId)
    loadProjectTags(currentProjectId)
  }, [currentProjectId])

  useEffect(() => {
    if (!openItem) return
    const card = cards.find(c => c.id === openItem.cardId)
    const item = card?.items.find(i => i.id === openItem.itemId)
    if (!card || !item) setOpenItem(null)
  }, [cards, openItem])

  const loadProjects = async () => {
    try {
      const data = await invoke<Project[]>('get_projects')
      setProjects(data)
      if (data.length > 0) {
        const saved = localStorage.getItem('currentProjectId')
        if (saved && data.some(p => p.id === saved)) {
          setCurrentProjectId(saved)
        } else {
          setCurrentProjectId(data[0].id)
        }
      }
    } catch {
      const fallback: Project = { id: 'default', name: '默认项目', color: '#3d7ae0', sort_order: 0 }
      setProjects([fallback])
      setCurrentProjectId('default')
    }
  }

  const loadCards = async (projectId: string) => {
    try {
      let data = await invoke<Card[]>('get_cards', { projectId })
      if (data.length === 0) {
        data = [await invoke<Card>('create_card', { projectId })]
      }
      setCards(data)
    } catch {
      const id = genId()
      const itemId = genId()
      setCards([{ id, title: '', date: null, items: [{ id: itemId, text: '', description: '', start: '', end: '', done: false, priority: 'none', tags: [], subtasks: [], repeat: 'none' }] }])
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
      const card = await invoke<Card>('create_card', { projectId: currentProjectId })
      setCards(prev => [...prev, card])
    } catch {
      const id = genId()
      const itemId = genId()
      setCards(prev => [...prev, { id, title: '', date: null, items: [{ id: itemId, text: '', description: '', start: '', end: '', done: false, priority: 'none', tags: [], subtasks: [], repeat: 'none' }] }])
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
      const item: Item = { id: genId(), text: '', description: '', start: '', end: '', done: false, priority: 'none', tags: [], subtasks: [], repeat: 'none' }
      setCards(prev => prev.map(c => c.id === cardId ? { ...c, items: [...c.items, item] } : c))
    }
  }

  const handleTimelineAddItem = (date: string) => {
    const existing = cards.find(c => c.date === date)
    if (existing) {
      handleAddItem(existing.id)
    } else {
      const cardId = genId()
      const itemId = genId()
      const item: Item = { id: itemId, text: '', description: '', start: '', end: '', done: false, priority: 'none', tags: [], subtasks: [], repeat: 'none' }
      setCards(prev => [...prev, { id: cardId, title: '', date, items: [item] }])
      try {
        invoke<Card>('create_card', { projectId: currentProjectId }).then(c => {
          invoke('update_card', { id: c.id, date })
          invoke('create_item', { cardId: c.id })
        })
      } catch {}
    }
  }

  const handleUpdateItem = async (cardId: string, itemId: string, field: keyof Item, value: unknown) => {
    setCards(prev => prev.map(c => c.id === cardId ? {
      ...c,
      items: c.items.map(it => it.id === itemId ? { ...it, [field]: value } : it)
    } : c))
    const payload: Record<string, unknown> = { id: itemId }
    payload[field] = value
    try { await invoke('update_item', payload) } catch {}
    if (field === 'done' && value === true) {
      try {
        const newItem = await invoke<Item | null>('create_repeat_item', { id: itemId })
        if (newItem) {
          setCards(prev => prev.map(c => c.id === cardId ? { ...c, items: [...c.items, newItem] } : c))
        }
      } catch {}
    }
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

  const handleCreateProject = async (name: string, color: string) => {
    if (!name.trim()) return
    try {
      const project = await invoke<Project>('create_project', { name: name.trim(), color })
      setProjects(prev => [...prev, project])
      setCurrentProjectId(project.id)
      localStorage.setItem('currentProjectId', project.id)
      setShowCreateForm(false)
      setNewProjectName('')
      setNewProjectColor(PROJECT_COLORS[0])
    } catch {}
  }

  const handleDeleteProject = async (id: string) => {
    if (!window.confirm('删除项目将同时删除其下所有便签和数据，确定？')) return
    try {
      await invoke('delete_project', { id })
      setProjects(prev => prev.filter(p => p.id !== id))
      if (currentProjectId === id) {
        const remaining = projects.filter(p => p.id !== id)
        if (remaining.length > 0) {
          setCurrentProjectId(remaining[0].id)
          localStorage.setItem('currentProjectId', remaining[0].id)
        }
      }
    } catch {}
  }

  const handleRenameProject = async (id: string) => {
    if (!renameValue.trim()) return
    try {
      await invoke('update_project', { id, name: renameValue.trim() })
      setProjects(prev => prev.map(p => p.id === id ? { ...p, name: renameValue.trim() } : p))
      setRenamingProject(null)
    } catch {}
  }

  const switchProject = (id: string) => {
    setCurrentProjectId(id)
    localStorage.setItem('currentProjectId', id)
  }

  const loadProjectTags = async (projectId: string) => {
    try {
      const tags = await invoke<ProjectTag[]>('get_project_tags', { projectId })
      setProjectTags(tags)
    } catch {}
  }

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return
    try {
      const tag = await invoke<ProjectTag>('create_project_tag', { projectId: currentProjectId, name: newTagName.trim(), color: newTagColor })
      setProjectTags(prev => [...prev, tag])
      setNewTagName('')
      setNewTagColor('#3e7ae0')
    } catch {}
  }

  const handleDeleteTag = async (id: string) => {
    try {
      await invoke('delete_project_tag', { id })
      setProjectTags(prev => prev.filter(t => t.id !== id))
    } catch {}
  }

  const filteredCards = cards.filter(card => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return card.title.toLowerCase().includes(q) ||
      card.items.some(item => item.text.toLowerCase().includes(q))
  })

  const [searchResults, setSearchResults] = useState<{ item_id: string; card_id: string; card_title: string; item_text: string; snippet: string }[]>([])

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return }
    const t = setTimeout(async () => {
      try {
        const res = await invoke<typeof searchResults>('search_items', { query: searchQuery })
        setSearchResults(res)
      } catch { setSearchResults([]) }
    }, 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-[var(--bg-page)] to-[var(--bg-page-to)] flex p-6 gap-4">
      {/* Sidebar */}
      <div className="w-60 shrink-0 bg-[var(--bg-surface)]/40 backdrop-blur-sm rounded-xl border border-[var(--border-item)]/40 p-3 flex flex-col overflow-y-auto">
        {/* App title */}
        <div className="flex items-center gap-2 px-2 py-3 mb-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[var(--accent-from)] to-[var(--accent)] flex items-center justify-center text-white text-xs font-bold">
            T
          </div>
          <span className="text-sm font-bold text-stone-700 dark:text-stone-300">Todo土豆</span>
        </div>

        {/* Project list */}
        <div className="space-y-0.5 mb-2">
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">项目</div>
          {projects.map(p => (
            <div key={p.id}
              className={'flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all group ' + (currentProjectId === p.id ? 'bg-[var(--accent)]/8 text-[var(--accent)]' : 'hover:bg-[var(--bg-surface)] text-stone-600 dark:text-stone-400')}>
              <button onClick={() => switchProject(p.id)}
                className="flex items-center gap-2 flex-1 min-w-0 text-left">
                <span className={'w-2 h-2 rounded-full shrink-0 ' + (currentProjectId === p.id ? 'scale-125 ring-2 ring-offset-1 ring-[var(--accent)]/20' : '')} style={{ backgroundColor: p.color }} />
                {renamingProject === p.id ? (
                  <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)}
                    onBlur={() => handleRenameProject(p.id)}
                    onKeyDown={e => { if (e.key === 'Enter') handleRenameProject(p.id); if (e.key === 'Escape') setRenamingProject(null) }}
                    className="flex-1 text-xs bg-transparent border-b border-[var(--accent)] outline-none px-0 py-0 min-w-[40px]"
                    onClick={e => e.stopPropagation()} />
                ) : (
                  <span className="truncate text-xs font-medium">{p.name}</span>
                )}
              </button>
              <button onClick={e => { e.stopPropagation(); setRenamingProject(p.id); setRenameValue(p.name) }}
                className="opacity-0 group-hover:opacity-100 hover:text-[var(--accent)] transition-all p-0.5 shrink-0">
                <Edit3 size={10} />
              </button>
              <button onClick={e => { e.stopPropagation(); handleDeleteProject(p.id) }}
                className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all p-0.5 shrink-0">
                <X size={10} />
              </button>
            </div>
          ))}
        </div>

        {/* Create project */}
        {showCreateForm ? (
          <div className="px-2 py-2 space-y-2 mb-2 bg-[var(--bg-surface)]/50 rounded-lg">
            <input autoFocus value={newProjectName} onChange={e => setNewProjectName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateProject(newProjectName, newProjectColor); if (e.key === 'Escape') { setShowCreateForm(false); setNewProjectName('') } }}
              placeholder="项目名称"
              className="w-full text-xs bg-[var(--bg-card-start)] border border-[var(--border-item)] rounded-lg px-2 py-1.5 outline-none focus:border-[var(--accent)] text-stone-700 dark:text-stone-300 placeholder-stone-400"
            />
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                {PROJECT_COLORS.slice(0, 5).map(c => (
                  <button key={c} onClick={() => setNewProjectColor(c)}
                    className={'w-3.5 h-3.5 rounded-full transition-all ' + (newProjectColor === c ? 'ring-2 ring-offset-1 ring-[var(--accent)]/40 scale-110' : 'hover:scale-110')}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleCreateProject(newProjectName, newProjectColor)}
                  className="px-2 py-1 text-[10px] font-semibold bg-[var(--accent)] text-white rounded-lg hover:brightness-110 transition-all">
                  创建
                </button>
                <button onClick={() => { setShowCreateForm(false); setNewProjectName('') }}
                  className="px-2 py-1 text-[10px] font-semibold bg-[var(--bg-surface)] text-stone-500 dark:text-stone-400 rounded-lg hover:bg-[var(--bg-surface-hover)] transition-all">
                  取消
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowCreateForm(true)}
            className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-stone-500 dark:text-stone-400 hover:text-[var(--accent)] hover:bg-[var(--bg-surface)] rounded-lg transition-all mb-2">
            <Plus size={12} /> 新建项目
          </button>
        )}

        {/* Tag manager toggle */}
        <button onClick={() => setShowTagManager(!showTagManager)}
          className={'w-full flex items-center gap-1.5 px-2 py-1.5 text-xs rounded-lg transition-all mb-1 ' + (showTagManager ? 'text-[var(--accent)] bg-[var(--accent)]/8' : 'text-stone-500 dark:text-stone-400 hover:text-[var(--accent)] hover:bg-[var(--bg-surface)]')}>
          <span className="w-3 h-3 rounded flex items-center justify-center text-[8px] font-bold border border-current/30 bg-current/5">#</span>
          管理标签
          <span className="ml-auto text-[9px] tabular-nums opacity-60">{projectTags.length}</span>
        </button>
        {showTagManager && (
          <div className="px-2 py-2 space-y-2 mb-2 bg-[var(--bg-surface)]/50 rounded-lg">
            {projectTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {projectTags.map(t => (
                  <span key={t.id} className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded text-white font-medium" style={{ backgroundColor: t.color }}>
                    {t.name}
                    <button onClick={() => handleDeleteTag(t.id)} className="text-white/50 hover:text-white transition-colors">
                      <X size={8} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <input value={newTagName} onChange={e => setNewTagName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreateTag() }}
                placeholder="新标签"
                className="flex-1 text-[10px] bg-[var(--bg-card-start)] border border-[var(--border-item)] rounded px-2 py-1 outline-none focus:border-[var(--accent)] text-stone-700 dark:text-stone-300 placeholder-stone-400" />
              <div className="flex gap-0.5">
                {['#e03e3e','#e07a3e','#e0b03e','#3eb07a','#3e7ae0','#6a3ee0','#e03e7a','#7a8e9a'].map(c => (
                  <button key={c} onClick={() => setNewTagColor(c)}
                    className={'w-3 h-3 rounded-full transition-all ' + (newTagColor === c ? 'ring-2 ring-offset-1 ring-[var(--accent)]/40 scale-110' : 'hover:scale-110')}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
              <button onClick={handleCreateTag}
                className="p-1 rounded text-stone-400 hover:text-[var(--accent)] transition-colors">
                <Plus size={12} />
              </button>
            </div>
          </div>
        )}

        <div className="h-px bg-[var(--border-divider)]/30 my-2" />

        {/* Navigation */}
        <div className="space-y-0.5">
          <button onClick={() => setViewMode(viewMode === 'grid' ? 'timeline' : 'grid')}
            className={'w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-lg transition-all ' + (viewMode === 'timeline' ? 'text-[var(--accent)] bg-[var(--accent)]/8' : 'text-stone-500 dark:text-stone-400 hover:text-[var(--accent)] hover:bg-[var(--bg-surface)]')}>
            {viewMode === 'grid' ? <CalendarDays size={13} /> : <LayoutGrid size={13} />}
            {viewMode === 'grid' ? '时间线视图' : '卡片视图'}
          </button>
          <button onClick={() => setShowStats(true)}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-lg transition-all text-stone-500 dark:text-stone-400 hover:text-[var(--accent)] hover:bg-[var(--bg-surface)]">
            <BarChart3 size={13} /> 统计看板
          </button>
          <button onClick={() => setShowPomodoro(true)}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-lg transition-all text-stone-500 dark:text-stone-400 hover:text-[var(--accent)] hover:bg-[var(--bg-surface)]">
            <Timer size={13} /> 番茄钟
          </button>
        </div>

        <div className="flex-1" />

        <div className="h-px bg-[var(--border-divider)]/30 my-2" />

        {/* Theme & settings */}
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <button onClick={() => setDark(!dark)}
              className="p-1.5 rounded-lg text-stone-400 dark:text-stone-500 hover:text-[var(--accent)] hover:bg-[var(--bg-surface)] transition-all"
              title={dark ? '浅色模式' : '深色模式'}>
              {dark ? <Sun size={13} /> : <Moon size={13} />}
            </button>
            <div className="relative">
              <button onClick={() => setShowThemePicker(!showThemePicker)}
                className="p-1.5 rounded-lg text-stone-400 dark:text-stone-500 hover:text-[var(--accent)] hover:bg-[var(--bg-surface)] transition-all"
                title="主题">
                <span className="block w-3 h-3 rounded-full border border-stone-300 dark:border-stone-600" style={{ backgroundColor: accentColor }} />
              </button>
              {showThemePicker && (
                <div className="absolute left-0 bottom-full mb-1 min-w-[220px] bg-white dark:bg-[var(--bg-card-start)] border border-[var(--border-item)] rounded-xl shadow-[0_8px_32px_rgb(var(--shadow-rgb)/var(--shadow-modal-opacity))] z-50 p-3 animate-fade-in"
                  onClick={e => e.stopPropagation()}>
                  <div className="text-[10px] font-semibold text-stone-500 dark:text-stone-400 mb-1.5">主题预设</div>
                  <div className="grid grid-cols-5 gap-1 mb-2">
                    {THEME_PRESETS.map(p => (
                      <button key={p.id} onClick={() => { setThemePreset(p.id); setAccentColor(p.accent); localStorage.setItem('themePreset', p.id); localStorage.setItem('accentColor', p.accent); setShowThemePicker(false) }}
                        className={'flex flex-col items-center gap-0.5 p-1 rounded transition-all ' + (themePreset === p.id ? 'bg-[var(--bg-surface)] ring-1 ring-[var(--accent)]/30' : 'hover:bg-[var(--bg-surface)]')}>
                        <div className="flex gap-px">
                          {[p.light['--bg-page'], p.light['--border-card'], p.accent].map((c, i) => (
                            <span key={i} className={'w-2.5 h-2.5 ' + (i === 2 ? 'rounded-full' : 'rounded-sm')} style={{ backgroundColor: c }} />
                          ))}
                        </div>
                        <span className="text-[8px] text-stone-500 dark:text-stone-400 leading-none">{p.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="text-[10px] font-semibold text-stone-500 dark:text-stone-400 mb-1">强调色</div>
                  <div className="flex flex-wrap gap-1">
                    {['#c2410c','#2563eb','#059669','#7c3aed','#e03e7a','#d97706','#0d9488','#78716c'].map(c => (
                      <button key={c} onClick={() => setAccentColor(c)}
                        className={'w-4 h-4 rounded transition-all ' + (accentColor === c ? 'ring-2 ring-offset-1 ring-stone-400 dark:ring-offset-stone-800 scale-110' : 'hover:scale-110')}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button onClick={async () => {
              try { const json = await invoke<string>('export_data'); const blob = new Blob([json], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `todopotato-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url) } catch {}
            }} className="p-1.5 rounded-lg text-stone-400 dark:text-stone-500 hover:text-[var(--accent)] hover:bg-[var(--bg-surface)] transition-all"
              title="导出数据">
              <Download size={13} />
            </button>
            <button onClick={() => importRef.current?.click()}
              className="p-1.5 rounded-lg text-stone-400 dark:text-stone-500 hover:text-[var(--accent)] hover:bg-[var(--bg-surface)] transition-all"
              title="导入数据">
              <Upload size={13} />
            </button>
            <input ref={importRef} type="file" hidden accept=".json"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                if (!window.confirm('导入将覆盖所有现有数据，确定继续？')) return
                try { const text = await file.text(); await invoke('import_data', { json: text }); loadProjects() } catch (err) { alert('导入失败：' + err) }
                e.target.value = ''
              }} />
          </div>
          <div className="px-2 py-1 text-[10px] text-stone-400 dark:text-stone-500 tabular-nums">
            {searchQuery ? `${filteredCards.length} 个结果` : `${cards.length} 个便签`}
          </div>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Search bar */}
        <div className="shrink-0 flex items-center gap-2 mb-5 bg-[var(--bg-surface)]/40 backdrop-blur-sm rounded-xl px-3 py-2 border border-[var(--border-item)]/40 relative z-10">
          <div className="relative flex-1 max-w-sm">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-300 dark:text-stone-600" />
            <input ref={searchRef}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索 (⌘K /)"
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-[var(--input-bg)] text-stone-700 dark:text-stone-300 placeholder-stone-400 dark:placeholder-stone-500 border border-[var(--border-item)] rounded-lg outline-none focus:border-[var(--accent)]/50 focus:shadow-[0_0_0_3px_rgb(var(--accent-rgb)/0.08)] transition-all"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setSearchResults([]) }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-400">
                <X size={12} />
              </button>
            )}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[var(--bg-card-start)] border border-[var(--border-item)] rounded-lg shadow-[0_8px_24px_rgb(var(--shadow-rgb)/var(--shadow-modal-opacity))] z-50 max-h-64 overflow-y-auto">
                {searchResults.map(r => (
                  <button key={r.item_id} onClick={() => { setOpenItem({ cardId: r.card_id, itemId: r.item_id }); setSearchResults([]); setSearchQuery('') }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-stone-100 dark:hover:bg-[var(--bg-surface-hover)] border-b border-[var(--border-divider)]/30 last:border-0 transition-colors">
                    <div className="text-stone-500 dark:text-stone-400 truncate">{r.card_title || '无标题'}</div>
                    <div className="text-stone-700 dark:text-stone-300 font-medium truncate">{r.item_text || '无标题事项'}</div>
                    <div className="text-stone-400 dark:text-stone-500 mt-0.5 truncate [&>mark]:bg-yellow-200 dark:[&>mark]:bg-yellow-700 [&>mark]:text-stone-900 dark:[&>mark]:text-stone-100" dangerouslySetInnerHTML={{ __html: r.snippet }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <TodayBriefing cards={cards} onReschedule={(cardId, itemId, start, end) => {
          const card = cards.find(c => c.id === cardId)
          const item = card?.items.find(i => i.id === itemId)
          if (!card || !item) return
          const updated = { ...item, start, end }
          setCards(prev => prev.map(c => c.id === cardId ? {
            ...c, items: c.items.map(i => i.id === itemId ? updated : i)
          } : c))
          invoke('update_item', { id: itemId, start, end }).catch(console.error)
        }} />

        {/* Content */}
        <div className="flex-1 flex items-start gap-4 overflow-x-auto">
          {viewMode === 'grid' ? (
            <>
            {filteredCards.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center h-full min-h-[300px] text-stone-400 dark:text-stone-500 gap-2">
                {searchQuery ? (
                  <>
                    <Search size={32} strokeWidth={1} className="opacity-20" />
                    <p className="text-sm font-medium">没有找到匹配的便签</p>
                    <button onClick={() => { setSearchQuery(''); setSearchResults([]) }}
                      className="text-xs text-[var(--accent)] hover:underline transition-colors">清除搜索</button>
                  </>
                ) : (
                  <>
                    <LayoutGrid size={32} strokeWidth={1} className="opacity-20" />
                    <p className="text-sm font-medium">还没有便签</p>
                    <p className="text-xs text-stone-300 dark:text-stone-600">点击下方按钮创建你的第一张便签</p>
                  </>
                )}
              </div>
            ) : (
            filteredCards.map(card => (
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
            ))
            )}
            <button onClick={handleAddCard}
              className="group w-[300px] h-14 shrink-0 flex items-center justify-center gap-2 border-2 border-dashed border-stone-300 dark:border-stone-600 text-stone-400 dark:text-stone-500 hover:text-[var(--accent)] hover:border-[var(--accent)]/40 hover:bg-[var(--bg-surface)]/40 transition-all text-xs rounded-xl active:scale-[0.97]">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-stone-100 dark:bg-stone-700 group-hover:bg-[var(--accent)]/10 group-hover:text-[var(--accent)] transition-all">
                <Plus size={14} className="group-hover:rotate-90 transition-transform duration-300" />
              </span>
              添加便签
            </button>
            </>
          ) : (
            <div className="flex-1 min-h-0">
              <TimelineView cards={filteredCards} onOpenItem={handleOpenItem} onUpdateItem={handleUpdateItem} onTimelineAddItem={handleTimelineAddItem} />
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {openItem && (() => {
        const card = cards.find(c => c.id === openItem.cardId)
        const item = card?.items.find(i => i.id === openItem.itemId)
        if (!card || !item) return null
        return <TaskDetailModal card={card} item={item} projectTags={projectTags} onClose={() => setOpenItem(null)}
          onUpdate={handleUpdateItem} onDelete={handleDeleteItem} />
      })()}
      {showStats && <StatisticsPanel onClose={() => setShowStats(false)} />}
      {showPomodoro && <PomodoroTimer onClose={() => setShowPomodoro(false)} />}
    </div>
  )
}
