import { useEffect } from 'react'

type ShortcutHandler = () => void
type ShortcutMap = Record<string, ShortcutHandler>

function isModKey(e: KeyboardEvent): boolean {
  return e.metaKey || e.ctrlKey
}

export function useKeyboardShortcuts(shortcuts: ShortcutMap, enabled = true) {
  useEffect(() => {
    if (!enabled) return

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      const parts: string[] = []
      if (isModKey(e)) parts.push('mod')
      if (e.shiftKey) parts.push('shift')
      if (e.altKey) parts.push('alt')
      const key = e.key === 'Escape' ? 'escape' : e.key === 'Enter' ? 'enter' : e.key.toLowerCase()
      parts.push(key)
      const combo = parts.join('+')

      const handler_ = shortcuts[combo]
      if (handler_) {
        if (combo === 'escape' || (isModKey(e) && key !== 'escape') || (key === '?')) {
          e.preventDefault()
          handler_()
          return
        }
        if (!isInput) {
          e.preventDefault()
          handler_()
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [shortcuts, enabled])
}
