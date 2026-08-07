import { CalendarDays, LayoutGrid, BarChart3, Timer, Sun, Moon, Download, Upload, Edit3, X, Plus, Settings } from 'lucide-react'
import type { ChangeEvent, RefObject } from 'react'
import type { Project, ProjectTag } from '../lib/types'
import { PROJECT_COLORS } from '../lib/constants'
import { THEME_PRESETS } from '../lib/theme'

export interface SettingsPanelProps {
  projects: Project[]
  currentProjectId: string
  projectTags: ProjectTag[]
  dark: boolean
  themePreset: string
  accentColor: string
  showThemePicker: boolean
  onSwitchProject: (id: string) => void
  onToggleDark: () => void
  onToggleThemePicker: () => void
  onSelectThemePreset: (id: string, accent: string) => void
  onSelectAccent: (color: string) => void
  onExport: () => void
  onImport: (e: ChangeEvent<HTMLInputElement>) => void
  importRef: RefObject<HTMLInputElement | null>
  renamingProject: string | null
  renameValue: string
  onRenameProject: (id: string) => void
  onStartRename: (p: Project) => void
  onDeleteProject: (id: string) => void
  onCreateProject: (name: string, color: string) => void
  showCreateForm: boolean
  newProjectName: string
  newProjectColor: string
  onShowCreateForm: (v: boolean) => void
  onNewProjectName: (v: string) => void
  onNewProjectColor: (c: string) => void
  showTagManager: boolean
  onRenameValueChange: (v: string) => void
  onCancelRename: () => void
  onToggleTagManager: () => void
  onDeleteTag: (id: string) => void
  onCreateTag: () => void
  newTagName: string
  newTagColor: string
  onNewTagName: (v: string) => void
  onNewTagColor: (c: string) => void
  onShowStats: () => void
  onShowPomodoro: () => void
  onShowViewToggle: () => void
  viewMode: 'grid' | 'timeline'
}

const SECTION_CLS = 'bg-[var(--bg-surface)]/40 backdrop-blur-sm rounded-xl border border-[var(--border-item)]/40 p-4 mb-4'
const SECTION_TITLE_CLS = 'text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-2'

