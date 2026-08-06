export function hexToRgb(hex: string): string {
  const v = parseInt(hex.replace('#', ''), 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255].join(', ')
}

export function darken(hex: string, amt: number): string {
  const v = parseInt(hex.replace('#', ''), 16)
  const r = Math.max((v >> 16) - amt, 0)
  const g = Math.max(((v >> 8) & 255) - amt, 0)
  const b = Math.max((v & 255) - amt, 0)
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')
}

export function calcMinutes(start: string, end: string): number {
  if (!start || !end) return 0
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const diff = (eh * 60 + em) - (sh * 60 + sm)
  return diff > 0 ? diff : 0
}

export function formatDuration(min: number): string {
  if (min <= 0) return ''
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h${m}min`
}

export function timeToMinutes(t: string): number {
  if (!t) return 0
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export function genId(): string {
  return crypto.randomUUID()
}

export function formatDateLabel(d: string) {
  const dt = new Date(d)
  const today = new Date()
  const label = dt.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })
  if (dt.toDateString() === today.toDateString()) return label + ' · 今天'
  const yest = new Date(today); yest.setDate(yest.getDate() - 1)
  if (dt.toDateString() === yest.toDateString()) return label + ' · 昨天'
  return label
}
