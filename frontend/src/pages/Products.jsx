import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { 
  Package, IndianRupee, CheckCircle2, Box, ArrowRight, Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import KPICardValue from '../components/KPICardValue';
import MetricCard from '../components/MetricCard';

// --- Product Initial Thumbnail avatar ---
function ProductThumbnail({ productName }) {
  const name = productName || 'P';
  const initial = name.charAt(0).toUpperCase();
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    'from-pink-500 to-rose-500 text-rose-50 border-pink-100 dark:border-transparent',
    'from-purple-500 to-indigo-500 text-indigo-50 border-purple-100 dark:border-transparent',
    'from-blue-500 to-cyan-500 text-cyan-50 border-blue-100 dark:border-transparent',
    'from-teal-500 to-emerald-500 text-emerald-50 border-teal-100 dark:border-transparent',
    'from-amber-500 to-orange-500 text-orange-50 border-amber-100 dark:border-transparent',
    'from-red-500 to-rose-500 text-rose-50 border-red-100 dark:border-transparent'
  ];
  const colorClass = colors[Math.abs(hash) % colors.length];

  return (
    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${colorClass} flex items-center justify-center text-xs font-black shadow-sm border flex-shrink-0`}>
      {initial}
    </div>
  );
}

export default function Products() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [onlineSales, setOnlineSales] = useState([]);
  const [offlineSales, setOfflineSales] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    Promise.all([
      api.getProducts(),
      api.getOnlineSales(),
      api.getOfflineSales()
    ])
      .then(([p, online, offline]) => {
        setProducts(p);
        setOnlineSales(online);
        setOfflineSales(offline);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  // --- Aggregate Sales Quantities per Product ---
  const productSalesCount = {};
  onlineSales.forEach(s => {
    productSalesCount[s.productId] = (productSalesCount[s.productId] || 0) + s.qty;
  });
  offlineSales.forEach(s => {
    (s.items || []).forEach(item => {
      productSalesCount[item.productId] = (productSalesCount[item.productId] || 0) + item.qty;
    });
  });

  // --- KPI Metrics ---
  const totalProducts = products.length;
  const totalInventoryValue = products.reduce((sum, p) => sum + ((p.availableQty || 0) * (p.costPrice || 0)), 0);
  const lowStockCount = products.filter(p => p.availableQty > 0 && p.availableQty <= 10).length;
  const outOfStockCount = products.filter(p => p.availableQty === 0).length;

  // Margin percentages
  let totalMarginPct = 0;
  let marginCount = 0;
  products.forEach(p => {
    const cp = p.costPrice || 0;
    if (cp > 0) {
      const sps = [p.amazonPrice || 0, p.flipkartPrice || 0, p.meeshoPrice || 0, p.offlinePrice || 0].filter(v => v > 0);
      if (sps.length > 0) {
        const avgSp = sps.reduce((a, b) => a + b, 0) / sps.length;
        const marginVal = avgSp - cp;
        const marginPct = (marginVal / cp) * 100;
        totalMarginPct += marginPct;
        marginCount += 1;
      }
    }
  });
  const avgMarginPct = marginCount > 0 ? totalMarginPct / marginCount : 0;

  // --- Product Health Counts ---
  const healthyCount = products.filter(p => p.availableQty > 10).length;
  const healthyPct = totalProducts > 0 ? (healthyCount / totalProducts) * 100 : 0;
  const lowStockPct = totalProducts > 0 ? (lowStockCount / totalProducts) * 100 : 0;
  const outOfStockPct = totalProducts > 0 ? (outOfStockCount / totalProducts) * 100 : 0;

  // --- Product Widgets ---
  // Top Selling Products (by quantity)
  const topSellingList = Object.entries(productSalesCount)
    .map(([id, qty]) => {
      const p = products.find(prod => prod.id === id);
      return {
        id,
        name: p?.name || 'Unknown Product',
        qty,
        revenue: qty * (p?.amazonPrice || p?.offlinePrice || 0)
      };
    })
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  const maxSoldQty = topSellingList[0]?.qty || 1;

  // Highest Asset Value
  const highestValueList = products
    .map(p => ({
      id: p.id,
      name: p.name,
      qty: p.availableQty || 0,
      value: (p.availableQty || 0) * (p.costPrice || 0)
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const maxVal = highestValueList[0]?.value || 1;

  const fmt = (val) => `₹${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-slate-400">
        <Loader2 className="animate-spin text-red-600 mb-2" size={36} />
        <span className="text-sm font-semibold">Loading catalog overview...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-[#1E293B]">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-[#F8FAFC] tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-8 bg-red-650 dark:bg-[#EF4444] rounded-full"></span>
            Products Performance
          </h1>
          <p className="text-slate-500 dark:text-[#94A3B8] font-medium text-sm mt-1">Inventory overview dashboard — analytics, stock health, and performance insights</p>
        </div>
        <Link 
          to="/products/details"
          className="flex items-center justify-center gap-2 bg-[#EF4444] hover:bg-red-600 text-white text-xs font-bold px-5 py-3 rounded-2xl transition-all shadow-md shadow-red-600/10 dark:shadow-none hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 self-start"
        >
          Manage Products <ArrowRight size={14} />
        </Link>
      </div>

      {/* KPI Section */}
      <div className="grid gap-6 xl:grid-cols-5 lg:grid-cols-5 md:grid-cols-2 grid-cols-1">
        <MetricCard
          header="Total Products"
          value={`${totalProducts}`}
          accentColor="border-t-red-600 dark:border-t-red-500"
          valueClassName="text-slate-900 dark:text-[#F8FAFC]"
          description="Unique catalog count"
          icon={
            <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-[#1E293B] border border-slate-150 dark:border-[#1E293B] text-slate-550 dark:text-[#CBD5E1] flex items-center justify-center shrink-0">
              <Box size={22} />
            </div>
          }
        />
        <MetricCard
          header="Inventory Value"
          value={totalInventoryValue}
          isCurrency
          accentColor="border-t-emerald-600"
          valueClassName="text-slate-900 dark:text-[#F8FAFC]"
          description="Valued at cost price"
          icon={
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-[#10B981] flex items-center justify-center shrink-0">
              <IndianRupee size={22} />
            </div>
          }
        />
        <MetricCard
          header="Low Stock"
          value={`${lowStockCount} items`}
          accentColor="border-t-amber-500"
          valueClassName="text-amber-600 dark:text-[#F59E0B]"
        >
          <span className="text-[11px] font-semibold text-amber-600 dark:text-[#F59E0B] bg-amber-50/50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full inline-block mt-1">
            Stock level &lt;= 10
          </span>
        </MetricCard>
        <MetricCard
          header="Out of Stock"
          value={`${outOfStockCount} items`}
          accentColor="border-t-red-500 dark:border-t-[#EF4444]"
          valueClassName="text-[#EF4444]"
        >
          <span className="text-[11px] font-semibold text-red-600 dark:text-[#EF4444] bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded-full inline-block mt-1">
            Depleted inventory
          </span>
        </MetricCard>
        <MetricCard
          header="Average Margin"
          value={`${avgMarginPct.toFixed(1)}%`}
          accentColor="border-t-blue-500 dark:border-t-blue-500"
          valueClassName="text-slate-900 dark:text-[#F8FAFC]"
        >
          <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded-full inline-block mt-1">
            Mean product margin
          </span>
        </MetricCard>
      </div>

      {/* Product Health Section */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1E293B] rounded-2xl p-6 shadow-md shadow-slate-100/50 dark:shadow-none space-y-4">
        <div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-[#F8FAFC] tracking-tight">Catalog Inventory Health</h3>
          <p className="text-slate-405 dark:text-[#94A3B8] font-semibold text-xs mt-0.5">Distribution breakdown of stock safety states across all products</p>
        </div>
        <div className="space-y-3">
          <div className="flex w-full h-3.5 rounded-full overflow-hidden bg-slate-100 dark:bg-[#0F172A]">
            <div style={{ width: `${healthyPct}%` }} className="h-full bg-emerald-500 transition-all duration-300" title={`Healthy: ${healthyCount}`} />
            <div style={{ width: `${lowStockPct}%` }} className="h-full bg-amber-500 transition-all duration-300" title={`Low Stock: ${lowStockCount}`} />
            <div style={{ width: `${outOfStockPct}%` }} className="h-full bg-red-500 transition-all duration-300" title={`Out of Stock: ${outOfStockCount}`} />
          </div>
          <div className="flex flex-wrap items-center gap-6 text-xs font-semibold text-slate-500 dark:text-[#CBD5E1] pt-1">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-emerald-500" />
              <span>Healthy: {healthyCount} ({healthyPct.toFixed(0)}%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-amber-500" />
              <span>Low Stock: {lowStockCount} ({lowStockPct.toFixed(0)}%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-red-500" />
              <span>Out of Stock: {outOfStockCount} ({outOfStockPct.toFixed(0)}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Widgets & Alerts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Selling Products */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1E293B] rounded-2xl p-6 shadow-md shadow-slate-100/50 dark:shadow-none flex flex-col justify-between min-h-[300px]">
          <div>
            <h3 className="text-xl font-bold text-slate-850 dark:text-[#F8FAFC] tracking-tight">Top Selling Products</h3>
            <p className="text-slate-400 dark:text-[#94A3B8] font-semibold text-xs mt-0.5">Top performing products based on cumulative sales quantities</p>
          </div>
          <div className="space-y-4 mt-5 flex-1 justify-center flex flex-col">
            {topSellingList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                <Box className="opacity-30 mb-2" size={32} />
                <span className="text-xs font-semibold">No sales logged yet</span>
              </div>
            ) : (
              topSellingList.map((p, idx) => (
                <div key={p.id} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <ProductThumbnail productName={p.name} />
                      <span className="font-bold text-slate-800 dark:text-[#F8FAFC] truncate" title={p.name}>{p.name}</span>
                    </div>
                    <span className="font-bold text-slate-900 dark:text-[#F8FAFC]">{p.qty} sold</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-[#0F172A] h-2 rounded-full overflow-hidden">
                    <div style={{ width: `${(p.qty / maxSoldQty) * 100}%` }} className="h-full bg-indigo-650 rounded-full" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Highest Inventory Value */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1E293B] rounded-2xl p-6 shadow-md shadow-slate-100/50 dark:shadow-none flex flex-col justify-between min-h-[300px]">
          <div>
            <h3 className="text-xl font-bold text-slate-850 dark:text-[#F8FAFC] tracking-tight">Highest Valuations</h3>
            <p className="text-slate-400 dark:text-[#94A3B8] font-semibold text-xs mt-0.5">Top products holding the highest share of stock capital value</p>
          </div>
          <div className="space-y-4 mt-5 flex-1 justify-center flex flex-col">
            {highestValueList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                <Box className="opacity-30 mb-2" size={32} />
                <span className="text-xs font-semibold">No inventory assets available</span>
              </div>
            ) : (
              highestValueList.map((p) => (
                <div key={p.id} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <ProductThumbnail productName={p.name} />
                      <span className="font-bold text-slate-800 dark:text-[#F8FAFC] truncate" title={p.name}>{p.name}</span>
                    </div>
                    <span className="font-bold text-slate-900 dark:text-[#F8FAFC]">{fmt(p.value)}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-[#0F172A] h-2 rounded-full overflow-hidden">
                    <div style={{ width: `${(p.value / maxVal) * 100}%` }} className="h-full bg-emerald-600 rounded-full" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Low Stock Alerts Panel */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1E293B] rounded-2xl p-6 shadow-md shadow-slate-100/50 dark:shadow-none flex flex-col justify-between min-h-[300px]">
          <div>
            <h3 className="text-xl font-bold text-slate-850 dark:text-[#F8FAFC] tracking-tight">Low Stock Alerts</h3>
            <p className="text-slate-400 dark:text-[#94A3B8] font-semibold text-xs mt-0.5">Catalog items requiring immediate restocking attention</p>
          </div>
          <div className="space-y-3 mt-5 overflow-y-auto max-h-[190px] flex-1 scrollbar-thin">
            {products.filter(p => p.availableQty <= 10).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-455 dark:text-[#94A3B8] text-xs">
                <CheckCircle2 className="text-emerald-500 mb-1.5" size={24} />
                <span className="font-semibold">All stock levels healthy!</span>
              </div>
            ) : (
              products.filter(p => p.availableQty <= 10).slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-[#1E293B]/40 border border-slate-100 dark:border-[#1E293B] hover:border-amber-250 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full ${p.availableQty === 0 ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`} />
                    <span className="font-bold text-slate-800 dark:text-[#F8FAFC] text-xs truncate max-w-[120px]" title={p.name}>{p.name}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${p.availableQty === 0 ? 'bg-red-50 border-red-100 text-red-700 dark:bg-red-950/30 dark:border-red-900/50 dark:text-[#EF4444]' : 'bg-amber-50 border-amber-100 text-amber-700 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-[#F59E0B]'}`}>
                      {p.availableQty === 0 ? '0 Left' : `${p.availableQty} units`}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Navigation CTA */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-[#1E293B]/40 dark:to-[#0F172A]/60 border border-slate-200 dark:border-[#1E293B] rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-[#F8FAFC]">Need to add, edit, or manage products?</h3>
          <p className="text-sm text-slate-500 dark:text-[#94A3B8] font-medium mt-0.5">Go to Products Management for full product management — search, filter, edit, and delete.</p>
        </div>
        <Link 
          to="/products/details"
          className="flex items-center gap-2 bg-[#EF4444] hover:bg-red-600 text-white text-xs font-bold px-6 py-3 rounded-2xl transition-all shadow-md shadow-red-600/10 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap"
        >
          Open Products Management <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
