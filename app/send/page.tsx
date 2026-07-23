'use client'

import { useState, useCallback, useEffect } from 'react'
import { useAccount, useSwitchChain } from 'wagmi'
import { isAddress } from 'viem'
import AppLayout from '@/app/components/AppLayout'
import { arcTestnet, USDC_ADDRESS, EURC_ADDRESS, CIRBTC_ADDRESS } from '@/lib/arc'
import { AppKit } from '@circle-fin/app-kit'
import { getAdapter } from '@/lib/adapter'
import { patchCircleFetch } from '@/lib/patch-circle-fetch'
import { saveTransaction } from '@/lib/supabase'

const TOKENS = [
  { symbol: 'USDC',   name: 'USD Coin',       decimals: 6,  address: USDC_ADDRESS,   logo: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png' },
  { symbol: 'EURC',   name: 'Euro Coin',       decimals: 6,  address: EURC_ADDRESS,   logo: 'https://assets.coingecko.com/coins/images/26045/small/euro-coin.png' },
  { symbol: 'cirBTC', name: 'Circle Bitcoin',  decimals: 8,  address: CIRBTC_ADDRESS, logo: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png' },
]

export default function SendPage() {
  const { address, chainId } = useAccount()
  const { switchChain }      = useSwitchChain()

  const [token,     setToken]     = useState(TOKENS[0])
  const [amount,    setAmount]    = useState('')
  const [recipient, setRecipient] = useState('')
  const [status,    setStatus]    = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [errMsg,    setErrMsg]    = useState('')
  const [txHash,    setTxHash]    = useState('')
  const [tokenOpen, setTokenOpen] = useState(false)
  const [balStr,    setBalStr]    = useState('0')

  // Balance — ArcScan API
  useEffect(() => {
    if (!address) return
    async function fetchBal() {
      try {
        const res  = await fetch(`https://testnet.arcscan.app/api/v2/addresses/${address}/token-balances`)
        const data = await res.json()
        const item = (data as { token: { address_hash: string }; value: string }[])
          .find(t => t.token?.address_hash?.toLowerCase() === token.address.toLowerCase())
        setBalStr(item ? (parseFloat(item.value) / Math.pow(10, token.decimals)).toFixed(6).replace(/\.?0+$/, '') : '0')
      } catch { setBalStr('0') }
    }
    fetchBal()
  }, [address, token.address, token.decimals])

  const isWrongChain    = !!address && chainId !== arcTestnet.id
  const isPending       = status === 'sending'
  const validRecipient  = isAddress(recipient)

  // KRİTİK: patchCircleFetch CORS proxy'sini aktif et
  useEffect(() => { patchCircleFetch() }, [])

  const handleSend = useCallback(async () => {
    if (!address || !amount || parseFloat(amount) <= 0 || !validRecipient) return
    setStatus('sending')
    setErrMsg('')
    setTxHash('')

    try {
      const kit     = new AppKit()
      const adapter = await getAdapter()

      const result = await kit.send({
        from:   { adapter, chain: 'Arc_Testnet' },
        to:     recipient as `0x${string}`,
        amount,
        token:  token.symbol,
      })

      const hash = (result as { txHash?: string })?.txHash ?? ''
      setTxHash(hash)

      if (address) {
        await saveTransaction(address, recipient, parseFloat(amount), hash, 'send')
      }

      setAmount('')
      setRecipient('')
      setStatus('success')
      setTimeout(() => setStatus('idle'), 4000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Send failed'
      if (msg.toLowerCase().includes('rejected') || msg.includes('4001')) {
        setErrMsg('Transaction rejected.')
      } else {
        setErrMsg(msg)
      }
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }, [address, amount, recipient, token, validRecipient])

  const canSend = !!address && !isWrongChain && !isPending &&
                  !!amount && parseFloat(amount) > 0 && validRecipient

  return (
    <AppLayout>
      <div className="max-w-md mx-auto">
        <div className="mb-4">
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>Send</h1>
          <p className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
            Transfer tokens via Circle AppKit
          </p>
        </div>

        <div className="card rounded-xl p-4 sm:p-5 space-y-3">

          {/* Token + Amount */}
          <div className="rounded-xl border p-3" style={{ background: 'var(--bg-input)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>You send</span>
              {address && (
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Balance: <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{balStr}</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="flex-1 bg-transparent text-xl font-bold outline-none min-w-0 w-0"
                style={{ color: 'var(--text-primary)' }}
              />

              {/* Token selector */}
              <div className="relative">
                <button
                  onClick={() => setTokenOpen(o => !o)}
                  className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold border transition-all"
                  style={{ background: 'var(--bg-card)', borderColor: tokenOpen ? 'var(--purple)' : 'var(--border)', color: 'var(--text-primary)', minWidth: 100 }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={token.logo} alt={token.symbol} width={16} height={16} className="rounded-full" />
                  <span>{token.symbol}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    style={{ transform: tokenOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {tokenOpen && (
                  <div className="absolute right-0 top-full mt-1 rounded-xl border shadow-lg z-50 overflow-hidden"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', minWidth: 140 }}>
                    {TOKENS.map(t => (
                      <button key={t.symbol}
                        onClick={() => { setToken(t); setTokenOpen(false) }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-left transition-all"
                        style={{ background: t.symbol === token.symbol ? 'var(--bg-input)' : undefined, color: 'var(--text-primary)' }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={t.logo} alt={t.symbol} width={18} height={18} className="rounded-full" />
                        <div>
                          <p className="text-sm font-bold leading-none">{t.symbol}</p>
                          <p className="text-[10px] leading-none mt-0.5" style={{ color: 'var(--text-secondary)' }}>{t.name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recipient */}
          <div className="rounded-xl border p-3" style={{ background: 'var(--bg-input)', borderColor: 'var(--border)' }}>
            <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>Recipient Address</p>
            <input
              type="text"
              placeholder="0x..."
              value={recipient}
              onChange={e => setRecipient(e.target.value)}
              className="w-full bg-transparent text-sm font-mono outline-none"
              style={{ color: recipient && !validRecipient ? 'var(--text-negative)' : 'var(--text-primary)' }}
            />
            {recipient && !validRecipient && (
              <p className="text-xs mt-1" style={{ color: 'var(--text-negative)' }}>Invalid address</p>
            )}
          </div>

          {/* Error */}
          {errMsg && (
            <p className="text-xs rounded-lg px-3 py-2" style={{ color: 'var(--text-negative)', background: 'rgba(239,68,68,0.1)' }}>
              ⚠ {errMsg}
            </p>
          )}

          {/* Success */}
          {status === 'success' && (
            <div className="rounded-lg px-3 py-2 text-sm" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--teal)' }}>
              ✅ Sent successfully!{' '}
              {txHash && (
                <a href={`https://testnet.arcscan.app/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                  className="underline font-mono text-xs">
                  {txHash.slice(0, 10)}...
                </a>
              )}
            </div>
          )}

          {/* Button */}
          {!address ? (
            <p className="text-center text-sm py-3" style={{ color: 'var(--text-secondary)' }}>
              Connect your wallet to send
            </p>
          ) : isWrongChain ? (
            <button
              onClick={() => switchChain({ chainId: arcTestnet.id })}
              className="btn-primary w-full py-3 rounded-xl font-bold text-sm"
            >
              Switch to Arc Testnet
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!canSend}
              className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:cursor-not-allowed"
              style={{
                background: canSend ? 'var(--teal)' : 'var(--bg-input)',
                color:      canSend ? '#fff'          : 'var(--text-secondary)',
              }}
            >
              {isPending ? '⏳ Sending...' : `↗ Send ${token.symbol}`}
            </button>
          )}

          <p className="text-center text-xs" style={{ color: 'var(--text-secondary)' }}>
            Powered by Circle AppKit · Arc Testnet
          </p>
        </div>
      </div>
    </AppLayout>
  )
}
