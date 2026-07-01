'use client'

import { useState, useEffect } from 'react'
import type React from 'react'
import { useAccount, useSendTransaction } from 'wagmi'
import { parseUnits, isAddress } from 'viem'
import AppLayout from '@/app/components/AppLayout'
import { supabase, type Invoice, saveTransaction } from '@/lib/supabase'
import { USDC_ADDRESS, USDC_DECIMALS } from '@/lib/arc'

const STATUS_STYLES: Record<string, React.CSSProperties> = {
  pending:   { background: 'var(--status-pending-bg)',  color: 'var(--status-pending-text)',  border: '1px solid var(--status-pending-text)' },
  paid:      { background: 'var(--status-positive-bg)', color: 'var(--status-positive-text)', border: '1px solid var(--status-positive-text)' },
  overdue:   { background: 'var(--status-negative-bg)', color: 'var(--status-negative-text)', border: '1px solid var(--status-negative-text)' },
  cancelled: { background: 'var(--bg-input)',           color: 'var(--text-secondary)',        border: '1px solid var(--border)' },
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
}

export default function InvoicePage() {
  const { address } = useAccount()
  const { sendTransactionAsync } = useSendTransaction()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [notifications, setNotifications] = useState<Invoice[]>([])
  const [form, setForm] = useState({ recipient_address: '', description: '', amount: '', due_date: '' })
  const [loading, setLoading] = useState(false)
  const [paying, setPaying] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [cancelConfirm, setCancelConfirm] = useState<Invoice | null>(null)
  const [cancelOwnInvoice, setCancelOwnInvoice] = useState<Invoice | null>(null)
  const [payError, setPayError] = useState<string | null>(null)
  const [tab, setTab] = useState<'list' | 'new'>('list')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 5

  useEffect(() => {
    if (address) {
      loadInvoices()
      checkIncomingInvoices()
    }
  }, [address])

  async function loadInvoices() {
    if (!address) return
    const { data } = await supabase
      .from('invoices')
      .select('*')
      .eq('sender_address', address.toLowerCase())
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
    if (data) { setInvoices(data); setPage(1) }
  }

  async function checkIncomingInvoices() {
    if (!address) return
    const { data } = await supabase
      .from('invoices')
      .select('*')
      .eq('recipient_address', address.toLowerCase())
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    if (data && data.length > 0) setNotifications(data)
  }

  async function createInvoice() {
    if (!address || !form.recipient_address || !form.amount) return
    if (!isAddress(form.recipient_address)) return
    setLoading(true)
    const { error, data } = await supabase.from('invoices').insert({
      sender_address: address.toLowerCase(),
      recipient_address: form.recipient_address.toLowerCase(),
      description: form.description,
      amount: parseFloat(form.amount),
      due_date: form.due_date || null,
      status: 'pending',
    }).select().single()
    if (!error && data) {
      await supabase.from('invoice_notifications').insert({
        invoice_id: data.id,
        sender_address: address.toLowerCase(),
        recipient_address: form.recipient_address.toLowerCase(),
        amount: parseFloat(form.amount),
        description: form.description || '',
        seen: false,
      })
      setForm({ recipient_address: '', description: '', amount: '', due_date: '' })
      await loadInvoices()
      setTab('list')
    }
    setLoading(false)
  }

  async function payInvoice(inv: Invoice) {
    if (!address || !isAddress(inv.sender_address)) return
    setPaying(inv.id)
    try {
      const amount = parseUnits(inv.amount.toString(), USDC_DECIMALS)
      const to = inv.sender_address as `0x${string}`
      const data = `0xa9059cbb${to.slice(2).padStart(64, '0')}${amount.toString(16).padStart(64, '0')}`
      const tx = await sendTransactionAsync({ to: USDC_ADDRESS, data: data as `0x${string}` })
      await supabase.from('invoices').update({ status: 'paid', tx_hash: tx }).eq('id', inv.id)
      await saveTransaction(address!, inv.sender_address, inv.amount, tx, 'invoice')
      await supabase.from('invoice_paid_notifications').insert({
        invoice_id: inv.id,
        sender_address: inv.sender_address.toLowerCase(),
        payer_address: address!.toLowerCase(),
        amount: inv.amount,
        description: inv.description || '',
        seen: false,
      })
      setPayError(null)
      setNotifications((prev) => prev.filter((n) => n.id !== inv.id))
      await loadInvoices()
      await checkIncomingInvoices()
    } catch (e: unknown) {
      const err = e as Error
      setPayError(err.message?.includes('rejected') ? 'Transaction rejected.' : 'Payment failed. Please try again.')
    } finally { setPaying(null) }
  }

  async function cancelInvoice(inv: Invoice) {
    if (!address || inv.sender_address.toLowerCase() !== address.toLowerCase()) return
    if (inv.status !== 'pending') return
    setCancelling(inv.id)
    try {
      await supabase.from('invoices').update({ status: 'cancelled' }).eq('id', inv.id)
      setNotifications((prev) => prev.filter((n) => n.id !== inv.id))
      await loadInvoices()
    } catch {
      // ignore
    } finally { setCancelling(null) }
  }

  const pending = invoices.filter((i) => i.status === 'pending').reduce((s, i) => s + i.amount, 0)
  const paid = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
  const overdue = invoices.filter((i) => i.status === 'overdue').reduce((s, i) => s + i.amount, 0)
  const totalPages = Math.max(1, Math.ceil(invoices.length / PAGE_SIZE))
  const paginated = invoices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>Invoice</h1>
            <p className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>Create &amp; track invoices</p>
          </div>
          <button
            onClick={() => { setTab(tab === 'new' ? 'list' : 'new'); setPayError(null) }}
            className="btn-primary px-4 py-2 text-sm rounded-lg w-full sm:w-auto"
          >
            {tab === 'new' ? '← Invoices' : '+ New Invoice'}
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4">
          <div className="card rounded-xl p-3 sm:p-4">
            <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Pending</p>
            <p className="text-lg sm:text-xl font-bold text-yellow-400">${pending.toFixed(2)}</p>
          </div>
          <div className="card rounded-xl p-3 sm:p-4">
            <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Paid</p>
            <p className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text-positive)' }}>${paid.toFixed(2)}</p>
          </div>
          <div className="card rounded-xl p-3 sm:p-4">
            <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Overdue</p>
            <p className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text-negative)' }}>${overdue.toFixed(2)}</p>
          </div>
        </div>

        {payError && (
          <div className="mb-3 px-4 py-2.5 rounded-xl text-sm" style={{ background: 'var(--status-negative-bg)', color: 'var(--status-negative-text)', border: '1px solid var(--status-negative-text)' }}>
            ⚠️ {payError}
          </div>
        )}

        {tab === 'list' ? (
          <>
          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs" style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                  <th className="px-6 py-3 text-left">Recipient</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center" style={{ color: 'var(--text-secondary)' }}>
                      No invoices yet
                    </td>
                  </tr>
                ) : (
                  paginated.map((inv, idx) => (
                    <tr key={inv.id}
                        className={`card-hover ${inv.status === 'cancelled' ? 'opacity-50' : ''}`}
                        style={idx < paginated.length - 1 ? { borderBottom: '1px solid var(--border)' } : undefined}>
                      <td className="px-6 py-3 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {inv.recipient_address.slice(0, 6)}...{inv.recipient_address.slice(-4)}
                      </td>
                      <td className="px-6 py-3 text-right font-medium" style={{ color: 'var(--text-primary)' }}>${inv.amount}</td>
                      <td className="px-6 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="px-2 py-0.5 rounded-full text-xs" style={STATUS_STYLES[inv.status]}>
                            {STATUS_LABELS[inv.status]}
                          </span>
                          {inv.status === 'pending' && (
                            <button
                              onClick={() => setCancelOwnInvoice(inv)}
                              disabled={cancelling === inv.id}
                              className="text-sm px-1 hover:opacity-70 transition-opacity"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {new Date(inv.created_at).toLocaleDateString('en-GB')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {invoices.length > PAGE_SIZE && (
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, invoices.length)} / {invoices.length} invoices
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 disabled:opacity-40 text-xs rounded-lg transition-colors"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                >
                  ← Previous
                </button>
                <span className="text-xs px-1" style={{ color: 'var(--text-secondary)' }}>{page} / {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 disabled:opacity-40 text-xs rounded-lg transition-colors"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
          </>
        ) : (
          <div className="card rounded-xl p-6 space-y-4">
            <h2 className="text-white font-medium">New Invoice</h2>
            <div>
              <label className="label mb-1 block">Client Address (0x...)</label>
              <input
                value={form.recipient_address}
                onChange={(e) => setForm({ ...form, recipient_address: e.target.value })}
                placeholder="0x..."
                className="input-base font-mono"
              />
            </div>
            <div>
              <label className="label mb-1 block">Description</label>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Service fee..."
                className="input-base"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label mb-1 block">Amount (USDC)</label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                  className="input-base"
                />
              </div>
              <div>
                <label className="label mb-1 block">Due Date</label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  className="input-base"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={createInvoice}
                disabled={loading || !form.recipient_address || !form.amount}
                className="btn-primary flex-1 py-2.5 rounded-lg text-sm font-medium"
              >
                {loading ? 'Sending...' : 'Send'}
              </button>
              <button
                onClick={() => setTab('list')}
                className="btn-ghost px-6 py-2.5 rounded-lg text-sm"
              >
                Discard
              </button>
            </div>
          </div>
        )}

        {/* Incoming Invoice Notifications */}
        {notifications.length > 0 && tab === 'list' && (
          <div className="mt-4 rounded-xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2">
                <span style={{ color: 'var(--teal)' }}>📄</span>
                <p className="text-white font-medium text-sm">Pending Invoices</p>
                <span className="btn-primary px-2 py-0.5 text-xs rounded-full">{notifications.length}</span>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs" style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                  <th className="px-6 py-3 text-left">Sender</th>
                  <th className="px-6 py-3 text-left">Invoice Detail</th>
                  <th className="px-6 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((notif, idx) => (
                  <tr key={notif.id} className="card-hover"
                      style={idx < notifications.length - 1 ? { borderBottom: '1px solid var(--border)' } : undefined}>
                    <td className="px-6 py-3 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {notif.sender_address}
                    </td>
                    <td className="px-6 py-3">
                      {notif.description && (
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{notif.description}</p>
                      )}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => payInvoice(notif)}
                          disabled={paying === notif.id}
                          className="btn-primary px-4 py-1.5 disabled:opacity-60 text-xs font-medium rounded-lg"
                        >
                          {paying === notif.id ? '⏳' : `💸 Pay $${notif.amount} USDC`}
                        </button>
                        <button
                          onClick={() => setCancelConfirm(notif)}
                          className="text-sm px-1"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Cancel Confirm Modal */}
        {cancelConfirm && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: "var(--overlay)" }}>
            <div className="rounded-2xl p-6 max-w-sm w-full shadow-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="text-center mb-4">
                <span className="text-4xl">⚠️</span>
              </div>
              <h3 className="text-white font-bold text-lg text-center mb-2">Cancel invoice?</h3>
              <p className="text-sm text-center mb-2" style={{ color: 'var(--text-secondary)' }}>
                <span className="font-mono text-white">
                  {cancelConfirm.sender_address.slice(0, 6)}...{cancelConfirm.sender_address.slice(-4)}
                </span>{' '}
                sent you an invoice for{' '}
                <span className="text-white font-bold">${cancelConfirm.amount} USDC</span>. Are you sure you want to cancel it?
              </p>
              {cancelConfirm.description && (
                <p className="text-xs text-center italic mb-4" style={{ color: 'var(--text-secondary)' }}>&ldquo;{cancelConfirm.description}&rdquo;</p>
              )}
              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => setCancelConfirm(null)}
                  className="btn-ghost flex-1 py-2.5 rounded-xl text-sm font-medium"
                >
                  Go back
                </button>
                <button
                  onClick={async () => {
                    await supabase.from('invoices').update({ status: 'cancelled' }).eq('id', cancelConfirm.id)
                    setNotifications((prev) => prev.filter((n) => n.id !== cancelConfirm.id))
                    setCancelConfirm(null)
                    await loadInvoices()
                  }}
                  className="btn-danger flex-1 py-2.5 rounded-xl text-sm font-bold"
                >
                  Yes, Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Own Invoice Modal */}
        {cancelOwnInvoice && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: "var(--overlay)" }}>
            <div className="rounded-2xl p-6 max-w-sm w-full shadow-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="text-center mb-4">
                <span className="text-4xl">⚠️</span>
              </div>
              <h3 className="text-white font-bold text-lg text-center mb-2">Are you sure you want to cancel this invoice?</h3>
              <p className="text-sm text-center mb-2" style={{ color: 'var(--text-secondary)' }}>
                Invoice to{' '}
                <span className="font-mono text-white">
                  {cancelOwnInvoice.recipient_address.slice(0, 6)}...{cancelOwnInvoice.recipient_address.slice(-4)}
                </span>{' '}
                for{' '}
                <span className="text-white font-bold">${cancelOwnInvoice.amount} USDC</span> will be cancelled.
              </p>
              {cancelOwnInvoice.description && (
                <p className="text-xs text-center italic mb-4" style={{ color: 'var(--text-secondary)' }}>&ldquo;{cancelOwnInvoice.description}&rdquo;</p>
              )}
              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => setCancelOwnInvoice(null)}
                  className="btn-ghost flex-1 py-2.5 rounded-xl text-sm font-medium"
                >
                  Go back
                </button>
                <button
                  onClick={async () => {
                    setCancelling(cancelOwnInvoice.id)
                    await cancelInvoice(cancelOwnInvoice)
                    setCancelOwnInvoice(null)
                  }}
                  disabled={cancelling === cancelOwnInvoice.id}
                  className="btn-danger flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-60"
                >
                  {cancelling === cancelOwnInvoice.id ? 'Cancelling...' : 'Yes, Cancel'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
