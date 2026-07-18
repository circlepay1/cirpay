import { createViemAdapterFromProvider } from '@circle-fin/adapter-viem-v2'

const ARC_CHAIN_ID_HEX = '0x4cef52' // 5042002 decimal

/**
 * Browser wallet provider'dan viem adapter oluşturur.
 * Arc Testnet'e otomatik switch yapar.
 */
export async function getAdapter() {
  const provider = (window as unknown as { ethereum: unknown }).ethereum
  if (!provider) throw new Error('No wallet provider found. Please connect your wallet.')

  const request = (provider as { request: (args: object) => Promise<unknown> }).request.bind(provider)

  try {
    await request({ method: 'wallet_switchEthereumChain', params: [{ chainId: ARC_CHAIN_ID_HEX }] })
  } catch (switchErr: unknown) {
    const err = switchErr as { code?: number }
    if (err.code === 4902 || err.code === -32603) {
      await request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId:           ARC_CHAIN_ID_HEX,
          chainName:         'Arc Testnet',
          nativeCurrency:    { name: 'ARC', symbol: 'ARC', decimals: 18 },
          rpcUrls:           ['https://rpc.testnet.arc.network'],
          blockExplorerUrls: ['https://testnet.arcscan.app'],
        }],
      })
    }
  }

  return createViemAdapterFromProvider({
    provider: provider as Parameters<typeof createViemAdapterFromProvider>[0]['provider'],
  })
}
