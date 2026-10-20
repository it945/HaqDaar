import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { initNotifications, showBanner } from '../lib/notifications';
import { planAllocation, planDepositFunding, depositorFreePaisa, orderFamilies, parseAllocNotes, slotCost, type AllocNotes } from '../lib/allocation';
import { Browser } from '@capacitor/browser';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

// ─── Core Types ──────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  role: 'donor' | 'shopkeeper' | 'admin';
  status: 'active' | 'pending' | 'blocked';
  phone?: string;
  email?: string;
}

export interface Donee {
  id: string;
  full_name: string;
  guardian_name?: string;
  city: string;
  area: string;
  need_category?: string;
  receiving_method?: string;
  receiving_account_title?: string;
  receiving_account_masked?: string;
  receiving_qr_image_url?: string;
  spending_qr_code: string;
  photo_url?: string;
  status: string;
  funded_credit: number;
  consent_to_share?: boolean;
  family_size?: number;
  story?: string;
  approved_at?: string;
}

export interface PledgeRecord {
  id: string;
  donor_id: string;
  donee_id: string;
  amount: number;
  remaining_amount: number;
  status: 'active' | 'partially_spent' | 'fully_spent' | 'cancelled';
  created_at: string;
  donees?: { full_name: string };
}

export interface SpendingRecord {
  id: string;
  shopkeeper_id: string;
  donee_id: string;
  donor_id?: string;
  amount: number;
  items_description: string;
  parchi_photo_url?: string;
  payment_status: 'unpaid' | 'paid';
  month_year?: string;
  created_at: string;
  donees?: { full_name: string };
}

export interface ShopkeeperPayment {
  id: string;
  donor_id: string;
  shopkeeper_id: string;
  amount: number;
  proof_screenshot_url?: string;
  status: 'submitted' | 'acknowledged';
  spending_record_ids: string[];
  created_at: string;
  profiles?: { full_name: string };
}

export interface Shopkeeper {
  profile_id: string;
  shop_name: string;
  area?: string;
  city?: string;
  payment_info?: string;
  jazzcash_account?: string;
  easypaisa_account?: string;
  status: 'active' | 'pending' | 'blocked';
  profiles?: { full_name: string; phone: string };
}

export interface Notification {
  id: string;
  profile_id: string;
  title: string;
  message: string;
  is_read: boolean;
  metadata?: any;
  created_at: string;
}

export interface ShopkeeperSpendingSummary {
  shopkeeper_id: string;
  shop_name: string;
  payment_info?: string;
  jazzcash_account?: string;
  easypaisa_account?: string;
  total_unpaid: number;
  spending_records: SpendingRecord[];
}

export interface ShopkeeperDonorSummary {
  donor_id: string;
  donor_name: string;
  donor_phone?: string;
  total_amount: number;
  total_unpaid: number;
  spending_records: SpendingRecord[];
}

export interface TrendPoint {
  period: string;
  pledged: number;
  consumed: number;
}

export interface DoneeBreakdown {
  donee_id: string;
  donee_name: string;
  pledged: number;
  consumed: number;
}

export interface DonorAnalytics {
  total_pledged: number;
  total_consumed: number;
  total_remaining: number;
  by_week: TrendPoint[];
  by_month: TrendPoint[];
  by_shopkeeper: ShopkeeperSpendingSummary[];
  by_donee: DoneeBreakdown[];
}

export interface RankedEntity {
  id: string;
  name: string;
  amount: number;
}

export interface ShopkeeperAnalytics {
  total_distributed: number;
  total_received: number;
  top_donees: RankedEntity[];
  top_donors: RankedEntity[];
  by_week: TrendPoint[];
  by_month: TrendPoint[];
}

export interface DonorWalletInfo {
  donor_id: string;
  donor_name: string;
  donor_phone?: string;
  total_credited: number;
  total_pledged: number;
  available_balance: number;
  credits: { id: string; amount: number; note?: string; created_at: string; added_by_name?: string }[];
}

export type PayoutStatus = 'pending_payment' | 'paid_awaiting_confirmation' | 'completed' | 'rejected' | 'disputed';

export interface PayoutRequest {
  id: string;
  shopkeeper_id: string;
  donee_id: string;
  spending_record_id?: string;
  amount: number;
  items_description: string;
  parchi_photo_url?: string;
  receipt_photo_url?: string;
  status: PayoutStatus;
  payment_proof_url?: string;
  transaction_id?: string;
  payment_method?: string;
  paid_by?: string;
  paid_at?: string;
  rejection_reason?: string;
  dispute_note?: string;
  month_year?: string;
  created_at: string;
  updated_at: string;
  shopkeepers?: { shop_name: string; easypaisa_account?: string; jazzcash_account?: string; payment_info?: string };
  donees?: { full_name: string };
  profiles?: { full_name: string };
}

export interface AdminAnalytics {
  total_pledged: number;
  total_spent: number;
  total_paid: number;
  active_donees: number;
  active_shopkeepers: number;
  active_donors: number;
  by_week: TrendPoint[];
  by_month: TrendPoint[];
  top_donors: RankedEntity[];
  top_shopkeepers: RankedEntity[];
  top_donees: RankedEntity[];
}

// ─── V2 Types ─────────────────────────────────────────────────────────────────

export interface AppSettings {
  monthly_cap_paisa: number;
  tax_rate_pct: number;
  shopkeeper_security_paisa: number;
}

export interface DonorDeposit {
  id: string;
  donor_id: string;
  amount_paisa: number;
  deposit_date: string;
  reference_number?: string;
  receipt_image_url?: string;
  recorded_by?: string;
  created_at: string;
  donor_name?: string;
}

export interface AllocationAssignment {
  id: string;
  run_id: string;
  month_year: string;
  donor_id: string;
  donee_id: string;
  share_paisa: number;
  tax_paisa: number;
  total_reserved_paisa: number;
  donor_name?: string;
  donee_name?: string;
  donee_family_size?: number;
  donee_area?: string;
}

export interface AllocationRun {
  id: string;
  month_year: string;
  status: string;
  pool_paisa: number;
  donee_count: number;
  amount_per_donee_paisa: number;
  is_short_month: boolean;
  run_at: string;
  notes?: string;
  summary?: AllocNotes | null;
  assignments?: AllocationAssignment[];
}

export interface AllocationPreview {
  month_year: string;
  pool_paisa: number;
  eligible_donee_count: number;
  amount_per_donee_paisa: number;
  full_slot_cost_paisa: number;
  is_short_month: boolean;
  funded_count: number;
  unfunded_count: number;
  unused_paisa: number;
  assignments_preview: { donor_id: string; donor_name: string; donee_count: number; total_reserved_paisa: number }[];
}

export interface DonorImpact {
  families_this_month: number;
  people_this_month: number;
  given_this_month_paisa: number;
  tax_this_month_paisa: number;
  families_all_time: number;
  given_all_time_paisa: number;
  total_deposited_paisa: number;
  used_paisa: number;
  reserved_this_month_paisa: number;
  available_paisa: number;
  next_month_families: number;
  category_totals: { category: string; amount_paisa: number }[];
  monthly_chart: { month: string; given_paisa: number; families: number }[];
  milestones: { key: string; label: string; achieved: boolean }[];
}

export interface DonorFamily {
  donee_id: string;
  full_name: string;
  masked_name: string;
  photo_url?: string;
  area: string;
  family_size?: number;
  story?: string;
  consent_to_share: boolean;
  months_supported: number;
  current_month: { allocated_paisa: number; spent_paisa: number; remaining_paisa: number };
  payout_history: { id: string; created_at: string; amount: number; shop_name: string; status: string }[];
}

export interface DonorTransactionV2 {
  id: string;
  created_at: string;
  donee_name: string;
  shop_name: string;
  shop_area?: string;
  amount_paisa: number;
  tax_paisa: number;
  total_charged_paisa: number;
  items?: string;
  status: string;
  month_year?: string;
}

export interface ShopkeeperSecurityStatus {
  shopkeeper_id: string;
  shop_name: string;
  amount_paisa: number;
  event_date?: string;
  method?: string;
  is_returned: boolean;
  records: { id: string; event_type: string; amount_paisa: number; event_date: string; method?: string; screenshot_url?: string }[];
}

export interface InvoiceLineItem {
  name: string;
  qty: number;
  unit_price_paisa: number;
  category: string;
}

export interface Invoice {
  id: string;
  payout_request_id: string;
  invoice_number: string;
  line_items: InvoiceLineItem[];
  total_paisa: number;
  notes?: string;
  created_at: string;
}

// ─── Context Type ─────────────────────────────────────────────────────────────

