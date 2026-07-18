import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Invoice = {
  id: string
  created_at: string
  sender_address: string
  recipient_address: string
  amount: number
  description: string
  due_date: string | null
  status: 'pending' | 'paid' | 'overdue' | 'cancelled'
  tx_hash?: string
}

export type Transaction = {
  id: string
  created_at: string
  sender_address: string
  recipient_address: string
  amount: number
  tx_hash: string
  type: 'send' | 'invoice' | 'gift' | 'payroll' | 'swap'
}

export async function saveTransaction(
  sender: string,
  recipient: string,
  amount: number,
  txHash: string,
  type: Transaction['type']
) {
  await supabase.from('transactions').insert({
    sender_address: sender.toLowerCase(),
    recipient_address: recipient.toLowerCase(),
    amount,
    tx_hash: txHash,
    type,
  })
}
