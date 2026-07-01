'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { supabase } from '@/lib/supabase'

type PaidNotif = {
  id: string
  invoice_id: string
  payer_address: string
  sender_address: string
  amount: number
  description: string
}

export default function InvoicePaidNotification() {
  const { address } = useAccount()
  const [queue, setQueue] = useState<PaidNotif[]>([])
  const [current, setCurrent] = useState<PaidNotif | null>(null)

  const checkNotifications = useCallback(async () => {
    if (!address) return
    const { data } = await supabase
      .from('invoice_paid_notifications')
      .select('*')
      .eq('sender_address', address.toLowerCase())
      .eq('seen', false)
      .order('created_at', { ascending: true })
    if (data && data.length > 0) {
      setQueue(data)
      setCurrent((prev) => prev ?? data[0])
    }
  }, [address])

  useEffect(() => {
    if (!address) return
    checkNotifications()
    const interval = setInterval(checkNotifications, 30000)
    return () => clearInterval(interval)
  }, [address, checkNotifications])

  async function dismiss() {
    if (!current) return
    await supabase
      .from('invoice_paid_notifications')
      .update({ seen: true })
      .eq('id', current.id)
    const remaining = queue.filter((n) => n.id !== current.id)
    setQueue(remaining)
    setCurrent(remaining.length > 0 ? remaining[0] : null)
  }

  if (!current) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'var(--overlay)' }}>
      <div className="rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center"
           style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="text-6xl mb-4">✅</div>

        <h2 className="font-bold text-xl mb-1" style={{ color: 'var(--text-heading)' }}>Invoice Paid!</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          <span className="font-mono" style={{ color: 'var(--text-primary)' }}>
            {current.payer_address.slice(0, 6)}...{current.payer_address.slice(-4)}
          </span>{' '}
          has paid your invoice
          {current.description && (
            <span className="block mt-1 italic" style={{ color: 'var(--text-secondary)' }}>
              &ldquo;{current.description}&rdquo;
            </span>
          )}
        </p>

        <div className="rounded-2xl py-4 mb-6"
             style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
          <p className="text-3xl font-bold" style={{ color: 'var(--text-positive)' }}>+{current.amount} USDC</p>
        </div>

        <button onClick={dismiss} className="btn-primary w-full py-3 rounded-xl text-sm font-bold">
          Great, thanks!
        </button>

        {queue.length > 1 && (
          <p className="text-xs mt-3" style={{ color: 'var(--text-secondary)' }}>
            {queue.length - 1} more notification pending
          </p>
        )}
      </div>
    </div>
  )
}
