import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import {
  Package, ShoppingCart, Store, Clock, IndianRupee, Loader2, Building2,
  AlertTriangle, CheckCircle2, Activity, TrendingUp, Plus, ShieldAlert,
  ArrowUpRight, RotateCcw, AlertCircle, User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function parseLocalDate(dateStr) {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-');
  if (parts.length !== 3) return new Date(dateStr);
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return new Date(year, month, day);
}

const PLATFORM_COLORS = { 
  amazon: 'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900/50', 
  flipkart: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50', 
  meesho: 'bg-pink-50 text-pink-700 border-pink-100 dark:bg-pink-950/30 dark:text-pink-400 dark:border-pink-900/50' 
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [onlineSales, setOnlineSales] = useState([]);
  const [offlineSales, setOfflineSales] = useState([]);
  const [shops, setShops] = useState([]);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      api.getStats(),
      api.getProducts(),
      api.getOnlineSales(),
      api.getOfflineSales(),
      api.getShops(),
      api.getReturns()
    ])
      .then(([apiStats, p, online, offline, sh, rets]) => {
        setStats(apiStats);
        setProducts(p);
        setOnlineSales(online || []);
        setOfflineSales(offline || []);
        setShops(sh || []);
        setReturns(rets || []);
        setError(null);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load dashboard statistics. Please ensure node servers are running.");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-96 text-slate-400 gap-3">
      <Loader2 size={36} className="animate-spin text-red-600" />
      <span className="text-sm font-semibold tracking-wide">Loading Operations Dashboard…</span>
    </div>
  );

  if (error || !stats) return (
    <div className="flex flex-col items-center justify-center h-96 text-slate-500 space-y-4">
      <AlertTriangle size={48} className="text-red-500" />
      <p className="font-semibold text-slate-700">{error || "Data unavailable"}</p>
      <button onClick={() => window.location.reload()} className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-sm font-bold shadow-md transition-all">Retry Connection</button>
    </div>
  );

  // Helper date parsing
  const getTodayStr = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - (offset * 60 * 1000));
    return local.toISOString().split('T')[0];
  };
  const todayStr = getTodayStr();

  const fmt = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

  // ================= ROW 1 CALCULATIONS =================
  let salesToday = 0;
  onlineSales.forEach(s => {
    if (s.date === todayStr) salesToday += (s.amount || 0);
  });
  offlineSales.forEach(s => {
    if (s.items && s.items.length > 0) {
      s.items.forEach(item => {
        if ((item.date || s.date) === todayStr) salesToday += (item.amount || 0);
      });
    } else {
      if (s.date === todayStr) salesToday += (s.totalAmount || 0);
    }
  });

  let collectionsToday = 0;
  onlineSales.forEach(s => {
    if (s.date === todayStr) collectionsToday += (s.amount || 0);
  });
  offlineSales.forEach(s => {
    (s.transactions || []).forEach(t => {
      if (t.date === todayStr) collectionsToday += (t.amount || 0);
    });
  });

  const totalPendingDues = stats.pendingPayments || 0;
  const lowStockCount = products.filter(p => p.availableQty > 0 && p.availableQty <= 20).length;

  const totalShopsCount = (shops || []).filter(s => s.type === 'shop').length;
  const totalIndividualsCount = (shops || []).filter(s => s.type === 'individual' || s.type === 'walk-in').length;

  // ================= ROW 2 CALCULATIONS =================
  const allSales = [];
  onlineSales.forEach(s => {
    allSales.push({
      id: `on-${s.id}`,
      productName: s.productName,
      buyerName: (s.platform || '').toUpperCase(),
      date: s.date,
      amount: s.amount,
      type: 'online',
      createdAt: s.createdAt || s.date
    });
  });
  offlineSales.forEach(s => {
    allSales.push({
      id: `off-${s.id}`,
      productName: s.items && s.items.length > 0 
        ? s.items[0].productName + (s.items.length > 1 ? ` (+${s.items.length - 1} more)` : '')
        : s.productName || 'Unknown Product',
      buyerName: s.buyerName,
      date: s.date,
      amount: s.totalAmount,
      type: 'offline',
      createdAt: s.createdAt || s.date
    });
  });
  allSales.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const recentSales10 = allSales.slice(0, 10);

  const allPayments = [];
  offlineSales.forEach(s => {
    (s.transactions || []).forEach((t, i) => {
      allPayments.push({
        id: `pay-${s.id}-${i}-${t.amount}`,
        buyerName: s.buyerName,
        amount: t.amount,
        method: t.method || 'cash',
        date: t.date,
        createdAt: t.date + 'T12:00:00.000Z'
      });
    });
  });
  allPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const recentPayments10 = allPayments.slice(0, 10);

  // ================= ROW 3 CALCULATIONS =================
  const todayMs = new Date().setHours(0, 0, 0, 0);
  const overdueInvoices = offlineSales.filter(s => {
    if (s.amountLeft > 0 && s.date) {
      const saleMs = parseLocalDate(s.date).setHours(0, 0, 0, 0);
      const ageDays = Math.floor((todayMs - saleMs) / (1000 * 60 * 60 * 24));
      return ageDays > 10;
    }
    return false;
  });
  const overduePaymentsCount = overdueInvoices.length;
  const outOfStockCount = products.filter(p => p.availableQty === 0).length;
  const pendingReturnsCount = returns.filter(r => r.condition === 'inspection').length;

  // ================= ROW 4 CALCULATIONS =================
  const liveActivities = [];

  offlineSales.forEach(s => {
    liveActivities.push({
      id: `offsale-${s.id}`,
      title: `Offline Invoice Logged`,
      details: `${s.buyerName} · ${s.items?.length || 0} line items`,
      valueText: fmt(s.totalAmount),
      valueType: 'positive',
      timestamp: s.createdAt || s.date,
      icon: Store,
      iconColor: 'text-blue-600 bg-blue-50 border-blue-150 dark:text-blue-400 dark:bg-blue-950/30 dark:border-blue-900/50'
    });

    (s.transactions || []).forEach((t, ti) => {
      liveActivities.push({
        id: `offpay-${s.id}-${ti}-${t.amount}`,
        title: `Payment Received (${(t.method || '').toUpperCase()})`,
        details: `From ${s.buyerName}`,
        valueText: `+ ${fmt(t.amount)}`,
        valueType: 'highlight',
        timestamp: t.date + 'T12:00:00.000Z',
        icon: IndianRupee,
        iconColor: 'text-emerald-600 bg-emerald-50 border-emerald-150 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-900/50'
      });
    });
  });

  onlineSales.forEach(s => {
    liveActivities.push({
      id: `onsale-${s.id}`,
      title: `Online Marketplace Sale`,
      details: `${s.qty}x ${s.productName} via ${(s.platform || '').toUpperCase()}`,
      valueText: fmt(s.amount),
      valueType: 'positive',
      timestamp: s.createdAt || s.date,
      icon: ShoppingCart,
      iconColor: 'text-orange-600 bg-orange-50 border-orange-150 dark:text-orange-400 dark:bg-orange-950/30 dark:border-orange-900/50'
    });
  });

  returns.forEach(r => {
    liveActivities.push({
      id: `return-${r.id}`,
      title: `Returned Stock Entry`,
      details: `${r.qty}x ${r.productName} (${r.condition === 'good' ? 'Recovered' : 'Damaged'})`,
      valueText: `Qty: ${r.qty}`,
      valueType: 'negative',
      timestamp: r.createdAt || r.date,
      icon: RotateCcw,
      iconColor: 'text-violet-600 bg-violet-50 border-violet-150 dark:text-violet-400 dark:bg-violet-950/30 dark:border-violet-900/50'
    });
  });

  products.forEach(p => {
    liveActivities.push({
      id: `prod-${p.id}`,
      title: `New Product Registered`,
      details: `${p.name} · SKU: ${p.sku || 'N/A'}`,
      valueText: `Stock: ${p.availableQty}`,
      valueType: 'neutral',
      timestamp: p.createdAt || todayStr,
      icon: Package,
      iconColor: 'text-indigo-600 bg-indigo-50 border-indigo-150 dark:text-indigo-400 dark:bg-indigo-950/30 dark:border-indigo-900/50'
    });
  });

  shops.forEach(sh => {
    if (sh.name !== 'Individual Customer' && sh.name !== 'Walk-in Customer') {
      liveActivities.push({
        id: `shop-${sh.id}`,
        title: `New Shop Registered`,
        details: `${sh.name}`,
        valueText: (sh.type || 'shop').toUpperCase(),
        valueType: 'neutral',
        timestamp: sh.createdAt || todayStr,
        icon: Building2,
        iconColor: 'text-pink-600 bg-pink-50 border-pink-150 dark:text-pink-400 dark:bg-pink-950/30 dark:border-pink-900/50'
      });
    }
  });

  liveActivities.sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime() || 0;
    const timeB = new Date(b.timestamp).getTime() || 0;
    return timeB - timeA;
  });

  const recentActivities = liveActivities.slice(0, 8);

  const formatActivityTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
    return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header & Compact Quick Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-[#1E293B]">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-[#F8FAFC] tracking-tight flex items-center gap-2">
            <Activity className="text-red-600 dark:text-[#EF4444]" size={24} /> Daily Operations Center
          </h1>
          <p className="text-slate-500 dark:text-[#94A3B8] font-medium text-sm mt-1">Real-time daily operations telemetry and warehouse control</p>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => navigate('/offline-sales', { state: { openAddModal: true } })}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md shadow-red-100 dark:shadow-none hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 animate-none"
          >
            <Plus size={14} /> Add Sale
          </button>
          <button 
            onClick={() => navigate('/shops', { state: { openAddModal: true } })}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md shadow-slate-200 dark:shadow-none hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
          >
            <Plus size={14} /> Add Shop
          </button>
          <button 
            onClick={() => navigate('/products', { state: { openAddModal: true } })}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md shadow-indigo-100 dark:shadow-none hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
          >
            <Plus size={14} /> Add Product
          </button>
        </div>
      </div>

      {/* ROW 1: 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Sales Today */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1E293B] border-t-4 border-t-indigo-650 dark:border-t-indigo-600 rounded-2xl p-6 shadow-md shadow-slate-100/50 dark:shadow-none flex items-center justify-between hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-none transition-all duration-300 min-h-[140px]">
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider block">Total Sales Today</span>
            <p className="text-3xl font-extrabold text-slate-900 dark:text-[#F8FAFC] tracking-tight leading-none">{fmt(salesToday)}</p>
            <span className="text-[11px] font-semibold text-slate-400 dark:text-[#94A3B8] block pt-1.5">Online & Offline orders</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 dark:bg-indigo-950/30 dark:border-indigo-900/50 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <ShoppingCart size={22} />
          </div>
        </div>

        {/* Total Collections Today */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1E293B] border-t-4 border-t-emerald-600 rounded-2xl p-6 shadow-md shadow-slate-100/50 dark:shadow-none flex items-center justify-between hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-none transition-all duration-300 min-h-[140px]">
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider block">Collections Today</span>
            <p className="text-3xl font-extrabold text-emerald-600 dark:text-[#10B981] tracking-tight leading-none">{fmt(collectionsToday)}</p>
            <span className="text-[11px] font-semibold text-slate-400 dark:text-[#94A3B8] block pt-1.5">Total payments collected</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-[#10B981] flex items-center justify-center shrink-0">
            <IndianRupee size={22} />
          </div>
        </div>

        {/* Total Pending Dues */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1E293B] border-t-4 border-t-red-500 rounded-2xl p-6 shadow-md shadow-slate-100/50 dark:shadow-none flex items-center justify-between hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-none transition-all duration-300 min-h-[140px]">
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider block">Total Outstanding Dues</span>
            <p className="text-3xl font-extrabold text-red-600 dark:text-[#EF4444] tracking-tight leading-none">{fmt(totalPendingDues)}</p>
            <span className="text-[11px] font-semibold text-slate-400 dark:text-[#94A3B8] block pt-1.5">Awaiting shop clearances</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 text-red-600 dark:bg-red-950/30 dark:border-red-900/50 dark:text-[#EF4444] flex items-center justify-center shrink-0">
            <Clock size={22} />
          </div>
        </div>

        {/* Low Stock Count */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1E293B] border-t-4 border-t-amber-500 rounded-2xl p-6 shadow-md shadow-slate-100/50 dark:shadow-none flex items-center justify-between hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-none transition-all duration-300 min-h-[140px]">
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider block">Low Stock Items</span>
            <p className="text-3xl font-extrabold text-amber-600 dark:text-[#F59E0B] tracking-tight leading-none">{lowStockCount}</p>
            <span className="text-[11px] font-semibold text-slate-400 dark:text-[#94A3B8] block pt-1.5">SKUs running low (&lt;= 20)</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 text-amber-500 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-[#F59E0B] flex items-center justify-center shrink-0">
            <Package size={22} />
          </div>
        </div>
      </div>

      {/* CUSTOMER COUNTS SUB-ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Shops Card */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1E293B] rounded-2xl p-6 shadow-md shadow-slate-100/50 dark:shadow-none flex items-center justify-between hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-none transition-all duration-300">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 dark:bg-indigo-950/30 dark:border-indigo-900/50 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Building2 size={22} />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider block">Total Registered Shops</span>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-[#F8FAFC] tracking-tight mt-1">{totalShopsCount}</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/50 uppercase tracking-wider">
            🏪 Shop
          </span>
        </div>

        {/* Individual Customers Card */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1E293B] rounded-2xl p-6 shadow-md shadow-slate-100/50 dark:shadow-none flex items-center justify-between hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-none transition-all duration-300">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 text-orange-600 dark:bg-orange-950/30 dark:border-orange-900/50 dark:text-orange-400 flex items-center justify-center shrink-0">
              <User size={22} />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider block">Total Individual Customers</span>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-[#F8FAFC] tracking-tight mt-1">{totalIndividualsCount}</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-xl text-xs font-bold bg-orange-50 text-orange-700 border border-orange-100 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900/50 uppercase tracking-wider">
            👤 Individual
          </span>
        </div>
      </div>

      {/* ROW 2: Transaction Tables Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1E293B] rounded-3xl shadow-md shadow-slate-100/50 dark:shadow-none overflow-hidden flex flex-col min-h-[460px] max-h-[460px]">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#1E293B] bg-slate-50 dark:bg-[#1E293B]">
            <span className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] tracking-tight uppercase">Recent Sales (Last 10)</span>
            <ShoppingCart className="text-slate-400 dark:text-[#CBD5E1]" size={16} />
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {recentSales10.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-center text-slate-400 dark:text-[#94A3B8] text-sm py-10">No sales transactions logged.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-[#1E293B] text-slate-500 dark:text-[#CBD5E1] font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-[#1E293B]">
                    <th className="px-6 py-3">Item/Invoice</th>
                    <th className="px-6 py-3">Customer/Channel</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1E293B]">
                  {recentSales10.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-[#172554] transition-colors">
                      <td className="px-6 py-3.5 font-bold text-slate-800 dark:text-[#F8FAFC] truncate max-w-[180px]" title={s.productName}>{s.productName}</td>
                      <td className="px-6 py-3.5">
                        {s.type === 'online' ? (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border uppercase tracking-wider ${PLATFORM_COLORS[(s.buyerName || '').toLowerCase()] || 'bg-slate-100 text-slate-600'}`} title={s.buyerName}>{s.buyerName}</span>
                        ) : (
                          <span className="font-semibold text-slate-600 dark:text-[#CBD5E1] truncate max-w-[130px] block" title={s.buyerName}>{s.buyerName}</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-slate-500 dark:text-[#94A3B8] font-semibold">{s.date}</td>
                      <td className="px-6 py-3.5 text-right font-bold text-slate-900 dark:text-[#F8FAFC]">{fmt(s.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1E293B] rounded-3xl shadow-md shadow-slate-100/50 dark:shadow-none overflow-hidden flex flex-col min-h-[460px] max-h-[460px]">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#1E293B] bg-slate-50 dark:bg-[#1E293B]">
            <span className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] tracking-tight uppercase">Recent Payments (Last 10)</span>
            <IndianRupee className="text-slate-400 dark:text-[#CBD5E1]" size={16} />
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {recentPayments10.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-center text-slate-400 dark:text-[#94A3B8] text-sm py-10">No payments collected yet.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-[#1E293B] text-slate-500 dark:text-[#CBD5E1] font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-[#1E293B]">
                    <th className="px-6 py-3">Customer</th>
                    <th className="px-6 py-3">Method</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1E293B]">
                  {recentPayments10.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-[#172554] transition-colors">
                      <td className="px-6 py-3.5 font-bold text-slate-800 dark:text-[#F8FAFC] truncate max-w-[180px]" title={p.buyerName}>{p.buyerName}</td>
                      <td className="px-6 py-3.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border uppercase tracking-wider ${
                          p.method?.toLowerCase() === 'cash' 
                            ? 'bg-amber-50 text-amber-750 border-amber-200 dark:bg-amber-950/30 dark:text-[#F59E0B] dark:border-amber-900/50' 
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-[#10B981] dark:border-emerald-900/50'
                        }`}>
                          {p.method}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-slate-500 dark:text-[#94A3B8] font-semibold">{p.date}</td>
                      <td className="px-6 py-3.5 text-right font-extrabold text-emerald-755 dark:text-[#10B981]">+ {fmt(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ROW 3: Action Required Alert Strip */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="h-3 w-1.5 bg-amber-500 rounded-full" />
          <span className="text-xs font-extrabold tracking-widest text-slate-500 dark:text-[#CBD5E1] uppercase">Action Required</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-xs font-semibold">
          {/* Overdue Payments */}
          <div className={`p-5 border rounded-2xl flex items-center justify-between transition-all duration-300 shadow-md shadow-slate-100/50 dark:shadow-none h-full hover:scale-[1.02] ${overduePaymentsCount > 0 ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300' : 'bg-white dark:bg-[#111827] border-slate-200 dark:border-[#1E293B] text-slate-700 dark:text-[#CBD5E1]'}`}>
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider block">Overdue Invoices</span>
              <span className={`text-2xl font-black block mt-1 ${overduePaymentsCount > 0 ? 'text-rose-700 dark:text-rose-450' : 'text-slate-800 dark:text-[#F8FAFC]'}`}>{overduePaymentsCount}</span>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${overduePaymentsCount > 0 ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' : 'bg-slate-50 dark:bg-[#1E293B] text-slate-400 dark:text-[#94A3B8]'}`}>
              <ShieldAlert size={18} />
            </div>
          </div>

          {/* Low Stock */}
          <div className={`p-5 border rounded-2xl flex items-center justify-between transition-all duration-300 shadow-md shadow-slate-100/50 dark:shadow-none h-full hover:scale-[1.02] ${lowStockCount > 0 ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-350' : 'bg-white dark:bg-[#111827] border-slate-200 dark:border-[#1E293B] text-slate-700 dark:text-[#CBD5E1]'}`}>
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider block">Low Stock SKUs</span>
              <span className={`text-2xl font-black block mt-1 ${lowStockCount > 0 ? 'text-amber-700 dark:text-[#F59E0B]' : 'text-slate-800 dark:text-[#F8FAFC]'}`}>{lowStockCount}</span>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${lowStockCount > 0 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-[#F59E0B]' : 'bg-slate-50 dark:bg-[#1E293B] text-slate-400 dark:text-[#94A3B8]'}`}>
              <AlertCircle size={18} />
            </div>
          </div>

          {/* Out Of Stock */}
          <div className={`p-5 border rounded-2xl flex items-center justify-between transition-all duration-300 shadow-md shadow-slate-100/50 dark:shadow-none h-full hover:scale-[1.02] ${outOfStockCount > 0 ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50 text-red-900 dark:text-red-350' : 'bg-white dark:bg-[#111827] border-slate-200 dark:border-[#1E293B] text-slate-700 dark:text-[#CBD5E1]'}`}>
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider block">Out Of Stock</span>
              <span className={`text-2xl font-black block mt-1 ${outOfStockCount > 0 ? 'text-red-700 dark:text-[#EF4444]' : 'text-slate-800 dark:text-[#F8FAFC]'}`}>{outOfStockCount}</span>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${outOfStockCount > 0 ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-[#EF4444]' : 'bg-slate-50 dark:bg-[#1E293B] text-slate-400 dark:text-[#94A3B8]'}`}>
              <AlertTriangle size={18} />
            </div>
          </div>

          {/* Pending Returns */}
          <div className={`p-5 border rounded-2xl flex items-center justify-between transition-all duration-300 shadow-md shadow-slate-100/50 dark:shadow-none h-full hover:scale-[1.02] ${pendingReturnsCount > 0 ? 'bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-900/50 text-violet-900 dark:text-violet-300' : 'bg-white dark:bg-[#111827] border-slate-200 dark:border-[#1E293B] text-slate-700 dark:text-[#CBD5E1]'}`}>
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider block">Returns Review</span>
              <span className={`text-2xl font-black block mt-1 ${pendingReturnsCount > 0 ? 'text-violet-700 dark:text-violet-400' : 'text-slate-800 dark:text-[#F8FAFC]'}`}>{pendingReturnsCount}</span>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${pendingReturnsCount > 0 ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-650 dark:text-violet-400' : 'bg-slate-50 dark:bg-[#1E293B] text-slate-400 dark:text-[#94A3B8]'}`}>
              <RotateCcw size={18} />
            </div>
          </div>
        </div>
      </div>

      {/* ROW 4: Live Activity Feed */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1E293B] rounded-3xl shadow-md shadow-slate-100/50 dark:shadow-none overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-200 dark:border-[#1E293B] bg-slate-50 dark:bg-[#1E293B]">
          <div className="flex items-center gap-2">
            <Activity className="text-red-650 dark:text-[#EF4444] animate-pulse" size={16} />
            <span className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] tracking-tight uppercase">Live Activity Feed</span>
          </div>
          <span className="text-[10px] font-bold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wider bg-slate-100 dark:bg-[#1E293B] border border-slate-200 dark:border-[#1E293B] px-3 py-1 rounded-full">Telemetry Log</span>
        </div>

        {recentActivities.length === 0 ? (
          <div className="text-center py-10 text-slate-400 dark:text-[#94A3B8] text-sm">No activity logged.</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-[#1E293B]">
            {recentActivities.map((act) => (
              <div key={act.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50/50 dark:bg-[#111827] dark:hover:bg-[#172554] transition-colors text-xs">
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${act.iconColor}`}>
                    <act.icon size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 dark:text-[#F8FAFC] truncate text-xs" title={act.title}>{act.title}</p>
                    <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] font-semibold truncate mt-0.5" title={act.details}>{act.details}</p>
                  </div>
                </div>

                <div className="text-right flex-shrink-0 pl-4">
                  <span className={`font-bold block text-xs ${
                    act.valueType === 'positive' ? 'text-slate-900 dark:text-[#F8FAFC]' :
                    act.valueType === 'highlight' ? 'text-emerald-700 dark:text-[#10B981] font-extrabold' :
                    act.valueType === 'negative' ? 'text-red-600 dark:text-[#EF4444]' :
                    'text-slate-500 dark:text-[#94A3B8]'
                  }`}>
                    {act.valueText}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-[#94A3B8] font-semibold block mt-0.5">{formatActivityTime(act.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
