import { createPublicClient, http } from 'viem'
import { arcTestnet } from './wagmi-config'

export { arcTestnet }

export const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http('https://rpc.testnet.arc.network'),
})

// Contract addresses on Arc Testnet
export const USDC_ADDRESS   = '0x3600000000000000000000000000000000000000' as const
export const EURC_ADDRESS   = '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a' as const
export const CIRBTC_ADDRESS = '0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF' as const

// Token decimals
export const USDC_DECIMALS = 6

// Blockscout API
export const BLOCKSCOUT_API = 'https://testnet.arcscan.app/api/v2'

export async function getTransactionHistory(address: string) {
  try {
    const res = await fetch(
      `${BLOCKSCOUT_API}/addresses/${address}/token-transfers?limit=50&type=ERC-20`
    )
    if (!res.ok) return []
    const data = await res.json()
    const items = data.items || []
    return items.filter((tx: { token?: { address_hash: string } }) =>
      tx.token?.address_hash?.toLowerCase() === USDC_ADDRESS.toLowerCase()
    )
  } catch {
    return []
  }
}
