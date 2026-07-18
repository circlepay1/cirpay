/**
 * CirPay — USDC Dağıtım Scripti
 * Ana cüzdandan wallets.json içindeki 100 adrese eşit USDC dağıtır.
 *
 * Kullanım:
 *   node scripts/distribute.mjs
 */

import { createWalletClient, createPublicClient, http, parseUnits, encodeFunctionData } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { config } from 'dotenv'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

config({ path: '.env.local' })

// Arc Testnet SSL sertifika sorunu için
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

config({ path: '.env.local' })

// ─── Config ────────────────────────────────────────────────────
const WALLETS_FILE  = join(dirname(fileURLToPath(import.meta.url)), 'wallets.json')
const RPC_URL       = 'https://rpc.testnet.arc.network'
const USDC_ADDRESS  = '0x3600000000000000000000000000000000000000'
const USDC_DECIMALS = 6
const AMOUNT_EACH   = '0.15'   // her cüzdana gönderilecek USDC (sabit mod)
const RANDOM_AMOUNT = true     // true = 0.9-1.0 arası rastgele farklı miktar
const MIN_AMOUNT    = 0.90
const MAX_AMOUNT    = 1.00
const DELAY_MS      = 2000     // işlemler arası bekleme (ms)

// Ana cüzdanın private key'i .env.local'dan alınır
const MAIN_PRIVATE_KEY = process.env.MAIN_WALLET_PRIVATE_KEY

if (!MAIN_PRIVATE_KEY) {
  console.error('❌  .env.local içine şunu ekle: MAIN_WALLET_PRIVATE_KEY=0x...')
  process.exit(1)
}

// ─── Chain ─────────────────────────────────────────────────────
const arcTestnet = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { decimals: 18, name: 'ARC', symbol: 'ARC' },
  rpcUrls: { default: { http: [RPC_URL] } },
  testnet: true,
}

// ─── ERC-20 ABI ─────────────────────────────────────────────────
const ERC20_ABI = [{
  name: 'transfer',
  type: 'function',
  stateMutability: 'nonpayable',
  inputs: [
    { name: 'recipient', type: 'address' },
    { name: 'amount',    type: 'uint256' },
  ],
  outputs: [{ type: 'bool' }],
}]

// ─── Ana fonksiyon ───────────────────────────────────────────────
async function main() {
  // Private key başında 0x yoksa ekle
  const pk = MAIN_PRIVATE_KEY.startsWith('0x')
    ? MAIN_PRIVATE_KEY
    : `0x${MAIN_PRIVATE_KEY}`

  const account      = privateKeyToAccount(pk)
  const walletClient = createWalletClient({ account, chain: arcTestnet, transport: http(RPC_URL) })
  const publicClient = createPublicClient({ chain: arcTestnet, transport: http(RPC_URL) })

  console.log(`\n💼  Ana cüzdan : ${account.address}`)
  console.log(`💰  Her adrese : 0.90 – 1.00 USDC (rastgele, hepsi farklı)\n`)

  // Cüzdanları yükle — sadece yeni eklenenler (index 100+)
  const { wallets: allWallets } = JSON.parse(readFileSync(WALLETS_FILE, 'utf8'))
  const wallets = allWallets.filter(w => w.index >= 100)
  console.log(`📋  ${wallets.length} adres yüklendi (index 100–${allWallets.length - 1}).\n`)

  const amountRaw = parseUnits(AMOUNT_EACH, USDC_DECIMALS)
  let success = 0
  let failed  = 0

  // Rastgele ama hepsi farklı miktarlar üret
  const amounts = []
  const usedAmounts = new Set()
  for (let i = 0; i < wallets.length; i++) {
    let amount
    do {
      amount = RANDOM_AMOUNT
        ? (Math.random() * (MAX_AMOUNT - MIN_AMOUNT) + MIN_AMOUNT).toFixed(6)
        : AMOUNT_EACH
    } while (usedAmounts.has(amount))
    usedAmounts.add(amount)
    amounts.push(amount)
  }

  for (let i = 0; i < wallets.length; i++) {
    const recipient = wallets[i].address
    const amount    = amounts[i]

    try {
      const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [recipient, parseUnits(amount, USDC_DECIMALS)],
      })

      const txHash = await walletClient.sendTransaction({
        to:   USDC_ADDRESS,
        data,
      })

      console.log(`[${String(i + 1).padStart(3, '0')}] ✅  ${recipient}  ${amount} USDC  →  ${txHash}`)
      success++
    } catch (err) {
      console.error(`[${String(i + 1).padStart(3, '0')}] ❌  ${recipient}  →  ${err.message}`)
      failed++
    }

    // Son işlem değilse bekle (RPC rate limit)
    if (i < wallets.length - 1) {
      await new Promise(r => setTimeout(r, DELAY_MS))
    }
  }

  console.log(`\n─────────────────────────────────`)
  console.log(`✅  Başarılı : ${success}`)
  console.log(`❌  Başarısız: ${failed}`)
  console.log(`─────────────────────────────────\n`)
}

main().catch(err => {
  console.error('Beklenmeyen hata:', err)
  process.exit(1)
})
