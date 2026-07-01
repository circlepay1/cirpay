'use client'

import { useAccount, useBalance } from 'wagmi'
import { useEffect, useState } from 'react'
import AppLayout from '@/app/components/AppLayout'
import { USDC_ADDRESS, EURC_ADDRESS, CIRBTC_ADDRESS } from '@/lib/arc'
import { supabase, type Transaction } from '@/lib/supabase'

const AVATARS = [
  { id: 'ape',      emoji: '🦍', label: 'Bored Ape'    },
  { id: 'doge',     emoji: '🐶', label: 'Doge'         },
  { id: 'punk',     emoji: '🤖', label: 'CryptoPunk'   },
  { id: 'alien',    emoji: '👽', label: 'Alien'        },
  { id: 'wizard',   emoji: '🧙', label: 'Wizard'       },
  { id: 'diamond',  emoji: '💎', label: 'Diamond'      },
  { id: 'rocket',   emoji: '🚀', label: 'Rocketman'    },
  { id: 'skull',    emoji: '💀', label: 'Skull'        },
  { id: 'pepe',     emoji: '🐸', label: 'Pepe'         },
  { id: 'phoenix',  emoji: '🦅', label: 'Phoenix'      },
]

type Prices = { btc: number; eur: number }

async function fetchPrices(): Promise<Prices> {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,euro&vs_currencies=usd',
      { next: { revalidate: 60 } }
    )
    const data = await res.json()
    return {
      btc: data?.bitcoin?.usd ?? 0,
      eur: data?.euro?.usd ?? 1,
    }
  } catch {
    return { btc: 0, eur: 1 }
  }
}

