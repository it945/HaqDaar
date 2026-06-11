import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  orderBy,
  limit,
  increment,
  enableIndexedDbPersistence,
  terminate,
  clearIndexedDbPersistence
} from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../lib/firebase';

export interface User {
  id: string;
  name: string;
  role: 'donor' | 'recipient' | 'admin';
  balance: number;
  isVerified: boolean;
  cnic?: string;
  phone?: string;
}

export interface TrustAccount {
  balance: number;
  totalDonations: number;
  totalDisbursements: number;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  title: string;
  type: 'donation' | 'disbursement' | 'withdrawal';
  status: 'completed' | 'pending' | 'cancelled';
  icon: string;
  createdAt: any;
  date?: string;
}

interface AuthContextType {
  user: User | null;
  trustAccount: TrustAccount;
  login: (cnic: string, phone: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  transactions: Transaction[];
  isLoadingTxs: boolean;
  donateToTrust: (amount: number) => Promise<void>;
  allocateAid: (recipientId: string, amount: number) => Promise<void>;
  requestWithdrawal: (amount: number) => Promise<void>;
  seedDatabase: () => Promise<void>;
  isLocalFallback: boolean;
  firestoreError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_TEST_USERS: User[] = [
  {
    id: 'test_donor',
    name: 'Haris Zafar',
    cnic: '11111-1111111-1',
    phone: '03000000000',
    role: 'donor',
    balance: 50000,
    isVerified: true
  },
  {
    id: 'test_recipient',
    name: 'Saifullah Al-Fassaad',
    cnic: '12345-6789012-3',
    phone: '03001234567',
    role: 'recipient',
    balance: 15000,
    isVerified: true
  },
  {
    id: 'test_admin',
    name: 'System Admin',
    cnic: '00000-0000000-0',
    phone: '03009999999',
    role: 'admin',
    balance: 0,
    isVerified: true
  }
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [trustAccount, setTrustAccount] = useState<TrustAccount>({ balance: 0, totalDonations: 0, totalDisbursements: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingTxs, setIsLoadingTxs] = useState(true);
  const [isLocalFallback, setIsLocalFallback] = useState(false);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);
  const [activeUserId, setActiveUserId] = useState<string | null>(() => {
    const saved = localStorage.getItem('haqdaar_user');
    if (saved) {
      try {
        return JSON.parse(saved).id;
      } catch {
        return null;
      }
    }
    return null;
  });

  // Anonymous Auth to ensure Firestore access
  useEffect(() => {
    console.log("Checking Firebase Auth status...");
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        console.log("No active session, attempting anonymous sign-in...");
        signInAnonymously(auth).then((cred) => {
          console.log("Anonymous Sign-In successful:", cred.user.uid);
        }).catch(err => {
          console.error("Firebase Anonymous Auth Failed:", err);
          setFirestoreError(`Auth Error: ${err.message}`);
        });
      } else {
        console.log("Firebase Auth Session Active:", user.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  // Real-time Trust Pool tracking
  useEffect(() => {
    // Check localStorage immediately on mount for offline-first feel
    const savedTrust = localStorage.getItem('haqdaar_trust');
    if (savedTrust) setTrustAccount(JSON.parse(savedTrust));

    let unsubscribe: () => void = () => {};

    // We always try to sync with cloud regardless of isLocalFallback
    const trustRef = doc(db, 'system', 'trust_account');
    console.log("Attempting Cloud Sync for Trust Pool (DB ID: " + (db as any).databaseId + ")...");

    unsubscribe = onSnapshot(trustRef, (snapshot) => {
      console.log("Trust Pool Snapshot received. Exists:", snapshot.exists());
      if (snapshot.exists()) {
        const data = snapshot.data();
        const updatedTrust: TrustAccount = {
          balance: Number(data.balance) || 0,
          totalDonations: Number(data.totalDonations) || 0,
          totalDisbursements: Number(data.totalDisbursements) || 0
        };
        setTrustAccount(updatedTrust);
        setIsLocalFallback(false);
        setFirestoreError(null);
        localStorage.setItem('haqdaar_trust', JSON.stringify(updatedTrust));
      } else {
        console.warn("Trust account doc missing in Cloud - Check collection 'system' and doc 'trust_account'");
        setFirestoreError("Cloud Data Missing: Doc 'system/trust_account' not found.");
        setIsLocalFallback(true);
      }
    }, (err) => {
      console.error("Firestore Trust Sync Error:", err);
      setFirestoreError(`Connection Error: ${err.message}`);
      setIsLocalFallback(true);
    });

    return () => unsubscribe();
  }, []); // Only run once on mount, listener stays active

  // Real-time User Profile tracking
  useEffect(() => {
    if (!activeUserId) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    let unsubscribe = () => {};

    if (isLocalFallback) {
      const savedUser = localStorage.getItem('haqdaar_user');
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch {
          setUser(LOCAL_TEST_USERS.find(u => u.id === activeUserId) || null);
        }
      } else {
        setUser(LOCAL_TEST_USERS.find(u => u.id === activeUserId) || null);
      }
      setIsLoading(false);
    } else {
      const userRef = doc(db, 'users', activeUserId);
      unsubscribe = onSnapshot(userRef, (snapshot) => {
        if (snapshot.exists()) {
          const freshData = snapshot.data() as User;
          setUser(freshData);
          localStorage.setItem('haqdaar_user', JSON.stringify(freshData));
          setFirestoreError(null); // Clear errors on success
          setIsLocalFallback(false);
        } else {
          // Attempt local fallback if deleted in cloud
          const matched = LOCAL_TEST_USERS.find(u => u.id === activeUserId) || null;
          setUser(matched);
        }
        setIsLoading(false);
      }, (error) => {
        console.warn("Profile Sync Error:", error);
        setIsLocalFallback(true);
        setFirestoreError(`Profile Sync: ${error.message}`);
        setIsLoading(false);
      });
    }

    return () => unsubscribe();
  }, [activeUserId, isLocalFallback]);

  // Real-time Transactions tracking
  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setIsLoadingTxs(false);
      return;
    }

    let unsubscribe = () => {};

    if (isLocalFallback) {
      const localTxs = localStorage.getItem('haqdaar_local_transactions');
      if (localTxs) {
        try {
          const parsed = JSON.parse(localTxs) as Transaction[];
          setTransactions(parsed.filter(tx => tx.userId === user.id));
        } catch {
          setTransactions([]);
        }
      }
      setIsLoadingTxs(false);
    } else {
      setIsLoadingTxs(true);
      // If admin, show global ledger. If donor/recipient, show personal transactions.
      const txsRef = user.role === 'admin'
        ? collection(db, 'ledger')
        : collection(db, 'users', user.id, 'transactions');

      const q = query(txsRef, orderBy('createdAt', 'desc'), limit(50));

      unsubscribe = onSnapshot(q, (snapshot) => {
        const txs = snapshot.docs.map(doc => {
          const data = doc.data();
          let formattedDate = 'Recent';
          try {
            if (data.createdAt) {
              const dt = typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate() : new Date(data.createdAt);
              formattedDate = dt.toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
            }
          } catch (e) {}
          return { id: doc.id, ...data, date: formattedDate } as Transaction;
        });
        setTransactions(txs);
        setIsLoadingTxs(false);
      }, (error) => {
        setIsLocalFallback(true);
      });
    }

    return () => unsubscribe();
  }, [user, isLocalFallback]);

  const login = async (cnic: string, phone: string) => {
    setIsLoading(true);

    const searchCnic = cnic.replace(/-/g, '').trim();
    const searchPhone = phone.replace(/-/g, '').trim();
    const dashedCnic = cnic.includes('-') ? cnic : `${cnic.slice(0,5)}-${cnic.slice(5,12)}-${cnic.slice(12)}`;
    const dashedPhone = phone.includes('-') ? phone : `${phone.slice(0,4)}-${phone.slice(4)}`;

    try {
      // 1. Try to find user in Firebase
      const usersRef = collection(db, 'users');

      // Check multiple formats (Dashed and Plain)
      const q1 = query(usersRef, where('cnic', 'in', [cnic, searchCnic, dashedCnic]));
      const q2 = query(usersRef, where('phone', 'in', [phone, searchPhone, dashedPhone]));

      const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

      let userData: User | null = null;

      // Find intersection or best match
      const users1 = snap1.docs.map(d => d.data() as User);
      const users2 = snap2.docs.map(d => d.data() as User);
      userData = users1.find(u1 => users2.some(u2 => u2.id === u1.id)) || null;

      if (!userData && (snap1.empty || snap2.empty)) {
        // 2. Check if it's one of our TEST users
        const matched = LOCAL_TEST_USERS.find(u => {
          const uCnic = u.cnic?.replace(/-/g, '');
          const uPhone = u.phone?.replace(/-/g, '');
          return uCnic === searchCnic && uPhone === searchPhone;
        });

        if (matched) {
          // 3. AUTO-SYNC Test User to Firebase
          try {
            const testUserRef = doc(db, 'users', matched.id);
            await setDoc(testUserRef, matched, { merge: true });
          } catch (e) {
            console.warn("Auto-sync failed", e);
          }
          userData = matched;
        }
      }

      if (userData) {
        setFirestoreError(null);
        setIsLocalFallback(false);
        setActiveUserId(userData.id);
        setUser(userData);
        localStorage.setItem('haqdaar_user', JSON.stringify(userData));
      } else {
        throw new Error('User not registered in system.');
      }
    } catch (error: any) {
      console.error("Login Error:", error);

      // Final fallback to local
      const matched = LOCAL_TEST_USERS.find(u => {
        const uCnic = u.cnic?.replace(/-/g, '');
        const uPhone = u.phone?.replace(/-/g, '');
        return uCnic === searchCnic && uPhone === searchPhone;
      });

      if (matched) {
        setFirestoreError(null); // Clear error since we found a local match
        setIsLocalFallback(true);
        setActiveUserId(matched.id);
        setUser(matched);
        localStorage.setItem('haqdaar_user', JSON.stringify(matched));
      } else {
        setFirestoreError(`Access Denied: ${error.message}`);
        throw error;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const donateToTrust = async (amount: number) => {
    if (!user) return;
    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum <= 0) throw new Error('Please enter a valid amount.');

    try {
      // 1. Try Cloud First
      await runTransaction(db, async (txn) => {
        const trustRef = doc(db, 'system', 'trust_account');
        const userRef = doc(db, 'users', user.id);

        const [trustSnap, userSnap] = await Promise.all([txn.get(trustRef), txn.get(userRef)]);

        if (userSnap.exists() && (userSnap.data().balance || 0) < amountNum) {
          throw new Error('Insufficient wallet balance in Cloud.');
        }

        txn.set(trustRef, {
          balance: increment(amountNum),
          totalDonations: increment(amountNum)
        }, { merge: true });

        txn.update(userRef, {
          balance: increment(-amountNum)
        });

        const txRef = doc(collection(db, 'users', user.id, 'transactions'));
        txn.set(txRef, {
          userId: user.id,
          amount: amountNum,
          title: 'Donation to Trust Pool',
          type: 'donation',
          status: 'completed',
          icon: '❤️',
          createdAt: serverTimestamp()
        });

        // Also write to Global Ledger for Admin visibility
        const ledgerRef = doc(collection(db, 'ledger'));
        txn.set(ledgerRef, {
          userId: user.id,
          userName: user.name,
          amount: amountNum,
          title: `Donation from ${user.name}`,
          type: 'donation',
          status: 'completed',
          icon: '❤️',
          createdAt: serverTimestamp()
        });
      });

      // If successful, restore Cloud mode if it was in fallback
      if (isLocalFallback) {
        setIsLocalFallback(false);
        setFirestoreError(null);
      }
      return;
    } catch (cloudError: any) {
      console.warn("Cloud Donation Error:", cloudError);

      // 2. Fallback to Local only if already in fallback or cloud is definitely unreachable
      if (isLocalFallback || cloudError.code === 'unavailable' || cloudError.code === 'permission-denied') {
        if (user.balance < amountNum) throw new Error('Insufficient local balance');

        const updatedUser = { ...user, balance: user.balance - amountNum };
        const updatedTrust = {
          ...trustAccount,
          balance: trustAccount.balance + amountNum,
          totalDonations: trustAccount.totalDonations + amountNum
        };

        setUser(updatedUser);
        setTrustAccount(updatedTrust);

        localStorage.setItem('haqdaar_user', JSON.stringify(updatedUser));
        localStorage.setItem('haqdaar_trust', JSON.stringify(updatedTrust));

        const newTx: Transaction = {
          id: 'tx_' + Date.now(),
          userId: user.id,
          amount: amountNum,
          title: 'Donation to Trust Pool (Local)',
          type: 'donation',
          status: 'completed',
          icon: '❤️',
          createdAt: new Date(),
          date: new Date().toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
        };

        const allTxs = JSON.parse(localStorage.getItem('haqdaar_local_transactions') || '[]');
        allTxs.unshift(newTx);
        localStorage.setItem('haqdaar_local_transactions', JSON.stringify(allTxs));
        setTransactions(allTxs.filter((t: any) => t.userId === user.id));

        setIsLocalFallback(true);
        setFirestoreError(`Cloud Sync Failed: Using Local Mode`);
      } else {
        throw cloudError;
      }
    }
  };

  const allocateAid = async (recipientId: string, amount: number) => {
    if (!user || user.role !== 'admin') return;
    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum <= 0) throw new Error('Please enter a valid amount.');

    try {
      // 1. Try Cloud Transaction
      await runTransaction(db, async (txn) => {
        const trustRef = doc(db, 'system', 'trust_account');
        const recipientRef = doc(db, 'users', recipientId);
        const [trustSnap, recipientSnap] = await Promise.all([txn.get(trustRef), txn.get(recipientRef)]);

        if (!trustSnap.exists() || trustSnap.data().balance < amountNum) throw new Error('Insufficient pool balance in Cloud');
        if (!recipientSnap.exists()) throw new Error('Recipient not found in Cloud');

        txn.update(trustRef, {
          balance: increment(-amountNum),
          totalDisbursements: increment(amountNum)
        });

        txn.update(recipientRef, {
          balance: increment(amountNum)
        });

        const recTxRef = doc(collection(db, 'users', recipientId, 'transactions'));
        txn.set(recTxRef, {
          userId: recipientId,
          amount: amountNum,
          title: 'Aid Received from Trust',
          type: 'disbursement',
          status: 'completed',
          icon: '🎁',
          createdAt: serverTimestamp()
        });

        // Also write to Global Ledger for Admin visibility
        const ledgerRef = doc(collection(db, 'ledger'));
        txn.set(ledgerRef, {
          userId: recipientId,
          recipientName: recipientSnap.data()?.name || 'Recipient',
          amount: amountNum,
          title: `Aid Disbursed to ${recipientSnap.data()?.name || 'Recipient'}`,
          type: 'disbursement',
          status: 'completed',
          icon: '🎁',
          createdAt: serverTimestamp()
        });
      });

      if (isLocalFallback) {
        setIsLocalFallback(false);
        setFirestoreError(null);
      }
      return;
    } catch (cloudError: any) {
      console.warn("Cloud Allocation Error:", cloudError);

      if (isLocalFallback || cloudError.code === 'unavailable') {
        if (trustAccount.balance < amountNum) throw new Error('Insufficient local pool balance');

        const updatedTrust = {
          ...trustAccount,
          balance: trustAccount.balance - amountNum,
          totalDisbursements: trustAccount.totalDisbursements + amountNum
        };

        setTrustAccount(updatedTrust);
        localStorage.setItem('haqdaar_trust', JSON.stringify(updatedTrust));

        // Update recipient balance in local storage
        const savedUserStr = localStorage.getItem('haqdaar_user');
        if (savedUserStr) {
          const currentUser = JSON.parse(savedUserStr);
          if (currentUser.id === recipientId) {
            currentUser.balance += amountNum;
            setUser(currentUser);
            localStorage.setItem('haqdaar_user', JSON.stringify(currentUser));
          }
        }

        const newTx: Transaction = {
          id: 'tx_' + Date.now(),
          userId: user.id,
          amount: amountNum,
          title: 'Aid Allocation Authorized (Local)',
          type: 'disbursement',
          status: 'completed',
          icon: '🎁',
          createdAt: new Date(),
          date: new Date().toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
        };

        const allTxs = JSON.parse(localStorage.getItem('haqdaar_local_transactions') || '[]');
        allTxs.unshift(newTx);

        const recTx: Transaction = {
          id: 'tx_rec_' + Date.now(),
          userId: recipientId,
          amount: amountNum,
          title: 'Aid Received from Trust (Local)',
          type: 'disbursement',
          status: 'completed',
          icon: '🎁',
          createdAt: new Date(),
          date: new Date().toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
        };
        allTxs.unshift(recTx);

        localStorage.setItem('haqdaar_local_transactions', JSON.stringify(allTxs));
        setTransactions(allTxs.filter((t: any) => t.userId === user.id));

        setIsLocalFallback(true);
      } else {
        throw cloudError;
      }
    }
  };

  const requestWithdrawal = async (amount: number) => {
    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum <= 0) throw new Error('Please enter a valid amount.');
    if (!user || (user.balance || 0) < amountNum) throw new Error('Insufficient balance');

    await runTransaction(db, async (txn) => {
      const userRef = doc(db, 'users', user.id);
      const userSnap = await txn.get(userRef);
      if ((userSnap.data()?.balance || 0) < amountNum) throw new Error('Insufficient balance');

      txn.update(userRef, { balance: increment(-amountNum) });

      const txRef = doc(collection(db, 'users', user.id, 'transactions'));
      txn.set(txRef, {
        userId: user.id,
        amount: amountNum,
        title: 'Withdrawal to Cash/Bank',
        type: 'withdrawal',
        status: 'completed',
        icon: '🏦',
        createdAt: serverTimestamp()
      });
    });
  };

  const logout = () => {
    setActiveUserId(null);
    setUser(null);
    setTransactions([]);
    localStorage.removeItem('haqdaar_user');
  };

  const seedDatabase = async () => {
    setIsLoading(true);
    try {
      // 1. Create Users
      for (const u of LOCAL_TEST_USERS) {
        const userRef = doc(db, 'users', u.id);
        await setDoc(userRef, u, { merge: true });
        console.log("Seeded user:", u.name);
      }

      // 2. Create Trust Account
      const trustRef = doc(db, 'system', 'trust_account');
      await setDoc(trustRef, {
        balance: 0,
        totalDonations: 0,
        totalDisbursements: 0
      }, { merge: true });

      console.log("Seeded Trust Account");
      alert("Cloud Database Seeded Successfully!");
    } catch (error: any) {
      console.error("Seeding Error:", error);
      alert("Seeding failed: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user,
      trustAccount,
      login,
      logout,
      isLoading,
      transactions,
      isLoadingTxs,
      donateToTrust,
      allocateAid,
      requestWithdrawal,
      seedDatabase,
      isLocalFallback,
      firestoreError
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
