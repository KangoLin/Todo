import { Sprout } from 'lucide-react'
export function PetBasePlaceholder() {
  return (
    <div className="h-full min-h-[60dvh] flex flex-col items-center justify-center gap-3 text-stone-400 dark:text-stone-500">
      <div className="w-20 h-20 rounded-3xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center">
        <Sprout size={36} strokeWidth={1.5} className="text-[var(--accent)]/60" />
      </div>
      <p className="text-sm font-medium text-stone-500 dark:text-stone-400">土豆基地建设中</p>
      <p className="text-xs">宠物场景 / 商城 / 成长中心将在后续版本登场</p>
    </div>
  )
}
