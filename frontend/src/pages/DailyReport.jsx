import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../api';
import {
  BarChart2, Calendar, RefreshCw, Loader2, AlertTriangle, TrendingUp, TrendingDown,
  ShoppingCart, IndianRupee, Clock, Package, Store, ArrowUpRight, Users, Building2,
  RotateCcw, Zap, ChevronDown, CheckCircle, XCircle, Download, FileText,
  Award, Tag, Boxes, Repeat2, DollarSign, AreaChart
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const fmt = (v) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(v || 0);

const fmtDec = (v) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2
  }).format(v || 0);

const formatDisplayDate = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d} ${months[parseInt(m, 10) - 1]} ${y}`;
};

const formatGeneratedAt = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({ label, value, icon: Icon, color, isCurrency = true, suffix = '', bg }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border p-5 flex flex-col gap-3 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${bg || 'bg-white dark:bg-[#1E293B] border-slate-200 dark:border-[#334155]'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
          <Icon size={20} />
        </div>
        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-right leading-tight">{label}</span>
      </div>
      <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
        {isCurrency ? fmt(value) : `${(value || 0).toLocaleString('en-IN')}${suffix}`}
      </div>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-9 h-9 rounded-xl bg-[#EF4444]/10 text-[#EF4444] flex items-center justify-center shrink-0">
        <Icon size={18} />
      </div>
      <div>
        <h2 className="text-base font-extrabold text-slate-900 dark:text-white">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Platform Bar ─────────────────────────────────────────────────────────────
function PlatformBar({ label, amount, total, color }) {
  const pct = total > 0 ? Math.min(100, (amount / total) * 100) : 0;
  return (
    <div className="flex items-center gap-4">
      <span className="w-20 text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">{label}</span>
      <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-bold text-slate-700 dark:text-slate-200 w-28 text-right shrink-0">{fmt(amount)}</span>
      <span className="text-xs text-slate-400 w-12 text-right shrink-0">{pct.toFixed(1)}%</span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DailyReport() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'admin' || user?.username === 'admin';

  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [report, setReport] = useState(null);
  const [reportMeta, setReportMeta] = useState(null); // { date, generatedAt, hasActivity }
  const [allDates, setAllDates] = useState([]); // list of available report dates
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [showDateDropdown, setShowDateDropdown] = useState(false);

  // Load available report dates
  const loadDates = useCallback(async () => {
    try {
      const dates = await api.getDailyReports();
      setAllDates(dates || []);
    } catch (e) {
      // Non-critical; we still allow manual fetch
    }
  }, []);

  // Load a specific date's report
  const loadReport = useCallback(async (date) => {
    setLoading(true);
    setError(null);
    setReport(null);
    setReportMeta(null);
    try {
      const res = await api.getDailyReport(date);
      setReportMeta({ date: res.date, generatedAt: res.generatedAt, hasActivity: res.hasActivity });
      setReport(res.data);
    } catch (e) {
      if (e.message && e.message.includes('404')) {
        setError('not_found');
      } else {
        setError(e.message || 'Failed to load report.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDates();
  }, [loadDates]);

  useEffect(() => {
    loadReport(selectedDate);
  }, [selectedDate, loadReport]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      await api.generateDailyReport(selectedDate, false);
      await loadDates();
      await loadReport(selectedDate);
    } catch (e) {
      setError(e.message || 'Generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateAndNotify = async () => {
    setGenerating(true);
    setError(null);
    try {
      await api.generateDailyReport(selectedDate, true);
      await loadDates();
      await loadReport(selectedDate);
    } catch (e) {
      setError(e.message || 'Generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  // ─── Access guard ──────────────────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertTriangle size={48} className="text-red-500" />
        <p className="text-slate-600 dark:text-slate-300 font-semibold">Admin access required.</p>
      </div>
    );
  }

  const d = report;
  const totalPlatform = d ? (d.offlineSales + d.amazonSales + d.flipkartSales + d.meeshoSales) : 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 text-slate-800 dark:text-[#CBD5E1]">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-[#334155] shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/30">
              <BarChart2 size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                📊 Daily Business Report
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Auto-generated every day at <span className="text-[#EF4444] font-bold">8:00 PM</span> · Admin only
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Date picker */}
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
              <Calendar size={15} className="text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                max={getTodayStr()}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-sm font-semibold bg-transparent text-slate-700 dark:text-slate-200 outline-none"
              />
            </div>

            {/* Previous dates dropdown */}
            {allDates.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowDateDropdown(v => !v)}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  <FileText size={13} /> History <ChevronDown size={12} />
                </button>
                {showDateDropdown && (
                  <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden min-w-[160px] max-h-60 overflow-y-auto">
                    {allDates.map(r => (
                      <button
                        key={r.date}
                        onClick={() => { setSelectedDate(r.date); setShowDateDropdown(false); }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-semibold flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${selectedDate === r.date ? 'bg-red-50 dark:bg-red-950/20 text-[#EF4444]' : 'text-slate-700 dark:text-slate-300'}`}
                      >
                        <span>{formatDisplayDate(r.date)}</span>
                        {r.hasActivity
                          ? <CheckCircle size={11} className="text-emerald-500 shrink-0" />
                          : <XCircle size={11} className="text-slate-400 shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Generate / Refresh */}
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white transition-all disabled:opacity-50"
            >
              {generating ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              {generating ? 'Generating…' : 'Generate'}
            </button>
            <button
              onClick={handleGenerateAndNotify}
              disabled={generating}
              className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl bg-[#EF4444] hover:bg-red-600 text-white transition-all shadow-md shadow-red-500/25 disabled:opacity-50"
            >
              <Zap size={13} /> Generate + Notify
            </button>
          </div>
        </div>

        {/* Report metadata bar */}
        {reportMeta && (
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <Calendar size={12} /> Report date: <span className="font-bold text-slate-700 dark:text-slate-200">{formatDisplayDate(reportMeta.date)}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={12} /> Generated: <span className="font-bold text-slate-700 dark:text-slate-200">{formatGeneratedAt(reportMeta.generatedAt)}</span>
            </span>
            <span className={`flex items-center gap-1.5 font-bold px-2 py-0.5 rounded-full text-[10px] ${reportMeta.hasActivity ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600'}`}>
              {reportMeta.hasActivity ? '✅ Has Activity' : '⚪ No Activity'}
            </span>
          </div>
        )}
      </div>

      {/* ── Loading ─────────────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
          <Loader2 size={36} className="animate-spin text-[#EF4444]" />
          <span className="text-sm font-semibold">Loading report…</span>
        </div>
      )}

      {/* ── Error States ─────────────────────────────────────────────────────  */}
      {!loading && error === 'not_found' && (
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-[#334155] p-12 text-center space-y-5">
          <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto">
            <BarChart2 size={28} className="text-amber-500" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-800 dark:text-white">No Report Yet</h2>
            <p className="text-sm text-slate-500 mt-1">
              No report has been generated for <span className="font-bold">{formatDisplayDate(selectedDate)}</span>.
            </p>
            <p className="text-xs text-slate-400 mt-1">Reports are auto-generated at 8:00 PM. You can also generate one manually.</p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 dark:bg-slate-700 text-white text-sm font-bold rounded-xl hover:bg-slate-900 transition-all disabled:opacity-50"
            >
              {generating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Generate Report
            </button>
            <button
              onClick={handleGenerateAndNotify}
              disabled={generating}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#EF4444] text-white text-sm font-bold rounded-xl hover:bg-red-600 transition-all shadow-md shadow-red-500/20 disabled:opacity-50"
            >
              <Zap size={14} /> Generate + Notify Admin
            </button>
          </div>
        </div>
      )}

      {!loading && error && error !== 'not_found' && (
        <div className="flex flex-col items-center justify-center h-48 gap-3 text-red-500">
          <AlertTriangle size={32} />
          <p className="text-sm font-semibold">{error}</p>
          <button onClick={() => loadReport(selectedDate)} className="text-xs underline text-slate-500">Retry</button>
        </div>
      )}

      {/* ── No Activity State ────────────────────────────────────────────────  */}
      {!loading && !error && report && !reportMeta?.hasActivity && (
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-[#334155] p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-3xl">🌙</div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-800 dark:text-white">No Business Activity</h2>
            <p className="text-sm text-slate-500 mt-1">No sales were recorded on <span className="font-bold">{formatDisplayDate(selectedDate)}</span>.</p>
          </div>
          <p className="text-xs text-slate-400">All inventory and pending metrics are still visible below.</p>
        </div>
      )}

      {/* ── Report Content ──────────────────────────────────────────────────── */}
      {!loading && !error && report && (
        <>
          {/* KPI Grid — 20 metrics */}
          <section>
            <SectionHeader icon={TrendingUp} title="Key Performance Indicators" subtitle={`${formatDisplayDate(selectedDate)} — Live from database`} />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              <KPICard label="Total Sales" value={d.totalSales} icon={ShoppingCart} color="bg-red-100 dark:bg-red-950/30 text-red-500" />
              <KPICard label="Collections Received" value={d.totalCollections} icon={IndianRupee} color="bg-emerald-100 dark:bg-emerald-950/30 text-emerald-500" />
              <KPICard label="Pending Amount" value={d.pendingAmount} icon={Clock} color="bg-amber-100 dark:bg-amber-950/30 text-amber-500" />
              <KPICard label="Offline Sales" value={d.offlineSales} icon={Store} color="bg-blue-100 dark:bg-blue-950/30 text-blue-500" />
              <KPICard label="Amazon Sales" value={d.amazonSales} icon={ArrowUpRight} color="bg-orange-100 dark:bg-orange-950/30 text-orange-500" />
              <KPICard label="Flipkart Sales" value={d.flipkartSales} icon={Tag} color="bg-cyan-100 dark:bg-cyan-950/30 text-cyan-500" />
              <KPICard label="Meesho Sales" value={d.meeshoSales} icon={Award} color="bg-pink-100 dark:bg-pink-950/30 text-pink-500" />
              <KPICard label="Total Orders" value={d.totalOrders} isCurrency={false} icon={FileText} color="bg-violet-100 dark:bg-violet-950/30 text-violet-500" />
              <KPICard label="Products Sold (SKUs)" value={d.totalProductsSold} isCurrency={false} icon={Package} color="bg-indigo-100 dark:bg-indigo-950/30 text-indigo-500" />
              <KPICard label="Pieces Sold" value={d.piecesSold} isCurrency={false} icon={Zap} color="bg-teal-100 dark:bg-teal-950/30 text-teal-500" />
              <KPICard label="Boxes Sold" value={d.boxesSold} isCurrency={false} icon={Boxes} color="bg-lime-100 dark:bg-lime-950/30 text-lime-600" />
              <KPICard label="Returns" value={d.returns} isCurrency={false} icon={RotateCcw} color="bg-red-100 dark:bg-red-950/30 text-red-400" />
              <KPICard label="Replacements" value={d.replacements} isCurrency={false} icon={Repeat2} color="bg-rose-100 dark:bg-rose-950/30 text-rose-400" />
              <KPICard label="Gross Profit" value={d.grossProfit} icon={TrendingUp} color={`${d.grossProfit >= 0 ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600' : 'bg-red-100 dark:bg-red-950/30 text-red-500'}`} />
              <KPICard label="Net Profit" value={d.netProfit} icon={d.netProfit >= 0 ? TrendingUp : TrendingDown} color={`${d.netProfit >= 0 ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600' : 'bg-red-100 dark:bg-red-950/30 text-red-500'}`} />
              <KPICard label="Product Cost (COGS)" value={d.productCost} icon={DollarSign} color="bg-slate-100 dark:bg-slate-800 text-slate-500" />
              <KPICard label="New Customers" value={d.newCustomers} isCurrency={false} icon={Users} color="bg-purple-100 dark:bg-purple-950/30 text-purple-500" />
              <KPICard label="New Shops" value={d.newShops} isCurrency={false} icon={Building2} color="bg-sky-100 dark:bg-sky-950/30 text-sky-500" />
              <KPICard label="Low Stock Products" value={d.lowStockProducts} isCurrency={false} icon={AlertTriangle} color="bg-amber-100 dark:bg-amber-950/30 text-amber-500" />
              <KPICard label="Out of Stock" value={d.outOfStockProducts} isCurrency={false} icon={XCircle} color="bg-red-100 dark:bg-red-950/30 text-red-500" />
            </div>
          </section>

          {/* Platform-wise Sales */}
          <section className="bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-[#334155] p-6">
            <SectionHeader icon={AreaChart} title="Platform-wise Sales" subtitle="Revenue breakdown by channel" />
            <div className="space-y-4">
              <PlatformBar label="Offline" amount={d.platformWiseSales?.Offline || 0} total={totalPlatform} color="bg-blue-500" />
              <PlatformBar label="Amazon" amount={d.platformWiseSales?.Amazon || 0} total={totalPlatform} color="bg-orange-500" />
              <PlatformBar label="Flipkart" amount={d.platformWiseSales?.Flipkart || 0} total={totalPlatform} color="bg-cyan-500" />
              <PlatformBar label="Meesho" amount={d.platformWiseSales?.Meesho || 0} total={totalPlatform} color="bg-pink-500" />
            </div>
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-4 text-sm">
              <div className="flex gap-2 items-center">
                <span className="text-slate-500 dark:text-slate-400">Total Revenue:</span>
                <span className="font-extrabold text-slate-900 dark:text-white">{fmt(totalPlatform)}</span>
              </div>
            </div>
          </section>

          {/* Payment Method Summary */}
          <section className="bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-[#334155] p-6">
            <SectionHeader icon={IndianRupee} title="Payment Method Summary" subtitle="Cash collections by payment mode" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Cash', key: 'Cash', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
                { label: 'UPI', key: 'UPI', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800' },
                { label: 'Bank', key: 'Bank', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
                { label: 'Credit (Cheque)', key: 'Credit', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
              ].map(({ label, key, color }) => (
                <div key={key} className={`rounded-xl border p-4 ${color}`}>
                  <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">{label}</p>
                  <p className="text-xl font-black">{fmt(d.paymentMethodSummary?.[key] || 0)}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Product-wise Sales Table */}
          <section className="bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-[#334155] overflow-hidden">
            <div className="p-6 pb-0">
              <SectionHeader icon={Package} title="Product-wise Sales" subtitle="Sorted by highest quantity sold" />
            </div>
            {d.productWiseSales && d.productWiseSales.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-[#0F172A] border-y border-slate-100 dark:border-slate-800">
                      <th className="text-left px-6 py-3 text-xs font-extrabold text-slate-500 uppercase tracking-wider">#</th>
                      <th className="text-left px-4 py-3 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Product</th>
                      <th className="text-right px-4 py-3 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Qty Sold</th>
                      <th className="text-right px-4 py-3 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {d.productWiseSales.map((p, i) => (
                      <tr key={p.productId} className="hover:bg-slate-50 dark:hover:bg-[#0F172A] transition-colors">
                        <td className="px-6 py-3 text-xs font-bold text-slate-400">{i + 1}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{p.name}</div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="inline-flex items-center justify-center bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-extrabold text-sm px-3 py-0.5 rounded-lg">
                            {p.qty}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800 dark:text-slate-100">{fmtDec(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0F172A]">
                    <tr>
                      <td className="px-6 py-3" />
                      <td className="px-4 py-3 text-xs font-extrabold text-slate-500 uppercase">Total</td>
                      <td className="px-4 py-3 text-right font-extrabold text-slate-800 dark:text-white">
                        {d.productWiseSales.reduce((s, p) => s + p.qty, 0)}
                      </td>
                      <td className="px-4 py-3 text-right font-extrabold text-slate-800 dark:text-white">
                        {fmtDec(d.productWiseSales.reduce((s, p) => s + p.amount, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="px-6 py-8 text-center text-sm text-slate-400">No product sales recorded.</p>
            )}
          </section>

          {/* Top 10 Customers */}
          <section className="bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-[#334155] overflow-hidden">
            <div className="p-6 pb-0">
              <SectionHeader icon={Users} title="Top 10 Customers" subtitle="By today's offline billing amount" />
            </div>
            {d.top10Customers && d.top10Customers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-[#0F172A] border-y border-slate-100 dark:border-slate-800">
                      <th className="text-left px-6 py-3 text-xs font-extrabold text-slate-500 uppercase tracking-wider">#</th>
                      <th className="text-left px-4 py-3 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Customer</th>
                      <th className="text-right px-6 py-3 text-xs font-extrabold text-slate-500 uppercase tracking-wider">Billed Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {d.top10Customers.map((c, i) => (
                      <tr key={c.name} className="hover:bg-slate-50 dark:hover:bg-[#0F172A] transition-colors">
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-extrabold ${i === 0 ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : i === 1 ? 'bg-slate-100 text-slate-500 dark:bg-slate-800' : i === 2 ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-slate-50 text-slate-400 dark:bg-slate-900'}`}>
                            {i + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{c.name}</td>
                        <td className="px-6 py-3 text-right font-bold text-slate-800 dark:text-white">{fmtDec(c.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-6 py-8 text-center text-sm text-slate-400">No offline customers today.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
