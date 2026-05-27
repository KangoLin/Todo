import type { Subtask } from './subtask'
import type { Tag } from './tag'

export interface Card {
  id: string
  column_id: string
  title: string
  description: string
  sort_order: number
  priority: number
  due_date: string | null
  cover_color: string | null
  is_archived: number
  created_at: string
  updated_at: string
}

export interface CardDetail {
  card: Card
  subtasks: Subtask[]
  tags: Tag[]
}
