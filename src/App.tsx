import React, { useState, useRef, useEffect } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Home, QrCode, History, User, Scan, LayoutDashboard, LogOut, Menu, X, ArrowLeft, Bell, Sparkles, Send, Loader2, Heart, Plus, Wallet, Landmark, ClipboardList, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './context/AuthContext';
import { cn, formatCurrency } from './lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { askHaqDaarAssistant } from './services/geminiService';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';

const chartDataMock = [
  { name: 'Jan', amount: 4500 },
  { name: 'Feb', amount: 5200 },
  { name: 'Mar', amount: 4800 },
  { name: 'Apr', amount: 6100 },
  { name: 'May', amount: 3900 },
];

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
        />
        <motion.div
          initial={{ opacity: 0, y: "100%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "100%" }}
          className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-[40px] z-[70] p-8 pb-32 shadow-2xl"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-display font-bold text-slate-900 font-bold">{title}</h3>
            <button onClick={onClose} className="p-2 bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
          </div>
          {children}
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

const NotificationDrawer = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Notifications">
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
      {[
        { title: 'System Notification', text: 'Identity verification protocols updated.', time: '2 hours ago', icon: Sparkles, color: 'bg-primary' },
        { title: 'Network Update', text: 'Global Trust network reached new milestone.', time: 'Earlier today', icon: Heart, color: 'bg-red-500' },
      ].map((n, i) => (
        <div key={i} className="flex space-x-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
           <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0", n.color)}>
              <n.icon className="w-5 h-5" />
           </div>
           <div className="space-y-1">
             <h4 className="font-bold text-sm text-slate-900 font-bold">{n.title}</h4>
             <p className="text-xs text-gray-500 leading-relaxed">{n.text}</p>
             <p className="text-[10px] text-gray-400 font-bold uppercase">{n.time}</p>
           </div>
        </div>
      ))}
    </div>
  </Modal>
);

const TransactionDetailModal = ({ isOpen, onClose, transaction }: { isOpen: boolean, onClose: () => void, transaction: any }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Transaction Details">
    {transaction && (
      <div className="space-y-6">
        <div className="flex flex-col items-center py-4 space-y-2">
          <div className="w-20 h-20 bg-gray-50 rounded-[32px] flex items-center justify-center text-4xl shadow-inner mb-2">
            {transaction.icon || '📜'}
          </div>
          <h4 className="text-2xl font-display font-bold text-primary">{formatCurrency(transaction.amount)}</h4>
          <p className="text-gray-500 font-bold text-sm">{transaction.title || 'System Record'}</p>
        </div>

        <div className="bg-gray-50 rounded-3xl p-6 space-y-4 divide-y divide-gray-200/50">
          <div className="flex justify-between items-center py-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Status</span>
            <span className="text-xs font-bold text-green-600 bg-green-100 px-3 py-1 rounded-full uppercase tracking-widest">Completed</span>
          </div>
          <div className="flex justify-between items-center py-3">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Date & Time</span>
            <span className="text-sm font-bold text-gray-700">{transaction.date}</span>
          </div>
        </div>

        <button className="w-full flex items-center justify-center space-x-2 py-4 text-primary font-bold text-sm border-2 border-primary/10 rounded-2xl hover:bg-primary/5 transition-colors">
          <History className="w-4 h-4" />
          <span>Need Help with this?</span>
        </button>
      </div>
    )}
  </Modal>
);

const AIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    const response = await askHaqDaarAssistant(userMsg);
    setMessages(prev => [...prev, { role: 'ai', text: response }]);
    setIsTyping(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-6 bottom-24 p-4 bg-primary text-white rounded-full shadow-lg shadow-primary/40 hover:scale-110 active:scale-95 transition-all z-40 flex items-center space-x-2"
      >
        <Sparkles className="w-6 h-6" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="fixed inset-0 sm:inset-auto sm:right-6 sm:bottom-24 sm:w-[400px] sm:h-[600px] bg-white z-50 sm:rounded-[32px] overflow-hidden shadow-2xl flex flex-col border border-gray-100"
          >
            <div className="p-6 bg-primary text-white flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <Sparkles className="w-5 h-5 text-white" />
                <h3 className="font-bold">HaqDaar AI</h3>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-12 space-y-4">
                  <Sparkles className="w-8 h-8 text-primary/40 mx-auto" />
                  <p className="text-slate-400 font-bold px-4">Ask me anything about your balance or HaqDaar services.</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={cn(
                  "max-w-[85%] p-4 rounded-2xl text-sm",
                  m.role === 'user' ? "bg-primary text-white ml-auto rounded-tr-none" : "bg-gray-50 text-gray-800 mr-auto rounded-tl-none border border-gray-100"
                )}>
                  {m.text}
                </div>
              ))}
              {isTyping && (
                <div className="bg-gray-50 text-gray-800 mr-auto p-4 rounded-2xl border border-gray-100">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100">
              <div className="flex items-center space-x-2 bg-gray-50 p-2 rounded-2xl">
                <input
                  type="text"
                  placeholder="Ask anything..."
                  className="flex-1 bg-transparent border-none focus:ring-0 px-3 py-2 text-sm outline-none"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <button onClick={handleSend} className="p-2 bg-primary text-white rounded-xl">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const HomePage = () => {
  const { user, transactions, trustAccount, isLoadingTxs, donateToTrust, requestWithdrawal, isLocalFallback, firestoreError } = useAuth();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [isDonateOpen, setIsDonateOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [actionAmount, setActionAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const recentTransactions = transactions.slice(0, 5);
  const isDonor = user?.role === 'donor';
  const isAdmin = user?.role === 'admin';
  const isRecipient = user?.role === 'recipient';

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <header className="flex justify-between items-center py-4">
        <div>
          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-display font-bold text-primary">Assalamu Alaikum,</h1>
              {isLocalFallback ? (
                <button
                  onClick={() => {
                    localStorage.removeItem('haqdaar_trust');
                    window.location.reload();
                  }}
                  className="px-2 py-0.5 bg-red-100 text-red-700 text-[8px] font-bold rounded-full uppercase tracking-tighter"
                >
                  Offline (Tap to Reconnect)
                </button>
              ) : (
                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[8px] font-bold rounded-full uppercase tracking-tighter">Cloud Active</span>
              )}
            </div>
            {firestoreError && (
              <p className="text-[10px] text-red-500 font-bold bg-red-50 px-2 py-1 rounded-md border border-red-100 max-w-[200px] mt-2 leading-tight">
                ⚠️ {firestoreError}
              </p>
            )}
          </div>
          <p className="text-slate-500 font-bold tracking-tight">
            {isDonor ? 'Your impact is growing.' : isAdmin ? 'System oversight active.' : 'Your aid status is active.'}
          </p>
        </div>
        <button
          onClick={() => setIsNotifOpen(true)}
          className="relative p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 transition-colors"
        >
          <Bell className="w-6 h-6 text-slate-600 font-bold" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full scale-100 animate-pulse"></span>
        </button>
      </header>

      <NotificationDrawer isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
      <TransactionDetailModal isOpen={!!selectedTx} onClose={() => setSelectedTx(null)} transaction={selectedTx} />

    <div className="bg-primary rounded-[32px] p-8 text-white shadow-xl shadow-primary/20 relative overflow-hidden">
      <div className="relative z-10">
        <div className="flex justify-between items-start">
           <div>
             <p className="text-primary-light text-xs font-bold uppercase tracking-[0.2em] mb-1">
               {isDonor ? 'My Personal Wallet' : isAdmin ? 'Global Trust Pool' : 'Available Balance'}
             </p>
             <h2 className="text-4xl font-display font-bold">{formatCurrency(isDonor ? user?.balance || 0 : (isAdmin ? trustAccount.balance : user?.balance || 0))}</h2>
           </div>
           <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
              <LayoutDashboard className="w-6 h-6 opacity-80" />
           </div>
        </div>

        <div className="mt-12 flex justify-between items-end">
          <div className="space-y-1">
            <p className="text-[10px] text-primary-light uppercase font-bold tracking-widest">
              {isDonor ? 'Community Impact' : (isAdmin ? 'Distributed Aid' : 'Next Disbursement')}
            </p>
            <p className="font-bold flex items-center">
               {isDonor ? formatCurrency(trustAccount.totalDonations) : (isAdmin ? formatCurrency(trustAccount.totalDisbursements) : 'June 15, 2026')}
               <span className="ml-2 w-2 h-2 bg-primary-light rounded-full shadow-[0_0_8px_#40C5A0]"></span>
            </p>
          </div>
          <Link to="/qr" className="bg-white text-primary px-6 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-black/5 hover:scale-105 active:scale-95 transition-all">
            Identity Card
          </Link>
        </div>
      </div>
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary-light/10 rounded-full -ml-24 -mb-24 blur-2xl"></div>
    </div>

    <div className="grid grid-cols-2 gap-4">
      {isDonor ? (
        <button onClick={() => setIsDonateOpen(true)} className="group bg-white p-6 rounded-[28px] shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-3 hover:border-primary/40 hover:shadow-md transition-all duration-300">
          <div className="p-4 bg-primary/5 rounded-2xl group-hover:bg-primary/10 transition-colors">
            <Heart className="w-8 h-8 text-primary" />
          </div>
          <span className="font-bold text-sm uppercase tracking-widest text-gray-700">Quick Donate</span>
        </button>
      ) : isRecipient ? (
        <div className="group bg-white p-6 rounded-[28px] shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-3 opacity-50">
          <div className="p-4 bg-gray-50 rounded-2xl">
            <Landmark className="w-8 h-8 text-gray-400" />
          </div>
          <span className="font-bold text-sm uppercase tracking-widest text-gray-400">Withdraw (Disabled)</span>
        </div>
      ) : (
        <>
          <Link to="/scan" className="group bg-white p-6 rounded-[28px] shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-3 hover:border-primary/40 hover:shadow-md transition-all duration-300">
            <div className="p-4 bg-primary/5 rounded-2xl group-hover:bg-primary/10 transition-colors">
              <Plus className="w-8 h-8 text-primary" />
            </div>
            <span className="font-bold text-sm uppercase tracking-widest text-gray-700">Disburse Aid</span>
          </Link>
          <Link to="/admin" className="group bg-white p-6 rounded-[28px] shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-3 hover:border-primary/40 hover:shadow-md transition-all duration-300">
            <div className="p-4 bg-primary/5 rounded-2xl group-hover:bg-primary/10 transition-colors">
              <ClipboardList className="w-8 h-8 text-primary" />
            </div>
            <span className="font-bold text-sm uppercase tracking-widest text-gray-700">Oversight</span>
          </Link>
        </>
      )}
      {!isAdmin && (
        <Link to="/history" className="group bg-white p-6 rounded-[28px] shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-3 hover:border-blue-400/40 hover:shadow-md transition-all duration-300">
          <div className="p-4 bg-blue-50 rounded-2xl group-hover:bg-blue-100 transition-colors">
            <History className="w-8 h-8 text-blue-600" />
          </div>
          <span className="font-bold text-sm uppercase tracking-widest text-gray-700">History</span>
        </Link>
      )}
    </div>

    <section className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm space-y-6">
       <div className="flex justify-between items-center">
         <h3 className="font-display font-bold text-lg text-gray-800">Assistance Insights</h3>
         <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Monthly usage</p>
       </div>
       <div className="h-[200px] w-full">
         <ResponsiveContainer width="100%" height="100%">
           <BarChart data={chartDataMock}>
             <Tooltip
               cursor={{ fill: 'transparent' }}
               content={({ active, payload }) => {
                 if (active && payload && payload.length) {
                   return (
                     <div className="bg-gray-900 text-white p-2 rounded-lg text-[10px] font-bold">
                       {formatCurrency(payload[0].value as number)}
                     </div>
                   );
                 }
                 return null;
               }}
             />
             <Bar dataKey="amount" radius={[6, 6, 6, 6]}>
               {chartDataMock.map((entry, index) => (
                 <Cell key={index} fill={index === chartDataMock.length - 1 ? '#006A4E' : '#E5E7EB'} />
               ))}
             </Bar>
             <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#9CA3AF' }} />
           </BarChart>
         </ResponsiveContainer>
       </div>
    </section>

    <section className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-display font-bold text-xl text-gray-800">Recent Activity</h3>
        <Link to="/history" className="text-primary text-xs font-bold uppercase tracking-widest hover:underline">View All</Link>
      </div>
      <div className="space-y-3">
        {isLoadingTxs ? (
          <div className="py-10 text-center"><Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" /></div>
        ) : recentTransactions.length === 0 ? (
          <div className="p-12 text-center text-gray-400 border border-dashed rounded-[32px] text-xs font-bold uppercase tracking-widest">No Recent Activity</div>
        ) : recentTransactions.map((tx, i) => (
          <button
            key={tx.id || i}
            onClick={() => setSelectedTx(tx)}
            className="w-full flex items-center justify-between p-5 bg-white rounded-2xl shadow-sm border border-gray-100 hover:scale-[1.01] transition-transform text-left group"
          >
            <div className="flex items-center">
              <div className="w-14 h-14 flex items-center justify-center bg-gray-50 rounded-2xl text-2xl shadow-inner group-hover:scale-110 transition-transform">
                {tx.icon || '📜'}
              </div>
              <div className="ml-4 overflow-hidden">
                <p className="font-bold text-slate-900 font-bold group-hover:text-primary transition-colors truncate max-w-[150px]">{tx.title || 'Record'}</p>
                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mt-0.5">{tx.date}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className={cn("font-display font-bold", tx.type === 'disbursement' ? "text-primary" : "text-red-500")}>
                {tx.type === 'disbursement' ? '+' : '-'}{formatCurrency(tx.amount)}
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>

    <AIAssistant />
    <Modal isOpen={isDonateOpen} onClose={() => {setIsDonateOpen(false); setActionAmount('');}} title="Quick Donate">
        <div className="space-y-6">
          <p className="text-gray-500 text-sm text-center">Contribute funds directly to the HaqDaar Trust Pool.</p>
          <div className="p-4 bg-gray-50 rounded-2xl flex items-center justify-center space-x-2 border-2 border-primary/5 focus-within:border-primary/20 transition-all">
            <span className="font-bold text-primary">PKR</span>
            <input type="number" placeholder="5000" className="bg-transparent border-none focus:ring-0 text-2xl font-bold w-full text-center outline-none" value={actionAmount} onChange={e => setActionAmount(e.target.value)} />
          </div>
          <button
            disabled={isProcessing || !actionAmount}
            onClick={async () => {
              if (isProcessing) return;
              setIsProcessing(true);
              try {
                await donateToTrust(parseFloat(actionAmount));
                setIsDonateOpen(false);
                setActionAmount('');
              } catch (e: any) {
                alert(e.message || "Donation failed");
              } finally {
                setIsProcessing(false);
              }
            }}
            className={cn(
              "w-full bg-primary text-white py-5 rounded-[24px] font-bold shadow-xl shadow-primary/20 active:scale-95 transition-transform flex items-center justify-center space-x-2",
              isProcessing && "opacity-70 cursor-not-allowed"
            )}
          >
            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm Donation"}
          </button>
        </div>
    </Modal>
    <Modal isOpen={isWithdrawOpen} onClose={() => {setIsWithdrawOpen(false); setActionAmount('');}} title="Withdraw Aid">
        <div className="space-y-6">
          <p className="text-gray-500 text-sm text-center">Convert your aid balance into cash or bank transfer.</p>
          <div className="p-4 bg-gray-50 rounded-2xl flex items-center justify-center space-x-2 border-2 border-primary/5 focus-within:border-primary/20 transition-all">
            <span className="font-bold text-primary">PKR</span>
            <input type="number" placeholder="1000" className="bg-transparent border-none focus:ring-0 text-2xl font-bold w-full text-center outline-none" value={actionAmount} onChange={e => setActionAmount(e.target.value)} />
          </div>
          <button onClick={async () => {
            try {
              await requestWithdrawal(parseFloat(actionAmount));
              setIsWithdrawOpen(false);
              setActionAmount('');
            } catch (e: any) {
              alert(e.message || "Withdrawal failed");
            }
          }} className="w-full bg-primary text-white py-5 rounded-[24px] font-bold shadow-xl shadow-primary/20 active:scale-95 transition-transform">Process Withdrawal</button>
        </div>
    </Modal>
  </div>
  );
};

const HistoryPage = () => {
  const { transactions, isLoadingTxs: isLoading } = useAuth();
  const [selectedTx, setSelectedTx] = useState<any>(null);
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="py-4"><h1 className="text-2xl font-display font-bold text-primary">System Ledger</h1><p className="text-gray-500">Track all aid activities and records.</p></header>
      <TransactionDetailModal isOpen={!!selectedTx} onClose={() => setSelectedTx(null)} transaction={selectedTx} />
      <div className="space-y-4">
        {isLoading ? (
          <div className="py-20 text-center"><Loader2 className="w-10 h-10 animate-spin text-primary/40 mx-auto" /><p className="text-xs font-bold text-gray-300 mt-4 uppercase tracking-[0.2em]">Syncing History</p></div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[40px] border-2 border-dashed border-gray-100 text-gray-400 font-bold uppercase tracking-widest text-xs">No records found</div>
        ) : transactions.map((tx, i) => (
          <button key={tx.id || i} onClick={() => setSelectedTx(tx)} className="w-full flex items-center justify-between p-5 bg-white rounded-2xl shadow-sm border border-gray-100 hover:border-primary/20 transition-all text-left group">
             <div className="flex items-center">
                <div className="w-10 h-10 flex items-center justify-center bg-primary/10 rounded-full group-hover:bg-primary group-hover:text-white transition-colors text-xl">{tx.icon || '📜'}</div>
                <div className="ml-3 overflow-hidden">
                  <p className="font-bold text-gray-800 text-sm truncate max-w-[180px]">{tx.title || 'Activity'}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{tx.date}</p>
                </div>
             </div>
             <p className={cn("font-display font-bold text-sm", tx.type === 'disbursement' ? "text-primary" : "text-red-500")}>
               {tx.type === 'disbursement' ? '+' : '-'}{formatCurrency(tx.amount)}
             </p>
          </button>
        ))}
      </div>
    </div>
  );
};

const QRPage = () => {
  const { user } = useAuth();
  const isRecipient = user?.role === 'recipient';
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 animate-in zoom-in-95 duration-300">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-display font-bold text-primary">Identity QR</h1>
        <p className="text-slate-500">
          {isRecipient ? 'Show this code to an Admin for verification.' : 'System Identity Verification'}
        </p>
      </div>
      <div className="bg-white p-8 rounded-[56px] shadow-2xl shadow-primary/10 border-8 border-primary/5 relative">
        <div className="w-64 h-64 bg-slate-50 rounded-[32px] flex items-center justify-center border-2 border-dashed border-slate-200 p-6">
           <QRCodeSVG
            value={user?.id || 'unknown'}
            size={200}
            level="H"
            includeMargin={false}
            fgColor="#006A4E"
          />
        </div>
      </div>
      <div className="bg-white w-full rounded-[32px] p-6 border border-slate-100 flex items-center shadow-sm">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center text-primary font-bold text-xl uppercase ring-4 ring-primary/5">{user?.name.substring(0, 2)}</div>
        <div className="ml-4 overflow-hidden">
          <p className="font-bold text-lg truncate text-slate-900">{user?.name}</p>
          <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase opacity-60">CNIC: {user?.cnic}</p>
        </div>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const { trustAccount, isLocalFallback } = useAuth();
  return (
    <div className="space-y-8 py-6 animate-in fade-in duration-500">
      <header className="py-4">
        <div className="flex items-center space-x-2">
          <h1 className="text-3xl font-display font-bold text-primary tracking-tight">Admin Oversight</h1>
          {isLocalFallback && (
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full uppercase tracking-tighter">Local Storage Mode</span>
          )}
        </div>
        <p className="text-gray-500 font-medium">Monitoring Global Trust Ecosystem</p>
      </header>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm text-center relative overflow-hidden group">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 group-hover:text-primary transition-colors">Total Donated</p>
          <h4 className="text-xl font-display font-bold text-slate-900 font-bold">{formatCurrency(trustAccount.totalDonations)}</h4>
          <div className="absolute top-0 right-0 w-12 h-12 bg-primary/5 rounded-bl-full translate-x-4 -translate-y-4 group-hover:scale-150 transition-transform" />
        </div>
        <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm text-center relative overflow-hidden group">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 group-hover:text-primary transition-colors">Distributed</p>
          <h4 className="text-xl font-display font-bold text-slate-900 font-bold">{formatCurrency(trustAccount.totalDisbursements)}</h4>
          <div className="absolute top-0 right-0 w-12 h-12 bg-primary/5 rounded-bl-full translate-x-4 -translate-y-4 group-hover:scale-150 transition-transform" />
        </div>
      </div>
      <div className="bg-primary p-8 rounded-[40px] text-white shadow-xl shadow-primary/20 relative overflow-hidden">
         <div className="relative z-10 flex items-start space-x-6">
           <ClipboardList className="w-12 h-12 text-white/30 shrink-0" />
           <div className="space-y-2">
             <h3 className="font-display font-bold text-lg uppercase tracking-wide">Strategic Oversight</h3>
             <p className="text-xs text-white/70 leading-relaxed font-medium">You are currently viewing the system-wide community trust pool. Disbursement authorization is required for all recipient allocations.</p>
           </div>
         </div>
         <div className="absolute bottom-0 right-0 w-48 h-48 bg-white/10 rounded-full translate-x-12 translate-y-12 blur-2xl" />
      </div>
    </div>
  );
};

const ScanPage = () => {
  const { allocateAid, user } = useAuth();
  const [step, setStep] = useState<'scanning' | 'verifying' | 'amount' | 'processing' | 'success'>('scanning');
  const [amount, setAmount] = useState('');
  const [scannedId, setScannedId] = useState<string | null>(null);
  const [scannerError, setScannerError] = useState<string | null>(null);

  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;

    if (step === 'scanning') {
      html5QrCode = new Html5Qrcode("reader");

      const config = { fps: 10, qrbox: { width: 250, height: 250 } };

      html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          setScannedId(decodedText);
          setStep('verifying');
          if (html5QrCode) {
            html5QrCode.stop().catch(err => console.error("Stop failed", err));
          }
        },
        (errorMessage) => {
          // Normal scanning noise, ignore
        }
      ).catch(err => {
        console.error("Camera start failed", err);
        setScannerError("Camera access denied or not available. Please ensure permissions are granted.");
      });

      return () => {
        if (html5QrCode && html5QrCode.isScanning) {
          html5QrCode.stop().catch(err => console.error("Cleanup stop failed", err));
        }
      };
    }
  }, [step]);

  const handleDisburse = async () => {
    setStep('processing');
    try {
      // Use scannedId or fallback to test recipient if simulation was used
      await allocateAid(scannedId || 'test_recipient', parseFloat(amount));
      setStep('success');
    } catch (e) {
      alert(e);
      setStep('amount');
    }
  };

  if (user?.role !== 'admin') return <Navigate to="/home" />;

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-500">
      <AnimatePresence mode="wait">
        {step === 'scanning' && (
          <div key="scan" className="text-center space-y-8 w-full max-w-sm px-4">
            <h1 className="text-2xl font-display font-bold text-primary">Scanning Recipient</h1>

            {scannerError ? (
              <div className="bg-red-50 text-red-600 p-6 rounded-3xl border border-red-100 text-sm font-bold">
                {scannerError}
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 block w-full bg-red-600 text-white py-2 rounded-xl"
                >
                  Retry Camera
                </button>
              </div>
            ) : (
              <div className="bg-black rounded-[40px] shadow-2xl border-4 border-white overflow-hidden relative aspect-square w-full">
                <div id="reader" className="w-full h-full"></div>
                <div className="absolute inset-0 border-[40px] border-black/20 pointer-events-none"></div>
                <motion.div
                  initial={{ top: '10%' }}
                  animate={{ top: '90%' }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear", repeatType: "reverse" }}
                  className="absolute left-10 right-10 h-0.5 bg-primary shadow-[0_0_15px_#006A4E] z-10"
                />
              </div>
            )}

            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
              Align recipient QR within the frame
            </p>

            <button
              onClick={() => {
                setScannedId('test_recipient');
                setStep('verifying');
              }}
              className="text-[10px] font-bold text-primary/40 uppercase tracking-widest hover:text-primary transition-colors mt-4"
            >
              Skip to Simulation (Test Only)
            </button>
          </div>
        )}
        {step === 'verifying' && <motion.div key="verify" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-10 rounded-[48px] shadow-2xl text-center space-y-6 max-w-xs mx-auto border border-primary/5"> <div className="w-20 h-20 bg-primary/10 rounded-full mx-auto flex items-center justify-center text-primary ring-8 ring-primary/5"><Sparkles className="w-8 h-8" /></div> <div className="space-y-1"> <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Verified HaqDaar</p> <h3 className="text-2xl font-display font-bold text-slate-900 font-bold">{scannedId === 'test_recipient' ? 'Saifullah Al-Fassaad' : 'Scanned Recipient'}</h3> <p className="text-xs text-gray-400 font-mono tracking-widest uppercase">ID: {scannedId}</p> </div> <button onClick={() => setStep('amount')} className="w-full bg-primary text-white py-5 rounded-[24px] font-bold shadow-xl shadow-primary/20 active:scale-95 transition-all">Proceed to Allocation</button> </motion.div>}
        {(step === 'amount' || step === 'processing') && <motion.div key="amount" initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="w-full space-y-8 text-center max-w-sm mx-auto"> <div className="space-y-2"> <h1 className="text-4xl font-display font-bold text-slate-900 font-bold tracking-tight">Enter Amount</h1> <p className="text-gray-400 font-medium">Disbursing aid to Saifullah</p> </div> <div className="bg-white p-10 rounded-[56px] shadow-2xl border border-gray-100 relative overflow-hidden group"> <div className="flex items-center justify-center space-x-3 text-primary relative z-10"> <span className="text-3xl font-display font-bold">PKR</span> <input type="number" autoFocus className="text-5xl font-display font-bold text-primary bg-transparent text-center outline-none w-full border-none focus:ring-0" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={step === 'processing'} /> </div> <button onClick={handleDisburse} disabled={!amount || step === 'processing'} className="w-full bg-primary text-white py-5 rounded-[28px] font-bold mt-10 shadow-xl shadow-primary/30 flex items-center justify-center space-x-2 relative z-10 active:scale-95 disabled:opacity-50 transition-all"> {step === 'processing' ? <Loader2 className="w-6 h-6 animate-spin" /> : <span>Confirm Aid Allocation</span>} </button> <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full group-hover:scale-150 transition-transform" /> </div> </motion.div>}
        {step === 'success' && <motion.div key="success" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-8"> <div className="w-32 h-32 bg-primary rounded-full flex items-center justify-center text-white mx-auto shadow-[0_0_50px_rgba(0,106,78,0.4)] animate-bounce ring-8 ring-primary/10"> <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 }}><CheckCircle2 className="w-16 h-16" /></motion.div> </div> <div className="space-y-2"> <h2 className="text-4xl font-display font-bold text-slate-900 font-bold tracking-tight">Allocation Success</h2> <p className="text-gray-500 font-medium">Recipient's digital wallet has been credited.</p> </div> <Link to="/home" className="inline-block text-primary font-bold hover:underline py-4 uppercase tracking-[0.2em] text-[10px]">Back to System Dashboard</Link> </motion.div>}
      </AnimatePresence>
    </div>
  );
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { user } = useAuth();

  // Role-based navigation filtering
  const navItems = [
    { icon: Home, label: 'Home', path: '/home' },
    { icon: QrCode, label: 'QR Card', path: '/qr', showOnlyFor: ['recipient'] },
    { icon: Scan, label: 'Disburse', path: '/scan', showOnlyFor: ['admin'] },
    { icon: History, label: 'History', path: '/history' },
    { icon: User, label: 'Profile', path: '/profile' },
  ].filter(item => {
    if (item.showOnlyFor && !item.showOnlyFor.includes(user?.role || '')) return false;
    if (item.hideFor && item.hideFor.includes(user?.role || '')) return false;
    return true;
  });

  return (
    <div className="max-w-md mx-auto min-h-screen bg-surface flex flex-col relative overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.05)] border-x border-gray-100">
      <main className="flex-1 px-6 pb-24 overflow-x-hidden relative z-10"><AnimatePresence mode="wait"><motion.div key={location.pathname} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>{children}</motion.div></AnimatePresence></main>
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white/80 backdrop-blur-3xl border-t border-gray-100 px-6 py-4 flex justify-between items-center z-[55] rounded-t-[40px] shadow-[0_-20px_50px_rgba(0,0,0,0.02)]">
        {navItems.map((item) => (
          <Link key={item.path} to={item.path} className={cn("flex flex-col items-center space-y-1 transition-all flex-1", location.pathname === item.path ? "text-primary scale-110" : "text-gray-300 opacity-60 hover:opacity-100")}>
            <item.icon className={cn("w-6 h-6", location.pathname === item.path && "fill-current/10")} />
            <span className="text-[9px] font-bold uppercase tracking-[0.1em]">{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="absolute top-0 left-0 w-full h-96 bg-primary/5 -translate-y-48 -rotate-12 blur-3xl rounded-full" />
    </div>
  );
};

const LoginPage = () => {
  const { login, seedDatabase } = useAuth();
  const [cnic, setCnic] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  // CNIC Mask: XXXXX-XXXXXXX-X
  const handleCnicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 13) value = value.slice(0, 13);

    let formatted = '';
    if (value.length > 0) {
      formatted = value.slice(0, 5);
      if (value.length > 5) {
        formatted += '-' + value.slice(5, 12);
        if (value.length > 12) {
          formatted += '-' + value.slice(12, 13);
        }
      }
    }
    setCnic(formatted);
  };

  // Phone Mask: 03XX-XXXXXXX
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);

    let formatted = '';
    if (value.length > 0) {
      formatted = value.slice(0, 4);
      if (value.length > 4) {
        formatted += '-' + value.slice(4);
      }
    }
    setPhone(formatted);
  };

  const handleSignIn = async () => {
    if (!cnic || !phone) return;
    setLoading(true);
    try {
      await login(cnic, phone);
    } catch (err) {
      alert(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-8 justify-center bg-white max-w-md mx-auto relative overflow-hidden">
      <div className="text-center mb-10 relative z-10">
        <motion.div initial={{ scale: 0.8, rotate: -5 }} animate={{ scale: 1, rotate: 3 }} className="w-24 h-24 bg-primary rounded-[32px] mx-auto flex items-center justify-center text-white mb-8 shadow-2xl shadow-primary/20">
          <LayoutDashboard className="w-12 h-12" />
        </motion.div>
        <h1 className="text-5xl font-display font-bold text-slate-950 tracking-tighter">HaqDaar</h1>
        <p className="text-slate-950 font-black uppercase tracking-[0.3em] text-[10px] mt-2">Digital Community Trust</p>
      </div>
      <div className="space-y-6 relative z-10">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[12px] font-black uppercase text-slate-950 ml-4 tracking-widest">CNIC</label>
            <input
              type="text"
              className="w-full p-5 bg-slate-100 rounded-[24px] border-2 border-slate-300 focus:border-primary outline-none font-mono font-bold tracking-widest text-slate-950 placeholder:text-slate-400 transition-all shadow-inner"
              placeholder="12345-6789012-3"
              value={cnic}
              onChange={handleCnicChange}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[12px] font-black uppercase text-slate-950 ml-4 tracking-widest">Phone Number</label>
            <input
              type="text"
              className="w-full p-5 bg-slate-100 rounded-[24px] border-2 border-slate-300 focus:border-primary outline-none font-mono font-bold tracking-widest text-slate-950 placeholder:text-slate-400 transition-all shadow-inner"
              placeholder="0300-1234567"
              value={phone}
              onChange={handlePhoneChange}
            />
          </div>
        </div>
        <button onClick={handleSignIn} disabled={loading} className="w-full bg-primary text-white font-black py-5 rounded-[28px] shadow-2xl shadow-primary/40 hover:shadow-primary/60 active:scale-95 transition-all flex items-center justify-center space-x-2">
          {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <span className="uppercase tracking-[0.2em] text-sm font-black">Verify & Sign In</span>}
        </button>

        <div className="pt-4 flex flex-col items-center">
            <button
              onClick={seedDatabase}
              className="text-[9px] font-black text-slate-300 uppercase tracking-widest hover:text-primary transition-colors"
            >
              Seed Cloud Database (First Time Only)
            </button>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 w-full h-64 bg-primary/10 translate-y-32 blur-3xl rounded-full" />
    </div>
  );
};

const ProfilePage = () => {
  const { user, logout } = useAuth();
  return (
    <div className="space-y-10 py-10 flex flex-col items-center animate-in slide-in-from-bottom-4 duration-500">
      <div className="relative"><div className="w-36 h-36 rounded-[56px] bg-primary/10 flex items-center justify-center text-primary text-5xl font-display font-bold shadow-2xl border-8 border-white ring-4 ring-primary/5">{user?.name.substring(0,2)}</div><div className="absolute -bottom-2 -right-2 bg-primary p-3 rounded-2xl border-4 border-white shadow-xl text-white"><Sparkles className="w-5 h-5" /></div></div>
      <div className="space-y-1 text-center"><h1 className="text-4xl font-display font-bold text-gray-900 tracking-tight">{user?.name}</h1><p className="text-primary font-bold uppercase tracking-[0.3em] text-[10px]">{user?.role} Access Protocol</p></div>
      <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-50 w-full">
        <div className="p-8 flex justify-between items-center group transition-colors hover:bg-slate-50"><div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">CNIC Verification</p><span className="font-bold text-slate-800 tracking-wider font-mono">{user?.cnic}</span></div><div className="p-2 bg-green-50 text-green-600 rounded-lg"><CheckCircle2 className="w-4 h-4" /></div></div>
        <div className="p-8 flex justify-between items-center group transition-colors hover:bg-slate-50"><div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Phone Number</p><span className="font-bold text-slate-800 tracking-wider font-mono">{user?.phone}</span></div><div className="p-2 bg-green-50 text-green-600 rounded-lg"><CheckCircle2 className="w-4 h-4" /></div></div>
      </div>
      <button onClick={logout} className="w-full p-6 flex items-center justify-center space-x-3 text-red-500 font-bold bg-red-50/50 rounded-[32px] border border-red-100 shadow-sm active:scale-95 transition-all"><LogOut className="w-5 h-5" /><span className="uppercase tracking-[0.2em] text-xs">Terminate Session</span></button>
      {user?.role === 'admin' && <Link to="/admin" className="w-full p-6 flex items-center justify-center space-x-3 text-primary font-bold bg-primary/5 rounded-[32px] border border-primary/10 shadow-sm transition-all hover:bg-primary/10"> <ClipboardList className="w-5 h-5" /> <span className="uppercase tracking-[0.2em] text-xs">System Oversight Panel</span> </Link>}
    </div>
  );
};

export default function App() {
  const { user, isLoading } = useAuth();

  // Minimal loading to prevent sticking, but enough to let Auth initialize
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">Loading System...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/home" />} />
      <Route path="/home" element={user ? <Layout><HomePage /></Layout> : <Navigate to="/login" />} />
      <Route path="/qr" element={user ? <Layout><QRPage /></Layout> : <Navigate to="/login" />} />
      <Route path="/scan" element={user ? <Layout><ScanPage /></Layout> : <Navigate to="/login" />} />
      <Route path="/history" element={user ? <Layout><HistoryPage /></Layout> : <Navigate to="/login" />} />
      <Route path="/profile" element={user ? <Layout><ProfilePage /></Layout> : <Navigate to="/login" />} />
      <Route path="/admin" element={user?.role === 'admin' ? <Layout><AdminDashboard /></Layout> : <Navigate to="/home" />} />
      <Route path="/" element={<Navigate to="/home" />} />
      <Route path="*" element={<Navigate to="/home" />} />
    </Routes>
  );
}
