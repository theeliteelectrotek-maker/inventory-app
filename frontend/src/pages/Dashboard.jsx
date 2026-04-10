import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import {
  Package, ShoppingCart, Store, TrendingUp, AlertTriangle,
  XCircle, Clock, IndianRupee, Loader2, CalendarDays, Building2, ChevronLeft, ChevronRight
} from 'lucide-react';

const PLATFORM_COLORS = { amazon: 'bg-orange-100 text-orange-700', flipkart: 'bg-blue-100 text-blue-700', meesho: 'bg-pink-100 text-pink-700' };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function currentYear() { return new Date().getFullYear(); }

function matchesFilter(dateStr, year, month) {
  if (!dateStr) return false;
  if (month !== null) return dateStr.slice(0, 7) === `${year}-${String(month + 1).padStart(2, '0')}`;
  return dateStr.startsWith(String(year));
}

function filterLabel(year, month) {
  if (month !== null) return `${MONTHS[month]} ${year}`;
  return String(year);
}

function StatCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{label}</p>
          <p className="text-3xl font-bold text-slate-800 mt-1">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [productStats, setProductStats] = useState(null);
  const [onlineSales, setOnlineSales] = useState([]);
  const [offlineSales, setOfflineSales] = useState([]);
  const [totalShops, setTotalShops] = useState(0);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [year, setYear] = useState(currentYear());
  const [month, setMonth] = useState(new Date().getMonth()); // 0-indexed; null = whole year

  useEffect(() => {
    Promise.all([api.getStats(), api.getOnlineSales(), api.getOfflineSales(), api.getShops(), api.getReturns()])
      .then(([stats, online, offline, shops, rets]) => {
        setProductStats(stats);
        setOnlineSales(online);
        setOfflineSales(offline);
        setTotalShops(shops.length);
        setReturns(rets);
        setError(null);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load dashboard data. Please make sure the server is fully running.");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400">
      <Loader2 size={28} className="animate-spin" />
    </div>
  );

  if (error || !productStats) return (
    <div className="flex flex-col items-center justify-center h-64 text-slate-500 space-y-3">
      <AlertTriangle size={36} className="text-red-400" />
      <p className="font-medium text-slate-700">{error || "Data unavailable"}</p>
      <button onClick={() => window.location.reload()} className="px-4 py-2 mt-2 bg-red-600 text-white rounded-lg text-sm font-medium">Retry</button>
    </div>
  );

  const filteredOnline = onlineSales.filter((s) => matchesFilter(s.date, year, month));
  const filteredReturns = returns.filter((r) => matchesFilter(r.date || r.createdAt, year, month));

  // For offline sales, items and transactions can be added at different dates than the invoice date.
  // We extract items and transactions that match the selected month to accurately reflect revenue and sales.
  const offlineItems = offlineSales.flatMap((s) => 
    (s.items && s.items.length > 0) ? s.items.map(i => ({ ...i, saleDate: s.date })) : [{ qty: s.qty, amount: s.totalAmount, date: s.date, saleDate: s.date }]
  );
  
  const filteredOfflineItems = offlineItems.filter((i) => matchesFilter(i.date || i.saleDate, year, month));
  const offlineSalesQty = filteredOfflineItems.reduce((s, i) => s + (Number(i.qty) || 1), 0);
  const offlineRevenue = filteredOfflineItems.reduce((s, i) => s + (Number(i.amount) || 0), 0);

  // Pending payments (total left across all invoices that had activity this month, or just based on invoice date)
  const filteredOfflineInvoices = offlineSales.filter((s) => matchesFilter(s.date, year, month));
  const pendingPayments = filteredOfflineInvoices.reduce((s, x) => s + (Number(x.amountLeft) || 0), 0);

  const onlineRevenue = filteredOnline.reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const totalReturnsQty = filteredReturns.reduce((s, r) => s + (Number(r.qty) || 1), 0);

  const recentOnline = [...filteredOnline].reverse().slice(0, 5);
  const recentOffline = [...filteredOfflineInvoices].reverse().slice(0, 5);

  const label = filterLabel(year, month);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Overview of your inventory and sales</p>
        </div>

        {/* Year + Month filter */}
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
          <CalendarDays size={16} className="text-slate-400 flex-shrink-0" />
          {/* Year picker */}
          <button onClick={() => setYear((y) => y - 1)} className="p-0.5 rounded text-slate-400 hover:text-slate-700"><ChevronLeft size={15} /></button>
          <span className="text-sm font-semibold text-slate-700 w-10 text-center">{year}</span>
          <button onClick={() => setYear((y) => y + 1)} className="p-0.5 rounded text-slate-400 hover:text-slate-700 mr-1"><ChevronRight size={15} /></button>
          {/* Month pills */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMonth(null)}
              className={`px-2 py-0.5 rounded-lg text-xs font-medium transition-colors ${month === null ? 'bg-red-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
              All
            </button>
            {MONTHS.map((m, i) => (
              <button key={m} onClick={() => setMonth(i)}
                className={`px-2 py-0.5 rounded-lg text-xs font-medium transition-colors ${month === i ? 'bg-red-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Product stats — unfiltered */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Products" value={productStats.totalProducts} icon={Package} color="bg-red-100 text-red-600" />
        <StatCard label="Total Shops" value={totalShops} icon={Building2} color="bg-red-100 text-red-600" />
        <StatCard label="Low Stock" value={productStats.lowStock} icon={AlertTriangle} color="bg-yellow-100 text-yellow-600" sub="< 20 units" />
        <StatCard label="Out of Stock" value={productStats.outOfStock} icon={XCircle} color="bg-red-100 text-red-600" />
      </div>

      {/* Sales stats — filtered */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pending Payments" value={`₹${pendingPayments.toFixed(0)}`} icon={Clock} color="bg-orange-100 text-orange-600" sub={label} />
        <StatCard label="Online Sales" value={filteredOnline.length} icon={ShoppingCart} color="bg-purple-100 text-purple-600" sub={label} />
        <StatCard label="Offline Sales" value={offlineSalesQty} icon={Store} color="bg-red-100 text-red-600" sub={label} />
        <StatCard label="Online Revenue" value={`₹${onlineRevenue.toFixed(0)}`} icon={TrendingUp} color="bg-green-100 text-green-600" sub={label} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Offline Revenue" value={`₹${offlineRevenue.toFixed(0)}`} icon={IndianRupee} color="bg-blue-100 text-blue-600" sub={label} />
        <StatCard label="Total Returns" value={totalReturnsQty} icon={TrendingUp} color="bg-emerald-100 text-emerald-600" sub={label} />
      </div>

      {/* Recent activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Online */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <h2 className="font-semibold text-slate-700">Recent Online Sales</h2>
            <Link to="/online-sales" className="text-xs text-red-600 hover:underline">View all</Link>
          </div>
          {recentOnline.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-8">No online sales in {label}</p>
          ) : (
            <ul className="divide-y">
              {recentOnline.map((s) => (
                <li key={s.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{s.productName}</p>
                    <p className="text-xs text-slate-400">{s.date} · Qty: {s.qty}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${PLATFORM_COLORS[s.platform] || 'bg-slate-100 text-slate-600'}`}>
                      {s.platform}
                    </span>
                    <span className="text-sm font-semibold text-slate-700">₹{s.amount}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent Offline */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <h2 className="font-semibold text-slate-700">Recent Offline Sales</h2>
            <Link to="/offline-sales" className="text-xs text-red-600 hover:underline">View all</Link>
          </div>
          {recentOffline.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-8">No offline sales in {label}</p>
          ) : (
            <ul className="divide-y">
              {recentOffline.map((s) => (
                <li key={s.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {s.items && s.items.length > 0
                        ? s.items[0].productName + (s.items.length > 1 ? ` (+ ${s.items.length - 1} more)` : '')
                        : s.productName || 'Unknown Product'}
                    </p>
                    <p className="text-xs text-slate-400">{s.date} · {s.buyerName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-700">₹{s.totalAmount}</p>
                    {s.amountLeft > 0 && (
                      <p className="text-xs text-red-500">Due: ₹{s.amountLeft}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
