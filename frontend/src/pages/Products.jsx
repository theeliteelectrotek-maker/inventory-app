import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../api';
import { 
  Plus, Pencil, Trash2, Search, X, Loader2, Package, 
  IndianRupee, TrendingUp, AlertTriangle, AlertOctagon, 
  CheckCircle2, Box, Sparkles, DollarSign 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import KPICardValue from '../components/KPICardValue';

const empty = { name: '', sku: '', description: '', qty: '', costPrice: '', offlinePrice: '', amazonPrice: '', flipkartPrice: '', meeshoPrice: '', category: 'General', piecesPerBox: '', boxCostPrice: '', boxSellingPrice: '', pieceSellingPrice: '' };

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 !m-0">
      <div className="bg-white dark:bg-[#111827] border border-transparent dark:border-[#1E293B] rounded-2xl shadow-2xl w-[95%] sm:w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-[#1E293B]">
          <h3 className="font-semibold text-slate-850 dark:text-[#F8FAFC]">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#1E293B]"><X size={18} /></button>
        </div>
        <div className="px-6 py-5 overflow-auto max-h-[85vh]">{children}</div>
      </div>
    </div>
  );
}

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
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [onlineSales, setOnlineSales] = useState([]);
  const [offlineSales, setOfflineSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Filters State
  const [stockFilter, setStockFilter] = useState('all'); // 'all' | 'lowStock' | 'outOfStock' | 'highMargin' | 'bestSeller'
  const [platformFilter, setPlatformFilter] = useState('all'); // 'all' | 'amazon' | 'flipkart' | 'meesho' | 'offline'

  useEffect(() => {
    const p = Number(form.piecesPerBox);
    const bc = Number(form.boxCostPrice);
    if (p > 0 && bc > 0) {
      setForm(f => ({ ...f, costPrice: String(Math.round((bc / p) * 100) / 100) }));
    }
  }, [form.piecesPerBox, form.boxCostPrice]);

  function load() {
    setLoading(true);
    Promise.all([api.getProducts(), api.getOnlineSales(), api.getOfflineSales()])
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
    if (location.state?.openAddModal) {
      openAdd();
    }
  }, [location.state]);

  function openAdd() { setForm(empty); setEditing(null); setError(''); setShowModal(true); }
  function openEdit(p) {
    setForm({
      name: p.name,
      sku: p.sku || '',
      description: p.description || '',
      qty: p.totalQty,
      costPrice: p.costPrice ?? 0,
      offlinePrice: p.offlinePrice ?? p.unitPrice ?? 0,
      amazonPrice: p.amazonPrice ?? p.onlinePrice ?? 0,
      flipkartPrice: p.flipkartPrice ?? 0,
      meeshoPrice: p.meeshoPrice ?? 0,
      category: p.category || 'General',
      piecesPerBox: p.piecesPerBox ?? '',
      boxCostPrice: p.boxCostPrice ?? 0,
      boxSellingPrice: p.boxSellingPrice ?? 0,
      pieceSellingPrice: p.pieceSellingPrice ?? 0
    });
    setEditing(p);
    setError('');
    setShowModal(true);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this product?')) return;
    await api.deleteProduct(id);
    setProducts((ps) => ps.filter((p) => p.id !== id));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const payload = {
        name: form.name,
        sku: form.sku || '',
        description: form.description || '',
        totalQty: Number(form.qty),
        availableQty: Number(form.qty),
        costPrice: Number(form.costPrice) || 0,
        offlinePrice: Number(form.offlinePrice) || 0,
        amazonPrice: Number(form.amazonPrice) || 0,
        flipkartPrice: Number(form.flipkartPrice) || 0,
        meeshoPrice: Number(form.meeshoPrice) || 0,
        category: form.category || 'General',
        piecesPerBox: form.piecesPerBox ? Number(form.piecesPerBox) : null,
        boxCostPrice: Number(form.boxCostPrice) || 0,
        boxSellingPrice: Number(form.boxSellingPrice) || 0,
        pieceSellingPrice: Number(form.pieceSellingPrice) || 0
      };
      if (editing) {
        const diff = Number(form.qty) - editing.totalQty;
        payload.availableQty = Math.max(0, editing.availableQty + diff);
        const updated = await api.updateProduct(editing.id, payload);
        setProducts((ps) => ps.map((p) => (p.id === editing.id ? updated : p)));
      } else {
        const added = await api.addProduct(payload);
        setProducts((ps) => [added, ...ps]);
      }
      setShowModal(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

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
      const spAmazon = p.amazonPrice || 0;
      const spFlipkart = p.flipkartPrice || 0;
      const spMeesho = p.meeshoPrice || 0;
      const spOffline = p.offlinePrice || 0;
      
      const sps = [spAmazon, spFlipkart, spMeesho, spOffline].filter(v => v > 0);
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

  // --- Filtering & Sorting ---
  const filtered = products.filter((p) => {
    // 1. Search Query
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()));
    
    // 2. Stock Filters
    let matchStock = true;
    if (stockFilter === 'lowStock') {
      matchStock = p.availableQty > 0 && p.availableQty <= 10;
    } else if (stockFilter === 'outOfStock') {
      matchStock = p.availableQty === 0;
    } else if (stockFilter === 'highMargin') {
      const cp = p.costPrice || 0;
      if (cp <= 0) {
        matchStock = false;
      } else {
        const sps = [p.amazonPrice, p.flipkartPrice, p.meeshoPrice, p.offlinePrice].filter(v => v > 0);
        const avgSp = sps.length > 0 ? sps.reduce((a, b) => a + b, 0) / sps.length : 0;
        const marginPct = ((avgSp - cp) / cp) * 100;
        matchStock = marginPct >= 40;
      }
    } else if (stockFilter === 'bestSeller') {
      matchStock = (productSalesCount[p.id] || 0) >= 15;
    }

    // 3. Platform Presence filters
    let matchPlatform = true;
    if (platformFilter === 'amazon') {
      matchPlatform = (p.amazonPrice || 0) > 0;
    } else if (platformFilter === 'flipkart') {
      matchPlatform = (p.flipkartPrice || 0) > 0;
    } else if (platformFilter === 'meesho') {
      matchPlatform = (p.meeshoPrice || 0) > 0;
    } else if (platformFilter === 'offline') {
      matchPlatform = (p.offlinePrice || p.unitPrice || 0) > 0;
    }

    return matchSearch && matchStock && matchPlatform;
  });

  const fmt = (val) => `₹${Math.round(val || 0).toLocaleString('en-IN')}`;

  function stockBadge(qty) {
    if (qty === 0) return <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-red-50 text-red-650 border border-red-150 dark:bg-red-950/30 dark:border-red-900/50 dark:text-[#EF4444]">Out of Stock</span>;
    if (qty <= 10) return <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-650 border border-amber-150 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-[#F59E0B]">Low Stock</span>;
    return <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-green-50 text-green-650 border border-green-150 dark:bg-green-950/30 dark:border-green-900/50 dark:text-[#10B981]">In Stock</span>;
  }

  // --- Auto-generate Badges ---
  function getProductBadges(p) {
    const badges = [];
    const sold = productSalesCount[p.id] || 0;
    const cp = p.costPrice || 0;
    
    if (sold >= 15) {
      badges.push({ text: 'Best Seller', className: 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/30 dark:border-indigo-900/50 dark:text-indigo-400' });
    }
    
    if (cp > 0) {
      const sps = [p.amazonPrice, p.flipkartPrice, p.meeshoPrice, p.offlinePrice].filter(v => v > 0);
      const avgSp = sps.length > 0 ? sps.reduce((a, b) => a + b, 0) / sps.length : 0;
      const marginPct = ((avgSp - cp) / cp) * 100;
      if (marginPct >= 40) {
        badges.push({ text: 'High Margin', className: 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-[#10B981]' });
      }
    }

    if (p.availableQty === 0) {
      badges.push({ text: 'Out of Stock', className: 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/30 dark:border-red-900/50 dark:text-[#EF4444]' });
    } else if (p.availableQty <= 10) {
      badges.push({ text: 'Low Stock', className: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-[#F59E0B]' });
    } else if (sold <= 1) {
      badges.push({ text: 'Slow Moving', className: 'bg-slate-50 border-slate-205 text-slate-700 dark:bg-[#1E293B] dark:border-[#1E293B] dark:text-[#CBD5E1]' });
    }

    return badges;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-[#1E293B]">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-[#F8FAFC] tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-8 bg-red-650 dark:bg-[#EF4444] rounded-full"></span>
            Products Catalog
          </h1>
          <p className="text-slate-500 dark:text-[#94A3B8] font-medium text-sm mt-1">Manage physical inventory stocks, platform pricing lists, and audit profitability margins</p>
        </div>
        <button 
          onClick={openAdd} 
          className="flex items-center justify-center gap-2 bg-[#EF4444] hover:bg-red-600 text-white text-xs font-bold px-5 py-3 rounded-2xl transition-all shadow-md shadow-red-600/10 dark:shadow-none hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 self-start"
        >
          <Plus size={16} /> Add Product
        </button>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {/* Total Products */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1E293B] border-t-4 border-t-red-600 dark:border-t-red-650 rounded-2xl p-6 shadow-md shadow-slate-100/50 dark:shadow-none flex items-center justify-between hover:shadow-lg dark:hover:shadow-none transition-all duration-300 min-h-[140px]">
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider block">Total Products</span>
            <p className="text-3xl font-extrabold text-slate-900 dark:text-[#F8FAFC] tracking-tight leading-none">{totalProducts}</p>
            <span className="text-[11px] font-semibold text-slate-400 dark:text-[#94A3B8] block pt-1.5">
              Unique catalog count
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-[#1E293B] border border-slate-150 dark:border-[#1E293B] text-slate-500 dark:text-[#CBD5E1] flex items-center justify-center shrink-0">
            <Box size={22} />
          </div>
        </div>

        {/* Inventory Value */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1E293B] border-t-4 border-t-emerald-600 rounded-2xl p-6 shadow-md shadow-slate-100/50 dark:shadow-none flex items-center justify-between hover:shadow-lg dark:hover:shadow-none transition-all duration-300 min-h-[140px]">
          <div className="space-y-1.5 flex-1 min-w-0 pr-2">
            <span className="text-xs font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider block">Inventory Value</span>
            <KPICardValue value={totalInventoryValue} className="text-slate-900 dark:text-[#F8FAFC] leading-none" />
            <span className="text-[11px] font-semibold text-slate-400 dark:text-[#94A3B8] block pt-1.5">
              Valued at cost price
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-[#10B981] flex items-center justify-center shrink-0">
            <IndianRupee size={22} />
          </div>
        </div>

        {/* Low Stock */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1E293B] border-t-4 border-t-amber-500 rounded-2xl p-6 shadow-md shadow-slate-100/50 dark:shadow-none flex items-center justify-between hover:shadow-lg dark:hover:shadow-none transition-all duration-300 min-h-[140px]">
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider block">Low Stock</span>
            <p className="text-3xl font-extrabold text-amber-600 dark:text-[#F59E0B] tracking-tight leading-none">{lowStockCount} items</p>
            <span className="text-[11px] font-semibold text-amber-600 dark:text-[#F59E0B] bg-amber-50/50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full inline-block mt-1">
              Stock level &lt;= 10
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-[#F59E0B] flex items-center justify-center shrink-0">
            <AlertTriangle size={22} />
          </div>
        </div>

        {/* Out of Stock */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1E293B] border-t-4 border-t-red-500 dark:border-t-[#EF4444] rounded-2xl p-6 shadow-md shadow-slate-100/50 dark:shadow-none flex items-center justify-between hover:shadow-lg dark:hover:shadow-none transition-all duration-300 min-h-[140px]">
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider block">Out of Stock</span>
            <p className="text-3xl font-extrabold text-[#EF4444] tracking-tight leading-none">{outOfStockCount} items</p>
            <span className="text-[11px] font-semibold text-red-600 dark:text-[#EF4444] bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded-full inline-block mt-1">
              Depleted inventory
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 text-red-650 dark:bg-red-950/30 dark:border-red-900/50 dark:text-[#EF4444] flex items-center justify-center shrink-0">
            <AlertOctagon size={22} />
          </div>
        </div>

        {/* Average Margin */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1E293B] border-t-4 border-t-blue-500 dark:border-t-blue-650 rounded-2xl p-6 shadow-md shadow-slate-100/50 dark:shadow-none flex items-center justify-between hover:shadow-lg dark:hover:shadow-none transition-all duration-300 min-h-[140px]">
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider block">Average Margin</span>
            <p className="text-3xl font-extrabold text-slate-900 dark:text-[#F8FAFC] tracking-tight leading-none">{avgMarginPct.toFixed(1)}%</p>
            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded-full inline-block mt-1">
              Mean product margin
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 text-blue-650 dark:bg-blue-950/30 dark:border-blue-900/50 dark:text-blue-400 flex items-center justify-center shrink-0">
            <TrendingUp size={22} />
          </div>
        </div>
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
              <div className="flex flex-col items-center justify-center h-full text-slate-450 dark:text-[#94A3B8] text-xs">
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

      {/* Main Table List */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1E293B] rounded-3xl p-6 shadow-md shadow-slate-100/50 dark:shadow-none space-y-4">
        {/* Table Filters & Search - STICKY PANEL */}
        <div className="sticky top-0 z-20 bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md pb-4 pt-1 border-b border-slate-100 dark:border-[#1E293B] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:flex-none">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products catalog..."
                className="w-full sm:w-[240px] pl-9 pr-3 py-2.5 border border-slate-200 dark:border-[#1E293B] rounded-xl text-xs bg-slate-50/55 hover:bg-white dark:bg-[#0F172A] dark:text-[#F8FAFC] dark:hover:bg-[#111827] focus:outline-none focus:ring-2 focus:ring-red-550/20 focus:border-red-500 transition-all font-semibold text-slate-700"
              />
            </div>
            
            {/* Platform Wise filter */}
            <div className="flex items-center gap-2.5 text-xs">
              <span className="text-slate-400 dark:text-[#94A3B8] font-bold uppercase whitespace-nowrap">Platform:</span>
              <select 
                value={platformFilter} 
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 dark:border-[#1E293B] rounded-xl text-xs font-bold bg-slate-50/50 hover:bg-white dark:bg-[#0F172A] dark:text-[#CBD5E1] dark:hover:bg-[#111827] focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-550 transition-all text-slate-700"
              >
                <option value="all">All Channels</option>
                <option value="amazon">Amazon Presence</option>
                <option value="flipkart">Flipkart Presence</option>
                <option value="meesho">Meesho Presence</option>
                <option value="offline">Offline Presence</option>
              </select>
            </div>
          </div>

          {/* Advanced filter pills */}
          <div className="flex gap-1 bg-slate-150/70 dark:bg-[#1E293B] rounded-xl p-1 overflow-x-auto scrollbar-none max-w-full">
            {[
              { id: 'all', label: 'All Catalog' },
              { id: 'lowStock', label: 'Low Stock' },
              { id: 'outOfStock', label: 'Out of Stock' },
              { id: 'highMargin', label: 'High Margin (>=40%)' },
              { id: 'bestSeller', label: 'Best Sellers' }
            ].map((f) => (
              <button 
                key={f.id} 
                onClick={() => setStockFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize shrink-0 ${
                  stockFilter === f.id ? 'bg-red-600 text-white shadow-sm' : 'text-slate-550 hover:text-slate-800 dark:text-[#94A3B8] dark:hover:text-[#F8FAFC] bg-transparent'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sticky Header Table Container */}
        <div className="max-h-[520px] overflow-y-auto border border-slate-200 dark:border-[#1E293B] rounded-2xl scrollbar-thin">
          {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-[#94A3B8]">
              <Package size={42} className="mb-2 opacity-30" />
              <p className="text-sm font-semibold">No products match the selected criteria</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50/80 dark:bg-[#1E293B] border-b border-slate-200 dark:border-[#1E293B] text-slate-550 dark:text-[#94A3B8] uppercase font-bold text-xs sticky top-0 z-10 backdrop-blur-md">
                <tr>
                  <th className="px-4 py-3">Product Details</th>
                  <th className="px-4 py-3">Stock Level</th>
                  <th className="px-4 py-3 text-center">Pieces/Box</th>
                  <th className="px-4 py-3 text-right">Box Cost</th>
                  <th className="px-4 py-3 text-right">Piece Cost</th>
                  <th className="px-4 py-3 text-right">Box Selling Price</th>
                  <th className="px-4 py-3 text-right">Piece Selling Price</th>
                  <th className="px-4 py-3">Platform Prices</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#1E293B] bg-white dark:bg-[#111827] font-semibold text-slate-705 dark:text-[#CBD5E1]">
                {filtered.map((p) => {
                  return (
                    <tr key={p.id} className="hover:bg-slate-550/50 dark:hover:bg-[#172554] transition-colors text-xs">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <ProductThumbnail productName={p.name} />
                          <div className="space-y-0.5 truncate max-w-[150px]">
                            <p className="font-bold text-slate-800 dark:text-[#F8FAFC] truncate" title={p.name}>{p.name}</p>
                            <p className="text-[10px] text-slate-400 dark:text-[#94A3B8] font-mono tracking-wider">{p.sku || 'NO SKU'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="space-y-1">
                          <p className="font-extrabold text-slate-900 dark:text-[#F8FAFC]">{p.availableQty} units</p>
                          <div>{stockBadge(p.availableQty)}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-slate-900 dark:text-[#CBD5E1]">
                        {p.piecesPerBox || '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-[#F8FAFC]">
                        {p.boxCostPrice ? fmt(p.boxCostPrice) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-extrabold text-slate-900 dark:text-[#F8FAFC]">
                        {fmt(p.costPrice)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-[#F8FAFC]">
                        {p.boxSellingPrice ? fmt(p.boxSellingPrice) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-[#F8FAFC]">
                        {p.pieceSellingPrice ? fmt(p.pieceSellingPrice) : '—'}
                      </td>
                      <td className="px-4 py-3 text-[10px] text-slate-500 dark:text-[#94A3B8]">
                        <div className="space-y-0.5">
                          <div className="flex justify-between gap-1"><span>AMZ:</span> <span className="font-bold">{fmt(p.amazonPrice)}</span></div>
                          <div className="flex justify-between gap-1"><span>FLK:</span> <span className="font-bold">{fmt(p.flipkartPrice)}</span></div>
                          <div className="flex justify-between gap-1"><span>MSH:</span> <span className="font-bold">{fmt(p.meeshoPrice)}</span></div>
                          <div className="flex justify-between gap-1"><span>OFF:</span> <span className="font-bold">{fmt(p.offlinePrice || p.unitPrice)}</span></div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(p)} title="Edit General Info" className="p-1.5 rounded-lg text-slate-400 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#1E293B] hover:text-slate-700 dark:hover:text-[#F8FAFC] transition-all"><Pencil size={12} /></button>
                          <button onClick={() => handleDelete(p.id)} disabled={user?.role === 'EMPLOYEE'} className="p-1.5 rounded-lg text-slate-400 dark:text-[#CBD5E1] hover:bg-red-55 dark:hover:bg-red-950/30 hover:text-red-550 dark:hover:text-[#EF4444] transition-all disabled:opacity-40 disabled:cursor-not-allowed"><Trash2 size={12} /></button>
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

      {/* Form Dialog Modal */}
      {showModal && (
        <Modal title={editing ? 'Edit Product Ledger' : 'Add Product Catalog Record'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-4 text-xs font-semibold text-slate-600">
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide">Product Name *</label>
                <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-[#1E293B] rounded-xl text-sm bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold" placeholder="e.g. Premium Power Strip" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide">SKU / Model Code</label>
                  <input value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-[#1E293B] rounded-xl text-sm bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold" placeholder="e.g. PPS-100" />
                </div>
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide">Category</label>
                  <input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-[#1E293B] rounded-xl text-sm bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold" placeholder="e.g. Electronics" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide">Quantity (Pieces) *</label>
                  <input required type="number" min="0" value={form.qty} onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-[#1E293B] rounded-xl text-sm bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold text-center" placeholder="100" />
                </div>
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide font-sans">Cost Price / Piece (₹) *</label>
                  <input required type="number" step="any" min="0" value={form.costPrice} onChange={(e) => setForm((f) => ({ ...f, costPrice: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-[#1E293B] rounded-xl text-sm bg-white dark:bg-[#0F172A] text-slate-808 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold text-center" placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide font-sans">Offline Price / Piece (₹) *</label>
                  <input required type="number" min="0" value={form.offlinePrice} onChange={(e) => setForm((f) => ({ ...f, offlinePrice: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-[#1E293B] rounded-xl text-sm bg-white dark:bg-[#0F172A] text-slate-808 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-red-550 font-semibold text-center" placeholder="0" />
                </div>
              </div>

              {/* Packaging System section */}
              <div className="p-4 bg-slate-50 dark:bg-[#0F172A]/40 border border-slate-200 dark:border-[#1E293B] rounded-2xl space-y-4">
                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider block">Box & Piece Selling System</span>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide">Pieces Per Box</label>
                    <input type="number" min="1" value={form.piecesPerBox} onChange={(e) => setForm((f) => ({ ...f, piecesPerBox: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-[#1E293B] rounded-xl text-sm bg-white dark:bg-[#111827] text-slate-800 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-indigo-550 font-semibold text-center" placeholder="e.g. 10" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide">Box Cost Price (₹)</label>
                    <input type="number" min="0" value={form.boxCostPrice} onChange={(e) => setForm((f) => ({ ...f, boxCostPrice: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-[#1E293B] rounded-xl text-sm bg-white dark:bg-[#111827] text-slate-800 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-indigo-550 font-semibold text-center" placeholder="e.g. 200" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide">Box Selling Price (₹)</label>
                    <input type="number" min="0" value={form.boxSellingPrice} onChange={(e) => setForm((f) => ({ ...f, boxSellingPrice: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-[#1E293B] rounded-xl text-sm bg-white dark:bg-[#111827] text-slate-800 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-indigo-550 font-semibold text-center" placeholder="e.g. 300" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide">Piece Selling Price (₹)</label>
                    <input type="number" min="0" value={form.pieceSellingPrice} onChange={(e) => setForm((f) => ({ ...f, pieceSellingPrice: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-[#1E293B] rounded-xl text-sm bg-white dark:bg-[#111827] text-slate-800 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-indigo-550 font-semibold text-center" placeholder="e.g. 35" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider truncate">
                    <span className="text-orange-500">Amazon</span> Price (₹)
                  </label>
                  <input type="number" min="0" value={form.amazonPrice} onChange={(e) => setForm((f) => ({ ...f, amazonPrice: e.target.value }))}
                    className="w-full px-2.5 py-2 border border-orange-200 dark:border-orange-900/50 rounded-xl text-sm bg-white dark:bg-[#0F172A] text-slate-805 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-orange-400 font-semibold text-center" placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider truncate">
                    <span className="text-blue-500">Flipkart</span> Price (₹)
                  </label>
                  <input type="number" min="0" value={form.flipkartPrice} onChange={(e) => setForm((f) => ({ ...f, flipkartPrice: e.target.value }))}
                    className="w-full px-2.5 py-2 border border-blue-200 dark:border-blue-900/50 rounded-xl text-sm bg-white dark:bg-[#0F172A] text-slate-805 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-blue-400 font-semibold text-center" placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider truncate">
                    <span className="text-pink-500">Meesho</span> Price (₹)
                  </label>
                  <input type="number" min="0" value={form.meeshoPrice} onChange={(e) => setForm((f) => ({ ...f, meeshoPrice: e.target.value }))}
                    className="w-full px-2.5 py-2 border border-pink-200 dark:border-pink-900/50 rounded-xl text-sm bg-white dark:bg-[#0F172A] text-slate-805 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-pink-400 font-semibold text-center" placeholder="0" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide">Description</label>
                <textarea rows={2.5} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-[#1E293B] rounded-xl text-sm bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-red-500 resize-none font-semibold" placeholder="Optional notes…" />
              </div>
            </div>

            {error && <p className="text-xs font-bold text-red-600 bg-red-50 dark:bg-red-950/20 px-3 py-2 rounded-xl border border-red-150 dark:border-red-900/50">{error}</p>}
            
            <div className="flex gap-4 pt-4 border-t border-slate-100 dark:border-[#1E293B]">
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3.5 border border-slate-200 dark:border-[#1E293B] rounded-2xl text-xs font-bold text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#1E293B] transition-colors">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 py-3.5 bg-[#EF4444] hover:bg-red-600 disabled:opacity-60 text-white text-xs font-bold rounded-2xl transition-all shadow-md shadow-red-600/10 dark:shadow-none flex items-center justify-center gap-2">
                {saving && <Loader2 size={15} className="animate-spin" />}
                {editing ? 'Update' : 'Add Product'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
