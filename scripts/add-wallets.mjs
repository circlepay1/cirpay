/**
 * Mevcut wallets.json'a yeni cüzdanlar ekler.
 * Kullanım: node scripts/add-wallets.mjs --count 200
 */

import { HDKey } from '@scure/bip32'
import * as bip39 from '@scure/bip39'
import { privateKeyToAccount } from 'viem/accounts'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const WALLETS_FILE = join(dirname(fileURLToPath(import.meta.url)), 'wallets.json')

const args      = process.argv.slice(2)
const countIdx  = args.indexOf('--count')
const COUNT     = countIdx !== -1 ? parseInt(args[countIdx + 1]) : 200

if (!existsSync(WALLETS_FILE)) {
  console.error('❌  wallets.json bulunamadı. Önce: node scripts/bot.mjs --setup')
  process.exit(1)
}

const data     = JSON.parse(readFileSync(WALLETS_FILE, 'utf8'))
const existing = data.wallets
const startIdx = existing.length

console.log(`📋  Mevcut cüzdan sayısı : ${startIdx}`)
console.log(`➕  Eklenecek             : ${COUNT}`)
console.log(`📊  Yeni toplam           : ${startIdx + COUNT}\n`)

// Mnemonic'ten seed türet
const seed = bip39.mnemonicToSeedSync(data.mnemonic)
const root = HDKey.fromMasterSeed(seed)

const newWallets = []
for (let i = startIdx; i < startIdx + COUNT; i++) {
  const child      = root.derive(`m/44'/60'/0'/0/${i}`)
  const privateKey = '0x' + Buffer.from(child.privateKey).toString('hex')
  const account    = privateKeyToAccount(privateKey)
  newWallets.push({ index: i, address: account.address, privateKey })
}

data.wallets = [...existing, ...newWallets]
writeFileSync(WALLETS_FILE, JSON.stringify(data, null, 2))

console.log(`✅  ${COUNT} yeni cüzdan eklendi → wallets.json`)
console.log(`   İlk yeni adres : ${newWallets[0].address}`)
console.log(`   Son yeni adres : ${newWallets[newWallets.length - 1].address}`)
