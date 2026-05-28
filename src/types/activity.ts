export interface Activity {
  id: string
  card_id: string | null
  board_id: string
  action: string
  description: string
  created_at: string
}
