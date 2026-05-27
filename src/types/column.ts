export interface Column {
  id: string
  board_id: string
  name: string
  sort_order: number
  wip_limit: number | null
  color: string
  created_at: string
}
