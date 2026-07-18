/**
 * CirPay Gift Bot
 * ─────────────────────────────────────────────────────────────
 * Komutlar:
 *   node scripts/bot.mjs --setup
 *       → 100 HD cüzdan üretir (wallets.json)
 *
 *   node scripts/bot.mjs --run --wallets 20 --minutes 10
 *       → 20 cüzdandan, 10 dakikaya yayılmış rastgele işlemler yapar
 *
 *   node scripts/bot.mjs --once
 *       → tek seferlik 1 işlem (test)
 *
 *   node scripts/bot.mjs
 *       → daemon: her gün rastgele 2 saatte 1'er işlem
 * ─────────────────────────────────────────────────────────────
 */

import { createPublicClient, createWalletClient, http, parseUnits, encodeFunctionData } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { HDKey } from '@scure/bip32'
import * as bip39 from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { config } from 'dotenv'
config({ path: '.env.local' })

// Arc Testnet SSL sertifika sorunu için
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

// ─── Config ────────────────────────────────────────────────────
const WALLET_COUNT   = 100
const WALLETS_FILE   = join(dirname(fileURLToPath(import.meta.url)), 'wallets.json')
const RUNS_PER_DAY   = 2          // günlük işlem sayısı
const MIN_USDC       = 0.05
const MAX_USDC       = 0.10
const USDC_DECIMALS  = 6
const RPC_URL        = 'https://rpc.testnet.arc.network'
const USDC_ADDRESS   = '0x3600000000000000000000000000000000000000'
const CHAIN_ID       = 5042002

// ARC Testnet chain tanımı
const arcTestnet = {
  id: CHAIN_ID,
  name: 'Arc Testnet',
  nativeCurrency: { decimals: 18, name: 'ARC', symbol: 'ARC' },
  rpcUrls: { default: { http: [RPC_URL] } },
  testnet: true,
}

// ─── Supabase ───────────────────────────────────────────────────
const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌  .env.local içinde NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY eksik!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// ─── Viem clients ───────────────────────────────────────────────
const publicClient = createPublicClient({ chain: arcTestnet, transport: http(RPC_URL) })

// ─── Yardımcı fonksiyonlar ──────────────────────────────────────

