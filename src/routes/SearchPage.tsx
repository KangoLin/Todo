import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Search, ArrowRight } from 'lucide-react'
import { useSearch } from '../hooks/useSearch'

export default function SearchPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const { data: results } = useSearch(searchQuery)

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">搜索</h1>
      <div className="relative mb-6">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && setSearchQuery(query.trim())}
          placeholder="搜索卡片..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {searchQuery && results && (
        <div className="space-y-2">
          {results.length === 0 ? (
            <p className="text-center text-text-secondary py-12">没有找到匹配的卡片</p>
          ) : (
            results.map(r => (
              <div key={r.card_id} onClick={() => navigate(`/board/${r.board_id}`)} className="p-4 rounded-xl border border-border bg-surface hover:shadow-sm cursor-pointer transition-shadow">
                <div className="font-medium text-sm mb-1">{r.title}</div>
                {r.snippet && <div className="text-sm text-text-secondary line-clamp-2" dangerouslySetInnerHTML={{ __html: r.snippet }} />}
                <div className="flex items-center gap-1 mt-2 text-xs text-text-secondary">
                  <ArrowRight size={12} /> 跳转到看板
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
