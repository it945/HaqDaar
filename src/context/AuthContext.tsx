import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Browser } from '@capacitor/browser';

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

export interface DonationRecord {
  id: string;
  donor_id: string;
  donee_id: string;
  amount: number;
  status: 'pending_verification' | 'verified' | 'rejected';
  proof_screenshot_url?: string;
  transaction_reference?: string;
  created_at: string;
}

export interface SpendingRecord {
  id: string;
  shopkeeper_id: string;
  donee_id: string;
  amount: number;
  items_description: string;
  settlement_status: 'pending_settlement' | 'settled';
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  login: (phone: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  donees: Donee[];
  myDonations: DonationRecord[];
  submitDonationProof: (doneeId: string, amount: number, ref: string, imageUrl?: string) => Promise<void>;
  verifyDonation: (recordId: string, status: 'verified' | 'rejected') => Promise<void>;
  recordSpending: (doneeQr: string, amount: number, items: string) => Promise<void>;
  seedDatabase: () => Promise<void>;
  openEasyPaisa: (phone: string, amount: number) => void;
  initiateJazzCash: (phone: string, amount: number) => void;
  registerDonee: (data: Partial<Donee>) => Promise<void>;
  updateDonee: (id: string, data: Partial<Donee>) => Promise<void>;
  getAdminDonees: () => Promise<Donee[]>;
  getSettlementData: () => Promise<any[]>;
  initiateSettlement: (shopId: string) => Promise<void>;
  reviewSpendingRecord: (recordId: string, status: 'verified' | 'rejected', note?: string) => Promise<void>;
  getAuditLogs: () => Promise<any[]>;
  getReports: () => Promise<any>;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [donees, setDonees] = useState<Donee[]>([]);
  const [myDonations, setMyDonations] = useState<DonationRecord[]>([]);
  const [isLocalFallback, setIsLocalFallback] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('haqdaar_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  // Sync data based on role
  useEffect(() => {
    if (!user) return;

    const fetchDonees = async () => {
      const { data, error } = await supabase.from('donees').select('*').eq('status', 'approved');
      if (data) setDonees(data);
    };

    const fetchMyDonations = async () => {
      if (user.role !== 'donor') return;
      const { data } = await supabase.from('donation_records').select('*').eq('donor_id', user.id);
      if (data) setMyDonations(data);
    };

    fetchDonees();
    fetchMyDonations();
  }, [user]);

  const login = async (phone: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Automatic role lookup via phone number in profiles
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('phone', phone)
        .single();

      if (data) {
        setUser(data);
        localStorage.setItem('haqdaar_user', JSON.stringify(data));
      } else {
        // Fallback to local test users
        const local = LOCAL_USERS.find(u => u.phone === phone);
        if (local) {
          setUser(local);
          localStorage.setItem('haqdaar_user', JSON.stringify(local));
          setIsLocalFallback(true);
        } else {
          throw new Error('No account found for this phone number.');
        }
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

  const submitDonationProof = async (doneeId: string, amount: number, ref: string, imageUrl?: string) => {
    if (!user) {
      alert("No user logged in!");
      return;
    }

    console.log('Submitting proof:', { doneeId, amount, ref, imageSize: imageUrl?.length });

    const payload = {
      donor_id: user.id,
      donee_id: doneeId,
      amount,
      transaction_reference: ref,
      proof_screenshot_url: imageUrl,
      status: 'pending_verification'
    };

    const { error } = await supabase.from('donation_records').insert(payload);

    if (error) {
      console.error('Primary insert failed, trying fallback...', error);
      // Fallback: If proof_screenshot_url column is missing, pack it into transaction_reference
      if (error.message.includes('column "proof_screenshot_url" does not exist')) {
        const fallbackPayload = {
          donor_id: user.id,
          donee_id: doneeId,
          amount,
          transaction_reference: `IMG_DATA|${imageUrl}|${ref}`,
          status: 'pending_verification'
        };
        const { error: fallbackError } = await supabase.from('donation_records').insert(fallbackPayload);
        if (fallbackError) {
          alert("Fallback Save Failed: " + fallbackError.message);
          throw fallbackError;
        }
      } else {
        alert("Database Error: " + error.message);
        throw error;
      }
    }

    alert("Proof saved successfully!");

    // Refresh donations
    const { data } = await supabase.from('donation_records').select('*').eq('donor_id', user.id);
    if (data) setMyDonations(data);
  };

  const verifyDonation = async (recordId: string, status: 'verified' | 'rejected') => {
    if (user?.role !== 'admin') return;

    try {
      // 1. Get record to find amount and donee
      const { data: record, error: fetchError } = await supabase
        .from('donation_records')
        .select('amount, donee_id')
        .eq('id', recordId)
        .single();

      if (fetchError || !record) throw new Error('Could not find donation record.');

      // 2. Update record status
      const { error: updateError } = await supabase
        .from('donation_records')
        .update({ status })
        .eq('id', recordId);

      if (updateError) throw updateError;

      // 3. If verified, increase donee's funded_credit
      if (status === 'verified') {
        const { data: donee, error: doneeFetchError } = await supabase
          .from('donees')
          .select('funded_credit')
          .eq('id', record.donee_id)
          .single();

        if (doneeFetchError || !donee) throw new Error('Could not find donee to update credit.');

        const currentCredit = Number(donee.funded_credit) || 0;
        const donationAmount = Number(record.amount) || 0;
        const newCredit = currentCredit + donationAmount;

        const { error: doneeUpdateError } = await supabase
          .from('donees')
          .update({ funded_credit: newCredit })
          .eq('id', record.donee_id);

        if (doneeUpdateError) throw doneeUpdateError;
      }

      // Log Action
      await supabase.from('audit_logs').insert({
        actor_id: user.id,
        action: 'VERIFY_DONATION',
        entity_type: 'donation_record',
        entity_id: recordId,
        details: { status, amount: record.amount }
      });

      console.log('Verification successful:', recordId, status);
    } catch (err: any) {
      console.error('Verification failed:', err);
      alert('Verification Error: ' + err.message);
      throw err;
    }
  };

  const recordSpending = async (doneeQr: string, amount: number, items: string) => {
    if (user?.role !== 'shopkeeper') return;

    // 1. Find donee by QR
    const { data: donee } = await supabase
      .from('donees')
      .select('id, funded_credit')
      .eq('spending_qr_code', doneeQr)
      .single();

    if (!donee) throw new Error('Invalid Donee QR');
    if ((donee.funded_credit || 0) < amount) throw new Error('Insufficient credit in Donee account');

    // 2. Create spending record
    const { error: spendingError } = await supabase.from('spending_records').insert({
      shopkeeper_id: user.id,
      donee_id: donee.id,
      amount,
      items_description: items,
      settlement_status: 'pending_settlement'
    });

    if (spendingError) throw spendingError;

    // 3. Deduct credit from donee
    await supabase
      .from('donees')
      .update({ funded_credit: donee.funded_credit - amount })
      .eq('id', donee.id);

    // Log Action
    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      action: 'RECORD_SPENDING',
      entity_type: 'donee',
      entity_id: donee.id,
      details: { amount, items }
    });
  };

  const openEasyPaisa = async (phone: string, amount: number) => {
    // 2026 Raast Universal P2P Autofill Link
    const donee = donees.find(d => d.receiving_account_masked?.replace(/\D/g, '') === phone);
    const hasPayload = donee?.receiving_method && donee.receiving_method.startsWith('0002');

    // Level 2: Direct Autofill via official qr_pay scheme (EMVCo encrypted payload)
    // Level 1: Standard raast://p2p fallback
    const directPayLink = hasPayload
      ? `easypaisa://qr_pay?data=${encodeURIComponent(donee.receiving_method)}`
      : `raast://p2p?alias=${phone}&amount=${amount}`;

    const legacyLink = `easypaisa://send_money?number=${phone}&amount=${amount}`;

    // Capacitor Browser opens links in a more stable way for mobile
    // It prevents the "Task Switcher bounce" by explicitly handing off the URI
    try {
      await Browser.open({ url: directPayLink });
    } catch (e) {
      await Browser.open({ url: legacyLink });
    }

    // Secondary fallback to OneLink if app doesn't open
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

    // Log Action
    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      action: 'REGISTER_DONEE',
      entity_type: 'donee',
      details: { name: data.full_name }
    });

    // Refresh donees
    const { data: list } = await supabase.from('donees').select('*').eq('status', 'approved');
    if (list) setDonees(list);
  };

