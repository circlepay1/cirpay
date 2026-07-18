import { createPublicClient, http, formatUnits } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { config } from 'dotenv'

config({ path: '.env.local' })

// Arc Testnet SSL sertifika sorunu için
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const arcTestnet = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { decimals: 18, name: 'ARC', symbol: 'ARC' },
  rpcUrls: { default: { http: ['https://rpc.testnet.arc.network'] } },
  testnet: true,
}

const USDC_ADDRESS = '0x3600000000000000000000000000000000000000'

const ERC20_BALANCE_ABI = [{
  name: 'balanceOf',
  type: 'function',
  stateMutability: 'view',
  inputs: [{ name: 'account', type: 'address' }],
  outputs: [{ type: 'uint256' }],
}]

const pk = process.env.MAIN_WALLET_PRIVATE_KEY.startsWith('0x')
  ? process.env.MAIN_WALLET_PRIVATE_KEY
  : `0x${process.env.MAIN_WALLET_PRIVATE_KEY}`

const account = privateKeyToAccount(pk)
const client  = createPublicClient({ chain: arcTestnet, transport: http('https://rpc.testnet.arc.network') })

const usdcBalance = await client.readContract({
  address: USDC_ADDRESS,
  abi: ERC20_BALANCE_ABI,
  functionName: 'balanceOf',
  args: [account.address],
})

const arcBalance = await client.getBalance({ address: account.address })

console.log(`\n💼  Adres : ${account.address}`)
console.log(`💵  USDC  : ${formatUnits(usdcBalance, 6)} USDC`)
console.log(`⛽  ARC   : ${formatUnits(arcBalance, 18)} ARC\n`)
