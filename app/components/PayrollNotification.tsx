'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { supabase } from '@/lib/supabase'

type PayrollNotif = {
  id: string
  sender_address: string
  amount: number
  tx_hash: string
}

export default function PayrollNotification() {
  const { address } = useAccount()
  const [notifications, setNotifications] = useState<PayrollNotif[]>([])
  const [current, setCurrent] = useState<PayrollNotif | null>(null)

  const checkNotifications = useCallback(async () => {
    if (!address) return
    const { data } = await supabase
      .from('payroll_notifications')
      .select('*')
      .eq('recipient_address', address.toLowerCase())
      .eq('seen', false)
      .order('created_at', { ascending: true })
    if (data && data.length > 0) {
      setNotifications(data)
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
    await supabase.from('payroll_notifications').update({ seen: true }).eq('id', current.id)
    const remaining = notifications.filter((n) => n.id !== current.id)
    setNotifications(remaining)
    setCurrent(remaining.length > 0 ? remaining[0] : null)
  }

  if (!current) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'var(--overlay)' }}>
      <div className="rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center"
           style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="text-6xl mb-4">💰</div>

        <h2 className="font-bold text-xl mb-1" style={{ color: 'var(--text-heading)' }}>Salary Received! 🎉</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          <span className="font-mono" style={{ color: 'var(--text-primary)' }}>
            {current.sender_address.slice(0, 6)}...{current.sender_address.slice(-4)}
          </span>{' '}
          has paid your salary
        </p>

        <div className="rounded-2xl py-4 mb-4"
             style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
          <p className="text-3xl font-bold" style={{ color: 'var(--teal)' }}>{current.amount} USDC</p>
        </div>

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
          {notifications.length > 1 ? `OK (${notifications.length - 1} more)` : 'OK 💚'}
        </button>
      </div>
    </div>
  )
}
