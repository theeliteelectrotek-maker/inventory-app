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
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* Header & Compact Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/60">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-1.5">
            <Activity className="text-red-600" size={22} /> Daily Operations Center
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">Real-time daily operations telemetry and warehouse control</p>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate('/offline-sales', { state: { openAddModal: true } })}
            className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold px-3 py-2 rounded-xl shadow-sm hover:shadow transition-all"
          >
            <Plus size={13} /> Add Sale
          </button>
          <button 
            onClick={() => navigate('/shops', { state: { openAddModal: true } })}
            className="flex items-center gap-1 bg-slate-850 hover:bg-slate-900 text-white text-[11px] font-bold px-3 py-2 rounded-xl shadow-sm hover:shadow transition-all"
          >
            <Plus size={13} /> Add Shop
          </button>
          <button 
            onClick={() => navigate('/products', { state: { openAddModal: true } })}
            className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold px-3 py-2 rounded-xl shadow-sm hover:shadow transition-all"
          >
            <Plus size={13} /> Add Product
          </button>
        </div>
      </div>

      {/* ROW 1: 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales Today */}
        <div className="bg-white border border-slate-200/50 rounded-2xl p-4.5 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Sales Today</span>
            <p className="text-xl font-black text-slate-800 leading-none">{fmt(salesToday)}</p>
            <span className="text-[9px] font-medium text-slate-400 block pt-1">Online & Offline orders</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
            <ShoppingCart size={18} />
          </div>
        </div>

        {/* Total Collections Today */}
        <div className="bg-white border border-slate-200/50 rounded-2xl p-4.5 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Collections Today</span>
            <p className="text-xl font-black text-emerald-600 leading-none">{fmt(collectionsToday)}</p>
            <span className="text-[9px] font-medium text-slate-400 block pt-1">Total payments collected</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
            <IndianRupee size={18} />
          </div>
        </div>

        {/* Total Pending Dues */}
        <div className="bg-white border border-slate-200/50 rounded-2xl p-4.5 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Outstanding Dues</span>
            <p className="text-xl font-black text-red-500 leading-none">{fmt(totalPendingDues)}</p>
            <span className="text-[9px] font-medium text-slate-400 block pt-1">Awaiting shop clearances</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center">
            <Clock size={18} />
          </div>
        </div>

        {/* Low Stock Count */}
        <div className="bg-white border border-slate-200/50 rounded-2xl p-4.5 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Low Stock Items</span>
            <p className="text-xl font-black text-amber-500 leading-none">{lowStockCount}</p>
            <span className="text-[9px] font-medium text-slate-400 block pt-1">SKUs running low (&lt;= 20)</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 text-amber-500 flex items-center justify-center">
            <Package size={18} />
          </div>
        </div>
      </div>

      {/* CUSTOMER COUNTS SUB-ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Shops Card */}
        <div className="bg-white border border-slate-200/50 rounded-2xl p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              <Building2 size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Registered Shops</span>
              <p className="text-lg font-black text-slate-800 leading-none mt-1">{totalShopsCount}</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wider">
            🏪 Shop
          </span>
        </div>

        {/* Individual Customers Card */}
        <div className="bg-white border border-slate-200/50 rounded-2xl p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center">
              <User size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Individual Customers</span>
              <p className="text-lg font-black text-slate-800 leading-none mt-1">{totalIndividualsCount}</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-100 uppercase tracking-wider">
            👤 Individual
          </span>
        </div>
      </div>

      {/* ROW 2: Transaction Tables Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <div className="bg-white border border-slate-200/50 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Recent Sales (Last 10)</span>
            <ShoppingCart className="text-slate-400" size={14} />
          </div>
          {recentSales10.length === 0 ? (
            <p className="text-center text-slate-400 text-xs py-10">No sales transactions logged.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[9px] border-b">
                    <th className="px-4 py-2">Item/Invoice</th>
                    <th className="px-4 py-2">Customer/Channel</th>
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentSales10.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-2.5 font-bold text-slate-800 truncate max-w-[160px]">{s.productName}</td>
                      <td className="px-4 py-2.5">
                        {s.type === 'online' ? (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${PLATFORM_COLORS[(s.buyerName || '').toLowerCase()] || 'bg-slate-100 text-slate-600'}`}>{s.buyerName}</span>
                        ) : (
                          <span className="font-semibold text-slate-500">{s.buyerName}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-slate-400 font-medium">{s.date}</td>
                      <td className="px-4 py-2.5 text-right font-black text-slate-700">{fmt(s.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Payments */}
        <div className="bg-white border border-slate-200/50 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Recent Payments (Last 10)</span>
            <IndianRupee className="text-slate-400" size={14} />
          </div>
          {recentPayments10.length === 0 ? (
            <p className="text-center text-slate-400 text-xs py-10">No payments collected yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[9px] border-b">
                    <th className="px-4 py-2">Customer</th>
                    <th className="px-4 py-2">Method</th>
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentPayments10.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-2.5 font-bold text-slate-800 truncate max-w-[160px]">{p.buyerName}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                          p.method?.toLowerCase() === 'cash' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {p.method}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-400 font-medium">{p.date}</td>
                      <td className="px-4 py-2.5 text-right font-black text-emerald-600">+ {fmt(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ROW 3: Action Required Alert Strip */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-1 bg-amber-500 rounded-full" />
          <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Action Required</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-semibold">
          {/* Overdue Payments */}
          <div className={`p-4 border rounded-2xl flex items-center justify-between transition-colors shadow-sm ${overduePaymentsCount > 0 ? 'bg-rose-50 border-rose-100 text-rose-800' : 'bg-white border-slate-200/50 text-slate-700'}`}>
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Overdue Invoices</span>
              <span className="text-lg font-black text-slate-800 block">{overduePaymentsCount}</span>
            </div>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${overduePaymentsCount > 0 ? 'bg-rose-100 text-rose-600' : 'bg-slate-50 text-slate-400'}`}>
              <ShieldAlert size={16} />
            </div>
          </div>

          {/* Low Stock */}
          <div className={`p-4 border rounded-2xl flex items-center justify-between transition-colors shadow-sm ${lowStockCount > 0 ? 'bg-amber-50 border-amber-100 text-amber-800' : 'bg-white border-slate-200/50 text-slate-700'}`}>
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Low Stock SKUs</span>
              <span className="text-lg font-black text-slate-800 block">{lowStockCount}</span>
            </div>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${lowStockCount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-50 text-slate-400'}`}>
              <AlertCircle size={16} />
            </div>
          </div>

          {/* Out Of Stock */}
          <div className={`p-4 border rounded-2xl flex items-center justify-between transition-colors shadow-sm ${outOfStockCount > 0 ? 'bg-red-50 border-red-100 text-red-850' : 'bg-white border-slate-200/50 text-slate-700'}`}>
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Out Of Stock</span>
              <span className="text-lg font-black text-slate-800 block">{outOfStockCount}</span>
            </div>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${outOfStockCount > 0 ? 'bg-red-100 text-red-600' : 'bg-slate-50 text-slate-400'}`}>
              <AlertTriangle size={16} />
            </div>
          </div>

          {/* Pending Returns */}
          <div className={`p-4 border rounded-2xl flex items-center justify-between transition-colors shadow-sm ${pendingReturnsCount > 0 ? 'bg-violet-50 border-violet-100 text-violet-850' : 'bg-white border-slate-200/50 text-slate-700'}`}>
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Returns Review</span>
              <span className="text-lg font-black text-slate-800 block">{pendingReturnsCount}</span>
            </div>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${pendingReturnsCount > 0 ? 'bg-violet-100 text-violet-650' : 'bg-slate-50 text-slate-400'}`}>
              <RotateCcw size={16} />
            </div>
          </div>
        </div>
      </div>

      {/* ROW 4: Live Activity Feed */}
      <div className="bg-white border border-slate-200/50 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <div className="flex items-center gap-1.5">
            <Activity className="text-red-600 animate-pulse" size={14} />
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Live Activity Feed</span>
          </div>
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full">Telemetry Log</span>
        </div>

        {recentActivities.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs">No activity logged.</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {recentActivities.map((act) => (
              <div key={act.id} className="flex items-center justify-between px-5 py-2.5 hover:bg-slate-50/40 transition-colors text-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-7.5 h-7.5 rounded-lg border flex items-center justify-center flex-shrink-0 ${act.iconColor}`}>
                    <act.icon size={13} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 truncate">{act.title}</p>
                    <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{act.details}</p>
                  </div>
                </div>

                <div className="text-right flex-shrink-0 pl-4">
                  <span className={`font-black block text-[11px] ${
                    act.valueType === 'positive' ? 'text-slate-800' :
                    act.valueType === 'highlight' ? 'text-emerald-600 font-extrabold' :
                    act.valueType === 'negative' ? 'text-red-500' :
                    'text-slate-500'
                  }`}>
                    {act.valueText}
                  </span>
                  <span className="text-[8px] text-slate-400 font-semibold block mt-0.5">{formatActivityTime(act.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
