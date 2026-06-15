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

export interface Shopkeeper {
  profile_id: string;
  shop_name: string;
  area?: string;
  city?: string;
  payment_info?: string;
  status: 'active' | 'pending' | 'blocked';
  profiles?: {
    full_name: string;
    phone: string;
  };
}

interface AuthContextType {
  user: User | null;
  login: (phone: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  donees: Donee[];
  myDonations: DonationRecord[];
  spendingUpdates: any[]; // Added this
  submitDonationProof: (doneeId: string, amount: number, ref: string, imageUrl?: string) => Promise<void>;
  verifyDonation: (recordId: string, status: 'verified' | 'rejected') => Promise<void>;
  recordSpending: (doneeQr: string, amount: number, items: string) => Promise<void>;
  seedDatabase: () => Promise<void>;
  openEasyPaisa: (phone: string, amount: number) => void;
  initiateJazzCash: (phone: string, amount: number) => void;
  registerDonee: (data: Partial<Donee>) => Promise<void>;
  updateDonee: (id: string, data: Partial<Donee>) => Promise<void>;
  getAdminDonees: () => Promise<Donee[]>;
  getAdminShopkeepers: () => Promise<Shopkeeper[]>;
  registerShopkeeper: (data: any) => Promise<void>;
  updateShopkeeper: (id: string, data: Partial<Shopkeeper>, profileData?: any) => Promise<void>;
  getSettlementData: () => Promise<any[]>;
  initiateSettlement: (shopId: string) => Promise<void>;
  reviewSpendingRecord: (recordId: string, status: 'verified' | 'rejected', note?: string) => Promise<void>;
  getAuditLogs: () => Promise<any[]>;
  getReports: () => Promise<any>;
  getDonorImpactRecords: () => Promise<any[]>;
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
  const [spendingUpdates, setSpendingUpdates] = useState<any[]>([]); // Added this
  const [isLocalFallback, setIsLocalFallback] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      const savedUser = localStorage.getItem('haqdaar_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);

        // Background check: ensure profile exists in Supabase to prevent FK errors
        const { data } = await supabase.from('profiles').select('id').eq('id', parsed.id).single();
        if (!data) {
          console.log("Profile missing in Supabase, attempting re-sync...");
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
      const { data, error } = await supabase.from('donees').select('*').eq('status', 'approved');
      if (data) setDonees(data);
    };

    const fetchMyDonations = async () => {
      if (user.role !== 'donor') return;
      const { data } = await supabase.from('donation_records').select('*').eq('donor_id', user.id);
      if (data) setMyDonations(data);
    };

    const fetchSpendingUpdates = async () => {
      if (user.role !== 'donor') return;

      // 1. Find which donees this donor supported
      const { data: donations } = await supabase
        .from('donation_records')
        .select('donee_id')
        .eq('donor_id', user.id)
        .eq('status', 'verified');

      if (!donations || donations.length === 0) {
        setSpendingUpdates([]);
        return;
      }
      const ids = [...new Set(donations.map(d => d.donee_id))];

      // 2. Fetch spending for those donees
      const { data: spending } = await supabase
        .from('spending_records')
        .select('*, donees(full_name)')
        .in('donee_id', ids)
        .order('created_at', { ascending: false });

      if (spending) setSpendingUpdates(spending);

      // REAL-TIME: Listen for new spending records
      const channel = supabase
        .channel('donor_impact')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'spending_records' }, payload => {
          if (ids.includes(payload.new.donee_id)) fetchSpendingUpdates();
        })
        .subscribe();
    };

    fetchDonees();
    fetchMyDonations();
    fetchSpendingUpdates();
  }, [user]);

  const login = async (phone: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Check if profile exists
      let { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('phone', phone)
        .single();

      // 2. If not in DB, check if it's a LOCAL TEST USER
      if (!profile) {
        const local = LOCAL_USERS.find(u => u.phone === phone);
        if (local) {
          // AUTO-SYNC: Create the profile in Supabase immediately
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
          console.log("Auto-synced local user to Supabase:", phone);
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

  const submitDonationProof = async (doneeId: string, amount: number, ref: string, imageUrl?: string) => {
    if (!user) {
      alert("No user logged in!");
      return;
    }

    // 1. Ensure Profile exists in Supabase (Final safety check for Foreign Key)
    const { data: profileCheck } = await supabase.from('profiles').select('id').eq('id', user.id).single();
    if (!profileCheck) {
      console.log("Creating missing profile for donor before donation...");
      await supabase.from('profiles').insert({
        id: user.id,
        full_name: user.name,
        phone: user.phone,
        role: user.role,
        status: 'active'
      });
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

    // Smart Logging: Only send actor_id if it's a valid UUID
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

    console.log("Starting Shopkeeper Registration for:", data.phone);

    // 1. First, check if the profile exists using the phone number
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone', data.phone);

    if (fetchError) {
      console.error("Fetch error:", fetchError);
      throw new Error("Database check failed: " + fetchError.message);
    }

    let profileId;

    if (existingProfile && existingProfile.length > 0) {
      // Profile exists! Use that ID and update the role
      profileId = existingProfile[0].id;
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ full_name: data.full_name, role: 'shopkeeper' })
        .eq('id', profileId);

      if (updateErr) throw updateErr;
      console.log("Updated existing profile ID:", profileId);
    } else {
      // Profile does NOT exist. Create a fresh one.
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

      if (insertError) {
        console.error("Insert error:", insertError);
        throw insertError;
      }
      profileId = newProfile.id;
      console.log("Created fresh profile ID:", profileId);
    }

    // 2. Now handle the Shopkeepers table (Upsert links the profile ID)
    const { error: shopError } = await supabase
      .from('shopkeepers')
      .upsert({
        profile_id: profileId,
        shop_name: data.shop_name,
        area: data.area,
        city: data.city,
        payment_info: data.payment_info,
        status: 'active'
      });

    if (shopError) {
      console.error("Shopkeeper table error:", shopError);
      throw shopError;
    }

    console.log("Shopkeeper Registration Complete!");
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

  const getDonorImpactRecords = async () => {
    if (user?.role !== 'donor') return [];

    // 1. Get all verified donations by this donor
    const { data: verifiedDonations } = await supabase
      .from('donation_records')
      .select('donee_id')
      .eq('donor_id', user.id)
      .eq('status', 'verified');

    if (!verifiedDonations || verifiedDonations.length === 0) return [];

    const supportedDoneeIds = [...new Set(verifiedDonations.map(d => d.donee_id))];

    // 2. Get spending records for these donees
    const { data: spending } = await supabase
      .from('spending_records')
      .select('*, donees(full_name)')
      .in('donee_id', supportedDoneeIds)
      .order('created_at', { ascending: false });

    return spending || [];
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
      spendingUpdates,
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
      getDonorImpactRecords,
      initiateJazzCash,
      updateDonee,
      getAdminDonees,
      getAdminShopkeepers,
      registerShopkeeper,
      updateShopkeeper,
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
