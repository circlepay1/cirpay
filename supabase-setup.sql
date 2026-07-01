-- CirPay Supabase Tabloları
-- Bu SQL'i Supabase Dashboard > SQL Editor'de çalıştır

-- Fatura tablosu
CREATE TABLE IF NOT EXISTS invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sender_address TEXT NOT NULL,
  recipient_address TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT DEFAULT '',
  due_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  tx_hash TEXT
);

-- İndeksler (hızlı sorgular için)
CREATE INDEX IF NOT EXISTS idx_invoices_sender ON invoices(sender_address);
CREATE INDEX IF NOT EXISTS idx_invoices_recipient ON invoices(recipient_address);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- Row Level Security (herkese açık okuma/yazma - testnet için)
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read invoices" ON invoices
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert invoices" ON invoices
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update invoices" ON invoices
  FOR UPDATE USING (true);

-- Invoice paid notifications (gönderene "faturanız ödendi" bildirimi)
CREATE TABLE IF NOT EXISTS invoice_paid_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  invoice_id UUID NOT NULL,
  sender_address TEXT NOT NULL,   -- faturayı gönderen (bildirim alacak)
  payer_address TEXT NOT NULL,    -- faturayı ödeyen
  amount NUMERIC NOT NULL,
  description TEXT DEFAULT '',
  seen BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_inv_paid_notif_sender ON invoice_paid_notifications(sender_address);
CREATE INDEX IF NOT EXISTS idx_inv_paid_notif_seen ON invoice_paid_notifications(seen);

ALTER TABLE invoice_paid_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read invoice_paid_notifications" ON invoice_paid_notifications
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert invoice_paid_notifications" ON invoice_paid_notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update invoice_paid_notifications" ON invoice_paid_notifications
  FOR UPDATE USING (true);
