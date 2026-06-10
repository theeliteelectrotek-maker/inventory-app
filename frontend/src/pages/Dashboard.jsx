import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import {
  Package, ShoppingCart, Store, Clock, IndianRupee, Loader2, Building2,
  AlertTriangle, CheckCircle2, Activity, TrendingUp, Plus, ShieldAlert,
  ArrowUpRight, RotateCcw, AlertCircle, User, Users, Tag
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import KPICardValue from '../components/KPICardValue';
import MetricCard from '../components/MetricCard';

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
  amazon: 'bg-orange-50 text-orange-700 border-orange-100', 
  flipkart: 'bg-blue-50 text-blue-700 border-blue-100', 
  meesho: 'bg-pink-50 text-pink-700 border-pink-100' 
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
  const [chatStats, setChatStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      api.getStats(),
      api.getProducts(),
      api.getOnlineSales(),
      api.getOfflineSales(),
      api.getShops(),
      api.getReturns(),
      api.getChatStats()
    ])
      .then(([apiStats, p, online, offline, sh, rets, chatSt]) => {
        setStats(apiStats);
        setProducts(p);
        setOnlineSales(online || []);
        setOfflineSales(offline || []);
        setShops(sh || []);
        setReturns(rets || []);
        setChatStats(chatSt || null);
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

  const fmt = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val || 0);

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
      iconColor: 'text-blue-600 bg-blue-50 border-blue-150'
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
        iconColor: 'text-emerald-600 bg-emerald-50 border-emerald-150'
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
      iconColor: 'text-orange-600 bg-orange-50 border-orange-150'
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
      iconColor: 'text-violet-600 bg-violet-50 border-violet-150'
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
      iconColor: 'text-indigo-600 bg-indigo-50 border-indigo-150'
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
        iconColor: 'text-pink-600 bg-pink-50 border-pink-150'
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
  };

    return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-[#1E293B]">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-[#F8FAFC] tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-8 bg-[#EF4444] rounded-full"></span>
            Daily Operations Center
          </h1>
          <p className="text-slate-500 dark:text-[#94A3B8] font-medium text-sm mt-1">Real-time daily operations telemetry and warehouse control</p>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <button 
            onClick={() => navigate('/offline-sales', { state: { openAddModal: true } })}
            className="flex items-center gap-1.5 bg-[#EF4444] hover:bg-red-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-red-650/10 dark:shadow-none hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus size={14} /> Add Sale
          </button>
          <button 
            onClick={() => navigate('/shops', { state: { openAddModal: true } })}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 dark:bg-[#1E293B] dark:hover:bg-[#334155] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md dark:shadow-none hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus size={14} /> Add Shop
          </button>
          <button 
            onClick={() => navigate('/products', { state: { openAddModal: true } })}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-650/10 dark:shadow-none hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus size={14} /> Add Product
          </button>
        </div>
      </div>

      {/* ROW 1: 4 KPI Cards */}
      <div className="grid gap-6 xl:grid-cols-4 lg:grid-cols-4 md:grid-cols-2 grid-cols-1">
        <MetricCard
          header="Total Sales Today"
          value={salesToday}
          isCurrency
          accentColor="border-t-[#10B981]"
          valueClassName="text-slate-900 dark:text-[#F8FAFC]"
          description="Online & Offline orders"
          icon={
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 text-[#10B981] flex items-center justify-center shrink-0">
              <ShoppingCart size={22} />
            </div>
          }
        />
        <MetricCard
          header="Collections Today"
          value={collectionsToday}
          isCurrency
          accentColor="border-t-[#10B981]"
          valueClassName="text-[#10B981]"
          description="Total payments collected"
          icon={
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 text-[#10B981] flex items-center justify-center shrink-0">
              <IndianRupee size={22} />
            </div>
          }
        />
        <MetricCard
          header="Total Outstanding Dues"
          value={totalPendingDues}
          isCurrency
          accentColor="border-t-[#EF4444]"
          valueClassName="text-[#EF4444]"
          description="Awaiting shop clearances"
          icon={
            <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 text-[#EF4444] flex items-center justify-center shrink-0">
              <Clock size={22} />
            </div>
          }
        />
        <MetricCard
          header="Low Stock Items"
          value={`${lowStockCount}`}
          accentColor="border-t-[#F59E0B]"
          valueClassName="text-[#F59E0B]"
          description="SKUs running low (<= 20)"
          icon={
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 text-[#F59E0B] flex items-center justify-center shrink-0">
              <Package size={22} />
            </div>
          }
        />
      </div>

      {/* CUSTOMER COUNTS SUB-ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Shops Card */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1E293B] border-t-4 border-t-indigo-500 rounded-2xl p-5 shadow-md shadow-slate-100/50 dark:shadow-none flex items-center justify-between hover:shadow-lg dark:hover:shadow-none transition-all duration-300 hover:-translate-y-0.5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-indigo-650 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Building2 size={22} />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider block">Total Registered Shops</span>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-[#F8FAFC] leading-none mt-1">{totalShopsCount}</p>
            </div>
          </div>
          <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 uppercase tracking-wider">
            🏪 Shop
          </span>
        </div>

        {/* Individual Customers Card */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1E293B] border-t-4 border-t-orange-500 rounded-2xl p-5 shadow-md shadow-slate-100/50 dark:shadow-none flex items-center justify-between hover:shadow-lg dark:hover:shadow-none transition-all duration-300 hover:-translate-y-0.5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/50 text-orange-650 dark:text-orange-400 flex items-center justify-center shrink-0">
              <User size={22} />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider block">Total Individual Customers</span>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-[#F8FAFC] leading-none mt-1">{totalIndividualsCount}</p>
            </div>
          </div>
          <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 border border-orange-100 dark:border-orange-900/50 uppercase tracking-wider">
            👤 Individual
          </span>
        </div>
      </div>

      {/* PIECE & BOX SELLING TELEMETRY */}
      <div className="grid gap-6 xl:grid-cols-4 lg:grid-cols-4 md:grid-cols-2 grid-cols-1">
        <MetricCard
          header="Total Pieces Sold"
          value={(stats.totalPiecesSold || 0).toLocaleString('en-IN')}
          accentColor="border-t-purple-500"
          valueClassName="text-slate-900 dark:text-[#F8FAFC]"
          description="Single unit sales"
          icon={
            <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50 text-purple-500 flex items-center justify-center shrink-0">
              <Tag size={20} />
            </div>
          }
        />
        <MetricCard
          header="Total Boxes Sold"
          value={(stats.totalBoxesSold || 0).toLocaleString('en-IN')}
          accentColor="border-t-pink-500"
          valueClassName="text-slate-900 dark:text-[#F8FAFC]"
          description="Box packaging sales"
          icon={
            <div className="w-12 h-12 rounded-xl bg-pink-50 dark:bg-pink-950/30 border border-pink-100 dark:border-pink-900/50 text-pink-500 flex items-center justify-center shrink-0">
              <Package size={20} />
            </div>
          }
        />
        <MetricCard
          header="Piece Sales Revenue"
          value={stats.revenueFromPieceSales}
          isCurrency
          accentColor="border-t-emerald-500"
          valueClassName="text-slate-900 dark:text-[#F8FAFC]"
          description="Income from piece items"
          icon={
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 text-[#10B981] flex items-center justify-center shrink-0">
              <IndianRupee size={20} />
            </div>
          }
        />
        <MetricCard
          header="Box Sales Revenue"
          value={stats.revenueFromBoxSales}
          isCurrency
          accentColor="border-t-blue-500"
          valueClassName="text-slate-900 dark:text-[#F8FAFC]"
          description="Income from box items"
          icon={
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 text-blue-500 flex items-center justify-center shrink-0">
              <IndianRupee size={20} />
            </div>
          }
        />
      </div>

      {/* ROW 2: Transaction Tables Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1E293B] rounded-3xl shadow-md shadow-slate-100/50 dark:shadow-none overflow-hidden flex flex-col hover:shadow-lg dark:hover:shadow-none transition-all duration-300">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#1E293B]">
            <span className="text-sm font-extrabold text-slate-850 dark:text-[#F8FAFC] uppercase tracking-wider">Recent Sales (Last 10)</span>
            <ShoppingCart className="text-slate-400 dark:text-[#94A3B8]" size={16} />
          </div>
          {recentSales10.length === 0 ? (
            <p className="text-center text-slate-400 dark:text-[#94A3B8] text-xs py-10">No sales transactions logged.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50/80 dark:bg-[#1E293B] text-slate-500 dark:text-[#94A3B8] font-bold uppercase text-[10px] tracking-wider border-b border-slate-100 dark:border-[#1E293B]">
                  <tr>
                    <th className="px-6 py-3.5">Item/Invoice</th>
                    <th className="px-6 py-3.5">Customer/Channel</th>
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1E293B] bg-white dark:bg-[#111827] font-semibold text-slate-700 dark:text-[#CBD5E1]">
                  {recentSales10.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-[#1E293B]/40 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800 dark:text-[#F8FAFC] truncate max-w-[160px]">{s.productName}</td>
                      <td className="px-6 py-4">
                        {s.type === 'online' ? (
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${PLATFORM_COLORS[(s.buyerName || '').toLowerCase()] || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>{s.buyerName}</span>
                        ) : (
                          <span className="font-semibold text-slate-550 dark:text-[#94A3B8]">{s.buyerName}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-400 dark:text-slate-500 font-medium">{s.date}</td>
                      <td className="px-6 py-4 text-right font-black text-slate-900 dark:text-[#F8FAFC]">{fmt(s.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Payments */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1E293B] rounded-3xl shadow-md shadow-slate-100/50 dark:shadow-none overflow-hidden flex flex-col hover:shadow-lg dark:hover:shadow-none transition-all duration-300">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#1E293B]">
            <span className="text-sm font-extrabold text-slate-850 dark:text-[#F8FAFC] uppercase tracking-wider">Recent Payments (Last 10)</span>
            <IndianRupee className="text-slate-400 dark:text-[#94A3B8]" size={16} />
          </div>
          {recentPayments10.length === 0 ? (
            <p className="text-center text-slate-400 dark:text-[#94A3B8] text-xs py-10">No payments collected yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50/80 dark:bg-[#1E293B] text-slate-500 dark:text-[#94A3B8] font-bold uppercase text-[10px] tracking-wider border-b border-slate-100 dark:border-[#1E293B]">
                  <tr>
                    <th className="px-6 py-3.5">Customer</th>
                    <th className="px-6 py-3.5">Method</th>
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1E293B] bg-white dark:bg-[#111827] font-semibold text-slate-700 dark:text-[#CBD5E1]">
                  {recentPayments10.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-[#1E293B]/40 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800 dark:text-[#F8FAFC] truncate max-w-[160px]">{p.buyerName}</td>
                      <td className="px-6 py-4">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                          p.method?.toLowerCase() === 'cash' ? 'bg-amber-50 text-amber-700 border-amber-250 dark:bg-amber-950/30 dark:text-[#F59E0B] dark:border-amber-900/50' : 'bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/30 dark:text-[#10B981] dark:border-emerald-900/50'
                        }`}>
                          {p.method}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400 dark:text-slate-500 font-medium">{p.date}</td>
                      <td className="px-6 py-4 text-right font-black text-emerald-600 dark:text-[#10B981]">+ {fmt(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ROW 3: Action Required Alert Strip */}
      <div className="space-y-4">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-1 bg-amber-500 rounded-full" />
          <span className="text-xs font-bold tracking-wider text-slate-400 dark:text-[#94A3B8] uppercase">Action Required</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-xs font-semibold">
          {/* Overdue Payments */}
          <div className={`p-5 border rounded-2xl flex items-center justify-between transition-all duration-300 shadow-md shadow-slate-100/50 dark:shadow-none hover:shadow-lg hover:-translate-y-0.5 ${overduePaymentsCount > 0 ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/40 text-rose-800 dark:text-[#EF4444]' : 'bg-white dark:bg-[#111827] border-slate-200 dark:border-[#1E293B] text-slate-700 dark:text-[#CBD5E1]'}`}>
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider block">Overdue Invoices</span>
              <span className="text-2xl font-black text-slate-805 dark:text-[#F8FAFC] block mt-1">{overduePaymentsCount}</span>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${overduePaymentsCount > 0 ? 'bg-rose-100/80 text-rose-600 dark:bg-rose-950/50 dark:text-[#EF4444]' : 'bg-slate-50 dark:bg-[#1E293B] text-slate-400 dark:text-[#CBD5E1]'}`}>
              <ShieldAlert size={18} />
            </div>
          </div>

          {/* Low Stock */}
          <div className={`p-5 border rounded-2xl flex items-center justify-between transition-all duration-300 shadow-md shadow-slate-100/50 dark:shadow-none hover:shadow-lg hover:-translate-y-0.5 ${lowStockCount > 0 ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/40 text-amber-800 dark:text-[#F59E0B]' : 'bg-white dark:bg-[#111827] border-slate-200 dark:border-[#1E293B] text-slate-700 dark:text-[#CBD5E1]'}`}>
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider block">Low Stock SKUs</span>
              <span className="text-2xl font-black text-slate-805 dark:text-[#F8FAFC] block mt-1">{lowStockCount}</span>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${lowStockCount > 0 ? 'bg-amber-100/80 text-amber-600 dark:bg-amber-950/50 dark:text-[#F59E0B]' : 'bg-slate-50 dark:bg-[#1E293B] text-slate-400 dark:text-[#CBD5E1]'}`}>
              <AlertCircle size={18} />
            </div>
          </div>

          {/* Out Of Stock */}
          <div className={`p-5 border rounded-2xl flex items-center justify-between transition-all duration-300 shadow-md shadow-slate-100/50 dark:shadow-none hover:shadow-lg hover:-translate-y-0.5 ${outOfStockCount > 0 ? 'bg-red-50/50 dark:bg-red-950/20 border-red-100 dark:border-red-900/40 text-red-850 dark:text-[#EF4444]' : 'bg-white dark:bg-[#111827] border-slate-200 dark:border-[#1E293B] text-slate-700 dark:text-[#CBD5E1]'}`}>
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider block">Out Of Stock</span>
              <span className="text-2xl font-black text-slate-805 dark:text-[#F8FAFC] block mt-1">{outOfStockCount}</span>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${outOfStockCount > 0 ? 'bg-red-100/80 text-red-650 dark:bg-red-950/50 dark:text-[#EF4444]' : 'bg-slate-50 dark:bg-[#1E293B] text-slate-400 dark:text-[#CBD5E1]'}`}>
              <AlertTriangle size={18} />
            </div>
          </div>

          {/* Pending Returns */}
          <div className={`p-5 border rounded-2xl flex items-center justify-between transition-all duration-300 shadow-md shadow-slate-100/50 dark:shadow-none hover:shadow-lg hover:-translate-y-0.5 ${pendingReturnsCount > 0 ? 'bg-violet-50/50 dark:bg-violet-950/20 border-violet-100 dark:border-violet-900/40 text-violet-850 dark:text-violet-400' : 'bg-white dark:bg-[#111827] border-slate-200 dark:border-[#1E293B] text-slate-700 dark:text-[#CBD5E1]'}`}>
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider block">Returns Review</span>
              <span className="text-2xl font-black text-slate-805 dark:text-[#F8FAFC] block mt-1">{pendingReturnsCount}</span>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${pendingReturnsCount > 0 ? 'bg-violet-100/80 text-violet-650 dark:bg-violet-950/50 dark:text-violet-400' : 'bg-slate-50 dark:bg-[#1E293B] text-slate-400 dark:text-[#CBD5E1]'}`}>
              <RotateCcw size={18} />
            </div>
          </div>
        </div>
      </div>

      {/* TEAM COLLABORATION HUB SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Announcements */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1E293B] rounded-3xl shadow-md overflow-hidden flex flex-col hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#1E293B] bg-slate-50/50 dark:bg-slate-900/50">
            <span className="text-sm font-extrabold text-slate-850 dark:text-[#F8FAFC] uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert size={16} className="text-red-500" /> Recent Announcements
            </span>
            <button onClick={() => navigate('/communication')} className="text-[10px] font-bold text-red-650 dark:text-red-400 hover:underline">View Chat</button>
          </div>
          <div className="p-5 flex-1 space-y-3.5 overflow-y-auto max-h-[240px] scrollbar-thin">
            {!chatStats?.announcements || chatStats.announcements.length === 0 ? (
              <p className="text-center text-slate-400 dark:text-[#94A3B8] text-xs py-8">No official announcements posted.</p>
            ) : (
              chatStats.announcements.slice(0, 3).map((ann) => (
                <div key={ann.id} className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 rounded-xl text-xs flex gap-2">
                  <AlertCircle size={15} className="text-red-550 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200">{ann.senderName}:</span>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{ann.content}</p>
                    <span className="text-[8px] text-slate-400 dark:text-slate-550 block mt-1.5">{new Date(ann.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1E293B] rounded-3xl shadow-md overflow-hidden flex flex-col hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#1E293B] bg-slate-50/50 dark:bg-slate-900/50">
            <span className="text-sm font-extrabold text-slate-850 dark:text-[#F8FAFC] uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-emerald-500" /> Pending Tasks
            </span>
            <span className="text-[9px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
              {chatStats?.pendingTasks?.length || 0} Pending
            </span>
          </div>
          <div className="p-5 flex-1 space-y-3.5 overflow-y-auto max-h-[240px] scrollbar-thin">
            {!chatStats?.pendingTasks || chatStats.pendingTasks.length === 0 ? (
              <p className="text-center text-slate-400 dark:text-[#94A3B8] text-xs py-8">🎉 No pending tasks assigned to you!</p>
            ) : (
              chatStats.pendingTasks.map((tMsg) => (
                <div key={tMsg.id} className="p-3 bg-slate-50 dark:bg-[#1E293B]/40 border border-slate-150 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-800 dark:text-[#F8FAFC] truncate">{tMsg.task.title}</h4>
                    <p className="text-[9px] text-slate-400 mt-0.5">Assigned by {tMsg.senderName}</p>
                  </div>
                  <button
                    onClick={() => navigate('/communication')}
                    className="px-2.5 py-1 bg-red-600 hover:bg-red-750 text-white font-bold text-[9px] rounded-lg shadow-sm shrink-0"
                  >
                    Open
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Online Employees & Chat Activity Feed */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1E293B] rounded-3xl shadow-md overflow-hidden flex flex-col hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#1E293B] bg-slate-50/50 dark:bg-slate-900/50">
            <span className="text-sm font-extrabold text-slate-850 dark:text-[#F8FAFC] uppercase tracking-wider flex items-center gap-1.5">
              <Users size={16} className="text-indigo-500" /> Team Telemetry
            </span>
            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 px-2 py-0.5 rounded-full">
              {chatStats?.onlineCount || 0} Online
            </span>
          </div>
          <div className="p-4 flex-1 space-y-2.5 overflow-y-auto max-h-[240px] scrollbar-thin">
            <span className="text-[9px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-widest block border-b border-slate-100 dark:border-[#1E293B] pb-1">Activity Feed</span>
            {!chatStats?.activityFeed || chatStats.activityFeed.length === 0 ? (
              <p className="text-center text-slate-400 dark:text-[#94A3B8] text-xs py-8">No recent chat activity.</p>
            ) : (
              chatStats.activityFeed.slice(0, 4).map((act) => (
                <div key={act.id} className="text-[11px] leading-relaxed flex gap-2 text-slate-600 dark:text-[#CBD5E1] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-slate-800 dark:text-[#F8FAFC]">{act.userName}</span> {act.content}
                    <span className="text-[8px] text-slate-400 dark:text-slate-500 block mt-0.5">{new Date(act.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ROW 4: Live Activity Feed */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1E293B] rounded-3xl shadow-md shadow-slate-100/50 dark:shadow-none overflow-hidden flex flex-col hover:shadow-lg dark:hover:shadow-none transition-all duration-300">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#1E293B]">
          <div className="flex items-center gap-2">
            <Activity className="text-[#EF4444] animate-pulse" size={16} />
            <span className="text-sm font-extrabold text-slate-850 dark:text-[#F8FAFC] uppercase tracking-wider">Live Activity Feed</span>
          </div>
          <span className="text-[9px] font-bold text-slate-405 dark:text-[#94A3B8] uppercase tracking-widest bg-slate-50 dark:bg-[#0F172A] border border-slate-100 dark:border-[#1E293B] px-2.5 py-1 rounded-full">Telemetry Log</span>
        </div>

        {recentActivities.length === 0 ? (
          <div className="text-center py-10 text-slate-400 dark:text-[#94A3B8] text-xs">No activity logged.</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-[#1E293B]">
            {recentActivities.map((act) => (
              <div key={act.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50/40 dark:hover:bg-[#1E293B]/30 transition-colors text-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 bg-slate-50 dark:bg-[#1E293B] border-slate-100 dark:border-[#334155] ${act.iconColor}`}>
                    <act.icon size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 dark:text-[#F8FAFC] truncate">{act.title}</p>
                    <p className="text-[10px] text-slate-400 dark:text-[#94A3B8] font-medium truncate mt-0.5">{act.details}</p>
                  </div>
                </div>

                <div className="text-right flex-shrink-0 pl-4">
                  <span className={`font-black block text-[12px] ${
                    act.valueType === 'positive' ? 'text-slate-800 dark:text-[#F8FAFC]' :
                    act.valueType === 'highlight' ? 'text-emerald-600 dark:text-[#10B981] font-extrabold' :
                    act.valueType === 'negative' ? 'text-red-500 dark:text-[#EF4444]' :
                    'text-slate-500 dark:text-[#CBD5E1]'
                  }`}>
                    {act.valueText}
                  </span>
                  <span className="text-[8px] text-slate-400 dark:text-slate-500 font-semibold block mt-0.5">{formatActivityTime(act.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
