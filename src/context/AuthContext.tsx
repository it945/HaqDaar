import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Browser } from '@capacitor/browser';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

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
  payment_status: 'unpaid' | 'paid';
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
  profiles?: {
    full_name: string;
    phone: string;
  };
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Local testing data
const LOCAL_USERS: User[] = [
  { id: '00000000-0000-0000-0000-000000000000', name: 'Admin User', role: 'admin', status: 'active', phone: '03000000000' },
  { id: '00000000-0000-0000-0000-000000000001', name: 'Haris Donor', role: 'donor', status: 'active', phone: '03001111111' },
  { id: '00000000-0000-0000-0000-000000000002', name: 'Ahmed Store', role: 'shopkeeper', status: 'active', phone: '03002222222' }
];

// ISO week label, e.g. "2026-W24"
function weekLabel(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function monthLabel(date: Date): string {
  return date.toISOString().slice(0, 7); // YYYY-MM
}

// Buckets a list of { date, pledged, consumed } deltas into sorted trend points by period.
function bucketTrend(
  entries: { date: string; pledged?: number; consumed?: number }[],
  granularity: 'week' | 'month'
): TrendPoint[] {
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
  for (const row of rows) {
    lines.push(headers.map(h => csvEscape(row[h])).join(','));
  }
  return lines.join('\n');
}

async function shareCsv(filename: string, csv: string) {
  const result = await Filesystem.writeFile({
    path: filename,
    data: csv,
    directory: Directory.Cache,
    encoding: Encoding.UTF8
  });
  await Share.share({ title: 'HaqDaar Export', url: result.uri });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [donees, setDonees] = useState<Donee[]>([]);
  const [myPledges, setMyPledges] = useState<PledgeRecord[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [isLocalFallback, setIsLocalFallback] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      const savedUser = localStorage.getItem('haqdaar_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);

        const { data } = await supabase.from('profiles').select('id').eq('id', parsed.id).single();
        if (!data) {
          await supabase.from('profiles').insert({
            id: parsed.id,
            full_name: parsed.full_name || parsed.name,
            phone: parsed.phone,
            role: parsed.role,
            status: 'active'
          });
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  // Sync data based on role
  useEffect(() => {
    if (!user) return;

    const fetchDonees = async () => {
      const { data } = await supabase.from('donees').select('*').eq('status', 'approved');
      if (data) setDonees(data);
    };

    const fetchMyPledges = async () => {
      if (user.role !== 'donor') return;
      const { data } = await supabase
        .from('pledge_records')
        .select('*, donees(full_name)')
        .eq('donor_id', user.id)
        .order('created_at', { ascending: false });
      if (data) setMyPledges(data);
    };

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (data) {
        setNotifications(data);
        setUnreadNotificationCount(data.filter(n => !n.is_read).length);
      }
    };

    fetchDonees();
    fetchMyPledges();
    fetchNotifications();

    // Realtime: notifications
    const notifChannel = supabase
      .channel('user_notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `profile_id=eq.${user.id}` }, () => {
        fetchNotifications();
      })
      .subscribe();

    // Realtime: spending records for donors (when pledges are spent)
    let spendingChannel: any;
    if (user.role === 'donor') {
      spendingChannel = supabase
        .channel('donor_spending')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'spending_records' }, payload => {
          if (payload.new.donor_id === user.id) {
            fetchMyPledges();
            fetchNotifications();
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pledge_records' }, () => {
          fetchMyPledges();
        })
        .subscribe();
    }

    // Realtime: shopkeeper payments + new spending for shopkeepers.
    // Pulses fetchNotifications() (rather than directly mutating page-local state)
    // so any component reading `notifications` re-fetches its own view automatically.
    let paymentChannel: any;
    if (user.role === 'shopkeeper') {
      paymentChannel = supabase
        .channel('shopkeeper_payments_rt')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'shopkeeper_payments', filter: `shopkeeper_id=eq.${user.id}` }, () => {
          fetchNotifications();
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'spending_records', filter: `shopkeeper_id=eq.${user.id}` }, () => {
          fetchNotifications();
        })
        .subscribe();
    }

    return () => {
      supabase.removeChannel(notifChannel);
      if (spendingChannel) supabase.removeChannel(spendingChannel);
      if (paymentChannel) supabase.removeChannel(paymentChannel);
    };
  }, [user]);

  const login = async (phone: string) => {
    setIsLoading(true);
    setError(null);
    try {
      let { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('phone', phone)
        .single();

      if (!profile) {
        const local = LOCAL_USERS.find(u => u.phone === phone);
        if (local) {
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: local.id,
              full_name: local.name,
              phone: local.phone,
              role: local.role,
              status: 'active'
            })
            .select()
            .single();

          if (insertError) throw insertError;
          profile = newProfile;
        }
      }

      if (profile) {
        setUser(profile);
        localStorage.setItem('haqdaar_user', JSON.stringify(profile));
        setIsLocalFallback(false);
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

  const logout = () => {
    setUser(null);
    localStorage.removeItem('haqdaar_user');
  };

  const createPledge = async (doneeId: string, amount: number) => {
    if (!user || user.role !== 'donor') return;

    // Ensure profile exists
    const { data: profileCheck } = await supabase.from('profiles').select('id').eq('id', user.id).single();
    if (!profileCheck) {
      await supabase.from('profiles').insert({
        id: user.id,
        full_name: user.name,
        phone: user.phone,
        role: user.role,
        status: 'active'
      });
    }

    // Create pledge record
    const { error: pledgeError } = await supabase.from('pledge_records').insert({
      donor_id: user.id,
      donee_id: doneeId,
      amount,
      remaining_amount: amount,
      status: 'active'
    });

    if (pledgeError) throw pledgeError;

    // Increase donee funded_credit immediately (no admin approval)
    const { data: donee } = await supabase
      .from('donees')
      .select('funded_credit')
      .eq('id', doneeId)
      .single();

    if (donee) {
      const newCredit = (Number(donee.funded_credit) || 0) + amount;
      await supabase.from('donees').update({ funded_credit: newCredit }).eq('id', doneeId);
    }

    // Create notification for donor
    await supabase.from('notifications').insert({
      profile_id: user.id,
      title: 'Pledge Created',
      message: `You pledged PKR ${amount} for a donee. Credit is now available for spending.`,
      metadata: { type: 'pledge_created', donee_id: doneeId, amount }
    });

    // Audit log
    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      action: 'CREATE_PLEDGE',
      entity_type: 'pledge_record',
      entity_id: doneeId,
      details: { amount }
    });

    // Refresh state
    const { data: pledges } = await supabase
      .from('pledge_records')
      .select('*, donees(full_name)')
      .eq('donor_id', user.id)
      .order('created_at', { ascending: false });
    if (pledges) setMyPledges(pledges);

    const { data: doneesList } = await supabase.from('donees').select('*').eq('status', 'approved');
    if (doneesList) setDonees(doneesList);

    alert('Pledge created! Credit is now available for the donee at shopkeepers.');
  };

  const recordSpending = async (doneeQr: string, amount: number, items: string) => {
    if (user?.role !== 'shopkeeper') return;

    // 1. Find donee by QR
    const { data: donee } = await supabase
      .from('donees')
      .select('id, funded_credit, full_name')
      .eq('spending_qr_code', doneeQr)
      .single();

    if (!donee) throw new Error('Invalid Donee QR');
    if ((donee.funded_credit || 0) < amount) throw new Error('Insufficient credit in Donee account');

    // 2. FIFO pledge allocation: walk oldest active pledges for this donee
    const { data: activePledges } = await supabase
      .from('pledge_records')
      .select('*')
      .eq('donee_id', donee.id)
      .in('status', ['active', 'partially_spent'])
      .order('created_at', { ascending: true }); // oldest first (FIFO)

    if (!activePledges || activePledges.length === 0) {
      throw new Error('No active pledges found for this donee');
    }

    let remainingToAllocate = amount;
    const allocations: { pledge_id: string; donor_id: string; amount: number }[] = [];
    let primaryDonorId: string | null = null;

    for (const pledge of activePledges) {
      if (remainingToAllocate <= 0) break;

      const available = Number(pledge.remaining_amount);
      const allocateAmount = Math.min(available, remainingToAllocate);

      if (allocateAmount > 0) {
        allocations.push({
          pledge_id: pledge.id,
          donor_id: pledge.donor_id,
          amount: allocateAmount
        });
        if (!primaryDonorId) primaryDonorId = pledge.donor_id;
        remainingToAllocate -= allocateAmount;
      }
    }

    if (remainingToAllocate > 0) {
      throw new Error('Insufficient pledged credit for this amount');
    }

    // 3. Create spending record
    const { data: spending, error: spendingError } = await supabase
      .from('spending_records')
      .insert({
        shopkeeper_id: user.id,
        donee_id: donee.id,
        donor_id: primaryDonorId,
        amount,
        items_description: items,
        payment_status: 'unpaid'
      })
      .select()
      .single();

    if (spendingError) throw spendingError;

    // 4. Create pledge_spending_links and update pledges
    for (const alloc of allocations) {
      const { error: linkError } = await supabase.from('pledge_spending_links').insert({
        pledge_id: alloc.pledge_id,
        spending_id: spending.id,
        donor_id: alloc.donor_id,
        amount: alloc.amount
      });
      if (linkError) console.error('pledge_spending_links insert failed:', linkError);

      // Update pledge remaining_amount and status
      const pledge = activePledges.find(p => p.id === alloc.pledge_id)!;
      const newRemaining = Number(pledge.remaining_amount) - alloc.amount;
      const newStatus = newRemaining <= 0 ? 'fully_spent' : 'partially_spent';

      const { error: pledgeUpdateError } = await supabase
        .from('pledge_records')
        .update({ remaining_amount: newRemaining, status: newStatus })
        .eq('id', alloc.pledge_id);
      if (pledgeUpdateError) console.error('pledge_records update failed:', pledgeUpdateError);
    }

    // 5. Deduct credit from donee
    const { error: deductError } = await supabase
      .from('donees')
      .update({ funded_credit: donee.funded_credit - amount })
      .eq('id', donee.id);
    if (deductError) console.error('donee credit deduct failed:', deductError);

    // 6. Notify donor(s)
    const uniqueDonors = [...new Set(allocations.map(a => a.donor_id))];
    for (const donorId of uniqueDonors) {
      const donorAlloc = allocations.filter(a => a.donor_id === donorId).reduce((s, a) => s + a.amount, 0);
      const { error: notifError } = await supabase.from('notifications').insert({
        profile_id: donorId,
        title: 'Goods Released',
        message: `PKR ${donorAlloc} of your pledge was used for ${donee.full_name}: ${items}`,
        metadata: { type: 'spending_recorded', spending_id: spending.id, amount: donorAlloc }
      });
      if (notifError) console.error('notification insert failed:', notifError);
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      action: 'RECORD_SPENDING',
      entity_type: 'donee',
      entity_id: donee.id,
      details: { amount, items, allocations: allocations.map(a => ({ donor_id: a.donor_id, amount: a.amount })) }
    });
  };

  const getDonorSpendingByShopkeeper = async (): Promise<ShopkeeperSpendingSummary[]> => {
    if (!user || user.role !== 'donor') return [];

    // Get all spending linked to this donor's pledges via pledge_spending_links
    const { data: links, error: linksError } = await supabase
      .from('pledge_spending_links')
      .select('spending_id, amount')
      .eq('donor_id', user.id);

    console.log('[PaymentsDue] pledge_spending_links for donor:', { links, linksError, donor_id: user.id });

    if (!links || links.length === 0) return [];

    const spendingIds = [...new Set(links.map(l => l.spending_id))];

    // Get spending records
    const { data: spendings, error: spendingsError } = await supabase
      .from('spending_records')
      .select('*, donees(full_name)')
      .in('id', spendingIds)
      .eq('payment_status', 'unpaid')
      .order('created_at', { ascending: false });

    console.log('[PaymentsDue] spending_records:', { spendings, spendingsError, spendingIds });

    if (!spendings || spendings.length === 0) return [];

    // Group by shopkeeper
    const shopkeeperIds = [...new Set(spendings.map(s => s.shopkeeper_id))];

    // Get shopkeeper info
    const { data: shopkeepers } = await supabase
      .from('shopkeepers')
      .select('profile_id, shop_name, payment_info, jazzcash_account, easypaisa_account')
      .in('profile_id', shopkeeperIds);

    const shopMap = new Map((shopkeepers || []).map(s => [s.profile_id, s]));

    const summaries: ShopkeeperSpendingSummary[] = [];
    for (const shopId of shopkeeperIds) {
      const shopRecords = spendings.filter(s => s.shopkeeper_id === shopId);
      const shop = shopMap.get(shopId);
      summaries.push({
        shopkeeper_id: shopId,
        shop_name: shop?.shop_name || 'Unknown Shop',
        payment_info: shop?.payment_info,
        jazzcash_account: shop?.jazzcash_account,
        easypaisa_account: shop?.easypaisa_account,
        total_unpaid: shopRecords.reduce((sum, r) => sum + Number(r.amount), 0),
        spending_records: shopRecords
      });
    }

    return summaries;
  };

  const getShopkeeperSpendingByDonor = async (): Promise<ShopkeeperDonorSummary[]> => {
    if (!user || user.role !== 'shopkeeper') return [];

    const { data: spendings, error: spendingsError } = await supabase
      .from('spending_records')
      .select('*, donees(full_name), profiles!spending_records_donor_id_fkey(full_name, phone)')
      .eq('shopkeeper_id', user.id)
      .order('created_at', { ascending: false });

    if (spendingsError) console.error('getShopkeeperSpendingByDonor failed:', spendingsError);
    if (!spendings || spendings.length === 0) return [];

    const donorIds = [...new Set(spendings.map((s: any) => s.donor_id).filter(Boolean))];

    const summaries: ShopkeeperDonorSummary[] = [];
    for (const donorId of donorIds) {
      const records = spendings.filter((s: any) => s.donor_id === donorId);
      const donorProfile = (records[0] as any)?.profiles;
      summaries.push({
        donor_id: donorId as string,
        donor_name: donorProfile?.full_name || 'Unknown Donor',
        donor_phone: donorProfile?.phone,
        total_amount: records.reduce((sum, r: any) => sum + Number(r.amount), 0),
        total_unpaid: records.filter((r: any) => r.payment_status === 'unpaid').reduce((sum, r: any) => sum + Number(r.amount), 0),
        spending_records: records as any
      });
    }

    return summaries;
  };

  const submitShopkeeperPaymentProof = async (shopkeeperId: string, amount: number, spendingIds: string[], imageUrl: string) => {
    if (!user || user.role !== 'donor') return;

    // Create shopkeeper_payments record
    const { error: payError } = await supabase.from('shopkeeper_payments').insert({
      donor_id: user.id,
      shopkeeper_id: shopkeeperId,
      amount,
      proof_screenshot_url: imageUrl,
      status: 'submitted',
      spending_record_ids: spendingIds
    });

    if (payError) throw payError;

    // Mark spending records as paid
    for (const id of spendingIds) {
      await supabase
        .from('spending_records')
        .update({ payment_status: 'paid' })
        .eq('id', id);
    }

    // Notify shopkeeper
    await supabase.from('notifications').insert({
      profile_id: shopkeeperId,
      title: 'Payment Received',
      message: `Donor sent PKR ${amount} payment proof. Check your Payments section.`,
      metadata: { type: 'payment_proof_submitted', amount, donor_id: user.id }
    });

    // Audit log
    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      action: 'SUBMIT_SHOPKEEPER_PAYMENT',
      entity_type: 'shopkeeper_payment',
      details: { shopkeeper_id: shopkeeperId, amount, spending_ids: spendingIds }
    });

    alert('Payment proof submitted! The shopkeeper has been notified.');
  };

  const acknowledgeShopkeeperPayment = async (paymentId: string) => {
    if (!user || user.role !== 'shopkeeper') return;

    const { data: payment, error: fetchError } = await supabase
      .from('shopkeeper_payments')
      .select('donor_id, amount')
      .eq('id', paymentId)
      .single();
    if (fetchError) throw fetchError;

    const { error: updateError } = await supabase
      .from('shopkeeper_payments')
      .update({ status: 'acknowledged' })
      .eq('id', paymentId);
    if (updateError) throw updateError;

    if (payment?.donor_id) {
      await supabase.from('notifications').insert({
        profile_id: payment.donor_id,
        title: 'Payment Acknowledged',
        message: `The shopkeeper confirmed receipt of your PKR ${payment.amount} payment.`,
        metadata: { type: 'payment_acknowledged', payment_id: paymentId, amount: payment.amount }
      });
    }

    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      action: 'ACKNOWLEDGE_SHOPKEEPER_PAYMENT',
      entity_type: 'shopkeeper_payment',
      entity_id: paymentId,
      details: { amount: payment?.amount }
    });
  };

  const getShopkeeperPayments = async (): Promise<ShopkeeperPayment[]> => {
    if (!user) return [];

    const column = user.role === 'shopkeeper' ? 'shopkeeper_id' : 'donor_id';
    const { data } = await supabase
      .from('shopkeeper_payments')
      .select('*, profiles!shopkeeper_payments_donor_id_fkey(full_name)')
      .eq(column, user.id)
      .order('created_at', { ascending: false });

    return (data as any) || [];
  };

  const getNotifications = async (): Promise<Notification[]> => {
    if (!user) return [];
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    return data || [];
  };

  const markNotificationRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadNotificationCount(prev => Math.max(0, prev - 1));
  };

  const openEasyPaisa = async (phone: string, amount: number) => {
    const directPayLink = `raast://p2p?alias=${phone}&amount=${amount}`;
    const legacyLink = `easypaisa://send_money?number=${phone}&amount=${amount}`;

    try {
      await Browser.open({ url: directPayLink });
    } catch (e) {
      await Browser.open({ url: legacyLink });
    }

    setTimeout(async () => {
      if (document.visibilityState === 'visible') {
        await Browser.open({ url: "https://easypaisa.onelink.me/cw4d/q9y8ba5v" });
      }
    }, 3000);
  };

  const initiateJazzCash = async (phone: string, amount: number) => {
    const raastLink = `raast://p2p?alias=${phone}&amount=${amount}`;
    await Browser.open({ url: raastLink });
  };

  const registerDonee = async (data: Partial<Donee>) => {
    if (user?.role !== 'admin') return;
    const { error } = await supabase.from('donees').insert({
      ...data,
      status: 'approved',
      funded_credit: 0
    });
    if (error) throw error;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(user.id);

    await supabase.from('audit_logs').insert({
      actor_id: isUuid ? user.id : null,
      action: 'REGISTER_DONEE',
      entity_type: 'donee',
      details: { name: data.full_name }
    });

    const { data: list } = await supabase.from('donees').select('*').eq('status', 'approved');
    if (list) setDonees(list);
  };

  const updateDonee = async (id: string, data: Partial<Donee>) => {
    if (user?.role !== 'admin') return;
    const { error } = await supabase.from('donees').update(data).eq('id', id);
    if (error) throw error;

    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      action: 'UPDATE_DONEE',
      entity_type: 'donee',
      entity_id: id,
      details: data
    });

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
    const { data } = await supabase
      .from('shopkeepers')
      .select('*, profiles(full_name, phone)')
      .order('status', { ascending: true });
    return (data as any) || [];
  };

  const registerShopkeeper = async (data: any) => {
    if (user?.role !== 'admin') return;

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone', data.phone);

    let profileId;

    if (existingProfile && existingProfile.length > 0) {
      profileId = existingProfile[0].id;
      await supabase
        .from('profiles')
        .update({ full_name: data.full_name, role: 'shopkeeper' })
        .eq('id', profileId);
    } else {
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          full_name: data.full_name,
          phone: data.phone,
          role: 'shopkeeper',
          status: 'active'
        })
        .select('id')
        .single();

      if (insertError) throw insertError;
      profileId = newProfile.id;
    }

    const { error: shopError } = await supabase
      .from('shopkeepers')
      .upsert({
        profile_id: profileId,
        shop_name: data.shop_name,
        area: data.area,
        city: data.city,
        payment_info: data.payment_info,
        jazzcash_account: data.jazzcash_account || null,
        easypaisa_account: data.easypaisa_account || null,
        status: 'active'
      });

    if (shopError) throw shopError;
  };

  const updateShopkeeper = async (id: string, data: Partial<Shopkeeper>, profileData?: any) => {
    if (user?.role !== 'admin') return;

    if (Object.keys(data).length > 0) {
      const { error: shopError } = await supabase
        .from('shopkeepers')
        .update(data)
        .eq('profile_id', id);
      if (shopError) throw shopError;
    }

    if (profileData && Object.keys(profileData).length > 0) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', id);
      if (profileError) throw profileError;
    }
  };

  const getAuditLogs = async () => {
    if (user?.role !== 'admin') return [];
    const { data } = await supabase.from('audit_logs').select('*, profiles(full_name)').order('created_at', { ascending: false }).limit(50);
    return data || [];
  };

  const getReports = async () => {
    const { data: pledges } = await supabase.from('pledge_records').select('amount');
    const { data: spending } = await supabase.from('spending_records').select('amount');
    const { count: doneesCount } = await supabase.from('donees').select('*', { count: 'exact', head: true });

    return {
      totalPledged: pledges?.reduce((a, b) => a + Number(b.amount), 0) || 0,
      totalSpending: spending?.reduce((a, b) => a + Number(b.amount), 0) || 0,
      activeDonees: doneesCount || 0
    };
  };

  const getDonorTotalPaid = async (): Promise<number> => {
    if (!user || user.role !== 'donor') return 0;
    const { data } = await supabase
      .from('shopkeeper_payments')
      .select('amount')
      .eq('donor_id', user.id)
      .in('status', ['submitted', 'acknowledged']);
    return (data || []).reduce((s, p) => s + Number(p.amount), 0);
  };

  const getShopkeeperTotalReceived = async (): Promise<number> => {
    if (!user || user.role !== 'shopkeeper') return 0;
    const { data } = await supabase
      .from('shopkeeper_payments')
      .select('amount')
      .eq('shopkeeper_id', user.id)
      .in('status', ['submitted', 'acknowledged']);
    return (data || []).reduce((s, p) => s + Number(p.amount), 0);
  };

  const getDonorAnalytics = async (): Promise<DonorAnalytics> => {
    const empty: DonorAnalytics = { total_pledged: 0, total_consumed: 0, total_remaining: 0, by_week: [], by_month: [], by_shopkeeper: [], by_donee: [] };
    if (!user || user.role !== 'donor') return empty;

    const { data: pledges } = await supabase
      .from('pledge_records')
      .select('amount, remaining_amount, created_at, donee_id, donees(full_name)')
      .eq('donor_id', user.id);

    const { data: links } = await supabase
      .from('pledge_spending_links')
      .select('amount, created_at')
      .eq('donor_id', user.id);

    const pledgeRows = pledges || [];
    const linkRows = links || [];

    const total_pledged = pledgeRows.reduce((s, p) => s + Number(p.amount), 0);
    const total_remaining = pledgeRows.reduce((s, p) => s + Number(p.remaining_amount), 0);
    const total_consumed = total_pledged - total_remaining;

    const trendEntries = [
      ...pledgeRows.map(p => ({ date: p.created_at, pledged: Number(p.amount) })),
      ...linkRows.map(l => ({ date: l.created_at, consumed: Number(l.amount) }))
    ];

    const doneeMap = new Map<string, DoneeBreakdown>();
    for (const p of pledgeRows as any[]) {
      if (!doneeMap.has(p.donee_id)) {
        doneeMap.set(p.donee_id, { donee_id: p.donee_id, donee_name: p.donees?.full_name || 'Unknown', pledged: 0, consumed: 0 });
      }
      const entry = doneeMap.get(p.donee_id)!;
      entry.pledged += Number(p.amount);
      entry.consumed += Number(p.amount) - Number(p.remaining_amount);
    }

    const by_shopkeeper = await getDonorSpendingByShopkeeper();

    return {
      total_pledged,
      total_consumed,
      total_remaining,
      by_week: bucketTrend(trendEntries, 'week'),
      by_month: bucketTrend(trendEntries, 'month'),
      by_shopkeeper,
      by_donee: Array.from(doneeMap.values()).sort((a, b) => b.pledged - a.pledged)
    };
  };

  const getShopkeeperAnalytics = async (): Promise<ShopkeeperAnalytics> => {
    const empty: ShopkeeperAnalytics = { total_distributed: 0, total_received: 0, top_donees: [], top_donors: [], by_week: [], by_month: [] };
    if (!user || user.role !== 'shopkeeper') return empty;

    const { data: spendings } = await supabase
      .from('spending_records')
      .select('amount, created_at, donee_id, donees(full_name)')
      .eq('shopkeeper_id', user.id);

    const spendRows = (spendings || []) as any[];
    const total_distributed = spendRows.reduce((s, r) => s + Number(r.amount), 0);
    const total_received = await getShopkeeperTotalReceived();

    const doneeMap = new Map<string, RankedEntity>();
    for (const r of spendRows) {
      if (!doneeMap.has(r.donee_id)) doneeMap.set(r.donee_id, { id: r.donee_id, name: r.donees?.full_name || 'Unknown', amount: 0 });
      doneeMap.get(r.donee_id)!.amount += Number(r.amount);
    }
    const top_donees = Array.from(doneeMap.values()).sort((a, b) => b.amount - a.amount).slice(0, 5);

    const donorSummaries = await getShopkeeperSpendingByDonor();
    const top_donors = donorSummaries
      .map(d => ({ id: d.donor_id, name: d.donor_name, amount: d.total_amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const trendEntries = spendRows.map(r => ({ date: r.created_at, consumed: Number(r.amount) }));

    return {
      total_distributed,
      total_received,
      top_donees,
      top_donors,
      by_week: bucketTrend(trendEntries, 'week'),
      by_month: bucketTrend(trendEntries, 'month')
    };
  };

  const getAdminAnalytics = async (): Promise<AdminAnalytics> => {
    const empty: AdminAnalytics = { total_pledged: 0, total_spent: 0, total_paid: 0, active_donees: 0, active_shopkeepers: 0, active_donors: 0, by_week: [], by_month: [], top_donors: [], top_shopkeepers: [], top_donees: [] };
    if (!user || user.role !== 'admin') return empty;

    const { data: pledges } = await supabase
      .from('pledge_records')
      .select('amount, created_at, donor_id, profiles!pledge_records_donor_id_fkey(full_name)');
    const { data: spendings } = await supabase
      .from('spending_records')
      .select('amount, created_at, donee_id, shopkeeper_id, donees(full_name), profiles!spending_records_shopkeeper_id_fkey(full_name)');
    const { data: payments } = await supabase.from('shopkeeper_payments').select('amount');
    const { count: doneesCount } = await supabase.from('donees').select('*', { count: 'exact', head: true }).eq('status', 'approved');
    const { count: shopkeepersCount } = await supabase.from('shopkeepers').select('*', { count: 'exact', head: true }).eq('status', 'active');
    const { count: donorsCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'donor');

    const pledgeRows = (pledges || []) as any[];
    const spendRows = (spendings || []) as any[];
    const paymentRows = payments || [];

    const total_pledged = pledgeRows.reduce((s, p) => s + Number(p.amount), 0);
    const total_spent = spendRows.reduce((s, r) => s + Number(r.amount), 0);
    const total_paid = paymentRows.reduce((s, p) => s + Number(p.amount), 0);

    const trendEntries = [
      ...pledgeRows.map(p => ({ date: p.created_at, pledged: Number(p.amount) })),
      ...spendRows.map(r => ({ date: r.created_at, consumed: Number(r.amount) }))
    ];

    const donorMap = new Map<string, RankedEntity>();
    for (const p of pledgeRows) {
      if (!p.donor_id) continue;
      if (!donorMap.has(p.donor_id)) donorMap.set(p.donor_id, { id: p.donor_id, name: p.profiles?.full_name || 'Unknown', amount: 0 });
      donorMap.get(p.donor_id)!.amount += Number(p.amount);
    }

    const shopMap = new Map<string, RankedEntity>();
    const doneeMap = new Map<string, RankedEntity>();
    for (const r of spendRows) {
      if (r.shopkeeper_id) {
        if (!shopMap.has(r.shopkeeper_id)) shopMap.set(r.shopkeeper_id, { id: r.shopkeeper_id, name: r.profiles?.full_name || 'Unknown', amount: 0 });
        shopMap.get(r.shopkeeper_id)!.amount += Number(r.amount);
      }
      if (r.donee_id) {
        if (!doneeMap.has(r.donee_id)) doneeMap.set(r.donee_id, { id: r.donee_id, name: r.donees?.full_name || 'Unknown', amount: 0 });
        doneeMap.get(r.donee_id)!.amount += Number(r.amount);
      }
    }

    return {
      total_pledged,
      total_spent,
      total_paid,
      active_donees: doneesCount || 0,
      active_shopkeepers: shopkeepersCount || 0,
      active_donors: donorsCount || 0,
      by_week: bucketTrend(trendEntries, 'week'),
      by_month: bucketTrend(trendEntries, 'month'),
      top_donors: Array.from(donorMap.values()).sort((a, b) => b.amount - a.amount).slice(0, 5),
      top_shopkeepers: Array.from(shopMap.values()).sort((a, b) => b.amount - a.amount).slice(0, 5),
      top_donees: Array.from(doneeMap.values()).sort((a, b) => b.amount - a.amount).slice(0, 5)
    };
  };

  const exportMyRecords = async () => {
    if (!user) return;

    if (user.role === 'donor') {
      const { data: pledges } = await supabase
        .from('pledge_records')
        .select('created_at, amount, remaining_amount, status, donees(full_name)')
        .eq('donor_id', user.id)
        .order('created_at', { ascending: false });

      const { data: payments } = await supabase
        .from('shopkeeper_payments')
        .select('created_at, amount, status, profiles!shopkeeper_payments_shopkeeper_id_fkey(full_name)')
        .eq('donor_id', user.id)
        .order('created_at', { ascending: false });

      const rows = [
        ...(pledges || []).map((p: any) => ({ record_type: 'pledge', date: p.created_at, donee: p.donees?.full_name || '', amount: p.amount, remaining: p.remaining_amount, status: p.status })),
        ...(payments || []).map((p: any) => ({ record_type: 'payment_made', date: p.created_at, shopkeeper: p.profiles?.full_name || '', amount: p.amount, status: p.status }))
      ];

      await shareCsv(`haqdaar-donor-records-${Date.now()}.csv`, toCsv(rows));
      return;
    }

    if (user.role === 'shopkeeper') {
      const { data: spendings } = await supabase
        .from('spending_records')
        .select('created_at, amount, items_description, payment_status, donees(full_name), profiles!spending_records_donor_id_fkey(full_name)')
        .eq('shopkeeper_id', user.id)
        .order('created_at', { ascending: false });

      const { data: payments } = await supabase
        .from('shopkeeper_payments')
        .select('created_at, amount, status, profiles!shopkeeper_payments_donor_id_fkey(full_name)')
        .eq('shopkeeper_id', user.id)
        .order('created_at', { ascending: false });

      const rows = [
        ...(spendings || []).map((s: any) => ({ record_type: 'spending', date: s.created_at, donee: s.donees?.full_name || '', donor: s.profiles?.full_name || '', amount: s.amount, items: s.items_description, status: s.payment_status })),
        ...(payments || []).map((p: any) => ({ record_type: 'payment_received', date: p.created_at, donor: p.profiles?.full_name || '', amount: p.amount, status: p.status }))
      ];

      await shareCsv(`haqdaar-shopkeeper-records-${Date.now()}.csv`, toCsv(rows));
      return;
    }

    if (user.role === 'admin') {
      const { data: pledges } = await supabase
        .from('pledge_records')
        .select('created_at, amount, remaining_amount, status, donees(full_name), profiles!pledge_records_donor_id_fkey(full_name)');
      const { data: spendings } = await supabase
        .from('spending_records')
        .select('created_at, amount, items_description, payment_status, donees(full_name), profiles!spending_records_shopkeeper_id_fkey(full_name)');
      const { data: payments } = await supabase.from('shopkeeper_payments').select('created_at, amount, status');

      const rows = [
        ...(pledges || []).map((p: any) => ({ record_type: 'pledge', date: p.created_at, donor: p.profiles?.full_name || '', donee: p.donees?.full_name || '', amount: p.amount, remaining: p.remaining_amount, status: p.status })),
        ...(spendings || []).map((s: any) => ({ record_type: 'spending', date: s.created_at, donee: s.donees?.full_name || '', shopkeeper: s.profiles?.full_name || '', amount: s.amount, status: s.payment_status })),
        ...(payments || []).map((p: any) => ({ record_type: 'payment', date: p.created_at, amount: p.amount, status: p.status }))
      ];

      await shareCsv(`haqdaar-platform-records-${Date.now()}.csv`, toCsv(rows));
    }
  };

  const seedDatabase = async () => {
    try {
      for (const u of LOCAL_USERS) {
        await supabase.from('profiles').upsert({
          id: u.id,
          full_name: u.name,
          phone: u.phone,
          role: u.role,
          status: 'active'
        });

        if (u.role === 'shopkeeper') {
          await supabase.from('shopkeepers').upsert({
            profile_id: u.id,
            shop_name: u.name,
            payment_info: '03002222222',
            status: 'active'
          });
        }
      }

      // Seed donee
      const { data: doneeData } = await supabase.from('donees').upsert([{
        full_name: 'Amina Bibi',
        city: 'Karachi',
        area: 'Lyari',
        receiving_method: 'EasyPaisa',
        receiving_account_masked: '0300-XXXX123',
        spending_qr_code: 'DONEE-123',
        status: 'approved',
        funded_credit: 0
      }]).select();

      // Seed a pledge from the donor
      if (doneeData && doneeData.length > 0) {
        await supabase.from('pledge_records').upsert([{
          donor_id: '00000000-0000-0000-0000-000000000001',
          donee_id: doneeData[0].id,
          amount: 5000,
          remaining_amount: 5000,
          status: 'active'
        }]);

        // Update funded_credit to match pledge
        await supabase.from('donees').update({ funded_credit: 5000 }).eq('id', doneeData[0].id);
      }

      alert('Test data seeded!');
    } catch (err: any) {
      alert('Seeding failed: ' + err.message);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isLoading,
      donees,
      myPledges,
      notifications,
      unreadNotificationCount,
      createPledge,
      getDonorSpendingByShopkeeper,
      getShopkeeperSpendingByDonor,
      submitShopkeeperPaymentProof,
      getShopkeeperPayments,
      acknowledgeShopkeeperPayment,
      getNotifications,
      markNotificationRead,
      recordSpending,
      openEasyPaisa,
      initiateJazzCash,
      seedDatabase,
      registerDonee,
      updateDonee,
      getAdminDonees,
      getAdminShopkeepers,
      registerShopkeeper,
      updateShopkeeper,
      getAuditLogs,
      getReports,
      getDonorTotalPaid,
      getShopkeeperTotalReceived,
      getDonorAnalytics,
      getShopkeeperAnalytics,
      getAdminAnalytics,
      exportMyRecords,
      isLocalFallback,
      error
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
