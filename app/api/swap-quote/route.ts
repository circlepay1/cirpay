import { NextRequest, NextResponse } from 'next/server'
import { AppKit } from '@circle-fin/app-kit'
import { createViemAdapterFromPrivateKey } from '@circle-fin/adapter-viem-v2'
import { createPublicClient, http } from 'viem'

const kit = new AppKit()

export async function POST(req: NextRequest) {
  const kitKey = process.env.NEXT_PUBLIC_KIT_KEY
  if (!kitKey) return NextResponse.json({ error: 'KIT_KEY not configured' }, { status: 503 })

  try {
    const { tokenIn, tokenOut, amountIn, userAddress } = await req.json()
    if (!tokenIn || !tokenOut || !amountIn || !userAddress) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Sadece quote için dummy adapter (imzalama yok)
    const adapter = createViemAdapterFromPrivateKey({
      privateKey: '0x0000000000000000000000000000000000000000000000000000000000000001',
      getPublicClient: ({ chain }) =>
        createPublicClient({
          chain,
          transport: http('https://rpc.testnet.arc.network', { retryCount: 3, timeout: 15000 }),
        }),
    })

    const estimate = await kit.estimateSwap({
      from:     { adapter, chain: 'Arc_Testnet' },
      tokenIn,
      tokenOut,
      amountIn,
      config:   { kitKey },
    })

    return NextResponse.json({
      tokenIn, tokenOut, amountIn,
      estimatedOutput: estimate.estimatedOutput,
      stopLimit:       estimate.stopLimit,
      fees:            estimate.fees,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to get quote'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
