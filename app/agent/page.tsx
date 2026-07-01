'use client'

import { useState } from 'react'
import { useAccount, useSendTransaction } from 'wagmi'
import { isAddress, parseUnits } from 'viem'
import AppLayout from '@/app/components/AppLayout'
import { USDC_ADDRESS, USDC_DECIMALS } from '@/lib/arc'
import { supabase, saveTransaction } from '@/lib/supabase'

type Message = {
  role: 'user' | 'assistant'
  content: string
  type?: 'info' | 'success' | 'error'
}

export default function AgentPage() {
  const { address, isConnected } = useAccount()
  const { sendTransactionAsync } = useSendTransaction()

  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [pendingSend, setPendingSend] = useState<{ to: string; amount: string } | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  function startSendFlow() {
    setMessages([{ role: 'assistant', content: '💸 Which address would you like to send USDC to, and how much? Example: Send 10 USDC to 0x1234...' }])
    setPendingSend(null)
  }

  function startInvoiceFlow() {
    setMessages([{ role: 'assistant', content: '🧾 Which address would you like to send an invoice to, and for how much? Example: Invoice 0x1234... for 50 USDC web design' }])
  }

  async function confirmSend() {
    if (!pendingSend) return
    setConfirmLoading(true)
    try {
      const amount = parseUnits(pendingSend.amount, USDC_DECIMALS)
      const txData = `0xa9059cbb${pendingSend.to.slice(2).padStart(64, '0')}${amount.toString(16).padStart(64, '0')}`
      const tx = await sendTransactionAsync({ to: USDC_ADDRESS, data: txData as `0x${string}` })
      await saveTransaction(address!, pendingSend.to, parseFloat(pendingSend.amount), tx, 'send')
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: `✅ ${pendingSend.amount} USDC sent! TX: ${tx.slice(0, 10)}...`,
        type: 'success',
      }])
      setPendingSend(null)
    } catch (e: unknown) {
      const err = e as Error
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: `❌ ${err.message?.includes('rejected') ? 'Transaction rejected.' : 'An error occurred.'}`,
        type: 'error',
      }])
      setPendingSend(null)
    } finally {
      setConfirmLoading(false)
    }
  }

  const sendMessage = async (text?: string) => {
    const userText = text || input
    if (!userText.trim()) return
    setMessages((prev) => [...prev, { role: 'user', content: userText }])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText }),
      })
      const data = await res.json()
      const intent = data.intent

      if (intent.action === 'send') {
        if (!isConnected) {
          setMessages((prev) => [...prev, { role: 'assistant', content: '❌ Please connect your wallet.', type: 'error' }])
        } else if (!isAddress(intent.to)) {
          setMessages((prev) => [...prev, { role: 'assistant', content: `⚠️ "${intent.to}" is not a valid address. Please enter an address starting with 0x.`, type: 'error' }])
        } else {
          setPendingSend({ to: intent.to, amount: intent.amount })
          setMessages((prev) => [...prev, {
            role: 'assistant',
            content: `Do you confirm the following transaction?`,
            type: 'info',
          }])
        }
      } else if (intent.action === 'invoice') {
        if (!isConnected) {
          setMessages((prev) => [...prev, { role: 'assistant', content: '❌ Please connect your wallet.', type: 'error' }])
        } else if (!isAddress(intent.to)) {
          setMessages((prev) => [...prev, { role: 'assistant', content: `⚠️ "${intent.to}" is not a valid address. Please enter an address starting with 0x.`, type: 'error' }])
        } else {
          try {
            const { data: inv } = await supabase.from('invoices').insert({
              sender_address: address?.toLowerCase() ?? '',
              recipient_address: intent.to.toLowerCase(),
              description: intent.description || '',
              amount: parseFloat(intent.amount),
              due_date: null,
              status: 'pending',
            }).select().single()
            if (inv) {
              await supabase.from('invoice_notifications').insert({
                invoice_id: inv.id,
                sender_address: address?.toLowerCase() ?? '',
                recipient_address: intent.to.toLowerCase(),
                amount: parseFloat(intent.amount),
                description: intent.description || '',
                seen: false,
              })
            }
            setMessages((prev) => [...prev, {
              role: 'assistant',
              content: `🧾 Invoice of $${intent.amount} USDC created for ${intent.to.slice(0, 6)}...${intent.to.slice(-4)}.${intent.description ? ` Description: "${intent.description}"` : ''} The recipient will be notified.`,
              type: 'success',
            }])
          } catch {
            setMessages((prev) => [...prev, { role: 'assistant', content: '❌ Failed to create invoice.', type: 'error' }])
          }
        }
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: intent.reply || 'Could not understand.' }])
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: '❌ Connection error.', type: 'error' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>ARC Agent</h1>
          <p className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>Transact with natural language</p>
        </div>

        <div className="flex gap-4 items-stretch">
          <div className="flex-1 rounded-xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="h-80 sm:h-96 overflow-y-auto p-3 sm:p-4 space-y-3">
              {messages.length === 0 && !loading ? (
                <div className="h-full flex flex-col items-center justify-center gap-4 sm:gap-5 px-4">
                  <span className="text-5xl sm:text-6xl">🤖</span>
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <button
                      onClick={startSendFlow}
                      className="btn-primary px-5 py-2.5 text-sm font-medium rounded-xl flex items-center justify-center gap-2"
                    >
                      <img src="https://assets.coingecko.com/coins/images/6319/small/usdc.png" alt="USDC" className="w-4 h-4 rounded-full" />
                      Send USDC
                    </button>
                    <button
                      onClick={startInvoiceFlow}
                      className="btn-ghost px-5 py-2.5 text-sm font-medium rounded-xl"
                    >
                      🧾 Send Invoice
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-sm px-4 py-2 rounded-2xl text-sm ${
                        msg.role === 'user'
                          ? ''
                          : msg.type === 'error'
                          ? 'bg-red-900/50 border border-red-700'
                          : msg.type === 'success'
                          ? 'bg-green-900/50 border border-green-700'
                          : ''
                      }`}
                      style={
                        msg.role === 'user'
                          ? { background: 'var(--teal)', color: '#FFFFFF' }
                          : msg.type === 'error'
                          ? { color: '#FF6B8A' }
                          : msg.type === 'success'
                          ? { color: '#00C9B1' }
                          : msg.type === 'info'
                          ? { background: 'var(--bg-card-hover)', color: 'var(--text-primary)' }
                          : { background: 'var(--bg-card-hover)', color: 'var(--text-primary)' }
                      }>
                        {msg.content}
                      </div>
                    </div>
                  ))}

                  {pendingSend && (
                    <div className="flex justify-start">
                      <div className="rounded-2xl p-4 max-w-sm w-full" style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--teal)' }}>
                        <p className="text-xs mb-3 font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Send Preview</p>
                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between text-sm">
                            <span style={{ color: 'var(--text-secondary)' }}>Recipient</span>
                            <span className="font-mono text-xs" style={{ color: 'var(--text-primary)' }}>{pendingSend.to.slice(0, 10)}...{pendingSend.to.slice(-6)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span style={{ color: 'var(--text-secondary)' }}>Amount</span>
                            <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{pendingSend.amount} USDC</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span style={{ color: 'var(--text-secondary)' }}>Gas</span>
                            <span style={{ color: 'var(--text-secondary)' }}>~$0.01</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setPendingSend(null)}
                            className="btn-ghost flex-1 py-2 rounded-xl text-xs font-medium"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={confirmSend}
                            disabled={confirmLoading}
                            className="btn-primary flex-1 py-2 rounded-xl text-xs font-bold disabled:opacity-60"
                          >
                            {confirmLoading ? '⏳ Sending...' : '✅ Confirm Send'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {loading && (
                    <div className="flex justify-start">
                      <div className="px-4 py-2 rounded-2xl text-sm animate-pulse" style={{ background: 'var(--bg-card-hover)', color: 'var(--text-secondary)' }}>
                        Thinking...
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-3 sm:p-4 flex gap-2 sm:gap-3" style={{ borderTop: '1px solid var(--border)' }}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Send 10 USDC to 0x1234..."
                className="input-base flex-1 text-sm"
                style={{ borderRadius: '0.75rem' }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                className="btn-primary px-3 sm:px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
