'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { isAddress } from 'viem'
import AppLayout from '@/app/components/AppLayout'
import { supabase, saveTransaction } from '@/lib/supabase'
import { AppKit } from '@circle-fin/app-kit'
import { getAdapter } from '@/lib/adapter'
import { patchCircleFetch } from '@/lib/patch-circle-fetch'

const QUICK_GIFTS = [
  { emoji: '⭐', amount: '5' },
  { emoji: '🎁', amount: '10' },
  { emoji: '💎', amount: '25' },
  { emoji: '🏆', amount: '50' },
  { emoji: '🚀', amount: '100' },
  { emoji: '💫', amount: '250' },
  { emoji: '🔥', amount: '500' },
  { emoji: '👑', amount: '1000' },
  { emoji: '🌟', amount: '2500' },
  { emoji: '⚡', amount: '5000' },
  { emoji: '🦋', amount: '7500' },
  { emoji: '🏅', amount: '10000' },
]

const CONFETTI_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4']

type GiftModal = { emoji: string; amount: string } | null
type AnimState = 'idle' | 'closing' | 'flying' | 'success'

export default function SendGiftPage() {
  const { address, isConnected } = useAccount()

  const [giftModal, setGiftModal] = useState<GiftModal>(null)

  // KRİTİK: patchCircleFetch CORS proxy'sini aktif et
  useEffect(() => { patchCircleFetch() }, [])
  const [giftTo, setGiftTo] = useState('')
  const [giftNote, setGiftNote] = useState('')
  const [giftSending, setGiftSending] = useState(false)
  const [giftError, setGiftError] = useState('')
  const [animState, setAnimState] = useState<AnimState>('idle')
  const [lastGift, setLastGift] = useState<{ emoji: string; amount: string; to: string } | null>(null)

  function openGiftModal(g: { emoji: string; amount: string }) {
    setGiftModal(g)
    setGiftTo('')
    setGiftNote('')
    setGiftError('')
    setAnimState('idle')
  }

  function closeGiftModal() {
    setGiftModal(null)
    setAnimState('idle')
  }

  async function sendGift() {
    if (!giftModal) return
    setGiftError('')
    if (!isConnected) { setGiftError('Connect your wallet.'); return }
    if (!isAddress(giftTo)) { setGiftError('Enter a valid wallet address (0x...).'); return }

    setGiftSending(true)

    setAnimState('closing')
    await delay(350)

    setAnimState('flying')
    try {
      const kit     = new AppKit()
      const adapter = await getAdapter()

      const tx = await kit.send({
        from:  { adapter, chain: 'Arc_Testnet' },
        to:    giftTo as `0x${string}`,
        amount: giftModal.amount,
        token: 'USDC',
      })

      const txHash = (tx as { txHash?: string })?.txHash ?? ''

      await supabase.from('gifts').insert({
        sender_address: address?.toLowerCase() ?? '',
        recipient_address: giftTo.toLowerCase(),
        amount: giftModal.amount,
        emoji: giftModal.emoji,
        note: giftNote,
        tx_hash: txHash,
        seen: false,
      })
      await saveTransaction(address!, giftTo, parseFloat(giftModal.amount), txHash, 'gift')

      await delay(400)

      setLastGift({ emoji: giftModal.emoji, amount: giftModal.amount, to: giftTo })
      setAnimState('success')
      await delay(2500)
      closeGiftModal()
    } catch (e: unknown) {
      const err = e as Error
      setAnimState('idle')
      setGiftError(err.message?.includes('rejected') ? 'Transaction rejected.' : 'Transaction failed.')
    } finally {
      setGiftSending(false)
    }
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>Send Gift</h1>
          <p className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>Send a gift quickly</p>
        </div>

        {/* Gift Grid */}
        <div className="card rounded-xl p-4 sm:p-5">
          <p className="text-xs font-medium mb-3 sm:mb-4 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Select Amount</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
            {QUICK_GIFTS.map((g) => (
              <button
                key={g.amount}
                onClick={() => openGiftModal(g)}
                className="gift-pill flex flex-col items-center justify-center gap-1.5 sm:gap-2 py-4 sm:py-5 rounded-xl transition-colors"
                style={{ background: 'var(--bg-card-hover)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--purple)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
              >
                <span className="text-2xl sm:text-3xl">{g.emoji}</span>
                <span className="text-xs sm:text-sm font-medium">{g.amount} USDC</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Gift Modal */}
      {giftModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: "var(--overlay)" }}>

          {/* Confetti — success only */}
          {animState === 'success' && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {Array.from({ length: 24 }).map((_, i) => (
                <div
                  key={i}
                  className="confetti-item absolute w-2.5 h-2.5 rounded-sm"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 30}%`,
                    backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                    animationDelay: `${Math.random() * 0.5}s`,
                    animationDuration: `${0.8 + Math.random() * 0.6}s`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Success screen */}
          {animState === 'success' && lastGift ? (
            <div className="success-pop rounded-3xl p-10 max-w-sm w-full text-center shadow-2xl"
                 style={{ background: 'var(--bg-card)', border: '1px solid var(--teal)' }}>
              <div className="text-6xl mb-4">✅</div>
              <p className="font-bold text-xl mb-1" style={{ color: 'var(--text-heading)' }}>{lastGift.amount} USDC Sent!</p>
              <p style={{ color: 'var(--text-secondary)' }} className="text-sm">
                {lastGift.emoji} {lastGift.to.slice(0, 6)}...{lastGift.to.slice(-4)}
              </p>
            </div>
          ) : (
            /* Normal / closing / flying card */
            <div className={`rounded-3xl p-8 max-w-sm w-full shadow-2xl relative overflow-hidden
              ${animState === 'closing' ? 'envelope-closing' : ''}
              ${animState === 'flying' ? 'envelope-flying' : ''}
            `} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              {/* Gradient top bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-t-3xl" />

              {/* Envelope V-shape */}
              <div className="absolute top-0 left-0 right-0 flex justify-center">
                <div className="w-0 h-0 border-l-[160px] border-r-[160px] border-t-[48px] border-l-transparent border-r-transparent mt-1"
                     style={{ borderTopColor: 'var(--bg-card-hover)' }} />
              </div>

              <div className="relative z-10">
                <div className="text-center mb-4 mt-2">
                  <span className={`text-5xl inline-block transition-transform duration-300 ${animState === 'closing' ? 'scale-90' : ''}`}>
                    {giftModal.emoji}
                  </span>
                </div>

                {animState === 'idle' ? (
                  <>
                    <h2 className="font-bold text-xl mb-1 text-center" style={{ color: 'var(--text-heading)' }}>
                      Send {giftModal.amount} USDC Gift
                    </h2>
                    <p className="text-sm mb-5 text-center" style={{ color: 'var(--text-secondary)' }}>Enter recipient address to seal the envelope</p>

                    <input
                      value={giftTo}
                      onChange={(e) => { setGiftTo(e.target.value); setGiftError('') }}
                      placeholder="0x..."
                      className="input-base font-mono mb-3"
                    />
                    <input
                      value={giftNote}
                      onChange={(e) => setGiftNote(e.target.value)}
                      placeholder="📝 Gift note (optional)"
                      className="input-base mb-4"
                    />

                    <div className="rounded-xl px-4 py-3 mb-4 space-y-1.5" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                      <div className="flex justify-between text-sm">
                        <span style={{ color: 'var(--text-secondary)' }}>Amount</span>
                        <span style={{ color: 'var(--text-primary)' }} className="font-semibold">{giftModal.amount} USDC</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span style={{ color: 'var(--text-secondary)' }}>Gas</span>
                        <span style={{ color: 'var(--text-secondary)' }}>~$0.01</span>
                      </div>
                    </div>

                    {giftError && <p className="text-xs mb-3 text-center" style={{ color: 'var(--text-negative)' }}>{giftError}</p>}

                    <div className="flex gap-3">
                      <button
                        onClick={closeGiftModal}
                        className="btn-ghost flex-1 py-3 rounded-xl text-sm font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={sendGift}
                        disabled={giftSending || !giftTo}
                        className="btn-primary flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                      >
                        📬 Seal &amp; Send
                      </button>
                    </div>
                  </>
                ) : (
                  /* Closing / flying state */
                  <div className="text-center py-6">
                    <p className="font-bold text-lg" style={{ color: 'var(--text-heading)' }}>
                      {animState === 'closing' ? '📬 Sealing envelope...' : '📨 Sending...'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </AppLayout>
  )
}

function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms))
}
