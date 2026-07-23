'use client'

import { useState, useCallback, useEffect } from 'react'
import { useAccount, useSwitchChain, useBalance } from 'wagmi'
import AppLayout from '@/app/components/AppLayout'
import { arcTestnet, USDC_ADDRESS, EURC_ADDRESS, CIRBTC_ADDRESS } from '@/lib/arc'
import { saveTransaction } from '@/lib/supabase'
import { AppKit } from '@circle-fin/app-kit'
import { getAdapter } from '@/lib/adapter'
import { patchCircleFetch } from '@/lib/patch-circle-fetch'

const TOKENS = [
  { symbol: 'USDC',   name: 'USD Coin',      decimals: 6, address: USDC_ADDRESS,   logo: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png' },
  { symbol: 'EURC',   name: 'Euro Coin',     decimals: 6, address: EURC_ADDRESS,   logo: 'https://assets.coingecko.com/coins/images/26045/small/euro-coin.png' },
  { symbol: 'cirBTC', name: 'Circle Bitcoin',decimals: 8, address: CIRBTC_ADDRESS, logo: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png' },
]

type Status = 'idle' | 'estimating' | 'swapping' | 'success' | 'error'

interface Estimate {
  estimatedOutput: { amount: string; token: string }
  stopLimit:       { amount: string; token: string }
  fees:            { type: string; amount: string; token: string }[]
}

export default function SwapPage() {
  const { address, chainId } = useAccount()
  const { switchChain }      = useSwitchChain()

  const [tokenIn,  setTokenIn]  = useState(TOKENS[0])
  const [tokenOut, setTokenOut] = useState(TOKENS[1])
  const [amountIn, setAmountIn] = useState('')
  const [status,   setStatus]   = useState<Status>('idle')
  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [errMsg,   setErrMsg]   = useState('')
  const [txHash,   setTxHash]   = useState('')
  const [inOpen,   setInOpen]   = useState(false)
  const [outOpen,  setOutOpen]  = useState(false)

  const isWrongChain = !!address && chainId !== arcTestnet.id
  const isPending    = status === 'swapping' || status === 'estimating'

  // Token balances
  const { data: balIn }  = useBalance({ address, chainId: arcTestnet.id, token: tokenIn.address  as `0x${string}` })
  const { data: balOut } = useBalance({ address, chainId: arcTestnet.id, token: tokenOut.address as `0x${string}` })
  const balInStr  = balIn  ? parseFloat(balIn.formatted).toFixed(4)  : '0'
  const balOutStr = balOut ? parseFloat(balOut.formatted).toFixed(4) : '0'

  // KRİTİK: patchCircleFetch CORS proxy'sini aktif et
  useEffect(() => { patchCircleFetch() }, [])

  // Auto-quote
  useEffect(() => {
    if (!address || !amountIn || parseFloat(amountIn) <= 0) { setEstimate(null); return }
    const t = setTimeout(() => handleEstimate(), 600)
    return () => clearTimeout(t)
  }, [amountIn, tokenIn.symbol, tokenOut.symbol, address]) // eslint-disable-line

  const handleEstimate = useCallback(async () => {
    if (!address || !amountIn || parseFloat(amountIn) <= 0) return
    setStatus('estimating'); setEstimate(null); setErrMsg('')
    try {
      const res = await fetch('/api/swap-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenIn: tokenIn.symbol, tokenOut: tokenOut.symbol, amountIn }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Quote failed')
      setEstimate(data)
      setStatus('idle')
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Quote failed')
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }, [address, amountIn, tokenIn, tokenOut])

  const handleSwap = useCallback(async () => {
    if (!address || !amountIn || !estimate) return
    setStatus('swapping'); setErrMsg(''); setTxHash('')
    try {
      const kitKey = process.env.NEXT_PUBLIC_KIT_KEY
      if (!kitKey) throw new Error('KIT_KEY not configured')

      // getAdapter() her işlem öncesi çağrılmalı
      const adapter = await getAdapter()
      const result  = await new AppKit().swap({
        from:     { adapter, chain: 'Arc_Testnet' },
        tokenIn:  tokenIn.symbol,
        tokenOut: tokenOut.symbol,
        amountIn,
        config:   { kitKey },
      })

      const hash = (result as { txHash?: string })?.txHash ?? ''
      setTxHash(hash)
      await saveTransaction(address, address, parseFloat(amountIn), hash, 'swap')

      setAmountIn(''); setEstimate(null)
      setStatus('success')
      setTimeout(() => setStatus('idle'), 4000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Swap failed'
      setErrMsg(msg.toLowerCase().includes('rejected') ? 'Transaction rejected.' : msg)
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }, [address, amountIn, tokenIn, tokenOut, estimate])

  const canSwap = !!address && !isWrongChain && !isPending && !!amountIn && parseFloat(amountIn) > 0 && !!estimate

  return (
    <AppLayout>
      <div className="max-w-md mx-auto">
        <div className="mb-4">
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>Swap</h1>
          <p className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>Swap tokens via Circle AppKit</p>
        </div>

        <div className="card rounded-xl p-4 sm:p-5 space-y-3">

          {/* You pay */}
          <div className="rounded-xl border p-3" style={{ background: 'var(--bg-input)', borderColor: 'var(--border)' }}>
            <div className="flex justify-between mb-2">
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>You pay</span>
              {address && <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Balance: <b style={{ color: 'var(--text-primary)' }}>{balInStr}</b></span>}
            </div>
            <div className="flex items-center gap-2">
              <input type="number" placeholder="0.0" value={amountIn}
                onChange={e => { setAmountIn(e.target.value); setEstimate(null); setErrMsg('') }}
                className="flex-1 bg-transparent text-xl font-bold outline-none min-w-0 w-0"
                style={{ color: 'var(--text-primary)' }} />
              <div className="relative">
                <button onClick={() => setInOpen(o => !o)}
                  className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold border"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)', minWidth: 100 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={tokenIn.logo} alt={tokenIn.symbol} width={16} height={16} className="rounded-full" />
                  <span>{tokenIn.symbol}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
                </button>
                {inOpen && (
                  <div className="absolute right-0 top-full mt-1 rounded-xl border shadow-lg z-50 overflow-hidden"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', minWidth: 130 }}>
                    {TOKENS.filter(t => t.symbol !== tokenOut.symbol).map(t => (
                      <button key={t.symbol} onClick={() => { setTokenIn(t); setInOpen(false); setEstimate(null) }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-left"
                        style={{ background: t.symbol === tokenIn.symbol ? 'var(--bg-input)' : undefined, color: 'var(--text-primary)' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={t.logo} alt={t.symbol} width={18} height={18} className="rounded-full" />
                        <span>{t.symbol}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {/* PCT butonları */}
            {address && parseFloat(balInStr) > 0 && (
              <div className="flex gap-1 mt-2">
                {[25, 50, 75, 100].map(pct => (
                  <button key={pct}
                    onClick={() => {
                      const bal = balIn ? parseFloat(balIn.formatted) : 0
                      const val = pct === 100
                        ? bal.toFixed(6).replace(/\.?0+$/, '')
                        : (bal * pct / 100).toFixed(6).replace(/\.?0+$/, '')
                      setAmountIn(val)
                      setEstimate(null)
                    }}
                    className="flex-1 rounded-full py-0.5 text-xs font-semibold transition-all border"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--purple)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                  >
                    {pct === 100 ? 'MAX' : `${pct}%`}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Swap arrow */}
          <div className="flex justify-center">
            <button onClick={() => { setTokenIn(tokenOut); setTokenOut(tokenIn); setAmountIn(''); setEstimate(null) }}
              className="w-9 h-9 rounded-full border flex items-center justify-center transition-all"
              style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M7 16V4m0 0L3 8m4-4l4 4"/><path d="M17 8v12m0 0l4-4m-4 4l-4-4"/>
              </svg>
            </button>
          </div>

          {/* You receive */}
          <div className="rounded-xl border p-3" style={{ background: 'var(--bg-input)', borderColor: 'var(--border)' }}>
            <div className="flex justify-between mb-2">
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>You receive</span>
              {address && <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Balance: <b style={{ color: 'var(--text-primary)' }}>{balOutStr}</b></span>}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {status === 'estimating'
                  ? <span className="animate-pulse text-sm" style={{ color: 'var(--text-secondary)' }}>Getting quote...</span>
                  : estimate?.estimatedOutput?.amount ?? '0.0'}
              </div>
              <div className="relative">
                <button onClick={() => setOutOpen(o => !o)}
                  className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold border"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)', minWidth: 100 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={tokenOut.logo} alt={tokenOut.symbol} width={16} height={16} className="rounded-full" />
                  <span>{tokenOut.symbol}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
                </button>
                {outOpen && (
                  <div className="absolute right-0 top-full mt-1 rounded-xl border shadow-lg z-50 overflow-hidden"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', minWidth: 130 }}>
                    {TOKENS.filter(t => t.symbol !== tokenIn.symbol).map(t => (
                      <button key={t.symbol} onClick={() => { setTokenOut(t); setOutOpen(false); setEstimate(null) }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-left"
                        style={{ background: t.symbol === tokenOut.symbol ? 'var(--bg-input)' : undefined, color: 'var(--text-primary)' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={t.logo} alt={t.symbol} width={18} height={18} className="rounded-full" />
                        <span>{t.symbol}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quote info */}
          {estimate && amountIn && (
            <div className="rounded-xl border px-3 py-2 text-xs space-y-1"
              style={{ background: 'var(--bg-input)', borderColor: 'var(--border)' }}>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-secondary)' }}>Rate</span>
                <span style={{ color: 'var(--text-primary)' }}>
                  1 {tokenIn.symbol} ≈ {(parseFloat(estimate.estimatedOutput.amount) / parseFloat(amountIn)).toFixed(4)} {tokenOut.symbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-secondary)' }}>Min received</span>
                <span style={{ color: 'var(--text-primary)' }}>{estimate.stopLimit.amount} {tokenOut.symbol}</span>
              </div>
            </div>
          )}

          {/* Error */}
          {errMsg && (
            <p className="text-xs rounded-lg px-3 py-2" style={{ color: 'var(--text-negative)', background: 'rgba(239,68,68,0.1)' }}>
              ⚠ {errMsg}
            </p>
          )}

          {/* Success */}
          {status === 'success' && (
            <div className="rounded-lg px-3 py-2 text-sm" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--teal)' }}>
              ✅ Swap successful!{' '}
              {txHash && (
                <a href={`https://testnet.arcscan.app/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="underline font-mono text-xs">
                  {txHash.slice(0, 10)}...
                </a>
              )}
            </div>
          )}

          {/* Button */}
          {!address ? (
            <p className="text-center text-sm py-3" style={{ color: 'var(--text-secondary)' }}>Connect your wallet to swap</p>
          ) : isWrongChain ? (
            <button onClick={() => switchChain({ chainId: arcTestnet.id })} className="btn-primary w-full py-3 rounded-xl font-bold text-sm">
              Switch to Arc Testnet
            </button>
          ) : (
            <button onClick={estimate ? handleSwap : handleEstimate}
              disabled={isPending || !amountIn || parseFloat(amountIn) <= 0}
              className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:cursor-not-allowed"
              style={{
                background: (amountIn && parseFloat(amountIn) > 0) ? 'var(--purple)' : 'var(--bg-input)',
                color:      (amountIn && parseFloat(amountIn) > 0) ? '#fff' : 'var(--text-secondary)',
              }}>
              {status === 'estimating' ? '⏳ Getting quote...'
                : status === 'swapping' ? '⏳ Swapping...'
                : estimate ? `⇄ Swap ${tokenIn.symbol} → ${tokenOut.symbol}`
                : 'Enter amount'}
            </button>
          )}

          <p className="text-center text-xs" style={{ color: 'var(--text-secondary)' }}>Powered by Circle AppKit · Arc Testnet</p>
        </div>
      </div>
    </AppLayout>
  )
}
