/**
 * Dexar Swap Bot — USDC ↔ EURC
 * ─────────────────────────────────────────────────────────────
 * wallets.json'daki cüzdanlardan rastgele seçip Dexar üzerinde
 * USDC → EURC veya EURC → USDC swap yapar.
 *
 * Kullanım:
 *   node scripts/dexar-swap-bot.mjs --run --wallets 20 --minutes 10
 *   node scripts/dexar-swap-bot.mjs --once
 * ─────────────────────────────────────────────────────────────
 *
 * .env.local'a şunu ekle:
 *   CIRCLE_KIT_KEY=your_kit_key_here
 */

// SSL fix — en tepede, import'lardan önce set edilmeli
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import { AppKit } from '@circle-fin/app-kit'
import { createViemAdapterFromPrivateKey } from '@circle-fin/adapter-viem-v2'
import { createPublicClient, http } from 'viem'
import { config } from 'dotenv'
import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

config({ path: '.env.local' })

// ─── Supabase ───────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.DEXAR_SUPABASE_URL
const supabaseKey = process.env.DEXAR_SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌  .env.local içinde DEXAR_SUPABASE_URL ve DEXAR_SUPABASE_KEY eksik!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function saveSwapToSupabase(userAddress, tokenIn, tokenOut, amountIn, amountOut, txHash) {
  // swap_records tablosuna kayıt
  const { error: swapErr } = await supabase.from('swap_records').insert({
    user_address: userAddress.toLowerCase(),
    token_in:     tokenIn,
    token_out:    tokenOut,
    amount_in:    amountIn,
    amount_out:   amountOut,
    tx_hash:      txHash,
    chain:        'Arc_Testnet',
    created_at:   new Date().toISOString(),
  })
  if (swapErr) console.error(`   ⚠️  swap_records hata: ${swapErr.message}`)

  // user_scores tablosunu güncelle
  const addr = userAddress.toLowerCase()
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)

  const { data: existing } = await supabase
    .from('user_scores')
    .select('score, swap_count, volume_usd, minted_tiers, x_follow_claimed, last_trade_date, streak_days')
    .eq('address', addr)
    .single()

  let streakDays = existing?.streak_days ?? 0
  const lastDate = existing?.last_trade_date ?? null
  if (!lastDate || lastDate < yesterday) streakDays = 1
  else if (lastDate === yesterday)       streakDays = streakDays + 1

  const streakBonus = streakDays >= 7 ? 500 : 0

  const { error: scoreErr } = await supabase.from('user_scores').upsert({
    address:          addr,
    swap_count:       (existing?.swap_count ?? 0) + 1,
    volume_usd:       (existing?.volume_usd ?? 0) + parseFloat(amountIn),
    score:            (existing?.score      ?? 0) + 100 + streakBonus,
    minted_tiers:     existing?.minted_tiers     ?? [],
    x_follow_claimed: existing?.x_follow_claimed ?? false,
    last_trade_date:  today,
    streak_days:      streakDays,
    updated_at:       new Date().toISOString(),
  }, { onConflict: 'address' })
  if (scoreErr) console.error(`   ⚠️  user_scores hata: ${scoreErr.message}`)
}

// ─── Config ────────────────────────────────────────────────────
const WALLETS_FILE = join(dirname(fileURLToPath(import.meta.url)), 'wallets.json')
const RPC_URL      = 'https://rpc.testnet.arc.network'
const KIT_KEY      = process.env.CIRCLE_KIT_KEY
const MIN_USDC     = 0.02
const MAX_USDC     = 0.05

if (!KIT_KEY) {
  console.error('❌  .env.local içine CIRCLE_KIT_KEY=... ekle')
  console.error('    Dexar projesinin .env dosyasındaki NEXT_PUBLIC_KIT_KEY değerini kullan.')
  process.exit(1)
}

// ─── Arc Testnet chain ─────────────────────────────────────────
const arcTestnet = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { decimals: 18, name: 'ARC', symbol: 'ARC' },
  rpcUrls: { default: { http: [RPC_URL] } },
  testnet: true,
}

const kit = new AppKit()

// ─── Yardımcı ──────────────────────────────────────────────────
function randFloat(min, max) {
  return Math.random() * (max - min) + min
}
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

function loadWallets() {
  if (!existsSync(WALLETS_FILE)) {
    console.error('wallets.json bulunamadı. Önce: node scripts/bot.mjs --setup')
    process.exit(1)
  }
  return JSON.parse(readFileSync(WALLETS_FILE, 'utf8')).wallets
}

