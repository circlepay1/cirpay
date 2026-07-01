'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { supabase } from '@/lib/supabase'

type Gift = {
  id: string
  sender_address: string
  amount: string
  emoji: string
  note: string
  tx_hash: string
}

export default function GiftNotification() {
  const { address } = useAccount()
  const [gifts, setGifts] = useState<Gift[]>([])
  const [current, setCurrent] = useState<Gift | null>(null)

  const checkGifts = useCallback(async () => {
    if (!address) return
    const { data } = await supabase
      .from('gifts')
      .select('*')
      .eq('recipient_address', address.toLowerCase())
      .eq('seen', false)
      .order('created_at', { ascending: true })
    if (data && data.length > 0) {
      setGifts(data)
      setCurrent((prev) => prev ?? data[0])
    }
  }, [address])

  useEffect(() => {
    if (!address) return
    checkGifts()
    const interval = setInterval(checkGifts, 30000)
    return () => clearInterval(interval)
  }, [address, checkGifts])

  async function dismiss() {
    if (!current) return
    await supabase.from('gifts').update({ seen: true }).eq('id', current.id)
    const remaining = gifts.filter((g) => g.id !== current.id)
    setGifts(remaining)
    setCurrent(remaining.length > 0 ? remaining[0] : null)
  }

  if (!current) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'var(--overlay)' }}>
      <div className="rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center"
           style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="text-6xl mb-4">{current.emoji}</div>

        <h2 className="font-bold text-xl mb-1" style={{ color: 'var(--text-heading)' }}>You received a gift! 🎉</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          <span className="font-mono" style={{ color: 'var(--text-primary)' }}>
            {current.sender_address.slice(0, 6)}...{current.sender_address.slice(-4)}
          </span>{' '}
          sent you a gift
        </p>

        <div className="rounded-2xl py-4 mb-4"
             style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
          <p className="text-3xl font-bold" style={{ color: 'var(--teal)' }}>{current.amount} USDC</p>
        </div>

        {current.note && (
          <div className="rounded-xl px-4 py-3 mb-4"
               style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
            <p className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>Gift note</p>
            <p className="text-sm italic" style={{ color: 'var(--text-primary)' }}>&quot;{current.note}&quot;</p>
          </div>
        )}

        <a
          href={`https://testnet.arcscan.app/tx/${current.tx_hash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs hover:underline block mb-5"
          style={{ color: 'var(--teal)' }}
        >
          View transaction ↗
        </a>

        <button onClick={dismiss} className="btn-primary w-full py-3 rounded-xl font-bold text-sm">
          {gifts.length > 1 ? `OK (${gifts.length - 1} more gift${gifts.length - 1 > 1 ? 's' : ''})` : 'OK 🎊'}
        </button>
      </div>
    </div>
  )
}
