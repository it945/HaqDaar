-- ============================================================
-- HaqDaar v2 Migration
-- Run this in Supabase SQL Editor (in order, idempotent)
-- ============================================================

-- 1. Settings (admin-configurable values, never hard-coded elsewhere)
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);
INSERT INTO settings (key, value) VALUES
  ('monthly_cap_paisa',         '500000'),
  ('tax_rate_pct',              '10'),
  ('shopkeeper_security_paisa', '500000')
ON CONFLICT (key) DO NOTHING;
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;

-- 2. Donor deposits (admin-recorded; money source)
CREATE TABLE IF NOT EXISTS donor_deposits (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id         UUID NOT NULL REFERENCES profiles(id),
  amount_paisa     BIGINT NOT NULL CHECK (amount_paisa > 0),
  deposit_date     DATE NOT NULL,
  reference_number TEXT,
  receipt_image_url TEXT,
  recorded_by      UUID REFERENCES profiles(id),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE donor_deposits DISABLE ROW LEVEL SECURITY;

-- 3. Donor ledger (immutable; positive=credit, negative=debit)
CREATE TABLE IF NOT EXISTS donor_ledger (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id       UUID NOT NULL REFERENCES profiles(id),
  entry_type     TEXT NOT NULL CHECK (entry_type IN
    ('deposit','reserve','topup_reserve','release','spend','tax','return')),
  amount_paisa   BIGINT NOT NULL,
  reference_id   UUID,
  reference_type TEXT,
  note           TEXT,
  month_year     TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE donor_ledger DISABLE ROW LEVEL SECURITY;

-- 4. Monthly allocation runs (one per month; idempotent)
CREATE TABLE IF NOT EXISTS monthly_allocation_runs (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month_year             TEXT NOT NULL UNIQUE,
  status                 TEXT NOT NULL DEFAULT 'completed',
  pool_paisa             BIGINT,
  donee_count            INT,
  amount_per_donee_paisa BIGINT,
  is_short_month         BOOLEAN DEFAULT FALSE,
  run_by                 UUID REFERENCES profiles(id),
  run_at                 TIMESTAMPTZ DEFAULT NOW(),
  next_donor_pointer     UUID REFERENCES profiles(id),
  notes                  TEXT
);
ALTER TABLE monthly_allocation_runs DISABLE ROW LEVEL SECURITY;

-- 5. Allocation assignments (donor-donee links per month)
CREATE TABLE IF NOT EXISTS allocation_assignments (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id               UUID REFERENCES monthly_allocation_runs(id),
  month_year           TEXT NOT NULL,
  donor_id             UUID NOT NULL REFERENCES profiles(id),
  donee_id             UUID NOT NULL REFERENCES profiles(id),
  share_paisa          BIGINT NOT NULL,
  tax_paisa            BIGINT NOT NULL,
  total_reserved_paisa BIGINT NOT NULL,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE allocation_assignments DISABLE ROW LEVEL SECURITY;

-- 6. Monthly donee balances
CREATE TABLE IF NOT EXISTS monthly_donee_balances (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month_year      TEXT NOT NULL,
  donee_id        UUID NOT NULL REFERENCES profiles(id),
  allocated_paisa BIGINT NOT NULL DEFAULT 0,
  spent_paisa     BIGINT NOT NULL DEFAULT 0,
  UNIQUE (month_year, donee_id)
);
ALTER TABLE monthly_donee_balances DISABLE ROW LEVEL SECURITY;

-- 7. Shopkeeper security ledger (separate from donor money)
CREATE TABLE IF NOT EXISTS shopkeeper_security_ledger (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopkeeper_id  UUID NOT NULL REFERENCES profiles(id),
  amount_paisa   BIGINT NOT NULL,
  event_type     TEXT NOT NULL CHECK (event_type IN ('deposited','returned')),
  event_date     DATE NOT NULL,
  method         TEXT,
  screenshot_url TEXT,
  recorded_by    UUID REFERENCES profiles(id),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE shopkeeper_security_ledger DISABLE ROW LEVEL SECURITY;

-- 8. Invoices (built by admin from parchi)
CREATE TABLE IF NOT EXISTS invoices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_request_id UUID REFERENCES payout_requests(id),
  invoice_number    TEXT UNIQUE DEFAULT ('INV-' || to_char(NOW(), 'YYYYMM') || '-' || floor(random()*9000+1000)::TEXT),
  line_items        JSONB DEFAULT '[]',
  total_paisa       BIGINT,
  notes             TEXT,
  created_by        UUID REFERENCES profiles(id),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;

-- 9. Alter payout_requests
ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS parchi_photo_url TEXT;
ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS month_year TEXT;
ALTER TABLE payout_requests ADD COLUMN IF NOT EXISTS shopkeeper_name TEXT;

-- 10. Alter spending_records
ALTER TABLE spending_records ADD COLUMN IF NOT EXISTS parchi_photo_url TEXT;
ALTER TABLE spending_records ADD COLUMN IF NOT EXISTS month_year TEXT;

-- 11. Alter donees
ALTER TABLE donees ADD COLUMN IF NOT EXISTS consent_to_share BOOLEAN DEFAULT FALSE;
ALTER TABLE donees ADD COLUMN IF NOT EXISTS family_size      INT;
ALTER TABLE donees ADD COLUMN IF NOT EXISTS story            TEXT;
ALTER TABLE donees ADD COLUMN IF NOT EXISTS approved_at      TIMESTAMPTZ;
UPDATE donees SET approved_at = created_at
WHERE status = 'approved' AND approved_at IS NULL;

-- 12. Invoice categories (admin-editable)
CREATE TABLE IF NOT EXISTS invoice_categories (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  sort_order INT DEFAULT 0,
  is_active  BOOLEAN DEFAULT TRUE
);
INSERT INTO invoice_categories (name, sort_order) VALUES
  ('Flour/Atta',  1),('Oil/Ghee',    2),('Rice/Pulses', 3),
  ('Milk/Dairy',  4),('Medicine',    5),('Other',       6)
ON CONFLICT (name) DO NOTHING;
ALTER TABLE invoice_categories DISABLE ROW LEVEL SECURITY;
