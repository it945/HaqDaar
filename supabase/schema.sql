-- HaqDaar: No-Custody Transparency App Schema
-- Version: Pledge-Based Trust Model

-- 1. Enums
CREATE TYPE user_role AS ENUM ('admin', 'donor', 'shopkeeper');
CREATE TYPE user_status AS ENUM ('active', 'pending', 'blocked');
CREATE TYPE donee_status AS ENUM ('draft', 'under_review', 'approved', 'paused', 'blocked', 'rejected');
CREATE TYPE pledge_status AS ENUM ('active', 'partially_spent', 'fully_spent', 'cancelled');
CREATE TYPE payment_status AS ENUM ('unpaid', 'paid');
CREATE TYPE shopkeeper_payment_status AS ENUM ('submitted', 'acknowledged');

-- Legacy enums (kept for historical tables)
CREATE TYPE donation_status AS ENUM ('pending_verification', 'verified', 'rejected');
CREATE TYPE settlement_status AS ENUM ('pending_settlement', 'settled');

-- 2. Profiles (Extends Supabase Auth Users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT UNIQUE,
  email TEXT UNIQUE,
  role user_role NOT NULL,
  status user_status DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Shopkeepers (Stores shop-specific metadata)
CREATE TABLE shopkeepers (
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  shop_name TEXT NOT NULL,
  area TEXT,
  city TEXT,
  payment_info TEXT, -- General fallback EasyPaisa/JazzCash account for donor->shopkeeper payments
  jazzcash_account TEXT, -- Optional: overrides payment_info for the "Pay via JazzCash" button
  easypaisa_account TEXT, -- Optional: overrides payment_info for the "Pay via Easypaisa" button
  status user_status DEFAULT 'active'
);

-- 4. Donees (Offline verified, no login)
CREATE TABLE donees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  guardian_name TEXT,
  city TEXT NOT NULL,
  area TEXT NOT NULL,
  need_category TEXT,
  reason_for_support TEXT,
  receiving_method TEXT, -- EasyPaisa, JazzCash, Raast
  receiving_account_title TEXT,
  receiving_account_masked TEXT,
  receiving_qr_image_url TEXT,
  spending_qr_code TEXT UNIQUE NOT NULL, -- e.g. DONEE-SPEND-XXXX
  photo_url TEXT,
  status donee_status DEFAULT 'approved',
  funded_credit DECIMAL(12, 2) DEFAULT 0,
  verification_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Pledge Records (Donor promises money for a donee - no upfront payment)
CREATE TABLE pledge_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  donor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  donee_id UUID REFERENCES donees(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  remaining_amount DECIMAL(12, 2) NOT NULL, -- starts = amount, decremented by FIFO spending
  status pledge_status DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. Spending Records (Shopkeeper release of goods)
CREATE TABLE spending_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shopkeeper_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  donee_id UUID REFERENCES donees(id) ON DELETE CASCADE,
  donor_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- primary donor from FIFO
  amount DECIMAL(12, 2) NOT NULL,
  items_description TEXT NOT NULL,
  receipt_photo_url TEXT,
  payment_status payment_status DEFAULT 'unpaid',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. Pledge Spending Links (Junction: which pledge funded which spending)
CREATE TABLE pledge_spending_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pledge_id UUID REFERENCES pledge_records(id) ON DELETE CASCADE,
  spending_id UUID REFERENCES spending_records(id) ON DELETE CASCADE,
  donor_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- denormalized for fast queries
  amount DECIMAL(12, 2) NOT NULL, -- portion of spending from this pledge
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 8. Shopkeeper Payments (Donor pays shopkeeper directly, uploads proof)
CREATE TABLE shopkeeper_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  donor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  shopkeeper_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  amount DECIMAL(12, 2) NOT NULL,
  proof_screenshot_url TEXT,
  status shopkeeper_payment_status DEFAULT 'submitted',
  spending_record_ids UUID[] DEFAULT '{}', -- which spending records this covers
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 9. Notifications
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 10. Audit Logs
CREATE TABLE audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================
-- LEGACY TABLES (Historical archive, no new writes)
-- ============================================

-- Legacy: Donation Records (Direct payment proof - old flow)
CREATE TABLE donation_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  donor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  donee_id UUID REFERENCES donees(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  payment_method TEXT,
  transaction_reference TEXT,
  proof_screenshot_url TEXT,
  status donation_status DEFAULT 'pending_verification',
  admin_note TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Legacy: Settlement Records (Admin settles shopkeepers - old flow)
CREATE TABLE settlement_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shopkeeper_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  amount DECIMAL(12, 2) NOT NULL,
  status settlement_status DEFAULT 'pending_settlement',
  settled_at TIMESTAMP WITH TIME ZONE,
  admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopkeepers ENABLE ROW LEVEL SECURITY;
ALTER TABLE donees ENABLE ROW LEVEL SECURITY;
ALTER TABLE pledge_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE spending_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE pledge_spending_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopkeeper_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_records ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile." ON profiles FOR UPDATE USING (auth.uid() = id);

-- Donees
CREATE POLICY "Admins can manage donees." ON donees FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Donors can view approved donees." ON donees FOR SELECT USING (status = 'approved');

-- Pledge Records
CREATE POLICY "Donors can manage their own pledges." ON pledge_records FOR ALL USING (donor_id = auth.uid());
CREATE POLICY "Admins can view all pledges." ON pledge_records FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Spending Records
CREATE POLICY "Shopkeepers can manage their own spending records." ON spending_records FOR ALL USING (shopkeeper_id = auth.uid());
CREATE POLICY "Donors can view spending linked to their pledges." ON spending_records FOR SELECT USING (donor_id = auth.uid());
CREATE POLICY "Admins can manage all spending records." ON spending_records FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Pledge Spending Links
CREATE POLICY "Donors can view their own pledge spending links." ON pledge_spending_links FOR SELECT USING (donor_id = auth.uid());
CREATE POLICY "Shopkeepers can insert pledge spending links." ON pledge_spending_links FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view all pledge spending links." ON pledge_spending_links FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Shopkeeper Payments
CREATE POLICY "Donors can manage their own shopkeeper payments." ON shopkeeper_payments FOR ALL USING (donor_id = auth.uid());
CREATE POLICY "Shopkeepers can view payments received." ON shopkeeper_payments FOR SELECT USING (shopkeeper_id = auth.uid());
CREATE POLICY "Admins can view all shopkeeper payments." ON shopkeeper_payments FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Notifications
CREATE POLICY "Users can view their own notifications." ON notifications FOR SELECT USING (profile_id = auth.uid());
CREATE POLICY "Users can update their own notifications." ON notifications FOR UPDATE USING (profile_id = auth.uid());
CREATE POLICY "System can insert notifications." ON notifications FOR INSERT WITH CHECK (true);

-- Audit Logs
CREATE POLICY "Admins can view all audit logs." ON audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "System can insert audit logs." ON audit_logs FOR INSERT WITH CHECK (true);

-- Legacy tables
CREATE POLICY "Donors can view their own donation proofs." ON donation_records FOR SELECT USING (donor_id = auth.uid());
CREATE POLICY "Admins can view all donation proofs." ON donation_records FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
