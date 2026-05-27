import { useNavigate, useLocation } from 'react-router'
import { useState } from 'react'
import { useProjects } from '../../hooks/useProjects'
import { useAppStore } from '../../stores/appStore'
import { exportData, importData } from '../../lib/tauri-api'
import { save, open } from '@tauri-apps/plugin-dialog'
import { FolderKanban, Search, Plus, PanelLeftClose, PanelLeft, ChevronRight, Download, Upload } from 'lucide-react'

export function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const [importing, setImporting] = useState(false)

  const { data: projects } = useProjects()

  const currentPath = location.pathname
  const isActive = (path: string) => currentPath.startsWith(path)

  return (
    <aside className="w-60 border-r border-border bg-surface-secondary flex flex-col shrink-0">
      <div className="p-3 border-b border-border flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-white text-xs font-bold shrink-0">T</div>
        <h1 className="font-bold text-base flex-1 truncate">Todo土豆</h1>
        <button onClick={toggleSidebar} className="p-1 rounded-md hover:bg-border/60 text-text-secondary transition-colors" title="收起侧栏">
          <PanelLeftClose size={16} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        <div className="text-[11px] font-semibold text-text-secondary/60 uppercase tracking-wider px-3 py-1.5 mt-1">导航</div>
        <button onClick={() => navigate('/projects')} className={'flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ' + (isActive('/projects') && !isActive('/project/') ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-border/50 text-text')}>
          <FolderKanban size={16} className="shrink-0" />
          <span className="flex-1 truncate">项目列表</span>
          {projects && <span className="text-xs text-text-secondary bg-border/60 px-1.5 py-0.5 rounded-full">{projects.length}</span>}
        </button>
        <button onClick={() => navigate('/search')} className={'flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ' + (isActive('/search') ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-border/50 text-text')}>
          <Search size={16} className="shrink-0" />
          <span>搜索</span>
        </button>

        {projects && projects.length > 0 && (
          <>
            <div className="text-[11px] font-semibold text-text-secondary/60 uppercase tracking-wider px-3 py-1.5 mt-3">项目</div>
            {projects.map(p => (
              <button key={p.id} onClick={() => { navigate(`/project/${p.id}`) }} className={'flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-sm transition-colors group ' + (currentPath === `/project/${p.id}` || currentPath.startsWith(`/project/${p.id}/`) ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-border/50 text-text')}>
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                <span className="flex-1 truncate">{p.name}</span>
                <ChevronRight size={14} className="shrink-0 text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </>
        )}
      </nav>

      <div className="p-3 border-t border-border space-y-1">
        <button onClick={() => navigate('/projects')} className="flex items-center gap-2 w-full justify-center px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors">
          <Plus size={16} /> 新建项目
        </button>
        <button onClick={async () => {
          const filePath = await save({ filters: [{ name: 'JSON', extensions: ['json'] }], defaultPath: 'todo-potato-backup.json' })
          if (filePath) {
            try {
              const msg = await exportData(filePath)
              alert(msg)
            } catch (e) {
              alert('导出失败：' + e)
            }
          }
        }} className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-text-secondary hover:bg-border/50 transition-colors">
          <Download size={14} /> 导出数据
        </button>
        <button onClick={async () => {
          const file = await open({ filters: [{ name: 'JSON', extensions: ['json'] }], multiple: false })
          if (file) {
            setImporting(true)
            try {
              const msg = await importData(file)
              alert(msg)
              window.location.reload()
            } catch (e) {
              alert('导入失败：' + e)
            } finally {
              setImporting(false)
            }
          }
        }} disabled={importing} className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-text-secondary hover:bg-border/50 transition-colors disabled:opacity-50">
          <Upload size={14} /> {importing ? '导入中...' : '导入数据'}
        </button>
      </div>
    </aside>
  )
}

export function SidebarToggle() {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  if (sidebarOpen) return null
  return (
    <button onClick={toggleSidebar} className="fixed left-3 top-3 z-30 p-1.5 rounded-lg bg-surface border border-border shadow-sm hover:bg-surface-secondary text-text-secondary transition-colors" title="展开侧栏">
      <PanelLeft size={16} />
    </button>
  )
}
