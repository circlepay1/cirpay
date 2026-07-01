-- Hediye bildirimleri tablosu
CREATE TABLE IF NOT EXISTS gifts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sender_address TEXT NOT NULL,
  recipient_address TEXT NOT NULL,
  amount TEXT NOT NULL,
  emoji TEXT NOT NULL,
  note TEXT DEFAULT '',
  tx_hash TEXT NOT NULL,
  seen BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_gifts_recipient ON gifts(recipient_address);
CREATE INDEX IF NOT EXISTS idx_gifts_seen ON gifts(seen);

ALTER TABLE gifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read gifts" ON gifts FOR SELECT USING (true);
CREATE POLICY "Anyone can insert gifts" ON gifts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update gifts" ON gifts FOR UPDATE USING (true);
