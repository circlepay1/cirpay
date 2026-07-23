import { NextRequest, NextResponse } from "next/server"
import { AppKit } from "@circle-fin/app-kit"
import { createViemAdapterFromPrivateKey } from "@circle-fin/adapter-viem-v2"
import { createPublicClient, http } from "viem"

// SSL sertifika sorununu bypass et (Arc Testnet)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

const kit = new AppKit()

export async function POST(req: NextRequest) {
  try {
    const { tokenIn, tokenOut, amountIn } = await req.json()

    const kitKey = process.env.NEXT_PUBLIC_KIT_KEY
    if (!kitKey) {
      return NextResponse.json({ error: "KIT_KEY not configured on server" }, { status: 503 })
    }

    if (!tokenIn || !tokenOut || !amountIn) {
      return NextResponse.json({ error: "Missing tokenIn, tokenOut or amountIn" }, { status: 400 })
    }

    const adapter = createViemAdapterFromPrivateKey({
      privateKey: "0x0000000000000000000000000000000000000000000000000000000000000001",
      getPublicClient: ({ chain }) =>
        createPublicClient({
          chain,
          transport: http("https://rpc.testnet.arc.network"),
        }),
    })

    const estimate = await kit.estimateSwap({
      from:    { adapter, chain: "Arc_Testnet" },
      tokenIn,
      tokenOut,
      amountIn,
      config:  { kitKey },
    })

    return NextResponse.json({
      estimatedOutput: estimate.estimatedOutput,
      stopLimit:       estimate.stopLimit,
      fees:            estimate.fees,
    })
  } catch (err) {
    console.error("[swap-quote error]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to get quote" },
      { status: 500 }
    )
  }
}