function randFloat(min, max) {
  return Math.random() * (max - min) + min
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/** Bugün içinde rastgele 2 farklı ms cinsinden zaman döndürür (gelecekte olan) */
function randomTimesToday(count) {
  const now  = Date.now()
  const midnight = new Date()
  midnight.setHours(23, 59, 59, 999)
  const end  = midnight.getTime()

  const times = new Set()
  while (times.size < count) {
    const t = randInt(now + 60_000, end) // en az 1 dk sonra
    times.add(t)
  }
  return [...times].sort((a, b) => a - b)
}

/** ms cinsinden bekleme */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ─── Cüzdan üretimi ─────────────────────────────────────────────

function generateWallets(count) {
  console.log(`🔑  ${count} adet HD cüzdan üretiliyor...`)
  const mnemonic = bip39.generateMnemonic(wordlist, 256) // 24 kelime
  const seed     = bip39.mnemonicToSeedSync(mnemonic)
  const root     = HDKey.fromMasterSeed(seed)

  const wallets = []
  for (let i = 0; i < count; i++) {
    const child = root.derive(`m/44'/60'/0'/0/${i}`)
    const privateKey = '0x' + Buffer.from(child.privateKey).toString('hex')
    const account    = privateKeyToAccount(privateKey)
    wallets.push({ index: i, address: account.address, privateKey })
  }

  const data = { mnemonic, wallets }
  writeFileSync(WALLETS_FILE, JSON.stringify(data, null, 2))
  console.log(`✅  ${count} cüzdan üretildi → scripts/wallets.json`)
  console.log(`\n⚠️   MNEMONIC'İ SAKLA (test amaçlı):`)
  console.log(`   ${mnemonic}\n`)
  return wallets
}

function loadWallets() {
  if (!existsSync(WALLETS_FILE)) {
    console.log('wallets.json bulunamadı, önce --setup çalıştır.')
    process.exit(1)
  }
  const { wallets } = JSON.parse(readFileSync(WALLETS_FILE, 'utf8'))
  return wallets
}

// ─── USDC transfer (ERC-20 transfer) ───────────────────────────

const ERC20_TRANSFER_ABI = [{
  name: 'transfer',
  type: 'function',
  stateMutability: 'nonpayable',
  inputs: [
    { name: 'recipient', type: 'address' },
    { name: 'amount',    type: 'uint256' },
  ],
  outputs: [{ type: 'bool' }],
}]

async function sendGift(senderWallet, recipientAddress, usdcAmount) {
  const account      = privateKeyToAccount(senderWallet.privateKey)
  const walletClient = createWalletClient({ account, chain: arcTestnet, transport: http(RPC_URL) })

  const amountRaw = parseUnits(usdcAmount.toFixed(6), USDC_DECIMALS)

  // ERC-20 transfer data
  const data = encodeFunctionData({
    abi: ERC20_TRANSFER_ABI,
    functionName: 'transfer',
    args: [recipientAddress, amountRaw],
  })

  const txHash = await walletClient.sendTransaction({
    to:   USDC_ADDRESS,
    data,
  })

  return txHash
}

// ─── Supabase kayıt ─────────────────────────────────────────────

const GIFT_EMOJIS = ['⭐','🎁','💎','🏆','🚀','💫','🔥','👑','🌟','⚡','🦋','🏅']

async function saveGiftToSupabase(sender, recipient, amount, txHash) {
  const emoji = GIFT_EMOJIS[randInt(0, GIFT_EMOJIS.length - 1)]

  await supabase.from('gifts').insert({
    sender_address:    sender.toLowerCase(),
    recipient_address: recipient.toLowerCase(),
    amount:            amount.toFixed(2),
    emoji,
    note:              '🤖 Auto gift',
    tx_hash:           txHash,
    seen:              false,
  })

  await supabase.from('transactions').insert({
    sender_address:    sender.toLowerCase(),
    recipient_address: recipient.toLowerCase(),
    amount,
    tx_hash:           txHash,
    type:              'gift',
  })
}

// ─── Tek bir gift işlemi ─────────────────────────────────────────

async function runOneGift(wallets) {
  // 2 farklı rastgele cüzdan seç (sender ≠ recipient)
  let senderIdx    = randInt(0, wallets.length - 1)
  let recipientIdx = randInt(0, wallets.length - 1)
  while (recipientIdx === senderIdx) {
    recipientIdx = randInt(0, wallets.length - 1)
  }

  const sender    = wallets[senderIdx]
  const recipient = wallets[recipientIdx]
  const amount    = parseFloat(randFloat(MIN_USDC, MAX_USDC).toFixed(6))

  const ts = new Date().toLocaleTimeString('tr-TR')
  console.log(`\n[${ts}] 🎁  Gönderiliyor...`)
  console.log(`   Sender    : ${sender.address} (cüzdan #${senderIdx})`)
  console.log(`   Recipient : ${recipient.address} (cüzdan #${recipientIdx})`)
  console.log(`   Miktar    : ${amount} USDC`)

  try {
    const txHash = await sendGift(sender, recipient.address, amount)
    console.log(`   TX Hash   : ${txHash}`)
    console.log(`   Explorer  : https://testnet.arcscan.app/tx/${txHash}`)

    await saveGiftToSupabase(sender.address, recipient.address, amount, txHash)
    console.log(`   ✅ Supabase kaydı yapıldı.`)
  } catch (err) {
    console.error(`   ❌ Hata: ${err.message}`)
  }
}

// ─── Günlük zamanlayıcı ──────────────────────────────────────────

async function schedulerLoop(wallets) {
  console.log('🤖  CirPay Gift Bot başladı (Ctrl+C ile durdur)\n')

  while (true) {
    const times = randomTimesToday(RUNS_PER_DAY)
    const now   = Date.now()

    console.log(`📅  Bugün için ${RUNS_PER_DAY} işlem planlandı:`)
    times.forEach((t, i) => {
      const d = new Date(t)
      console.log(`   İşlem ${i + 1}: ${d.toLocaleTimeString('tr-TR')} (${Math.round((t - now) / 60000)} dk sonra)`)
    })

    for (const scheduledTime of times) {
      const wait = scheduledTime - Date.now()
      if (wait > 0) await sleep(wait)
      await runOneGift(wallets)
    }

    // Gece yarısına kadar bekle, sonra yeni gün döngüsü
    const midnight = new Date()
    midnight.setDate(midnight.getDate() + 1)
    midnight.setHours(0, 1, 0, 0) // 00:01
    const waitTillMidnight = midnight.getTime() - Date.now()
    console.log(`\n😴  Yarın için bekleniyor... (${Math.round(waitTillMidnight / 3_600_000)} saat)`)
    await sleep(waitTillMidnight)
  }
}

// ─── Entry point ─────────────────────────────────────────────────

const args = process.argv.slice(2)

// Arg parser yardımcısı
function getArg(name, defaultVal = null) {
  const idx = args.indexOf(name)
  if (idx === -1) return defaultVal
  return args[idx + 1] ?? defaultVal
}

if (args.includes('--setup')) {
  // ── Cüzdan üretimi ──
  generateWallets(WALLET_COUNT)

} else if (args.includes('--once')) {
  // ── Tek işlem testi ──
  const wallets = loadWallets()
  console.log(`✅  ${wallets.length} cüzdan yüklendi.`)
  await runOneGift(wallets)
  console.log('\nTest tamamlandı.')

} else if (args.includes('--run')) {
  // ── Manuel mod: --wallets N --minutes M ──
  const wallets     = loadWallets()
  const walletCount = parseInt(getArg('--wallets', '10'))
  const minutes     = parseFloat(getArg('--minutes', '5'))
  const totalMs     = minutes * 60 * 1000

  if (walletCount < 2) {
    console.error('❌  En az 2 cüzdan gerekli.')
    process.exit(1)
  }
  if (walletCount > wallets.length) {
    console.error(`❌  wallets.json'da sadece ${wallets.length} cüzdan var.`)
    process.exit(1)
  }

  console.log(`\n🚀  ${walletCount} cüzdandan ${minutes} dakikaya yayılmış işlemler başlıyor...\n`)

  // Rastgele N cüzdan seç
  const shuffled  = [...wallets].sort(() => Math.random() - 0.5)
  const selected  = shuffled.slice(0, walletCount)

  // Her işlem için rastgele zaman üret (0 ile totalMs arasında)
  const schedule = selected.map((w, i) => ({
    wallet: w,
    delay:  Math.floor(Math.random() * totalMs),
    index:  i,
  })).sort((a, b) => a.delay - b.delay)

  console.log(`📋  İşlem planı:`)
  schedule.forEach((s, i) => {
    const min = Math.floor(s.delay / 60000)
    const sec = Math.floor((s.delay % 60000) / 1000)
    console.log(`   ${String(i+1).padStart(3,'0')}. cüzdan #${s.wallet.index}  →  ${min}dk ${sec}sn sonra`)
  })
  console.log()

  // Sırayla zamanında çalıştır
  const startTime = Date.now()
  for (const item of schedule) {
    const wait = (startTime + item.delay) - Date.now()
    if (wait > 0) await sleep(wait)

    // Bu cüzdandan farklı bir cüzdana gönder
    const otherWallets = selected.filter(w => w.address !== item.wallet.address)
    const recipient    = otherWallets[randInt(0, otherWallets.length - 1)]
    const amount       = parseFloat(randFloat(MIN_USDC, MAX_USDC).toFixed(6))

    const ts = new Date().toLocaleTimeString('tr-TR')
    console.log(`[${ts}] 🎁  cüzdan #${item.wallet.index} → #${recipient.index}  |  ${amount} USDC`)

    try {
      const txHash = await sendGift(item.wallet, recipient.address, amount)
      console.log(`       ✅ TX: ${txHash}`)
      await saveGiftToSupabase(item.wallet.address, recipient.address, amount, txHash)
    } catch (err) {
      console.error(`       ❌ Hata: ${err.message}`)
    }
  }

  console.log(`\n🏁  Tüm işlemler tamamlandı. (${walletCount} işlem / ${minutes} dakika)`)

} else if (args.includes('--burst')) {
  // ── Burst modu: tüm cüzdanlar, her biri 1-5 işlem, N dakikaya yayılmış ──
  const wallets = loadWallets()
  const minutes = parseFloat(getArg('--minutes', '30'))
  const totalMs = minutes * 60 * 1000

  // Her cüzdan için 1-5 arası rastgele işlem sayısı belirle
  const jobs = []
  for (const wallet of wallets) {
    const txCount = randInt(1, 5)
    for (let i = 0; i < txCount; i++) {
      jobs.push({
        wallet,
        delay: Math.floor(Math.random() * totalMs),
      })
    }
  }

  // Zamana göre sırala
  jobs.sort((a, b) => a.delay - b.delay)

  const totalTx = jobs.length
  console.log(`\n🚀  Burst modu başlıyor...`)
  console.log(`   Cüzdan sayısı : ${wallets.length}`)
  console.log(`   Toplam TX     : ${totalTx} (her cüzdanda 1-5 işlem)`)
  console.log(`   Süre          : ${minutes} dakika`)
  console.log(`   İlk TX        : hemen`)
  console.log(`   Son TX        : ~${minutes} dk sonra\n`)

  let ok = 0, fail = 0
  const startTime = Date.now()

  for (let i = 0; i < jobs.length; i++) {
    const item = jobs[i]
    const wait = (startTime + item.delay) - Date.now()
    if (wait > 0) await sleep(wait)

    // Farklı bir cüzdan seç (recipient)
    let recipientIdx = randInt(0, wallets.length - 1)
    while (wallets[recipientIdx].address === item.wallet.address) {
      recipientIdx = randInt(0, wallets.length - 1)
    }
    const recipient = wallets[recipientIdx]
    const amount    = parseFloat(randFloat(MIN_USDC, MAX_USDC).toFixed(6))
    const ts        = new Date().toLocaleTimeString('tr-TR')
    const progress  = `[${String(i+1).padStart(4,'0')}/${totalTx}]`

    console.log(`${progress} [${ts}] 🎁  #${item.wallet.index} → #${recipient.index}  ${amount} USDC`)

    try {
      const txHash = await sendGift(item.wallet, recipient.address, amount)
      console.log(`         ✅ ${txHash}`)
      await saveGiftToSupabase(item.wallet.address, recipient.address, amount, txHash)
      ok++
    } catch (err) {
      console.error(`         ❌ ${err.message?.slice(0, 80)}`)
      fail++
    }
  }

  const elapsed = Math.round((Date.now() - startTime) / 60000)
  console.log(`\n🏁  Burst tamamlandı!`)
  console.log(`   ✅ Başarılı : ${ok}`)
  console.log(`   ❌ Başarısız: ${fail}`)
  console.log(`   ⏱️  Süre     : ${elapsed} dakika`)

} else {
  // ── Daemon modu ──
  const wallets = loadWallets()
  console.log(`✅  ${wallets.length} cüzdan yüklendi.`)
  await schedulerLoop(wallets)
}
