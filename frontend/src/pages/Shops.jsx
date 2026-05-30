import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { 
  Plus, Pencil, Trash2, X, Loader2, Search, Building2, Phone, MapPin, 
  IndianRupee, TrendingUp, AlertTriangle, AlertCircle, Clock, CheckCircle2, 
  MessageSquare, PhoneCall, Award, Landmark, ChevronRight, Send, 
  BarChart3, Calendar, FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const empty = { name: '', type: 'shop', address: '', mobile: '', notes: '' };

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 !m-0">
      <div className="bg-white rounded-2xl shadow-2xl w-[95%] sm:w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="px-6 py-5 overflow-auto max-h-[85vh]">{children}</div>
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
  const [shops, setShops] = useState([]);
  const [offlineSales, setOfflineSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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

  useEffect(load, []);

  // Update selectedShop data in drawer when shops state updates
  useEffect(() => {
    if (selectedShop) {
      const refreshed = shops.find(s => s.id === selectedShop.id);
      if (refreshed) {
        setSelectedShop(refreshed);
      }
    }
  }, [shops]);

  function openAdd() { setForm(empty); setEditing(null); setError(''); setShowModal(true); }
  function openEdit(s) { setForm({ name: s.name, type: s.type || 'shop', address: s.address || '', mobile: s.mobile || '', notes: s.notes || '' }); setEditing(s); setError(''); setShowModal(true); }

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
        mobile: form.mobile || '',
        address: form.address || '',
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
    let health = 'Good'; // Good (0 dues), Watch (<= 5k), High Risk (> 5k)
    if (stats.amountPending > 5000) health = 'High Risk';
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
    if (pendingAmt >= 5000) return { label: 'High Priority', color: 'bg-red-50 border-red-200 text-red-700' };
    if (pendingAmt >= 1000) return { label: 'Medium Priority', color: 'bg-amber-50 border-amber-200 text-amber-700' };
    return { label: 'Low Priority', color: 'bg-blue-50 border-blue-200 text-blue-700' };
  };

  // Filtering shops for display
  const filtered = shopsWithStats.filter((s) => {
    const matchSearch = !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.mobile && s.mobile.includes(search)) ||
      (s.address && s.address.toLowerCase().includes(search.toLowerCase()));

    let matchFilter = true;
    if (stockFilter === 'highRisk') {
      matchFilter = s.health === 'High Risk';
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

  const fmt = (val) => `₹${Math.round(val || 0).toLocaleString('en-IN')}`;

  function healthBadge(health) {
    if (health === 'High Risk') return <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-red-50 text-red-600 border border-red-100">High Risk</span>;
    if (health === 'Watch') return <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-600 border border-amber-100">Watch</span>;
    return <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">Good</span>;
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

  const monthlyTrendList = getDrawerMonthlyTrend();

  return (
    <div className="space-y-6 relative min-h-screen pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Shop Management</h1>
          <p className="text-slate-500 text-sm mt-1">Audit customer accounts, lifetime revenues, invoice recoveries, and customer health status</p>
        </div>
        <button onClick={openAdd} className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold px-5 py-3 rounded-2xl transition-all shadow-md hover:shadow-lg self-start">
          <Plus size={16} /> Add New Shop
        </button>
      </div>

      {/* Top CRM KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Total Shops */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Shops</span>
            <p className="text-2xl font-black text-slate-800">{totalShops}</p>
            <span className="text-[9px] font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full inline-block">
              Shops Registered
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 text-slate-500 flex items-center justify-center">
            <Building2 size={18} />
          </div>
        </div>

        {/* Active Shops */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Shops</span>
            <p className="text-2xl font-black text-slate-800">{activeShops}</p>
            <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block">
              With logged billing
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={18} />
          </div>
        </div>

        {/* Total Sales */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lifetime Sales</span>
            <p className="text-2xl font-black text-slate-800">{fmt(totalSalesVal)}</p>
            <span className="text-[9px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full inline-block">
              Gross billed amount
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
            <TrendingUp size={18} />
          </div>
        </div>

        {/* Amount Collected */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Collected</span>
            <p className="text-2xl font-black text-slate-800">{fmt(totalCollectedVal)}</p>
            <span className="text-[9px] font-semibold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full inline-block">
              Billed payments settled
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 text-teal-600 flex items-center justify-center">
            <Landmark size={18} />
          </div>
        </div>

        {/* Outstanding Dues */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Pending</span>
            <p className="text-2xl font-black text-slate-800">{fmt(totalOutstandingVal)}</p>
            <span className="text-[9px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full inline-block">
              Accounts receivable
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center">
            <AlertTriangle size={18} />
          </div>
        </div>

        {/* Avg customer value */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Average Shop Value</span>
            <p className="text-2xl font-black text-slate-800">{fmt(avgCustomerLtv)}</p>
            <span className="text-[9px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full inline-block">
              Billed value per shop
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
            <IndianRupee size={18} />
          </div>
        </div>
      </div>

      {/* CRM Insight Leaderboards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Leaderboard */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <div>
            <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
              <Award className="text-amber-500" size={18} /> Customer Leaderboard
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">Top performing shops based on lifetime sales volume</p>
          </div>
          <div className="space-y-3.5 mt-5 max-h-[360px] overflow-y-auto pr-1">
            {leaderboardList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Building2 className="opacity-30 mb-2" size={32} />
                <span className="text-xs font-semibold">No shop records with billing found</span>
              </div>
            ) : (
              leaderboardList.map((s, idx) => {
                const maxSales = leaderboardList[0]?.stats.totalAmount || 1;
                return (
                  <div key={s.id} onClick={() => setSelectedShop(s)} className="group flex items-center gap-3 cursor-pointer p-1.5 hover:bg-slate-50 rounded-2xl transition-all">
                    <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 text-xs font-black flex items-center justify-center group-hover:bg-amber-100 group-hover:text-amber-700 transition-colors">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex justify-between items-center text-xs gap-3">
                        <span className="font-bold text-slate-700 truncate">{s.name}</span>
                        <span className="font-black text-slate-800 whitespace-nowrap">{fmt(s.stats.totalAmount)}</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div style={{ width: `${(s.stats.totalAmount / maxSales) * 100}%` }} className="h-full bg-indigo-600 rounded-full" />
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-600 transition-colors" />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Outstanding Recovery Dashboard */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <div>
            <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
              <Landmark className="text-red-500" size={18} /> Outstanding Recovery Dashboard
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">Outstanding payments from shops</p>
          </div>
          <div className="space-y-3.5 mt-5 max-h-[360px] overflow-y-auto pr-1">
            {outstandingList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <CheckCircle2 className="text-emerald-500 mb-2 opacity-60" size={32} />
                <span className="text-xs font-semibold">Perfect! No outstanding dues remaining.</span>
              </div>
            ) : (
              outstandingList.map((s) => {
                const pri = getPriorityLevel(s.stats.amountPending);
                return (
                  <div key={s.id} onClick={() => setSelectedShop(s)} className="group flex items-center justify-between gap-3 cursor-pointer p-2 hover:bg-slate-50 rounded-2xl border border-slate-50 hover:border-slate-100 transition-all">
                    <div className="flex items-center gap-2.5 truncate">
                      <ShopThumbnail shopName={s.name} />
                      <div className="truncate space-y-0.5">
                        <p className="font-bold text-slate-700 text-xs truncate">{s.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium truncate">{s.mobile || 'No Mobile'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3.5 flex-shrink-0">
                      <div className="text-right space-y-0.5">
                        <p className="font-black text-red-600 text-xs">{fmt(s.stats.amountPending)}</p>
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black border uppercase tracking-wider inline-block ${pri.color}`}>
                          {pri.label}
                        </span>
                      </div>
                      <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-600 transition-colors" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Main CRM Ledger Table Container */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
        {/* Search, filters, pills */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          {/* Search bar */}
          <div className="relative w-full lg:w-[320px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, address, phone..."
              className="w-full pl-8 pr-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {/* CRM Filter Pills */}
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto scrollbar-none max-w-full">
            {[
              { id: 'all', label: 'Shop Accounts' },
              { id: 'highRisk', label: 'High Risk Dues' },
              { id: 'top10', label: 'Top 10 Billed' },
              { id: 'longPending', label: 'Long Overdue Dues (>10d)' }
            ].map((f) => (
              <button 
                key={f.id} 
                onClick={() => setStockFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize shrink-0 ${
                  stockFilter === f.id ? 'bg-red-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 bg-transparent'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sticky CRM Table list */}
        <div className="max-h-[500px] overflow-y-auto border border-slate-100 rounded-2xl">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 size={24} className="animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Building2 size={36} className="mb-2 opacity-30" />
              <p className="text-xs font-semibold">No customer records matches the criteria</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 uppercase font-extrabold sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3">Customer Identity</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Sales Activity</th>
                  <th className="px-4 py-3">Billed Val</th>
                  <th className="px-4 py-3">Settled Amt</th>
                  <th className="px-4 py-3">Outstanding</th>
                  <th className="px-4 py-3">Health State</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-medium text-slate-600">
                {filtered.map((s) => {
                  return (
                    <tr 
                      key={s.id} 
                      onClick={() => setSelectedShop(s)}
                      className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <ShopThumbnail shopName={s.name} />
                          <div className="space-y-0.5 truncate max-w-[180px]">
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-slate-700 truncate">{s.name}</p>
                              {s.type === 'walk-in' ? (
                                <span className="text-[9px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">👤 Walk-in</span>
                              ) : (
                                <span className="text-[9px] px-1.5 py-0.2 bg-emerald-50 text-emerald-600 rounded">🏪 Shop</span>
                              )}
                            </div>
                            <span className="text-[9px] text-slate-400 font-semibold bg-slate-50 px-1.5 py-0.5 rounded-full inline-block truncate max-w-[160px]">
                              {s.address || 'No Address Logged'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {s.mobile ? (
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Phone size={11} className="text-slate-400" />
                            <span>{s.mobile}</span>
                          </div>
                        ) : <span className="text-slate-300">No Mobile</span>}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-700 whitespace-nowrap">
                        {s.stats.totalSales} billing logs
                      </td>
                      <td className="px-4 py-3.5 font-extrabold text-slate-800 whitespace-nowrap">
                        {fmt(s.stats.totalAmount)}
                      </td>
                      <td className="px-4 py-3.5 text-green-600 font-extrabold whitespace-nowrap">
                        {fmt(s.stats.amountReceived)}
                      </td>
                      <td className={`px-4 py-3.5 font-black whitespace-nowrap ${s.stats.amountPending > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                        {fmt(s.stats.amountPending)}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {healthBadge(s.health)}
                      </td>
                      <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {s.mobile && (
                            <>
                              <a href={`tel:${s.mobile}`} title="Call Shop" className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors">
                                <PhoneCall size={13} />
                              </a>
                              <a href={`https://wa.me/${getCleanMobile(s.mobile)}?text=Hello%20${encodeURIComponent(s.name)}%2C%20this%20is%20regarding%20your%20inventory%20billing%20account.`} target="_blank" rel="noopener noreferrer" title="WhatsApp Message" className="p-1.5 rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors">
                                <MessageSquare size={13} />
                              </a>
                            </>
                          )}
                          <button onClick={() => openEdit(s)} title="Edit General Info" className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors">
                            <Pencil size={13} />
                          </button>
                          <button onClick={(e) => handleDelete(s.id, e)} disabled={user?.role === 'employee'} title="Delete" className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
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
          
          <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col transition-transform duration-300">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShopThumbnail shopName={selectedShop.name} />
                <div>
                  <h3 className="text-lg font-black text-slate-800">{selectedShop.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-400 font-medium">Shop ID: {selectedShop.id.slice(0, 8)}</span>
                    {selectedShop.type === 'walk-in' ? (
                      <span className="px-2 py-0.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">👤 Walk-in Customer</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">🏪 Shop</span>
                    )}
                    {healthBadge(selectedShop.health)}
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedShop(null)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100"><X size={18} /></button>
            </div>

            {/* Quick Actions Panel */}
            <div className="px-6 py-3 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-slate-600">
              <div className="flex items-center gap-2">
                {selectedShop.mobile ? (
                  <>
                    <a href={`tel:${selectedShop.mobile}`} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:text-slate-800 transition-all">
                      <PhoneCall size={12} className="text-slate-500" /> Call CRM Contact
                    </a>
                    <a href={`https://wa.me/${getCleanMobile(selectedShop.mobile)}?text=Hello%20${encodeURIComponent(selectedShop.name)}%2C%20this%20is%20regarding%20your%20inventory%20billing%20account.`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 transition-all">
                      <MessageSquare size={12} className="text-emerald-600" /> WhatsApp
                    </a>
                  </>
                ) : (
                  <span className="text-slate-400 italic">No phone logged for shortcuts</span>
                )}
              </div>
              
              <button onClick={() => openEdit(selectedShop)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 transition-all">
                <Pencil size={12} /> Edit General Details
              </button>
            </div>

            {/* Drawer Tabs Selection */}
            <div className="flex border-b border-slate-100 px-6 bg-slate-50/20 text-xs font-bold text-slate-400">
              {[
                { id: 'overview', label: 'Summary & Analytics' },
                { id: 'history', label: `Invoice Logs (${drawerStats.totalSales})` },
                { id: 'notes', label: `CRM Logs Timeline (${drawerNotes.length})` }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveDrawerTab(t.id)}
                  className={`px-4 py-3 border-b-2 font-black transition-all ${
                    activeDrawerTab === t.id ? 'border-red-600 text-red-600' : 'border-transparent hover:text-slate-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Drawer scroll content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {activeDrawerTab === 'overview' && (
                <div className="space-y-6">
                  {/* General Info cards */}
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
                      <p className="font-bold text-slate-400 uppercase tracking-wide">Contact Phone</p>
                      <p className="font-extrabold text-slate-700 text-sm flex items-center gap-1.5">
                        <Phone size={13} className="text-slate-400" /> {selectedShop.mobile || '—'}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
                      <p className="font-bold text-slate-400 uppercase tracking-wide">Shop Location</p>
                      <p className="font-extrabold text-slate-700 text-sm flex items-center gap-1.5 truncate" title={selectedShop.address}>
                        <MapPin size={13} className="text-slate-400 flex-shrink-0" /> {selectedShop.address || '—'}
                      </p>
                    </div>
                  </div>

                  {/* Financial Grid */}
                  <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
                    <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide text-slate-500">Financial Ledger Stats</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Total Purchased</span>
                        <p className="text-base font-black text-slate-800 mt-1">{fmt(drawerStats.totalAmount)}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Total Collected</span>
                        <p className="text-base font-black text-green-600 mt-1">{fmt(drawerStats.amountReceived)}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Pending Balance</span>
                        <p className={`text-base font-black mt-1 ${drawerStats.amountPending > 0 ? 'text-red-500' : 'text-slate-800'}`}>{fmt(drawerStats.amountPending)}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Average order value</span>
                        <p className="text-base font-black text-slate-800 mt-1">
                          {fmt(drawerStats.totalSales > 0 ? drawerStats.totalAmount / drawerStats.totalSales : 0)}
                        </p>
                      </div>
                    </div>

                    {/* Progress behavior */}
                    {(drawerStats.upi > 0 || drawerStats.cash > 0) && (
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
                          <span>UPI Split ({drawerUpiPct.toFixed(0)}%)</span>
                          <span>Cash Split ({drawerCashPct.toFixed(0)}%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden bg-slate-100 flex">
                          <div style={{ width: `${drawerUpiPct}%` }} className="h-full bg-blue-500" title="UPI Payment Share" />
                          <div style={{ width: `${drawerCashPct}%` }} className="h-full bg-green-500" title="Cash Payment Share" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Last Purchase details */}
                  <div className="bg-slate-50/50 rounded-2xl p-4 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Calendar size={15} className="text-slate-400" />
                      <span className="font-semibold text-slate-500">Last Invoice Issued Date:</span>
                    </div>
                    <span className="font-black text-slate-700">
                      {drawerStats.lastPurchaseDate ? new Date(drawerStats.lastPurchaseDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No purchase logged'}
                    </span>
                  </div>

                  {/* Purchases Trend Chart (SVG Visual representation) */}
                  <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide text-slate-500">Shop Monthly Revenue Trend</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">Purchases accumulated in the last 6 months</p>
                      </div>
                      <BarChart3 size={15} className="text-slate-400" />
                    </div>

                    <div className="flex items-end justify-between gap-2 pt-6 h-[120px] px-2 border-b border-slate-100">
                      {monthlyTrendList.map((item, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                          {item.amount > 0 && (
                            <div className="text-[9px] font-black text-slate-700 bg-slate-100 px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity absolute -translate-y-8">
                              {fmt(item.amount)}
                            </div>
                          )}
                          <div 
                            style={{ height: `${Math.max(item.pct, 4)}%` }} 
                            className={`w-full rounded-t-lg transition-all duration-500 ${
                              item.amount > 0 ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-slate-100'
                            }`}
                          />
                          <span className="text-[9px] font-extrabold text-slate-400 mt-1 whitespace-nowrap">{item.month}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeDrawerTab === 'history' && (
                <div className="space-y-4">
                  <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide text-slate-500">Invoice Ledger history</h4>
                  
                  {drawerStats.salesHistory.length === 0 ? (
                    <div className="flex flex-col items-center py-12 text-slate-400">
                      <FileText size={32} className="opacity-30 mb-2" />
                      <p className="text-xs font-semibold">No offline orders logged for this customer</p>
                    </div>
                  ) : (
                    <div className="border border-slate-100 rounded-2xl overflow-hidden text-xs">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase">
                          <tr>
                            <th className="px-4 py-2.5">Date</th>
                            <th className="px-4 py-2.5 text-right">Billed</th>
                            <th className="px-4 py-2.5 text-right">Settled</th>
                            <th className="px-4 py-2.5 text-right">Outstanding</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-600 bg-white">
                          {drawerStats.salesHistory.map((s, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="px-4 py-3 whitespace-nowrap">
                                {new Date(s.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-slate-700">{fmt(s.totalAmount)}</td>
                              <td className="px-4 py-3 text-right text-green-600 font-bold">{fmt(s.amountReceived)}</td>
                              <td className={`px-4 py-3 text-right font-black ${s.amountLeft > 0 ? 'text-red-500' : 'text-slate-400'}`}>
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
                    <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide text-slate-500">Customer Follow-up Timeline</h4>
                    
                    {drawerNotes.length === 0 ? (
                      <div className="bg-slate-50 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-400 border border-dashed">
                        <MessageSquare size={28} className="opacity-30 mb-2" />
                        <p className="text-xs font-semibold">No CRM follow-up logs registered yet</p>
                      </div>
                    ) : (
                      <div className="relative border-l-2 border-slate-100 pl-4 ml-2 space-y-6 py-2">
                        {drawerNotes.map((note) => (
                          <div key={note.id} className="relative space-y-1.5">
                            {/* Dot icon */}
                            <span className="absolute -left-[23px] top-1 w-2.5 h-2.5 rounded-full bg-red-500 ring-4 ring-white" />
                            
                            <div className="flex items-center justify-between gap-3 text-[10px] text-slate-400 font-semibold">
                              <span>{note.date}</span>
                            </div>
                            <div className="bg-slate-50 rounded-2xl p-3.5 text-xs text-slate-700 font-medium leading-relaxed shadow-sm border border-slate-100/50">
                              {note.text}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add note timeline form */}
                  <form onSubmit={handleAddNote} className="space-y-3.5 pt-4 border-t border-slate-100">
                    <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide text-slate-500">Log Follow-up Call or Comment</h4>
                    <div className="space-y-2">
                      <textarea
                        rows={3}
                        required
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Type down follow-up call outcomes, commitments, or reminders..."
                        className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-xs resize-none focus:outline-none focus:ring-2 focus:ring-red-500 bg-white shadow-sm"
                      />
                      <button 
                        type="submit" 
                        disabled={appendingNote || !newNote.trim()}
                        className="flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm self-end"
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
        <Modal title={editing ? 'Edit Shop Ledger Info' : 'Register New Shop Account'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-3.5 text-xs">
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-500 uppercase tracking-wide">Shop Name *</label>
                <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="e.g. Sharma Electronics" />
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-slate-500 uppercase tracking-wide">Customer Type *</label>
                <select 
                  required
                  value={form.type || 'shop'} 
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white font-medium text-slate-700"
                >
                  <option value="shop">🏪 Shop</option>
                  <option value="walk-in">👤 Walk-in Customer</option>
                </select>
              </div>
              
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-500 uppercase tracking-wide">Mobile Number</label>
                <input value={form.mobile} onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="e.g. 9876543210" />
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-slate-500 uppercase tracking-wide">Shop Address</label>
                <textarea rows={2} value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" placeholder="e.g. 12, Market Road, Delhi" />
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-slate-500 uppercase tracking-wide">Initial Profile Notes</label>
                <textarea rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" placeholder="Optional background details, credit terms..." />
              </div>
            </div>

            {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}
            
            <div className="flex gap-4 pt-3 border-t border-slate-100">
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2">
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
