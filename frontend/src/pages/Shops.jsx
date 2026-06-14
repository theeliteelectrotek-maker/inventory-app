import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { 
  Plus, Pencil, Trash2, X, Loader2, Search, Building2, Phone, MapPin, 
  IndianRupee, TrendingUp, AlertTriangle, AlertCircle, Clock, CheckCircle2, 
  MessageSquare, PhoneCall, Award, Landmark, ChevronRight, Send, 
  BarChart3, Calendar, FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import KPICardValue from '../components/KPICardValue';
import MetricCard from '../components/MetricCard';

const empty = { name: '', type: 'shop', ownerName: '', mobile: '', address: '', gstNumber: '', notes: '' };

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm !m-0 animate-fadeIn">
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl shadow-2xl w-[95%] sm:w-full max-w-md border border-slate-100 dark:border-[#334155] overflow-hidden transform transition-all scale-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#334155] bg-slate-50/50 dark:bg-slate-900/50">
          <h3 className="font-bold text-slate-850 dark:text-[#F8FAFC] text-base flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-650"></span>
            {title}
          </h3>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 dark:text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-[#F8FAFC] transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5 overflow-auto max-h-[80vh] scrollbar-thin">{children}</div>
      </div>
    </div>
  );
}

function shopStats(shopName, offlineSales) {
  const sales = offlineSales.filter((s) => s.buyerName === shopName);
  const totalSales = sales.length;
  const totalAmount = sales.reduce((s, x) => s + (x.totalAmount || 0), 0);
  const amountReceived = sales.reduce((s, x) => s + (x.amountReceived || 0), 0);
  const amountPending = sales.reduce((s, x) => s + (x.amountLeft || 0), 0);
  let upi = 0, cash = 0;
  for (const sale of sales) {
    for (const t of sale.transactions || []) {
      if (t.method === 'upi') upi += Number(t.amount) || 0;
      else cash += Number(t.amount) || 0;
    }
  }

  // Last purchase date
  const sortedSales = [...sales].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const lastPurchaseDate = sortedSales[0]?.date || null;

  return { totalSales, totalAmount, amountReceived, amountPending, upi, cash, lastPurchaseDate, salesHistory: sortedSales };
}

// Custom Initial Gradient Avatar
function ShopThumbnail({ shopName }) {
  const name = shopName || 'S';
  const initial = name.charAt(0).toUpperCase();
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    'from-rose-500 to-red-500 text-rose-50 border-rose-100',
    'from-indigo-500 to-blue-500 text-indigo-50 border-indigo-100',
    'from-cyan-500 to-blue-500 text-cyan-50 border-cyan-100',
    'from-emerald-500 to-teal-500 text-emerald-50 border-emerald-100',
    'from-amber-500 to-orange-500 text-orange-50 border-amber-100',
    'from-purple-500 to-pink-500 text-purple-50 border-purple-100'
  ];
  const colorClass = colors[Math.abs(hash) % colors.length];

  return (
    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center text-sm font-black shadow-sm border flex-shrink-0`}>
      {initial}
    </div>
  );
}

// Note parsing utility for CRM notes timeline
const parseNotes = (notesStr) => {
  if (!notesStr) return [];
  return notesStr.split('\n').filter(Boolean).map((line, idx) => {
    const match = line.match(/^\[(.*?)\] (.*)$/);
    if (match) {
      return { id: idx, date: match[1], text: match[2] };
    }
    return { id: idx, date: 'Log Note', text: line };
  });
};

export default function Shops() {
  const { user } = useAuth();
  const location = useLocation();
  const [shops, setShops] = useState([]);
  
  const [offlineSales, setOfflineSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const phoneValidation = form.mobile ? (() => {
    const num = form.mobile;
    const isDigits = /^\d+$/.test(num);
    const hasError = num.length > 0 && (!isDigits || num.length !== 10);
    return {
      error: hasError ? "Phone number must contain exactly 10 digits" : "",
      isValid: !hasError
    };
  })() : { error: "", isValid: true };

  // Selected shop for drawer
  const [selectedShop, setSelectedShop] = useState(null);
  const [activeDrawerTab, setActiveDrawerTab] = useState('overview'); // 'overview' | 'history' | 'notes'
  const [newNote, setNewNote] = useState('');
  const [appendingNote, setAppendingNote] = useState(false);

  // CRM Filters
  const [stockFilter, setStockFilter] = useState('all'); // 'all' | 'highRisk' | 'top10' | 'longPending'

  function load() {
    setLoading(true);
    Promise.all([api.getShops(), api.getOfflineSales()])
      .then(([s, os]) => { 
        setShops(s); 
        setOfflineSales(os); 
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    if (location.state?.openAddModal) {
      openAdd();
    }
  }, [location.state]);

  // Update selectedShop data in drawer when shops state updates
  useEffect(() => {
    if (selectedShop) {
      const refreshed = shops.find(s => s.id === selectedShop.id);
      if (refreshed) {
        setSelectedShop(refreshed);
      }
    }
  }, [shops]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const searchParam = params.get('search');
    const idParam = params.get('id');
    if (searchParam) {
      setSearch(searchParam);
    }
    if (idParam && shops.length > 0) {
      const match = shops.find(s => s.id === idParam);
      if (match) {
        setSelectedShop(match);
      }
    }
  }, [location.search, shops]);

  function openAdd() { setForm(empty); setEditing(null); setError(''); setShowModal(true); }
  function openEdit(s) { 
    setForm({ 
      name: s.name, 
      type: s.type || 'shop', 
      ownerName: s.ownerName || '',
      mobile: s.mobile || '', 
      address: s.address || '', 
      gstNumber: s.gstNumber || '',
      notes: s.notes || '' 
    }); 
    setEditing(s); 
    setError(''); 
    setShowModal(true); 
  }

  async function handleDelete(id, e) {
    if (e) e.stopPropagation();
    if (!confirm('Delete this shop and all CRM logs?')) return;
    await api.deleteShop(id);
    setShops((ss) => ss.filter((s) => s.id !== id));
    if (selectedShop?.id === id) setSelectedShop(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const payload = {
        name: form.name,
        type: form.type || 'shop',
        ownerName: form.type === 'shop' ? (form.ownerName || '') : '',
        mobile: form.mobile || '',
        address: form.address || '',
        gstNumber: form.type === 'shop' ? (form.gstNumber || '') : '',
        notes: form.notes || ''
      };
      if (editing) {
        const updated = await api.updateShop(editing.id, payload);
        setShops((ss) => ss.map((s) => s.id === editing.id ? updated : s));
      } else {
        const added = await api.addShop(payload);
        setShops((ss) => [added, ...ss]);
      }
      setShowModal(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // Append new note to notes log in details drawer
  async function handleAddNote(e) {
    e.preventDefault();
    if (!newNote.trim() || !selectedShop) return;
    setAppendingNote(true);
    try {
      const dateStr = new Date().toLocaleDateString('en-IN', { 
        day: 'numeric', month: 'short', year: 'numeric', 
        hour: '2-digit', minute: '2-digit', hour12: true 
      });
      const noteLine = `[${dateStr}] ${newNote.trim()}`;
      const updatedNotes = selectedShop.notes ? `${selectedShop.notes}\n${noteLine}` : noteLine;
      
      const payload = {
        name: selectedShop.name,
        type: selectedShop.type || 'shop',
        mobile: selectedShop.mobile || '',
        address: selectedShop.address || '',
        notes: updatedNotes
      };
      
      const updated = await api.updateShop(selectedShop.id, payload);
      setShops((ss) => ss.map((s) => s.id === selectedShop.id ? updated : s));
      setNewNote('');
    } catch (err) {
      console.error('Failed to append CRM note:', err);
    } finally {
      setAppendingNote(false);
    }
  }

  // Check if shop has unpaid invoices older than 10 days
  const hasLongPendingDues = (shopName) => {
    const sales = offlineSales.filter(s => s.buyerName === shopName && s.amountLeft > 0);
    if (sales.length === 0) return false;
    const now = new Date();
    const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return sales.some(s => {
      if (!s.date) return false;
      const parts = s.date.split('-');
      const sDate = new Date(parts[0], parts[1] - 1, parts[2]);
      const diffDays = (todayLocal.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays > 10;
    });
  };

  // Compile calculations with stats
  const shopsWithStats = shops.map(s => {
    const stats = shopStats(s.name, offlineSales);
    let health = 'Safe'; // Safe (0 dues), Watch (<= 5k), Recovery Required (> 5k or overdue)
    if (stats.amountPending > 5000 || hasLongPendingDues(s.name)) health = 'Recovery Required';
    else if (stats.amountPending > 0) health = 'Watch';
    return { ...s, stats, health };
  });

  // KPI calculations
  const totalShops = shops.length;
  const activeShops = shopsWithStats.filter(s => s.stats.totalSales > 0).length;
  const totalSalesVal = shopsWithStats.reduce((sum, s) => sum + s.stats.totalAmount, 0);
  const totalOutstandingVal = shopsWithStats.reduce((sum, s) => sum + s.stats.amountPending, 0);
  const totalCollectedVal = shopsWithStats.reduce((sum, s) => sum + s.stats.amountReceived, 0);
  const avgCustomerLtv = totalShops > 0 ? totalSalesVal / totalShops : 0;

  // Leaderboard data (Top 10)
  const leaderboardList = [...shopsWithStats]
    .sort((a, b) => b.stats.totalAmount - a.stats.totalAmount)
    .slice(0, 10);

  // Outstanding Dues Priorities
  const outstandingList = [...shopsWithStats]
    .filter(s => s.stats.amountPending > 0)
    .sort((a, b) => b.stats.amountPending - a.stats.amountPending);

  const getPriorityLevel = (pendingAmt) => {
    if (pendingAmt >= 5000) return { label: 'High Priority', color: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-405' };
    if (pendingAmt >= 1000) return { label: 'Medium Priority', color: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-405' };
    return { label: 'Low Priority', color: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-405' };
  };

  // Filtering shops for display
  const filtered = shopsWithStats.filter((s) => {
    const matchSearch = !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.mobile && s.mobile.includes(search)) ||
      (s.address && s.address.toLowerCase().includes(search.toLowerCase()));

    let matchFilter = true;
    if (stockFilter === 'shop') {
      matchFilter = s.type === 'shop';
    } else if (stockFilter === 'individual') {
      matchFilter = s.type === 'individual' || s.type === 'walk-in';
    } else if (stockFilter === 'highRisk') {
      matchFilter = s.health === 'Recovery Required';
    } else if (stockFilter === 'top10') {
      const top10Ids = [...shopsWithStats]
        .sort((a, b) => b.stats.totalAmount - a.stats.totalAmount)
        .slice(0, 10)
        .map(x => x.id);
      matchFilter = top10Ids.includes(s.id);
    } else if (stockFilter === 'longPending') {
      matchFilter = hasLongPendingDues(s.name);
    }

    return matchSearch && matchFilter;
  });

  const fmt = (val) => `₹${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  function healthBadge(health) {
    if (health === 'Recovery Required') return <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50">Recovery Required</span>;
    if (health === 'Watch') return <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50">Watch</span>;
    return <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 border border-emerald-100 dark:border-emerald-900/50">Safe</span>;
  }

  // Format mobile numbers for Call/WhatsApp
  const getCleanMobile = (num) => {
    if (!num) return '';
    const cleaned = num.replace(/\D/g, '');
    return cleaned.length === 10 ? `91${cleaned}` : cleaned;
  };

  // Detail drawer calculations
  const drawerStats = selectedShop ? shopStats(selectedShop.name, offlineSales) : null;
  const drawerNotes = selectedShop ? parseNotes(selectedShop.notes) : [];

  // Drawer Payment UPI vs Cash calculation
  let drawerUpiPct = 0;
  let drawerCashPct = 0;
  if (drawerStats && (drawerStats.upi > 0 || drawerStats.cash > 0)) {
    const totalCollected = drawerStats.upi + drawerStats.cash;
    drawerUpiPct = (drawerStats.upi / totalCollected) * 100;
    drawerCashPct = (drawerStats.cash / totalCollected) * 100;
  }

  // Draw monthly purchases trend inside drawer (Last 6 months)
  const getDrawerMonthlyTrend = () => {
    if (!drawerStats) return [];
    const monthlyData = {};
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStr = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      months.push(mStr);
      monthlyData[mStr] = 0;
    }

    (drawerStats.salesHistory || []).forEach(s => {
      if (!s.date) return;
      const parts = s.date.split('-');
      const sDate = new Date(parts[0], parts[1] - 1, parts[2]);
      const mStr = sDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      if (monthlyData[mStr] !== undefined) {
        monthlyData[mStr] += s.totalAmount || 0;
      }
    });

    const list = months.map(m => ({ month: m, amount: monthlyData[m] }));
    const maxAmount = Math.max(...list.map(x => x.amount), 1);
    return list.map(item => ({ ...item, pct: (item.amount / maxAmount) * 100 }));
  };

  const monthlyTrendList = getDrawerMonthlyTrend();  return (
    <div className="space-y-6 pb-12 relative text-slate-800 dark:text-[#CBD5E1]">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-slate-200 dark:border-[#334155] shadow-sm">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-10 bg-red-650 dark:bg-[#EF4444] rounded-full shrink-0"></span>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-[#F8FAFC] tracking-tight">
              Customer Management
            </h1>
            <p className="text-slate-500 dark:text-[#94A3B8] text-sm mt-1 font-medium">Audit customer accounts, lifetime revenues, invoice recoveries, and customer health status</p>
          </div>
        </div>

        <button onClick={openAdd} className="flex items-center justify-center gap-2 bg-[#EF4444] hover:bg-red-600 text-white text-sm font-bold px-5 py-3 rounded-2xl transition-all shadow-md hover:shadow-lg hover:shadow-red-500/10 whitespace-nowrap self-start">
          <Plus size={16} /> Add New Customer
        </button>
      </div>

      {/* Top CRM KPI Cards */}
      <div className="grid gap-4 xl:grid-cols-6 lg:grid-cols-3 md:grid-cols-2 grid-cols-1">
        <MetricCard
          header="Total Customers"
          value={`${totalShops}`}
          accentColor="border-t-slate-500 dark:border-t-slate-400"
          valueClassName="text-slate-900 dark:text-[#F8FAFC]"
          description="Accounts Registered"
        />
        <MetricCard
          header="Active Customers"
          value={`${activeShops}`}
          accentColor="border-t-emerald-500"
          valueClassName="text-slate-900 dark:text-[#F8FAFC]"
          description="With billing logs"
        />
        <MetricCard
          header="Lifetime Sales"
          value={totalSalesVal}
          isCurrency
          accentColor="border-t-indigo-500"
          valueClassName="text-slate-900 dark:text-[#F8FAFC]"
          description="Gross billed amount"
        />
        <MetricCard
          header="Total Collected"
          value={totalCollectedVal}
          isCurrency
          accentColor="border-t-teal-500"
          valueClassName="text-slate-900 dark:text-[#F8FAFC]"
          description="Payments settled"
        />
        <MetricCard
          header="Total Outstanding"
          value={totalOutstandingVal}
          isCurrency
          accentColor="border-t-red-500"
          valueClassName="text-red-650 dark:text-red-400"
          description="Outstanding dues"
        />
        <MetricCard
          header="Average Shop LTV"
          value={avgCustomerLtv}
          isCurrency
          accentColor="border-t-blue-500"
          valueClassName="text-slate-900 dark:text-[#F8FAFC]"
          description="Sales per customer"
        />
      </div>

      {/* CRM Insight Leaderboards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Leaderboard */}
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-[#334155]">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-[#F8FAFC] text-xl flex items-center gap-2">
              <Award className="text-amber-500" size={20} /> Customer Leaderboard
            </h3>
            <p className="text-slate-400 dark:text-[#94A3B8] text-xs mt-1 font-medium">Top performing shops based on lifetime sales volume</p>
          </div>
          <div className="space-y-3.5 mt-5 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin">
            {leaderboardList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-[#94A3B8]">
                <Building2 className="opacity-30 mb-2" size={32} />
                <span className="text-xs font-semibold">No shop records with billing found</span>
              </div>
            ) : (
              leaderboardList.map((s, idx) => {
                const maxSales = leaderboardList[0]?.stats.totalAmount || 1;
                return (
                  <div key={s.id} onClick={() => setSelectedShop(s)} className="group flex items-center gap-3 cursor-pointer p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-2xl transition-all">
                    <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-[#CBD5E1] text-xs font-black flex items-center justify-center group-hover:bg-amber-100 dark:group-hover:bg-amber-950/40 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex justify-between items-center text-xs gap-3">
                        <span className="font-bold text-slate-700 dark:text-[#CBD5E1] truncate">{s.name}</span>
                        <span className="font-black text-slate-800 dark:text-[#F8FAFC] whitespace-nowrap">{fmt(s.stats.totalAmount)}</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-900 h-1.5 rounded-full overflow-hidden">
                        <div style={{ width: `${(s.stats.totalAmount / maxSales) * 100}%` }} className="h-full bg-indigo-600 rounded-full" />
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-slate-300 dark:text-slate-650 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Outstanding Recovery Dashboard */}
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-[#334155]">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-[#F8FAFC] text-xl flex items-center gap-2">
              <Landmark className="text-red-500" size={20} /> Outstanding Recovery Dashboard
            </h3>
            <p className="text-slate-400 dark:text-[#94A3B8] text-xs mt-1 font-medium">Outstanding payments from shops</p>
          </div>
          <div className="space-y-3.5 mt-5 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin">
            {outstandingList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-[#94A3B8]">
                <CheckCircle2 className="text-emerald-500 mb-2 opacity-60" size={32} />
                <span className="text-xs font-semibold">Perfect! No outstanding dues remaining.</span>
              </div>
            ) : (
              outstandingList.map((s) => {
                const pri = getPriorityLevel(s.stats.amountPending);
                return (
                  <div key={s.id} onClick={() => setSelectedShop(s)} className="group flex items-center justify-between gap-3 cursor-pointer p-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-all">
                    <div className="flex items-center gap-2.5 truncate">
                      <ShopThumbnail shopName={s.name} />
                      <div className="truncate space-y-0.5">
                        <p className="font-bold text-slate-700 dark:text-[#CBD5E1] text-xs truncate">{s.name}</p>
                        <p className="text-[10px] text-slate-400 dark:text-[#94A3B8] font-medium truncate">{s.mobile || 'No Mobile'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3.5 flex-shrink-0">
                      <div className="text-right space-y-0.5">
                        <p className="font-black text-red-600 dark:text-red-405 text-xs">{fmt(s.stats.amountPending)}</p>
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black border uppercase tracking-wider inline-block ${pri.color}`}>
                          {pri.label}
                        </span>
                      </div>
                      <ChevronRight size={14} className="text-slate-300 dark:text-slate-650 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Main CRM Ledger Table Container */}
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-[#334155] space-y-4">
        {/* Search, filters, pills */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-[#334155] pb-4">
          {/* Search bar */}
          <div className="relative w-full lg:w-[320px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, address, phone..."
              className="w-full pl-9 pr-3 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-xs bg-white dark:bg-[#0F172A] text-slate-700 dark:text-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#EF4444]"
            />
          </div>

          {/* CRM Filter Pills */}
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-900 rounded-xl p-1 overflow-x-auto scrollbar-none max-w-full">
            {[
              { id: 'all', label: 'All Customers' },
              { id: 'shop', label: '🏪 Shops' },
              { id: 'individual', label: '👤 Individuals' },
              { id: 'highRisk', label: 'High Risk Dues' },
              { id: 'top10', label: 'Top 10 Billed' },
              { id: 'longPending', label: 'Long Overdue Dues (>10d)' }
            ].map((f) => (
              <button 
                key={f.id} 
                onClick={() => setStockFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize shrink-0 ${
                  stockFilter === f.id ? 'bg-[#EF4444] text-white shadow-sm' : 'text-slate-550 dark:text-[#94A3B8] hover:text-slate-800 dark:hover:text-[#F8FAFC] bg-transparent'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sticky CRM Table list */}
        <div className="max-h-[500px] overflow-y-auto border border-slate-200 dark:border-[#334155] rounded-2xl shadow-sm scrollbar-thin">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400 dark:text-slate-500"><Loader2 size={24} className="animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
              <Building2 size={36} className="mb-2 opacity-30" />
              <p className="text-xs font-semibold">No customer records matches the criteria</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-[#334155] text-slate-500 dark:text-[#94A3B8] uppercase font-bold sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-xs tracking-wider">Customer Identity</th>
                  <th className="px-4 py-3 text-xs tracking-wider">Contact</th>
                  <th className="px-4 py-3 text-xs tracking-wider">Sales Activity</th>
                  <th className="px-4 py-3 text-xs tracking-wider">Billed Val</th>
                  <th className="px-4 py-3 text-xs tracking-wider">Settled Amt</th>
                  <th className="px-4 py-3 text-xs tracking-wider">Outstanding</th>
                  <th className="px-4 py-3 text-xs tracking-wider">Health State</th>
                  <th className="px-4 py-3 text-xs tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#334155] bg-white dark:bg-[#1E293B] font-medium text-slate-600 dark:text-[#CBD5E1]">
                {filtered.map((s) => {
                  return (
                    <tr 
                      key={s.id} 
                      onClick={() => setSelectedShop(s)}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <ShopThumbnail shopName={s.name} />
                          <div className="space-y-0.5 truncate max-w-[180px]">
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-slate-700 dark:text-[#F8FAFC] truncate">{s.name}</p>
                              {s.type === 'shop' ? (
                                <span className="text-[9px] px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-lg font-bold">🏪 Shop</span>
                              ) : (
                                <span className="text-[9px] px-1.5 py-0.5 bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/50 text-orange-600 dark:text-orange-400 rounded-lg font-bold">👤 Individual</span>
                              )}
                            </div>
                            <span className="text-[9px] text-slate-400 dark:text-[#94A3B8] font-semibold bg-slate-50 dark:bg-slate-900 px-1.5 py-0.5 rounded-full inline-block truncate max-w-[160px]">
                              {s.address || 'No Address Logged'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {s.mobile ? (
                          <div className="flex items-center gap-1.5 text-slate-700 dark:text-[#CBD5E1]">
                            <Phone size={11} className="text-slate-400 dark:text-slate-550" />
                            <span>{s.mobile}</span>
                          </div>
                        ) : <span className="text-slate-300 dark:text-slate-600">No Mobile</span>}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-700 dark:text-[#F8FAFC] whitespace-nowrap">
                        {s.stats.totalSales} billing logs
                      </td>
                      <td className="px-4 py-3.5 font-extrabold text-slate-800 dark:text-[#F8FAFC] whitespace-nowrap">
                        {fmt(s.stats.totalAmount)}
                      </td>
                      <td className="px-4 py-3.5 text-green-600 dark:text-green-400 font-extrabold whitespace-nowrap">
                        {fmt(s.stats.amountReceived)}
                      </td>
                      <td className={`px-4 py-3.5 font-black whitespace-nowrap ${s.stats.amountPending > 0 ? 'text-red-500' : 'text-slate-405 dark:text-slate-500'}`}>
                        {fmt(s.stats.amountPending)}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {healthBadge(s.health)}
                      </td>
                      <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {s.mobile && (
                            <>
                              <a href={`tel:${s.mobile}`} title="Call Shop" className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white transition-colors">
                                <PhoneCall size={13} />
                              </a>
                              <a href={`https://wa.me/${getCleanMobile(s.mobile)}?text=Hello%20${encodeURIComponent(s.name)}%2C%20this%20is%20regarding%20your%20inventory%20billing%20account.`} target="_blank" rel="noopener noreferrer" title="WhatsApp Message" className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:text-emerald-600 dark:hover:text-emerald-450 transition-colors">
                                <MessageSquare size={13} />
                              </a>
                            </>
                          )}
                          <button onClick={() => openEdit(s)} title="Edit General Info" className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white transition-colors">
                            <Pencil size={13} />
                          </button>
                          <button onClick={(e) => handleDelete(s.id, e)} disabled={user?.role === 'EMPLOYEE'} title="Delete" className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-red-50 dark:hover:bg-red-955/20 hover:text-red-600 dark:hover:text-red-405 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* CRM Details Slide-out Drawer / Detail Panel */}
      {selectedShop && drawerStats && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/40">
          <div className="absolute inset-0 bg-transparent" onClick={() => setSelectedShop(null)} />
          
          <div className="relative w-full max-w-2xl bg-white dark:bg-[#1E293B] h-full shadow-2xl flex flex-col transition-transform duration-300 border-l border-slate-100 dark:border-[#334155]">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-100 dark:border-[#334155] bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShopThumbnail shopName={selectedShop.name} />
                <div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-[#F8FAFC]">{selectedShop.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-400 dark:text-[#94A3B8] font-medium">Shop ID: {selectedShop.id.slice(0, 8)}</span>
                    {selectedShop.type === 'shop' ? (
                      <span className="px-2 py-0.5 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-400">🏪 Shop</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-xl text-xs font-bold bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/50 text-orange-700 dark:text-orange-400">👤 Individual</span>
                    )}
                    {healthBadge(selectedShop.health)}
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedShop(null)} className="p-2 rounded-xl text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
            </div>

            {/* Quick Actions Panel */}
            <div className="px-6 py-3 border-b border-slate-100 dark:border-[#334155] bg-white dark:bg-[#1E293B] flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-slate-600 dark:text-[#CBD5E1]">
              <div className="flex items-center gap-2">
                {selectedShop.mobile ? (
                  <>
                    <a href={`tel:${selectedShop.mobile}`} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-[#334155] hover:bg-slate-100 dark:hover:bg-slate-850 hover:text-slate-800 dark:hover:text-[#F8FAFC] transition-all">
                      <PhoneCall size={12} className="text-slate-500 dark:text-slate-400" /> Call CRM Contact
                    </a>
                    <a href={`https://wa.me/${getCleanMobile(selectedShop.mobile)}?text=Hello%20${encodeURIComponent(selectedShop.name)}%2C%20this%20is%20regarding%20your%20inventory%20billing%20account.`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all">
                      <MessageSquare size={12} className="text-emerald-600 dark:text-emerald-450" /> WhatsApp
                    </a>
                  </>
                ) : (
                  <span className="text-slate-400 dark:text-slate-500 italic">No phone logged for shortcuts</span>
                )}
              </div>
              
              <button onClick={() => openEdit(selectedShop)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-405 border border-indigo-100 dark:border-indigo-900/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all">
                <Pencil size={12} /> Edit General Details
              </button>
            </div>

            {/* Drawer Tabs Selection */}
            <div className="flex border-b border-slate-100 dark:border-[#334155] px-6 bg-slate-50/20 dark:bg-slate-900/20 text-xs font-bold text-slate-400 dark:text-[#94A3B8]">
              {[
                { id: 'overview', label: 'Summary & Analytics' },
                { id: 'history', label: `Invoice Logs (${drawerStats.totalSales})` },
                { id: 'notes', label: `CRM Logs Timeline (${drawerNotes.length})` }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveDrawerTab(t.id)}
                  className={`px-4 py-3 border-b-2 font-black transition-all ${
                    activeDrawerTab === t.id ? 'border-red-600 dark:border-red-500 text-red-600 dark:text-red-405' : 'border-transparent hover:text-slate-700 dark:hover:text-[#F8FAFC]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Drawer scroll content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
              {activeDrawerTab === 'overview' && (
                <div className="space-y-6">
                  {/* General Info cards */}
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    {selectedShop.type === 'shop' && (
                      <>
                        <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 border border-transparent dark:border-[#334155]/30 space-y-2">
                          <p className="font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wide">Owner Name</p>
                          <p className="font-extrabold text-slate-700 dark:text-[#CBD5E1] text-sm">
                            {selectedShop.ownerName || '—'}
                          </p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 border border-transparent dark:border-[#334155]/30 space-y-2">
                          <p className="font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wide">GST Number</p>
                          <p className="font-extrabold text-slate-700 dark:text-[#CBD5E1] text-sm uppercase">
                            {selectedShop.gstNumber || '—'}
                          </p>
                        </div>
                      </>
                    )}
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 border border-transparent dark:border-[#334155]/30 space-y-2">
                      <p className="font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wide">Contact Phone</p>
                      <p className="font-extrabold text-slate-700 dark:text-[#CBD5E1] text-sm flex items-center gap-1.5">
                        <Phone size={13} className="text-slate-400 dark:text-slate-550" /> {selectedShop.mobile || '—'}
                      </p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 border border-transparent dark:border-[#334155]/30 space-y-2">
                      <p className="font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wide">
                        {selectedShop.type === 'shop' ? 'Shop Location' : 'Address'}
                      </p>
                      <p className="font-extrabold text-slate-700 dark:text-[#CBD5E1] text-sm flex items-center gap-1.5 truncate" title={selectedShop.address}>
                        <MapPin size={13} className="text-slate-400 flex-shrink-0" /> {selectedShop.address || '—'}
                      </p>
                    </div>
                  </div>

                  {/* Financial Grid */}
                  <div className="bg-white dark:bg-[#1E293B] border border-slate-105 dark:border-[#334155] rounded-3xl p-5 shadow-sm space-y-4">
                    <h4 className="font-extrabold text-slate-800 dark:text-[#F8FAFC] text-xs uppercase tracking-wide text-slate-500 dark:text-[#94A3B8]">Financial Ledger Stats</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-[#94A3B8] block uppercase">Total Purchased</span>
                        <p className="text-base font-black text-slate-800 dark:text-[#F8FAFC] mt-1">{fmt(drawerStats.totalAmount)}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-[#94A3B8] block uppercase">Total Collected</span>
                        <p className="text-base font-black text-green-600 dark:text-green-400 mt-1">{fmt(drawerStats.amountReceived)}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-[#94A3B8] block uppercase">Pending Balance</span>
                        <p className={`text-base font-black mt-1 ${drawerStats.amountPending > 0 ? 'text-red-500' : 'text-slate-800 dark:text-[#CBD5E1]'}`}>{fmt(drawerStats.amountPending)}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-[#94A3B8] block uppercase">Average order value</span>
                        <p className="text-base font-black text-slate-800 dark:text-[#F8FAFC] mt-1">
                          {fmt(drawerStats.totalSales > 0 ? drawerStats.totalAmount / drawerStats.totalSales : 0)}
                        </p>
                      </div>
                    </div>

                    {/* Progress behavior */}
                    {(drawerStats.upi > 0 || drawerStats.cash > 0) && (
                      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-[#334155]">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase">
                          <span>UPI Split ({drawerUpiPct.toFixed(0)}%)</span>
                          <span>Cash Split ({drawerCashPct.toFixed(0)}%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-900 flex">
                          <div style={{ width: `${drawerUpiPct}%` }} className="h-full bg-blue-500" title="UPI Payment Share" />
                          <div style={{ width: `${drawerCashPct}%` }} className="h-full bg-green-500" title="Cash Payment Share" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Last Purchase details */}
                  <div className="bg-slate-50/50 dark:bg-slate-900/50 border border-transparent dark:border-[#334155]/30 rounded-2xl p-4 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Calendar size={15} className="text-slate-400 dark:text-slate-500" />
                      <span className="font-semibold text-slate-500 dark:text-[#94A3B8]">Last Invoice Issued Date:</span>
                    </div>
                    <span className="font-black text-slate-700 dark:text-[#CBD5E1]">
                      {drawerStats.lastPurchaseDate ? new Date(drawerStats.lastPurchaseDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No purchase logged'}
                    </span>
                  </div>

                  {/* Purchases Trend Chart (SVG Visual representation) */}
                  <div className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-[#334155] rounded-3xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-extrabold text-slate-800 dark:text-[#F8FAFC] text-xs uppercase tracking-wide text-slate-500 dark:text-[#94A3B8]">Shop Monthly Revenue Trend</h4>
                        <p className="text-[10px] text-slate-400 dark:text-[#94A3B8] mt-0.5">Purchases accumulated in the last 6 months</p>
                      </div>
                      <BarChart3 size={15} className="text-slate-400 dark:text-slate-550" />
                    </div>

                    <div className="flex items-end justify-between gap-2 pt-6 h-[120px] px-2 border-b border-slate-100 dark:border-[#334155] relative">
                      {monthlyTrendList.map((item, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                          {item.amount > 0 && (
                            <div className="text-[9px] font-black text-slate-700 dark:text-[#F8FAFC] bg-slate-100 dark:bg-slate-800 border border-transparent dark:border-[#334155] px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity absolute -translate-y-8">
                              {fmt(item.amount)}
                            </div>
                          )}
                          <div 
                            style={{ height: `${Math.max(item.pct, 4)}%` }} 
                            className={`w-full rounded-t-lg transition-all duration-500 ${
                              item.amount > 0 ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-slate-100 dark:bg-slate-900'
                            }`}
                          />
                          <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 mt-1 whitespace-nowrap">{item.month}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeDrawerTab === 'history' && (
                <div className="space-y-4">
                  <h4 className="font-extrabold text-slate-800 dark:text-[#F8FAFC] text-xs uppercase tracking-wide text-slate-500 dark:text-[#94A3B8]">Invoice Ledger history</h4>
                  
                  {drawerStats.salesHistory.length === 0 ? (
                    <div className="flex flex-col items-center py-12 text-slate-400 dark:text-[#94A3B8]">
                      <FileText size={32} className="opacity-30 mb-2" />
                      <p className="text-xs font-semibold">No offline orders logged for this customer</p>
                    </div>
                  ) : (
                    <div className="border border-slate-100 dark:border-[#334155] rounded-2xl overflow-hidden text-xs">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-[#94A3B8] font-extrabold uppercase">
                          <tr>
                            <th className="px-4 py-2.5">Date</th>
                            <th className="px-4 py-2.5">Invoice No.</th>
                            <th className="px-4 py-2.5 text-right">Billed</th>
                            <th className="px-4 py-2.5 text-right">Settled</th>
                            <th className="px-4 py-2.5 text-right">Outstanding</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-[#334155] font-medium text-slate-650 dark:text-[#CBD5E1] bg-white dark:bg-[#1E293B]">
                          {drawerStats.salesHistory.map((s, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                              <td className="px-4 py-3 whitespace-nowrap">
                                {new Date(s.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </td>
                              <td className="px-4 py-3 font-mono font-bold text-slate-700 dark:text-[#CBD5E1]">
                                {s.invoiceNumber || '—'}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-slate-755 dark:text-[#F8FAFC]">{fmt(s.totalAmount)}</td>
                              <td className="px-4 py-3 text-right text-green-600 dark:text-green-400 font-bold">{fmt(s.amountReceived)}</td>
                              <td className={`px-4 py-3 text-right font-black ${s.amountLeft > 0 ? 'text-red-500' : 'text-slate-405 dark:text-slate-500'}`}>
                                {fmt(s.amountLeft)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeDrawerTab === 'notes' && (
                <div className="space-y-6">
                  {/* Notes timelines */}
                  <div className="space-y-4">
                    <h4 className="font-extrabold text-slate-800 dark:text-[#F8FAFC] text-xs uppercase tracking-wide text-slate-500 dark:text-[#94A3B8]">Customer Follow-up Timeline</h4>
                    
                    {drawerNotes.length === 0 ? (
                      <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-400 dark:text-[#94A3B8] border border-dashed dark:border-[#334155]/50">
                        <MessageSquare size={28} className="opacity-30 mb-2" />
                        <p className="text-xs font-semibold">No CRM follow-up logs registered yet</p>
                      </div>
                    ) : (
                      <div className="relative border-l-2 border-slate-100 dark:border-[#334155] pl-4 ml-2 space-y-6 py-2">
                        {drawerNotes.map((note) => (
                          <div key={note.id} className="relative space-y-1.5">
                            {/* Dot icon */}
                            <span className="absolute -left-[23px] top-1 w-2.5 h-2.5 rounded-full bg-red-500 ring-4 ring-white dark:ring-[#1E293B]" />
                            
                            <div className="flex items-center justify-between gap-3 text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                              <span>{note.date}</span>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-3.5 text-xs text-slate-700 dark:text-[#CBD5E1] font-medium leading-relaxed shadow-sm border border-slate-100/50 dark:border-[#334155]/30">
                              {note.text}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add note timeline form */}
                  <form onSubmit={handleAddNote} className="space-y-3.5 pt-4 border-t border-slate-100 dark:border-[#334155]">
                    <h4 className="font-extrabold text-slate-800 dark:text-[#F8FAFC] text-xs uppercase tracking-wide text-slate-500 dark:text-[#94A3B8]">Log Follow-up Call or Comment</h4>
                    <div className="space-y-2">
                      <textarea
                        rows={3}
                        required
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Type down follow-up call outcomes, commitments, or reminders..."
                        className="w-full px-4 py-3 border border-slate-200 dark:border-[#334155] rounded-2xl text-xs bg-white dark:bg-[#0F172A] text-slate-750 dark:text-[#CBD5E1] resize-none focus:outline-none focus:ring-2 focus:ring-[#EF4444] shadow-sm"
                      />
                      <button 
                        type="submit" 
                        disabled={appendingNote || !newNote.trim()}
                        className="flex items-center justify-center gap-1.5 bg-[#EF4444] hover:bg-red-600 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm self-end"
                      >
                        {appendingNote ? <Loader2 size={13} className="animate-spin" /> : <Send size={12} />}
                        Log Follow-up Note
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Shop Modal */}
      {showModal && (
        <Modal title={editing ? 'Edit Customer Info' : 'Register New Customer Account'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-3.5 text-xs">
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide">Customer Type *</label>
                <select 
                  required
                  value={form.type || 'shop'} 
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-sm bg-white dark:bg-[#0F172A] text-slate-700 dark:text-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#EF4444] font-medium"
                >
                  <option value="shop" className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">🏪 Shop</option>
                  <option value="individual" className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">👤 Individual Customer</option>
                </select>
              </div>

              {form.type === 'shop' ? (
                <>
                  <div className="space-y-1.5">
                    <label className="block font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide">Shop Name *</label>
                    <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-sm bg-white dark:bg-[#0F172A] text-slate-700 dark:text-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#EF4444]" placeholder="e.g. Sharma Electronics" />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="block font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide">Owner Name</label>
                    <input value={form.ownerName || ''} onChange={(e) => setForm((f) => ({ ...f, ownerName: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-sm bg-white dark:bg-[#0F172A] text-slate-700 dark:text-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#EF4444]" placeholder="e.g. Ramesh Sharma" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide">Mobile Number</label>
                    <input value={form.mobile} onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
                      className={`w-full px-4 py-2.5 border rounded-xl text-sm bg-white dark:bg-[#0F172A] text-slate-700 dark:text-[#CBD5E1] focus:outline-none focus:ring-2 ${
                        phoneValidation.error 
                          ? 'border-red-500 focus:ring-[#EF4444] focus:border-red-500 bg-red-50/10 dark:bg-red-950/10' 
                          : 'border-slate-200 dark:border-[#334155] focus:ring-[#EF4444]'
                      }`} 
                      placeholder="e.g. 9876543210" 
                    />
                    {phoneValidation.error && (
                      <p className="text-[11px] font-semibold text-red-500 dark:text-red-400">{phoneValidation.error}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide">Shop Address</label>
                    <textarea rows={2} value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-sm bg-white dark:bg-[#0F172A] text-slate-700 dark:text-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#EF4444] resize-none" placeholder="e.g. 12, Market Road, Delhi" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide">GST Number (Optional)</label>
                    <input value={form.gstNumber || ''} onChange={(e) => setForm((f) => ({ ...f, gstNumber: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-sm bg-white dark:bg-[#0F172A] text-slate-700 dark:text-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#EF4444]" placeholder="e.g. 07AAAAA1111A1Z1" />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="block font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide">Customer Name *</label>
                    <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-sm bg-white dark:bg-[#0F172A] text-slate-700 dark:text-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#EF4444]" placeholder="e.g. Ramesh Kumar" />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="block font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide">Mobile Number</label>
                    <input value={form.mobile} onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
                      className={`w-full px-4 py-2.5 border rounded-xl text-sm bg-white dark:bg-[#0F172A] text-slate-700 dark:text-[#CBD5E1] focus:outline-none focus:ring-2 ${
                        phoneValidation.error 
                          ? 'border-red-500 focus:ring-[#EF4444] focus:border-red-500 bg-red-50/10 dark:bg-red-950/10' 
                          : 'border-slate-200 dark:border-[#334155] focus:ring-[#EF4444]'
                      }`} 
                      placeholder="e.g. 9876543210" 
                    />
                    {phoneValidation.error && (
                      <p className="text-[11px] font-semibold text-red-500 dark:text-red-400">{phoneValidation.error}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide">Address (Optional)</label>
                    <textarea rows={2} value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-sm bg-white dark:bg-[#0F172A] text-slate-700 dark:text-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#EF4444] resize-none" placeholder="e.g. 12, Market Road, Delhi" />
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <label className="block font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide">Initial Profile Notes</label>
                <textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-sm bg-white dark:bg-[#0F172A] text-slate-700 dark:text-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#EF4444] resize-none" placeholder="Optional background details, credit terms..." />
              </div>
            </div>

            {error && <p className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-955/20 border border-red-100 dark:border-red-900/50 px-3 py-2 rounded-xl">{error}</p>}
            
            <div className="flex gap-4 pt-3 border-t border-slate-100 dark:border-[#334155]">
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 border border-slate-200 dark:border-[#334155] rounded-xl text-sm font-semibold text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
              <button type="submit" disabled={saving || !phoneValidation.isValid} className="flex-1 py-3 bg-[#EF4444] hover:bg-red-600 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2">
                {saving && <Loader2 size={16} className="animate-spin" />}
                {editing ? 'Update' : 'Register Account'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
