'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAccount, useSendTransaction } from 'wagmi'
import { parseUnits, isAddress } from 'viem'
import { supabase, saveTransaction } from '@/lib/supabase'
import { USDC_ADDRESS, USDC_DECIMALS } from '@/lib/arc'

type InvoiceNotif = {
  id: string
  invoice_id: string
  sender_address: string
  recipient_address: string
  amount: number
  description: string
}

export default function InvoiceNotification() {
  const { address } = useAccount()
  const { sendTransactionAsync } = useSendTransaction()
  const [notifications, setNotifications] = useState<InvoiceNotif[]>([])
  const [current, setCurrent] = useState<InvoiceNotif | null>(null)
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)

  const checkNotifications = useCallback(async () => {
    if (!address) return
    const { data } = await supabase
      .from('invoice_notifications')
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
    await supabase.from('invoice_notifications').update({ seen: true }).eq('id', current.id)
    const remaining = notifications.filter((n) => n.id !== current.id)
    setNotifications(remaining)
    setCurrent(remaining.length > 0 ? remaining[0] : null)
    setPayError(null)
  }

  async function payInvoice() {
    if (!current || !address || !isAddress(current.sender_address)) return
    setPaying(true)
    setPayError(null)
    try {
      const amount = parseUnits(current.amount.toString(), USDC_DECIMALS)
      const to = current.sender_address as `0x${string}`
      const data = `0xa9059cbb${to.slice(2).padStart(64, '0')}${amount.toString(16).padStart(64, '0')}`
      const tx = await sendTransactionAsync({ to: USDC_ADDRESS, data: data as `0x${string}` })
      await supabase.from('invoices').update({ status: 'paid', tx_hash: tx }).eq('id', current.invoice_id)
      await supabase.from('invoice_notifications').update({ seen: true }).eq('id', current.id)
      await saveTransaction(address, current.sender_address, current.amount, tx, 'invoice')
      await supabase.from('invoice_paid_notifications').insert({
        invoice_id: current.invoice_id,
        sender_address: current.sender_address.toLowerCase(),
        payer_address: address.toLowerCase(),
        amount: current.amount,
        description: current.description || '',
        seen: false,
      })
      const remaining = notifications.filter((n) => n.id !== current.id)
      setNotifications(remaining)
      setCurrent(remaining.length > 0 ? remaining[0] : null)
    } catch (e: unknown) {
      const err = e as Error
      setPayError(err.message?.includes('rejected') ? 'Transaction rejected.' : 'Payment failed. Please try again.')
    } finally {
      setPaying(false)
    }
  }

  if (!current) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'var(--overlay)' }}>
      <div className="rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center"
           style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="text-6xl mb-4">🧾</div>

        <h2 className="font-bold text-xl mb-1" style={{ color: 'var(--text-heading)' }}>Invoice Received!</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          <span className="font-mono" style={{ color: 'var(--text-primary)' }}>
            {current.sender_address.slice(0, 6)}...{current.sender_address.slice(-4)}
          </span>{' '}
          sent you an invoice
          {current.description && (
            <span className="block mt-1 italic" style={{ color: 'var(--text-secondary)' }}>
              &ldquo;{current.description}&rdquo;
            </span>
          )}
        </p>

        <div className="rounded-2xl py-4 mb-4"
             style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
          <p className="text-3xl font-bold" style={{ color: 'var(--teal)' }}>{current.amount} USDC</p>
        </div>

        {payError && (
          <p className="text-xs mb-3" style={{ color: 'var(--text-negative)' }}>⚠️ {payError}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={dismiss}
            disabled={paying}
            className="btn-ghost flex-1 py-3 rounded-xl text-sm font-medium disabled:opacity-50"
          >
            Later
          </button>
          <button
            onClick={payInvoice}
            disabled={paying}
            className="btn-primary flex-1 py-3 rounded-xl text-sm font-bold disabled:opacity-60"
          >
            {paying ? '⏳ Paying...' : `💸 Pay ${current.amount} USDC`}
          </button>
        </div>

        {notifications.length > 1 && (
          <p className="text-xs mt-3" style={{ color: 'var(--text-secondary)' }}>
            {notifications.length - 1} more invoice pending
          </p>
        )}
      </div>
    </div>
  )
}