export function SettingsPanel(props: SettingsPanelProps) {
  const {
    projects, currentProjectId, projectTags, dark, themePreset, accentColor, showThemePicker,
    onSwitchProject, onToggleDark, onToggleThemePicker, onSelectThemePreset, onSelectAccent,
    onExport, onImport, importRef,
    renamingProject, renameValue, onRenameProject, onStartRename, onDeleteProject,
    onCreateProject, showCreateForm, newProjectName, newProjectColor,
    onShowCreateForm, onNewProjectName, onNewProjectColor,
    onRenameValueChange, onCancelRename,
    showTagManager, onToggleTagManager, onDeleteTag, onCreateTag,
    newTagName, newTagColor, onNewTagName, onNewTagColor,
    onShowStats, onShowPomodoro, onShowViewToggle, viewMode,
  } = props

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <Settings size={18} className="text-[var(--accent)]" />
        <h1 className="text-lg font-bold text-stone-800 dark:text-stone-200">设置</h1>
      </div>

      {/* 项目管理 */}
      <div className={SECTION_CLS}>
        <h2 className={SECTION_TITLE_CLS}>项目管理</h2>
        <div className="space-y-0.5 mb-2">
          {projects.map(p => (
            <div key={p.id}
              className={'flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all group ' + (currentProjectId === p.id ? 'bg-[var(--accent)]/8 text-[var(--accent)]' : 'hover:bg-[var(--bg-surface)] text-stone-600 dark:text-stone-400')}>
              <button onClick={() => onSwitchProject(p.id)}
                className="flex items-center gap-2 flex-1 min-w-0 text-left">
                <span className={'w-2 h-2 rounded-full shrink-0 ' + (currentProjectId === p.id ? 'scale-125 ring-2 ring-offset-1 ring-[var(--accent)]/20' : '')} style={{ backgroundColor: p.color }} />
                {renamingProject === p.id ? (
                  <input autoFocus value={renameValue} onChange={e => onRenameValueChange(e.target.value)}
                    onBlur={() => onRenameProject(p.id)}
                    onKeyDown={e => { if (e.key === 'Enter') onRenameProject(p.id); if (e.key === 'Escape') onCancelRename() }}
                    className="flex-1 text-xs bg-transparent border-b border-[var(--accent)] outline-none px-0 py-0 min-w-[40px] text-inherit"
                    onClick={e => e.stopPropagation()} />
                ) : (
                  <span className="truncate text-xs font-medium">{p.name}</span>
                )}
              </button>
              <button onClick={e => { e.stopPropagation(); onStartRename(p) }}
                className="opacity-0 group-hover:opacity-100 hover:text-[var(--accent)] transition-all p-0.5 shrink-0">
                <Edit3 size={13} />
              </button>
              <button onClick={e => { e.stopPropagation(); onDeleteProject(p.id) }}
                className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all p-0.5 shrink-0">
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
        {showCreateForm ? (
          <div className="px-2 py-2 space-y-2 bg-[var(--bg-surface)]/50 rounded-lg">
            <input autoFocus value={newProjectName} onChange={e => onNewProjectName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') onCreateProject(newProjectName, newProjectColor); if (e.key === 'Escape') { onShowCreateForm(false); onNewProjectName('') } }}
              placeholder="项目名称"
              className="w-full text-xs bg-[var(--bg-card-start)] border border-[var(--border-item)] rounded-lg px-2 py-1.5 outline-none focus:border-[var(--accent)] text-stone-700 dark:text-stone-300 placeholder-stone-400"
            />
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                {PROJECT_COLORS.slice(0, 5).map(c => (
                  <button key={c} onClick={() => onNewProjectColor(c)}
                    className={'w-3.5 h-3.5 rounded-full transition-all ' + (newProjectColor === c ? 'ring-2 ring-offset-1 ring-[var(--accent)]/40 scale-110' : 'hover:scale-110')}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
              <div className="flex gap-1">
                <button onClick={() => onCreateProject(newProjectName, newProjectColor)}
                  className="px-2 py-1 text-[10px] font-semibold bg-[var(--accent)] text-white rounded-lg hover:brightness-110 transition-all">
                  创建
                </button>
                <button onClick={() => { onShowCreateForm(false); onNewProjectName('') }}
                  className="px-2 py-1 text-[10px] font-semibold bg-[var(--bg-surface)] text-stone-500 dark:text-stone-400 rounded-lg hover:bg-[var(--bg-surface-hover)] transition-all">
                  取消
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button onClick={() => onShowCreateForm(true)}
            className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-stone-500 dark:text-stone-400 hover:text-[var(--accent)] hover:bg-[var(--bg-surface)] rounded-lg transition-all">
            <Plus size={12} /> 新建项目
          </button>
        )}
      </div>

      {/* 标签管理 */}
      <div className={SECTION_CLS}>
        <div className="flex items-center">
          <h2 className={SECTION_TITLE_CLS + ' mb-0'}>标签管理</h2>
          <button onClick={onToggleTagManager}
            className={'ml-auto text-[10px] px-1.5 py-0.5 rounded-md transition-all ' + (showTagManager ? 'text-[var(--accent)] bg-[var(--accent)]/8' : 'text-stone-400 dark:text-stone-500 hover:text-[var(--accent)]')}>
            {showTagManager ? '收起' : '展开'}
          </button>
        </div>
        {showTagManager && (
          <div className="mt-1 px-2 py-2 space-y-2 bg-[var(--bg-surface)]/50 rounded-lg">
            {projectTags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {projectTags.map(t => (
                  <span key={t.id} className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded text-white font-medium" style={{ backgroundColor: t.color }}>
                    {t.name}
                    <button onClick={() => onDeleteTag(t.id)} className="text-white/50 hover:text-white transition-colors">
                      <X size={8} />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-stone-400 dark:text-stone-500">暂无标签</p>
            )}
            <div className="flex items-center gap-1.5">
              <input value={newTagName} onChange={e => onNewTagName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') onCreateTag() }}
                placeholder="新标签"
                className="flex-1 text-[10px] bg-[var(--bg-card-start)] border border-[var(--border-item)] rounded px-2 py-1 outline-none focus:border-[var(--accent)] text-stone-700 dark:text-stone-300 placeholder-stone-400" />
              <div className="flex gap-0.5">
                {['#e03e3e','#e07a3e','#e0b03e','#3eb07a','#3e7ae0','#6a3ee0','#e03e7a','#7a8e9a'].map(c => (
                  <button key={c} onClick={() => onNewTagColor(c)}
                    className={'w-3 h-3 rounded-full transition-all ' + (newTagColor === c ? 'ring-2 ring-offset-1 ring-[var(--accent)]/40 scale-110' : 'hover:scale-110')}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
              <button onClick={onCreateTag}
                className="p-1 rounded text-stone-400 hover:text-[var(--accent)] transition-colors">
                <Plus size={12} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 功能入口 */}
      <div className={SECTION_CLS}>
        <h2 className={SECTION_TITLE_CLS}>功能入口</h2>
        <div className="space-y-0.5">
          <button onClick={onShowViewToggle}
            className={'w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-lg transition-all ' + (viewMode === 'timeline' ? 'text-[var(--accent)] bg-[var(--accent)]/8' : 'text-stone-500 dark:text-stone-400 hover:text-[var(--accent)] hover:bg-[var(--bg-surface)]')}>
            {viewMode === 'grid' ? <CalendarDays size={13} /> : <LayoutGrid size={13} />}
            {viewMode === 'grid' ? '时间线视图' : '卡片视图'}
          </button>
          <button onClick={onShowStats}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-lg transition-all text-stone-500 dark:text-stone-400 hover:text-[var(--accent)] hover:bg-[var(--bg-surface)]">
            <BarChart3 size={13} /> 统计看板
          </button>
          <button onClick={onShowPomodoro}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-lg transition-all text-stone-500 dark:text-stone-400 hover:text-[var(--accent)] hover:bg-[var(--bg-surface)]">
            <Timer size={13} /> 番茄钟
          </button>
        </div>
      </div>

      {/* 外观 */}
      <div className={SECTION_CLS}>
        <h2 className={SECTION_TITLE_CLS}>外观</h2>
        <div className="space-y-1">
          <button onClick={onToggleDark}
            className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-[var(--bg-surface-hover)] transition-colors">
            <span className="flex items-center gap-2 text-xs font-medium text-stone-600 dark:text-stone-400">
              {dark ? <Sun size={13} className="text-[var(--accent)]" /> : <Moon size={13} className="text-[var(--accent)]" />}
              深色模式
            </span>
            <span className={'w-9 h-5 rounded-full p-0.5 transition-colors ' + (dark ? 'bg-[var(--accent)]' : 'bg-stone-300 dark:bg-stone-600')}>
              <span className={'block w-4 h-4 rounded-full bg-white shadow transition-transform ' + (dark ? 'translate-x-4' : 'translate-x-0')} />
            </span>
          </button>
          <div>
            <button onClick={onToggleThemePicker}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-[var(--bg-surface-hover)] transition-colors">
              <span className="flex items-center gap-2 text-xs font-medium text-stone-600 dark:text-stone-400">
                <span className="block w-3 h-3 rounded-full border border-stone-300 dark:border-stone-600" style={{ backgroundColor: accentColor }} />
                主题预设与强调色
              </span>
              <span className={'text-[10px] text-stone-400 dark:text-stone-500 transition-transform ' + (showThemePicker ? 'rotate-180' : '')}>▾</span>
            </button>
            {showThemePicker && (
              <div className="mt-1 px-2 py-2 bg-[var(--bg-surface)]/50 rounded-lg animate-fade-in">
                <div className="grid grid-cols-5 gap-1 mb-2">
                  {THEME_PRESETS.map(p => (
                    <button key={p.id} onClick={() => onSelectThemePreset(p.id, p.accent)}
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
                    <button key={c} onClick={() => onSelectAccent(c)}
                      className={'w-4 h-4 rounded transition-all ' + (accentColor === c ? 'ring-2 ring-offset-1 ring-stone-400 dark:ring-offset-stone-800 scale-110' : 'hover:scale-110')}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 数据 */}
      <div className={SECTION_CLS}>
        <h2 className={SECTION_TITLE_CLS}>数据</h2>
        <div className="flex items-center gap-2">
          <button onClick={onExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--bg-surface)] text-stone-600 dark:text-stone-400 hover:text-[var(--accent)] hover:bg-[var(--bg-surface-hover)] transition-all">
            <Download size={13} /> 导出数据
          </button>
          <button onClick={() => importRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--bg-surface)] text-stone-600 dark:text-stone-400 hover:text-[var(--accent)] hover:bg-[var(--bg-surface-hover)] transition-all">
            <Upload size={13} /> 导入数据
          </button>
          <input ref={importRef} type="file" hidden accept=".json" onChange={onImport} />
        </div>
        <p className="mt-2 text-[10px] text-stone-400 dark:text-stone-500">导出备份到 JSON 文件；导入将覆盖当前项目所有数据。</p>
      </div>
    </div>
  )
}