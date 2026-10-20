import React, { useState, useRef, useEffect } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Home, QrCode, History, User, Scan, LayoutDashboard, LogOut, Menu, X, ArrowLeft, Bell, Sparkles, Send, Loader2, Heart, Plus, Minus, Wallet, Landmark, ClipboardList, CheckCircle2, ShoppingBag, Receipt, ArrowRight, Camera, Upload, Edit, Users, FileText, Activity, ShieldCheck, HelpCircle, Copy, Check, RefreshCw, Image as ImageIcon, CreditCard, Store, AlertTriangle, Download, Trophy, BarChart3, Calendar, Building2, Settings, TrendingUp, Star, Target, PiggyBank, Package, ChevronDown, ChevronRight, Lock, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth, Donee, ShopkeeperSpendingSummary, ShopkeeperDonorSummary, ShopkeeperPayment, Notification as NotificationType, DonorAnalytics, ShopkeeperAnalytics, AdminAnalytics, TrendPoint, RankedEntity, AllocationRun, AllocationPreview, DonorImpact, DonorFamily, AppSettings, DonorDeposit, Invoice, InvoiceLineItem } from './context/AuthContext';
import { useLanguage } from './context/LanguageContext';
import { cn, formatCurrency } from './lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from './lib/supabase';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Clipboard } from '@capacitor/clipboard';

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] modal-backdrop"
        />
        <motion.div
          initial={{ opacity: 0, y: "100%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "100%" }}
          className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-[40px] z-[70] p-8 pb-4 shadow-2xl modal-container max-h-[92vh] flex flex-col"
        >
          <div className="flex justify-between items-center mb-6 sticky top-0 bg-white z-10 pb-2 border-b border-gray-50">
            <h3 className="text-xl font-display font-bold text-slate-900">{title}</h3>
            <button onClick={onClose} className="p-2 bg-gray-100 rounded-full active:scale-90 transition-transform"><X className="w-5 h-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto pb-24 scrollbar-hide">
            {children}
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

const ImageViewer = ({ src, isOpen, onClose }: { src: string | null, isOpen: boolean, onClose: () => void }) => {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!isOpen) setScale(1);
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && src && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center"
        >
          <div className="absolute top-10 right-6 z-[110]">
            <button
              onClick={onClose}
              className="p-4 bg-white/10 backdrop-blur-md rounded-full text-white active:scale-90 transition-all border border-white/20 shadow-xl"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="w-full h-full flex items-center justify-center overflow-auto p-4">
            <motion.img
              src={src}
              alt="Payment Proof"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale, opacity: 1 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
              style={{ touchAction: 'none' }}
              onDoubleClick={() => setScale(prev => prev === 1 ? 2 : 1)}
            />
          </div>

          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center space-x-8 bg-black/40 backdrop-blur-xl px-8 py-3 rounded-full border border-white/10 text-white shadow-2xl z-[110]">
             <button onClick={() => setScale(prev => Math.max(1, prev - 0.5))} className="p-2 active:scale-75 transition-transform">
               <Minus className="w-6 h-6" />
             </button>
             <span className="text-[12px] font-black uppercase tracking-[0.2em] w-12 text-center">
               {Math.round(scale * 100)}%
             </span>
             <button onClick={() => setScale(prev => Math.min(4, prev + 0.5))} className="p-2 active:scale-75 transition-transform">
               <Plus className="w-6 h-6" />
             </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const HomePage = ({ onViewImage }: { onViewImage: (src: string) => void }) => {
  const {
    user, donees, myPledges, openEasyPaisa, initiateJazzCash, createPledge,
    getDonorSpendingByShopkeeper, submitShopkeeperPaymentProof, getShopkeeperPayments,
    acknowledgeShopkeeperPayment,
    registerDonee, updateDonee, getAdminDonees, getAuditLogs, getReports,
    getDonorTotalPaid, getShopkeeperTotalReceived, exportMyRecords,
    notifications, unreadNotificationCount, markNotificationRead,
    donorWalletBalance, addDonorCredit, getAdminDonorWallets,
    getAdminPayoutRequests, adminMarkPayoutPaid, adminRejectPayout,
    shopkeeperConfirmPayout, shopkeeperDisputePayout, adminResolveDispute,
    getMyPayoutRequests, getDonorPurchaseTransparency, getShopkeeperSecurityStatus
  } = useAuth();

  const [selectedDonee, setSelectedDonee] = useState<Donee | null>(null);
  const [securityPaisa, setSecurityPaisa] = useState(0);
  const [view, setView] = useState<'register' | 'manage_donees' | 'reports' | 'audit_logs' | 'notifications' | 'all_pledges' | 'donor_wallets' | 'payout_queue' | 'payout_detail' | ''>('');
  const [pledgeAmount, setPledgeAmount] = useState('1000');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [adminDoneeList, setAdminDoneeList] = useState<Donee[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [reportsData, setReportsData] = useState<any>(null);
  const [editingDonee, setEditingDonee] = useState<Donee | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [spendingHistory, setSpendingHistory] = useState<any[]>([]);

  // Payments Due state
  const [paymentsDue, setPaymentsDue] = useState<ShopkeeperSpendingSummary[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<ShopkeeperSpendingSummary | null>(null);
  const [proofImage, setProofImage] = useState<string | null>(null);

  // Shopkeeper payments received state
  const [shopPayments, setShopPayments] = useState<ShopkeeperPayment[]>([]);

  // Admin all pledges
  const [allPledges, setAllPledges] = useState<any[]>([]);

  // Donor wallets (admin view)
  const [donorWallets, setDonorWallets] = useState<any[]>([]);
  const [walletCreditDonorId, setWalletCreditDonorId] = useState<string | null>(null);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditNote, setCreditNote] = useState('');
  const [isAddingCredit, setIsAddingCredit] = useState(false);

  // Payout requests
  const [payoutRequests, setPayoutRequests] = useState<any[]>([]);
  const [payoutFilter, setPayoutFilter] = useState<string>('all');
  const [selectedPayout, setSelectedPayout] = useState<any | null>(null);
  const [payoutProofUrl, setPayoutProofUrl] = useState('');
  const [payoutProofImage, setPayoutProofImage] = useState<string | null>(null);
  const [payoutTxnId, setPayoutTxnId] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('easypaisa');
  const [payoutRejectReason, setPayoutRejectReason] = useState('');
  const [payoutDisputeNote, setPayoutDisputeNote] = useState('');
  const [payoutAction, setPayoutAction] = useState<'pay' | 'reject' | 'resolve' | null>(null);
  const [isPayoutSubmitting, setIsPayoutSubmitting] = useState(false);
  const [myPayoutRequests, setMyPayoutRequests] = useState<any[]>([]);
  const [donorTransparency, setDonorTransparency] = useState<any[]>([]);
  const [parchiModal, setParchiModal] = useState<{ url: string; doneeName: string; shopName: string; amount: string } | null>(null);

  // Secondary hero stat: amount paid (donor) / amount received (shopkeeper)
  const [secondaryStat, setSecondaryStat] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  const copyToClipboard = async (text: string) => {
    await Clipboard.write({ string: text });
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleAcknowledgePayment = async (paymentId: string) => {
    try {
      await acknowledgeShopkeeperPayment(paymentId);
      setShopPayments(prev => prev.map(p => p.id === paymentId ? { ...p, status: 'acknowledged' } : p));
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportMyRecords();
    } catch (e: any) {
      alert('Export failed: ' + e.message);
    } finally {
      setIsExporting(false);
    }
  };

  const { t } = useLanguage();
  const isDonor = user?.role?.toLowerCase() === 'donor';
  const isShop = user?.role?.toLowerCase() === 'shopkeeper';
  const isAdmin = user?.role?.toLowerCase() === 'admin';

  useEffect(() => {
    if (isShop) {
      supabase.from('spending_records').select('*, donees(full_name)')
        .eq('shopkeeper_id', user!.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => setSpendingHistory(data || []));

      getShopkeeperPayments().then(setShopPayments);
      getShopkeeperSecurityStatus(user!.id).then(s => setSecurityPaisa(s?.amount_paisa ?? 0));
    }
  }, [user, isShop]);

  // Secondary hero stat: total paid (donor) / total received (shopkeeper)
  useEffect(() => {
    if (isDonor) {
      getDonorTotalPaid().then(setSecondaryStat);
    } else if (isShop) {
      getShopkeeperTotalReceived().then(setSecondaryStat);
    }
  }, [user, isDonor, isShop, notifications]);

  // Load payments due for donors (kept for legacy data display)
  useEffect(() => {
    if (isDonor) {
      getDonorSpendingByShopkeeper().then(setPaymentsDue);
      getDonorPurchaseTransparency().then(setDonorTransparency);
    }
  }, [user, isDonor, myPledges, notifications]);

  // Load shopkeeper payout requests
  useEffect(() => {
    if (isShop) {
      getMyPayoutRequests().then(setMyPayoutRequests);
    }
  }, [user, isShop, notifications]);

  // Donee Registration Form
  const [newDonee, setNewDonee] = useState({
    full_name: '',
    city: '',
    area: '',
    phone: '',
    qr: '',
    receiving_account_title: '',
    receiving_method: 'EasyPaisa'
  });

  useEffect(() => {
    if (isAdmin) {
      getReports().then(setReportsData);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (view === 'manage_donees') {
      getAdminDonees().then(setAdminDoneeList);
    }
    if (view === 'audit_logs') {
      getAuditLogs().then(setAuditLogs);
    }
    if (view === 'reports') {
      getReports().then(setReportsData);
    }
    if (view === 'all_pledges') {
      supabase.from('pledge_records')
        .select('*, donees(full_name), profiles!pledge_records_donor_id_fkey(full_name)')
        .order('created_at', { ascending: false })
        .then(({ data }) => setAllPledges(data || []));
    }
  }, [view]);

  const handlePledge = async () => {
    if (!selectedDonee) return;
    const amount = parseFloat(pledgeAmount);
    if (!amount || amount <= 0) {
      alert('Please enter a valid amount.');
      return;
    }
    setIsSubmitting(true);
    try {
      await createPledge(selectedDonee.id, amount);
      setSelectedDonee(null);
    } catch (e: any) {
      alert("Pledge failed: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayShopkeeper = async (method: 'easypaisa' | 'jazzcash') => {
    if (!selectedPayment) return;
    // Prefer the provider-specific account; fall back to the shop's general payment info.
    const account = method === 'jazzcash'
      ? (selectedPayment.jazzcash_account || selectedPayment.payment_info)
      : (selectedPayment.easypaisa_account || selectedPayment.payment_info);

    if (!account) {
      alert(`Shopkeeper has not set up a ${method === 'jazzcash' ? 'JazzCash' : 'EasyPaisa'} account. Please ask admin to update it.`);
      return;
    }
    const phone = account.replace(/\D/g, '');
    await Clipboard.write({ string: phone });
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);

    if (method === 'jazzcash') {
      initiateJazzCash(phone, selectedPayment.total_unpaid);
    } else {
      openEasyPaisa(phone, selectedPayment.total_unpaid);
    }
  };

  const pickProofImage = async () => {
    try {
      const image = await CapCamera.getPhoto({
        quality: 30,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos
      });
      if (image.dataUrl) {
        setProofImage(image.dataUrl);
      }
    } catch (e) {
      console.log('User cancelled');
    }
  };

  const pickPayoutProofImage = async () => {
    try {
      const image = await CapCamera.getPhoto({
        quality: 40,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos
      });
      if (image.dataUrl) setPayoutProofImage(image.dataUrl);
    } catch (e) {
      console.log('User cancelled');
    }
  };

  const handleSubmitPaymentProof = async () => {
    if (!selectedPayment || !proofImage) {
      alert('Please select a screenshot proof first.');
      return;
    }
    setIsSubmitting(true);
    try {
      const spendingIds = selectedPayment.spending_records.map(r => r.id);
      await submitShopkeeperPaymentProof(
        selectedPayment.shopkeeper_id,
        selectedPayment.total_unpaid,
        spendingIds,
        proofImage
      );
      setSelectedPayment(null);
      setProofImage(null);
      getDonorSpendingByShopkeeper().then(setPaymentsDue);
    } catch (e: any) {
      alert("Submission failed: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (editingDonee) {
      setNewDonee({
        full_name: editingDonee.full_name,
        city: editingDonee.city,
        area: editingDonee.area,
        phone: editingDonee.receiving_account_masked || '',
        qr: editingDonee.spending_qr_code,
        receiving_account_title: editingDonee.receiving_account_title || '',
        receiving_method: editingDonee.receiving_method || 'EasyPaisa'
      });
    } else {
      setNewDonee({ full_name: '', city: '', area: '', phone: '', qr: '', receiving_account_title: '', receiving_method: 'EasyPaisa' });
    }
  }, [editingDonee]);

  const handleRegister = async () => {
    if (!newDonee.full_name || !newDonee.qr || !newDonee.phone) {
      alert('Please fill in name, phone number, and QR code.');
      return;
    }
    setIsSubmitting(true);
    try {
      const data = {
        full_name: newDonee.full_name,
        city: newDonee.city,
        area: newDonee.area,
        spending_qr_code: newDonee.qr,
        receiving_method: newDonee.receiving_method,
        receiving_account_masked: newDonee.phone,
        receiving_account_title: newDonee.receiving_account_title
      };

      if (editingDonee) {
        await updateDonee(editingDonee.id, data);
        alert('Donee Updated Successfully!');
      } else {
        await registerDonee(data);
        alert('Donee Registered Successfully!');
        window.print();
      }

      setView('');
      setEditingDonee(null);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await updateDonee(id, { status } as any);
      setAdminDoneeList(adminDoneeList.map(d => d.id === id ? { ...d, status } : d));
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <header className="flex justify-between items-center py-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-primary">{t('home_greeting')}</h1>
          <p className="text-slate-500 font-bold tracking-tight">
            {isAdmin ? t('home_admin_oversight') : isDonor ? t('home_donor_subtitle') : t('home_shop_portal')}
          </p>
        </div>
        <div className="flex space-x-2">
           {isAdmin && (
             <button onClick={() => setView('register')} className="p-2 bg-primary/10 rounded-full text-primary">
               <Plus className="w-6 h-6" />
             </button>
           )}
           <button onClick={() => setView('notifications')} className="p-2 bg-white rounded-full shadow-sm relative">
             <Bell className="w-6 h-6 text-slate-600" />
             {unreadNotificationCount > 0 && (
               <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                 {unreadNotificationCount}
               </span>
             )}
           </button>
        </div>
      </header>

      {/* Hero Card */}
      <div className="bg-primary rounded-[32px] p-8 text-white shadow-xl shadow-primary/20 relative overflow-hidden active:scale-[0.98] transition-all">
        <div className="relative z-10">
          <p className="text-primary-light text-[10px] font-bold uppercase tracking-[0.2em] mb-1">
            {isDonor ? t('home_balance_label') : isShop ? t('home_agent_status') : t('home_global_pledged')}
          </p>
          <h2 className="text-4xl font-display font-bold">
            {isDonor
              ? formatCurrency(donorWalletBalance)
              : isShop
              ? formatCurrency(spendingHistory.reduce((acc, s) => acc + Number(s.amount), 0))
              : formatCurrency(reportsData?.totalPledged || 0)
            }
          </h2>
          <p className="text-[10px] mt-4 opacity-70 uppercase tracking-widest font-bold">
            {isDonor ? t('home_available_for_alloc') : isShop ? t('home_goods_distributed') : t('home_global_sub')}
          </p>
          {isDonor && (
            <div className="mt-5 pt-4 border-t border-white/15 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">{t('home_wallet_balance')}</p>
                <p className="text-xl font-display font-bold mt-1">{formatCurrency(donorWalletBalance)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">{t('home_total_paid')}</p>
                <p className="text-xl font-display font-bold mt-1">{formatCurrency(secondaryStat)}</p>
              </div>
            </div>
          )}
          {isShop && (
            <div className="mt-5 pt-4 border-t border-white/15 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">{t('security_deposit')}</p>
                <p className="text-xl font-display font-bold mt-1">{formatCurrency(securityPaisa / 100)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">{t('home_payment_received')}</p>
                <p className="text-xl font-display font-bold mt-1">{formatCurrency(secondaryStat)}</p>
              </div>
            </div>
          )}
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Link to="/analytics" className="bg-white p-5 rounded-[28px] shadow-sm border border-gray-100 flex items-center space-x-3 active:scale-95 transition-all">
          <div className="p-3 bg-primary/5 rounded-2xl"><Activity className="w-6 h-6 text-primary" /></div>
          <span className="font-bold text-xs uppercase tracking-widest text-gray-700">{t('home_analytics')}</span>
        </Link>
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="bg-white p-5 rounded-[28px] shadow-sm border border-gray-100 flex items-center space-x-3 active:scale-95 transition-all disabled:opacity-50"
        >
          <div className="p-3 bg-blue-50 rounded-2xl">
            {isExporting ? <Loader2 className="w-6 h-6 text-blue-600 animate-spin" /> : <Download className="w-6 h-6 text-blue-600" />}
          </div>
          <span className="font-bold text-xs uppercase tracking-widest text-gray-700">{isExporting ? t('home_exporting') : t('home_export')}</span>
        </button>
      </div>

      {/* DONOR: Quick links */}
      {isDonor && (
        <div className="grid grid-cols-2 gap-3">
          <Link to="/impact" className="bg-white p-5 rounded-[28px] shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-2 active:scale-95 transition-all">
            <div className="p-3 bg-primary/5 rounded-2xl"><Sparkles className="w-6 h-6 text-primary" /></div>
            <span className="font-bold text-xs uppercase tracking-widest text-gray-700">{t('home_my_impact')}</span>
          </Link>
          <Link to="/donor/families" className="bg-white p-5 rounded-[28px] shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-2 active:scale-95 transition-all">
            <div className="p-3 bg-rose-50 rounded-2xl"><Heart className="w-6 h-6 text-rose-500" /></div>
            <span className="font-bold text-xs uppercase tracking-widest text-gray-700">{t('home_my_families')}</span>
          </Link>
          <Link to="/donor/transactions" className="bg-white p-5 rounded-[28px] shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-2 active:scale-95 transition-all">
            <div className="p-3 bg-blue-50 rounded-2xl"><FileText className="w-6 h-6 text-blue-600" /></div>
            <span className="font-bold text-xs uppercase tracking-widest text-gray-700">{t('home_transactions')}</span>
          </Link>
          <Link to="/analytics" className="bg-white p-5 rounded-[28px] shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-2 active:scale-95 transition-all">
            <div className="p-3 bg-amber-50 rounded-2xl"><BarChart3 className="w-6 h-6 text-amber-500" /></div>
            <span className="font-bold text-xs uppercase tracking-widest text-gray-700">{t('home_analytics')}</span>
          </Link>
        </div>
      )}

      {/* DONOR: Purchase Transparency Section */}
      {isDonor && donorTransparency.length > 0 && (
        <section className="space-y-4">
          <h3 className="font-display font-bold text-xl text-gray-800">{t('home_purchases_heading')}</h3>
          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{t('home_purchases_sub')}</p>
          <div className="space-y-3">
            {donorTransparency.map((pr: any) => (
              <div key={pr.id} className="p-5 bg-white rounded-[28px] border border-gray-100 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold text-slate-900">{pr.donees?.full_name || 'Donee'}</p>
                    <p className="text-[10px] text-gray-400">{pr.shopkeepers?.shop_name || 'Shop'}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{pr.items_description}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-bold text-primary">{formatCurrency(pr.amount)}</p>
                    <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded-full inline-block mt-1 ${
                      pr.status === 'completed' ? 'bg-green-100 text-green-700' :
                      pr.status === 'paid_awaiting_confirmation' ? 'bg-blue-100 text-blue-700' :
                      pr.status === 'pending_payment' ? 'bg-amber-100 text-amber-700' :
                      pr.status === 'disputed' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>{pr.status === 'pending_payment' ? t('status_pending') : pr.status === 'paid_awaiting_confirmation' ? t('status_paid') : pr.status}</span>
                  </div>
                </div>
                <p className="text-[10px] text-gray-400">{new Date(pr.created_at).toLocaleDateString()}</p>
                {pr.status === 'completed' && pr.parchi_photo_url && (
                  <button
                    onClick={() => setParchiModal({ url: pr.parchi_photo_url, doneeName: pr.donees?.full_name || 'Donee', shopName: pr.shopkeepers?.shop_name || 'Shop', amount: formatCurrency(pr.amount) })}
                    className="mt-2 w-full py-2 bg-green-50 text-green-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />{t('home_view_parchi')}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Parchi photo modal */}
      {parchiModal && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col" onClick={() => setParchiModal(null)}>
          <div className="flex items-center justify-between px-4 pt-safe pt-4 pb-3" onClick={e => e.stopPropagation()}>
            <div>
              <p className="text-white font-bold text-base">Parchi — {parchiModal.doneeName}</p>
              <p className="text-white/60 text-xs mt-0.5">{t('home_parchi_at')} {parchiModal.shopName} · {parchiModal.amount}</p>
            </div>
            <button onClick={() => setParchiModal(null)} className="p-2 rounded-full bg-white/10 active:bg-white/20">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center px-4 pb-8" onClick={e => e.stopPropagation()}>
            <img src={parchiModal.url} className="max-w-full max-h-full rounded-2xl object-contain" />
          </div>
        </div>
      )}

      {/* SHOPKEEPER: Dashboard */}
      {isShop && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Link to="/scan" className="bg-white p-6 rounded-[28px] shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-3 active:scale-95 transition-all">
              <div className="p-4 bg-primary/5 rounded-2xl"><Scan className="w-8 h-8 text-primary" /></div>
              <span className="font-bold text-xs uppercase tracking-widest text-gray-700">{t('home_scan_id')}</span>
            </Link>
            <Link to="/history" className="bg-white p-6 rounded-[28px] shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-3 active:scale-95 transition-all">
              <div className="p-4 bg-blue-50 rounded-2xl"><History className="w-8 h-8 text-blue-600" /></div>
              <span className="font-bold text-xs uppercase tracking-widest text-gray-700">{t('home_records_btn')}</span>
            </Link>
          </div>

          {/* Shopkeeper: Payout Requests */}
          {myPayoutRequests.length > 0 && (
            <section className="space-y-4">
              <h3 className="font-display font-bold text-xl text-gray-800">{t('home_payout_requests')}</h3>
              <div className="space-y-3">
                {myPayoutRequests.map(pr => (
                  <div key={pr.id} className="p-5 bg-white rounded-[28px] border border-gray-100 shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-slate-900">{pr.donees?.full_name || 'Donee'}</p>
                        <p className="text-[10px] text-gray-400">{pr.items_description}</p>
                        <p className="text-[10px] text-gray-400">{new Date(pr.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-display font-bold text-orange-600">{formatCurrency(pr.amount)}</p>
                        <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded-full inline-block mt-1 ${
                          pr.status === 'pending_payment' ? 'bg-amber-100 text-amber-700' :
                          pr.status === 'paid_awaiting_confirmation' ? 'bg-blue-100 text-blue-700' :
                          pr.status === 'completed' ? 'bg-green-100 text-green-700' :
                          pr.status === 'disputed' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>{pr.status === 'pending_payment' ? t('status_pending') : pr.status === 'paid_awaiting_confirmation' ? t('status_awaiting_confirm') : pr.status}</span>
                      </div>
                    </div>
                    {pr.payment_proof_url && (
                      <button onClick={() => onViewImage(pr.payment_proof_url)} className="w-full h-32 bg-gray-100 rounded-2xl overflow-hidden relative active:scale-[0.98] transition-all">
                        <img src={pr.payment_proof_url} className="w-full h-full object-cover" alt="Payment Proof" />
                        <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-[8px] text-white font-bold uppercase">{t('home_tap_to_zoom')}</div>
                      </button>
                    )}
                    {pr.transaction_id && <p className="text-[10px] text-gray-500">TXN: <span className="font-bold">{pr.transaction_id}</span> via {pr.payment_method}</p>}
                    {pr.rejection_reason && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-xl">{t('home_rejected_prefix')} {pr.rejection_reason}</p>}
                    {pr.status === 'paid_awaiting_confirmation' && (
                      <div className="space-y-2">
                        <button onClick={async () => { await shopkeeperConfirmPayout(pr.id); setMyPayoutRequests(await getMyPayoutRequests()); }}
                          className="w-full py-3 bg-green-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-4 h-4" /> {t('home_confirm_received')}
                        </button>
                        {payoutAction !== 'reject' || selectedPayout?.id !== pr.id ? (
                          <button onClick={() => { setSelectedPayout(pr); setPayoutAction('reject'); }}
                            className="w-full py-3 bg-red-50 text-red-600 rounded-2xl font-bold text-xs uppercase tracking-widest active:scale-95 transition-all">
                            {t('home_not_received')}
                          </button>
                        ) : (
                          <div className="space-y-2">
                            <input placeholder={t('form_dispute_placeholder')} className="w-full p-3 bg-gray-50 rounded-xl text-sm" value={payoutDisputeNote} onChange={e => setPayoutDisputeNote(e.target.value)} />
                            <div className="flex gap-2">
                              <button disabled={!payoutDisputeNote} onClick={async () => {
                                await shopkeeperDisputePayout(pr.id, payoutDisputeNote);
                                setPayoutDisputeNote(''); setSelectedPayout(null); setPayoutAction(null);
                                setMyPayoutRequests(await getMyPayoutRequests());
                              }} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-xs disabled:opacity-50">{t('home_submit_dispute')}</button>
                              <button onClick={() => { setSelectedPayout(null); setPayoutAction(null); }} className="px-4 py-3 bg-gray-100 rounded-xl text-xs font-bold">{t('btn_cancel')}</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* ADMIN: Dashboard */}
      {isAdmin && (
        <div className="grid grid-cols-2 gap-4">
          <Link to="/admin/manage" className="bg-white p-6 rounded-[28px] shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-3 active:scale-95 transition-all">
            <div className="p-4 bg-blue-50 rounded-2xl"><Users className="w-8 h-8 text-blue-600" /></div>
            <span className="font-bold text-xs uppercase tracking-widest text-gray-700 text-center">{t('home_manage_donees')}</span>
          </Link>
          <Link to="/admin/shopkeepers" className="bg-white p-6 rounded-[28px] shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-3 active:scale-95 transition-all">
            <div className="p-4 bg-green-50 rounded-2xl"><ShoppingBag className="w-8 h-8 text-green-600" /></div>
            <span className="font-bold text-xs uppercase tracking-widest text-gray-700 text-center">{t('home_manage_shops')}</span>
          </Link>
          <Link to="/admin/donors" className="bg-white p-6 rounded-[28px] shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-3 active:scale-95 transition-all col-span-2">
            <div className="p-4 bg-primary/5 rounded-2xl"><Heart className="w-8 h-8 text-primary" /></div>
            <span className="font-bold text-xs uppercase tracking-widest text-gray-700 text-center">{t('home_manage_donors')}</span>
          </Link>
          <button onClick={() => setView('all_pledges')} className="bg-white p-6 rounded-[28px] shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-3 active:scale-95 transition-all">
            <div className="p-4 bg-primary/5 rounded-2xl"><CreditCard className="w-8 h-8 text-primary" /></div>
            <span className="font-bold text-xs uppercase tracking-widest text-gray-700 text-center">{t('home_all_pledges')}</span>
          </button>
          <button onClick={() => setView('reports')} className="bg-white p-6 rounded-[28px] shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-3 active:scale-95 transition-all">
            <div className="p-4 bg-purple-50 rounded-2xl"><FileText className="w-8 h-8 text-purple-600" /></div>
            <span className="font-bold text-xs uppercase tracking-widest text-gray-700 text-center">{t('home_reports')}</span>
          </button>
          <button onClick={() => setView('audit_logs')} className="bg-white p-6 rounded-[28px] shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-3 active:scale-95 transition-all">
            <div className="p-4 bg-slate-50 rounded-2xl"><Activity className="w-8 h-8 text-slate-400" /></div>
            <span className="font-bold text-xs uppercase tracking-widest text-gray-700 text-center">{t('home_audit_logs')}</span>
          </button>
          <button onClick={async () => { setView('donor_wallets'); try { setDonorWallets(await getAdminDonorWallets()); } catch(e:any) { alert(t('alert_error_wallets') + ' ' + e.message); } }} className="bg-white p-6 rounded-[28px] shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-3 active:scale-95 transition-all">
            <div className="p-4 bg-emerald-50 rounded-2xl"><Wallet className="w-8 h-8 text-emerald-600" /></div>
            <span className="font-bold text-xs uppercase tracking-widest text-gray-700 text-center">{t('home_donor_wallets')}</span>
          </button>
          <button onClick={async () => { setView('payout_queue'); try { setPayoutRequests(await getAdminPayoutRequests()); } catch(e:any) { alert(t('alert_error_payouts') + ' ' + e.message); } }} className="bg-white p-6 rounded-[28px] shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-3 active:scale-95 transition-all">
            <div className="p-4 bg-orange-50 rounded-2xl"><Send className="w-8 h-8 text-orange-600" /></div>
            <span className="font-bold text-xs uppercase tracking-widest text-gray-700 text-center">{t('home_payout_queue')}</span>
          </button>
        </div>
      )}

      {/* Admin Registration Modal */}
      <Modal isOpen={view === 'register'} onClose={() => { setView(''); setEditingDonee(null); }} title={editingDonee ? t('modal_edit_donee') : t('modal_register_donee')}>
         <div className="space-y-4 print:p-0">
            <div className="print:hidden space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-gray-400 ml-2">{t('form_personal_details')}</label>
                <input placeholder={t('form_full_name')} className="w-full p-4 bg-gray-50 rounded-2xl border-none text-sm" value={newDonee.full_name} onChange={e => setNewDonee({...newDonee, full_name: e.target.value})} />
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder={t('form_city')} className="p-4 bg-gray-50 rounded-2xl border-none text-sm" value={newDonee.city} onChange={e => setNewDonee({...newDonee, city: e.target.value})} />
                  <input placeholder={t('form_area')} className="p-4 bg-gray-50 rounded-2xl border-none text-sm" value={newDonee.area} onChange={e => setNewDonee({...newDonee, area: e.target.value})} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-gray-400 ml-2">{t('form_account_id')}</label>
                <select className="w-full p-4 bg-gray-50 rounded-2xl border-none text-sm mb-2" value={newDonee.receiving_method} onChange={e => setNewDonee({...newDonee, receiving_method: e.target.value})}>
                  <option value="EasyPaisa">EasyPaisa</option>
                  <option value="JazzCash">JazzCash</option>
                  <option value="Raast">{t('form_raast_bank')}</option>
                </select>
                <input placeholder={t('form_account_title')} className="w-full p-4 bg-gray-50 rounded-2xl border-none text-sm" value={newDonee.receiving_account_title} onChange={e => setNewDonee({...newDonee, receiving_account_title: e.target.value})} />
                <input placeholder={t('form_account_number')} className="w-full p-4 bg-gray-50 rounded-2xl border-none text-sm" value={newDonee.phone} onChange={e => setNewDonee({...newDonee, phone: e.target.value})} />
                <input placeholder={t('form_unique_qr')} className="w-full p-4 bg-gray-50 rounded-2xl border-none text-sm" value={newDonee.qr} onChange={e => setNewDonee({...newDonee, qr: e.target.value})} />
              </div>
            </div>

            <div className={cn("p-6 border-2 border-primary rounded-3xl bg-white flex flex-col items-center space-y-3 shadow-sm", newDonee.full_name ? "block" : "hidden print:hidden")}>
               <div className="w-full flex justify-between items-center border-b border-primary/20 pb-2">
                  <h4 className="font-display font-bold text-primary text-sm">{t('form_haqdaar_id')}</h4>
                  <span className="text-[8px] font-black uppercase text-gray-400">{t('form_verified_identity')}</span>
               </div>
               <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center text-3xl">
                  {newDonee.full_name.charAt(0) || '?'}
               </div>
               <div className="text-center">
                  <p className="font-display font-bold text-lg leading-tight">{newDonee.full_name || 'Donee Name'}</p>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{newDonee.city}, {newDonee.area}</p>
               </div>
               <div className="bg-white p-2 rounded-xl border border-gray-100">
                  <QRCodeSVG value={newDonee.qr || 'PENDING'} size={100} />
               </div>
               <p className="font-mono text-[10px] font-bold text-primary">{newDonee.qr}</p>
            </div>

            <button
              onClick={handleRegister}
              disabled={isSubmitting}
              className="print:hidden w-full bg-primary text-white py-4 rounded-2xl font-bold uppercase tracking-widest disabled:opacity-50 mt-2 mb-8"
            >
              {isSubmitting ? (editingDonee ? t('btn_updating') : t('btn_registering')) : (editingDonee ? t('btn_update_donee') : t('btn_register_print'))}
            </button>
         </div>
      </Modal>

      {/* Admin Manage Donees Modal */}
      <Modal isOpen={view === 'manage_donees'} onClose={() => setView('')} title={t('modal_manage_donees')}>
        <div className="space-y-4">
          {adminDoneeList.map(donee => (
            <div key={donee.id} className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold text-slate-900">{donee.full_name}</p>
                  <p className="text-[10px] uppercase text-gray-400 font-bold">{donee.city}, {donee.area}</p>
                </div>
                <div className="text-right">
                   <p className={cn("text-[8px] font-bold uppercase px-2 py-0.5 rounded-full inline-block", donee.status === 'approved' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>{donee.status}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button onClick={() => handleUpdateStatus(donee.id, donee.status === 'approved' ? 'paused' : 'approved')} className="flex-1 py-2 bg-gray-50 rounded-xl text-[10px] font-bold uppercase text-gray-600 active:scale-95 transition-all">
                  {donee.status === 'approved' ? t('btn_pause') : t('btn_activate')}
                </button>
                <button onClick={() => { setEditingDonee(donee); setView('register'); }} className="px-4 py-2 bg-primary/5 text-primary rounded-xl active:scale-95 transition-all"><Edit className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* Admin All Pledges Modal */}
      <Modal isOpen={view === 'all_pledges'} onClose={() => setView('')} title={t('modal_all_pledges')}>
        <div className="space-y-4">
          {allPledges.length === 0 && <p className="text-center text-gray-400 py-12">{t('text_no_pledges')}</p>}
          {allPledges.map(pledge => (
            <div key={pledge.id} className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-slate-900">{pledge.profiles?.full_name || t('text_donor')}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">{t('text_for_label')}: {pledge.donees?.full_name}</p>
                </div>
                <div className="text-right">
                  <p className="font-display font-bold text-primary">{formatCurrency(pledge.amount)}</p>
                  <p className={cn("text-[8px] font-bold uppercase px-2 py-0.5 rounded-full inline-block mt-1",
                    pledge.status === 'active' ? "bg-green-100 text-green-700" :
                    pledge.status === 'partially_spent' ? "bg-amber-100 text-amber-700" :
                    pledge.status === 'fully_spent' ? "bg-blue-100 text-blue-700" :
                    "bg-red-100 text-red-700"
                  )}>{pledge.status}</p>
                </div>
              </div>
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>{t('text_remaining')}: {formatCurrency(pledge.remaining_amount)}</span>
                <span>{new Date(pledge.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* Admin Donor Wallets Modal */}
      <Modal isOpen={view === 'donor_wallets'} onClose={() => { setView(''); setWalletCreditDonorId(null); setCreditAmount(''); setCreditNote(''); }} title={t('modal_donor_wallets')}>
        <div className="space-y-4">
          {donorWallets.length === 0 && <p className="text-center text-gray-400 py-12">{t('text_no_donors')}</p>}
          {donorWallets.map(dw => (
            <div key={dw.donor_id} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 flex justify-between items-start">
                <div>
                  <p className="font-bold text-slate-900">{dw.donor_name}</p>
                  <p className="text-[10px] text-gray-400">{dw.donor_phone}</p>
                  <div className="flex gap-3 mt-1">
                    <span className="text-[10px] text-gray-500">{t('text_credited')}: <span className="font-bold text-slate-700">{formatCurrency(dw.total_credited)}</span></span>
                    <span className="text-[10px] text-gray-500">{t('text_pledged')}: <span className="font-bold text-slate-700">{formatCurrency(dw.total_pledged)}</span></span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 uppercase font-bold">{t('text_available')}</p>
                  <p className="text-xl font-display font-bold text-emerald-600">{formatCurrency(dw.available_balance)}</p>
                </div>
              </div>
              {walletCreditDonorId === dw.donor_id ? (
                <div className="px-4 pb-4 space-y-2 border-t border-gray-50 pt-3">
                  <input
                    type="number"
                    placeholder={t('form_amount_pkr')}
                    className="w-full p-3 bg-gray-50 rounded-xl text-sm border-none"
                    value={creditAmount}
                    onChange={e => setCreditAmount(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder={t('form_note_placeholder')}
                    className="w-full p-3 bg-gray-50 rounded-xl text-sm border-none"
                    value={creditNote}
                    onChange={e => setCreditNote(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        const amt = Number(creditAmount);
                        if (!amt || amt <= 0) return alert(t('alert_invalid_amount'));
                        setIsAddingCredit(true);
                        try {
                          await addDonorCredit(dw.donor_id, amt, creditNote || undefined);
                          setCreditAmount(''); setCreditNote(''); setWalletCreditDonorId(null);
                          setDonorWallets(await getAdminDonorWallets());
                        } catch (e: any) { alert(e.message); }
                        finally { setIsAddingCredit(false); }
                      }}
                      disabled={isAddingCredit}
                      className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm disabled:opacity-50"
                    >
                      {isAddingCredit ? t('btn_adding') : t('btn_add_credit')}
                    </button>
                    <button onClick={() => { setWalletCreditDonorId(null); setCreditAmount(''); setCreditNote(''); }} className="px-4 py-3 bg-gray-100 rounded-xl text-sm font-bold">{t('btn_cancel')}</button>
                  </div>
                </div>
              ) : (
                <div className="px-4 pb-3">
                  <button onClick={() => setWalletCreditDonorId(dw.donor_id)} className="w-full py-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" /> {t('btn_add_credit')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Modal>

      {/* Admin Payout Queue Modal */}
      <Modal isOpen={view === 'payout_queue'} onClose={() => { setView(''); setSelectedPayout(null); setPayoutAction(null); }} title={t('modal_payout_queue')}>
        <div className="space-y-4">
          {/* Filter tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(['all','pending_payment','paid_awaiting_confirmation','disputed','completed','rejected'] as const).map(s => (
              <button key={s} onClick={async () => { setPayoutFilter(s); try { setPayoutRequests(await getAdminPayoutRequests(s as any)); } catch(e:any){alert(e.message);} }}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase whitespace-nowrap ${payoutFilter === s ? 'bg-slate-900 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {s === 'all' ? t('text_all') : s === 'pending_payment' ? t('status_pending') : s === 'paid_awaiting_confirmation' ? t('status_awaiting_confirm') : s === 'disputed' ? t('text_disputed') : s === 'completed' ? t('text_completed') : t('text_rejected')}
              </button>
            ))}
          </div>
          {payoutRequests.length === 0 && <p className="text-center text-gray-400 py-12">{t('text_no_payouts')}</p>}
          {payoutRequests.map(pr => (
            <div key={pr.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-slate-900">{pr.shopkeepers?.shop_name || pr.shopkeeper_name || t('text_shop')}</p>
                    <p className="text-[10px] text-gray-500">{t('text_for_label')}: {pr.donees?.full_name}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{pr.items_description}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-bold text-orange-600">{formatCurrency(pr.amount)}</p>
                    <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded-full inline-block mt-1 ${
                      pr.status === 'pending_payment' ? 'bg-amber-100 text-amber-700' :
                      pr.status === 'paid_awaiting_confirmation' ? 'bg-blue-100 text-blue-700' :
                      pr.status === 'completed' ? 'bg-green-100 text-green-700' :
                      pr.status === 'disputed' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>{pr.status === 'pending_payment' ? t('status_pending') : pr.status === 'paid_awaiting_confirmation' ? t('status_awaiting') : pr.status}</span>
                  </div>
                </div>
                {(pr.shopkeepers?.easypaisa_account || pr.shopkeepers?.jazzcash_account || pr.shopkeepers?.payment_info) && (
                  <div className="bg-gray-50 rounded-xl p-2 text-[10px] text-gray-600">
                    {t('text_pay_to')}: <span className="font-bold">{pr.shopkeepers?.easypaisa_account || pr.shopkeepers?.jazzcash_account || pr.shopkeepers?.payment_info}</span>
                  </div>
                )}
                <p className="text-[10px] text-gray-400">{new Date(pr.created_at).toLocaleString()}</p>
              </div>
              {/* Actions */}
              {pr.status === 'pending_payment' && selectedPayout?.id !== pr.id && (
                <div className="px-4 pb-3 flex gap-2">
                  <button onClick={() => { setSelectedPayout(pr); setPayoutAction('pay'); }} className="flex-1 py-2.5 bg-orange-600 text-white rounded-xl text-xs font-bold">{t('btn_mark_paid')}</button>
                  <button onClick={() => { setSelectedPayout(pr); setPayoutAction('reject'); }} className="px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-xs font-bold">{t('btn_reject')}</button>
                </div>
              )}
              {pr.status === 'disputed' && selectedPayout?.id !== pr.id && (
                <div className="px-4 pb-3">
                  <button onClick={() => { setSelectedPayout(pr); setPayoutAction('resolve'); }} className="w-full py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold">{t('btn_resolve_dispute')}</button>
                </div>
              )}
              {/* Inline form for selected payout */}
              {selectedPayout?.id === pr.id && payoutAction === 'pay' && (
                <div className="px-4 pb-4 space-y-3 border-t border-gray-50 pt-3">
                  {/* Payment proof photo */}
                  <button onClick={pickPayoutProofImage}
                    className="w-full h-28 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-1 active:scale-[0.98] transition-all overflow-hidden relative">
                    {payoutProofImage
                      ? <img src={payoutProofImage} className="absolute inset-0 w-full h-full object-cover rounded-2xl" alt="proof" />
                      : <><Upload className="w-6 h-6 text-gray-400" /><span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{t('form_take_upload')}</span></>
                    }
                  </button>
                  {payoutProofImage && (
                    <button onClick={() => setPayoutProofImage(null)} className="text-[10px] text-red-400 font-bold uppercase tracking-widest w-full text-center">{t('text_remove_photo')}</button>
                  )}
                  <input placeholder={t('form_txn_id')} className="w-full p-3 bg-gray-50 rounded-xl text-sm" value={payoutTxnId} onChange={e => setPayoutTxnId(e.target.value)} />
                  <select className="w-full p-3 bg-gray-50 rounded-xl text-sm" value={payoutMethod} onChange={e => setPayoutMethod(e.target.value)}>
                    <option value="easypaisa">EasyPaisa</option>
                    <option value="jazzcash">JazzCash</option>
                    <option value="raast">Raast</option>
                  </select>
                  <div className="flex gap-2">
                    <button disabled={isPayoutSubmitting || !payoutProofImage || !payoutTxnId} onClick={async () => {
                      setIsPayoutSubmitting(true);
                      try { await adminMarkPayoutPaid(pr.id, payoutProofImage!, payoutTxnId, payoutMethod); setPayoutProofImage(null); setPayoutTxnId(''); setSelectedPayout(null); setPayoutAction(null); setPayoutRequests(await getAdminPayoutRequests(payoutFilter as any)); }
                      catch (e: any) { alert(e.message); } finally { setIsPayoutSubmitting(false); }
                    }} className="flex-1 py-3 bg-orange-600 text-white rounded-xl font-bold text-sm disabled:opacity-50">{isPayoutSubmitting ? t('btn_saving') : t('btn_confirm_paid')}</button>
                    <button onClick={() => { setSelectedPayout(null); setPayoutAction(null); setPayoutProofImage(null); }} className="px-4 py-3 bg-gray-100 rounded-xl text-sm font-bold">{t('btn_cancel')}</button>
                  </div>
                </div>
              )}
              {selectedPayout?.id === pr.id && payoutAction === 'reject' && (
                <div className="px-4 pb-4 space-y-2 border-t border-gray-50 pt-3">
                  <input placeholder={t('form_rejection_reason')} className="w-full p-3 bg-gray-50 rounded-xl text-sm" value={payoutRejectReason} onChange={e => setPayoutRejectReason(e.target.value)} />
                  <div className="flex gap-2">
                    <button disabled={isPayoutSubmitting || !payoutRejectReason} onClick={async () => {
                      setIsPayoutSubmitting(true);
                      try { await adminRejectPayout(pr.id, payoutRejectReason); setPayoutRejectReason(''); setSelectedPayout(null); setPayoutAction(null); setPayoutRequests(await getAdminPayoutRequests(payoutFilter as any)); }
                      catch (e: any) { alert(e.message); } finally { setIsPayoutSubmitting(false); }
                    }} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-sm disabled:opacity-50">{isPayoutSubmitting ? t('btn_rejecting') : t('btn_reject_request')}</button>
                    <button onClick={() => { setSelectedPayout(null); setPayoutAction(null); }} className="px-4 py-3 bg-gray-100 rounded-xl text-sm font-bold">{t('btn_cancel')}</button>
                  </div>
                </div>
              )}
              {selectedPayout?.id === pr.id && payoutAction === 'resolve' && (
                <div className="px-4 pb-4 space-y-2 border-t border-gray-50 pt-3">
                  <p className="text-xs text-gray-500">{t('text_dispute_note')}: <span className="font-semibold text-red-600">{pr.dispute_note}</span></p>
                  <button onClick={pickPayoutProofImage}
                    className="w-full h-20 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-1 active:scale-[0.98] transition-all overflow-hidden relative">
                    {payoutProofImage
                      ? <img src={payoutProofImage} className="absolute inset-0 w-full h-full object-cover rounded-2xl" alt="proof" />
                      : <><Upload className="w-5 h-5 text-gray-400" /><span className="text-[9px] text-gray-400 font-bold uppercase">{t('text_new_screenshot')}</span></>
                    }
                  </button>
                  <input placeholder={t('form_new_txn_id')} className="w-full p-3 bg-gray-50 rounded-xl text-sm" value={payoutTxnId} onChange={e => setPayoutTxnId(e.target.value)} />
                  <div className="flex gap-2">
                    <button disabled={isPayoutSubmitting} onClick={async () => {
                      setIsPayoutSubmitting(true);
                      try { await adminResolveDispute(pr.id, 'reupload', payoutProofImage || undefined, payoutTxnId || undefined); setPayoutProofImage(null); setPayoutTxnId(''); setSelectedPayout(null); setPayoutAction(null); setPayoutRequests(await getAdminPayoutRequests(payoutFilter as any)); }
                      catch (e: any) { alert(e.message); } finally { setIsPayoutSubmitting(false); }
                    }} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-xs disabled:opacity-50">{t('btn_reupload_proof')}</button>
                    <button disabled={isPayoutSubmitting} onClick={async () => {
                      setIsPayoutSubmitting(true);
                      try { await adminResolveDispute(pr.id, 'complete'); setSelectedPayout(null); setPayoutAction(null); setPayoutRequests(await getAdminPayoutRequests(payoutFilter as any)); }
                      catch (e: any) { alert(e.message); } finally { setIsPayoutSubmitting(false); }
                    }} className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold text-xs disabled:opacity-50">{t('btn_mark_complete')}</button>
                    <button onClick={() => { setSelectedPayout(null); setPayoutAction(null); }} className="px-3 py-3 bg-gray-100 rounded-xl text-xs font-bold">✕</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </Modal>

      {/* Admin Reports Modal */}
      <Modal isOpen={view === 'reports'} onClose={() => setView('')} title={t('modal_platform_analytics')}>
         {reportsData ? (
           <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-primary/5 p-4 rounded-2xl">
                    <p className="text-[10px] font-bold text-primary uppercase">{t('analytics_total_pledged')}</p>
                    <p className="text-xl font-display font-bold text-primary">{formatCurrency(reportsData.totalPledged)}</p>
                 </div>
                 <div className="bg-blue-50 p-4 rounded-2xl">
                    <p className="text-[10px] font-bold text-blue-600 uppercase">{t('analytics_goods_distributed')}</p>
                    <p className="text-xl font-display font-bold text-blue-600">{formatCurrency(reportsData.totalSpending)}</p>
                 </div>
              </div>
              <div className="bg-gray-50 p-6 rounded-3xl flex justify-between items-center">
                 <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">{t('analytics_active_donees')}</p>
                    <p className="text-2xl font-display font-bold text-slate-900">{reportsData.activeDonees}</p>
                 </div>
                 <Users className="w-10 h-10 text-gray-200" />
              </div>
              <p className="text-[10px] text-center text-gray-400 italic mt-12">{t('text_data_realtime')}</p>
           </div>
         ) : <Loader2 className="w-8 h-8 animate-spin mx-auto" />}
      </Modal>

      {/* Admin Audit Logs Modal */}
      <Modal isOpen={view === 'audit_logs'} onClose={() => setView('')} title={t('modal_audit_logs')}>
         <div className="space-y-2 max-h-[60vh]">
            {auditLogs.map((log, i) => (
              <div key={i} className="p-3 border-b border-gray-50 flex items-start space-x-3">
                 <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                 <div>
                    <p className="text-xs font-bold text-slate-900">{log.action.replace(/_/g, ' ')}</p>
                    <p className="text-[10px] text-gray-400">{log.profiles?.full_name} - {new Date(log.created_at).toLocaleString()}</p>
                 </div>
              </div>
            ))}
         </div>
      </Modal>

      {/* Notifications Modal */}
      <Modal isOpen={view === 'notifications'} onClose={() => setView('')} title={t('modal_notifications')}>
        <div className="space-y-3">
          {notifications.length === 0 && (
            <div className="text-center py-12">
              <Bell className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-xs italic">{t('text_no_notifications')}</p>
            </div>
          )}
          {notifications.map(notif => (
            <button
              key={notif.id}
              onClick={() => markNotificationRead(notif.id)}
              className={cn(
                "w-full p-4 rounded-2xl border text-left transition-all active:scale-[0.98]",
                notif.is_read ? "bg-white border-gray-100" : "bg-primary/5 border-primary/20"
              )}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className={cn("text-sm font-bold", notif.is_read ? "text-gray-600" : "text-slate-900")}>{notif.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{notif.message}</p>
                </div>
                {!notif.is_read && <div className="w-2 h-2 bg-primary rounded-full mt-1 ml-2 flex-shrink-0" />}
              </div>
              <p className="text-[9px] text-gray-400 mt-2">{new Date(notif.created_at).toLocaleString()}</p>
            </button>
          ))}
        </div>
      </Modal>

      {/* Pledge modal removed in v2 — donors no longer pledge manually */}

      {/* Donor Payment to Shopkeeper Modal */}
      <Modal
        isOpen={!!selectedPayment}
        onClose={() => { setSelectedPayment(null); setProofImage(null); }}
        title={`${t('text_pay')} ${selectedPayment?.shop_name || ''}`}
      >
        {selectedPayment && (
          <div className="space-y-6">
            <div className="bg-amber-50 p-5 rounded-3xl space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">{t('text_total_due')}</p>
                <p className="text-2xl font-display font-bold text-amber-600">{formatCurrency(selectedPayment.total_unpaid)}</p>
              </div>
              <div className="space-y-1">
                {selectedPayment.spending_records.map(rec => (
                  <div key={rec.id} className="flex justify-between text-xs text-gray-600 py-1 border-b border-amber-100 last:border-0">
                    <span>{rec.donees?.full_name}: {rec.items_description}</span>
                    <span className="font-bold">{formatCurrency(rec.amount)}</span>
                  </div>
                ))}
              </div>
            </div>

            {(selectedPayment.payment_info || selectedPayment.jazzcash_account || selectedPayment.easypaisa_account) ? (
              <div className="bg-gray-50 p-5 rounded-3xl space-y-3">
                <label className="text-[10px] font-bold uppercase text-gray-400 ml-2 block">{t('text_pay_with')}:</label>

                {/* EasyPaisa */}
                <div className="space-y-2">
                  {(selectedPayment.easypaisa_account || selectedPayment.payment_info) && (
                    <div className="bg-white p-3 rounded-2xl border border-gray-200 flex items-center justify-between">
                      <p className="text-sm font-display font-bold text-[#006A4E] tracking-tight">{selectedPayment.easypaisa_account || selectedPayment.payment_info}</p>
                      {isCopied ? (
                        <span className="text-green-500 flex items-center text-[10px] font-bold uppercase"><Check className="w-3 h-3 mr-1" /> {t('text_copied')}</span>
                      ) : (
                        <button onClick={() => copyToClipboard((selectedPayment.easypaisa_account || selectedPayment.payment_info)!.replace(/\D/g, ''))} className="text-primary flex items-center hover:opacity-70 text-[10px] font-bold uppercase">
                          <Copy className="w-3 h-3 mr-1" /> {t('btn_copy')}
                        </button>
                      )}
                    </div>
                  )}
                  <button
                    onClick={() => handlePayShopkeeper('easypaisa')}
                    disabled={!(selectedPayment.easypaisa_account || selectedPayment.payment_info)}
                    className="w-full group relative overflow-hidden bg-white border border-gray-100 p-1.5 rounded-[28px] active:scale-[0.97] transition-all shadow-sm disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <div className="flex items-center p-3 rounded-[22px] bg-[#006A4E]/5 group-hover:bg-[#006A4E] transition-all duration-500">
                      <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center p-2 mr-4">
                        <span className="text-[#006A4E] font-black text-2xl">e</span>
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-display font-bold text-slate-900 group-hover:text-white text-base leading-tight">EasyPaisa</p>
                        <p className="text-[10px] font-bold text-slate-500 group-hover:text-white/80 uppercase tracking-tighter">
                          {(selectedPayment.easypaisa_account || selectedPayment.payment_info) ? t('text_pay_directly') : t('text_not_available')}
                        </p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-[#006A4E] group-hover:text-white" />
                    </div>
                  </button>
                </div>

                {/* JazzCash */}
                <div className="space-y-2">
                  {(selectedPayment.jazzcash_account || selectedPayment.payment_info) && (
                    <div className="bg-white p-3 rounded-2xl border border-gray-200 flex items-center justify-between">
                      <p className="text-sm font-display font-bold text-red-600 tracking-tight">{selectedPayment.jazzcash_account || selectedPayment.payment_info}</p>
                      {isCopied ? (
                        <span className="text-green-500 flex items-center text-[10px] font-bold uppercase"><Check className="w-3 h-3 mr-1" /> {t('text_copied')}</span>
                      ) : (
                        <button onClick={() => copyToClipboard((selectedPayment.jazzcash_account || selectedPayment.payment_info)!.replace(/\D/g, ''))} className="text-primary flex items-center hover:opacity-70 text-[10px] font-bold uppercase">
                          <Copy className="w-3 h-3 mr-1" /> {t('btn_copy')}
                        </button>
                      )}
                    </div>
                  )}
                  <button
                    onClick={() => handlePayShopkeeper('jazzcash')}
                    disabled={!(selectedPayment.jazzcash_account || selectedPayment.payment_info)}
                    className="w-full group relative overflow-hidden bg-white border border-gray-100 p-1.5 rounded-[28px] active:scale-[0.97] transition-all shadow-sm disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <div className="flex items-center p-3 rounded-[22px] bg-red-50 group-hover:bg-red-600 transition-all duration-500">
                      <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center p-2 mr-4">
                        <span className="text-red-600 font-black text-2xl">J</span>
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-display font-bold text-slate-900 group-hover:text-white text-base leading-tight">JazzCash</p>
                        <p className="text-[10px] font-bold text-slate-500 group-hover:text-white/80 uppercase tracking-tighter">
                          {(selectedPayment.jazzcash_account || selectedPayment.payment_info) ? t('text_raast_p2p') : t('text_not_available')}
                        </p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-red-600 group-hover:text-white" />
                    </div>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 p-5 rounded-3xl flex items-center space-x-3">
                <AlertTriangle className="w-6 h-6 text-amber-500" />
                <p className="text-xs text-amber-700">{t('alert_no_payment_info')}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-gray-400 ml-4">{t('text_upload_proof')}</label>
              <button
                onClick={pickProofImage}
                className={cn(
                  "w-full flex flex-col items-center justify-center space-y-2 py-6 border-2 border-dashed rounded-3xl transition-all",
                  proofImage ? "border-green-500 bg-green-50" : "border-gray-200 text-gray-400"
                )}
              >
                {proofImage ? (
                  <>
                    <div className="w-16 h-16 rounded-xl overflow-hidden shadow-md">
                       <img src={proofImage} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[10px] font-bold text-green-600 uppercase">{t('text_screenshot_selected')}</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-6 h-6 mb-1" />
                    <span className="font-bold text-sm">{t('text_select_screenshot')}</span>
                    <p className="text-[9px] opacity-60">{t('text_upload_confirm_screen')}</p>
                  </>
                )}
              </button>
            </div>

            <button
              disabled={isSubmitting || !proofImage}
              onClick={handleSubmitPaymentProof}
              className="w-full bg-slate-900 text-white py-5 rounded-[24px] font-bold shadow-xl shadow-slate-900/20 disabled:opacity-50"
            >
              {isSubmitting ? t('btn_submitting') : t('btn_submit_proof')}
            </button>
            <p className="text-[10px] text-center text-gray-400 italic">{t('text_pay_externally')}</p>
          </div>
        )}
      </Modal>
    </div>
  );
};

const ScanPage = () => {
  const { recordSpending, user } = useAuth();
  const { t } = useLanguage();
  const [step, setStep] = useState<'scanning' | 'amount' | 'success'>('scanning');
  const [amount, setAmount] = useState('');
  const [items, setItems] = useState('');
  const [scannedQr, setScannedQr] = useState('');
  const [scannedDonee, setScannedDonee] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (step === 'scanning' && user?.role === 'shopkeeper') {
      const html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;

      const config = { fps: 10, qrbox: { width: 250, height: 250 } };

      html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          html5QrCode.stop().then(() => {
            handleScan(decodedText);
          });
        },
        () => {}
      ).catch(err => {
        console.error("Camera access error:", err);
      });

      return () => {
        if (scannerRef.current?.isScanning) {
          scannerRef.current.stop();
        }
      };
    }
  }, [step, user]);

  const handleScan = async (code: string) => {
    setScannedQr(code);
    setLoading(true);
    try {
      const { data: donee, error } = await supabase
        .from('donees')
        .select('full_name, funded_credit')
        .eq('spending_qr_code', code)
        .single();

      if (error || !donee) throw new Error('Donee not found or invalid QR');
      setScannedDonee(donee);
      setStep('amount');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      await recordSpending(scannedQr, parseFloat(amount), items);
      setStep('success');
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (user?.role !== 'shopkeeper') return <Navigate to="/home" />;

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 space-y-8">
      {step === 'scanning' && (
        <div className="w-full max-w-sm text-center space-y-6">
          <h1 className="text-2xl font-display font-bold text-primary">{t('scan_title')}</h1>
          <div className="aspect-square bg-black rounded-[40px] border-4 border-white shadow-2xl overflow-hidden relative">
             <div id="reader" className="w-full h-full object-cover"></div>
             {loading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                  <Loader2 className="w-12 h-12 text-white animate-spin" />
                </div>
             )}
          </div>
          <div className="flex flex-col space-y-4">
             <p className="text-xs text-gray-400">{t('scan_position_hint')}</p>
             <button onClick={() => handleScan('DONEE-123')} className="text-[10px] font-black text-primary/40 uppercase tracking-widest hover:text-primary transition-colors">{t('scan_simulate')}</button>
          </div>
        </div>
      )}

      {step === 'amount' && (
        <div className="w-full max-w-sm space-y-8 animate-in slide-in-from-right duration-300">
           <div className="text-center space-y-1">
             <h2 className="text-2xl font-display font-bold">{t('scan_record_spending')}</h2>
             <p className="text-sm text-gray-400">{t('scan_identity')}: {scannedDonee?.full_name}</p>
             <p className="text-[10px] font-black text-primary uppercase">{t('scan_available_credit')}: {formatCurrency(scannedDonee?.funded_credit || 0)}</p>
           </div>
           <div className="space-y-4">
             <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
               <div className="flex items-center space-x-3 text-primary justify-center">
                 <span className="font-bold">PKR</span>
                 <input
                   type="number"
                   className="text-4xl font-display font-bold text-center outline-none w-full bg-gray-50/50 rounded-2xl py-2"
                   value={amount}
                   onChange={e => setAmount(e.target.value)}
                   placeholder="0"
                 />
               </div>
               <input
                 type="text"
                 placeholder={t('scan_items_placeholder')}
                 className="w-full p-4 bg-gray-50 rounded-2xl text-sm border-none focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                 value={items}
                 onChange={e => setItems(e.target.value)}
               />
             </div>
             <button onClick={handleSubmit} className="w-full bg-primary text-white py-5 rounded-[24px] font-bold shadow-xl shadow-primary/20 active:scale-95 transition-all flex items-center justify-center space-x-2">
               <span>{t('scan_confirm_release')}</span>
               <ArrowRight className="w-5 h-5" />
             </button>
           </div>
        </div>
      )}

      {step === 'success' && (
        <div className="text-center space-y-6 animate-in zoom-in duration-300">
          <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center text-white mx-auto shadow-xl shadow-primary/20">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-display font-bold">{t('scan_record_submitted')}</h2>
          <p className="text-gray-400 text-sm">{t('scan_ledger_updated')}</p>
          <Link to="/home" className="inline-block text-primary font-bold uppercase text-[10px] tracking-widest">{t('btn_back_dashboard')}</Link>
        </div>
      )}
    </div>
  );
};

const LoginPage = () => {
  const { login } = useAuth();
  const { t } = useLanguage();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!phone) return;
    setLoading(true);
    try {
      await login(phone);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-8 justify-center bg-white max-w-md mx-auto">
      <div className="text-center mb-10">
        <img src="/inapp-logo.webp" alt="HaqDaar" className="w-56 mx-auto mb-2 object-contain" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-1">{t('login_pledge_transparency')}</p>
      </div>

      <div className="space-y-6">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-gray-400 ml-4 tracking-widest">{t('login_enter_phone')}</label>
          <input
            type="text"
            placeholder="03001234567"
            className="w-full p-5 bg-gray-50 rounded-[24px] border-2 border-transparent focus:border-primary outline-none font-mono font-bold"
            value={phone}
            onChange={e => setPhone(e.target.value)}
          />
        </div>

        <button onClick={handleLogin} disabled={loading} className="w-full bg-primary text-white py-5 rounded-[28px] font-bold shadow-xl shadow-primary/20 flex items-center justify-center space-x-2 active:scale-95 transition-all">
          {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <span className="uppercase tracking-widest text-sm">{t('login_btn')}</span>}
        </button>

        <p className="text-[10px] text-center text-gray-400 font-bold uppercase tracking-wider">
          {t('login_auto_role')}
        </p>
      </div>
    </div>
  );
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  const role = user?.role?.toLowerCase() || '';
  const navItems = [
    { icon: Home, labelKey: 'nav_home' as const, path: '/home' },
    { icon: Scan, labelKey: 'nav_scan' as const, path: '/scan', showOnly: ['shopkeeper'] },
    { icon: Users, labelKey: 'nav_donees' as const, path: '/admin/manage', showOnly: ['admin'] },
    { icon: ShoppingBag, labelKey: 'nav_shops' as const, path: '/admin/shopkeepers', showOnly: ['admin'] },
    { icon: Building2, labelKey: 'nav_deposits' as const, path: '/admin/deposits', showOnly: ['admin'] },
    { icon: Target, labelKey: 'nav_allocate' as const, path: '/admin/allocation', showOnly: ['admin'] },
    { icon: Sparkles, labelKey: 'nav_impact' as const, path: '/impact', showOnly: ['donor'] },
    { icon: Heart, labelKey: 'nav_families' as const, path: '/donor/families', showOnly: ['donor'] },
    { icon: FileText, labelKey: 'nav_txns' as const, path: '/donor/transactions', showOnly: ['donor'] },
    { icon: History, labelKey: 'nav_history' as const, path: '/history', showOnly: ['shopkeeper'] },
    { icon: BarChart3, labelKey: 'nav_analytics' as const, path: '/analytics' },
    { icon: User, labelKey: 'nav_profile' as const, path: '/profile' },
  ].filter(item => !item.showOnly || item.showOnly.includes(role));

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col relative border-x border-gray-100">
      <main className="flex-1 px-6 pb-32 overflow-x-hidden">{children}</main>
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-100 px-6 pt-4 pb-8 flex justify-between items-center z-50 rounded-t-[40px] shadow-lg">
        {navItems.map(item => (
          <Link key={item.path} to={item.path} className={cn("flex flex-col items-center space-y-1 flex-1", location.pathname === item.path ? "text-primary" : "text-gray-300")}>
            <item.icon className="w-6 h-6" />
            <span className="text-[9px] font-bold uppercase tracking-widest">{t(item.labelKey)}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
};

const AdminManagePage = () => {
  const { user, registerDonee, updateDonee, getAdminDonees } = useAuth();
  const { t } = useLanguage();
  const [adminDoneeList, setAdminDoneeList] = useState<Donee[]>([]);
  const [editingDonee, setEditingDonee] = useState<Donee | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  const [newDonee, setNewDonee] = useState({
    full_name: '',
    city: '',
    area: '',
    phone: '',
    qr: '',
    receiving_account_title: '',
    receiving_method: 'EasyPaisa'
  });

  useEffect(() => {
    getAdminDonees().then(setAdminDoneeList);
  }, []);

  useEffect(() => {
    if (editingDonee) {
      setNewDonee({
        full_name: editingDonee.full_name,
        city: editingDonee.city,
        area: editingDonee.area,
        phone: editingDonee.receiving_account_masked || '',
        qr: editingDonee.spending_qr_code,
        receiving_account_title: editingDonee.receiving_account_title || '',
        receiving_method: editingDonee.receiving_method || 'EasyPaisa'
      });
      setIsRegisterModalOpen(true);
    } else {
      setNewDonee({ full_name: '', city: '', area: '', phone: '', qr: '', receiving_account_title: '', receiving_method: 'EasyPaisa' });
    }
  }, [editingDonee]);

  const handleRegister = async () => {
    if (!newDonee.full_name || !newDonee.qr || !newDonee.phone) {
      alert('Please fill in name, phone number, and QR code.');
      return;
    }
    setIsSubmitting(true);
    try {
      const data = {
        full_name: newDonee.full_name,
        city: newDonee.city,
        area: newDonee.area,
        spending_qr_code: newDonee.qr,
        receiving_method: newDonee.receiving_method,
        receiving_account_masked: newDonee.phone,
        receiving_account_title: newDonee.receiving_account_title
      };

      if (editingDonee) {
        await updateDonee(editingDonee.id, data);
        alert(t('alert_donee_updated'));
      } else {
        await registerDonee(data);
        alert(t('alert_donee_registered'));
        window.print();
      }

      setIsRegisterModalOpen(false);
      setEditingDonee(null);
      getAdminDonees().then(setAdminDoneeList);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await updateDonee(id, { status } as any);
      setAdminDoneeList(adminDoneeList.map(d => d.id === id ? { ...d, status } : d));
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (user?.role !== 'admin') return <Navigate to="/home" />;

  return (
    <div className="space-y-6 py-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-display font-bold text-primary">{t('home_manage_donees')}</h1>
        <button
          onClick={() => { setEditingDonee(null); setIsRegisterModalOpen(true); }}
          className="p-3 bg-primary text-white rounded-2xl flex items-center space-x-2 active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-widest">{t('btn_new_donee')}</span>
        </button>
      </div>

      <div className="grid gap-4">
        {adminDoneeList.map(donee => (
          <div key={donee.id} className="p-5 bg-white rounded-[32px] border border-gray-100 shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-xl font-bold text-primary">
                  {donee.full_name.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-slate-900">{donee.full_name}</p>
                  <p className="text-[10px] uppercase text-gray-400 font-bold">{donee.city}, {donee.area}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-black text-primary uppercase">{t('text_available_credit')}</p>
                <p className="text-sm font-bold text-slate-700">{formatCurrency(donee.funded_credit || 0)}</p>
                <div className={cn("mt-1 px-3 py-1 rounded-full text-[8px] font-black uppercase inline-block", donee.status === 'approved' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")}>
                  {donee.status}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-50">
               <div className="space-y-1">
                 <p className="text-[8px] font-black text-gray-300 uppercase">{t('form_unique_qr')}</p>
                 <p className="text-xs font-mono font-bold text-primary">{donee.spending_qr_code}</p>
               </div>
               <div className="flex space-x-2">
                  <button
                    onClick={() => handleUpdateStatus(donee.id, donee.status === 'approved' ? 'paused' : 'approved')}
                    className="p-2 bg-gray-50 rounded-xl text-gray-400 hover:text-primary transition-colors"
                  >
                    {donee.status === 'approved' ? <X className="w-5 h-5" /> : <Check className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => setEditingDonee(donee)}
                    className="p-2 bg-primary/5 text-primary rounded-xl active:scale-95 transition-all"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
               </div>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isRegisterModalOpen} onClose={() => { setIsRegisterModalOpen(false); setEditingDonee(null); }} title={editingDonee ? t('modal_edit_donee') : t('modal_register_donee')}>
         <div className="space-y-4 print:p-0">
            <div className="print:hidden space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-gray-400 ml-2">{t('form_personal_details')}</label>
                <input placeholder={t('form_full_name')} className="w-full p-4 bg-gray-50 rounded-2xl border-none text-sm" value={newDonee.full_name} onChange={e => setNewDonee({...newDonee, full_name: e.target.value})} />
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder={t('form_city')} className="p-4 bg-gray-50 rounded-2xl border-none text-sm" value={newDonee.city} onChange={e => setNewDonee({...newDonee, city: e.target.value})} />
                  <input placeholder={t('form_area')} className="p-4 bg-gray-50 rounded-2xl border-none text-sm" value={newDonee.area} onChange={e => setNewDonee({...newDonee, area: e.target.value})} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-gray-400 ml-2">{t('form_account_id')}</label>
                <select className="w-full p-4 bg-gray-50 rounded-2xl border-none text-sm mb-2" value={newDonee.receiving_method} onChange={e => setNewDonee({...newDonee, receiving_method: e.target.value})}>
                  <option value="EasyPaisa">EasyPaisa</option>
                  <option value="JazzCash">JazzCash</option>
                  <option value="Raast">{t('form_raast_bank')}</option>
                </select>
                <input placeholder={t('form_account_title')} className="w-full p-4 bg-gray-50 rounded-2xl border-none text-sm" value={newDonee.receiving_account_title} onChange={e => setNewDonee({...newDonee, receiving_account_title: e.target.value})} />
                <input placeholder={t('form_account_number_short')} className="w-full p-4 bg-gray-50 rounded-2xl border-none text-sm" value={newDonee.phone} onChange={e => setNewDonee({...newDonee, phone: e.target.value})} />
                <input placeholder={t('form_unique_qr')} className="w-full p-4 bg-gray-50 rounded-2xl border-none text-sm" value={newDonee.qr} onChange={e => setNewDonee({...newDonee, qr: e.target.value})} />
              </div>
            </div>

            <div className={cn("p-6 border-2 border-primary rounded-3xl bg-white flex flex-col items-center space-y-3 shadow-sm", newDonee.full_name ? "block" : "hidden print:hidden")}>
               <div className="w-full flex justify-between items-center border-b border-primary/20 pb-2">
                  <h4 className="font-display font-bold text-primary text-sm">{t('form_haqdaar_id')}</h4>
                  <span className="text-[8px] font-black uppercase text-gray-400">{t('form_verified_identity')}</span>
               </div>
               <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center text-3xl font-bold text-primary">
                  {newDonee.full_name.charAt(0) || '?'}
               </div>
               <div className="text-center">
                  <p className="font-display font-bold text-lg leading-tight">{newDonee.full_name || t('text_donee_name')}</p>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{newDonee.city}, {newDonee.area}</p>
               </div>
               <div className="bg-white p-2 rounded-xl border border-gray-100">
                  <QRCodeSVG value={newDonee.qr || 'PENDING'} size={100} />
               </div>
               <p className="font-mono text-[10px] font-bold text-primary">{newDonee.qr}</p>
            </div>

            <button
              onClick={handleRegister}
              disabled={isSubmitting}
              className="print:hidden w-full bg-primary text-white py-4 rounded-2xl font-bold uppercase tracking-widest disabled:opacity-50 mt-2 mb-8"
            >
              {isSubmitting ? t('btn_processing') : (editingDonee ? t('btn_update_donee') : t('btn_register_print'))}
            </button>
         </div>
      </Modal>
    </div>
  );
};

const AdminDonorPage = () => {
  const { user, getAdminDonors, registerDonor, updateDonor } = useAuth();
  const { t } = useLanguage();
  const [donors, setDonors] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDonor, setEditingDonor] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newPhone, setNewPhone] = useState<string | null>(null);
  const [formData, setFormData] = useState({ full_name: '', phone: '' });

  const loadDonors = () => getAdminDonors().then(setDonors);
  useEffect(() => { loadDonors(); }, []);

  useEffect(() => {
    if (editingDonor) {
      setFormData({ full_name: editingDonor.full_name || '', phone: editingDonor.phone || '' });
      setIsModalOpen(true);
    } else {
      setFormData({ full_name: '', phone: '' });
    }
  }, [editingDonor]);

  const handleSave = async () => {
    if (!formData.full_name.trim()) { alert(t('alert_enter_donor_name')); return; }
    setIsSubmitting(true);
    try {
      if (editingDonor) {
        await updateDonor(editingDonor.id, { full_name: formData.full_name });
        alert(t('alert_donor_updated'));
        setIsModalOpen(false);
        setEditingDonor(null);
      } else {
        const result = await registerDonor(formData.full_name, formData.phone || undefined);
        setNewPhone(result.phone);
        setIsModalOpen(false);
        setFormData({ full_name: '', phone: '' });
      }
      loadDonors();
    } catch (e: any) { alert(e.message); }
    setIsSubmitting(false);
  };

  const handleToggleStatus = async (donor: any) => {
    const newStatus = donor.status === 'active' ? 'blocked' : 'active';
    try { await updateDonor(donor.id, { status: newStatus }); loadDonors(); }
    catch (e: any) { alert(e.message); }
  };

  if (user?.role !== 'admin') return <Navigate to="/home" />;

  return (
    <div className="space-y-6 py-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-display font-bold text-primary">{t('home_manage_donors')}</h1>
        <button
          onClick={() => { setEditingDonor(null); setNewPhone(null); setIsModalOpen(true); }}
          className="p-3 bg-primary text-white rounded-2xl flex items-center space-x-2 active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-widest">{t('btn_new_donor')}</span>
        </button>
      </div>

      {/* New phone reveal card */}
      {newPhone && (
        <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-[24px] space-y-2">
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest">{t('text_donor_created')}</p>
          <p className="text-sm text-emerald-800">{t('text_share_phone')}</p>
          <div className="flex items-center gap-3 bg-white rounded-2xl p-3 border border-emerald-200">
            <p className="text-2xl font-display font-bold text-emerald-700 flex-1">{newPhone}</p>
            <button onClick={() => { navigator.clipboard?.writeText(newPhone); }} className="text-[10px] font-bold text-emerald-600 uppercase">{t('btn_copy')}</button>
          </div>
          <button onClick={() => setNewPhone(null)} className="text-[10px] text-gray-400 font-bold uppercase">{t('btn_dismiss')}</button>
        </div>
      )}

      <div className="grid gap-4">
        {donors.length === 0 && <p className="text-center text-gray-400 py-12">{t('text_no_donors_hint')}</p>}
        {donors.map(donor => (
          <div key={donor.id} className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-slate-900">{donor.full_name}</p>
                <p className="text-sm text-gray-500 font-mono mt-0.5">{donor.phone}</p>
                <p className="text-[10px] text-gray-400 mt-1">{t('text_joined')} {new Date(donor.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded-full ${donor.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {donor.status}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => setEditingDonor(donor)} className="text-[10px] font-bold text-primary uppercase px-3 py-1.5 bg-primary/5 rounded-xl">{t('btn_edit')}</button>
                  <button onClick={() => handleToggleStatus(donor)} className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-xl ${donor.status === 'active' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                    {donor.status === 'active' ? t('btn_block') : t('btn_unblock')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingDonor(null); }} title={editingDonor ? t('modal_edit_donor') : t('modal_register_donor')}>
        <div className="space-y-4">
          <div className="space-y-2">
            <input
              placeholder={t('form_full_name')}
              className="w-full p-4 bg-gray-50 rounded-2xl border-none text-sm"
              value={formData.full_name}
              onChange={e => setFormData(f => ({ ...f, full_name: e.target.value }))}
            />
            {!editingDonor && (
              <div className="space-y-1">
                <input
                  placeholder={t('form_phone_autogen')}
                  className="w-full p-4 bg-gray-50 rounded-2xl border-none text-sm font-mono"
                  value={formData.phone}
                  onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))}
                />
                <p className="text-[10px] text-gray-400 ml-2">{t('form_phone_hint')}</p>
              </div>
            )}
            {editingDonor && (
              <div className="bg-gray-50 p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-gray-400 uppercase">{t('form_login_phone')}</p>
                <p className="text-sm font-mono text-slate-700 mt-1">{editingDonor.phone}</p>
              </div>
            )}
          </div>
          <button
            disabled={isSubmitting}
            onClick={handleSave}
            className="w-full py-4 bg-primary text-white rounded-2xl font-bold disabled:opacity-50 active:scale-95 transition-all"
          >
            {isSubmitting ? t('btn_saving') : editingDonor ? t('btn_save_changes') : t('btn_create_donor')}
          </button>
        </div>
      </Modal>
    </div>
  );
};

const AdminShopkeeperPage = () => {
  const { user, getAdminShopkeepers, registerShopkeeper, updateShopkeeper } = useAuth();
  const { t } = useLanguage();
  const [shops, setShops] = useState<any[]>([]);
  const [editingShop, setEditingShop] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    shop_name: '',
    city: '',
    area: '',
    payment_info: '',
    jazzcash_account: '',
    easypaisa_account: ''
  });

  const [securityByShop, setSecurityByShop] = useState<Record<string, number>>({});
  const loadShops = () => {
    getAdminShopkeepers().then(setShops);
    supabase.from('shopkeeper_security_ledger').select('shopkeeper_id, amount_paisa, event_type').then(({ data }) => {
      const totals: Record<string, number> = {};
      for (const r of data || []) {
        const sign = r.event_type === 'returned' ? -1 : r.event_type === 'deposited' ? 1 : 0;
        totals[r.shopkeeper_id] = (totals[r.shopkeeper_id] || 0) + sign * Number(r.amount_paisa);
      }
      setSecurityByShop(totals);
    });
  };
  useEffect(() => { loadShops(); }, []);

  useEffect(() => {
    if (editingShop) {
      setFormData({
        full_name: editingShop.profiles?.full_name || '',
        phone: editingShop.profiles?.phone || '',
        shop_name: editingShop.shop_name,
        city: editingShop.city || '',
        area: editingShop.area || '',
        payment_info: editingShop.payment_info || '',
        jazzcash_account: editingShop.jazzcash_account || '',
        easypaisa_account: editingShop.easypaisa_account || ''
      });
      setIsModalOpen(true);
    } else {
      setFormData({ full_name: '', phone: '', shop_name: '', city: '', area: '', payment_info: '', jazzcash_account: '', easypaisa_account: '' });
    }
  }, [editingShop]);

  const handleSave = async () => {
    if (!formData.full_name || !formData.phone || !formData.shop_name) {
      alert(t('alert_fill_shop_required'));
      return;
    }
    setIsSubmitting(true);
    try {
      if (editingShop) {
        await updateShopkeeper(editingShop.profile_id,
          {
            shop_name: formData.shop_name,
            city: formData.city,
            area: formData.area,
            payment_info: formData.payment_info,
            jazzcash_account: formData.jazzcash_account,
            easypaisa_account: formData.easypaisa_account
          },
          { full_name: formData.full_name, phone: formData.phone }
        );
        alert(t('alert_shop_updated'));
      } else {
        await registerShopkeeper(formData);
        alert(t('alert_shop_registered'));
      }
      setIsModalOpen(false);
      setEditingShop(null);
      loadShops();
    } catch (e: any) { alert(e.message); }
    setIsSubmitting(false);
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await updateShopkeeper(id, { status } as any);
      loadShops();
    } catch (e: any) { alert(e.message); }
  };

  if (user?.role !== 'admin') return <Navigate to="/home" />;

  return (
    <div className="space-y-6 py-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-display font-bold text-primary">{t('home_manage_shops')}</h1>
        <button
          onClick={() => { setEditingShop(null); setIsModalOpen(true); }}
          className="p-3 bg-primary text-white rounded-2xl flex items-center space-x-2 active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-widest">{t('btn_new_shop')}</span>
        </button>
      </div>

      <div className="grid gap-4">
        {shops.map(shop => (
          <div key={shop.profile_id} className="p-5 bg-white rounded-[32px] border border-gray-100 shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center">
                  <Store className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">{shop.shop_name}</p>
                  <p className="text-[10px] uppercase text-gray-400 font-bold">{shop.profiles?.full_name} - {shop.profiles?.phone}</p>
                  <p className="text-[10px] font-bold text-amber-700 mt-0.5">{t('security_deposit')}: {formatCurrency(Math.max(0, securityByShop[shop.profile_id] || 0) / 100)}</p>
                </div>
              </div>
              <div className={cn("px-3 py-1 rounded-full text-[8px] font-black uppercase", shop.status === 'active' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")}>
                {shop.status}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-50">
               <div className="space-y-1">
                 <p className="text-[8px] font-black text-gray-300 uppercase">{t('form_general_account')}</p>
                 <p className="text-xs font-bold text-slate-600">{shop.payment_info || t('form_not_set')}</p>
                 {(shop.jazzcash_account || shop.easypaisa_account) && (
                   <p className="text-[9px] text-gray-400">
                     {shop.jazzcash_account && `JazzCash: ${shop.jazzcash_account}`}
                     {shop.jazzcash_account && shop.easypaisa_account && ' | '}
                     {shop.easypaisa_account && `EasyPaisa: ${shop.easypaisa_account}`}
                   </p>
                 )}
               </div>
               <div className="flex space-x-2">
                  <button
                    onClick={() => handleUpdateStatus(shop.profile_id, shop.status === 'active' ? 'blocked' : 'active')}
                    className="p-2 bg-gray-50 rounded-xl text-gray-400 hover:text-primary transition-colors"
                  >
                    {shop.status === 'active' ? <X className="w-5 h-5" /> : <Check className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => setEditingShop(shop)}
                    className="p-2 bg-primary/5 text-primary rounded-xl active:scale-95 transition-all"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
               </div>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingShop(null); }} title={editingShop ? t('modal_edit_shop') : t('modal_register_shop')}>
         <div className="space-y-4 pb-10">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-400 ml-2">{t('form_owner_details')}</label>
              <input placeholder={t('form_full_name')} className="w-full p-4 bg-gray-50 rounded-2xl border-none text-sm" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
              <input placeholder={t('form_phone_number')} className="w-full p-4 bg-gray-50 rounded-2xl border-none text-sm" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-400 ml-2">{t('form_shop_details')}</label>
              <input placeholder={t('form_shop_name')} className="w-full p-4 bg-gray-50 rounded-2xl border-none text-sm" value={formData.shop_name} onChange={e => setFormData({...formData, shop_name: e.target.value})} />
              <div className="grid grid-cols-2 gap-2">
                <input placeholder={t('form_city')} className="p-4 bg-gray-50 rounded-2xl border-none text-sm" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                <input placeholder={t('form_area')} className="p-4 bg-gray-50 rounded-2xl border-none text-sm" value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})} />
              </div>
              <input placeholder={t('form_general_account_placeholder')} className="w-full p-4 bg-gray-50 rounded-2xl border-none text-sm" value={formData.payment_info} onChange={e => setFormData({...formData, payment_info: e.target.value})} />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-400 ml-2">{t('form_provider_accounts')}</label>
              <input placeholder={t('form_jazzcash_account')} className="w-full p-4 bg-gray-50 rounded-2xl border-none text-sm" value={formData.jazzcash_account} onChange={e => setFormData({...formData, jazzcash_account: e.target.value})} />
              <input placeholder={t('form_easypaisa_account')} className="w-full p-4 bg-gray-50 rounded-2xl border-none text-sm" value={formData.easypaisa_account} onChange={e => setFormData({...formData, easypaisa_account: e.target.value})} />
              <p className="text-[9px] text-gray-400 italic px-2">{t('form_provider_hint')}</p>
            </div>

            <button
              onClick={handleSave}
              disabled={isSubmitting}
              className="w-full bg-primary text-white py-4 rounded-2xl font-bold uppercase tracking-widest disabled:opacity-50 mt-4"
            >
              {isSubmitting ? t('btn_processing') : (editingShop ? t('btn_update_shop') : t('btn_new_shop'))}
            </button>
         </div>
      </Modal>
    </div>
  );
};

const ImpactPage = () => {
  const { user, myPledges } = useAuth();
  const { t } = useLanguage();
  const [spendingFeed, setSpendingFeed] = useState<any[]>([]);

  useEffect(() => {
    if (user?.role === 'donor') {
      supabase
        .from('pledge_spending_links')
        .select('*, spending_records(*, donees(full_name), profiles!spending_records_shopkeeper_id_fkey(full_name))')
        .eq('donor_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => setSpendingFeed(data || []));
    }
  }, [user, myPledges]);

  if (user?.role?.toLowerCase() !== 'donor') return <Navigate to="/home" />;

  return (
    <div className="space-y-8 py-6">
      <section className="space-y-4">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-display font-bold text-gray-800">{t('impact_title')}</h1>
        </div>

        {/* Active Pledges Summary */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('impact_active_pledges')}</h3>
          {myPledges.filter(p => p.status !== 'cancelled').length === 0 ? (
            <div className="text-center py-8 bg-white rounded-3xl border border-dashed border-gray-200">
              <p className="text-gray-400 text-xs italic">{t('impact_no_pledges')}</p>
            </div>
          ) : (
            myPledges.filter(p => p.status !== 'cancelled').map(pledge => (
              <div key={pledge.id} className="p-4 bg-white rounded-[28px] border border-gray-100 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-slate-900">{pledge.donees?.full_name}</p>
                    <p className="text-[10px] text-gray-400">{new Date(pledge.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-bold text-primary">{formatCurrency(pledge.amount)}</p>
                    <p className={cn("text-[8px] font-bold uppercase px-2 py-0.5 rounded-full inline-block mt-1",
                      pledge.status === 'active' ? "bg-green-100 text-green-700" :
                      pledge.status === 'partially_spent' ? "bg-amber-100 text-amber-700" :
                      "bg-blue-100 text-blue-700"
                    )}>{pledge.status}</p>
                  </div>
                </div>
                <div className="mt-2 bg-gray-50 rounded-xl p-2">
                  <div className="flex justify-between text-[10px] text-gray-500">
                    <span>{t('text_remaining')}</span>
                    <span className="font-bold">{formatCurrency(pledge.remaining_amount)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                    <div
                      className="bg-primary rounded-full h-1.5 transition-all"
                      style={{ width: `${((pledge.amount - pledge.remaining_amount) / pledge.amount) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Spending Feed */}
        <div className="space-y-3 mt-6">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('impact_spending_feed')}</h3>
          {spendingFeed.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-3xl border border-dashed border-gray-200">
              <Heart className="w-10 h-10 text-gray-100 mx-auto mb-2" />
              <p className="text-gray-400 text-xs italic uppercase font-bold tracking-widest">{t('impact_no_spending')}</p>
            </div>
          ) : (
            spendingFeed.map((link, idx) => {
              const rec = link.spending_records;
              if (!rec) return null;
              return (
                <div key={idx} className="p-5 bg-white rounded-[28px] border border-gray-100 shadow-sm space-y-3 relative overflow-hidden group">
                  <div className="flex justify-between items-start relative z-10">
                    <div className="space-y-1">
                      <p className="text-[8px] font-black text-primary uppercase tracking-widest">{t('impact_beneficiary')}</p>
                      <p className="font-bold text-slate-900">{rec.donees?.full_name}</p>
                      <p className="text-[10px] text-gray-400">{t('text_shop')}: {rec.profiles?.full_name || t('text_shopkeeper')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-500">{new Date(rec.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-2xl relative z-10">
                    <p className="text-[8px] font-black text-gray-400 uppercase mb-1">{t('impact_items_released')}</p>
                    <p className="text-xs font-bold text-slate-700 leading-tight">{rec.items_description}</p>
                  </div>

                  <div className="flex justify-between items-center relative z-10 pt-1">
                    <div className="flex items-center space-x-1">
                      <div className={cn("w-2 h-2 rounded-full", rec.payment_status === 'paid' ? "bg-green-500" : "bg-amber-500")} />
                      <span className={cn("text-[9px] font-bold uppercase tracking-tighter", rec.payment_status === 'paid' ? "text-green-600" : "text-amber-600")}>
                        {rec.payment_status === 'paid' ? t('status_fully_paid') : t('status_payment_pending')}
                      </span>
                    </div>
                    <p className="text-sm font-display font-bold text-primary">{formatCurrency(link.amount)}</p>
                  </div>

                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-primary/10 transition-colors"></div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};

const ProfilePage = () => {
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const displayName = (user as any)?.full_name || user?.name || 'User';
  return (
    <div className="py-12 flex flex-col items-center space-y-8 animate-in fade-in duration-500">
      <div className="w-32 h-32 bg-primary/10 rounded-[48px] flex items-center justify-center text-primary text-4xl font-display font-bold">
        {displayName.substring(0, 2).toUpperCase()}
      </div>
      <div className="text-center">
        <h2 className="text-3xl font-display font-bold">{displayName}</h2>
        <p className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">{user?.role} {t('profile_portal')}</p>
        <p className="text-xs text-gray-400 mt-2 font-mono">{user?.phone}</p>
      </div>

      {/* Language toggle */}
      <div className="w-full bg-gray-50 rounded-[28px] p-5 space-y-3">
        <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-widest">
          <Globe className="w-4 h-4" />{t('profile_language')}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setLang('en')}
            className={`py-3 rounded-2xl font-bold text-sm transition-all ${lang === 'en' ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-gray-500'}`}
          >
            English
          </button>
          <button
            onClick={() => setLang('ur')}
            className={`py-3 rounded-2xl font-bold text-sm transition-all ${lang === 'ur' ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-gray-500'}`}
            style={{ fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}
          >
            اردو
          </button>
        </div>
      </div>

      <button onClick={logout} className="w-full p-6 text-red-500 font-bold bg-red-50 rounded-[32px] border border-red-100 flex items-center justify-center space-x-2 active:scale-95 transition-all">
        <LogOut className="w-5 h-5" />
        <span className="uppercase tracking-widest text-xs">{t('profile_terminate')}</span>
      </button>
    </div>
  );
};

const HistoryPage = ({ onViewImage }: { onViewImage: (src: string) => void }) => {
  const { myPledges, user, getShopkeeperPayments, getShopkeeperSpendingByDonor, acknowledgeShopkeeperPayment, notifications } = useAuth();
  const { t } = useLanguage();
  const [spendingHistory, setSpendingHistory] = useState<any[]>([]);
  const [shopPayments, setShopPayments] = useState<ShopkeeperPayment[]>([]);
  const [donorSummaries, setDonorSummaries] = useState<ShopkeeperDonorSummary[]>([]);
  const [selectedDonorSummary, setSelectedDonorSummary] = useState<ShopkeeperDonorSummary | null>(null);

  const isShop = user?.role?.toLowerCase() === 'shopkeeper';
  const isDonor = user?.role?.toLowerCase() === 'donor';

  const handleAcknowledgePayment = async (paymentId: string) => {
    try {
      await acknowledgeShopkeeperPayment(paymentId);
      setShopPayments(prev => prev.map(p => p.id === paymentId ? { ...p, status: 'acknowledged' } : p));
    } catch (e: any) {
      alert(e.message);
    }
  };

  useEffect(() => {
    if (isShop) {
      supabase.from('spending_records').select('*, donees(full_name)')
        .eq('shopkeeper_id', user!.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => setSpendingHistory(data || []));

      getShopkeeperPayments().then(setShopPayments);
      getShopkeeperSpendingByDonor().then(setDonorSummaries);
    }
  }, [user, isShop, notifications]);

  return (
    <div className="space-y-8 py-6">
      <section className="space-y-4">
        <h1 className="text-2xl font-display font-bold text-primary">{t('history_title')}</h1>
        <div className="space-y-4">
          {isDonor && myPledges.map(pledge => (
            <div key={pledge.id} className="p-5 bg-white rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div className="flex items-center space-x-4">
                 <div className="p-3 bg-gray-50 rounded-2xl"><CreditCard className="w-6 h-6 text-primary" /></div>
                 <div>
                   <p className="font-bold text-sm">{t('history_pledge_for')} {pledge.donees?.full_name}</p>
                   <p className="text-[10px] uppercase font-bold text-gray-400">{new Date(pledge.created_at).toLocaleDateString()}</p>
                   <p className="text-[9px] text-gray-400">{t('text_remaining')}: {formatCurrency(pledge.remaining_amount)}</p>
                 </div>
              </div>
              <div className="text-right">
                <p className="font-display font-bold text-primary">{formatCurrency(pledge.amount)}</p>
                <p className={cn("text-[8px] font-bold uppercase px-2 py-0.5 rounded-full",
                  pledge.status === 'active' ? "bg-green-100 text-green-700" :
                  pledge.status === 'partially_spent' ? "bg-amber-100 text-amber-700" :
                  pledge.status === 'fully_spent' ? "bg-blue-100 text-blue-700" :
                  "bg-red-100 text-red-700"
                )}>{pledge.status}</p>
              </div>
            </div>
          ))}

          {isShop && donorSummaries.length > 0 && (
            <>
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mt-2">{t('history_by_donor')}</h3>
              {donorSummaries.map(summary => (
                <button
                  key={summary.donor_id}
                  onClick={() => setSelectedDonorSummary(summary)}
                  className="w-full p-5 bg-white rounded-3xl border border-gray-100 shadow-sm text-left active:scale-[0.98] transition-all"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-blue-50 rounded-2xl"><User className="w-6 h-6 text-blue-600" /></div>
                      <div>
                        <p className="font-bold text-sm">{summary.donor_name}</p>
                        <p className="text-[10px] uppercase font-bold text-gray-400">
                          {summary.spending_records.length} {t('history_transactions')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-bold text-slate-900">{formatCurrency(summary.total_amount)}</p>
                      {summary.total_unpaid > 0 ? (
                        <p className="text-[8px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{formatCurrency(summary.total_unpaid)} {t('text_unpaid')}</p>
                      ) : (
                        <p className="text-[8px] font-bold uppercase px-2 py-0.5 rounded-full bg-green-100 text-green-700">{t('status_fully_paid')}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}

          {isShop && spendingHistory.map(sh => (
            <div key={sh.id} className="p-5 bg-white rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div className="flex items-center space-x-4">
                 <div className="p-3 bg-gray-50 rounded-2xl"><ShoppingBag className="w-6 h-6 text-primary" /></div>
                 <div>
                   <p className="font-bold text-sm">{t('history_goods_released')}</p>
                   <p className="text-[10px] uppercase font-bold text-gray-400">{sh.donees?.full_name}</p>
                   <p className="text-[8px] text-gray-300">{new Date(sh.created_at).toLocaleString()}</p>
                 </div>
              </div>
              <div className="text-right">
                <p className="font-display font-bold text-slate-900">{formatCurrency(sh.amount)}</p>
                <p className={cn("text-[8px] font-bold uppercase px-2 py-0.5 rounded-full", sh.payment_status === 'paid' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>{sh.payment_status}</p>
              </div>
            </div>
          ))}

          {isShop && shopPayments.length > 0 && (
            <>
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mt-6">{t('history_proofs_received')}</h3>
              {shopPayments.map(payment => (
                <div key={payment.id} className="p-5 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-bold text-sm">{payment.profiles?.full_name || t('text_donor')}</p>
                      <p className="text-[10px] text-gray-400">{new Date(payment.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-bold text-primary">{formatCurrency(payment.amount)}</p>
                      <p className={cn("text-[8px] font-bold uppercase px-2 py-0.5 rounded-full inline-block", payment.status === 'acknowledged' ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700")}>{payment.status}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    {payment.proof_screenshot_url ? (
                      <button
                        onClick={() => onViewImage(payment.proof_screenshot_url!)}
                        className="text-[8px] font-black text-primary uppercase flex items-center bg-primary/5 px-2 py-1 rounded-md active:scale-95 transition-all"
                      >
                        <ImageIcon className="w-2 h-2 mr-1" /> {t('history_view_proof')}
                      </button>
                    ) : <span />}
                    {payment.status === 'submitted' && (
                      <button
                        onClick={() => handleAcknowledgePayment(payment.id)}
                        className="text-[8px] font-black text-green-600 uppercase flex items-center bg-green-50 px-2 py-1 rounded-md active:scale-95 transition-all"
                      >
                        <CheckCircle2 className="w-2 h-2 mr-1" /> {t('history_acknowledge')}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </section>

      <Modal
        isOpen={!!selectedDonorSummary}
        onClose={() => setSelectedDonorSummary(null)}
        title={selectedDonorSummary?.donor_name || ''}
      >
        {selectedDonorSummary && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-5 rounded-3xl flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('history_total_from_donor')}</p>
                <p className="font-display font-bold text-xl text-slate-900">{formatCurrency(selectedDonorSummary.total_amount)}</p>
              </div>
              {selectedDonorSummary.total_unpaid > 0 && (
                <div className="text-right">
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">{t('text_unpaid')}</p>
                  <p className="font-display font-bold text-xl text-amber-600">{formatCurrency(selectedDonorSummary.total_unpaid)}</p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {selectedDonorSummary.spending_records.map(rec => (
                <div key={rec.id} className="p-4 bg-white rounded-2xl border border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-xs">{rec.items_description}</p>
                    <p className="text-[9px] text-gray-400">{new Date(rec.created_at).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-bold text-sm text-slate-900">{formatCurrency(rec.amount)}</p>
                    <p className={cn("text-[8px] font-bold uppercase px-2 py-0.5 rounded-full", rec.payment_status === 'paid' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>{rec.payment_status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

const StatCard = ({ label, value, accent }: { label: string; value: string; accent?: string }) => (
  <div className={cn("p-4 rounded-2xl", accent || "bg-gray-50")}>
    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{label}</p>
    <p className="text-lg font-display font-bold text-slate-900 mt-0.5">{value}</p>
  </div>
);

const RankedList = ({ title, items, icon: Icon }: { title: string; items: RankedEntity[]; icon: any }) => {
  const { t } = useLanguage();
  return (
  <div className="space-y-3">
    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{title}</h3>
    {items.length === 0 ? (
      <div className="text-center py-6 bg-white rounded-3xl border border-dashed border-gray-200">
        <p className="text-gray-400 text-xs italic">{t('text_no_data')}</p>
      </div>
    ) : (
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={item.id} className="flex items-center p-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center mr-3 flex-shrink-0", idx === 0 ? "bg-amber-50 text-amber-600" : "bg-gray-50 text-gray-400")}>
              {idx === 0 ? <Icon className="w-4 h-4" /> : <span className="text-xs font-bold">{idx + 1}</span>}
            </div>
            <p className="flex-1 font-bold text-sm text-slate-800 truncate">{item.name}</p>
            <p className="font-display font-bold text-primary text-sm">{formatCurrency(item.amount)}</p>
          </div>
        ))}
      </div>
    )}
  </div>
  );
};

const AnalyticsPage = () => {
  const { user, getDonorAnalytics, getShopkeeperAnalytics, getAdminAnalytics } = useAuth();
  const { t } = useLanguage();
  const [granularity, setGranularity] = useState<'week' | 'month'>('month');
  const [donorData, setDonorData] = useState<DonorAnalytics | null>(null);
  const [shopData, setShopData] = useState<ShopkeeperAnalytics | null>(null);
  const [adminData, setAdminData] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const role = user?.role?.toLowerCase();

  useEffect(() => {
    setLoading(true);
    if (role === 'donor') {
      getDonorAnalytics().then(setDonorData).finally(() => setLoading(false));
    } else if (role === 'shopkeeper') {
      getShopkeeperAnalytics().then(setShopData).finally(() => setLoading(false));
    } else if (role === 'admin') {
      getAdminAnalytics().then(setAdminData).finally(() => setLoading(false));
    }
  }, [role]);

  if (!user) return <Navigate to="/login" />;

  const trendData: TrendPoint[] = (
    role === 'donor' ? donorData && (granularity === 'week' ? donorData.by_week : donorData.by_month)
    : role === 'shopkeeper' ? shopData && (granularity === 'week' ? shopData.by_week : shopData.by_month)
    : role === 'admin' ? adminData && (granularity === 'week' ? adminData.by_week : adminData.by_month)
    : null
  ) || [];

  return (
    <div className="space-y-8 py-6">
      <div className="flex items-center space-x-2">
        <BarChart3 className="w-5 h-5 text-primary" />
        <h1 className="text-2xl font-display font-bold text-gray-800">{t('nav_analytics')}</h1>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <>
          {/* Stat cards */}
          {role === 'donor' && donorData && (
            <div className="grid grid-cols-3 gap-3">
              <StatCard label={t('analytics_pledged')} value={formatCurrency(donorData.total_pledged)} accent="bg-primary/5" />
              <StatCard label={t('analytics_consumed')} value={formatCurrency(donorData.total_consumed)} accent="bg-amber-50" />
              <StatCard label={t('analytics_remaining')} value={formatCurrency(donorData.total_remaining)} />
            </div>
          )}
          {role === 'shopkeeper' && shopData && (
            <div className="grid grid-cols-2 gap-3">
              <StatCard label={t('analytics_total_distributed')} value={formatCurrency(shopData.total_distributed)} accent="bg-primary/5" />
              <StatCard label={t('analytics_total_received')} value={formatCurrency(shopData.total_received)} accent="bg-amber-50" />
            </div>
          )}
          {role === 'admin' && adminData && (
            <div className="grid grid-cols-3 gap-3">
              <StatCard label={t('analytics_pledged')} value={formatCurrency(adminData.total_pledged)} accent="bg-primary/5" />
              <StatCard label={t('analytics_spent')} value={formatCurrency(adminData.total_spent)} accent="bg-amber-50" />
              <StatCard label={t('analytics_paid')} value={formatCurrency(adminData.total_paid)} />
              <StatCard label={t('analytics_active_donees')} value={String(adminData.active_donees)} />
              <StatCard label={t('analytics_active_shops')} value={String(adminData.active_shopkeepers)} />
              <StatCard label={t('analytics_donors')} value={String(adminData.active_donors)} />
            </div>
          )}

          {/* Trend chart */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                {role === 'shopkeeper' ? t('analytics_monthly_perf') : t('analytics_pledged_vs_consumed')}
              </h3>
              <div className="flex bg-gray-100 rounded-full p-1">
                <button
                  onClick={() => setGranularity('week')}
                  className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase transition-all", granularity === 'week' ? "bg-white shadow-sm text-primary" : "text-gray-400")}
                >{t('analytics_weekly')}</button>
                <button
                  onClick={() => setGranularity('month')}
                  className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase transition-all", granularity === 'month' ? "bg-white shadow-sm text-primary" : "text-gray-400")}
                >{t('analytics_monthly')}</button>
              </div>
            </div>
            {trendData.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
                <Calendar className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-xs italic">{t('analytics_no_activity')}</p>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="period" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: number) => formatCurrency(Number(v))} />
                    {role !== 'shopkeeper' && <Bar dataKey="pledged" fill="#006A4E" radius={[6, 6, 0, 0]} name="Pledged" />}
                    <Bar dataKey="consumed" fill="#f59e0b" radius={[6, 6, 0, 0]} name={role === 'shopkeeper' ? 'Distributed' : 'Consumed'} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          {/* Breakdowns */}
          {role === 'donor' && donorData && (
            <>
              <RankedList
                title={t('analytics_by_shop_unpaid')}
                items={donorData.by_shopkeeper.map(s => ({ id: s.shopkeeper_id, name: s.shop_name, amount: s.total_unpaid }))}
                icon={Trophy}
              />
              <RankedList
                title={t('analytics_by_donee')}
                items={donorData.by_donee.map(d => ({ id: d.donee_id, name: d.donee_name, amount: d.pledged }))}
                icon={Trophy}
              />
            </>
          )}
          {role === 'shopkeeper' && shopData && (
            <>
              <RankedList title={t('analytics_top_donees')} items={shopData.top_donees} icon={Trophy} />
              <RankedList title={t('analytics_top_donors')} items={shopData.top_donors} icon={Trophy} />
            </>
          )}
          {role === 'admin' && adminData && (
            <>
              <RankedList title={t('analytics_top_donors')} items={adminData.top_donors} icon={Trophy} />
              <RankedList title={t('analytics_top_shops')} items={adminData.top_shopkeepers} icon={Trophy} />
              <RankedList title={t('analytics_top_donees')} items={adminData.top_donees} icon={Trophy} />
            </>
          )}
        </>
      )}
    </div>
  );
};

const TrustPage = () => {
  const { t } = useLanguage();
  return (
  <div className="py-10 space-y-8 animate-in fade-in duration-500">
    <div className="text-center space-y-2">
      <ShieldCheck className="w-16 h-16 text-primary mx-auto" />
      <h1 className="text-3xl font-display font-bold text-slate-900">{t('trust_title')}</h1>
      <p className="text-[10px] font-black uppercase text-primary tracking-widest">{t('trust_subtitle')}</p>
    </div>

    <section className="space-y-4">
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <h3 className="font-bold text-sm mb-2 flex items-center"><CheckCircle2 className="w-4 h-4 text-primary mr-2" /> {t('trust_pledge_model')}</h3>
        <p className="text-xs text-gray-500 leading-relaxed">{t('trust_pledge_model_desc')}</p>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <h3 className="font-bold text-sm mb-2 flex items-center"><CheckCircle2 className="w-4 h-4 text-primary mr-2" /> {t('trust_admin_payments')}</h3>
        <p className="text-xs text-gray-500 leading-relaxed">{t('trust_admin_payments_desc')}</p>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <h3 className="font-bold text-sm mb-2 flex items-center"><CheckCircle2 className="w-4 h-4 text-primary mr-2" /> {t('trust_verified_identity')}</h3>
        <p className="text-xs text-gray-500 leading-relaxed">{t('trust_verified_identity_desc')}</p>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <h3 className="font-bold text-sm mb-2 flex items-center"><CheckCircle2 className="w-4 h-4 text-primary mr-2" /> {t('trust_open_ledger')}</h3>
        <p className="text-xs text-gray-500 leading-relaxed">{t('trust_open_ledger_desc')}</p>
      </div>
    </section>

    <div className="p-6 bg-slate-900 rounded-[32px] text-white text-center">
       <p className="text-[10px] font-bold opacity-50 uppercase mb-2">{t('trust_need_help')}</p>
       <p className="text-sm font-bold">{t('trust_contact')}</p>
       <p className="text-xs opacity-70 mt-1">support@haqdaar.org</p>
    </div>
  </div>
  );
};

// ─── V2: Admin Deposits Page ──────────────────────────────────────────────────
const AdminDepositsPage = () => {
  const { user, addDonorDeposit, getAdminDeposits, getAdminDonors } = useAuth();
  const { t } = useLanguage();
  const [deposits, setDeposits] = useState<DonorDeposit[]>([]);
  const [donors, setDonors] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [donorId, setDonorId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [ref, setRef] = useState('');
  const [receiptImg, setReceiptImg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [viewImg, setViewImg] = useState<string | null>(null);

  useEffect(() => {
    getAdminDeposits().then(setDeposits);
    getAdminDonors().then(setDonors);
  }, []);

  const captureReceipt = async () => {
    try {
      const photo = await CapCamera.getPhoto({ resultType: CameraResultType.DataUrl, source: CameraSource.Prompt, quality: 70 });
      setReceiptImg(photo.dataUrl || null);
    } catch { /* cancelled */ }
  };

  const handleSave = async () => {
    if (!donorId || !amount) { alert(t('alert_select_donor_amount')); return; }
    const paisa = Math.round(parseFloat(amount) * 100);
    if (isNaN(paisa) || paisa <= 0) { alert(t('alert_invalid_amount')); return; }
    setIsSaving(true);
    try {
      await addDonorDeposit(donorId, paisa, date, ref || undefined, receiptImg || undefined);
      setIsModalOpen(false);
      setDonorId(''); setAmount(''); setRef(''); setReceiptImg(null);
      getAdminDeposits().then(setDeposits);
    } catch (e: any) { alert(e.message); }
    finally { setIsSaving(false); }
  };

  if (user?.role !== 'admin') return <Navigate to="/home" />;
  return (
    <div className="py-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-display font-bold text-primary">{t('deposits_title')}</h1>
        <button onClick={() => setIsModalOpen(true)} className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-full flex items-center gap-1"><Plus className="w-4 h-4" />{t('btn_record')}</button>
      </div>
      {deposits.length === 0 && <p className="text-center text-gray-400 text-sm py-12">{t('deposits_none')}</p>}
      <div className="space-y-3">
        {deposits.map(d => (
          <div key={d.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-sm">{d.donor_name || t('text_unknown_donor')}</p>
                <p className="text-xs text-gray-400">{d.deposit_date}{d.reference_number ? ` · ${t('form_ref_label')}: ${d.reference_number}` : ''}</p>
              </div>
              <div className="text-right">
                <p className="font-black text-primary text-sm">Rs {(d.amount_paisa / 100).toLocaleString()}</p>
                {d.receipt_image_url && <button onClick={() => setViewImg(d.receipt_image_url!)} className="text-xs text-primary underline">{t('form_receipt_label')}</button>}
              </div>
            </div>
          </div>
        ))}
      </div>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={t('modal_record_deposit')}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1">{t('form_donor_label')}</label>
            <select value={donorId} onChange={e => setDonorId(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm">
              <option value="">— {t('form_select_donor')} —</option>
              {donors.map(d => <option key={d.id} value={d.id}>{d.full_name} ({d.phone})</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1">{t('form_amount_rs')}</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 5000" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1">{t('form_date_label')}</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1">{t('form_ref_label')}</label>
            <input type="text" value={ref} onChange={e => setRef(e.target.value)} placeholder="e.g. TXN123" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1">{t('form_receipt_label')}</label>
            {receiptImg ? <img src={receiptImg} className="w-full rounded-xl max-h-40 object-contain border border-gray-100 mb-2" /> : null}
            <button onClick={captureReceipt} className="w-full border border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-400 flex items-center justify-center gap-2"><Camera className="w-4 h-4" />{t('form_take_upload')}</button>
          </div>
          <button onClick={handleSave} disabled={isSaving} className="w-full bg-primary text-white font-bold py-3 rounded-2xl disabled:opacity-50">
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : t('btn_save_deposit')}
          </button>
        </div>
      </Modal>
      <ImageViewer src={viewImg} isOpen={!!viewImg} onClose={() => setViewImg(null)} />
    </div>
  );
};

// ─── V2: Admin Allocation Page ────────────────────────────────────────────────
const AdminAllocationPage = () => {
  const { user, previewAllocation, runMonthlyAllocation, getAdminAllocations, performMonthClose, getSettings } = useAuth();
  const { t } = useLanguage();
  const [monthYear, setMonthYear] = useState(new Date().toISOString().slice(0, 7));
  const [preview, setPreview] = useState<AllocationPreview | null>(null);
  const [run, setRun] = useState<AllocationRun | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isRerunning, setIsRerunning] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [msg, setMsg] = useState('');
  const fundedOf = (funded: number, total: number, left: number) =>
    t('alloc_funded_of').replace('{funded}', String(funded)).replace('{total}', String(total)).replace('{left}', String(left));

  useEffect(() => {
    getSettings().then(setSettings);
    getAdminAllocations(monthYear).then(setRun);
  }, [monthYear]);

  const handlePreview = async () => {
    setIsPreviewing(true);
    try { setPreview(await previewAllocation(monthYear)); }
    catch (e: any) { alert(e.message); }
    finally { setIsPreviewing(false); }
  };

  const handleRun = async () => {
    if (!confirm(`Run allocation for ${monthYear}? This cannot be undone.`)) return;
    setIsRunning(true);
    try {
      const result = await runMonthlyAllocation(monthYear);
      setMsg(result.status === 'already_run' ? 'Already run for this month.' : `Done! ${result.donee_count} families assigned.`);
      getAdminAllocations(monthYear).then(setRun);
    } catch (e: any) { alert(e.message); }
    finally { setIsRunning(false); }
  };

  const handleRerun = async () => {
    if (!confirm(`Re-run allocation for ${monthYear}? This will undo the existing allocation and recalculate with the current pool. Any unspent balances are preserved.`)) return;
    setIsRerunning(true);
    try {
      const result = await runMonthlyAllocation(monthYear, true);
      setMsg(`Re-allocated! ${result.donee_count} families assigned.`);
      getAdminAllocations(monthYear).then(setRun);
      setPreview(null);
    } catch (e: any) { alert(e.message); }
    finally { setIsRerunning(false); }
  };

  const handleClose = async () => {
    if (!confirm(`Close month ${monthYear}? Unspent donee balances carry forward to next month.`)) return;
    setIsClosing(true);
    try { await performMonthClose(monthYear); setMsg('Month closed. Unspent funds returned.'); }
    catch (e: any) { alert(e.message); }
    finally { setIsClosing(false); }
  };

  if (user?.role !== 'admin') return <Navigate to="/home" />;
  return (
    <div className="py-6 space-y-5">
      <h1 className="text-2xl font-display font-bold text-primary">{t('alloc_title')}</h1>
      <div className="flex items-center gap-3">
        <input type="month" value={monthYear} onChange={e => setMonthYear(e.target.value)} className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm" />
        <button onClick={handlePreview} disabled={isPreviewing} className="bg-gray-100 text-gray-700 text-xs font-bold px-4 py-2 rounded-full">{isPreviewing ? <Loader2 className="w-4 h-4 animate-spin" /> : t('alloc_preview')}</button>
      </div>
      {settings && (
        <div className="bg-primary/5 rounded-2xl p-4 text-xs space-y-1">
          <p className="font-bold text-primary text-sm mb-2">{t('settings_title')}</p>
          <p>Monthly cap: <strong>Rs {(settings.monthly_cap_paisa / 100).toLocaleString()}</strong></p>
          <p>Tax rate: <strong>{settings.tax_rate_pct}%</strong></p>
          <p>Full slot cost: <strong>Rs {(settings.monthly_cap_paisa * (1 + settings.tax_rate_pct / 100) / 100).toLocaleString()}</strong></p>
        </div>
      )}
      {preview && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
          <h3 className="font-bold text-sm text-slate-700">{t('alloc_preview')} — {preview.month_year}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 text-center"><p className="text-lg font-black text-primary">Rs {(preview.pool_paisa / 100).toLocaleString()}</p><p className="text-[10px] text-gray-400 uppercase tracking-widest">{t('alloc_pool')}</p></div>
            <div className="bg-gray-50 rounded-xl p-3 text-center"><p className="text-lg font-black text-slate-700">{preview.eligible_donee_count}</p><p className="text-[10px] text-gray-400 uppercase tracking-widest">{t('alloc_donees')}</p></div>
            <div className="bg-gray-50 rounded-xl p-3 text-center"><p className="text-lg font-black text-green-600">Rs {(preview.amount_per_donee_paisa / 100).toLocaleString()}</p><p className="text-[10px] text-gray-400 uppercase tracking-widest">{t('alloc_per_donee')}</p></div>
            <div className={`rounded-xl p-3 text-center ${preview.is_short_month ? 'bg-amber-50' : 'bg-green-50'}`}><p className="text-lg font-black">{preview.is_short_month ? '⚠️ ' + t('alloc_short') : '✓ ' + t('alloc_full')}</p><p className="text-[10px] text-gray-400 uppercase tracking-widest">{t('alloc_month')}</p></div>
          </div>
          <p className={`text-sm font-bold ${preview.is_short_month ? 'text-amber-700' : 'text-green-700'}`}>{fundedOf(preview.funded_count, preview.eligible_donee_count, preview.unfunded_count)}</p>
          {preview.is_short_month && (
            <div className="text-xs text-amber-600 font-medium space-y-1">
              <p>{t('alloc_shortage')} {t('alloc_shortage_hint')}</p>
              {preview.unused_paisa > 0 && <p>{t('alloc_unused').replace('{amount}', (preview.unused_paisa / 100).toLocaleString())}</p>}
            </div>
          )}
          <div className="space-y-2 pt-2 border-t border-gray-100">
            {preview.assignments_preview.map(a => (
              <div key={a.donor_id} className="flex justify-between text-xs"><span className="font-medium">{a.donor_name}</span><span className="text-gray-400">{a.donee_count} {t('text_families')} · Rs {(a.total_reserved_paisa / 100).toLocaleString()}</span></div>
            ))}
          </div>
        </div>
      )}
      {msg && <div className="bg-green-50 text-green-700 text-sm rounded-2xl p-4 font-medium">{msg}</div>}
      {run ? (
        <div className="space-y-3">
          <div className={`border rounded-2xl p-4 ${run.is_short_month ? 'bg-amber-50 border-amber-100' : 'bg-green-50 border-green-100'}`}>
            <p className={`font-bold text-sm ${run.is_short_month ? 'text-amber-700' : 'text-green-700'}`}>
              {run.is_short_month ? '⚠️ ' + t('alloc_short_month') + ' — ' : '✓ '}{t('alloc_run_on')} {new Date(run.run_at).toLocaleDateString()}
            </p>
            <p className={`text-xs mt-1 ${run.is_short_month ? 'text-amber-600' : 'text-green-600'}`}>
              {run.summary
                ? fundedOf(run.summary.funded, run.summary.eligible, run.summary.unfunded.length)
                : `${run.donee_count} ${t('text_families')}`}
              {' · '}{t('alloc_per_donee')}: Rs {(run.amount_per_donee_paisa / 100).toLocaleString()}
            </p>
            {run.summary && run.summary.unfunded.length > 0 && (
              <div className="mt-3 pt-3 border-t border-amber-200 space-y-1">
                <p className="text-xs font-bold text-amber-800">{t('alloc_left_out_title')} ({run.summary.unfunded.length})</p>
                <ol className="list-decimal ps-5 text-xs text-amber-800 space-y-0.5">
                  {run.summary.unfunded.map(u => <li key={u.id}>{u.name}</li>)}
                </ol>
                <p className="text-[11px] text-amber-600 pt-1">{t('alloc_deposit_hint')}</p>
              </div>
            )}
          </div>
          <button onClick={handleRerun} disabled={isRerunning} className="w-full border border-blue-200 bg-blue-50 text-blue-700 font-bold py-3 rounded-2xl text-sm disabled:opacity-50">
            {isRerunning ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : t('alloc_rerun')}
          </button>
          {run.assignments && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-50 flex justify-between items-center">
                <h3 className="font-bold text-sm">{t('alloc_assignments')} ({run.assignments.length})</h3>
              </div>
              <div className="divide-y divide-gray-50 max-h-60 overflow-y-auto">
                {run.assignments.map(a => (
                  <div key={a.id} className="px-4 py-3 flex justify-between text-xs">
                    <div><p className="font-medium">{a.donee_name}</p><p className="text-gray-400">{a.donee_area}{a.donee_family_size ? ` · ${a.donee_family_size} ppl` : ''}</p></div>
                    <div className="text-right"><p className="font-medium">{a.donor_name}</p><p className="text-gray-400">Rs {(a.share_paisa / 100).toLocaleString()} + Rs {(a.tax_paisa / 100).toLocaleString()} tax</p></div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <button onClick={handleClose} disabled={isClosing} className="w-full border border-amber-300 text-amber-700 font-bold py-3 rounded-2xl text-sm disabled:opacity-50">
            {isClosing ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : t('alloc_close_month')}
          </button>
        </div>
      ) : (
        <button onClick={handleRun} disabled={isRunning} className="w-full bg-primary text-white font-bold py-3 rounded-2xl disabled:opacity-50">
          {isRunning ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : `${t('alloc_run')} ${monthYear}`}
        </button>
      )}
    </div>
  );
};

// ─── V2: Admin Settings Page ──────────────────────────────────────────────────
const AdminSettingsPage = () => {
  const { user, getSettings, updateSetting } = useAuth();
  const { t } = useLanguage();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [cap, setCap] = useState('');
  const [tax, setTax] = useState('');
  const [security, setSecurity] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettings().then(s => { setSettings(s); setCap(String(s.monthly_cap_paisa / 100)); setTax(String(s.tax_rate_pct)); setSecurity(String(s.shopkeeper_security_paisa / 100)); });
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSetting('monthly_cap_paisa', Math.round(parseFloat(cap) * 100));
      await updateSetting('tax_rate_pct', parseInt(tax));
      await updateSetting('shopkeeper_security_paisa', Math.round(parseFloat(security) * 100));
      setSaved(true); setTimeout(() => setSaved(false), 2000);
      getSettings().then(setSettings);
    } catch (e: any) { alert(e.message); }
    finally { setIsSaving(false); }
  };

  if (user?.role !== 'admin') return <Navigate to="/home" />;
  if (!settings) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  return (
    <div className="py-6 space-y-6">
      <h1 className="text-2xl font-display font-bold text-primary">{t('settings_title')}</h1>
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-5">
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1">{t('settings_monthly_cap')}</label>
          <input type="number" value={cap} onChange={e => setCap(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
          <p className="text-[10px] text-gray-400 mt-1">{t('settings_monthly_cap_hint')}</p>
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1">{t('settings_tax_rate')}</label>
          <input type="number" value={tax} onChange={e => setTax(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
          <p className="text-[10px] text-gray-400 mt-1">{t('settings_tax_hint')}</p>
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1">{t('settings_security_amount')}</label>
          <input type="number" value={security} onChange={e => setSecurity(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
          <p className="text-[10px] text-gray-400 mt-1">{t('settings_security_hint')}</p>
        </div>
        <button onClick={handleSave} disabled={isSaving} className="w-full bg-primary text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50">
          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : saved ? <><Check className="w-5 h-5" />{t('btn_saved')}</> : t('btn_save_settings')}
        </button>
      </div>
    </div>
  );
};

// ─── V2: Donor Impact Dashboard ───────────────────────────────────────────────
const DonorImpactV2Page = () => {
  const { user, getDonorImpact, getDonorAvailableBalance, getSettings } = useAuth();
  const { t } = useLanguage();
  const [impact, setImpact] = useState<DonorImpact | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'donor') {
      getDonorImpact().then(i => { setImpact(i); setIsLoading(false); });
    }
  }, []);

  if (user?.role !== 'donor') return <Navigate to="/home" />;
  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!impact) return <div className="py-10 text-center text-gray-400">{t('text_no_data')}</div>;

  return (
    <div className="py-6 space-y-5">
      <div className="text-center space-y-1 pb-2">
        <h1 className="text-2xl font-display font-bold text-primary">{t('impact_v2_title')}</h1>
        <p className="text-xs text-gray-400">{t('impact_v2_subtitle')}</p>
      </div>

      {/* Balance breakdown */}
      <div className="bg-primary rounded-3xl p-5 text-white shadow-lg">
        <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-3">{t('impact_v2_balance')}</p>
        <p className="text-4xl font-black">Rs {(impact.available_paisa / 100).toLocaleString()}</p>
        <p className="text-xs opacity-70 mt-1">{t('text_available')}</p>
        <div className="grid grid-cols-3 gap-3 mt-4 border-t border-white/20 pt-4">
          <div className="text-center"><p className="text-lg font-black">Rs {(impact.total_deposited_paisa / 100).toLocaleString()}</p><p className="text-[9px] opacity-60 uppercase tracking-widest">{t('text_deposited')}</p></div>
          <div className="text-center"><p className="text-lg font-black">Rs {(impact.reserved_this_month_paisa / 100).toLocaleString()}</p><p className="text-[9px] opacity-60 uppercase tracking-widest">{t('text_reserved')}</p></div>
          <div className="text-center"><p className="text-lg font-black">Rs {(impact.used_paisa / 100).toLocaleString()}</p><p className="text-[9px] opacity-60 uppercase tracking-widest">{t('text_used')}</p></div>
        </div>
      </div>

      {/* This month */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
          <p className="text-3xl font-black text-primary">{impact.families_this_month}</p>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">{t('impact_v2_families_month')}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
          <p className="text-3xl font-black text-slate-700">{impact.people_this_month}</p>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">{t('impact_v2_people_fed')}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
          <p className="text-xl font-black text-primary">Rs {(impact.given_this_month_paisa / 100).toLocaleString()}</p>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">{t('impact_v2_given_month')}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
          <p className="text-xl font-black text-amber-600">Rs {(impact.tax_this_month_paisa / 100).toLocaleString()}</p>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">{t('impact_v2_tax_month')}</p>
        </div>
      </div>

      {/* All time */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">{t('impact_v2_all_time')}</p>
        <div className="grid grid-cols-2 gap-3">
          <div><p className="text-xl font-black text-primary">{impact.families_all_time}</p><p className="text-[10px] text-gray-400">{t('impact_v2_families_helped')}</p></div>
          <div><p className="text-xl font-black text-slate-700">Rs {(impact.given_all_time_paisa / 100).toLocaleString()}</p><p className="text-[10px] text-gray-400">{t('impact_v2_total_given')}</p></div>
        </div>
      </div>

      {/* Forecast */}
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-3">
        <Target className="w-8 h-8 text-amber-500 shrink-0" />
        <div>
          <p className="font-bold text-sm text-amber-700">{t('impact_v2_forecast')}</p>
          <p className="text-xs text-amber-600">{t('impact_v2_forecast_desc')} <strong>{impact.next_month_families}</strong> {impact.next_month_families === 1 ? t('text_family') : t('text_families')}.</p>
        </div>
      </div>

      {/* Monthly chart */}
      {impact.monthly_chart.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">{t('impact_v2_monthly_history')}</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={impact.monthly_chart.map(d => ({ period: d.month, given: d.given_paisa / 100, families: d.families }))}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="period" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => `Rs ${v.toLocaleString()}`} />
              <Bar dataKey="given" fill="#006A4E" radius={[4, 4, 0, 0]} name="Given (Rs)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Milestones */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">{t('impact_milestones')}</p>
        <div className="space-y-3">
          {impact.milestones.map(m => (
            <div key={m.key} className={`flex items-center gap-3 p-3 rounded-xl ${m.achieved ? 'bg-primary/5' : 'bg-gray-50 opacity-40'}`}>
              <Star className={`w-5 h-5 shrink-0 ${m.achieved ? 'text-primary fill-primary' : 'text-gray-300'}`} />
              <p className={`text-sm font-medium ${m.achieved ? 'text-primary' : 'text-gray-400'}`}>{m.label}</p>
              {m.achieved && <Check className="w-4 h-4 text-green-500 ml-auto" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── V2: Donor My Families Page ───────────────────────────────────────────────
const DonorFamiliesPage = () => {
  const { user, getDonorFamilies } = useAuth();
  const { t } = useLanguage();
  const [families, setFamilies] = useState<DonorFamily[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role === 'donor') getDonorFamilies().then(f => { setFamilies(f); setIsLoading(false); });
  }, []);

  if (user?.role !== 'donor') return <Navigate to="/home" />;
  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  return (
    <div className="py-6 space-y-4">
      <h1 className="text-2xl font-display font-bold text-primary">{t('families_title')}</h1>
      {families.length === 0 && <p className="text-center text-gray-400 text-sm py-12">{t('families_none')}</p>}
      {families.map(f => (
        <div key={f.donee_id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 flex items-center gap-3" onClick={() => setExpanded(expanded === f.donee_id ? null : f.donee_id)}>
            {f.consent_to_share && f.photo_url
              ? <img src={f.photo_url} className="w-12 h-12 rounded-2xl object-cover" />
              : <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center"><Lock className="w-5 h-5 text-primary/40" /></div>
            }
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{f.masked_name}</p>
              <p className="text-xs text-gray-400">{f.area}{f.family_size ? ` · ${f.family_size} ${t('families_people')}` : ''} · {f.months_supported} {t('families_months_supported')}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-black text-primary">Rs {(f.current_month.allocated_paisa / 100).toLocaleString()}</p>
              <p className="text-[10px] text-gray-400">{t('families_this_month')}</p>
            </div>
            {expanded === f.donee_id ? <ChevronDown className="w-4 h-4 text-gray-300 ml-1" /> : <ChevronRight className="w-4 h-4 text-gray-300 ml-1" />}
          </div>
          {expanded === f.donee_id && (
            <div className="border-t border-gray-50 p-4 space-y-3">
              {f.consent_to_share && f.story && <p className="text-xs text-gray-500 leading-relaxed italic">"{f.story}"</p>}
              {!f.consent_to_share && <p className="text-xs text-gray-400 italic flex items-center gap-1"><Lock className="w-3 h-3" /> {t('families_privacy')}</p>}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gray-50 rounded-xl p-2 text-center"><p className="text-sm font-black text-primary">Rs {(f.current_month.allocated_paisa / 100).toLocaleString()}</p><p className="text-[9px] text-gray-400">{t('families_allocated')}</p></div>
                <div className="bg-gray-50 rounded-xl p-2 text-center"><p className="text-sm font-black text-amber-600">Rs {(f.current_month.spent_paisa / 100).toLocaleString()}</p><p className="text-[9px] text-gray-400">{t('families_spent')}</p></div>
                <div className="bg-gray-50 rounded-xl p-2 text-center"><p className="text-sm font-black text-green-600">Rs {(f.current_month.remaining_paisa / 100).toLocaleString()}</p><p className="text-[9px] text-gray-400">{t('families_remaining')}</p></div>
              </div>
              {f.payout_history.length > 0 && (
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('families_recent')}</p>
                  <div className="space-y-1">
                    {f.payout_history.slice(0, 5).map(p => (
                      <div key={p.id} className="flex justify-between text-xs py-1 border-b border-gray-50">
                        <span className="text-gray-500">{new Date(p.created_at).toLocaleDateString()} · {p.shop_name}</span>
                        <span className="font-medium">Rs {p.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ─── V2: Donor Transactions Page ──────────────────────────────────────────────
const DonorTransactionsPage = () => {
  const { user, getDonorTransactionsV2 } = useAuth();
  const { t } = useLanguage();
  const [txns, setTxns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState('');

  useEffect(() => {
    if (user?.role === 'donor') getDonorTransactionsV2(monthFilter || undefined).then(data => { setTxns(data); setIsLoading(false); });
  }, [monthFilter]);

  if (user?.role !== 'donor') return <Navigate to="/home" />;
  return (
    <div className="py-6 space-y-4">
      <h1 className="text-2xl font-display font-bold text-primary">{t('txns_title')}</h1>
      <input type="month" value={monthFilter} onChange={e => { setMonthFilter(e.target.value); setIsLoading(true); }} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" placeholder={t('txns_filter')} />
      {isLoading && <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}
      {!isLoading && txns.length === 0 && <p className="text-center text-gray-400 text-sm py-10">{t('txns_none')}</p>}
      <div className="space-y-3">
        {txns.map(txn => (
          <div key={txn.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start">
              <div className="min-w-0">
                <p className="font-bold text-sm truncate">{txn.donee_name}</p>
                <p className="text-xs text-gray-400 truncate">{txn.shop_name}{txn.shop_area ? ` · ${txn.shop_area}` : ''}</p>
                <p className="text-[10px] text-gray-300 mt-1">{new Date(txn.created_at).toLocaleString()}</p>
              </div>
              <div className="text-right shrink-0 ml-2">
                <p className="font-black text-sm text-slate-700">Rs {(txn.amount_paisa / 100).toLocaleString()}</p>
                <p className="text-[10px] text-amber-500">+Rs {(txn.tax_paisa / 100).toLocaleString()} {t('txns_tax')}</p>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${txn.status === 'completed' ? 'bg-green-100 text-green-600' : txn.status === 'pending_payment' ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500'}`}>{txn.status?.replace('_', ' ')}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Sharpening via unsharp-mask convolution kernel applied on a hidden canvas
const sharpenImage = (dataUrl: string): Promise<string> =>
  new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      const src = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = src.data;
      const w = canvas.width;
      const h = canvas.height;
      const out = new Uint8ClampedArray(d.length);

      // Unsharp-mask kernel: [-1,-1,-1 / -1,9,-1 / -1,-1,-1]
      const k = [-1, -1, -1, -1, 9, -1, -1, -1, -1];
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          if (x === 0 || x === w - 1 || y === 0 || y === h - 1) {
            out[i] = d[i]; out[i+1] = d[i+1]; out[i+2] = d[i+2]; out[i+3] = d[i+3];
            continue;
          }
          for (let c = 0; c < 3; c++) {
            let s = 0;
            for (let ky = -1; ky <= 1; ky++)
              for (let kx = -1; kx <= 1; kx++)
                s += d[((y+ky)*w + (x+kx))*4 + c] * k[(ky+1)*3 + (kx+1)];
            out[i+c] = Math.min(255, Math.max(0, s));
          }
          out[i+3] = d[i+3];
        }
      }
      ctx.putImageData(new ImageData(out, w, h), 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.src = dataUrl;
  });

// ─── V2: Shopkeeper Parchi Scan Page ─────────────────────────────────────────
const ScanPageV2 = () => {
  const { user, recordSpendingV2 } = useAuth();
  const { t } = useLanguage();
  const [step, setStep] = useState<'scanning' | 'amount' | 'parchi' | 'success'>('scanning');
  const [qrCode, setQrCode] = useState('');
  const [amount, setAmount] = useState('');
  const [parchiImg, setParchiImg] = useState<string | null>(null);
  const [isSharpening, setIsSharpening] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ payout_id: string } | null>(null);
  const scannerRef = useRef<any>(null);
  const scannerDivId = 'qr-scanner-v2';

  useEffect(() => {
    if (step !== 'scanning') return;
    const timer = setTimeout(() => {
      const scanner = new Html5QrcodeScanner(scannerDivId, { fps: 10, qrbox: { width: 250, height: 250 } }, false);
      scanner.render(
        (code: string) => { scanner.clear(); setQrCode(code); setStep('amount'); },
        () => {}
      );
      scannerRef.current = scanner;
    }, 300);
    return () => { clearTimeout(timer); try { scannerRef.current?.clear(); } catch {} };
  }, [step]);

  const captureParchi = async (source: CameraSource) => {
    try {
      const photo = await CapCamera.getPhoto({ resultType: CameraResultType.DataUrl, source, quality: 85 });
      if (!photo.dataUrl) return;
      setIsSharpening(true);
      setStep('parchi');
      const sharp = await sharpenImage(photo.dataUrl);
      setParchiImg(sharp);
      setIsSharpening(false);
    } catch { setIsSharpening(false); }
  };

  const handleSubmit = async () => {
    if (!parchiImg) { alert(t('err_parchi_required')); return; }
    const paisa = Math.round(parseFloat(amount) * 100);
    if (isNaN(paisa) || paisa <= 0) { alert(t('alert_invalid_amount')); return; }
    setIsSubmitting(true);
    try {
      const res = await recordSpendingV2(qrCode, paisa, parchiImg);
      setResult(res);
      setStep('success');
    } catch (e: any) { alert(e.message); }
    finally { setIsSubmitting(false); }
  };

  const reset = () => { setStep('scanning'); setQrCode(''); setAmount(''); setParchiImg(null); setResult(null); };

  if (user?.role !== 'shopkeeper') return <Navigate to="/home" />;
  return (
    <div className="py-6 space-y-5">
      {step === 'scanning' && (
        <>
          <div className="text-center"><h1 className="text-2xl font-display font-bold text-primary">{t('scan_title')}</h1><p className="text-xs text-gray-400 mt-1">{t('scan_subtitle')}</p></div>
          <div id={scannerDivId} className="rounded-3xl overflow-hidden" />
        </>
      )}
      {step === 'amount' && (
        <div className="space-y-5">
          <div className="flex items-center gap-3"><button onClick={reset} className="p-2 bg-gray-100 rounded-full"><ArrowLeft className="w-5 h-5" /></button><h1 className="text-xl font-display font-bold text-primary">{t('scan_enter_amount')}</h1></div>
          <div className="bg-primary/5 rounded-2xl p-4"><p className="text-xs text-gray-500">{t('text_qr_code')} <span className="font-mono text-sm">{qrCode.slice(0, 20)}…</span></p></div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">{t('scan_amount_label')}</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} autoFocus placeholder={t('scan_amount_placeholder')} className="w-full text-3xl font-black text-center border-b-2 border-primary py-3 bg-transparent outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => { if (!amount || parseFloat(amount) <= 0) { alert(t('err_invalid_amount')); return; } captureParchi(CameraSource.Camera); }} className="bg-primary text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2">
              <Camera className="w-5 h-5" />{t('scan_camera')}
            </button>
            <button onClick={() => { if (!amount || parseFloat(amount) <= 0) { alert(t('err_invalid_amount')); return; } captureParchi(CameraSource.Photos); }} className="border-2 border-primary text-primary font-bold py-4 rounded-2xl flex items-center justify-center gap-2">
              <ImageIcon className="w-5 h-5" />{t('scan_gallery')}
            </button>
          </div>
        </div>
      )}
      {step === 'parchi' && (
        <div className="space-y-5">
          <div className="flex items-center gap-3"><button onClick={() => setStep('amount')} className="p-2 bg-gray-100 rounded-full"><ArrowLeft className="w-5 h-5" /></button><h1 className="text-xl font-display font-bold text-primary">{t('scan_parchi_title')}</h1></div>
          {isSharpening
            ? <div className="w-full h-64 bg-gray-50 rounded-3xl flex flex-col items-center justify-center gap-3 border border-gray-100"><Loader2 className="w-8 h-8 animate-spin text-primary" /><p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{t('scan_sharpening')}</p></div>
            : parchiImg && <img src={parchiImg} className="w-full rounded-3xl max-h-80 object-contain border border-gray-100 shadow-sm" />
          }
          <div className="grid grid-cols-3 gap-2">
            <button disabled={isSharpening} onClick={() => captureParchi(CameraSource.Camera)} className="border border-gray-200 text-gray-500 font-bold py-3 rounded-2xl text-xs flex items-center justify-center gap-1 disabled:opacity-40"><Camera className="w-4 h-4" />{t('scan_camera')}</button>
            <button disabled={isSharpening} onClick={() => captureParchi(CameraSource.Photos)} className="border border-gray-200 text-gray-500 font-bold py-3 rounded-2xl text-xs flex items-center justify-center gap-1 disabled:opacity-40"><ImageIcon className="w-4 h-4" />{t('scan_gallery')}</button>
            <button onClick={handleSubmit} disabled={isSubmitting || isSharpening} className="bg-primary text-white font-bold py-3 rounded-2xl text-sm flex items-center justify-center gap-1 disabled:opacity-50">
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4" />{t('scan_submit')}</>}
            </button>
          </div>
          <div className="bg-gray-50 rounded-2xl p-3 text-center"><p className="text-sm font-black text-slate-700">Rs {parseFloat(amount).toLocaleString()}</p><p className="text-xs text-gray-400">{t('scan_will_request')}</p></div>
        </div>
      )}
      {step === 'success' && (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-6 py-12">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto"><CheckCircle2 className="w-12 h-12 text-green-500" /></div>
          <div><h2 className="text-2xl font-display font-bold text-slate-900">{t('scan_success_title')}</h2><p className="text-sm text-gray-400 mt-2">{t('scan_success_sub')}</p></div>

          {/* Goods-release instruction */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left space-y-2">
            <p className="text-sm font-semibold text-amber-800 leading-snug">
              {t('scan_release_en')}
            </p>
            <p className="text-sm font-semibold text-amber-800 leading-snug" dir="rtl" style={{ fontFamily: "'Noto Nastaliq Urdu', sans-serif" }}>
              {t('scan_release_ur')}
            </p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-4 text-left space-y-1">
            <p className="text-xs text-gray-400">{t('scan_amount_label2')} <strong className="text-slate-700">Rs {parseFloat(amount).toLocaleString()}</strong></p>
            <p className="text-xs text-gray-400">{t('scan_request_id')} <strong className="text-slate-700 font-mono text-[10px]">{result?.payout_id?.slice(-8)}</strong></p>
          </div>
          <button onClick={reset} className="w-full bg-primary text-white font-bold py-4 rounded-2xl">{t('scan_another')}</button>
        </motion.div>
      )}
    </div>
  );
};

export default function App() {
  const { user, isLoading } = useAuth();
  const [activeViewerImage, setActiveViewerImage] = useState<string | null>(null);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

  return (
    <>
      <Routes>
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/home" />} />
        <Route path="/home" element={user ? <Layout><HomePage onViewImage={setActiveViewerImage} /></Layout> : <Navigate to="/login" />} />
        <Route path="/scan" element={user ? <Layout><ScanPageV2 /></Layout> : <Navigate to="/login" />} />
        <Route path="/impact" element={user ? <Layout>{user.role === 'donor' ? <DonorImpactV2Page /> : <ImpactPage />}</Layout> : <Navigate to="/login" />} />
        <Route path="/donor/families" element={user?.role === 'donor' ? <Layout><DonorFamiliesPage /></Layout> : <Navigate to="/login" />} />
        <Route path="/donor/transactions" element={user?.role === 'donor' ? <Layout><DonorTransactionsPage /></Layout> : <Navigate to="/login" />} />
        <Route path="/history" element={user ? <Layout><HistoryPage onViewImage={setActiveViewerImage} /></Layout> : <Navigate to="/login" />} />
        <Route path="/analytics" element={user ? <Layout><AnalyticsPage /></Layout> : <Navigate to="/login" />} />
        <Route path="/admin/manage" element={user?.role?.toLowerCase() === 'admin' ? <Layout><AdminManagePage /></Layout> : <Navigate to="/login" />} />
        <Route path="/admin/shopkeepers" element={user?.role?.toLowerCase() === 'admin' ? <Layout><AdminShopkeeperPage /></Layout> : <Navigate to="/login" />} />
        <Route path="/admin/donors" element={user?.role?.toLowerCase() === 'admin' ? <Layout><AdminDonorPage /></Layout> : <Navigate to="/login" />} />
        <Route path="/admin/deposits" element={user?.role?.toLowerCase() === 'admin' ? <Layout><AdminDepositsPage /></Layout> : <Navigate to="/login" />} />
        <Route path="/admin/allocation" element={user?.role?.toLowerCase() === 'admin' ? <Layout><AdminAllocationPage /></Layout> : <Navigate to="/login" />} />
        <Route path="/admin/settings" element={user?.role?.toLowerCase() === 'admin' ? <Layout><AdminSettingsPage /></Layout> : <Navigate to="/login" />} />
        <Route path="/profile" element={user ? <Layout><ProfilePage /></Layout> : <Navigate to="/login" />} />
        <Route path="/how-it-works" element={<Layout><TrustPage /></Layout>} />
        <Route path="/settlements" element={<Navigate to="/home" />} />
        <Route path="*" element={<Navigate to="/home" />} />
      </Routes>

      <ImageViewer
        src={activeViewerImage}
        isOpen={!!activeViewerImage}
        onClose={() => setActiveViewerImage(null)}
      />
    </>
  );
}
