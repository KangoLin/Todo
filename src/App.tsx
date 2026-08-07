import { invoke } from '@tauri-apps/api/core'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, X, Search, LayoutGrid, CalendarDays, ChevronUp, ChevronDown } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { NoteCard } from './components/NoteCard'
import { TaskDetailModal } from './components/TaskDetailModal'
import { TodayBriefing } from './components/TodayBriefing'
import { TimelineView } from './components/TimelineView'
import { StatisticsPanel } from './components/StatisticsPanel'
import { PomodoroTimer } from './components/PomodoroTimer'
import { BottomTabBar } from './components/BottomTabBar'
import { PetBasePlaceholder } from './components/PetBasePlaceholder'
import { SettingsPanel } from './components/SettingsPanel'

import type { TabId } from './components/BottomTabBar'
import type { Item, Card, Project, ProjectTag } from './lib/types'
import { PROJECT_COLORS } from './lib/constants'
import { genId, formatDateLabel } from './lib/utils'
import { applyTheme } from './lib/theme'

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
  const [tab, setTab] = useState<TabId>('base')

  // 触屏设备判定：触屏下禁用 HTML5 拖拽，改用长按移动菜单 + 箭头排序
  const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
  // 长按菜单：cardId/itemId + 手指抬起位置（用于锚定菜单弹出点）
  const [moveMenu, setMoveMenu] = useState<{ cardId: string; itemId: string; x: number; y: number } | null>(null)

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

  // ===== 触控双轨：长按移动菜单 + 箭头排序（触屏） =====

  // 长按 0.5s 后触发：打开「移动至」菜单，锚定在手指位置
  const handleOpenMoveMenu = useCallback((cardId: string, itemId: string, x: number, y: number) => {
    setMoveMenu({ cardId, itemId, x, y })
  }, [])

  // 把事项移动到目标卡片（复用 handleDropItem 的跨天本地更新思路：源卡移除、目标卡末尾追加）
  const handleMoveItem = async (itemId: string, targetCardId: string) => {
    if (!moveMenu) return
    const srcCard = cardsRef.current.find(c => c.id === moveMenu.cardId)
    const item = srcCard?.items.find(i => i.id === itemId)
    setMoveMenu(null)
    if (!srcCard || !item || targetCardId === srcCard.id) return
    const tgtCard = cardsRef.current.find(c => c.id === targetCardId)
    const tgtIds = [...(tgtCard?.items ?? []), item].map(i => i.id)
    setCards(prev => prev.map(c => {
      if (c.id === srcCard.id) return { ...c, items: c.items.filter(i => i.id !== itemId) }
      if (c.id === targetCardId) return { ...c, items: [...c.items, item] }
      return c
    }))
    try { await invoke('move_item', { id: itemId, targetCardId }) } catch { /* 忽略失败（本地已更新） */ }
    try { await invoke('reorder_items', { ids: tgtIds }) } catch { /* 忽略失败（本地已更新） */ }
  }

  // 无日期卡片时：新建今天便签并移动
  const handleMoveToNewCard = async () => {
    if (!moveMenu) return
    const srcCard = cardsRef.current.find(c => c.id === moveMenu.cardId)
    const item = srcCard?.items.find(i => i.id === moveMenu.itemId)
    setMoveMenu(null)
    if (!srcCard || !item) return
    try {
      const card = await invoke<Card>('create_card', { projectId: currentProjectId })
      const today = new Date().toISOString().slice(0, 10)
      await invoke('update_card', { id: card.id, date: today })
      await invoke('move_item', { id: item.id, targetCardId: card.id })
      setCards(prev => [
        ...prev.map(c => c.id === srcCard.id ? { ...c, items: c.items.filter(i => i.id !== item.id) } : c),
        { ...card, date: today, items: [item] },
      ])
    } catch { /* 忽略失败（本地无需回滚） */ }
  }

  // 箭头排序：同卡片内相邻交换，与 handleDropItem 同卡分支一致
  const handleArrowReorder = (dir: 1 | -1) => {
    if (!moveMenu) return
    const card = cardsRef.current.find(c => c.id === moveMenu.cardId)
    if (!card) return
    const srcIdx = card.items.findIndex(i => i.id === moveMenu.itemId)
    if (srcIdx === -1) return
    const newIdx = srcIdx + dir
    if (newIdx < 0 || newIdx >= card.items.length) return
    const ids = [...card.items]
    const [moved] = ids.splice(srcIdx, 1)
    ids.splice(newIdx, 0, moved)
    setCards(prev => prev.map(c => c.id === card.id ? { ...c, items: ids } : c))
    invoke('reorder_items', { ids: ids.map(i => i.id) }).catch(() => {})
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

  // 长按菜单内容：源事项位置 + 可移动的日期目标卡片（有日期的卡片按日期取最近 5 个）
  const menuInfo = (() => {
    if (!moveMenu) return null
    const srcCard = cards.find(c => c.id === moveMenu.cardId)
    if (!srcCard) return null
    const srcIdx = srcCard.items.findIndex(i => i.id === moveMenu.itemId)
    if (srcIdx === -1) return null
    const byDate = new Map<string, string>()
    cards.forEach(c => { if (c.date && c.id !== moveMenu.cardId && !byDate.has(c.date)) byDate.set(c.date, c.id) })
    const targets = Array.from(byDate.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 5)
      .map(([date, cardId]) => ({ cardId, label: formatDateLabel(date) }))
    return { srcIdx, lastIdx: srcCard.items.length - 1, targets }
  })()

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-[var(--bg-page)] to-[var(--bg-page-to)] flex flex-col">
      <main className="flex-1 min-w-0 mx-auto w-full max-w-7xl p-4 md:p-6">
        {tab === 'base' && <PetBasePlaceholder />}

        {tab === 'today' && (
          <>
            {/* 搜索栏 + 视图切换 */}
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
              <button onClick={() => setViewMode(viewMode === 'grid' ? 'timeline' : 'grid')}
                title={viewMode === 'grid' ? '切换到时间线视图' : '切换到卡片视图'}
                className="shrink-0 p-2 rounded-lg text-stone-400 dark:text-stone-500 hover:text-[var(--accent)] hover:bg-[var(--bg-surface)] transition-all">
                {viewMode === 'grid' ? <CalendarDays size={16} /> : <LayoutGrid size={16} />}
              </button>
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

            {/* 便签 / 时间线内容 */}
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
                    isTouch={isTouch}
                    onOpenMoveMenu={handleOpenMoveMenu}
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
                  <TimelineView cards={filteredCards} onOpenItem={handleOpenItem} onUpdateItem={handleUpdateItem} onTimelineAddItem={handleTimelineAddItem} isTouch={isTouch} onOpenMoveMenu={handleOpenMoveMenu} />
                </div>
              )}
            </div>

            {/* 长按移动菜单（触屏）：锚定在长按位置，含箭头排序 + 跨天移动 */}
            <DropdownMenu.Root open={!!moveMenu} onOpenChange={(o) => { if (!o) setMoveMenu(null) }}>
              <DropdownMenu.Trigger asChild>
                <div style={{ position: 'fixed', left: moveMenu?.x ?? 0, top: moveMenu?.y ?? 0, width: 1, height: 1 }} />
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                {moveMenu && (
                  <DropdownMenu.Content side="bottom" align="start" sideOffset={10}
                    className="z-50 min-w-[200px] bg-white dark:bg-[var(--bg-card-start)] border border-[var(--border-item)] rounded-xl shadow-[0_8px_32px_rgb(var(--shadow-rgb)/var(--shadow-modal-opacity))] p-1">
                    {menuInfo && (
                      <>
                        <div className="flex items-center gap-1 px-2 py-1">
                          <span className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 flex-1">调整顺序</span>
                          <button onClick={() => handleArrowReorder(-1)} disabled={menuInfo.srcIdx === 0}
                            title="上移"
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-stone-500 dark:text-stone-400 hover:bg-[var(--bg-surface-hover)] hover:text-[var(--accent)] transition-colors disabled:opacity-30 disabled:pointer-events-none active:scale-90">
                            <ChevronUp size={14} />
                          </button>
                          <button onClick={() => handleArrowReorder(1)} disabled={menuInfo.srcIdx === menuInfo.lastIdx}
                            title="下移"
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-stone-500 dark:text-stone-400 hover:bg-[var(--bg-surface-hover)] hover:text-[var(--accent)] transition-colors disabled:opacity-30 disabled:pointer-events-none active:scale-90">
                            <ChevronDown size={14} />
                          </button>
                        </div>
                        <div className="mx-2 h-px bg-[var(--border-divider)]/40" />
                      </>
                    )}
                    <DropdownMenu.Label className="px-2 py-1 text-[10px] font-semibold text-stone-400 dark:text-stone-500">移动至</DropdownMenu.Label>
                    {menuInfo && menuInfo.targets.map(d => (
                      <DropdownMenu.Item key={d.cardId} onSelect={() => handleMoveItem(moveMenu.itemId, d.cardId)}
                        className="px-2 py-1.5 text-xs rounded-lg outline-none cursor-pointer data-[highlighted]:bg-[var(--bg-surface-hover)] data-[highlighted]:text-[var(--accent)]">
                        {d.label}
                      </DropdownMenu.Item>
                    ))}
                    {(!menuInfo || menuInfo.targets.length === 0) && (
                      <DropdownMenu.Item onSelect={() => handleMoveToNewCard()}
                        className="px-2 py-1.5 text-xs rounded-lg outline-none cursor-pointer data-[highlighted]:bg-[var(--bg-surface-hover)] data-[highlighted]:text-[var(--accent)]">
                        新建便签并移动（今天）
                      </DropdownMenu.Item>
                    )}
                    <DropdownMenu.Item onSelect={() => setMoveMenu(null)}
                      className="px-2 py-1.5 text-xs rounded-lg outline-none cursor-pointer data-[highlighted]:bg-[var(--bg-surface-hover)] text-stone-400 dark:text-stone-500">
                      取消
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                )}
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </>
        )}

        {tab === 'settings' && (
          <SettingsPanel
            projects={projects}
            currentProjectId={currentProjectId}
            projectTags={projectTags}
            dark={dark}
            themePreset={themePreset}
            accentColor={accentColor}
            showThemePicker={showThemePicker}
            onSwitchProject={switchProject}
            onToggleDark={() => setDark(!dark)}
            onToggleThemePicker={() => setShowThemePicker(!showThemePicker)}
            onSelectThemePreset={(id, accent) => { setThemePreset(id); setAccentColor(accent); localStorage.setItem('themePreset', id); localStorage.setItem('accentColor', accent); setShowThemePicker(false) }}
            onSelectAccent={setAccentColor}
            onExport={async () => {
              try { const json = await invoke<string>('export_data'); const blob = new Blob([json], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `todopotato-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url) } catch {}
            }}
            onImport={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              if (!window.confirm('导入将覆盖所有现有数据，确定继续？')) return
              try { const text = await file.text(); await invoke('import_data', { json: text }); loadProjects() } catch (err) { alert('导入失败：' + err) }
              e.target.value = ''
            }}
            importRef={importRef}
            renamingProject={renamingProject}
            renameValue={renameValue}
            onRenameProject={handleRenameProject}
            onStartRename={p => { setRenamingProject(p.id); setRenameValue(p.name) }}
            onRenameValueChange={setRenameValue}
            onCancelRename={() => setRenamingProject(null)}
            onDeleteProject={handleDeleteProject}
            onCreateProject={handleCreateProject}
            showCreateForm={showCreateForm}
            newProjectName={newProjectName}
            newProjectColor={newProjectColor}
            onShowCreateForm={setShowCreateForm}
            onNewProjectName={setNewProjectName}
            onNewProjectColor={setNewProjectColor}
            showTagManager={showTagManager}
            onToggleTagManager={() => setShowTagManager(!showTagManager)}
            onDeleteTag={handleDeleteTag}
            onCreateTag={handleCreateTag}
            newTagName={newTagName}
            newTagColor={newTagColor}
            onNewTagName={setNewTagName}
            onNewTagColor={setNewTagColor}
            onShowStats={() => setShowStats(true)}
            onShowPomodoro={() => setShowPomodoro(true)}
            onShowViewToggle={() => setViewMode(viewMode === 'grid' ? 'timeline' : 'grid')}
            viewMode={viewMode}
          />
        )}
      </main>

      {/* 底部 3 Tab 导航 */}
      <BottomTabBar tab={tab} onChange={setTab} />

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