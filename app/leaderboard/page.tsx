'use client'

import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import AppLayout from '@/app/components/AppLayout'
import { supabase } from '@/lib/supabase'

const POINTS_PER_TYPE: Record<string, number> = {
  send: 250,
  gift: 150,
  swap: 500,
  invoice: 500,
  payroll: 500,
}

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

const PAGE_SIZE = 10

type LeaderEntry = {
  address: string
  points: number
  txCount: number
}

export default function LeaderboardPage() {
  const { address } = useAccount()
  const [leaders, setLeaders] = useState<LeaderEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    setLoading(true)
    loadLeaderboard()
  }, [])

  async function loadLeaderboard() {
    // Tüm transaction'ları sayfalı çek (Supabase limit: 1000/istek)
    let allTxs: { sender_address: string; type: string }[] = []
    let from = 0
    const batchSize = 1000

    while (true) {
      const { data, error } = await supabase
        .from('transactions')
        .select('sender_address, type')
        .range(from, from + batchSize - 1)
      if (error || !data || data.length === 0) break
      allTxs = [...allTxs, ...data]
      if (data.length < batchSize) break
      from += batchSize
    }

    const { data: paidInvoices } = await supabase
      .from('invoices')
      .select('recipient_address')
      .eq('status', 'paid')

    if (allTxs.length === 0) { setLoading(false); return }

    const pointsMap: Record<string, { points: number; txCount: number }> = {}

    allTxs.forEach((tx) => {
      const addr = tx.sender_address.toLowerCase()
      if (!pointsMap[addr]) pointsMap[addr] = { points: 0, txCount: 0 }
      pointsMap[addr].points += POINTS_PER_TYPE[tx.type] ?? 0
      pointsMap[addr].txCount += 1
    })

    ;(paidInvoices || []).forEach((inv: { recipient_address: string }) => {
      const addr = inv.recipient_address.toLowerCase()
      if (!pointsMap[addr]) pointsMap[addr] = { points: 0, txCount: 0 }
      pointsMap[addr].points += 500
    })

    const sorted: LeaderEntry[] = Object.entries(pointsMap)
      .map(([address, v]) => ({ address, ...v }))
      .sort((a, b) => b.points - a.points)

    setLeaders(sorted)
    setLoading(false)
  }

  const totalPages = Math.ceil(leaders.length / PAGE_SIZE)
  const pageEntries = leaders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const myRank = leaders.findIndex((l) => l.address === address?.toLowerCase()) + 1

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-4">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>Leaderboard</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Rankings by task points</p>
        </div>

        {/* Your Rank */}
        {myRank > 0 && address && (
          <div className="rounded-xl px-5 py-3 mb-4" style={{ background: 'var(--card-gradient)', border: '1px solid transparent', boxShadow: 'var(--card-shadow)' }}>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--card-gradient-text)' }}>Your Rank</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="font-bold text-lg" style={{ color: 'var(--card-gradient-text)' }}>#{myRank}</span>
                <div>
                  <p className="text-xs mb-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>Address</p>
                  <span className="text-sm font-mono" style={{ color: 'var(--card-gradient-text)' }}>{address}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs mb-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>Points</p>
                <span className="font-bold" style={{ color: 'var(--card-gradient-text)' }}>
                  {leaders[myRank - 1]?.points.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {loading ? (
            <div className="p-8 text-center animate-pulse" style={{ color: 'var(--text-secondary)' }}>Loading...</div>
          ) : leaders.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-4xl mb-3">🏆</p>
              <p className="text-white font-medium">No data yet</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Rankings will appear as tasks are completed.</p>
            </div>
          ) : (
            <>
              <ul>
                {pageEntries.map((entry, i) => {
                  const rank = (currentPage - 1) * PAGE_SIZE + i + 1
                  const isMe = entry.address === address?.toLowerCase()
                  const isLast = i === pageEntries.length - 1
                  return (
                    <li
                      key={entry.address}
                      className={`flex items-center gap-4 px-6 py-4 transition-colors ${isMe ? 'border-l-2' : 'card-hover'}`}
                      style={{
                        ...(isLast ? {} : { borderBottom: '1px solid var(--border)' }),
                        ...(isMe ? { background: 'rgba(123,94,167,0.12)', borderLeftColor: 'var(--teal)' } : {}),
                      }}
                    >
                      {/* Rank */}
                      <div className="w-8 text-center flex-shrink-0">
                        {MEDALS[rank] ? (
                          <span className="text-xl">{MEDALS[rank]}</span>
                        ) : (
                          <span className="font-bold text-sm" style={{ color: 'var(--text-secondary)' }}>{rank}</span>
                        )}
                      </div>

                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                           style={isMe
                             ? { background: 'var(--purple)', color: '#fff' }
                             : { background: 'var(--bg-card-hover)', color: 'var(--text-secondary)' }}>
                        {entry.address.slice(2, 4).toUpperCase()}
                      </div>

                      {/* Address */}
                      <div className="flex-1">
                        <p className="text-sm font-medium" style={{ color: isMe ? 'var(--teal)' : 'var(--text-primary)' }}>
                          {entry.address.slice(0, 6)}...{entry.address.slice(-4)}
                        </p>
                      </div>

                      {/* Points */}
                      <div className="text-right">
                        <p className={`font-bold text-sm ${rank <= 3 ? 'text-yellow-400' : 'text-white'}`}>
                          {entry.points.toLocaleString()}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>pts</p>
                      </div>
                    </li>
                  )
                })}
              </ul>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: '1px solid var(--border)' }}>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, leaders.length)} / {leaders.length}
                  </p>
                  <div className="flex items-center gap-1">
                    {/* First */}
                    <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors"
                      style={{ background: 'var(--bg-card-hover)', color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-primary)', border: '1px solid var(--border)' }}>
                      «
                    </button>
                    {/* Prev */}
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors"
                      style={{ background: 'var(--bg-card-hover)', color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-primary)', border: '1px solid var(--border)' }}>
                      ‹
                    </button>

                    {/* Akıllı sayfa numaraları */}
                    {(() => {
                      const pages: (number | '...')[] = []
                      const delta = 2
                      const left  = Math.max(2, currentPage - delta)
                      const right = Math.min(totalPages - 1, currentPage + delta)

                      pages.push(1)
                      if (left > 2) pages.push('...')
                      for (let i = left; i <= right; i++) pages.push(i)
                      if (right < totalPages - 1) pages.push('...')
                      if (totalPages > 1) pages.push(totalPages)

                      return pages.map((page, idx) =>
                        page === '...' ? (
                          <span key={`dots-${idx}`} className="w-8 h-8 flex items-center justify-center text-sm"
                            style={{ color: 'var(--text-muted)' }}>…</span>
                        ) : (
                          <button key={page} onClick={() => setCurrentPage(page as number)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium transition-colors"
                            style={page === currentPage
                              ? { background: 'var(--teal)', color: '#fff', border: '1px solid transparent' }
                              : { background: 'var(--bg-card-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                            {page}
                          </button>
                        )
                      )
                    })()}

                    {/* Next */}
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors"
                      style={{ background: 'var(--bg-card-hover)', color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)', border: '1px solid var(--border)' }}>
                      ›
                    </button>
                    {/* Last */}
                    <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors"
                      style={{ background: 'var(--bg-card-hover)', color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)', border: '1px solid var(--border)' }}>
                      »
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