// ─── Adapter oluştur ───────────────────────────────────────────
function makeAdapter(privateKey) {
  const pk = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`
  return createViemAdapterFromPrivateKey({
    privateKey: pk,
    getPublicClient: ({ chain }) =>
      createPublicClient({
        chain,
        transport: http(RPC_URL, { retryCount: 5, timeout: 60000 }),
      }),
  })
}

// ─── Tek swap işlemi ───────────────────────────────────────────
async function runOneSwap(wallet) {
  // Sadece USDC → EURC (tüm cüzdanlarda USDC var)
  const direction = { tokenIn: 'USDC', tokenOut: 'EURC' }

  const amount  = randFloat(MIN_USDC, MAX_USDC).toFixed(6)
  let adapter   = makeAdapter(wallet.privateKey)
  const ts      = new Date().toLocaleTimeString('tr-TR')

  console.log(`\n[${ts}] 🔄  cüzdan #${wallet.index}`)
  console.log(`   ${direction.tokenIn} → ${direction.tokenOut}  |  ${amount}`)
  console.log(`   Adres: ${wallet.address}`)

  try {
    // Önce quote al
    const estimate = await kit.estimateSwap({
      from: { adapter, chain: 'Arc_Testnet' },
      tokenIn:  direction.tokenIn,
      tokenOut: direction.tokenOut,
      amountIn: amount,
      config: { kitKey: KIT_KEY },
    })

    console.log(`   Quote: ~${parseFloat(estimate.estimatedOutput.amount).toFixed(6)} ${direction.tokenOut}`)

    // Swap execute (max 3 deneme)
    let result
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        result = await kit.swap({
          from: { adapter, chain: 'Arc_Testnet' },
          tokenIn:  direction.tokenIn,
          tokenOut: direction.tokenOut,
          amountIn: amount,
          config: { kitKey: KIT_KEY },
        })
        break
      } catch (retryErr) {
        if (attempt === 3) throw retryErr
        const waitSec = attempt * 5
        console.log(`   ⏳ Deneme ${attempt} başarısız, ${waitSec}sn sonra tekrar...`)
        await sleep(waitSec * 1000)
        // Adapter'ı yeniden oluştur
        adapter = makeAdapter(wallet.privateKey)
      }
    }

    console.log(`   ✅ TX: ${result.txHash}`)
    console.log(`   Explorer: https://testnet.arcscan.app/tx/${result.txHash}`)

    // Supabase'e kaydet
    await saveSwapToSupabase(
      wallet.address,
      direction.tokenIn,
      direction.tokenOut,
      amount,
      result.amountOut ?? '0',
      result.txHash ?? ''
    )
    console.log(`   📝 Supabase kaydı yapıldı.`)
    return true
  } catch (err) {
    // Yetersiz bakiye → yön değiştir
    if (err.message?.includes('balance') || err.message?.includes('insufficient')) {
      console.log(`   ⚠️  Bakiye yetersiz, ters yönde deneniyor...`)
      const flip = { tokenIn: direction.tokenOut, tokenOut: direction.tokenIn }
      try {
        const result = await kit.swap({
          from: { adapter, chain: 'Arc_Testnet' },
          tokenIn:  flip.tokenIn,
          tokenOut: flip.tokenOut,
          amountIn: amount,
          config: { kitKey: KIT_KEY },
        })
        console.log(`   ✅ TX (ters): ${result.txHash}`)
        await saveSwapToSupabase(
          wallet.address,
          flip.tokenIn,
          flip.tokenOut,
          amount,
          result.amountOut ?? '0',
          result.txHash ?? ''
        )
        console.log(`   📝 Supabase kaydı yapıldı.`)
        return true
      } catch (e2) {
        console.error(`   ❌ Hata: ${e2.message?.slice(0, 120)}`)
        return false
      }
    }
    console.error(`   ❌ Hata: ${err.message?.slice(0, 120)}`)
    return false
  }
}

// ─── Entry point ───────────────────────────────────────────────
const args = process.argv.slice(2)

function getArg(name, def = null) {
  const idx = args.indexOf(name)
  return idx === -1 ? def : (args[idx + 1] ?? def)
}

if (args.includes('--once')) {
  // Tek işlem testi
  const wallets = loadWallets()
  const wallet  = wallets[randInt(0, wallets.length - 1)]
  console.log(`✅  ${wallets.length} cüzdan yüklendi. Tek swap testi...\n`)
  await runOneSwap(wallet)
  console.log('\nTest tamamlandı.')

} else if (args.includes('--run')) {
  // Manuel mod
  const wallets     = loadWallets()
  const walletCount = parseInt(getArg('--wallets', '10'))
  const minutes     = parseFloat(getArg('--minutes', '5'))
  const totalMs     = minutes * 60 * 1000

  console.log(`\n🚀  ${walletCount} cüzdandan ${minutes} dakikaya yayılmış swap başlıyor...\n`)

  const shuffled = [...wallets].sort(() => Math.random() - 0.5).slice(0, walletCount)

  // Rastgele zamanlama
  const schedule = shuffled.map(w => ({
    wallet: w,
    delay:  Math.floor(Math.random() * totalMs),
  })).sort((a, b) => a.delay - b.delay)

  console.log('📋  Zaman planı:')
  schedule.forEach((s, i) => {
    const m = Math.floor(s.delay / 60000)
    const sec = Math.floor((s.delay % 60000) / 1000)
    console.log(`   ${String(i+1).padStart(3,'0')}. cüzdan #${s.wallet.index}  →  ${m}dk ${sec}sn sonra`)
  })

  let ok = 0, fail = 0
  const startTime = Date.now()

  for (const item of schedule) {
    const wait = (startTime + item.delay) - Date.now()
    if (wait > 0) await sleep(wait)
    const success = await runOneSwap(item.wallet)
    success ? ok++ : fail++
  }

  console.log(`\n🏁  Tamamlandı — ✅ ${ok} başarılı  ❌ ${fail} başarısız`)

} else {
  console.log(`
Dexar Swap Bot kullanımı:

  node scripts/dexar-swap-bot.mjs --once
      → Tek cüzdanla test swap

  node scripts/dexar-swap-bot.mjs --run --wallets 20 --minutes 10
      → 20 cüzdandan, 10 dakikaya yayılmış swap

Önce .env.local dosyasına şunu ekle:
  CIRCLE_KIT_KEY=<Dexar projesindeki NEXT_PUBLIC_KIT_KEY değeri>
`)
}
