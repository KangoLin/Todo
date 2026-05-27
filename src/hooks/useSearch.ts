import { useQuery } from '@tanstack/react-query'
import { searchCards } from '../lib/tauri-api'

export function useSearch(query: string) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: () => searchCards(query),
    enabled: query.length > 0,
  })
}
