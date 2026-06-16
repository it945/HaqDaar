import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Tables = {
  profiles: {
    id: string;
    full_name: string;
    phone: string;
    role: 'admin' | 'donor' | 'shopkeeper';
    status: 'active' | 'pending' | 'blocked';
    created_at?: string;
  };
  donees: {
    id: string;
    full_name: string;
    guardian_name?: string;
    city: string;
    area: string;
    need_category?: string;
    receiving_method: string;
    receiving_account_title: string;
    receiving_account_masked: string;
    receiving_qr_image_url?: string;
    spending_qr_code: string;
    photo_url?: string;
    status: 'pending' | 'approved' | 'rejected' | 'archived';
    funded_credit: number;
    created_at?: string;
  };
  pledge_records: {
    id: string;
    donor_id: string;
    donee_id: string;
    amount: number;
    remaining_amount: number;
    status: 'active' | 'partially_spent' | 'fully_spent' | 'cancelled';
    created_at: string;
  };
  spending_records: {
    id: string;
    shopkeeper_id: string;
    donee_id: string;
    donor_id?: string;
    amount: number;
    items_description: string;
    payment_status: 'unpaid' | 'paid';
    created_at: string;
  };
  pledge_spending_links: {
    id: string;
    pledge_id: string;
    spending_id: string;
    donor_id: string;
    amount: number;
    created_at: string;
  };
  shopkeeper_payments: {
    id: string;
    donor_id: string;
    shopkeeper_id: string;
    amount: number;
    proof_screenshot_url?: string;
    status: 'submitted' | 'acknowledged';
    spending_record_ids: string[];
    created_at: string;
  };
  notifications: {
    id: string;
    profile_id: string;
    title: string;
    message: string;
    is_read: boolean;
    metadata?: any;
    created_at: string;
  };
  audit_logs: {
    id: string;
    actor_id: string;
    action: string;
    entity_type: string;
    entity_id?: string;
    details?: any;
    created_at: string;
  };
  // Legacy tables (historical archive, no new writes)
  donation_records: {
    id: string;
    donor_id: string;
    donee_id: string;
    amount: number;
    status: 'pending_verification' | 'verified' | 'rejected';
    transaction_reference?: string;
    proof_screenshot_url?: string;
    created_at: string;
  };
  settlement_records: {
    id: string;
    shopkeeper_id: string;
    amount: number;
    status: 'pending_settlement' | 'settled';
    settled_at: string | null;
    admin_id: string;
    created_at: string;
  };
};