interface AuthContextType {
  user: User | null;
  login: (phone: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  donees: Donee[];
  myPledges: PledgeRecord[];
  notifications: Notification[];
  unreadNotificationCount: number;
  createPledge: (doneeId: string, amount: number) => Promise<void>;
  getDonorSpendingByShopkeeper: () => Promise<ShopkeeperSpendingSummary[]>;
  getShopkeeperSpendingByDonor: () => Promise<ShopkeeperDonorSummary[]>;
  submitShopkeeperPaymentProof: (shopkeeperId: string, amount: number, spendingIds: string[], imageUrl: string) => Promise<void>;
  getShopkeeperPayments: () => Promise<ShopkeeperPayment[]>;
  acknowledgeShopkeeperPayment: (paymentId: string) => Promise<void>;
  getNotifications: () => Promise<Notification[]>;
  markNotificationRead: (id: string) => Promise<void>;
  recordSpending: (doneeQr: string, amount: number, items: string) => Promise<void>;
  openEasyPaisa: (phone: string, amount: number) => void;
  initiateJazzCash: (phone: string, amount: number) => void;
  seedDatabase: () => Promise<void>;
  registerDonee: (data: Partial<Donee>) => Promise<void>;
  updateDonee: (id: string, data: Partial<Donee>) => Promise<void>;
  getAdminDonees: () => Promise<Donee[]>;
  getAdminShopkeepers: () => Promise<Shopkeeper[]>;
  registerShopkeeper: (data: any) => Promise<void>;
  updateShopkeeper: (id: string, data: Partial<Shopkeeper>, profileData?: any) => Promise<void>;
  getAdminDonors: () => Promise<any[]>;
  registerDonor: (fullName: string, phone?: string) => Promise<{ phone: string }>;
  updateDonor: (id: string, data: { full_name?: string; status?: string }) => Promise<void>;
  getAuditLogs: () => Promise<any[]>;
  getReports: () => Promise<any>;
  getDonorTotalPaid: () => Promise<number>;
  getShopkeeperTotalReceived: () => Promise<number>;
  getDonorAnalytics: () => Promise<DonorAnalytics>;
  getShopkeeperAnalytics: () => Promise<ShopkeeperAnalytics>;
  getAdminAnalytics: () => Promise<AdminAnalytics>;
  exportMyRecords: () => Promise<void>;
  isLocalFallback: boolean;
  error: string | null;
  donorWalletBalance: number;
  addDonorCredit: (donorId: string, amount: number, note?: string) => Promise<void>;
  getAdminDonorWallets: () => Promise<DonorWalletInfo[]>;
  getAdminPayoutRequests: (statusFilter?: PayoutStatus | 'all') => Promise<PayoutRequest[]>;
  adminMarkPayoutPaid: (requestId: string, proofUrl: string, transactionId: string, method: string) => Promise<void>;
  adminRejectPayout: (requestId: string, reason: string) => Promise<void>;
  shopkeeperConfirmPayout: (requestId: string) => Promise<void>;
  shopkeeperDisputePayout: (requestId: string, note: string) => Promise<void>;
  adminResolveDispute: (requestId: string, action: 'complete' | 'reupload', proofUrl?: string, transactionId?: string) => Promise<void>;
  getMyPayoutRequests: () => Promise<PayoutRequest[]>;
  getDonorPurchaseTransparency: () => Promise<any[]>;
  // V2
  getSettings: () => Promise<AppSettings>;
  updateSetting: (key: keyof AppSettings, value: number) => Promise<void>;
  addDonorDeposit: (donorId: string, amountPaisa: number, depositDate: string, refNumber?: string, imageUrl?: string) => Promise<void>;
  getDonorAvailableBalance: (donorId: string) => Promise<number>;
  previewAllocation: (monthYear: string) => Promise<AllocationPreview>;
  runMonthlyAllocation: (monthYear: string, force?: boolean) => Promise<{ status: string; run_id?: string; donee_count?: number }>;
  performMonthClose: (monthYear: string) => Promise<void>;
  getDonorImpact: () => Promise<DonorImpact>;
  getDonorFamilies: () => Promise<DonorFamily[]>;
  getDonorTransactionsV2: (monthYear?: string, doneeId?: string) => Promise<DonorTransactionV2[]>;
  recordSpendingV2: (doneeQr: string, amountPaisa: number, parchiPhotoDataUrl: string) => Promise<{ payout_id: string }>;
  adminMarkPayoutPaidV2: (requestId: string, proofDataUrl: string, transactionId: string, method: string) => Promise<void>;
  createInvoice: (payoutRequestId: string, lineItems: InvoiceLineItem[], notes?: string) => Promise<Invoice>;
  getInvoice: (payoutRequestId: string) => Promise<Invoice | null>;
  getAdminAllocations: (monthYear: string) => Promise<AllocationRun | null>;
  getAdminDeposits: () => Promise<DonorDeposit[]>;
  addShopkeeperSecurity: (shopkeeperId: string, amountPaisa: number, eventDate: string, method: string, screenshotUrl?: string) => Promise<void>;
  getShopkeeperSecurityStatus: (shopkeeperId: string) => Promise<ShopkeeperSecurityStatus | null>;
  getInvoiceCategories: () => Promise<string[]>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_USERS: User[] = [
  { id: '00000000-0000-0000-0000-000000000000', name: 'Admin User', role: 'admin', status: 'active', phone: '03000000000' },
  { id: '00000000-0000-0000-0000-000000000001', name: 'Haris Donor', role: 'donor', status: 'active', phone: '03001111111' },
  { id: '00000000-0000-0000-0000-000000000002', name: 'Ahmed Store', role: 'shopkeeper', status: 'active', phone: '03002222222' }
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function currentMonthYear(): string { return new Date().toISOString().slice(0, 7); }

function prevMonth(monthYear: string): string {
  const [y, m] = monthYear.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function weekLabel(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function monthLabel(date: Date): string { return date.toISOString().slice(0, 7); }

function bucketTrend(entries: { date: string; pledged?: number; consumed?: number }[], granularity: 'week' | 'month'): TrendPoint[] {
  const map = new Map<string, TrendPoint>();
  for (const entry of entries) {
    const d = new Date(entry.date);
    const period = granularity === 'week' ? weekLabel(d) : monthLabel(d);
    if (!map.has(period)) map.set(period, { period, pledged: 0, consumed: 0 });
    const point = map.get(period)!;
    point.pledged += entry.pledged || 0;
    point.consumed += entry.consumed || 0;
  }
  return Array.from(map.values()).sort((a, b) => a.period.localeCompare(b.period));
}

function csvEscape(value: any): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function toCsv(rows: Record<string, any>[]): string {
  if (rows.length === 0) return '';
  const headerSet = new Set<string>();
  rows.forEach(r => Object.keys(r).forEach(k => headerSet.add(k)));
  const headers = Array.from(headerSet);
  const lines = [headers.join(',')];
  for (const row of rows) lines.push(headers.map(h => csvEscape(row[h])).join(','));
  return lines.join('\n');
}

async function shareCsv(filename: string, csv: string) {
  const result = await Filesystem.writeFile({ path: filename, data: csv, directory: Directory.Cache, encoding: Encoding.UTF8 });
  await Share.share({ title: 'HaqDaar Export', url: result.uri });
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [donees, setDonees] = useState<Donee[]>([]);
  const [myPledges, setMyPledges] = useState<PledgeRecord[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [isLocalFallback, setIsLocalFallback] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [donorWalletBalance, setDonorWalletBalance] = useState(0);

  useEffect(() => {
    const initAuth = async () => {
      const savedUser = localStorage.getItem('haqdaar_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        const { data } = await supabase.from('profiles').select('id').eq('id', parsed.id).single();
        if (!data) {
          await supabase.from('profiles').insert({ id: parsed.id, full_name: parsed.full_name || parsed.name, phone: parsed.phone, role: parsed.role, status: 'active' });
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  // Initialize push notifications whenever the user logs in
  useEffect(() => {
    if (user) {
      initNotifications(user.id, user.role).catch(console.error);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;

    const fetchDonees = async () => {
      const { data } = await supabase.from('donees').select('*').eq('status', 'approved');
      if (data) setDonees(data);
    };

    const fetchBalance = async () => {
      if (user.role !== 'donor') return;
      const bal = await getDonorAvailableBalance(user.id);
      setDonorWalletBalance(bal / 100);
    };

    const fetchNotifications = async () => {
      const { data } = await supabase.from('notifications').select('*').eq('profile_id', user.id).order('created_at', { ascending: false }).limit(50);
      if (data) {
        setNotifications(data);
        setUnreadNotificationCount(data.filter(n => !n.is_read).length);
      }
    };

    fetchDonees();
    fetchBalance();
    fetchNotifications();

    const notifChannel = supabase.channel('user_notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `profile_id=eq.${user.id}` }, () => fetchNotifications())
      .subscribe();

    let paymentChannel: any;
    if (user.role === 'shopkeeper') {
      paymentChannel = supabase.channel('shopkeeper_rt')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'payout_requests', filter: `shopkeeper_id=eq.${user.id}` }, () => fetchNotifications())
        .subscribe();
    }

    return () => {
      supabase.removeChannel(notifChannel);
      if (paymentChannel) supabase.removeChannel(paymentChannel);
    };
  }, [user]);

  // ─── Auth ────────────────────────────────────────────────────────────────

  const login = async (phone: string) => {
    setIsLoading(true);
    setError(null);
    try {
      let profile: any = null;
      let useLocal = false;
      try {
        const { data } = await supabase.from('profiles').select('*').eq('phone', phone).single();
        profile = data;
      } catch { useLocal = true; }

      if (!profile) {
        const local = LOCAL_USERS.find(u => u.phone === phone);
        if (local) {
          if (useLocal) {
            profile = { id: local.id, full_name: local.name, phone: local.phone, role: local.role, status: local.status };
          } else {
            const { data: np, error: ie } = await supabase.from('profiles').insert({ id: local.id, full_name: local.name, phone: local.phone, role: local.role, status: 'active' }).select().single();
            if (ie && !ie.message?.includes('duplicate')) throw ie;
            profile = np || { id: local.id, full_name: local.name, phone: local.phone, role: local.role, status: local.status };
          }
        }
      }

      if (profile) {
        const u: User = { id: profile.id, name: profile.full_name, role: profile.role, status: profile.status, phone: profile.phone };
        setUser(u);
        localStorage.setItem('haqdaar_user', JSON.stringify(u));
        setIsLocalFallback(useLocal);
      } else {
        throw new Error('No account found for this phone number. Please contact Admin.');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => { setUser(null); localStorage.removeItem('haqdaar_user'); };

  // ─── V2: Settings ────────────────────────────────────────────────────────

  const getSettings = async (): Promise<AppSettings> => {
    const { data } = await supabase.from('settings').select('key, value');
    const map: Record<string, string> = {};
    for (const row of data || []) map[row.key] = row.value;
    return {
      monthly_cap_paisa: parseInt(map.monthly_cap_paisa ?? '500000'),
      tax_rate_pct: parseInt(map.tax_rate_pct ?? '10'),
      shopkeeper_security_paisa: parseInt(map.shopkeeper_security_paisa ?? '500000'),
    };
  };

  const updateSetting = async (key: keyof AppSettings, value: number) => {
    if (!user || user.role !== 'admin') throw new Error('Admin only');
    await supabase.from('settings').upsert({ key: key as string, value: String(value), updated_by: user.id, updated_at: new Date().toISOString() });
    await supabase.from('audit_logs').insert({ actor_id: user.id, action: 'UPDATE_SETTING', entity_type: 'settings', details: { key, value } });
  };

  // ─── V2: Donor Ledger ────────────────────────────────────────────────────

  const getDonorAvailableBalance = async (donorId: string): Promise<number> => {
    const { data } = await supabase.from('donor_ledger').select('amount_paisa').eq('donor_id', donorId);
    return (data || []).reduce((s, r) => s + Number(r.amount_paisa), 0);
  };

  // ─── V2: Donor Deposits ──────────────────────────────────────────────────

  const addDonorDeposit = async (donorId: string, amountPaisa: number, depositDate: string, refNumber?: string, imageUrl?: string) => {
    if (!user || user.role !== 'admin') throw new Error('Admin only');
    if (amountPaisa <= 0) throw new Error('Amount must be positive');

    const { data: deposit, error } = await supabase.from('donor_deposits').insert({ donor_id: donorId, amount_paisa: amountPaisa, deposit_date: depositDate, reference_number: refNumber || null, receipt_image_url: imageUrl || null, recorded_by: user.id }).select().single();
    if (error) throw error;

    await supabase.from('donor_ledger').insert({ donor_id: donorId, entry_type: 'deposit', amount_paisa: amountPaisa, reference_id: deposit.id, reference_type: 'donor_deposit', note: refNumber ? `Ref: ${refNumber}` : 'Admin deposit' });

    await supabase.from('notifications').insert({ profile_id: donorId, title: 'Deposit Recorded', message: `Admin recorded a deposit of Rs ${(amountPaisa / 100).toLocaleString()} to your account.${refNumber ? ` Ref: ${refNumber}` : ''}`, metadata: { type: 'deposit_recorded', amount_paisa: amountPaisa } });
    await supabase.from('audit_logs').insert({ actor_id: user.id, action: 'ADD_DONOR_DEPOSIT', entity_type: 'donor_deposits', entity_id: donorId, details: { amount_paisa: amountPaisa, deposit_date: depositDate, ref: refNumber } });

    await fundLeftOutFamilies(currentMonthYear(), donorId);
  };

  const getAdminDeposits = async (): Promise<DonorDeposit[]> => {
    if (!user || user.role !== 'admin') return [];
    const { data } = await supabase.from('donor_deposits').select('*, donor:profiles!donor_deposits_donor_id_fkey(full_name)').order('created_at', { ascending: false });
    return ((data || []) as any[]).map(d => ({ ...d, donor_name: d.donor?.full_name }));
  };

  // ─── V2: Allocation ──────────────────────────────────────────────────────

  const loadAllocationPlan = async (monthYear: string) => {
    const settings = await getSettings();
    const cap = settings.monthly_cap_paisa;
    const taxRate = settings.tax_rate_pct / 100;

    const monthStart = `${monthYear}-01T00:00:00Z`;
    const { data: eligibleRows } = await supabase.from('donees').select('id, full_name, funded_credit, approved_at').eq('status', 'approved').lt('approved_at', monthStart);
    const { data: donors } = await supabase.from('profiles').select('id, full_name').eq('role', 'donor').eq('status', 'active');
    const donorBalances: { id: string; full_name: string; available: number }[] = [];
    for (const d of donors || []) {
      const bal = await getDonorAvailableBalance(d.id);
      if (bal > 0) donorBalances.push({ id: d.id, full_name: d.full_name, available: bal });
    }

    const lastMo = prevMonth(monthYear);
    const { data: lastAssignments } = await supabase.from('allocation_assignments').select('donor_id, donee_id').eq('month_year', lastMo);
    const { data: lastRun } = await supabase.from('monthly_allocation_runs').select('next_donor_pointer, notes').eq('month_year', lastMo).single();
    const lastUnfunded = parseAllocNotes(lastRun?.notes)?.unfunded.map(u => u.id) ?? [];

    const families = orderFamilies((eligibleRows || []).map(d => {
      const credit = Math.round(Number(d.funded_credit) * 100);
      return { id: d.id as string, full_name: d.full_name as string, approved_at: d.approved_at as string | null, credit, topup: Math.max(0, cap - credit) };
    }), lastUnfunded);

    const plan = planAllocation({ donors: donorBalances, families, lastPairs: lastAssignments || [], pointerDonorId: lastRun?.next_donor_pointer, taxRate });
    const needing = families.filter(f => f.topup > 0);
    return {
      cap, taxRate, families, donorBalances, plan,
      pool: donorBalances.reduce((s, d) => s + d.available, 0),
      amountPerDonee: needing.length > 0 ? Math.floor(needing.reduce((s, f) => s + f.topup, 0) / needing.length) : 0,
      fullSlotCost: slotCost(cap, taxRate),
    };
  };

  const previewAllocation = async (monthYear: string): Promise<AllocationPreview> => {
    const { families, donorBalances, plan, pool, amountPerDonee, fullSlotCost } = await loadAllocationPlan(monthYear);
    const perDonor = new Map<string, { count: number; total: number }>();
    for (const a of plan.assignments) {
      const p = perDonor.get(a.donor_id) || { count: 0, total: 0 };
      perDonor.set(a.donor_id, { count: p.count + 1, total: p.total + a.total_reserved });
    }
    return {
      month_year: monthYear,
      pool_paisa: pool,
      eligible_donee_count: families.length,
      amount_per_donee_paisa: amountPerDonee,
      full_slot_cost_paisa: fullSlotCost,
      is_short_month: plan.unfunded.length > 0,
      funded_count: families.length - plan.unfunded.length,
      unfunded_count: plan.unfunded.length,
      unused_paisa: plan.unusedPaisa,
      assignments_preview: donorBalances.filter(d => perDonor.has(d.id)).map(d => ({ donor_id: d.id, donor_name: d.full_name, donee_count: perDonor.get(d.id)!.count, total_reserved_paisa: perDonor.get(d.id)!.total })),
    };
  };

  const runMonthlyAllocation = async (monthYear: string, force?: boolean): Promise<{ status: string; run_id?: string; donee_count?: number }> => {
    if (!user || user.role !== 'admin') throw new Error('Admin only');

    const { data: existing } = await supabase.from('monthly_allocation_runs').select('id').eq('month_year', monthYear).single();
    if (existing) {
      if (!force) return { status: 'already_run', run_id: existing.id };
      // Undo existing allocation: reverse ledger entries, remove assignments and run record
      await supabase.from('allocation_assignments').delete().eq('month_year', monthYear);
      await supabase.from('monthly_allocation_runs').delete().eq('id', existing.id);
    }

    // Preserve any spending that already happened (important for force re-run)
    const { data: existingBals } = await supabase.from('monthly_donee_balances').select('donee_id, spent_paisa').eq('month_year', monthYear);
    const existingSpentMap = new Map((existingBals || []).map(b => [b.donee_id, b.spent_paisa ?? 0]));

    const { families, plan, pool, amountPerDonee } = await loadAllocationPlan(monthYear);
    if (families.length === 0) {
      const { data: run } = await supabase.from('monthly_allocation_runs').insert({ month_year: monthYear, status: 'completed', pool_paisa: 0, donee_count: 0, amount_per_donee_paisa: 0, run_by: user.id, notes: 'No eligible donees' }).select().single();
      return { status: 'no_donees', run_id: run?.id };
    }
    if (!families.some(f => f.topup > 0)) {
      const { data: run } = await supabase.from('monthly_allocation_runs').insert({ month_year: monthYear, status: 'completed', pool_paisa: pool, donee_count: families.length, amount_per_donee_paisa: 0, run_by: user.id, notes: 'All donees at full balance' }).select().single();
      return { status: 'all_full', run_id: run?.id };
    }

    const assignments = plan.assignments;
    const fundedCount = families.length - plan.unfunded.length;
    const isShort = plan.unfunded.length > 0;
    const familyById = new Map(families.map(f => [f.id, f]));
    const summary: AllocNotes = {
      eligible: families.length,
      funded: fundedCount,
      unfunded: plan.unfunded.map(id => ({ id, name: familyById.get(id)?.full_name || '' })),
      unused_paisa: plan.unusedPaisa,
    };

    const { data: run } = await supabase.from('monthly_allocation_runs').insert({ month_year: monthYear, status: 'completed', pool_paisa: pool, donee_count: assignments.length, amount_per_donee_paisa: amountPerDonee, is_short_month: isShort, run_by: user.id, next_donor_pointer: plan.nextPointer, notes: JSON.stringify(summary) }).select().single();
    if (!run) throw new Error('Failed to create allocation run');

    for (const a of assignments) {
      await supabase.from('allocation_assignments').insert({ run_id: run.id, month_year: monthYear, donor_id: a.donor_id, donee_id: a.donee_id, share_paisa: a.share_paisa, tax_paisa: a.tax_paisa, total_reserved_paisa: a.total_reserved });
      await supabase.from('monthly_donee_balances').upsert({ month_year: monthYear, donee_id: a.donee_id, allocated_paisa: a.share_paisa, spent_paisa: existingSpentMap.get(a.donee_id) ?? 0 }, { onConflict: 'month_year,donee_id' });
      const currentPaisa = familyById.get(a.donee_id)?.credit ?? 0;
      const spent = existingSpentMap.get(a.donee_id) ?? 0;
      await supabase.from('donees').update({ funded_credit: Math.max(0, currentPaisa + a.share_paisa - spent) / 100 }).eq('id', a.donee_id);
    }

    const donorDoneeCount = new Map<string, number>();
    for (const a of assignments) donorDoneeCount.set(a.donor_id, (donorDoneeCount.get(a.donor_id) || 0) + 1);
    for (const [donorId, count] of donorDoneeCount) await supabase.from('notifications').insert({ profile_id: donorId, title: 'Monthly Allocation Done', message: `This month you're supporting ${count} ${count === 1 ? 'family' : 'families'}. JazakAllah!`, metadata: { type: 'allocation_done', month_year: monthYear, donee_count: count } });

    const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin');
    for (const admin of admins || []) await supabase.from('notifications').insert({ profile_id: admin.id, title: 'Allocation Complete', message: `${monthYear}: ${fundedCount} of ${families.length} families funded in full.${isShort ? ` ⚠️ ${plan.unfunded.length} left out — see the Allocation page.` : ''}`, metadata: { type: 'allocation_completed', month_year: monthYear } });

    await supabase.from('audit_logs').insert({ actor_id: user.id, action: 'RUN_MONTHLY_ALLOCATION', entity_type: 'monthly_allocation_runs', entity_id: run.id, details: { month_year: monthYear, funded: fundedCount, eligible: families.length, unfunded: plan.unfunded, is_short: isShort } });

    // Push notification to donors — fires even when their app is closed (FCM)
    try {
      const donorIds = [...new Set(assignments.map(a => a.donor_id))];
      if (donorIds.length > 0) {
        await supabase.functions.invoke('send-push', {
          body: {
            user_ids: donorIds,
            title: 'Monthly Allocation Done',
            body: `Alhamdulillah! ${monthYear} allocation is complete. Open HaqDaar to see your families.`,
            data: { type: 'allocation_done', month_year: monthYear },
          },
        });
        // Also show banner on admin's own device immediately
        await showBanner('Allocation Complete', `${fundedCount} of ${families.length} families funded in full for ${monthYear}${isShort ? `, ${plan.unfunded.length} left out` : ''}.`, Date.now());
      }
    } catch (_) {/* notifications are best-effort */}

    return { status: 'success', run_id: run.id, donee_count: assignments.length };
  };

  const performMonthClose = async (monthYear: string) => {
    if (!user || user.role !== 'admin') throw new Error('Admin only');
    // Unspent donee balances carry forward — no money is returned to donors.
    // The next month's allocation will top up each donee to Rs. 5000 based on remaining balance.
    await supabase.from('audit_logs').insert({ actor_id: user.id, action: 'MONTH_CLOSE', entity_type: 'monthly_allocation_runs', details: { month_year: monthYear } });
  };

  const fundLeftOutFamilies = async (monthYear: string, depositorId: string) => {
    const { data: run } = await supabase.from('monthly_allocation_runs').select('id, notes, donee_count').eq('month_year', monthYear).single();
    const summary = parseAllocNotes(run?.notes);
    if (!run || !summary || summary.unfunded.length === 0) return;

    const settings = await getSettings();
    const cap = settings.monthly_cap_paisa;
    const taxRate = settings.tax_rate_pct / 100;

    const { data: rows } = await supabase.from('donees').select('id, funded_credit, status').in('id', summary.unfunded.map(u => u.id));
    const rowById = new Map((rows || []).map(r => [r.id, r]));
    const families = summary.unfunded
      .map(u => rowById.get(u.id))
      .filter(r => r && r.status === 'approved')
      .map(r => {
        const credit = Math.round(Number(r!.funded_credit) * 100);
        return { id: r!.id as string, credit, topup: Math.max(0, cap - credit) };
      });

    const available = await getDonorAvailableBalance(depositorId);
    const { data: committedRows } = await supabase.from('allocation_assignments').select('total_reserved_paisa').eq('month_year', monthYear).eq('donor_id', depositorId);
    const { data: spentRows } = await supabase.from('donor_ledger').select('amount_paisa').eq('donor_id', depositorId).eq('month_year', monthYear).in('entry_type', ['spend', 'tax']);
    const committed = (committedRows || []).reduce((s, r) => s + Number(r.total_reserved_paisa), 0);
    const spent = -(spentRows || []).reduce((s, r) => s + Number(r.amount_paisa), 0);
    const free = depositorFreePaisa(available, committed, spent);

    const { assignments, stillUnfunded } = planDepositFunding(depositorId, free, families, taxRate);

    for (const a of assignments) {
      const family = families.find(f => f.id === a.donee_id)!;
      const { data: bal } = await supabase.from('monthly_donee_balances').select('allocated_paisa, spent_paisa').eq('month_year', monthYear).eq('donee_id', a.donee_id).single();
      await supabase.from('allocation_assignments').insert({ run_id: run.id, month_year: monthYear, donor_id: a.donor_id, donee_id: a.donee_id, share_paisa: a.share_paisa, tax_paisa: a.tax_paisa, total_reserved_paisa: a.total_reserved });
      await supabase.from('monthly_donee_balances').upsert({ month_year: monthYear, donee_id: a.donee_id, allocated_paisa: (bal?.allocated_paisa ?? 0) + a.share_paisa, spent_paisa: bal?.spent_paisa ?? 0 }, { onConflict: 'month_year,donee_id' });
      await supabase.from('donees').update({ funded_credit: (family.credit + a.share_paisa) / 100 }).eq('id', a.donee_id);
    }

    const remaining = summary.unfunded.filter(u => stillUnfunded.includes(u.id));
    if (remaining.length === summary.unfunded.length) return;
    const updated: AllocNotes = { ...summary, unfunded: remaining, funded: summary.eligible - remaining.length };
    await supabase.from('monthly_allocation_runs').update({ notes: JSON.stringify(updated), is_short_month: remaining.length > 0, donee_count: (run.donee_count || 0) + assignments.length }).eq('id', run.id);

    if (assignments.length > 0) {
      await supabase.from('notifications').insert({ profile_id: depositorId, title: 'Families Funded', message: `Your deposit funded ${assignments.length} ${assignments.length === 1 ? 'family' : 'families'} in full this month. JazakAllah!`, metadata: { type: 'topup_done', month_year: monthYear, donee_count: assignments.length } });
      await supabase.from('audit_logs').insert({ actor_id: user!.id, action: 'FUND_LEFT_OUT_FAMILIES', entity_type: 'monthly_allocation_runs', entity_id: run.id, details: { month_year: monthYear, donor_id: depositorId, donee_ids: assignments.map(a => a.donee_id) } });
    }
  };

  const getAdminAllocations = async (monthYear: string): Promise<AllocationRun | null> => {
    const { data: run } = await supabase.from('monthly_allocation_runs').select('*').eq('month_year', monthYear).single();
    if (!run) return null;
    const { data: assigns } = await supabase.from('allocation_assignments').select('*, donor:profiles!allocation_assignments_donor_id_fkey(full_name), donee:donees!allocation_assignments_donee_id_fkey(full_name, family_size, area)').eq('month_year', monthYear);
    return { ...run, summary: parseAllocNotes(run.notes), assignments: ((assigns || []) as any[]).map(a => ({ ...a, donor_name: a.donor?.full_name, donee_name: a.donee?.full_name, donee_family_size: a.donee?.family_size, donee_area: a.donee?.area })) };
  };

  // ─── V2: Spending (Shopkeeper Parchi Flow) ───────────────────────────────

  const recordSpendingV2 = async (doneeQr: string, amountPaisa: number, parchiPhotoDataUrl: string): Promise<{ payout_id: string }> => {
    if (user?.role !== 'shopkeeper') throw new Error('Shopkeeper only');

    const { data: donee } = await supabase.from('donees').select('id, full_name, funded_credit').eq('spending_qr_code', doneeQr).single();
    if (!donee) throw new Error('Donee not found or invalid QR');

    const monthYear = currentMonthYear();
    const { data: bal } = await supabase.from('monthly_donee_balances').select('allocated_paisa, spent_paisa').eq('month_year', monthYear).eq('donee_id', donee.id).single();
    const allocated = bal?.allocated_paisa ?? (donee.funded_credit * 100);
    const spent = bal?.spent_paisa ?? 0;
    const remaining = allocated - spent;

    if (amountPaisa > remaining) throw new Error(`Amount exceeds donee's remaining balance (Rs ${(remaining / 100).toLocaleString()})`);

    const { data: spending, error: spendErr } = await supabase.from('spending_records').insert({ shopkeeper_id: user.id, donee_id: donee.id, amount: amountPaisa / 100, items_description: 'Parchi uploaded', parchi_photo_url: parchiPhotoDataUrl, payment_status: 'unpaid', month_year: monthYear }).select().single();
    if (spendErr) throw spendErr;

    await supabase.from('monthly_donee_balances').upsert({ month_year: monthYear, donee_id: donee.id, allocated_paisa: allocated, spent_paisa: spent + amountPaisa }, { onConflict: 'month_year,donee_id' });
    await supabase.from('donees').update({ funded_credit: (remaining - amountPaisa) / 100 }).eq('id', donee.id);

    const { data: shop } = await supabase.from('shopkeepers').select('shop_name').eq('profile_id', user.id).single();

    const { data: payout, error: payoutErr } = await supabase.from('payout_requests').insert({ shopkeeper_id: user.id, donee_id: donee.id, spending_record_id: spending.id, amount: amountPaisa / 100, items_description: 'Parchi uploaded', parchi_photo_url: parchiPhotoDataUrl, status: 'pending_payment', month_year: monthYear }).select().single();
    if (payoutErr) throw payoutErr;

    const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin');
    for (const admin of admins || []) await supabase.from('notifications').insert({ profile_id: admin.id, title: 'New Payout Request', message: `${donee.full_name} at ${shop?.shop_name || 'shop'}: Rs ${(amountPaisa / 100).toLocaleString()}. Parchi attached.`, metadata: { type: 'payout_request_created', payout_id: payout.id } });

    const { data: assigns } = await supabase.from('allocation_assignments').select('donor_id').eq('month_year', monthYear).eq('donee_id', donee.id);
    for (const a of assigns || []) await supabase.from('notifications').insert({ profile_id: a.donor_id, title: 'Purchase by Your Family', message: `${donee.full_name} bought goods worth Rs ${(amountPaisa / 100).toLocaleString()} at ${shop?.shop_name || 'a shop'}.`, metadata: { type: 'spending_recorded', payout_id: payout.id } });

    await supabase.from('notifications').insert({ profile_id: user.id, title: 'Purchase Submitted', message: `Rs ${(amountPaisa / 100).toLocaleString()} for ${donee.full_name}. Payment will be sent by end of day.`, metadata: { type: 'purchase_submitted', payout_id: payout.id } });
    await supabase.from('audit_logs').insert({ actor_id: user.id, action: 'RECORD_SPENDING_V2', entity_type: 'spending_records', entity_id: spending.id, details: { amount_paisa: amountPaisa, donee_id: donee.id, month_year: monthYear } });

    return { payout_id: payout.id };
  };

  // ─── V2: Admin Payout ────────────────────────────────────────────────────

  const adminMarkPayoutPaidV2 = async (requestId: string, proofDataUrl: string, transactionId: string, method: string) => {
    if (!user || user.role !== 'admin') throw new Error('Admin only');
    const { data: req } = await supabase.from('payout_requests').select('shopkeeper_id, donee_id, amount, month_year').eq('id', requestId).single();
    if (!req) throw new Error('Payout not found');

    await supabase.from('payout_requests').update({ status: 'paid_awaiting_confirmation', payment_proof_url: proofDataUrl, transaction_id: transactionId, payment_method: method, paid_by: user.id, paid_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', requestId);

    const amountPaisa = Math.round(req.amount * 100);
    const monthYear = req.month_year || currentMonthYear();
    const settings = await getSettings();
    const taxRate = settings.tax_rate_pct / 100;
    const taxPaisa = Math.round(amountPaisa * taxRate);

    const { data: assigns } = await supabase.from('allocation_assignments').select('donor_id, share_paisa').eq('month_year', monthYear).eq('donee_id', req.donee_id);
    const totalShare = (assigns || []).reduce((s, a) => s + a.share_paisa, 0);
    for (const assign of assigns || []) {
      const fraction = totalShare > 0 ? assign.share_paisa / totalShare : 1 / Math.max(assigns?.length || 1, 1);
      const donorSpend = Math.round(amountPaisa * fraction);
      const donorTax = Math.round(taxPaisa * fraction);
      await supabase.from('donor_ledger').insert({ donor_id: assign.donor_id, entry_type: 'spend', amount_paisa: -donorSpend, reference_id: requestId, reference_type: 'payout', note: `Purchase paid - ${method}`, month_year: monthYear });
      await supabase.from('donor_ledger').insert({ donor_id: assign.donor_id, entry_type: 'tax', amount_paisa: -donorTax, reference_id: requestId, reference_type: 'payout', note: `Govt tax (${settings.tax_rate_pct}%)`, month_year: monthYear });
      await supabase.from('notifications').insert({ profile_id: assign.donor_id, title: 'Purchase Paid', message: `Rs ${(donorSpend / 100).toLocaleString()} + Rs ${(donorTax / 100).toLocaleString()} govt tax charged for a family purchase.`, metadata: { type: 'payout_paid_donor', payout_id: requestId } });
    }

    if (req.shopkeeper_id) await supabase.from('notifications').insert({ profile_id: req.shopkeeper_id, title: 'Payment Sent', message: `Rs ${req.amount.toLocaleString()} sent via ${method}. Please confirm receipt.`, metadata: { type: 'payout_paid', payout_id: requestId, proof_url: proofDataUrl } });
    await supabase.from('audit_logs').insert({ actor_id: user.id, action: 'PAYOUT_MARKED_PAID_V2', entity_type: 'payout_requests', entity_id: requestId, details: { method, transaction_id: transactionId } });
  };

  // ─── V2: Invoices ────────────────────────────────────────────────────────

  const createInvoice = async (payoutRequestId: string, lineItems: InvoiceLineItem[], notes?: string): Promise<Invoice> => {
    if (!user || user.role !== 'admin') throw new Error('Admin only');
    const totalPaisa = lineItems.reduce((s, i) => s + i.qty * i.unit_price_paisa, 0);
    const invoiceNumber = `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 9000 + 1000)}`;
    const { data, error } = await supabase.from('invoices').upsert({ payout_request_id: payoutRequestId, invoice_number: invoiceNumber, line_items: lineItems, total_paisa: totalPaisa, notes: notes || null, created_by: user.id }, { onConflict: 'payout_request_id' }).select().single();
    if (error) throw error;
    return data as Invoice;
  };

  const getInvoice = async (payoutRequestId: string): Promise<Invoice | null> => {
    const { data } = await supabase.from('invoices').select('*').eq('payout_request_id', payoutRequestId).single();
    return (data as Invoice) || null;
  };

  const getInvoiceCategories = async (): Promise<string[]> => {
    const { data } = await supabase.from('invoice_categories').select('name').eq('is_active', true).order('sort_order');
    if (data && data.length > 0) return data.map(r => r.name);
    return ['Flour/Atta', 'Oil/Ghee', 'Rice/Pulses', 'Milk/Dairy', 'Medicine', 'Other'];
  };

  // ─── V2: Donor Impact ────────────────────────────────────────────────────

  const getDonorImpact = async (): Promise<DonorImpact> => {
    if (!user || user.role !== 'donor') throw new Error('Donor only');
    const monthYear = currentMonthYear();
    const settings = await getSettings();
    const taxRate = settings.tax_rate_pct / 100;

    const { data: myAssigns } = await supabase.from('allocation_assignments').select('donee_id, share_paisa, tax_paisa, total_reserved_paisa, donee:donees!allocation_assignments_donee_id_fkey(family_size)').eq('donor_id', user.id).eq('month_year', monthYear);
    const { data: allAssigns } = await supabase.from('allocation_assignments').select('donee_id, share_paisa, month_year').eq('donor_id', user.id);
    const { data: ledger } = await supabase.from('donor_ledger').select('entry_type, amount_paisa, month_year').eq('donor_id', user.id);

    const deposits = (ledger || []).filter(l => l.entry_type === 'deposit').reduce((s, l) => s + l.amount_paisa, 0);
    const reserved = (ledger || []).filter(l => ['reserve', 'topup_reserve'].includes(l.entry_type) && l.month_year === monthYear).reduce((s, l) => s + Math.abs(l.amount_paisa), 0);
    const spent = (ledger || []).filter(l => l.entry_type === 'spend').reduce((s, l) => s + Math.abs(l.amount_paisa), 0);
    const taxPaid = (ledger || []).filter(l => l.entry_type === 'tax').reduce((s, l) => s + Math.abs(l.amount_paisa), 0);
    const available = (ledger || []).reduce((s, l) => s + l.amount_paisa, 0);

    const familiesThisMonth = new Set((myAssigns || []).map((a: any) => a.donee_id)).size;
    const peopleThisMonth = (myAssigns || []).reduce((s: number, a: any) => s + (a.donee?.family_size || 1), 0);
    const givenThisMonth = (myAssigns || []).reduce((s, a) => s + a.share_paisa, 0);
    const allDoneeIds = new Set((allAssigns || []).map(a => a.donee_id));
    const givenAllTime = (allAssigns || []).reduce((s, a) => s + a.share_paisa, 0);
    const fullSlotCost = Math.floor(settings.monthly_cap_paisa * (1 + taxRate));
    const nextFamilies = Math.floor(available / fullSlotCost);

    const monthSet = new Map<string, { given: number; families: Set<string> }>();
    for (const a of allAssigns || []) {
      if (!a.month_year) continue;
      if (!monthSet.has(a.month_year)) monthSet.set(a.month_year, { given: 0, families: new Set() });
      const entry = monthSet.get(a.month_year)!;
      entry.given += a.share_paisa;
      entry.families.add(a.donee_id);
    }

    return {
      families_this_month: familiesThisMonth, people_this_month: peopleThisMonth,
      given_this_month_paisa: givenThisMonth, tax_this_month_paisa: (myAssigns || []).reduce((s, a) => s + a.tax_paisa, 0),
      families_all_time: allDoneeIds.size, given_all_time_paisa: givenAllTime,
      total_deposited_paisa: deposits, used_paisa: spent + taxPaid,
      reserved_this_month_paisa: reserved, available_paisa: available,
      next_month_families: Math.max(0, nextFamilies),
      category_totals: [],
      monthly_chart: Array.from(monthSet.entries()).sort((a, b) => a[0].localeCompare(b[0])).slice(-6).map(([month, d]) => ({ month, given_paisa: d.given, families: d.families.size })),
      milestones: [
        { key: 'first_family', label: 'First family helped', achieved: allDoneeIds.size >= 1 },
        { key: '10_families', label: '10 families helped', achieved: allDoneeIds.size >= 10 },
        { key: '100k_given', label: 'Rs 100,000 given', achieved: givenAllTime >= 10000000 },
      ]
    };
  };

  const getDonorFamilies = async (): Promise<DonorFamily[]> => {
    if (!user || user.role !== 'donor') return [];
    const monthYear = currentMonthYear();
    const { data: assigns } = await supabase.from('allocation_assignments').select('donee_id, month_year').eq('donor_id', user.id).order('month_year', { ascending: false });
    if (!assigns || assigns.length === 0) return [];

    const monthsSupported = new Map<string, Set<string>>();
    for (const a of assigns) {
      if (!monthsSupported.has(a.donee_id)) monthsSupported.set(a.donee_id, new Set());
      monthsSupported.get(a.donee_id)!.add(a.month_year);
    }
    const doneeIds = [...monthsSupported].filter(([, months]) => months.size >= 2).map(([id]) => id);
    if (doneeIds.length === 0) return [];

    const { data: doneesData } = await supabase.from('donees').select('*').in('id', doneeIds);
    const { data: balances } = await supabase.from('monthly_donee_balances').select('donee_id, allocated_paisa, spent_paisa').eq('month_year', monthYear).in('donee_id', doneeIds);
    const balMap = new Map((balances || []).map(b => [b.donee_id, b]));

    const families: DonorFamily[] = [];
    for (const donee of doneesData || []) {
      const { data: history } = await supabase.from('payout_requests').select('id, created_at, amount, status, shopkeepers(shop_name)').eq('donee_id', donee.id).order('created_at', { ascending: false }).limit(20);
      const bal = balMap.get(donee.id);
      families.push({
        donee_id: donee.id, full_name: donee.full_name,
        masked_name: donee.consent_to_share ? donee.full_name : `Family #${donee.id.slice(-4).toUpperCase()}`,
        photo_url: donee.consent_to_share ? donee.photo_url : undefined,
        area: donee.area, family_size: donee.family_size,
        story: donee.consent_to_share ? donee.story : undefined,
        consent_to_share: donee.consent_to_share || false,
        months_supported: monthsSupported.get(donee.id)?.size || 0,
        current_month: { allocated_paisa: bal?.allocated_paisa || 0, spent_paisa: bal?.spent_paisa || 0, remaining_paisa: (bal?.allocated_paisa || 0) - (bal?.spent_paisa || 0) },
        payout_history: ((history || []) as any[]).map(p => ({ id: p.id, created_at: p.created_at, amount: p.amount, shop_name: p.shopkeepers?.shop_name || '', status: p.status }))
      });
    }
    return families;
  };

  const getDonorTransactionsV2 = async (monthYear?: string, doneeId?: string): Promise<DonorTransactionV2[]> => {
    if (!user || user.role !== 'donor') return [];
    const settings = await getSettings();
    const taxRate = settings.tax_rate_pct / 100;
    let assignQuery = supabase.from('allocation_assignments').select('donee_id').eq('donor_id', user.id);
    if (monthYear) assignQuery = assignQuery.eq('month_year', monthYear);
    const { data: assigns } = await assignQuery;
    if (!assigns || assigns.length === 0) return [];

    let doneeIds = [...new Set(assigns.map(a => a.donee_id))];
    if (doneeId) doneeIds = doneeIds.filter(id => id === doneeId);

    let prQuery = supabase.from('payout_requests').select('*, donees(full_name), shopkeepers(shop_name, area)').in('donee_id', doneeIds).order('created_at', { ascending: false });
    if (monthYear) prQuery = prQuery.eq('month_year', monthYear);
    const { data: payouts } = await prQuery;

    return ((payouts || []) as any[]).map(p => {
      const amountPaisa = Math.round(p.amount * 100);
      const taxP = Math.round(amountPaisa * taxRate);
      return { id: p.id, created_at: p.created_at, donee_name: p.donees?.full_name || '', shop_name: p.shopkeepers?.shop_name || '', shop_area: p.shopkeepers?.area, amount_paisa: amountPaisa, tax_paisa: taxP, total_charged_paisa: amountPaisa + taxP, status: p.status, month_year: p.month_year };
    });
  };

  // ─── V2: Shopkeeper Security ─────────────────────────────────────────────

  const addShopkeeperSecurity = async (shopkeeperId: string, amountPaisa: number, eventDate: string, method: string, screenshotUrl?: string) => {
    if (!user || user.role !== 'admin') throw new Error('Admin only');
    await supabase.from('shopkeeper_security_ledger').insert({ shopkeeper_id: shopkeeperId, amount_paisa: amountPaisa, event_type: 'deposited', event_date: eventDate, method, screenshot_url: screenshotUrl || null, recorded_by: user.id });
    await supabase.from('notifications').insert({ profile_id: shopkeeperId, title: 'Security Amount Recorded', message: `Admin has recorded your security deposit of Rs ${(amountPaisa / 100).toLocaleString()}.`, metadata: { type: 'security_recorded', amount_paisa: amountPaisa } });
    await supabase.from('audit_logs').insert({ actor_id: user.id, action: 'RECORD_SHOPKEEPER_SECURITY', entity_type: 'shopkeeper_security_ledger', entity_id: shopkeeperId, details: { amount_paisa: amountPaisa, event_date: eventDate, method } });
  };

  const getShopkeeperSecurityStatus = async (shopkeeperId: string): Promise<ShopkeeperSecurityStatus | null> => {
    const { data } = await supabase.from('shopkeeper_security_ledger').select('*').eq('shopkeeper_id', shopkeeperId).order('event_date');
    if (!data || data.length === 0) return null;
    const { data: shop } = await supabase.from('shopkeepers').select('shop_name').eq('profile_id', shopkeeperId).single();
    const held = data.filter(r => r.event_type === 'deposited').reduce((s, r) => s + r.amount_paisa, 0) - data.filter(r => r.event_type === 'returned').reduce((s, r) => s + r.amount_paisa, 0);
    return { shopkeeper_id: shopkeeperId, shop_name: shop?.shop_name || '', amount_paisa: Math.max(0, held), event_date: data[0].event_date, method: data[0].method, is_returned: held <= 0, records: data as any };
  };

  // ─── Legacy functions ─────────────────────────────────────────────────────

  const addDonorCredit = async (donorId: string, amount: number, note?: string) => {
    await addDonorDeposit(donorId, amount * 100, new Date().toISOString().slice(0, 10), note);
  };

  const getAdminDonorWallets = async (): Promise<DonorWalletInfo[]> => {
    try {
      const { data: donors, error } = await supabase.from('profiles').select('id, full_name, phone').eq('role', 'donor').order('full_name');
      if (error) { console.error('getAdminDonorWallets profiles error:', error); return []; }
      if (!donors || donors.length === 0) return [];

      const results: DonorWalletInfo[] = [];
      for (const donor of donors) {
        try {
          const availPaisa = await getDonorAvailableBalance(donor.id);
          const { data: deposits } = await supabase.from('donor_deposits')
            .select('id, amount_paisa, deposit_date, reference_number, created_at')
            .eq('donor_id', donor.id)
            .order('created_at', { ascending: false });
          results.push({
            donor_id: donor.id,
            donor_name: donor.full_name,
            donor_phone: donor.phone,
            total_credited: (deposits || []).reduce((s, d) => s + Number(d.amount_paisa) / 100, 0),
            total_pledged: 0,
            available_balance: availPaisa / 100,
            credits: (deposits || []).map(d => ({ id: d.id, amount: Number(d.amount_paisa) / 100, note: d.reference_number || '', created_at: d.created_at })),
          });
        } catch (innerErr) {
          console.error('getAdminDonorWallets donor loop error:', donor.id, innerErr);
          results.push({ donor_id: donor.id, donor_name: donor.full_name, donor_phone: donor.phone, total_credited: 0, total_pledged: 0, available_balance: 0, credits: [] });
        }
      }
      return results;
    } catch (e) {
      console.error('getAdminDonorWallets threw:', e);
      return [];
    }
  };

  const getAdminPayoutRequests = async (statusFilter: PayoutStatus | 'all' = 'all'): Promise<PayoutRequest[]> => {
    try {
      let query = supabase.from('payout_requests')
        .select('*, shopkeeper_profile:profiles!payout_requests_shopkeeper_id_fkey(full_name), donees(full_name)')
        .order('created_at', { ascending: true });
      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      const { data, error } = await query;
      if (error) { console.error('getAdminPayoutRequests error:', error); return []; }

      const payoutIds = (data || []).map((r: any) => r.shopkeeper_id).filter(Boolean);
      let shopMap: Record<string, any> = {};
      if (payoutIds.length > 0) {
        const { data: shops } = await supabase.from('shopkeepers')
          .select('profile_id, shop_name, easypaisa_account, jazzcash_account, payment_info')
          .in('profile_id', [...new Set(payoutIds)]);
        for (const s of shops || []) shopMap[s.profile_id] = s;
      }

      return ((data as any) || []).map((r: any) => ({
        ...r,
        shopkeepers: shopMap[r.shopkeeper_id] || null,
        shopkeeper_name: r.shopkeeper_profile?.full_name || null,
      }));
    } catch (e) {
      console.error('getAdminPayoutRequests threw:', e);
      return [];
    }
  };

  const adminMarkPayoutPaid = async (requestId: string, proofUrl: string, transactionId: string, method: string) => {
    await adminMarkPayoutPaidV2(requestId, proofUrl, transactionId, method);
  };

  const adminRejectPayout = async (requestId: string, reason: string) => {
    if (!user || user.role !== 'admin') throw new Error('Admin only');
    const { data: req } = await supabase.from('payout_requests').select('shopkeeper_id, donee_id, amount, month_year').eq('id', requestId).single();
    await supabase.from('payout_requests').update({ status: 'rejected', rejection_reason: reason, updated_at: new Date().toISOString() }).eq('id', requestId);
    if (req?.donee_id) {
      const monthYear = req.month_year || currentMonthYear();
      const { data: bal } = await supabase.from('monthly_donee_balances').select('spent_paisa').eq('month_year', monthYear).eq('donee_id', req.donee_id).single();
      if (bal) await supabase.from('monthly_donee_balances').update({ spent_paisa: Math.max(0, bal.spent_paisa - Math.round(req.amount * 100)) }).eq('month_year', monthYear).eq('donee_id', req.donee_id);
    }
    if (req?.shopkeeper_id) await supabase.from('notifications').insert({ profile_id: req.shopkeeper_id, title: 'Payout Rejected', message: `Your payout of PKR ${req.amount} was rejected. Reason: ${reason}`, metadata: { type: 'payout_rejected', payout_id: requestId } });
    await supabase.from('audit_logs').insert({ actor_id: user.id, action: 'PAYOUT_REJECTED', entity_type: 'payout_requests', entity_id: requestId, details: { reason } });
  };

  const shopkeeperConfirmPayout = async (requestId: string) => {
    if (!user || user.role !== 'shopkeeper') throw new Error('Shopkeeper only');
    await supabase.from('payout_requests').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', requestId);
  };

  const shopkeeperDisputePayout = async (requestId: string, note: string) => {
    if (!user || user.role !== 'shopkeeper') throw new Error('Shopkeeper only');
    await supabase.from('payout_requests').update({ status: 'disputed', dispute_note: note, updated_at: new Date().toISOString() }).eq('id', requestId);
    const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin');
    for (const admin of admins || []) await supabase.from('notifications').insert({ profile_id: admin.id, title: 'Payout Disputed', message: `Shopkeeper disputed payout. Note: ${note}`, metadata: { type: 'payout_disputed', payout_id: requestId } });
  };

  const adminResolveDispute = async (requestId: string, action: 'complete' | 'reupload', proofUrl?: string, transactionId?: string) => {
    if (!user || user.role !== 'admin') throw new Error('Admin only');
    const newStatus: PayoutStatus = action === 'complete' ? 'completed' : 'paid_awaiting_confirmation';
    const updateData: any = { status: newStatus, updated_at: new Date().toISOString() };
    if (proofUrl) updateData.payment_proof_url = proofUrl;
    if (transactionId) updateData.transaction_id = transactionId;
    await supabase.from('payout_requests').update(updateData).eq('id', requestId);
    const { data: req } = await supabase.from('payout_requests').select('shopkeeper_id, amount').eq('id', requestId).single();
    if (req?.shopkeeper_id) await supabase.from('notifications').insert({ profile_id: req.shopkeeper_id, title: action === 'complete' ? 'Dispute Resolved' : 'New Payment Proof', message: action === 'complete' ? `Payout of PKR ${req.amount} resolved.` : 'New payment proof uploaded. Please confirm.', metadata: { type: 'dispute_resolved', payout_id: requestId } });
  };

  const getMyPayoutRequests = async (): Promise<PayoutRequest[]> => {
    if (!user || user.role !== 'shopkeeper') return [];
    const { data } = await supabase.from('payout_requests').select('*, donees(full_name)').eq('shopkeeper_id', user.id).order('created_at', { ascending: false });
    return (data as any) || [];
  };

  const getDonorPurchaseTransparency = async (): Promise<any[]> => {
    if (!user || user.role !== 'donor') return [];
    const monthYear = currentMonthYear();
    const { data: assigns } = await supabase.from('allocation_assignments').select('donee_id').eq('donor_id', user.id).eq('month_year', monthYear);
    if (!assigns || assigns.length === 0) return [];
    const doneeIds = assigns.map(a => a.donee_id);
    const { data } = await supabase.from('payout_requests').select('*, donees(full_name), shopkeepers(shop_name)').in('donee_id', doneeIds).order('created_at', { ascending: false });
    return data || [];
  };

  const createPledge = async (_doneeId: string, _amount: number) => { throw new Error('Pledges replaced by auto-allocation in v2.'); };
  const recordSpending = async (doneeQr: string, amount: number, _items: string) => { await recordSpendingV2(doneeQr, Math.round(amount * 100), ''); };
  const getDonorSpendingByShopkeeper = async (): Promise<ShopkeeperSpendingSummary[]> => { return []; };
  const getShopkeeperSpendingByDonor = async (): Promise<ShopkeeperDonorSummary[]> => { return []; };
  const submitShopkeeperPaymentProof = async () => {};
  const acknowledgeShopkeeperPayment = async (paymentId: string) => { await supabase.from('shopkeeper_payments').update({ status: 'acknowledged' }).eq('id', paymentId); };
  const getShopkeeperPayments = async (): Promise<ShopkeeperPayment[]> => { return []; };
  const getNotifications = async (): Promise<Notification[]> => { return notifications; };

  const markNotificationRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadNotificationCount(prev => Math.max(0, prev - 1));
  };

  const openEasyPaisa = async (phone: string, amount: number) => {
    try { await Browser.open({ url: `raast://p2p?alias=${phone}&amount=${amount}` }); } catch { await Browser.open({ url: `easypaisa://send_money?number=${phone}&amount=${amount}` }); }
  };
  const initiateJazzCash = async (phone: string, amount: number) => { await Browser.open({ url: `raast://p2p?alias=${phone}&amount=${amount}` }); };

  const registerDonee = async (data: Partial<Donee>) => {
    if (user?.role !== 'admin') return;
    const { error } = await supabase.from('donees').insert({ ...data, status: 'approved', funded_credit: 0, approved_at: new Date().toISOString() });
    if (error) throw error;
    await supabase.from('audit_logs').insert({ actor_id: user.id, action: 'REGISTER_DONEE', entity_type: 'donee', details: { name: data.full_name } });
    const { data: list } = await supabase.from('donees').select('*').eq('status', 'approved');
    if (list) setDonees(list);
  };

  const updateDonee = async (id: string, data: Partial<Donee>) => {
    if (user?.role !== 'admin') return;
    const { error } = await supabase.from('donees').update(data).eq('id', id);
    if (error) throw error;
    await supabase.from('audit_logs').insert({ actor_id: user.id, action: 'UPDATE_DONEE', entity_type: 'donee', entity_id: id, details: data });
    const { data: list } = await supabase.from('donees').select('*').eq('status', 'approved');
    if (list) setDonees(list);
  };

  const getAdminDonees = async () => {
    if (user?.role !== 'admin') return [];
    const { data } = await supabase.from('donees').select('*').order('created_at', { ascending: false });
    return data || [];
  };

  const getAdminShopkeepers = async () => {
    if (user?.role !== 'admin') return [];
    const { data } = await supabase.from('shopkeepers').select('*, profiles(full_name, phone)').order('created_at', { ascending: false });
    return (data as any) || [];
  };

  const registerShopkeeper = async (data: any) => {
    if (user?.role !== 'admin') return;
    const { data: existing } = await supabase.from('profiles').select('id').eq('phone', data.phone);
    let profileId: string;
    if (existing && existing.length > 0) {
      profileId = existing[0].id;
      await supabase.from('profiles').update({ full_name: data.full_name, role: 'shopkeeper' }).eq('id', profileId);
    } else {
      const { data: np, error } = await supabase.from('profiles').insert({ id: crypto.randomUUID(), full_name: data.full_name, phone: data.phone, role: 'shopkeeper', status: 'active' }).select('id').single();
      if (error) throw error;
      profileId = np.id;
    }
    const { error: shopError } = await supabase.from('shopkeepers').upsert({ profile_id: profileId, shop_name: data.shop_name, area: data.area, city: data.city, payment_info: data.payment_info, jazzcash_account: data.jazzcash_account || null, easypaisa_account: data.easypaisa_account || null, status: 'active' });
    if (shopError) throw shopError;
  };

  const updateShopkeeper = async (id: string, data: Partial<Shopkeeper>, profileData?: any) => {
    if (user?.role !== 'admin') return;
    if (Object.keys(data).length > 0) await supabase.from('shopkeepers').update(data).eq('profile_id', id);
    if (profileData && Object.keys(profileData).length > 0) await supabase.from('profiles').update(profileData).eq('id', id);
  };

  const getAdminDonors = async () => {
    const { data } = await supabase.from('profiles').select('id, full_name, phone, status, created_at').eq('role', 'donor').order('created_at', { ascending: false });
    return data || [];
  };

  const registerDonor = async (fullName: string, phone?: string): Promise<{ phone: string }> => {
    if (!user || user.role !== 'admin') throw new Error('Admin only');
    const generatedPhone = phone?.trim() || `03${String(Math.floor(Math.random() * 900000000 + 100000000))}`;
    const { error } = await supabase.from('profiles').insert({ id: crypto.randomUUID(), full_name: fullName, phone: generatedPhone, role: 'donor', status: 'active' });
    if (error) throw error;
    await supabase.from('audit_logs').insert({ actor_id: user.id, action: 'REGISTER_DONOR', entity_type: 'profiles', details: { full_name: fullName, phone: generatedPhone } });
    return { phone: generatedPhone };
  };

  const updateDonor = async (id: string, data: { full_name?: string; status?: string }) => {
    if (!user || user.role !== 'admin') throw new Error('Admin only');
    await supabase.from('profiles').update(data).eq('id', id);
  };

  const getAuditLogs = async () => {
    if (user?.role !== 'admin') return [];
    const { data } = await supabase.from('audit_logs').select('*, profiles(full_name)').order('created_at', { ascending: false }).limit(50);
    return data || [];
  };

  const getReports = async () => {
    const { data: deposits } = await supabase.from('donor_deposits').select('amount_paisa');
    const { data: spending } = await supabase.from('spending_records').select('amount');
    const { count: doneesCount } = await supabase.from('donees').select('*', { count: 'exact', head: true }).eq('status', 'approved');
    return { totalPledged: (deposits || []).reduce((s, d) => s + d.amount_paisa / 100, 0), totalSpending: (spending || []).reduce((s, r) => s + Number(r.amount), 0), activeDonees: doneesCount || 0 };
  };

  const getDonorTotalPaid = async (): Promise<number> => {
    if (!user || user.role !== 'donor') return 0;
    const { data } = await supabase.from('donor_ledger').select('amount_paisa').eq('donor_id', user.id).in('entry_type', ['spend', 'tax']);
    return (data || []).reduce((s, r) => s + Math.abs(r.amount_paisa) / 100, 0);
  };

  const getShopkeeperTotalReceived = async (): Promise<number> => {
    if (!user || user.role !== 'shopkeeper') return 0;
    const { data } = await supabase.from('payout_requests').select('amount').eq('shopkeeper_id', user.id).eq('status', 'completed');
    return (data || []).reduce((s, p) => s + Number(p.amount), 0);
  };

  const getDonorAnalytics = async (): Promise<DonorAnalytics> => ({ total_pledged: 0, total_consumed: 0, total_remaining: 0, by_week: [], by_month: [], by_shopkeeper: [], by_donee: [] });
  const getShopkeeperAnalytics = async (): Promise<ShopkeeperAnalytics> => ({ total_distributed: 0, total_received: 0, top_donees: [], top_donors: [], by_week: [], by_month: [] });
  const getAdminAnalytics = async (): Promise<AdminAnalytics> => {
    const empty: AdminAnalytics = { total_pledged: 0, total_spent: 0, total_paid: 0, active_donees: 0, active_shopkeepers: 0, active_donors: 0, by_week: [], by_month: [], top_donors: [], top_shopkeepers: [], top_donees: [] };
    if (!user || user.role !== 'admin') return empty;
    const { data: deposits } = await supabase.from('donor_deposits').select('amount_paisa');
    const { data: spending } = await supabase.from('spending_records').select('amount');
    const { count: dC } = await supabase.from('donees').select('*', { count: 'exact', head: true }).eq('status', 'approved');
    const { count: sC } = await supabase.from('shopkeepers').select('*', { count: 'exact', head: true }).eq('status', 'active');
    const { count: drC } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'donor');
    return { ...empty, total_pledged: (deposits || []).reduce((s, d) => s + d.amount_paisa / 100, 0), total_spent: (spending || []).reduce((s, r) => s + Number(r.amount), 0), active_donees: dC || 0, active_shopkeepers: sC || 0, active_donors: drC || 0 };
  };

  const exportMyRecords = async () => {
    if (!user) return;
    if (user.role === 'donor') {
      const txns = await getDonorTransactionsV2();
      await shareCsv(`haqdaar-donor-${Date.now()}.csv`, toCsv(txns.map(t => ({ date: t.created_at, donee: t.donee_name, shop: t.shop_name, amount_rs: t.amount_paisa / 100, tax_rs: t.tax_paisa / 100, total_rs: t.total_charged_paisa / 100, status: t.status }))));
      return;
    }
    if (user.role === 'shopkeeper') {
      const { data } = await supabase.from('payout_requests').select('*, donees(full_name)').eq('shopkeeper_id', user.id).order('created_at', { ascending: false });
      await shareCsv(`haqdaar-shopkeeper-${Date.now()}.csv`, toCsv((data || []).map((r: any) => ({ date: r.created_at, donee: r.donees?.full_name, amount_rs: r.amount, status: r.status }))));
    }
  };

  const seedDatabase = async () => {};

  return (
    <AuthContext.Provider value={{
      user, login, logout, isLoading, donees, myPledges, notifications, unreadNotificationCount,
      createPledge, getDonorSpendingByShopkeeper, getShopkeeperSpendingByDonor, submitShopkeeperPaymentProof, getShopkeeperPayments, acknowledgeShopkeeperPayment, getNotifications, markNotificationRead, recordSpending, openEasyPaisa, initiateJazzCash, seedDatabase,
      registerDonee, updateDonee, getAdminDonees, getAdminShopkeepers, registerShopkeeper, updateShopkeeper, getAdminDonors, registerDonor, updateDonor, getAuditLogs, getReports, getDonorTotalPaid, getShopkeeperTotalReceived, getDonorAnalytics, getShopkeeperAnalytics, getAdminAnalytics, exportMyRecords,
      isLocalFallback, error, donorWalletBalance, addDonorCredit, getAdminDonorWallets,
      getAdminPayoutRequests, adminMarkPayoutPaid, adminRejectPayout, shopkeeperConfirmPayout, shopkeeperDisputePayout, adminResolveDispute, getMyPayoutRequests, getDonorPurchaseTransparency,
      getSettings, updateSetting, addDonorDeposit, getDonorAvailableBalance, previewAllocation, runMonthlyAllocation, performMonthClose, getDonorImpact, getDonorFamilies, getDonorTransactionsV2, recordSpendingV2, adminMarkPayoutPaidV2, createInvoice, getInvoice, getAdminAllocations, getAdminDeposits, addShopkeeperSecurity, getShopkeeperSecurityStatus, getInvoiceCategories,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
