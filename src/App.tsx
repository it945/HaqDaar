import React, { useState, useRef, useEffect } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Home, QrCode, History, User, Scan, LayoutDashboard, LogOut, Menu, X, ArrowLeft, Bell, Sparkles, Send, Loader2, Heart, Plus, Minus, Wallet, Landmark, ClipboardList, CheckCircle2, ShoppingBag, Receipt, ArrowRight, Camera, Upload, Edit, Users, FileText, Activity, ShieldCheck, HelpCircle, Copy, Check, RefreshCw, Image as ImageIcon, CreditCard, Store, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth, Donee, ShopkeeperSpendingSummary, ShopkeeperDonorSummary, ShopkeeperPayment, Notification as NotificationType } from './context/AuthContext';
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
    notifications, unreadNotificationCount, markNotificationRead
  } = useAuth();

  const [selectedDonee, setSelectedDonee] = useState<Donee | null>(null);
  const [view, setView] = useState<'register' | 'manage_donees' | 'reports' | 'audit_logs' | 'notifications' | 'all_pledges' | ''>('');
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
    }
  }, [user, isShop]);

  // Load payments due for donors (refresh when pledges change or notifications arrive)
  useEffect(() => {
    if (isDonor) {
      getDonorSpendingByShopkeeper().then(setPaymentsDue);
    }
  }, [user, isDonor, myPledges, notifications]);

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
          <h1 className="text-2xl font-display font-bold text-primary">Assalamu Alaikum,</h1>
          <p className="text-slate-500 font-bold tracking-tight">
            {isAdmin ? 'Admin System Oversight' : isDonor ? 'Pledge-based aid transparency.' : 'Shopkeeper agent portal.'}
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
            {isDonor ? 'My Pledge Wallet' : isShop ? 'Agent Status' : 'Global Pledged Aid'}
          </p>
          <h2 className="text-4xl font-display font-bold">
            {isDonor
              ? formatCurrency(myPledges.reduce((acc, p) => acc + Number(p.amount), 0))
              : isShop
              ? formatCurrency(spendingHistory.reduce((acc, s) => acc + Number(s.amount), 0))
              : formatCurrency(reportsData?.totalPledged || 0)
            }
          </h2>
          <p className="text-[10px] mt-4 opacity-70 uppercase tracking-widest font-bold">
            {isDonor ? 'Total Pledged Amount' : isShop ? 'Total Goods Distributed' : 'Total Pledged Transparency Records'}
          </p>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
      </div>

      {/* DONOR: Verified Donees */}
      {isDonor && (
        <section className="space-y-4">
          <h3 className="font-display font-bold text-xl text-gray-800">Verified Donees</h3>
          <div className="space-y-3">
            {donees.map((donee) => (
              <button
                key={donee.id}
                onClick={() => setSelectedDonee(donee)}
                className="w-full flex items-center p-4 bg-white rounded-3xl border border-gray-100 shadow-sm hover:scale-[1.01] transition-transform text-left"
              >
                <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center text-primary font-bold">
                  {donee.full_name.charAt(0)}
                </div>
                <div className="ml-4 flex-1">
                  <p className="font-bold text-slate-900">{donee.full_name}</p>
                  <p className="text-[10px] uppercase text-gray-400 font-bold">{donee.city}, {donee.area}</p>
                </div>
                <div className="text-right mr-2">
                  <p className="text-[8px] font-black text-primary uppercase tracking-tighter">Available Credit</p>
                  <p className="text-xs font-bold text-slate-700">{formatCurrency(donee.funded_credit || 0)}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-primary opacity-30" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* DONOR: Payments Due Section */}
      {isDonor && paymentsDue.length > 0 && (
        <section className="space-y-4">
          <h3 className="font-display font-bold text-xl text-gray-800">Payments Due</h3>
          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Pay shopkeepers directly for goods released to your donees</p>
          <div className="space-y-3">
            {paymentsDue.map((summary) => (
              <button
                key={summary.shopkeeper_id}
                onClick={() => setSelectedPayment(summary)}
                className="w-full p-5 bg-white rounded-[28px] border border-gray-100 shadow-sm text-left active:scale-[0.98] transition-all"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-amber-50 rounded-2xl">
                      <Store className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{summary.shop_name}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">
                        {summary.spending_records.length} item{summary.spending_records.length > 1 ? 's' : ''} pending
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-black text-amber-600 uppercase">Amount Due</p>
                    <p className="text-lg font-display font-bold text-amber-600">{formatCurrency(summary.total_unpaid)}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  {summary.spending_records.slice(0, 3).map(rec => (
                    <p key={rec.id} className="text-[10px] text-gray-500 truncate">
                      {rec.donees?.full_name}: {rec.items_description} - {formatCurrency(rec.amount)}
                    </p>
                  ))}
                  {summary.spending_records.length > 3 && (
                    <p className="text-[10px] text-primary font-bold">+{summary.spending_records.length - 3} more</p>
                  )}
                </div>
                {!summary.payment_info && !summary.jazzcash_account && !summary.easypaisa_account && (
                  <div className="mt-2 flex items-center space-x-1 text-amber-600">
                    <AlertTriangle className="w-3 h-3" />
                    <span className="text-[9px] font-bold">Payment info missing - contact admin</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* SHOPKEEPER: Dashboard */}
      {isShop && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Link to="/scan" className="bg-white p-6 rounded-[28px] shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-3 active:scale-95 transition-all">
              <div className="p-4 bg-primary/5 rounded-2xl"><Scan className="w-8 h-8 text-primary" /></div>
              <span className="font-bold text-xs uppercase tracking-widest text-gray-700">Scan ID Card</span>
            </Link>
            <Link to="/history" className="bg-white p-6 rounded-[28px] shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-3 active:scale-95 transition-all">
              <div className="p-4 bg-blue-50 rounded-2xl"><History className="w-8 h-8 text-blue-600" /></div>
              <span className="font-bold text-xs uppercase tracking-widest text-gray-700">Records</span>
            </Link>
          </div>

          {/* Shopkeeper: Payment Proofs Received */}
          {shopPayments.length > 0 && (
            <section className="space-y-4">
              <h3 className="font-display font-bold text-xl text-gray-800">Payment Proofs Received</h3>
              <div className="space-y-3">
                {shopPayments.map(payment => (
                  <div key={payment.id} className="p-5 bg-white rounded-[28px] border border-gray-100 shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-slate-900">{payment.profiles?.full_name || 'Donor'}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">{new Date(payment.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-display font-bold text-primary">{formatCurrency(payment.amount)}</p>
                        <p className={cn("text-[8px] font-bold uppercase px-2 py-0.5 rounded-full inline-block", payment.status === 'acknowledged' ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700")}>{payment.status}</p>
                      </div>
                    </div>
                    {payment.proof_screenshot_url && (
                      <button
                        onClick={() => onViewImage(payment.proof_screenshot_url!)}
                        className="w-full h-32 bg-gray-100 rounded-2xl overflow-hidden relative active:scale-[0.98] transition-all"
                      >
                        <img src={payment.proof_screenshot_url} className="w-full h-full object-cover" alt="Proof" />
                        <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-[8px] text-white font-bold uppercase">Tap to Zoom</div>
                      </button>
                    )}
                    {payment.status === 'submitted' && (
                      <button
                        onClick={() => handleAcknowledgePayment(payment.id)}
                        className="w-full py-3 bg-primary/5 text-primary rounded-2xl font-bold text-xs uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center space-x-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Acknowledge Receipt</span>
                      </button>
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
            <span className="font-bold text-xs uppercase tracking-widest text-gray-700 text-center">Manage Donees</span>
          </Link>
          <Link to="/admin/shopkeepers" className="bg-white p-6 rounded-[28px] shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-3 active:scale-95 transition-all">
            <div className="p-4 bg-green-50 rounded-2xl"><ShoppingBag className="w-8 h-8 text-green-600" /></div>
            <span className="font-bold text-xs uppercase tracking-widest text-gray-700 text-center">Manage Shops</span>
          </Link>
          <button onClick={() => setView('all_pledges')} className="bg-white p-6 rounded-[28px] shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-3 active:scale-95 transition-all">
            <div className="p-4 bg-primary/5 rounded-2xl"><CreditCard className="w-8 h-8 text-primary" /></div>
            <span className="font-bold text-xs uppercase tracking-widest text-gray-700 text-center">All Pledges</span>
          </button>
          <button onClick={() => setView('reports')} className="bg-white p-6 rounded-[28px] shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-3 active:scale-95 transition-all">
            <div className="p-4 bg-purple-50 rounded-2xl"><FileText className="w-8 h-8 text-purple-600" /></div>
            <span className="font-bold text-xs uppercase tracking-widest text-gray-700 text-center">Reports</span>
          </button>
          <button onClick={() => setView('audit_logs')} className="bg-white p-6 rounded-[28px] shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-3 active:scale-95 transition-all">
            <div className="p-4 bg-slate-50 rounded-2xl"><Activity className="w-8 h-8 text-slate-400" /></div>
            <span className="font-bold text-xs uppercase tracking-widest text-gray-700 text-center">Audit Logs</span>
          </button>
        </div>
      )}

      {/* Admin Registration Modal */}
      <Modal isOpen={view === 'register'} onClose={() => { setView(''); setEditingDonee(null); }} title={editingDonee ? "Edit Donee" : "Register New Donee"}>
         <div className="space-y-4 print:p-0">
            <div className="print:hidden space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-gray-400 ml-2">Personal Details</label>
                <input placeholder="Full Name" className="w-full p-4 bg-gray-50 rounded-2xl border-none text-sm" value={newDonee.full_name} onChange={e => setNewDonee({...newDonee, full_name: e.target.value})} />
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="City" className="p-4 bg-gray-50 rounded-2xl border-none text-sm" value={newDonee.city} onChange={e => setNewDonee({...newDonee, city: e.target.value})} />
                  <input placeholder="Area" className="p-4 bg-gray-50 rounded-2xl border-none text-sm" value={newDonee.area} onChange={e => setNewDonee({...newDonee, area: e.target.value})} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-gray-400 ml-2">Account & ID</label>
                <select className="w-full p-4 bg-gray-50 rounded-2xl border-none text-sm mb-2" value={newDonee.receiving_method} onChange={e => setNewDonee({...newDonee, receiving_method: e.target.value})}>
                  <option value="EasyPaisa">EasyPaisa</option>
                  <option value="JazzCash">JazzCash</option>
                  <option value="Raast">Raast / Bank</option>
                </select>
                <input placeholder="Account Title" className="w-full p-4 bg-gray-50 rounded-2xl border-none text-sm" value={newDonee.receiving_account_title} onChange={e => setNewDonee({...newDonee, receiving_account_title: e.target.value})} />
                <input placeholder="Account Number (e.g. 03001234567)" className="w-full p-4 bg-gray-50 rounded-2xl border-none text-sm" value={newDonee.phone} onChange={e => setNewDonee({...newDonee, phone: e.target.value})} />
                <input placeholder="Unique QR (e.g. DONEE-101)" className="w-full p-4 bg-gray-50 rounded-2xl border-none text-sm" value={newDonee.qr} onChange={e => setNewDonee({...newDonee, qr: e.target.value})} />
              </div>
            </div>

            <div className={cn("p-6 border-2 border-primary rounded-3xl bg-white flex flex-col items-center space-y-3 shadow-sm", newDonee.full_name ? "block" : "hidden print:hidden")}>
               <div className="w-full flex justify-between items-center border-b border-primary/20 pb-2">
                  <h4 className="font-display font-bold text-primary text-sm">HAQDAAR ID</h4>
                  <span className="text-[8px] font-black uppercase text-gray-400">Verified Identity</span>
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
              {isSubmitting ? (editingDonee ? 'Updating...' : 'Registering...') : (editingDonee ? 'Update Donee' : 'Register & Print Card')}
            </button>
         </div>
      </Modal>

      {/* Admin Manage Donees Modal */}
      <Modal isOpen={view === 'manage_donees'} onClose={() => setView('')} title="Manage All Donees">
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
                  {donee.status === 'approved' ? 'Pause' : 'Activate'}
                </button>
                <button onClick={() => { setEditingDonee(donee); setView('register'); }} className="px-4 py-2 bg-primary/5 text-primary rounded-xl active:scale-95 transition-all"><Edit className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* Admin All Pledges Modal */}
      <Modal isOpen={view === 'all_pledges'} onClose={() => setView('')} title="All Pledges (Read-Only)">
        <div className="space-y-4">
          {allPledges.length === 0 && <p className="text-center text-gray-400 py-12">No pledges yet.</p>}
          {allPledges.map(pledge => (
            <div key={pledge.id} className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-slate-900">{pledge.profiles?.full_name || 'Donor'}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">For: {pledge.donees?.full_name}</p>
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
                <span>Remaining: {formatCurrency(pledge.remaining_amount)}</span>
                <span>{new Date(pledge.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* Admin Reports Modal */}
      <Modal isOpen={view === 'reports'} onClose={() => setView('')} title="Platform Analytics">
         {reportsData ? (
           <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-primary/5 p-4 rounded-2xl">
                    <p className="text-[10px] font-bold text-primary uppercase">Total Pledged Aid</p>
                    <p className="text-xl font-display font-bold text-primary">{formatCurrency(reportsData.totalPledged)}</p>
                 </div>
                 <div className="bg-blue-50 p-4 rounded-2xl">
                    <p className="text-[10px] font-bold text-blue-600 uppercase">Goods Distributed</p>
                    <p className="text-xl font-display font-bold text-blue-600">{formatCurrency(reportsData.totalSpending)}</p>
                 </div>
              </div>
              <div className="bg-gray-50 p-6 rounded-3xl flex justify-between items-center">
                 <div>
                    <p className="text-xs font-bold text-gray-400 uppercase">Active Donees</p>
                    <p className="text-2xl font-display font-bold text-slate-900">{reportsData.activeDonees}</p>
                 </div>
                 <Users className="w-10 h-10 text-gray-200" />
              </div>
              <p className="text-[10px] text-center text-gray-400 italic mt-12">Data updated in real-time from transparency ledger.</p>
           </div>
         ) : <Loader2 className="w-8 h-8 animate-spin mx-auto" />}
      </Modal>

      {/* Admin Audit Logs Modal */}
      <Modal isOpen={view === 'audit_logs'} onClose={() => setView('')} title="System Audit Logs">
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
      <Modal isOpen={view === 'notifications'} onClose={() => setView('')} title="Notifications">
        <div className="space-y-3">
          {notifications.length === 0 && (
            <div className="text-center py-12">
              <Bell className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-xs italic">No notifications yet.</p>
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

      {/* Donor Pledge Modal */}
      <Modal
        isOpen={!!selectedDonee}
        onClose={() => { setSelectedDonee(null); setProofImage(null); }}
        title={selectedDonee?.full_name || ''}
      >
        {selectedDonee && (
          <div className="space-y-6">
            <div className="bg-slate-900 p-5 rounded-3xl text-white">
              <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest mb-2">Pledge Model</p>
              <p className="text-xs leading-relaxed opacity-80">This is a promise. You'll pay the shopkeeper directly when goods are released to the donee. No upfront payment required.</p>
            </div>

            <div className="bg-gray-50 p-6 rounded-3xl space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary text-xl font-bold">
                  {selectedDonee.full_name.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-slate-900">{selectedDonee.full_name}</p>
                  <p className="text-[10px] uppercase text-gray-400 font-bold">{selectedDonee.city}, {selectedDonee.area}</p>
                  <p className="text-[10px] font-bold text-primary uppercase mt-1">Current Credit: {formatCurrency(selectedDonee.funded_credit || 0)}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3 bg-white p-3 rounded-2xl border border-gray-200">
                   <span className="text-xs font-bold text-gray-400 px-2">Rs.</span>
                   <input
                     type="number"
                     className="flex-1 bg-transparent outline-none font-display font-bold text-xl"
                     value={pledgeAmount}
                     onChange={e => setPledgeAmount(e.target.value)}
                     placeholder="1000"
                   />
                </div>
              </div>
            </div>

            <button
              disabled={isSubmitting}
              onClick={handlePledge}
              className="w-full bg-primary text-white py-5 rounded-[24px] font-bold shadow-xl shadow-primary/20 disabled:opacity-50 active:scale-95 transition-all"
            >
              {isSubmitting ? 'Creating Pledge...' : 'Pledge This Amount'}
            </button>
            <p className="text-[10px] text-center text-gray-400 italic">Credit becomes available immediately. You pay the shopkeeper after goods are released.</p>
          </div>
        )}
      </Modal>

      {/* Donor Payment to Shopkeeper Modal */}
      <Modal
        isOpen={!!selectedPayment}
        onClose={() => { setSelectedPayment(null); setProofImage(null); }}
        title={`Pay ${selectedPayment?.shop_name || ''}`}
      >
        {selectedPayment && (
          <div className="space-y-6">
            <div className="bg-amber-50 p-5 rounded-3xl space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Total Due</p>
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
                <label className="text-[10px] font-bold uppercase text-gray-400 ml-2 block">Pay With:</label>

                {/* EasyPaisa */}
                <div className="space-y-2">
                  {(selectedPayment.easypaisa_account || selectedPayment.payment_info) && (
                    <div className="bg-white p-3 rounded-2xl border border-gray-200 flex items-center justify-between">
                      <p className="text-sm font-display font-bold text-[#006A4E] tracking-tight">{selectedPayment.easypaisa_account || selectedPayment.payment_info}</p>
                      {isCopied ? (
                        <span className="text-green-500 flex items-center text-[10px] font-bold uppercase"><Check className="w-3 h-3 mr-1" /> Copied</span>
                      ) : (
                        <button onClick={() => copyToClipboard((selectedPayment.easypaisa_account || selectedPayment.payment_info)!.replace(/\D/g, ''))} className="text-primary flex items-center hover:opacity-70 text-[10px] font-bold uppercase">
                          <Copy className="w-3 h-3 mr-1" /> Copy
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
                          {(selectedPayment.easypaisa_account || selectedPayment.payment_info) ? 'Pay Shopkeeper Directly' : 'Not available for this shop'}
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
                        <span className="text-green-500 flex items-center text-[10px] font-bold uppercase"><Check className="w-3 h-3 mr-1" /> Copied</span>
                      ) : (
                        <button onClick={() => copyToClipboard((selectedPayment.jazzcash_account || selectedPayment.payment_info)!.replace(/\D/g, ''))} className="text-primary flex items-center hover:opacity-70 text-[10px] font-bold uppercase">
                          <Copy className="w-3 h-3 mr-1" /> Copy
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
                          {(selectedPayment.jazzcash_account || selectedPayment.payment_info) ? 'Raast P2P Transfer' : 'Not available for this shop'}
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
                <p className="text-xs text-amber-700">Shopkeeper payment info is not set. Please contact admin to update it.</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-gray-400 ml-4">Upload Payment Proof</label>
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
                    <span className="text-[10px] font-bold text-green-600 uppercase">Screenshot Selected</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-6 h-6 mb-1" />
                    <span className="font-bold text-sm">Select Screenshot</span>
                    <p className="text-[9px] opacity-60">Upload the payment confirmation screen</p>
                  </>
                )}
              </button>
            </div>

            <button
              disabled={isSubmitting || !proofImage}
              onClick={handleSubmitPaymentProof}
              className="w-full bg-slate-900 text-white py-5 rounded-[24px] font-bold shadow-xl shadow-slate-900/20 disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Payment Proof'}
            </button>
            <p className="text-[10px] text-center text-gray-400 italic">Pay the shopkeeper externally, then upload proof here. The shopkeeper will be notified.</p>
          </div>
        )}
      </Modal>
    </div>
  );
};

const ScanPage = () => {
  const { recordSpending, user } = useAuth();
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
          <h1 className="text-2xl font-display font-bold text-primary">Scan Donee Identity</h1>
          <div className="aspect-square bg-black rounded-[40px] border-4 border-white shadow-2xl overflow-hidden relative">
             <div id="reader" className="w-full h-full object-cover"></div>
             {loading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                  <Loader2 className="w-12 h-12 text-white animate-spin" />
                </div>
             )}
          </div>
          <div className="flex flex-col space-y-4">
             <p className="text-xs text-gray-400">Position the Donee QR code within the frame to scan automatically.</p>
             <button onClick={() => handleScan('DONEE-123')} className="text-[10px] font-black text-primary/40 uppercase tracking-widest hover:text-primary transition-colors">Simulate Scan (Test)</button>
          </div>
        </div>
      )}

      {step === 'amount' && (
        <div className="w-full max-w-sm space-y-8 animate-in slide-in-from-right duration-300">
           <div className="text-center space-y-1">
             <h2 className="text-2xl font-display font-bold">Record Spending</h2>
             <p className="text-sm text-gray-400">Identity: {scannedDonee?.full_name}</p>
             <p className="text-[10px] font-black text-primary uppercase">Available Credit: {formatCurrency(scannedDonee?.funded_credit || 0)}</p>
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
                 placeholder="Items (e.g. 5kg Flour, 2L Oil)"
                 className="w-full p-4 bg-gray-50 rounded-2xl text-sm border-none focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                 value={items}
                 onChange={e => setItems(e.target.value)}
               />
             </div>
             <button onClick={handleSubmit} className="w-full bg-primary text-white py-5 rounded-[24px] font-bold shadow-xl shadow-primary/20 active:scale-95 transition-all flex items-center justify-center space-x-2">
               <span>Confirm Release of Goods</span>
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
          <h2 className="text-2xl font-display font-bold">Record Submitted</h2>
          <p className="text-gray-400 text-sm">Transparency ledger updated. The donor has been notified.</p>
          <Link to="/home" className="inline-block text-primary font-bold uppercase text-[10px] tracking-widest">Back to Dashboard</Link>
        </div>
      )}
    </div>
  );
};

const LoginPage = () => {
  const { login } = useAuth();
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
        <div className="w-20 h-20 bg-primary rounded-[28px] mx-auto flex items-center justify-center text-white mb-6 shadow-xl shadow-primary/20">
          <LayoutDashboard className="w-10 h-10" />
        </div>
        <h1 className="text-4xl font-display font-bold text-slate-900 tracking-tight">HaqDaar</h1>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-2">Pledge-Based Transparency</p>
      </div>

      <div className="space-y-6">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-gray-400 ml-4 tracking-widest">Enter Registered Phone</label>
          <input
            type="text"
            placeholder="03001234567"
            className="w-full p-5 bg-gray-50 rounded-[24px] border-2 border-transparent focus:border-primary outline-none font-mono font-bold"
            value={phone}
            onChange={e => setPhone(e.target.value)}
          />
        </div>

        <button onClick={handleLogin} disabled={loading} className="w-full bg-primary text-white py-5 rounded-[28px] font-bold shadow-xl shadow-primary/20 flex items-center justify-center space-x-2 active:scale-95 transition-all">
          {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <span className="uppercase tracking-widest text-sm">Sign In</span>}
        </button>

        <p className="text-[10px] text-center text-gray-400 font-bold uppercase tracking-wider">
          Automatic Role Recognition
        </p>
      </div>
    </div>
  );
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const location = useLocation();

  const navItems = [
    { icon: Home, label: 'Home', path: '/home' },
    { icon: Scan, label: 'Scan', path: '/scan', showOnly: ['shopkeeper'] },
    { icon: Users, label: 'Donees', path: '/admin/manage', showOnly: ['admin'] },
    { icon: ShoppingBag, label: 'Shops', path: '/admin/shopkeepers', showOnly: ['admin'] },
    { icon: Sparkles, label: 'Impact', path: '/impact', showOnly: ['donor'] },
    { icon: History, label: 'History', path: '/history' },
    { icon: User, label: 'Profile', path: '/profile' },
  ].filter(item => !item.showOnly || item.showOnly.includes(user?.role?.toLowerCase() || ''));

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col relative border-x border-gray-100">
      <main className="flex-1 px-6 pb-32 overflow-x-hidden">{children}</main>
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-100 px-6 pt-4 pb-8 flex justify-between items-center z-50 rounded-t-[40px] shadow-lg">
        {navItems.map(item => (
          <Link key={item.path} to={item.path} className={cn("flex flex-col items-center space-y-1 flex-1", location.pathname === item.path ? "text-primary" : "text-gray-300")}>
            <item.icon className="w-6 h-6" />
            <span className="text-[9px] font-bold uppercase tracking-widest">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
};

const AdminManagePage = () => {
  const { user, registerDonee, updateDonee, getAdminDonees } = useAuth();
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
        alert('Donee Updated Successfully!');
      } else {
        await registerDonee(data);
        alert('Donee Registered Successfully!');
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
        <h1 className="text-2xl font-display font-bold text-primary">Manage Donees</h1>
        <button
          onClick={() => { setEditingDonee(null); setIsRegisterModalOpen(true); }}
          className="p-3 bg-primary text-white rounded-2xl flex items-center space-x-2 active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-widest">New Donee</span>
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
                <p className="text-[8px] font-black text-primary uppercase">Available Credit</p>
                <p className="text-sm font-bold text-slate-700">{formatCurrency(donee.funded_credit || 0)}</p>
                <div className={cn("mt-1 px-3 py-1 rounded-full text-[8px] font-black uppercase inline-block", donee.status === 'approved' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")}>
                  {donee.status}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-50">
               <div className="space-y-1">
                 <p className="text-[8px] font-black text-gray-300 uppercase">QR Code</p>
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

      <Modal isOpen={isRegisterModalOpen} onClose={() => { setIsRegisterModalOpen(false); setEditingDonee(null); }} title={editingDonee ? "Edit Donee" : "Register New Donee"}>
         <div className="space-y-4 print:p-0">
            <div className="print:hidden space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-gray-400 ml-2">Personal Details</label>
                <input placeholder="Full Name" className="w-full p-4 bg-gray-50 rounded-2xl border-none text-sm" value={newDonee.full_name} onChange={e => setNewDonee({...newDonee, full_name: e.target.value})} />
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="City" className="p-4 bg-gray-50 rounded-2xl border-none text-sm" value={newDonee.city} onChange={e => setNewDonee({...newDonee, city: e.target.value})} />
                  <input placeholder="Area" className="p-4 bg-gray-50 rounded-2xl border-none text-sm" value={newDonee.area} onChange={e => setNewDonee({...newDonee, area: e.target.value})} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-gray-400 ml-2">Account & ID</label>
                <select className="w-full p-4 bg-gray-50 rounded-2xl border-none text-sm mb-2" value={newDonee.receiving_method} onChange={e => setNewDonee({...newDonee, receiving_method: e.target.value})}>
                  <option value="EasyPaisa">EasyPaisa</option>
                  <option value="JazzCash">JazzCash</option>
                  <option value="Raast">Raast / Bank</option>
                </select>
                <input placeholder="Account Title" className="w-full p-4 bg-gray-50 rounded-2xl border-none text-sm" value={newDonee.receiving_account_title} onChange={e => setNewDonee({...newDonee, receiving_account_title: e.target.value})} />
                <input placeholder="Account Number" className="w-full p-4 bg-gray-50 rounded-2xl border-none text-sm" value={newDonee.phone} onChange={e => setNewDonee({...newDonee, phone: e.target.value})} />
                <input placeholder="Unique QR (e.g. DONEE-101)" className="w-full p-4 bg-gray-50 rounded-2xl border-none text-sm" value={newDonee.qr} onChange={e => setNewDonee({...newDonee, qr: e.target.value})} />
              </div>
            </div>

            <div className={cn("p-6 border-2 border-primary rounded-3xl bg-white flex flex-col items-center space-y-3 shadow-sm", newDonee.full_name ? "block" : "hidden print:hidden")}>
               <div className="w-full flex justify-between items-center border-b border-primary/20 pb-2">
                  <h4 className="font-display font-bold text-primary text-sm">HAQDAAR ID</h4>
                  <span className="text-[8px] font-black uppercase text-gray-400">Verified Identity</span>
               </div>
               <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center text-3xl font-bold text-primary">
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
              {isSubmitting ? 'Processing...' : (editingDonee ? 'Update Donee' : 'Register & Print Card')}
            </button>
         </div>
      </Modal>
    </div>
  );
};

const AdminShopkeeperPage = () => {
  const { user, getAdminShopkeepers, registerShopkeeper, updateShopkeeper } = useAuth();
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

  const loadShops = () => getAdminShopkeepers().then(setShops);
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
      alert('Please fill in owner name, phone, and shop name.');
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
        alert('Shopkeeper Updated!');
      } else {
        await registerShopkeeper(formData);
        alert('Shopkeeper Registered!');
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
        <h1 className="text-2xl font-display font-bold text-primary">Manage Shopkeepers</h1>
        <button
          onClick={() => { setEditingShop(null); setIsModalOpen(true); }}
          className="p-3 bg-primary text-white rounded-2xl flex items-center space-x-2 active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-widest">New Shop</span>
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
                </div>
              </div>
              <div className={cn("px-3 py-1 rounded-full text-[8px] font-black uppercase", shop.status === 'active' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")}>
                {shop.status}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-50">
               <div className="space-y-1">
                 <p className="text-[8px] font-black text-gray-300 uppercase">General Account</p>
                 <p className="text-xs font-bold text-slate-600">{shop.payment_info || 'Not set'}</p>
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

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingShop(null); }} title={editingShop ? "Edit Shopkeeper" : "Register New Shopkeeper"}>
         <div className="space-y-4 pb-10">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-400 ml-2">Owner Details</label>
              <input placeholder="Full Name" className="w-full p-4 bg-gray-50 rounded-2xl border-none text-sm" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
              <input placeholder="Phone Number" className="w-full p-4 bg-gray-50 rounded-2xl border-none text-sm" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-400 ml-2">Shop Details</label>
              <input placeholder="Shop Name" className="w-full p-4 bg-gray-50 rounded-2xl border-none text-sm" value={formData.shop_name} onChange={e => setFormData({...formData, shop_name: e.target.value})} />
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="City" className="p-4 bg-gray-50 rounded-2xl border-none text-sm" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                <input placeholder="Area" className="p-4 bg-gray-50 rounded-2xl border-none text-sm" value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})} />
              </div>
              <input placeholder="General Payment Account (fallback for both)" className="w-full p-4 bg-gray-50 rounded-2xl border-none text-sm" value={formData.payment_info} onChange={e => setFormData({...formData, payment_info: e.target.value})} />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-gray-400 ml-2">Provider-Specific Accounts (optional)</label>
              <input placeholder="JazzCash Account" className="w-full p-4 bg-gray-50 rounded-2xl border-none text-sm" value={formData.jazzcash_account} onChange={e => setFormData({...formData, jazzcash_account: e.target.value})} />
              <input placeholder="EasyPaisa Account" className="w-full p-4 bg-gray-50 rounded-2xl border-none text-sm" value={formData.easypaisa_account} onChange={e => setFormData({...formData, easypaisa_account: e.target.value})} />
              <p className="text-[9px] text-gray-400 italic px-2">Leave blank to use the general account above for that provider's button.</p>
            </div>

            <button
              onClick={handleSave}
              disabled={isSubmitting}
              className="w-full bg-primary text-white py-4 rounded-2xl font-bold uppercase tracking-widest disabled:opacity-50 mt-4"
            >
              {isSubmitting ? 'Processing...' : (editingShop ? 'Update Shop' : 'Register Shop')}
            </button>
         </div>
      </Modal>
    </div>
  );
};

const ImpactPage = () => {
  const { user, myPledges } = useAuth();
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
          <h1 className="text-2xl font-display font-bold text-gray-800">Your Impact Journey</h1>
        </div>

        {/* Active Pledges Summary */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Active Pledges</h3>
          {myPledges.filter(p => p.status !== 'cancelled').length === 0 ? (
            <div className="text-center py-8 bg-white rounded-3xl border border-dashed border-gray-200">
              <p className="text-gray-400 text-xs italic">No pledges yet. Select a donee on the home page to pledge.</p>
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
                    <span>Remaining</span>
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
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Spending Feed</h3>
          {spendingFeed.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-3xl border border-dashed border-gray-200">
              <Heart className="w-10 h-10 text-gray-100 mx-auto mb-2" />
              <p className="text-gray-400 text-xs italic uppercase font-bold tracking-widest">No spending records yet.</p>
            </div>
          ) : (
            spendingFeed.map((link, idx) => {
              const rec = link.spending_records;
              if (!rec) return null;
              return (
                <div key={idx} className="p-5 bg-white rounded-[28px] border border-gray-100 shadow-sm space-y-3 relative overflow-hidden group">
                  <div className="flex justify-between items-start relative z-10">
                    <div className="space-y-1">
                      <p className="text-[8px] font-black text-primary uppercase tracking-widest">Beneficiary Impact</p>
                      <p className="font-bold text-slate-900">{rec.donees?.full_name}</p>
                      <p className="text-[10px] text-gray-400">Shop: {rec.profiles?.full_name || 'Shopkeeper'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-500">{new Date(rec.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-2xl relative z-10">
                    <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Items Released</p>
                    <p className="text-xs font-bold text-slate-700 leading-tight">{rec.items_description}</p>
                  </div>

                  <div className="flex justify-between items-center relative z-10 pt-1">
                    <div className="flex items-center space-x-1">
                      <div className={cn("w-2 h-2 rounded-full", rec.payment_status === 'paid' ? "bg-green-500" : "bg-amber-500")} />
                      <span className={cn("text-[9px] font-bold uppercase tracking-tighter", rec.payment_status === 'paid' ? "text-green-600" : "text-amber-600")}>
                        {rec.payment_status === 'paid' ? 'Paid' : 'Payment Pending'}
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
  const displayName = (user as any)?.full_name || user?.name || 'User';
  return (
    <div className="py-12 flex flex-col items-center space-y-8 animate-in fade-in duration-500">
      <div className="w-32 h-32 bg-primary/10 rounded-[48px] flex items-center justify-center text-primary text-4xl font-display font-bold">
        {displayName.substring(0, 2).toUpperCase()}
      </div>
      <div className="text-center">
        <h2 className="text-3xl font-display font-bold">{displayName}</h2>
        <p className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">{user?.role} Portal</p>
        <p className="text-xs text-gray-400 mt-2 font-mono">{user?.phone}</p>
      </div>
      <button onClick={logout} className="w-full p-6 text-red-500 font-bold bg-red-50 rounded-[32px] border border-red-100 flex items-center justify-center space-x-2 active:scale-95 transition-all">
        <LogOut className="w-5 h-5" />
        <span className="uppercase tracking-widest text-xs">Terminate Session</span>
      </button>
    </div>
  );
};

const HistoryPage = ({ onViewImage }: { onViewImage: (src: string) => void }) => {
  const { myPledges, user, getShopkeeperPayments, getShopkeeperSpendingByDonor, acknowledgeShopkeeperPayment, notifications } = useAuth();
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
        <h1 className="text-2xl font-display font-bold text-primary">System Records</h1>
        <div className="space-y-4">
          {isDonor && myPledges.map(pledge => (
            <div key={pledge.id} className="p-5 bg-white rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div className="flex items-center space-x-4">
                 <div className="p-3 bg-gray-50 rounded-2xl"><CreditCard className="w-6 h-6 text-primary" /></div>
                 <div>
                   <p className="font-bold text-sm">Pledge for {pledge.donees?.full_name}</p>
                   <p className="text-[10px] uppercase font-bold text-gray-400">{new Date(pledge.created_at).toLocaleDateString()}</p>
                   <p className="text-[9px] text-gray-400">Remaining: {formatCurrency(pledge.remaining_amount)}</p>
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
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mt-2">Accumulated by Donor</h3>
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
                          {summary.spending_records.length} transaction{summary.spending_records.length > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-bold text-slate-900">{formatCurrency(summary.total_amount)}</p>
                      {summary.total_unpaid > 0 ? (
                        <p className="text-[8px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{formatCurrency(summary.total_unpaid)} unpaid</p>
                      ) : (
                        <p className="text-[8px] font-bold uppercase px-2 py-0.5 rounded-full bg-green-100 text-green-700">Fully Paid</p>
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
                   <p className="font-bold text-sm">Goods Released</p>
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
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mt-6">Payment Proofs Received</h3>
              {shopPayments.map(payment => (
                <div key={payment.id} className="p-5 bg-white rounded-3xl border border-gray-100 shadow-sm space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-bold text-sm">{payment.profiles?.full_name || 'Donor'}</p>
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
                        <ImageIcon className="w-2 h-2 mr-1" /> View Proof
                      </button>
                    ) : <span />}
                    {payment.status === 'submitted' && (
                      <button
                        onClick={() => handleAcknowledgePayment(payment.id)}
                        className="text-[8px] font-black text-green-600 uppercase flex items-center bg-green-50 px-2 py-1 rounded-md active:scale-95 transition-all"
                      >
                        <CheckCircle2 className="w-2 h-2 mr-1" /> Acknowledge
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
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total from this donor</p>
                <p className="font-display font-bold text-xl text-slate-900">{formatCurrency(selectedDonorSummary.total_amount)}</p>
              </div>
              {selectedDonorSummary.total_unpaid > 0 && (
                <div className="text-right">
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Unpaid</p>
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

const TrustPage = () => (
  <div className="py-10 space-y-8 animate-in fade-in duration-500">
    <div className="text-center space-y-2">
      <ShieldCheck className="w-16 h-16 text-primary mx-auto" />
      <h1 className="text-3xl font-display font-bold text-slate-900">Our Trust Policy</h1>
      <p className="text-[10px] font-black uppercase text-primary tracking-widest">Pledge-Based No-Custody Guarantee</p>
    </div>

    <section className="space-y-4">
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <h3 className="font-bold text-sm mb-2 flex items-center"><CheckCircle2 className="w-4 h-4 text-primary mr-2" /> Pledge Model</h3>
        <p className="text-xs text-gray-500 leading-relaxed">Donors pledge money for donees. Credit becomes available immediately at verified shopkeepers. No upfront payment is required - donors pay shopkeepers directly after goods are released.</p>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <h3 className="font-bold text-sm mb-2 flex items-center"><CheckCircle2 className="w-4 h-4 text-primary mr-2" /> Direct Shopkeeper Payment</h3>
        <p className="text-xs text-gray-500 leading-relaxed">When a shopkeeper releases goods to a donee, the spending appears on the donor's dashboard. The donor pays the shopkeeper directly via EasyPaisa or JazzCash and uploads proof. HaqDaar never touches your money.</p>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <h3 className="font-bold text-sm mb-2 flex items-center"><CheckCircle2 className="w-4 h-4 text-primary mr-2" /> Verified Identity</h3>
        <p className="text-xs text-gray-500 leading-relaxed">Every recipient (Donee) and Agent (Shopkeeper) is manually verified by our ground team before being added to the platform.</p>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <h3 className="font-bold text-sm mb-2 flex items-center"><CheckCircle2 className="w-4 h-4 text-primary mr-2" /> Open Ledger</h3>
        <p className="text-xs text-gray-500 leading-relaxed">Every pledge, spending record, and payment proof is recorded on an immutable ledger. All parties receive real-time notifications at every step.</p>
      </div>
    </section>

    <div className="p-6 bg-slate-900 rounded-[32px] text-white text-center">
       <p className="text-[10px] font-bold opacity-50 uppercase mb-2">Need Help?</p>
       <p className="text-sm font-bold">Contact HaqDaar Transparency Office</p>
       <p className="text-xs opacity-70 mt-1">support@haqdaar.org</p>
    </div>
  </div>
);

export default function App() {
  const { user, isLoading } = useAuth();
  const [activeViewerImage, setActiveViewerImage] = useState<string | null>(null);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

  return (
    <>
      <Routes>
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/home" />} />
        <Route path="/home" element={user ? <Layout><HomePage onViewImage={setActiveViewerImage} /></Layout> : <Navigate to="/login" />} />
        <Route path="/scan" element={user ? <Layout><ScanPage /></Layout> : <Navigate to="/login" />} />
        <Route path="/impact" element={user ? <Layout><ImpactPage /></Layout> : <Navigate to="/login" />} />
        <Route path="/history" element={user ? <Layout><HistoryPage onViewImage={setActiveViewerImage} /></Layout> : <Navigate to="/login" />} />
        <Route path="/admin/manage" element={user?.role?.toLowerCase() === 'admin' ? <Layout><AdminManagePage /></Layout> : <Navigate to="/login" />} />
        <Route path="/admin/shopkeepers" element={user?.role?.toLowerCase() === 'admin' ? <Layout><AdminShopkeeperPage /></Layout> : <Navigate to="/login" />} />
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
