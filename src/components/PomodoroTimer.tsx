import { useState, useEffect, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Timer, X, Play, Pause, RotateCcw } from 'lucide-react'
import { formatDuration } from '../lib/utils'

export function PomodoroTimer({ onClose }: { onClose: () => void }) {
  const [workDuration, setWorkDuration] = useState(() => { const v = localStorage.getItem('pomodoroWork'); return v ? parseInt(v) : 25 })
  const [breakDuration, setBreakDuration] = useState(() => { const v = localStorage.getItem('pomodoroBreak'); return v ? parseInt(v) : 5 })
  const [editingWork, setEditingWork] = useState(false)
  const [editingBreak, setEditingBreak] = useState(false)
  const [mode, setMode] = useState<'work' | 'break'>('work')
  const [minutes, setMinutes] = useState(workDuration)
  const [seconds, setSeconds] = useState(0)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [pomodoroStats, setPomodoroStats] = useState<PomodoroStats | null>(null)
  const modeRef = useRef(mode)
  modeRef.current = mode

  useEffect(() => { loadStats() }, [])
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h) }, [onClose])
  useEffect(() => { return () => { if (intervalRef.current) clearInterval(intervalRef.current) } }, [])
  useEffect(() => { setMinutes(mode === 'work' ? workDuration : breakDuration); setSeconds(0) }, [workDuration, breakDuration])

  const saveWork = (v: number) => { const d = Math.max(1, Math.min(120, v)); setWorkDuration(d); localStorage.setItem('pomodoroWork', String(d)); setEditingWork(false) }
  const saveBreak = (v: number) => { const d = Math.max(1, Math.min(60, v)); setBreakDuration(d); localStorage.setItem('pomodoroBreak', String(d)); setEditingBreak(false) }

  const loadStats = async () => {
    try { const s = await invoke<PomodoroStats>('get_pomodoro_stats'); setPomodoroStats(s) } catch {}
  }

  const start = () => {
    setRunning(true)
    intervalRef.current = setInterval(() => {
      setSeconds(prev => {
        if (prev > 0) return prev - 1
        setMinutes(m => {
          if (m > 0) return m - 1
          setRunning(false)
          const currentMode = modeRef.current
          const nextMode = currentMode === 'work' ? 'break' : 'work'
          setMode(nextMode)
          if (currentMode === 'work') {
            invoke('log_pomodoro', { item_id: '', duration_minutes: workDuration }).catch(() => {})
            loadStats()
          }
          return nextMode === 'work' ? workDuration : breakDuration
        })
        return 59
      })
    }, 1000)
  }

  const pause = () => { setRunning(false); if (intervalRef.current) clearInterval(intervalRef.current) }

  const switchMode = (newMode: 'work' | 'break') => {
    pause(); setMode(newMode); setMinutes(newMode === 'work' ? workDuration : breakDuration); setSeconds(0)
  }

  const reset = () => switchMode('work')

  const totalSeconds = minutes * 60 + seconds
  const total = (mode === 'work' ? workDuration : breakDuration) * 60
  const progress = total > 0 ? (total - totalSeconds) / total * 100 : 0

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}>
      <div className="bg-gradient-to-b from-[var(--bg-card-start)] to-[var(--bg-surface-hover)] border border-[var(--border-card)] rounded-xl shadow-[0_8px_32px_rgb(var(--shadow-rgb)/var(--shadow-modal-opacity))] max-w-sm w-full p-6 animate-scale-in"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Timer size={18} className="text-[var(--accent)]" />
            <h2 className="text-lg font-bold text-stone-800 dark:text-stone-200">番茄钟</h2>
          </div>
          <button onClick={onClose} className="text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Duration settings */}
        <div className="flex items-center gap-3 bg-[var(--bg-surface)] rounded-lg p-2 mb-5">
          <div className="flex-1 flex items-center gap-1.5">
            <span className="text-[10px] text-stone-500 dark:text-stone-400 font-medium">专注</span>
            {editingWork ? (
              <input autoFocus type="number" min={1} max={120} defaultValue={workDuration}
                onBlur={e => saveWork(parseInt(e.target.value) || workDuration)}
                onKeyDown={e => { if (e.key === 'Enter') saveWork(parseInt((e.target as HTMLInputElement).value) || workDuration); if (e.key === 'Escape') setEditingWork(false) }}
                className="w-12 text-xs text-center bg-white dark:bg-stone-700 border border-[var(--border-item)] rounded-md px-1 py-1 outline-none focus:border-[var(--accent)] text-stone-700 dark:text-stone-300 tabular-nums" />
            ) : (
              <button onClick={() => { if (!running) setEditingWork(true) }}
                className={'text-sm font-bold tabular-nums px-2 py-0.5 rounded-md transition-all ' + (mode === 'work' ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700')}>
                {workDuration}<span className="text-[10px] font-normal ml-0.5">分</span>
              </button>
            )}
          </div>
          <div className="flex-1 flex items-center gap-1.5">
            <span className="text-[10px] text-stone-500 dark:text-stone-400 font-medium">休息</span>
            {editingBreak ? (
              <input autoFocus type="number" min={1} max={60} defaultValue={breakDuration}
                onBlur={e => saveBreak(parseInt(e.target.value) || breakDuration)}
                onKeyDown={e => { if (e.key === 'Enter') saveBreak(parseInt((e.target as HTMLInputElement).value) || breakDuration); if (e.key === 'Escape') setEditingBreak(false) }}
                className="w-12 text-xs text-center bg-white dark:bg-stone-700 border border-[var(--border-item)] rounded-md px-1 py-1 outline-none focus:border-[var(--accent)] text-stone-700 dark:text-stone-300 tabular-nums" />
            ) : (
              <button onClick={() => { if (!running) setEditingBreak(true) }}
                className={'text-sm font-bold tabular-nums px-2 py-0.5 rounded-md transition-all ' + (mode === 'break' ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700')}>
                {breakDuration}<span className="text-[10px] font-normal ml-0.5">分</span>
              </button>
            )}
          </div>
          {/* Mode toggle */}
          <div className="flex bg-[var(--bg-card-start)] rounded-md p-0.5">
            <button onClick={() => switchMode('work')}
              className={'text-[10px] font-semibold px-2.5 py-1 rounded transition-all ' + (mode === 'work' ? 'bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-200 shadow-sm' : 'text-stone-400 dark:text-stone-500 hover:text-stone-600')}>
              专注
            </button>
            <button onClick={() => switchMode('break')}
              className={'text-[10px] font-semibold px-2.5 py-1 rounded transition-all ' + (mode === 'break' ? 'bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-200 shadow-sm' : 'text-stone-400 dark:text-stone-500 hover:text-stone-600')}>
              休息
            </button>
          </div>
        </div>

        {/* Timer display */}
        <div className="relative w-48 h-48 mx-auto mb-6">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="var(--border-item)" strokeWidth="6" />
            <circle cx="50" cy="50" r="45" fill="none" stroke="var(--accent)" strokeWidth="6"
              strokeDasharray={`${progress * 2.83} ${283 - progress * 2.83}`}
              strokeLinecap="round" className="transition-all duration-1000" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold tabular-nums text-stone-800 dark:text-stone-200">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
            <span className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              {mode === 'work' ? '专注中' : '休息中'}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 mb-6">
          {!running ? (
            <button onClick={start}
              className="flex items-center gap-2 px-6 py-2 bg-[var(--accent)] text-white text-sm font-semibold rounded-lg hover:brightness-110 transition-all active:scale-[0.95]">
              <Play size={16} /> 开始
            </button>
          ) : (
            <button onClick={pause}
              className="flex items-center gap-2 px-6 py-2 bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 text-sm font-semibold rounded-lg hover:bg-stone-300 dark:hover:bg-stone-600 transition-all active:scale-[0.95]">
              <Pause size={16} /> 暂停
            </button>
          )}
          <button onClick={reset}
            className="p-2 rounded-lg text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-400 hover:bg-stone-200/50 dark:hover:bg-stone-700/50 transition-all"
            title="重置">
            <RotateCcw size={16} />
          </button>
        </div>

        {/* Stats */}
        {pomodoroStats && (
          <div className="flex items-center justify-around bg-[var(--bg-surface)] rounded-lg p-3 text-center">
            <div>
              <div className="text-lg font-bold text-[var(--accent)]">{pomodoroStats.today_sessions}</div>
              <div className="text-[10px] text-stone-500 dark:text-stone-400">今日专注</div>
            </div>
            <div className="w-px h-8 bg-[var(--border-divider)]/40" />
            <div>
              <div className="text-lg font-bold text-emerald-500">{formatDuration(pomodoroStats.today_minutes)}</div>
              <div className="text-[10px] text-stone-500 dark:text-stone-400">今日时长</div>
            </div>
            <div className="w-px h-8 bg-[var(--border-divider)]/40" />
            <div>
              <div className="text-lg font-bold text-stone-600 dark:text-stone-400">{pomodoroStats.total_sessions}</div>
              <div className="text-[10px] text-stone-500 dark:text-stone-400">总计</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export interface PomodoroStats {
  total_sessions: number
  total_minutes: number
  today_sessions: number
  today_minutes: number
}
