'use client'

import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import AppLayout from '@/app/components/AppLayout'
import { supabase } from '@/lib/supabase'

type QuestStat = {
  id: string
  title: string
  desc: string
  pointsEach: number
  emoji: string
  count: number
}

type Badge = {
  id: string
  label: string
  emoji: string
  required: number
  color: string
  minted: boolean
}

const INITIAL_BADGES: Badge[] = [
  { id: 'bronze', label: 'Bronze', emoji: '🥉', required: 1000, color: 'from-amber-700 to-amber-600', minted: false },
  { id: 'silver', label: 'Silver', emoji: '🥈', required: 2500, color: 'from-gray-400 to-gray-300', minted: false },
  { id: 'gold', label: 'Gold', emoji: '🥇', required: 5000, color: 'from-yellow-500 to-yellow-400', minted: false },
  { id: 'diamond', label: 'Diamond', emoji: '💎', required: 10000, color: 'from-cyan-500 to-blue-400', minted: false },
]

export default function QuestsPage() {
  const { address } = useAccount()
  const [stats, setStats] = useState<QuestStat[]>([
    { id: 'agent_send', title: 'Send USDC via Agent', desc: 'Earn points for every agent send transaction', pointsEach: 250, emoji: '🤖', count: 0 },
    { id: 'quick_gift', title: 'Send a Quick Gift', desc: 'Earn points for every gift sent', pointsEach: 150, emoji: '🎁', count: 0 },
    { id: 'send_token', title: 'Send Tokens', desc: 'Earn points for every token transfer via Send', pointsEach: 250, emoji: '↗', count: 0 },
    { id: 'swap_token', title: 'Swap Tokens', desc: 'Earn points for every token swap', pointsEach: 500, emoji: '⇄', count: 0 },
    { id: 'invoice_paid', title: 'Collect an Invoice', desc: 'Earn points for every paid invoice you sent', pointsEach: 500, emoji: '🧾', count: 0 },
    { id: 'invoice_pay', title: 'Pay an Invoice', desc: 'Earn points for every invoice you pay', pointsEach: 500, emoji: '💳', count: 0 },
    { id: 'payroll_done', title: 'Run Payroll', desc: 'Earn points for every payroll payment', pointsEach: 500, emoji: '💰', count: 0 },
  ])
  const [badges, setBadges] = useState<Badge[]>(INITIAL_BADGES)
  const [loading, setLoading] = useState(false)
  const [mintingId, setMintingId] = useState<string | null>(null)

  useEffect(() => {
    if (!address) return
    setLoading(true)
    checkStats()
    loadMintedBadges()
  }, [address])

  async function checkStats() {
    if (!address) return
    const addr = address.toLowerCase()
    const [
      { count: agentCount },
      { count: giftCount },
      { count: sendCount },
      { count: swapCount },
      { count: invoiceCount },
      { count: invoicePayCount },
      { count: payrollCount },
    ] = await Promise.all([
      supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('sender_address', addr).eq('type', 'send'),
      supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('sender_address', addr).eq('type', 'gift'),
      supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('sender_address', addr).eq('type', 'send'),
      supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('sender_address', addr).eq('type', 'swap'),
      supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('sender_address', addr).eq('status', 'paid'),
      supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('sender_address', addr).eq('type', 'invoice'),
      supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('sender_address', addr).eq('type', 'payroll'),
    ])
    setStats((prev) => prev.map((s) => {
      if (s.id === 'agent_send') return { ...s, count: agentCount ?? 0 }
      if (s.id === 'quick_gift') return { ...s, count: giftCount ?? 0 }
      if (s.id === 'send_token') return { ...s, count: sendCount ?? 0 }
      if (s.id === 'swap_token') return { ...s, count: swapCount ?? 0 }
      if (s.id === 'invoice_paid') return { ...s, count: invoiceCount ?? 0 }
      if (s.id === 'invoice_pay') return { ...s, count: invoicePayCount ?? 0 }
      if (s.id === 'payroll_done') return { ...s, count: payrollCount ?? 0 }
      return s
    }))
    setLoading(false)
  }

  function loadMintedBadges() {
    if (!address) return
    const key = `minted_badges_${address.toLowerCase()}`
    const saved = localStorage.getItem(key)
    if (saved) {
      const minted: string[] = JSON.parse(saved)
      setBadges((prev) => prev.map((b) => ({ ...b, minted: minted.includes(b.id) })))
    }
  }

  function mintBadge(badgeId: string) {
    if (!address) return
    setMintingId(badgeId)
    setTimeout(() => {
      setBadges((prev) => {
        const updated = prev.map((b) => b.id === badgeId ? { ...b, minted: true } : b)
        const mintedIds = updated.filter((b) => b.minted).map((b) => b.id)
        localStorage.setItem(`minted_badges_${address.toLowerCase()}`, JSON.stringify(mintedIds))
        return updated
      })
      setMintingId(null)
    }, 1200)
  }

  const totalPoints = stats.reduce((s, q) => s + q.pointsEach * q.count, 0)

  const nextBadge = badges.find((b) => !b.minted && totalPoints < b.required) ??
    badges.find((b) => !b.minted && totalPoints >= b.required)

  return (
    <AppLayout>
      <div className="max-w-xl mx-auto">

        {/* Score + Badge Card */}
        <div className="card rounded-2xl p-4 mb-3">
          {/* Score row */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>CirPay Score</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>{totalPoints.toLocaleString()} <span className="text-sm font-normal" style={{ color: 'var(--text-secondary)' }}>pts</span></p>
            </div>
            {nextBadge && totalPoints < nextBadge.required && (
              <div className="text-right">
                <p className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>Next reward</p>
                <p className="text-xs font-semibold" style={{ color: 'var(--teal)' }}>
                  {(nextBadge.required - totalPoints).toLocaleString()} pts → {nextBadge.label}
                </p>
              </div>
            )}
          </div>

          {/* Badge timeline */}
          <div className="grid grid-cols-4 mb-3">
            {badges.map((badge, i) => {
              const unlocked = totalPoints >= badge.required
              const prevUnlocked = i === 0 || totalPoints >= badges[i - 1].required
              const isFirst = i === 0
              const isLast = i === badges.length - 1

              return (
                <div key={badge.id} className="flex items-start">
                  <div className="flex-1 flex items-center" style={{ marginTop: '16px' }}>
                    {!isFirst && (
                      <div className="w-full h-px" style={{ background: prevUnlocked && unlocked ? 'var(--teal)' : 'var(--border)' }} />
                    )}
                  </div>

                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-base border-2 transition-all ${
                      badge.minted
                        ? `bg-gradient-to-br ${badge.color} border-transparent shadow-lg`
                        : ''
                    }`}
                    style={
                      !badge.minted
                        ? {
                            background: 'var(--bg-card)',
                            borderColor: unlocked ? 'var(--teal)' : 'var(--border)',
                            opacity: unlocked ? 1 : 0.4,
                          }
                        : undefined
                    }>
                      {badge.emoji}
                    </div>
                    <p className="text-xs font-bold" style={{ color: badge.minted ? '#fff' : unlocked ? 'var(--teal)' : 'var(--text-secondary)' }}>
                      {badge.label}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{badge.required >= 1000 ? `${badge.required / 1000}K` : badge.required}</p>
                  </div>

                  <div className="flex-1 flex items-center" style={{ marginTop: '16px' }}>
                    {!isLast && (
                      <div className="w-full h-px" style={{ background: unlocked ? 'var(--teal)' : 'var(--border)' }} />
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Mint buttons */}
          <div className="grid grid-cols-4 gap-2">
            {badges.map((badge) => {
              const unlocked = totalPoints >= badge.required
              if (badge.minted) {
                return (
                  <div key={badge.id} className="py-1.5 text-center rounded-xl text-xs font-medium"
                       style={{ border: '1px solid var(--teal)', color: 'var(--teal)' }}>
                    Owned ✓
                  </div>
                )
              }
              if (!unlocked) {
                return (
                  <div key={badge.id} className="py-1.5 text-center rounded-xl text-xs"
                       style={{ background: 'var(--bg-pill)', color: 'var(--text-secondary)' }}>
                    Locked
                  </div>
                )
              }
              return (
                <button
                  key={badge.id}
                  onClick={() => mintBadge(badge.id)}
                  disabled={mintingId === badge.id}
                  className="btn-primary py-1.5 rounded-xl text-xs font-bold disabled:opacity-60"
                >
                  {mintingId === badge.id ? '⏳' : 'Mint'}
                </button>
              )
            })}
          </div>
        </div>

        {/* Quest List */}
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>Tasks</p>
        {!address ? (
          <div className="card rounded-xl p-6 text-center">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Connect your wallet to see tasks.</p>
          </div>
        ) : loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="card rounded-xl h-14 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {stats.map((quest) => (
              <div key={quest.id} className="card rounded-xl px-4 py-3 hover:border-[color:var(--teal)] transition-all flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                     style={{ background: 'rgba(123,94,167,0.15)', border: '1px solid var(--border)' }}>
                  {quest.emoji}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{quest.title}</p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{quest.desc}</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold flex-shrink-0"
                      style={{ background: 'rgba(123,94,167,0.15)', color: 'var(--teal)', border: '1px solid var(--border)' }}>
                  +{quest.pointsEach}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
