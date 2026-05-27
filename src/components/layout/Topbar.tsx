import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '../../stores/appStore'
import { useProject } from '../../hooks/useBoard'
import { useColumns } from '../../hooks/useColumns'
import { useCreateCard } from '../../hooks/useCards'
import { Moon, Sun, Menu, Plus, Search } from 'lucide-react'

interface BcInfo {
  label: string
  href?: string
  projectId?: string
  boardId?: string
}

function useBreadcrumbs(): { crumbs: BcInfo[]; projectId?: string; boardId?: string } {
  const loc = useLocation()
  const parts = loc.pathname.split('/').filter(Boolean)
  const crumbs: BcInfo[] = [{ label: '首页', href: '/projects' }]

  if (parts[0] === 'project' && parts[1]) {
    crumbs.push({ label: '项目', href: `/project/${parts[1]}`, projectId: parts[1] })
    return { crumbs, projectId: parts[1] }
  }
  if (parts[0] === 'board' && parts[1]) {
    crumbs.push({ label: '看板', href: `/board/${parts[1]}`, boardId: parts[1] })
    return { crumbs, boardId: parts[1] }
  }
  if (parts[0] === 'search') {
    crumbs.push({ label: '搜索' })
    return { crumbs }
  }
  if (parts[0] === 'projects') {
    crumbs.push({ label: '项目列表' })
    return { crumbs }
  }
  return { crumbs }
}

export function Topbar() {
  const navigate = useNavigate()
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const theme = useAppStore((s) => s.theme)
  const setTheme = useAppStore((s) => s.setTheme)
  const bc = useBreadcrumbs()

  const [searchFocused, setSearchFocused] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const { data: project } = useProject(bc.projectId)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
      setSearchFocused(false)
    }
    if (e.key === 'Escape') {
      setSearchFocused(false)
      setSearchQuery('')
    }
  }

  const { data: boardColumns } = useColumns(bc.boardId)

  return (
    <header className="h-12 border-b border-border flex items-center px-3 gap-2 shrink-0 bg-surface/80 backdrop-blur-sm z-10">
      <button onClick={toggleSidebar} className="p-1.5 rounded-lg hover:bg-surface-secondary text-text-secondary transition-colors hidden sm:block">
        <Menu size={18} />
      </button>

      <div className="flex items-center gap-1.5 text-sm flex-1 min-w-0">
        {bc.crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-text-secondary/40 text-xs">/</span>}
            {c.href && i < bc.crumbs.length - 1 ? (
              <button onClick={() => navigate(c.href!)} className="hover:text-primary transition-colors truncate max-w-[120px]">{c.label}</button>
            ) : (
              <span className={'truncate max-w-[160px] ' + (i === bc.crumbs.length - 1 ? 'font-medium text-text' : 'text-text-secondary')}>
                {i === bc.crumbs.length - 1 && bc.boardId && project ? project.name : c.label}
              </span>
            )}
          </span>
        ))}
        {bc.boardId && project && <span className="text-text-secondary text-xs ml-0.5">· {project.name}</span>}
      </div>

      <div className="flex items-center gap-1">
        {searchFocused ? (
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg border border-primary bg-surface shadow-sm">
            <Search size={14} className="text-text-secondary shrink-0" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={handleSearchKeyDown} placeholder="搜索卡片..." autoFocus className="w-40 text-sm bg-transparent border-none outline-none px-0 py-0.5" />
            <button onClick={() => { setSearchFocused(false); setSearchQuery('') }} className="text-text-secondary hover:text-text text-xs">✕</button>
          </div>
        ) : (
          <button onClick={() => setSearchFocused(true)} className="p-1.5 rounded-lg hover:bg-surface-secondary text-text-secondary transition-colors" title="搜索">
            <Search size={16} />
          </button>
        )}

        {bc.boardId && boardColumns && boardColumns.length > 0 && (
          <QuickAddCard boardId={bc.boardId} columns={boardColumns} />
        )}

        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-1.5 rounded-lg hover:bg-surface-secondary text-text-secondary transition-colors" title={theme === 'dark' ? '浅色模式' : '深色模式'}>
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
  )
}

function QuickAddCard({ columns }: { boardId: string; columns: { id: string; name: string }[] }) {
  const queryClient = useQueryClient()
  const [show, setShow] = useState(false)
  const createCardMut = useCreateCard()

  const handleCreate = (columnId: string, title: string) => {
    createCardMut.mutate({ columnId, title }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['cards', columnId] })
        setShow(false)
      },
    })
  }

  if (!show) {
    return (
      <button onClick={() => setShow(true)} className="p-1.5 rounded-lg hover:bg-surface-secondary text-text-secondary transition-colors" title="快速添加卡片">
        <Plus size={16} />
      </button>
    )
  }

  return (
    <div className="relative">
      <div className="absolute right-0 top-full mt-1 w-64 bg-surface border border-border rounded-xl shadow-lg p-3 z-50">
        <div className="text-xs font-medium text-text-secondary mb-2">快速添加卡片</div>
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {columns.map(col => (
            <QuickCardInput key={col.id} columnName={col.name} onSubmit={(title) => handleCreate(col.id, title)} />
          ))}
        </div>
        <button onClick={() => setShow(false)} className="mt-2 text-xs text-text-secondary hover:text-text">取消</button>
      </div>
    </div>
  )
}

function QuickCardInput({ columnName, onSubmit }: { columnName: string; onSubmit: (title: string) => void }) {
  const [val, setVal] = useState('')
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-text-secondary shrink-0 w-12 truncate">{columnName}</span>
      <input value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && val.trim()) onSubmit(val.trim()) }} placeholder="卡片标题..." className="flex-1 px-2 py-1 text-xs rounded border border-border bg-surface focus:outline-none focus:ring-1 focus:ring-primary" />
      {val.trim() && <button onClick={() => onSubmit(val.trim())} className="p-0.5 text-primary"><Plus size={14} /></button>}
    </div>
  )
}