  const updateDonee = async (id: string, data: Partial<Donee>) => {
    if (user?.role !== 'admin') return;
    const { error } = await supabase.from('donees').update(data).eq('id', id);
    if (error) throw error;

    // Log Action
    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      action: 'UPDATE_DONEE',
      entity_type: 'donee',
      entity_id: id,
      details: data
    });

    // Refresh donees
    const { data: list } = await supabase.from('donees').select('*').eq('status', 'approved');
    if (list) setDonees(list);
  };

  const getAdminDonees = async () => {
    if (user?.role !== 'admin') return [];
    const { data } = await supabase.from('donees').select('*').order('created_at', { ascending: false });
    return data || [];
  };

  const getSettlementData = async () => {
    if (user?.role !== 'admin') return [];

    // Fetch all pending spending records grouped by shopkeeper
    const { data } = await supabase
      .from('spending_records')
      .select('*, profiles!spending_records_shopkeeper_id_fkey(full_name)')
      .eq('settlement_status', 'pending_settlement');

    return data || [];
  };

  const reviewSpendingRecord = async (recordId: string, status: 'verified' | 'rejected', note?: string) => {
    if (user?.role !== 'admin') return;
    const { error } = await supabase
      .from('spending_records')
      .update({ settlement_status: status === 'verified' ? 'settled' : 'pending_settlement', admin_note: note })
      .eq('id', recordId);

    if (error) throw error;
  };

  const getAuditLogs = async () => {
    if (user?.role !== 'admin') return [];
    const { data } = await supabase.from('audit_logs').select('*, profiles(full_name)').order('created_at', { ascending: false }).limit(50);
    return data || [];
  };

  const getReports = async () => {
    // Live reporting for Admin
    const { data: donations } = await supabase.from('donation_records').select('amount').eq('status', 'verified');
    const { data: spending } = await supabase.from('spending_records').select('amount');
    const { count: doneesCount } = await supabase.from('donees').select('*', { count: 'exact', head: true });

    return {
      totalDonations: donations?.reduce((a, b) => a + Number(b.amount), 0) || 0,
      totalSpending: spending?.reduce((a, b) => a + Number(b.amount), 0) || 0,
      activeDonees: doneesCount || 0
    };
  };

  const initiateSettlement = async (shopId: string) => {
    if (user?.role !== 'admin') return;

    // 1. Create settlement record
    const { data: records } = await supabase
      .from('spending_records')
      .select('amount')
      .eq('shopkeeper_id', shopId)
      .eq('settlement_status', 'pending_settlement');

    const total = records?.reduce((acc, r) => acc + r.amount, 0) || 0;

    await supabase.from('settlement_records').insert({
      shopkeeper_id: shopId,
      amount: total,
      status: 'settled',
      settled_at: new Date().toISOString(),
      admin_id: user.id
    });

    // 2. Mark all spending as settled
    const { error: updateError } = await supabase
      .from('spending_records')
      .update({ settlement_status: 'settled' })
      .eq('shopkeeper_id', shopId)
      .eq('settlement_status', 'pending_settlement');

    if (updateError) throw updateError;

    // Log Action
    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      action: 'INITIATE_SETTLEMENT',
      entity_type: 'shopkeeper',
      entity_id: shopId,
      details: { amount: total }
    });

    alert('Settlement processed successfully!');
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
            status: 'active'
          });
        }
      }
      await supabase.from('donees').upsert([{
        full_name: 'Amina Bibi',
        city: 'Karachi',
        area: 'Lyari',
        receiving_method: 'EasyPaisa',
        receiving_account_masked: '0300-XXXX123',
        spending_qr_code: 'DONEE-123',
        status: 'approved',
        funded_credit: 5000
      }]);
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
      myDonations,
      submitDonationProof,
      verifyDonation,
      recordSpending,
      seedDatabase,
      openEasyPaisa,
      registerDonee,
      getSettlementData,
      initiateSettlement,
      reviewSpendingRecord,
      getAuditLogs,
      getReports,
      initiateJazzCash,
      updateDonee,
      getAdminDonees,
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
