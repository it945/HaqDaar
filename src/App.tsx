import React, { useState, useRef, useEffect } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Home, QrCode, History, User, Scan, LayoutDashboard, LogOut, Menu, X, ArrowLeft, Bell, Sparkles, Send, Loader2, Heart, Plus, Wallet, Landmark, ClipboardList, CheckCircle2, ShoppingBag, Receipt, ArrowRight, Camera, Upload, Edit, Users, FileText, Activity, ShieldCheck, HelpCircle, Copy, Check, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth, Donee } from './context/AuthContext';
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
  const [position, setPosition] = useState({ x: 0, y: 0 });

  return (
    <AnimatePresence>
      {isOpen && src && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center overflow-hidden"
        >
          <div className="absolute top-10 right-6 z-[110]">
            <button
              onClick={() => { setScale(1); setPosition({x:0, y:0}); onClose(); }}
              className="p-4 bg-white/10 backdrop-blur-md rounded-full text-white active:scale-90 transition-all border border-white/20"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <motion.div
            drag
            dragConstraints={{ left: -300, right: 300, top: -500, bottom: 500 }}
            style={{ x: position.x, y: position.y, scale }}
            onPointerDown={(e) => {
              if (e.pointerType === 'touch' && scale === 1) {
                // Double tap to zoom simulation or just let standard drag happen
              }
            }}
            className="w-full h-full flex items-center justify-center p-4 cursor-grab active:cursor-grabbing"
          >
            <img
              src={src}
              alt="Payment Proof"
              className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
              onDoubleClick={() => setScale(prev => prev === 1 ? 2.5 : 1)}
            />
          </motion.div>

          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center space-x-6 bg-black/40 backdrop-blur-xl px-6 py-3 rounded-full border border-white/10 text-white">
             <button onClick={() => setScale(prev => Math.max(1, prev - 0.5))} className="p-2"><Minus className="w-5 h-5" /></button>
             <span className="text-[10px] font-bold uppercase tracking-widest">{Math.round(scale * 100)}%</span>
             <button onClick={() => setScale(prev => Math.min(4, prev + 0.5))} className="p-2"><Plus className="w-5 h-5" /></button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const HomePage = ({ onViewImage }: { onViewImage: (src: string) => void }) => {
  const { user, donees, myDonations, openEasyPaisa, initiateJazzCash, submitDonationProof, verifyDonation, initiateSettlement, getSettlementData, registerDonee, updateDonee, getAdminDonees, getAuditLogs, getReports, reviewSpendingRecord } = useAuth();
  const [selectedDonee, setSelectedDonee] = useState<Donee | null>(null);
  const [view, setView] = useState<'verify' | 'settle' | 'register' | 'manage_donees' | 'reports' | 'audit_logs' | ''>('');
  const [donationAmount, setDonationAmount] = useState('1000');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingRecords, setPendingRecords] = useState<any[]>([]);
  const [settlementList, setSettlementList] = useState<any[]>([]);
  const [adminDoneeList, setAdminDoneeList] = useState<Donee[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [reportsData, setReportsData] = useState<any>(null);
  const [editingDonee, setEditingDonee] = useState<Donee | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [spendingHistory, setSpendingHistory] = useState<any[]>([]);
  const [proofImage, setProofImage] = useState<string | null>(null);

  const copyToClipboard = async (text: string) => {
    await Clipboard.write({ string: text });
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const isDonor = user?.role === 'donor';
  const isShop = user?.role === 'shopkeeper';
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (user?.role === 'shopkeeper') {
      supabase.from('spending_records').select('*, donees(full_name)')
        .eq('shopkeeper_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => setSpendingHistory(data || []));
    }
  }, [user]);

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
    if (view === 'verify') {
      // Explicitly selecting columns to bypass any schema cache issues
      supabase.from('donation_records')
        .select('id, amount, status, transaction_reference, proof_screenshot_url, created_at, donor_id, donee_id, profiles(full_name), donees(full_name)')
        .eq('status', 'pending_verification')
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (error) alert("Admin Fetch Error: " + error.message);
          console.log("Admin Data Sample:", data?.[0]);
          setPendingRecords(data || []);
        });
    }
    if (view === 'settle') {
      getSettlementData().then(data => {
        setSettlementList(data);
      });
    }
    if (view === 'manage_donees') {
      getAdminDonees().then(setAdminDoneeList);
    }
    if (view === 'audit_logs') {
      getAuditLogs().then(setAuditLogs);
    }
    if (view === 'reports') {
      getReports().then(setReportsData);
    }
  }, [view]);

  const handleDonate = async (method: 'easypaisa' | 'jazzcash') => {
    if (!selectedDonee) return;
    const phone = selectedDonee.receiving_account_masked.replace(/\D/g, '');

    // Native Auto-copy for 2026 security compliance
    await Clipboard.write({ string: phone });
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);

    if (method === 'jazzcash') {
      initiateJazzCash(phone, parseFloat(donationAmount));
    } else {
      openEasyPaisa(phone, parseFloat(donationAmount));
    }
  };

  const pickProofImage = async () => {
    try {
      const image = await CapCamera.getPhoto({
        quality: 30, // Optimized for high reliability
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos
      });
      if (image.dataUrl) {
        setProofImage(image.dataUrl);
        alert("Image Ready! (Size: " + Math.round(image.dataUrl.length / 1024) + " KB)");
      }
    } catch (e) {
      console.log('User cancelled');
    }
  };

  const handleSubmitProof = async () => {
    if (!selectedDonee) return;
    if (!proofImage) {
      alert("Please select a screenshot proof first.");
      return;
    }
    setIsSubmitting(true);
    try {
      const reference = 'REF-' + Math.random().toString(36).substring(7).toUpperCase();
      await submitDonationProof(selectedDonee.id, parseFloat(donationAmount), reference, proofImage);

      alert('Proof submitted! It will appear in your Impact Wallet once verified.');
      setSelectedDonee(null);
      setProofImage(null);
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
            {isDonor ? 'Direct aid transparency.' : isShop ? 'Shopkeeper agent portal.' : 'System oversight active.'}
          </p>
        </div>
        <div className="flex space-x-2">
           {isAdmin && (
             <button onClick={() => setView('register')} className="p-2 bg-primary/10 rounded-full text-primary">
               <Plus className="w-6 h-6" />
             </button>
           )}
           <button className="p-2 bg-white rounded-full shadow-sm"><Bell className="w-6 h-6 text-slate-600" /></button>
        </div>
      </header>

      {/* Hero Card */}
      <div className="bg-primary rounded-[32px] p-8 text-white shadow-xl shadow-primary/20 relative overflow-hidden active:scale-[0.98] transition-all">
        <div className="relative z-10">
          <p className="text-primary-light text-[10px] font-bold uppercase tracking-[0.2em] mb-1">
            {isDonor ? 'My Impact Wallet' : isShop ? 'Agent Status' : 'Global Verified Aid'}
          </p>
          <h2 className="text-4xl font-display font-bold">
            {isDonor ? formatCurrency(myDonations.reduce((acc, d) => d.status === 'verified' ? acc + Number(d.amount) : acc, 0)) : isShop ? formatCurrency(spendingHistory.reduce((acc, s) => acc + Number(s.amount), 0)) : formatCurrency(reportsData?.totalDonations || 0)}
          </h2>
          <p className="text-[10px] mt-4 opacity-70 uppercase tracking-widest font-bold">
            {isDonor ? 'Total Verified Direct Donations' : isShop ? 'Total Goods Distributed' : 'Verified Transparency Records'}
          </p>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
      </div>

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

      {isShop && (
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
      )}

      {isAdmin && (
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => setView('verify')} className="bg-white p-6 rounded-[28px] shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-3 active:scale-95 transition-all">
            <div className="p-4 bg-primary/5 rounded-2xl"><CheckCircle2 className="w-8 h-8 text-primary" /></div>
            <span className="font-bold text-xs uppercase tracking-widest text-gray-700 text-center">Verify Proofs</span>
          </button>
          <Link to="/admin/manage" className="bg-white p-6 rounded-[28px] shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-3 active:scale-95 transition-all">
            <div className="p-4 bg-blue-50 rounded-2xl"><Users className="w-8 h-8 text-blue-600" /></div>
            <span className="font-bold text-xs uppercase tracking-widest text-gray-700 text-center">Manage Donees</span>
          </Link>
          <Link to="/settlements" className="bg-white p-6 rounded-[28px] shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-3 active:scale-95 transition-all">
            <div className="p-4 bg-amber-50 rounded-2xl"><Landmark className="w-8 h-8 text-amber-600" /></div>
            <span className="font-bold text-xs uppercase tracking-widest text-gray-700 text-center">Review Records</span>
          </Link>
          <button onClick={() => setView('reports')} className="bg-white p-6 rounded-[28px] shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-3 active:scale-95 transition-all">
            <div className="p-4 bg-purple-50 rounded-2xl"><FileText className="w-8 h-8 text-purple-600" /></div>
            <span className="font-bold text-xs uppercase tracking-widest text-gray-700 text-center">Reports</span>
          </button>
          <button onClick={() => setView('audit_logs')} className="col-span-2 bg-white p-6 rounded-[28px] shadow-sm border border-gray-100 flex items-center justify-center space-x-4">
            <Activity className="w-6 h-6 text-gray-400" />
            <span className="font-bold text-xs uppercase tracking-widest text-gray-700">Audit & Security Logs</span>
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

            {/* The "Card" to be printed */}
            <div className={cn("p-6 border-2 border-primary rounded-3xl bg-white flex flex-col items-center space-y-3 shadow-sm", newDonee.full_name ? "block" : "hidden print:hidden")}>
               <div className="w-full flex justify-between items-center border-b border-primary/20 pb-2">
                  <h4 className="font-display font-bold text-primary text-sm">HAQDAAR ID</h4>
                  <span className="text-[8px] font-black uppercase text-gray-400">Verified Identity</span>
               </div>
               <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center text-3xl">👤</div>
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

      {/* Admin Verification Modal */}
      <Modal isOpen={view === 'verify'} onClose={() => setView('')} title="Verify Donation Proofs">
         <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-2 pb-10">
            {pendingRecords.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <p className="text-gray-400 font-medium italic">All proofs have been processed.</p>
              </div>
            )}

            {pendingRecords.map(rec => (
              <div key={rec.id} className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-primary uppercase tracking-widest">Submission Date</p>
                      <p className="text-xs font-bold text-slate-500">{new Date(rec.created_at).toLocaleString()}</p>
                    </div>
                    <div className="bg-primary/10 px-3 py-1 rounded-full">
                      <p className="text-[10px] font-bold text-primary uppercase">{formatCurrency(rec.amount)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-2">
                    <div className="space-y-1">
                      <p className="text-[8px] font-black text-gray-400 uppercase">From (Donor)</p>
                      <p className="text-xs font-bold text-slate-900 leading-tight">{rec.profiles?.full_name}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[8px] font-black text-gray-400 uppercase">To (Donee)</p>
                      <p className="text-xs font-bold text-slate-900 leading-tight">{rec.donees?.full_name}</p>
                    </div>
                  </div>

                  <div className="space-y-1 bg-gray-50 p-3 rounded-2xl">
                    <p className="text-[8px] font-black text-gray-400 uppercase">Transaction Reference</p>
                    <p className="text-xs font-mono font-bold text-primary tracking-tight">
                      {rec.transaction_reference || 'NO-REF'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[8px] font-black text-gray-400 uppercase">Attached Proof</p>
                    {rec.proof_screenshot_url || rec.transaction_reference?.startsWith('IMG_DATA|') ? (
                      <button
                        onClick={() => onViewImage(rec.proof_screenshot_url || rec.transaction_reference.split('|')[1])}
                        className="w-full aspect-[4/3] bg-gray-100 rounded-2xl relative overflow-hidden border border-gray-200 active:scale-[0.98] transition-all"
                      >
                         <img
                           src={rec.proof_screenshot_url || rec.transaction_reference.split('|')[1]}
                           className="w-full h-full object-cover"
                           alt="Proof"
                           onError={() => alert("Image display error: Source might be corrupted")}
                         />
                         <div className="absolute top-2 left-2 bg-white/70 px-2 py-0.5 rounded text-[6px] font-mono">
                           Type: {(rec.proof_screenshot_url || rec.transaction_reference.split('|')[1]).substring(0, 15)}...
                         </div>
                         <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <Sparkles className="w-8 h-8 text-white" />
                         </div>
                         <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-[8px] text-white font-bold uppercase">Tap to Zoom</div>
                      </button>
                    ) : (
                      <div className="aspect-[4/3] bg-gray-100 rounded-2xl flex items-center justify-center relative overflow-hidden border border-gray-200">
                         <ImageIcon className="w-10 h-10 text-gray-300" />
                         <button
                           onClick={() => alert("Debug Info: " + JSON.stringify({
                             hasUrl: !!rec.proof_screenshot_url,
                             urlLength: rec.proof_screenshot_url?.length,
                             allKeys: Object.keys(rec)
                           }))}
                           className="absolute bottom-3 text-[8px] font-bold text-gray-400 uppercase tracking-widest italic"
                         >
                           No image data found (Tap for details)
                         </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex border-t border-gray-50 p-2 bg-gray-50/30 gap-2">
                  <button
                    onClick={() => verifyDonation(rec.id, 'verified').then(() => {
                      setPendingRecords(prev => prev.filter(p => p.id !== rec.id));
                      getReports().then(setReportsData);
                      if(pendingRecords.length <= 1) setView('');
                    })}
                    className="flex-1 py-4 bg-[#006A4E] text-white rounded-2xl text-xs font-bold uppercase tracking-widest active:scale-95 transition-all shadow-md"
                  >
                    Approve Proof
                  </button>
                  <button
                    onClick={() => verifyDonation(rec.id, 'rejected').then(() => {
                      setPendingRecords(prev => prev.filter(p => p.id !== rec.id));
                      if(pendingRecords.length <= 1) setView('');
                    })}
                    className="px-6 py-4 bg-red-50 text-red-500 rounded-2xl text-xs font-bold uppercase active:scale-95 transition-all"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
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
                <button onClick={() => { setEditingDonee(donee); setView('register'); /* Simulating Edit */ }} className="px-4 py-2 bg-primary/5 text-primary rounded-xl active:scale-95 transition-all"><Edit className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* Admin Review Modal (Previously Settlement) */}
      <Modal isOpen={view === 'settle'} onClose={() => setView('')} title="Spending Record Review">
         <div className="space-y-4">
            <div className="p-6 bg-slate-900 rounded-3xl text-white">
               <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest mb-1">Notice</p>
               <p className="text-xs">HaqDaar platform does not handle funds. This review is for transparency and trust auditing only.</p>
            </div>
            <div className="space-y-3">
              {settlementList.length === 0 && <p className="text-center text-gray-400 py-12">No records to review.</p>}
              {settlementList.map((rec, i) => (rec.profiles || rec.shopkeepers) && (
                <div key={i} className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-3">
                   <div className="flex justify-between items-start">
                     <div>
                       <p className="font-bold text-sm">{(rec.profiles?.full_name || rec.shopkeepers?.shop_name)}</p>
                       <p className="text-[10px] text-gray-400">Release of {rec.items_description}</p>
                     </div>
                     <p className="font-bold text-sm text-primary">{formatCurrency(rec.amount)}</p>
                   </div>
                   <div className="flex space-x-2">
                      <button onClick={() => reviewSpendingRecord(rec.id, 'verified').then(() => setView(''))} className="flex-1 py-3 bg-primary text-white rounded-xl text-[10px] font-bold uppercase active:scale-95 transition-all">Mark Verified</button>
                      <button onClick={() => reviewSpendingRecord(rec.id, 'rejected').then(() => setView(''))} className="flex-1 py-3 bg-red-50 text-red-500 rounded-xl text-[10px] font-bold uppercase active:scale-95 transition-all">Flag Issue</button>
                   </div>
                </div>
              ))}
            </div>
         </div>
      </Modal>

      {/* Admin Reports Modal */}
      <Modal isOpen={view === 'reports'} onClose={() => setView('')} title="Platform Analytics">
         {reportsData ? (
           <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-primary/5 p-4 rounded-2xl">
                    <p className="text-[10px] font-bold text-primary uppercase">Total Verified Aid</p>
                    <p className="text-xl font-display font-bold text-primary">{formatCurrency(reportsData.totalDonations)}</p>
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
              <p className="text-[10px] text-center text-gray-400 italic mt-12">Data updated in real-time from blockchain-ready ledger.</p>
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
                    <p className="text-xs font-bold text-slate-900">{log.action.replace('_', ' ')}</p>
                    <p className="text-[10px] text-gray-400">{log.profiles?.full_name} • {new Date(log.created_at).toLocaleString()}</p>
                 </div>
              </div>
            ))}
         </div>
      </Modal>

      <Modal
        isOpen={!!selectedDonee}
        onClose={() => setSelectedDonee(null)}
        title={selectedDonee?.full_name || ''}
      >
        {selectedDonee && (
          <div className="space-y-6">
            <div className="bg-gray-50 p-6 rounded-3xl space-y-4">
              <div className="flex justify-between items-center text-xs font-bold uppercase text-gray-400">
                <span>Account Number (EasyPaisa)</span>
                {isCopied ? (
                  <span className="text-green-500 flex items-center"><Check className="w-3 h-3 mr-1" /> Copied</span>
                ) : (
                  <button onClick={() => copyToClipboard(selectedDonee.receiving_account_masked.replace(/\D/g, ''))} className="text-primary flex items-center hover:opacity-70">
                    <Copy className="w-3 h-3 mr-1" /> Copy
                  </button>
                )}
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-200 flex flex-col space-y-4">
                <div className="flex justify-between items-center w-full">
                  <p className="text-xl font-display font-bold text-[#006A4E] tracking-tight">{selectedDonee.receiving_account_masked}</p>
                  <div className="text-right">
                    <p className="text-[8px] font-black text-gray-400 uppercase">Account Title</p>
                    <p className="text-xs font-bold text-slate-800">{selectedDonee.receiving_account_title || selectedDonee.full_name}</p>
                  </div>
                </div>

                {/* Physical QR for Level 2 Manual Scan if Direct-Autofill fails */}
                <div className="bg-gray-50 p-4 rounded-2xl flex flex-col items-center space-y-3 border border-dashed border-gray-200">
                   <div className="bg-white p-2 rounded-xl shadow-sm">
                      <QRCodeSVG
                        value={selectedDonee.receiving_method?.startsWith('0002') ? selectedDonee.receiving_method : `raast://p2p?alias=${selectedDonee.receiving_account_masked.replace(/\D/g, '')}&amount=${donationAmount}`}
                        size={140}
                      />
                   </div>
                   <p className="text-[9px] font-bold text-gray-400 text-center uppercase leading-tight px-4">
                     Donor Tip: If autofill doesn't open, open EasyPaisa manually and scan this code from a secondary screen.
                   </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3 bg-white p-3 rounded-2xl border border-gray-200">
                   <span className="text-xs font-bold text-gray-400 px-2">Rs.</span>
                   <input
                     type="number"
                     className="flex-1 bg-transparent outline-none font-display font-bold text-xl"
                     value={donationAmount}
                     onChange={e => setDonationAmount(e.target.value)}
                   />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold uppercase text-gray-400 ml-2">Pay With:</label>
                  </div>

                  <button
                    onClick={() => handleDonate('easypaisa')}
                    className="w-full group relative overflow-hidden bg-white border border-gray-100 p-1.5 rounded-[28px] active:scale-[0.97] transition-all shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-center p-3 rounded-[22px] bg-[#006A4E]/5 group-hover:bg-[#006A4E] transition-all duration-500">
                      <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center p-2 mr-4 group-hover:scale-105 transition-transform">
                        <img
                          src="https://www.easypaisa.com.pk/wp-content/uploads/2023/12/ep-logo.png"
                          alt="EasyPaisa"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement!.innerHTML = '<div class="text-[#006A4E] font-black text-2xl">e</div>';
                          }}
                        />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-display font-bold text-slate-900 group-hover:text-white text-base leading-tight">EasyPaisa</p>
                        <p className="text-[10px] font-bold text-slate-500 group-hover:text-white/80 uppercase tracking-tighter">Digital Bank • One-Tap Autofill</p>
                      </div>
                      <div className="w-10 h-10 flex items-center justify-center bg-white/20 rounded-full group-hover:bg-white/10 transition-colors">
                        <ArrowRight className="w-5 h-5 text-[#006A4E] group-hover:text-white" />
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-gray-400 ml-4">Step 2: Upload Payment Proof</label>
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
              disabled={isSubmitting}
              onClick={handleSubmitProof}
              className="w-full bg-slate-900 text-white py-5 rounded-[24px] font-bold shadow-xl shadow-slate-900/20 disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Verification Proof'}
            </button>
            <p className="text-[10px] text-center text-gray-400 italic">Copy the number, pay via your app, and upload proof. HaqDaar never touches the money.</p>
          </div>
        )}
      </Modal>

      <ImageViewer
        src={activeViewerImage}
        isOpen={!!activeViewerImage}
        onClose={() => setActiveViewerImage(null)}
      />
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
        () => {} // silent on scan failure
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
          <p className="text-gray-400 text-sm">Transparency ledger updated. Settlement pending.</p>
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
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-2">No-Custody Transparency</p>
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
    { icon: HelpCircle, label: 'Trust', path: '/how-it-works' },
    { icon: QrCode, label: 'My ID', path: '/qr', showOnly: ['donor'] },
    { icon: History, label: 'History', path: '/history' },
    { icon: User, label: 'Profile', path: '/profile' },
  ].filter(item => !item.showOnly || item.showOnly.includes(user?.role || ''));

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
                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-xl">👤</div>
                <div>
                  <p className="font-bold text-slate-900">{donee.full_name}</p>
                  <p className="text-[10px] uppercase text-gray-400 font-bold">{donee.city}, {donee.area}</p>
                </div>
              </div>
              <div className={cn("px-3 py-1 rounded-full text-[8px] font-black uppercase", donee.status === 'approved' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")}>
                {donee.status}
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
               <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center text-3xl">👤</div>
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

const SettlementPage = () => {
  const { user, getSettlementData, initiateSettlement, reviewSpendingRecord } = useAuth();
  const [settlementList, setSettlementList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const data = await getSettlementData();
    setSettlementList(data);
    setLoading(false);
  };

  if (user?.role !== 'admin' && user?.role !== 'shopkeeper') return <Navigate to="/home" />;

  return (
    <div className="space-y-6 py-6">
      <h1 className="text-2xl font-display font-bold text-primary">Settlement & Audit</h1>

      <div className="p-6 bg-slate-900 rounded-[32px] text-white">
         <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest mb-1">Trust Protocol</p>
         <p className="text-xs leading-relaxed opacity-80">Verify shopkeeper releases against physical receipts. Mark as settled only after verifying the goods reached the intended donee.</p>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : settlementList.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[32px] border border-dashed border-gray-200">
             <CheckCircle2 className="w-12 h-12 text-gray-200 mx-auto mb-2" />
             <p className="text-gray-400 text-sm italic">No pending records for review.</p>
          </div>
        ) : (
          settlementList.map((rec, i) => (
            <div key={i} className="p-5 bg-white rounded-[32px] border border-gray-100 shadow-sm space-y-4">
               <div className="flex justify-between items-start">
                 <div className="flex items-center space-x-3">
                   <div className="p-3 bg-primary/5 rounded-2xl text-primary"><ShoppingBag className="w-5 h-5" /></div>
                   <div>
                     <p className="font-bold text-slate-900">{rec.profiles?.full_name || 'Shopkeeper'}</p>
                     <p className="text-[10px] text-gray-400 uppercase font-bold">{rec.items_description}</p>
                   </div>
                 </div>
                 <p className="font-display font-bold text-primary">{formatCurrency(rec.amount)}</p>
               </div>

               <div className="flex space-x-2 pt-2 border-t border-gray-50">
                  <button
                    onClick={() => reviewSpendingRecord(rec.id, 'verified').then(fetchData)}
                    className="flex-1 py-3 bg-primary text-white rounded-2xl text-[10px] font-bold uppercase active:scale-95 transition-all shadow-md"
                  >
                    Mark Verified
                  </button>
                  <button
                    onClick={() => reviewSpendingRecord(rec.id, 'rejected').then(fetchData)}
                    className="px-6 py-3 bg-red-50 text-red-500 rounded-2xl text-[10px] font-bold uppercase active:scale-95 transition-all"
                  >
                    Flag
                  </button>
               </div>
            </div>
          ))
        )}
      </div>

      {user.role === 'admin' && settlementList.length > 0 && (
         <div className="pt-6">
            <button
              onClick={() => {
                // In a real app, you'd select which shopkeeper to settle
                const uniqueShops = [...new Set(settlementList.map(r => r.shopkeeper_id))];
                uniqueShops.forEach(id => initiateSettlement(id).then(fetchData));
              }}
              className="w-full bg-slate-900 text-white py-5 rounded-[28px] font-bold flex items-center justify-center space-x-2 shadow-xl shadow-slate-900/20"
            >
              <Landmark className="w-5 h-5" />
              <span className="uppercase tracking-widest text-xs">Settle All Grouped Records</span>
            </button>
         </div>
      )}
    </div>
  );
};

const ProfilePage = () => {
  const { user, logout } = useAuth();
  const displayName = user?.full_name || user?.name || 'User';
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
  const { myDonations, user } = useAuth();
  const [spendingHistory, setSpendingHistory] = useState<any[]>([]);

  useEffect(() => {
    if (user?.role === 'shopkeeper') {
      supabase.from('spending_records').select('*, donees(full_name)')
        .eq('shopkeeper_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => setSpendingHistory(data || []));
    }
  }, [user]);

  return (
    <div className="space-y-6 py-6">
      <h1 className="text-2xl font-display font-bold text-primary">System Records</h1>
      <div className="space-y-4">
        {user?.role === 'donor' && myDonations.map(dn => (
          <div key={dn.id} className="p-5 bg-white rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div className="flex items-center space-x-4">
               <div className="p-3 bg-gray-50 rounded-2xl"><Receipt className="w-6 h-6 text-gray-400" /></div>
               <div>
                 <p className="font-bold text-sm">Direct Donation Proof</p>
                 <p className="text-[10px] uppercase font-bold text-gray-400">{new Date(dn.created_at).toLocaleDateString()}</p>
                 {dn.proof_screenshot_url && (
                   <button
                     onClick={() => onViewImage(dn.proof_screenshot_url!)}
                     className="mt-1 text-[8px] font-black text-primary uppercase flex items-center bg-primary/5 px-2 py-1 rounded-md active:scale-95 transition-all"
                   >
                     <ImageIcon className="w-2 h-2 mr-1" /> View Sent Proof
                   </button>
                 )}
               </div>
            </div>
            <div className="text-right">
              <p className="font-display font-bold text-primary">{formatCurrency(dn.amount)}</p>
              <p className={cn("text-[8px] font-bold uppercase px-2 py-0.5 rounded-full", dn.status === 'verified' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>{dn.status}</p>
            </div>
          </div>
        ))}

        {user?.role === 'shopkeeper' && spendingHistory.map(sh => (
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
              <p className={cn("text-[8px] font-bold uppercase px-2 py-0.5 rounded-full", sh.settlement_status === 'settled' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>{sh.settlement_status}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const TrustPage = () => (
  <div className="py-10 space-y-8 animate-in fade-in duration-500">
    <div className="text-center space-y-2">
      <ShieldCheck className="w-16 h-16 text-primary mx-auto" />
      <h1 className="text-3xl font-display font-bold text-slate-900">Our Trust Policy</h1>
      <p className="text-[10px] font-black uppercase text-primary tracking-widest">No-Custody Guarantee</p>
    </div>

    <section className="space-y-4">
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <h3 className="font-bold text-sm mb-2 flex items-center"><CheckCircle2 className="w-4 h-4 text-primary mr-2" /> Direct Payments</h3>
        <p className="text-xs text-gray-500 leading-relaxed">Donors pay recipients directly via EasyPaisa or JazzCash. HaqDaar never touches your money. We only record the proof of transaction for transparency.</p>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <h3 className="font-bold text-sm mb-2 flex items-center"><CheckCircle2 className="w-4 h-4 text-primary mr-2" /> Verified Identity</h3>
        <p className="text-xs text-gray-500 leading-relaxed">Every recipient (Donee) and Agent (Shopkeeper) is manually verified by our ground team before being added to the platform.</p>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <h3 className="font-bold text-sm mb-2 flex items-center"><CheckCircle2 className="w-4 h-4 text-primary mr-2" /> Open Ledger</h3>
        <p className="text-xs text-gray-500 leading-relaxed">Every rupee donated and every item released is recorded on an immutable ledger, accessible for audit by our transparency partners.</p>
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
        <Route path="/history" element={user ? <Layout><HistoryPage onViewImage={setActiveViewerImage} /></Layout> : <Navigate to="/login" />} />
        <Route path="/admin/manage" element={user?.role === 'admin' ? <Layout><AdminManagePage /></Layout> : <Navigate to="/login" />} />
        <Route path="/settlements" element={user ? <Layout><SettlementPage /></Layout> : <Navigate to="/login" />} />
        <Route path="/profile" element={user ? <Layout><ProfilePage /></Layout> : <Navigate to="/login" />} />
        <Route path="/how-it-works" element={<Layout><TrustPage /></Layout>} />
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
