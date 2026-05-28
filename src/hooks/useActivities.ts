import { useQuery } from '@tanstack/react-query'
import { getActivitiesByBoard } from '../lib/tauri-api'

export function useActivities(boardId: string | undefined) {
  return useQuery({
    queryKey: ['activities', boardId],
    queryFn: () => getActivitiesByBoard(boardId!),
    enabled: !!boardId,
  })
}
