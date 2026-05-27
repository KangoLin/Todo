interface TagBadgeProps {
  name: string
  color: string
  onRemove?: () => void
}

export function TagBadge({ name, color, onRemove }: TagBadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs text-white font-medium"
      style={{ backgroundColor: color }}
    >
      {name}
      {onRemove && (
        <button onClick={onRemove} className="hover:text-white/80 leading-none">×</button>
      )}
    </span>
  )
}
