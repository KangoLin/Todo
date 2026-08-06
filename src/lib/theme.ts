import type { ThemePreset } from './types'
import { hexToRgb, darken } from './utils'

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'terracotta', label: '陶土',
    accent: '#c2410c',
    light: {
      '--bg-page': '#f2ece4', '--bg-page-to': '#e2d6c9',
      '--bg-card-start': '#ffffff', '--bg-surface': '#f3ede8', '--bg-surface-hover': '#faf7f5',
      '--border-card': '#e0d8ce', '--border-item': '#e8e0d9', '--border-dashed': '#ddd5cc', '--border-divider': '#d6d3d1', '--border-time': 'rgba(168,162,158,0.38)',
      '--text-primary': '#292524', '--text-secondary': '#78716c', '--text-muted': '#a8a29e', '--text-dim': '#d6d3d1', '--text-placeholder': '#a8a29e',
      '--input-bg': '#ffffff', '--time-bg': 'rgba(255,255,255,0.8)', '--time-text': '#57534e',
      '--grip': '#a8a29e', '--shadow-rgb': '160,130,100',
      '--bg-done': '#fff1f2', '--bg-done-hover': '#ffe4e6', '--border-done': '#fecdd3', '--border-done-accent': '#fda4af',
      '--rose-50': '#fff1f2', '--rose-100': '#ffe4e6', '--rose-200': '#fecdd3', '--rose-300': '#fda4af',
    },
    dark: {
      '--bg-page': '#0b0d14', '--bg-page-to': '#0f111a',
      '--bg-card-start': '#141723', '--bg-surface': '#1c1f2d', '--bg-surface-hover': '#232638',
      '--border-card': '#1e2233', '--border-item': '#1e2233', '--border-dashed': '#282c3f', '--border-divider': '#282c3f', '--border-time': 'rgba(40,44,63,0.6)',
      '--text-primary': '#e2e5ee', '--text-secondary': '#949aaf', '--text-muted': '#696f88', '--text-dim': '#404562', '--text-placeholder': '#404562',
      '--input-bg': '#141723', '--time-bg': 'rgba(20,23,39,0.7)', '--time-text': '#949aaf',
      '--grip': '#404562', '--shadow-rgb': '0,2,24',
      '--bg-done': '#110f24', '--bg-done-hover': '#181533', '--border-done': '#292152', '--border-done-accent': '#4a3a8a',
      '--rose-50': '#110f24', '--rose-100': '#181533', '--rose-200': '#292152', '--rose-300': '#4a3a8a',
    },
  },
  {
    id: 'ocean', label: '海洋',
    accent: '#2563eb',
    light: {
      '--bg-page': '#eff6ff', '--bg-page-to': '#dbeafe',
      '--bg-card-start': '#ffffff', '--bg-surface': '#f0f5ff', '--bg-surface-hover': '#f8faff',
      '--border-card': '#d4e0f0', '--border-item': '#dce6f2', '--border-dashed': '#d4e0f0', '--border-divider': '#c8d6e8', '--border-time': 'rgba(100,140,180,0.3)',
      '--text-primary': '#1e293b', '--text-secondary': '#64748b', '--text-muted': '#94a3b8', '--text-dim': '#cbd5e1', '--text-placeholder': '#94a3b8',
      '--input-bg': '#ffffff', '--time-bg': 'rgba(255,255,255,0.8)', '--time-text': '#475569',
      '--grip': '#94a3b8', '--shadow-rgb': '100,140,180',
      '--bg-done': '#f0fdf4', '--bg-done-hover': '#dcfce7', '--border-done': '#bbf7d0', '--border-done-accent': '#86efac',
      '--rose-50': '#f0fdf4', '--rose-100': '#dcfce7', '--rose-200': '#bbf7d0', '--rose-300': '#86efac',
    },
    dark: {
      '--bg-page': '#0c1222', '--bg-page-to': '#10182e',
      '--bg-card-start': '#141e33', '--bg-surface': '#1a2640', '--bg-surface-hover': '#1f2e4d',
      '--border-card': '#1e2d4a', '--border-item': '#1e2d4a', '--border-dashed': '#263858', '--border-divider': '#263858', '--border-time': 'rgba(30,45,74,0.6)',
      '--text-primary': '#dce6f2', '--text-secondary': '#8a9fc0', '--text-muted': '#5e7aa0', '--text-dim': '#3a5070', '--text-placeholder': '#3a5070',
      '--input-bg': '#141e33', '--time-bg': 'rgba(20,30,51,0.7)', '--time-text': '#8a9fc0',
      '--grip': '#3a5070', '--shadow-rgb': '0,8,32',
      '--bg-done': '#0a1f10', '--bg-done-hover': '#0f2a18', '--border-done': '#1a4030', '--border-done-accent': '#2a6050',
      '--rose-50': '#0a1f10', '--rose-100': '#0f2a18', '--rose-200': '#1a4030', '--rose-300': '#2a6050',
    },
  },
  {
    id: 'forest', label: '森林',
    accent: '#059669',
    light: {
      '--bg-page': '#ecfdf5', '--bg-page-to': '#d1fae5',
      '--bg-card-start': '#ffffff', '--bg-surface': '#f0faf4', '--bg-surface-hover': '#f6fdf8',
      '--border-card': '#c8e6d6', '--border-item': '#d4ede0', '--border-dashed': '#c8e6d6', '--border-divider': '#b8dccc', '--border-time': 'rgba(80,160,120,0.3)',
      '--text-primary': '#1a2e1a', '--text-secondary': '#4a7a5a', '--text-muted': '#7aaa8a', '--text-dim': '#b8dccc', '--text-placeholder': '#7aaa8a',
      '--input-bg': '#ffffff', '--time-bg': 'rgba(255,255,255,0.8)', '--time-text': '#3a6a4a',
      '--grip': '#7aaa8a', '--shadow-rgb': '80,140,100',
      '--bg-done': '#fef2f2', '--bg-done-hover': '#fee2e2', '--border-done': '#fecaca', '--border-done-accent': '#fca5a5',
      '--rose-50': '#fef2f2', '--rose-100': '#fee2e2', '--rose-200': '#fecaca', '--rose-300': '#fca5a5',
    },
    dark: {
      '--bg-page': '#0a1a12', '--bg-page-to': '#0e2218',
      '--bg-card-start': '#12241a', '--bg-surface': '#182e22', '--bg-surface-hover': '#1d382a',
      '--border-card': '#1e3a2a', '--border-item': '#1e3a2a', '--border-dashed': '#264a34', '--border-divider': '#264a34', '--border-time': 'rgba(30,58,42,0.6)',
      '--text-primary': '#d4ede0', '--text-secondary': '#7ab08a', '--text-muted': '#4a8a5a', '--text-dim': '#2a5a3a', '--text-placeholder': '#2a5a3a',
      '--input-bg': '#12241a', '--time-bg': 'rgba(18,36,26,0.7)', '--time-text': '#7ab08a',
      '--grip': '#2a5a3a', '--shadow-rgb': '0,24,16',
      '--bg-done': '#1f0a0a', '--bg-done-hover': '#2a1010', '--border-done': '#3a1a1a', '--border-done-accent': '#5a2a2a',
      '--rose-50': '#1f0a0a', '--rose-100': '#2a1010', '--rose-200': '#3a1a1a', '--rose-300': '#5a2a2a',
    },
  },
  {
    id: 'twilight', label: '暮色',
    accent: '#7c3aed',
    light: {
      '--bg-page': '#f5f3ff', '--bg-page-to': '#ede9fe',
      '--bg-card-start': '#ffffff', '--bg-surface': '#f4f0ff', '--bg-surface-hover': '#faf8ff',
      '--border-card': '#dad4f0', '--border-item': '#e2dcf2', '--border-dashed': '#dad4f0', '--border-divider': '#cec8e8', '--border-time': 'rgba(140,120,180,0.3)',
      '--text-primary': '#1e1b2e', '--text-secondary': '#6b5a8a', '--text-muted': '#9a8aba', '--text-dim': '#ccc0e0', '--text-placeholder': '#9a8aba',
      '--input-bg': '#ffffff', '--time-bg': 'rgba(255,255,255,0.8)', '--time-text': '#4a3a6a',
      '--grip': '#9a8aba', '--shadow-rgb': '120,100,160',
      '--bg-done': '#f0fdf4', '--bg-done-hover': '#dcfce7', '--border-done': '#bbf7d0', '--border-done-accent': '#86efac',
      '--rose-50': '#f0fdf4', '--rose-100': '#dcfce7', '--rose-200': '#bbf7d0', '--rose-300': '#86efac',
    },
    dark: {
      '--bg-page': '#0e0a1a', '--bg-page-to': '#141026',
      '--bg-card-start': '#16142e', '--bg-surface': '#1e1a38', '--bg-surface-hover': '#262246',
      '--border-card': '#24204a', '--border-item': '#24204a', '--border-dashed': '#2e2a58', '--border-divider': '#2e2a58', '--border-time': 'rgba(36,32,74,0.6)',
      '--text-primary': '#dad4f0', '--text-secondary': '#8a7ab0', '--text-muted': '#5a4a80', '--text-dim': '#3a2a60', '--text-placeholder': '#3a2a60',
      '--input-bg': '#16142e', '--time-bg': 'rgba(22,20,46,0.7)', '--time-text': '#8a7ab0',
      '--grip': '#3a2a60', '--shadow-rgb': '8,0,32',
      '--bg-done': '#0a1f10', '--bg-done-hover': '#0f2a18', '--border-done': '#1a4030', '--border-done-accent': '#2a6050',
      '--rose-50': '#0a1f10', '--rose-100': '#0f2a18', '--rose-200': '#1a4030', '--rose-300': '#2a6050',
    },
  },
  {
    id: 'slate', label: '石板',
    accent: '#78716c',
    light: {
      '--bg-page': '#f8fafc', '--bg-page-to': '#f1f5f9',
      '--bg-card-start': '#ffffff', '--bg-surface': '#f4f6f8', '--bg-surface-hover': '#fafbfc',
      '--border-card': '#d4d8e0', '--border-item': '#dce0e8', '--border-dashed': '#d4d8e0', '--border-divider': '#c8cce0', '--border-time': 'rgba(120,130,150,0.3)',
      '--text-primary': '#1e293b', '--text-secondary': '#64748b', '--text-muted': '#94a3b8', '--text-dim': '#cbd5e1', '--text-placeholder': '#94a3b8',
      '--input-bg': '#ffffff', '--time-bg': 'rgba(255,255,255,0.8)', '--time-text': '#475569',
      '--grip': '#94a3b8', '--shadow-rgb': '100,120,140',
      '--bg-done': '#f0fdf4', '--bg-done-hover': '#dcfce7', '--border-done': '#bbf7d0', '--border-done-accent': '#86efac',
      '--rose-50': '#f0fdf4', '--rose-100': '#dcfce7', '--rose-200': '#bbf7d0', '--rose-300': '#86efac',
    },
    dark: {
      '--bg-page': '#0a0c10', '--bg-page-to': '#0e1018',
      '--bg-card-start': '#131620', '--bg-surface': '#1a1d2a', '--bg-surface-hover': '#202436',
      '--border-card': '#1e2230', '--border-item': '#1e2230', '--border-dashed': '#262a3e', '--border-divider': '#262a3e', '--border-time': 'rgba(30,34,48,0.6)',
      '--text-primary': '#dce0e8', '--text-secondary': '#8a90a0', '--text-muted': '#5a6070', '--text-dim': '#3a3e50', '--text-placeholder': '#3a3e50',
      '--input-bg': '#131620', '--time-bg': 'rgba(19,22,32,0.7)', '--time-text': '#8a90a0',
      '--grip': '#3a3e50', '--shadow-rgb': '0,2,16',
      '--bg-done': '#0a1f10', '--bg-done-hover': '#0f2a18', '--border-done': '#1a4030', '--border-done-accent': '#2a6050',
      '--rose-50': '#0a1f10', '--rose-100': '#0f2a18', '--rose-200': '#1a4030', '--rose-300': '#2a6050',
    },
  },
]

export function applyTheme(presetId: string, accent: string, isDark: boolean) {
  const preset = THEME_PRESETS.find(p => p.id === presetId) || THEME_PRESETS[0]
  const vars = isDark ? preset.dark : preset.light
  const root = document.documentElement
  for (const [key, val] of Object.entries(vars)) {
    root.style.setProperty(key, val)
  }
  const rgb = hexToRgb(accent)
  root.style.setProperty('--accent', accent)
  root.style.setProperty('--accent-from', darken(accent, 18))
  root.style.setProperty('--accent-rgb', rgb)
  root.style.setProperty('--accent-muted', `rgba(${rgb}, 0.85)`)
  root.style.setProperty('--accent-focus', `rgba(${rgb}, 0.08)`)
}