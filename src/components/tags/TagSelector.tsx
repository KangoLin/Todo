import * as Popover from '@radix-ui/react-popover'
import { Check, Plus, Tag as TagIcon } from 'lucide-react'
import { useTags, useCardTags, useAddTagToCard, useRemoveTagFromCard } from '../../hooks/useTags'
import { TagBadge } from './TagBadge'

interface TagSelectorProps {
  boardId: string
  cardId: string
  onManage?: () => void
}

export function TagSelector({ boardId, cardId, onManage }: TagSelectorProps) {

  const { data: allTags } = useTags(boardId)

  const { data: cardTags } = useCardTags(cardId)

  const addMut = useAddTagToCard()

  const removeMut = useRemoveTagFromCard()

  const cardTagIds = new Set(cardTags?.map(t => t.id) ?? [])

  const toggleTag = (tagId: string) => {
    if (cardTagIds.has(tagId)) {
      removeMut.mutate({ cardId, tagId })
    } else {
      addMut.mutate({ cardId, tagId })
    }
  }

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-surface-secondary text-text-secondary transition-colors">
          <TagIcon size={12} /> 标签
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          className="bg-surface border border-border rounded-xl shadow-lg p-3 w-56 z-50"
        >
          <div className="text-xs font-medium text-text-secondary mb-2">选择标签</div>
          {cardTags && cardTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3 pb-3 border-b border-border">
              {cardTags.map(t => (
                <TagBadge key={t.id} name={t.name} color={t.color} onRemove={() => removeMut.mutate({ cardId, tagId: t.id })} />
              ))}
            </div>
          )}
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {allTags?.map(t => (
              <button
                key={t.id}
                onClick={() => toggleTag(t.id)}
                className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-lg text-sm hover:bg-surface-secondary transition-colors"
              >
                <div className="w-4 h-4 rounded border border-border flex items-center justify-center shrink-0">
                  {cardTagIds.has(t.id) && <Check size={12} className="text-primary" />}
                </div>
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                <span className="flex-1 truncate">{t.name}</span>
              </button>
            ))}
            {(!allTags || allTags.length === 0) && (
              <div className="text-xs text-text-secondary/50 py-2 text-center">暂无标签</div>
            )}
          </div>
          {onManage && (
            <button
              onClick={onManage}
              className="flex items-center gap-1 w-full mt-2 pt-2 border-t border-border text-xs text-text-secondary hover:text-text transition-colors"
            >
              <Plus size={12} /> 管理标签
            </button>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