export default function ProfilePage() {
  const { address, isConnected } = useAccount()
  const { data: usdcBalance } = useBalance({ address, token: USDC_ADDRESS })
  const { data: eurcBalance } = useBalance({ address, token: EURC_ADDRESS })
  const { data: cirBtcBalance } = useBalance({ address, token: CIRBTC_ADDRESS })
  const [totalSent, setTotalSent] = useState(0)
  const [totalReceived, setTotalReceived] = useState(0)
  const [loading, setLoading] = useState(false)
  const [prices, setPrices] = useState<Prices>({ btc: 0, eur: 1 })

  const [username, setUsername] = useState('CirPay User')
  const [avatarId, setAvatarId] = useState('ape')

  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editAvatar, setEditAvatar] = useState('')

  const usdcAmt   = usdcBalance   ? parseFloat(usdcBalance.formatted)   : 0
  const eurcAmt   = eurcBalance   ? parseFloat(eurcBalance.formatted)   : 0
  const cirBtcAmt = cirBtcBalance ? parseFloat(cirBtcBalance.formatted) : 0

  const usdcFormatted   = usdcAmt.toFixed(2)
  const eurcFormatted   = eurcAmt.toFixed(2)
  const cirBtcFormatted = cirBtcAmt.toFixed(8)

  // USD values
  const usdcUSD   = `$${usdcAmt.toFixed(2)}`
  const eurcUSD   = prices.eur > 0 ? `$${(eurcAmt * prices.eur).toFixed(2)}` : '—'
  const cirBtcUSD = prices.btc > 0 ? `$${(cirBtcAmt * prices.btc).toFixed(2)}` : '—'

  const currentAvatar = AVATARS.find((a) => a.id === avatarId) ?? AVATARS[0]

  // Fetch prices on mount
  useEffect(() => {
    fetchPrices().then(setPrices)
  }, [])

  useEffect(() => {
    if (!address) return
    const key = `profile_${address.toLowerCase()}`
    const saved = localStorage.getItem(key)
    if (saved) {
      const { username: u, avatarId: a } = JSON.parse(saved)
      if (u) setUsername(u)
      if (a) setAvatarId(a)
    }
  }, [address])

  useEffect(() => {
    if (!address) return
    setLoading(true)

    async function loadTransactions() {
      const [{ data: sent }, { data: received }] = await Promise.all([
        supabase.from('transactions').select('*').eq('sender_address', address!.toLowerCase()),
        supabase.from('transactions').select('*').eq('recipient_address', address!.toLowerCase()),
      ])
      setTotalSent((sent || []).reduce((s: number, t: Transaction) => s + Number(t.amount), 0))
      setTotalReceived((received || []).reduce((s: number, t: Transaction) => s + Number(t.amount), 0))
      setLoading(false)
    }

    loadTransactions().catch(() => setLoading(false))
  }, [address])

  function openEdit() {
    setEditName(username)
    setEditAvatar(avatarId)
    setEditOpen(true)
  }

  function saveEdit() {
    if (!address) return
    const name = editName.trim() || 'CirPay User'
    setUsername(name)
    setAvatarId(editAvatar)
    localStorage.setItem(
      `profile_${address.toLowerCase()}`,
      JSON.stringify({ username: name, avatarId: editAvatar })
    )
    setEditOpen(false)
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-4">
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>Profile</h1>
          <p className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>On-chain identity &amp; statistics &amp; portfolio</p>
        </div>

        {!isConnected ? (
          <div className="card rounded-xl p-8 text-center">
            <p className="text-4xl mb-3">👤</p>
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Connect your wallet</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Connect your wallet to view your profile.</p>
          </div>
        ) : (
          <>
            {/* Profile Card */}
            <div className="rounded-2xl p-4 sm:p-6 mb-4" style={{ background: 'var(--card-gradient)', border: '1px solid transparent', boxShadow: 'var(--card-shadow)' }}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-2xl sm:text-3xl flex-shrink-0"
                       style={{ background: 'rgba(255,255,255,0.2)' }}>
                    {currentAvatar.emoji}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-bold text-base sm:text-lg truncate">{username}</p>
                    <p className="text-xs sm:text-sm font-mono truncate" style={{ color: 'rgba(255,255,255,0.75)' }}>
                      {address ? `${address.slice(0, 10)}...${address.slice(-8)}` : ''}
                    </p>
                  </div>
                </div>
                <button
                  onClick={openEdit}
                  className="btn-primary px-4 py-2 text-xs font-medium rounded-xl w-full sm:w-auto flex-shrink-0"
                >
                  ✏️ Edit Profile
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="card rounded-xl p-3">
                <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>P&amp;L</p>
                {loading ? (
                  <p className="text-base font-bold" style={{ color: 'var(--text-secondary)' }}>...</p>
                ) : (() => {
                  const pnl = totalReceived - totalSent
                  const isProfit = pnl >= 0
                  return (
                    <p className="text-base font-bold" style={{ color: isProfit ? 'var(--text-positive)' : 'var(--text-negative)' }}>
                      {isProfit ? '+' : ''}{pnl.toFixed(2)} USDC
                    </p>
                  )
                })()}
              </div>
              <div className="card rounded-xl p-3">
                <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Total sent</p>
                <p className="text-base font-bold" style={{ color: 'var(--text-negative)' }}>
                  {loading ? '...' : `$${totalSent.toFixed(2)}`}
                </p>
              </div>
              <div className="card rounded-xl p-3">
                <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Total received</p>
                <p className="text-base font-bold" style={{ color: 'var(--text-positive)' }}>
                  {loading ? '...' : `$${totalReceived.toFixed(2)}`}
                </p>
              </div>
            </div>

            {/* Assets */}
            {/* Assets label outside the card */}

            <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs" style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                    <th className="px-6 py-2 text-left">Token</th>
                    <th className="px-6 py-2 text-right">Amount</th>
                    <th className="px-6 py-2 text-right">USD</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="card-hover" style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="px-6 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>
                      <div className="flex items-center gap-2">
                        <img src="https://assets.coingecko.com/coins/images/6319/small/usdc.png" alt="USDC" className="w-6 h-6 rounded-full flex-shrink-0" />
                        USDC
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right" style={{ color: 'var(--text-secondary)' }}>{usdcFormatted}</td>
                    <td className="px-6 py-3 text-right" style={{ color: 'var(--text-secondary)' }}>{usdcUSD}</td>
                  </tr>
                  <tr className="card-hover" style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="px-6 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>
                      <div className="flex items-center gap-2">
                        <img src="https://assets.coingecko.com/coins/images/26045/small/euro.png" alt="EURC" className="w-6 h-6 rounded-full flex-shrink-0" />
                        EURC
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right" style={{ color: 'var(--text-secondary)' }}>{eurcFormatted}</td>
                    <td className="px-6 py-3 text-right" style={{ color: 'var(--text-secondary)' }}>{eurcUSD}</td>
                  </tr>
                  <tr className="card-hover">
                    <td className="px-6 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>
                      <div className="flex items-center gap-2">
                        <img src="https://assets.coingecko.com/coins/images/1/small/bitcoin.png" alt="cirBTC" className="w-6 h-6 rounded-full flex-shrink-0" />
                        cirBTC
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right" style={{ color: 'var(--text-secondary)' }}>{cirBtcFormatted}</td>
                    <td className="px-6 py-3 text-right" style={{ color: 'var(--text-secondary)' }}>{cirBtcUSD}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Edit Profile Modal */}
      {editOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: "var(--overlay)" }}>
          <div className="rounded-2xl p-6 max-w-sm w-full shadow-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h3 className="text-white font-bold text-lg mb-5">Edit Profile</h3>

            <div className="mb-5">
              <label className="label mb-1.5 block">Username</label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="CirPay User"
                maxLength={30}
                className="input-base"
              />
            </div>

            <div className="mb-6">
              <label className="label mb-2 block">Choose Avatar</label>
              <div className="grid grid-cols-5 gap-2">
                {AVATARS.map((av) => (
                  <button
                    key={av.id}
                    onClick={() => setEditAvatar(av.id)}
                    title={av.label}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all"
                    style={{
                      borderColor: editAvatar === av.id ? 'var(--teal)' : 'var(--border)',
                      background: editAvatar === av.id ? 'rgba(123,94,167,0.2)' : 'var(--bg-card-hover)',
                    }}
                  >
                    <span className="text-2xl">{av.emoji}</span>
                    <span className="text-xs leading-tight text-center" style={{ color: 'var(--text-secondary)' }}>{av.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setEditOpen(false)} className="btn-ghost flex-1 py-2.5 rounded-xl text-sm">Cancel</button>
              <button onClick={saveEdit} className="btn-primary flex-1 py-2.5 rounded-xl text-sm font-bold">Save</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
