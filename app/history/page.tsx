'use client'

import { useEffect, useState, useMemo } from 'react'
import { useAccount } from 'wagmi'
import AppLayout from '@/app/components/AppLayout'
import { supabase, type Transaction } from '@/lib/supabase'

const TYPE_LABELS: Record<string, string> = {
  send: 'Agent Send',
  invoice: 'Invoice',
  gift: 'Gift',
  payroll: 'Payroll',
}

const TYPE_EMOJI: Record<string, string> = {
  send: '💸',
  invoice: '🧾',
  gift: '🎁',
  payroll: '💰',
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
}

type TxWithDir = Transaction & { direction: 'out' | 'in' }

const PAGE_SIZE = 5

export default function HistoryPage() {
  const { address } = useAccount()
  const [txs, setTxs] = useState<TxWithDir[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)

  // Filters
  const [dirFilter, setDirFilter] = useState<'all' | 'in' | 'out'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'send' | 'invoice' | 'gift' | 'payroll'>('all')

  useEffect(() => {
    if (!address) return
    setLoading(true)

    async function loadHistory() {
      const [{ data: sent }, { data: received }] = await Promise.all([
        supabase.from('transactions').select('*').eq('sender_address', address!.toLowerCase()).order('created_at', { ascending: false }),
        supabase.from('transactions').select('*').eq('recipient_address', address!.toLowerCase()).order('created_at', { ascending: false }),
      ])
      const sentItems = (sent || []).map((t: Transaction) => ({ ...t, direction: 'out' as const }))
      const receivedItems = (received || []).map((t: Transaction) => ({ ...t, direction: 'in' as const }))
      const all = [...sentItems, ...receivedItems].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      setTxs(all)
      setLoading(false)
    }

    loadHistory().catch(() => setLoading(false))
  }, [address])

  const filtered = useMemo(() => {
    return txs.filter((tx) => {
      if (dirFilter !== 'all' && tx.direction !== dirFilter) return false
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false
      return true
    })
  }, [txs, dirFilter, typeFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Reset page on filter change
  const handleDirFilter = (val: typeof dirFilter) => { setDirFilter(val); setPage(1) }
  const handleTypeFilter = (val: typeof typeFilter) => { setTypeFilter(val); setPage(1) }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>Transaction History</h1>
            <p style={{ color: 'var(--text-secondary)' }} className="text-sm">All activities</p>
          </div>
          <div className="flex gap-2">
            {/* Direction filter */}
            <select
              value={dirFilter}
              onChange={(e) => handleDirFilter(e.target.value as typeof dirFilter)}
              className="text-white text-sm rounded-lg px-3 py-2 focus:outline-none cursor-pointer"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <option value="all">All</option>
              <option value="in">Received</option>
              <option value="out">Sent</option>
            </select>
            {/* Category filter */}
            <select
              value={typeFilter}
              onChange={(e) => handleTypeFilter(e.target.value as typeof typeFilter)}
              className="text-white text-sm rounded-lg px-3 py-2 focus:outline-none cursor-pointer"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <option value="all">All Categories</option>
              <option value="gift">🎁 Gift</option>
              <option value="payroll">💰 Payroll</option>
              <option value="invoice">🧾 Invoice</option>
              <option value="send">💸 Agent Send</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {!address ? (
            <div className="p-8 text-center" style={{ color: 'var(--text-secondary)' }}>Connect your wallet</div>
          ) : loading ? (
            <div className="p-8 text-center animate-pulse" style={{ color: 'var(--text-secondary)' }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center" style={{ color: 'var(--text-secondary)' }}>
              {txs.length === 0 ? 'No transactions yet' : 'No transactions match this filter'}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide" style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                  <th className="px-6 py-3 text-left">Transaction</th>
                  <th className="px-6 py-3 text-left">Time</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                  <th className="px-6 py-3 text-right">Explorer</th>
                </tr>
              </thead>
              <tbody style={{ borderColor: 'var(--border)' }}>
                {paginated.map((tx, i) => {
                  const isSend = tx.direction === 'out'
                  const otherAddr = isSend ? tx.recipient_address : tx.sender_address
                  return (
                    <tr key={i} className="card-hover transition-colors"
                        style={i < paginated.length - 1 ? { borderBottom: '1px solid var(--border)' } : undefined}>
                      {/* Transaction column */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0"
                            style={{ background: isSend ? 'rgba(255,107,138,0.15)' : 'rgba(0,201,177,0.15)' }}
                          >
                            {TYPE_EMOJI[tx.type] || (isSend ? '↑' : '↓')}
                          </div>
                          <div>
                            <p className="text-white font-medium">
                              {TYPE_LABELS[tx.type]}
                            </p>
                            <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                              {otherAddr.slice(0, 6)}...{otherAddr.slice(-4)}
                            </p>
                          </div>
                        </div>
                      </td>
                      {/* Time column */}
                      <td className="px-6 py-4">
                        <p className="text-white font-bold text-sm">
                          {timeAgo(tx.created_at)}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                          {formatDate(tx.created_at)}
                        </p>
                      </td>
                      {/* Amount column */}
                      <td className="px-6 py-4 text-right">
                        <p className={`font-bold text-sm ${isSend ? 'text-negative' : 'text-positive'}`}
                           style={{ color: isSend ? 'var(--text-negative)' : 'var(--text-positive)' }}>
                          {isSend ? '−' : '+'}{tx.amount} USDC
                        </p>
                      </td>
                      {/* Explorer column */}
                      <td className="px-6 py-4 text-right">
                        <a
                          href={`https://testnet.arcscan.app/tx/${tx.tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs hover:underline"
                          style={{ color: 'var(--teal)' }}
                        >
                          Explorer ↗
                        </a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} / {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
              {(dirFilter !== 'all' || typeFilter !== 'all') && ` (${txs.length} total)`}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 disabled:opacity-40 text-gray-300 text-xs rounded-lg transition-colors"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-card)')}
              >
                ← Previous
              </button>
              <span className="text-xs px-1" style={{ color: 'var(--text-secondary)' }}>{page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 disabled:opacity-40 text-gray-300 text-xs rounded-lg transition-colors"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-card)')}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
