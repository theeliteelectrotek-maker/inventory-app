import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { 
  Plus, Pencil, Trash2, Search, X, Loader2, Package, 
  IndianRupee, TrendingUp, AlertTriangle, AlertOctagon, 
  CheckCircle2, Box, Sparkles, DollarSign 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const empty = { name: '', sku: '', description: '', qty: '', costPrice: '', offlinePrice: '', amazonPrice: '', flipkartPrice: '', meeshoPrice: '', category: 'General' };

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 !m-0">
      <div className="bg-white rounded-2xl shadow-2xl w-[95%] sm:w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"><X size={18} /></button>
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
    'from-pink-500 to-rose-500 text-rose-50 border-pink-100',
    'from-purple-500 to-indigo-500 text-indigo-50 border-purple-100',
    'from-blue-500 to-cyan-500 text-cyan-50 border-blue-100',
    'from-teal-500 to-emerald-500 text-emerald-50 border-teal-100',
    'from-amber-500 to-orange-500 text-orange-50 border-amber-100',
    'from-red-500 to-rose-500 text-rose-50 border-red-100'
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
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Filters State
  const [stockFilter, setStockFilter] = useState('all'); // 'all' | 'lowStock' | 'outOfStock' | 'highMargin' | 'bestSeller'
  const [platformFilter, setPlatformFilter] = useState('all'); // 'all' | 'amazon' | 'flipkart' | 'meesho' | 'offline'

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
  useEffect(load, []);

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
      category: p.category || 'General'
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
        category: form.category || 'General'
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
    if (qty === 0) return <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-red-50 text-red-600 border border-red-100">Out of Stock</span>;
    if (qty <= 10) return <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-600 border border-amber-100">Low Stock</span>;
    return <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-green-50 text-green-600 border border-green-100">In Stock</span>;
  }

  // --- Auto-generate Badges ---
  function getProductBadges(p) {
    const badges = [];
    const sold = productSalesCount[p.id] || 0;
    const cp = p.costPrice || 0;
    
    if (sold >= 15) {
      badges.push({ text: 'Best Seller', className: 'bg-indigo-50 border-indigo-200 text-indigo-700' });
    }
    
    if (cp > 0) {
      const sps = [p.amazonPrice, p.flipkartPrice, p.meeshoPrice, p.offlinePrice].filter(v => v > 0);
      const avgSp = sps.length > 0 ? sps.reduce((a, b) => a + b, 0) / sps.length : 0;
      const marginPct = ((avgSp - cp) / cp) * 100;
      if (marginPct >= 40) {
        badges.push({ text: 'High Margin', className: 'bg-emerald-50 border-emerald-200 text-emerald-700' });
      }
    }

    if (p.availableQty === 0) {
      badges.push({ text: 'Out of Stock', className: 'bg-red-50 border-red-200 text-red-700' });
    } else if (p.availableQty <= 10) {
      badges.push({ text: 'Low Stock', className: 'bg-amber-50 border-amber-200 text-amber-700' });
    } else if (sold <= 1) {
      badges.push({ text: 'Slow Moving', className: 'bg-slate-50 border-slate-200 text-slate-700' });
    }

    return badges;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">ERP Inventory & Products Catalog</h1>
          <p className="text-slate-500 text-sm mt-1">Manage physical inventory stocks, platform pricing lists, and audit profitability margins</p>
        </div>
        <button onClick={openAdd} className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold px-5 py-3 rounded-2xl transition-all shadow-md hover:shadow-lg self-start">
          <Plus size={16} /> Add Product
        </button>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Products */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Products</span>
            <p className="text-2xl font-black text-slate-800">{totalProducts}</p>
            <span className="text-[9px] font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full inline-block">
              Unique catalog catalog
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 text-slate-500 flex items-center justify-center">
            <Box size={18} />
          </div>
        </div>

        {/* Inventory Value */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Inventory Value</span>
            <p className="text-2xl font-black text-slate-800">{fmt(totalInventoryValue)}</p>
            <span className="text-[9px] font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full inline-block">
              Valued at cost price
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
            <IndianRupee size={18} />
          </div>
        </div>

        {/* Low Stock */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Low Stock</span>
            <p className="text-2xl font-black text-slate-800">{lowStockCount} items</p>
            <span className="text-[9px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full inline-block">
              Stock level &lt;= 10
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
            <AlertTriangle size={18} />
          </div>
        </div>

        {/* Out of Stock */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Out of Stock</span>
            <p className="text-2xl font-black text-slate-800">{outOfStockCount} items</p>
            <span className="text-[9px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full inline-block">
              Depleted inventory
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center">
            <AlertOctagon size={18} />
          </div>
        </div>

        {/* Average Margin */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Average Margin</span>
            <p className="text-2xl font-black text-slate-800">{avgMarginPct.toFixed(1)}%</p>
            <span className="text-[9px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full inline-block">
              Mean product profitability
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
            <TrendingUp size={18} />
          </div>
        </div>
      </div>

      {/* Product Health Section */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
        <div>
          <h3 className="font-extrabold text-slate-800 text-base">Catalog Inventory Health</h3>
          <p className="text-slate-400 text-xs mt-0.5">Distribution breakdown of stock safety states across all products</p>
        </div>
        <div className="space-y-3">
          <div className="flex w-full h-3 rounded-full overflow-hidden bg-slate-100">
            <div style={{ width: `${healthyPct}%` }} className="h-full bg-emerald-500 transition-all duration-300" title={`Healthy: ${healthyCount}`} />
            <div style={{ width: `${lowStockPct}%` }} className="h-full bg-amber-500 transition-all duration-300" title={`Low Stock: ${lowStockCount}`} />
            <div style={{ width: `${outOfStockPct}%` }} className="h-full bg-red-500 transition-all duration-300" title={`Out of Stock: ${outOfStockCount}`} />
          </div>
          <div className="flex flex-wrap items-center gap-6 text-xs font-semibold text-slate-500 pt-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Healthy: {healthyCount} ({healthyPct.toFixed(0)}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Low Stock: {lowStockCount} ({lowStockPct.toFixed(0)}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span>Out of Stock: {outOfStockCount} ({outOfStockPct.toFixed(0)}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Widgets Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-slate-800 text-base">Top Selling Products</h3>
            <p className="text-slate-400 text-xs mt-0.5">Top performing products based on cumulative sales quantities</p>
          </div>
          <div className="space-y-4 mt-5">
            {topSellingList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                <Box className="opacity-30 mb-2" size={32} />
                <span className="text-xs font-semibold">No sales logged yet</span>
              </div>
            ) : (
              topSellingList.map((p, idx) => (
                <div key={p.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <ProductThumbnail productName={p.name} />
                      <span className="font-bold text-slate-700 truncate">{p.name}</span>
                    </div>
                    <span className="font-black text-slate-500">{p.qty} sold</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div style={{ width: `${(p.qty / maxSoldQty) * 100}%` }} className="h-full bg-indigo-600 rounded-full" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Highest Inventory Value */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-slate-800 text-base">Highest Asset Valuations</h3>
            <p className="text-slate-400 text-xs mt-0.5">Top products holding the highest share of stock capital value</p>
          </div>
          <div className="space-y-4 mt-5">
            {highestValueList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                <Box className="opacity-30 mb-2" size={32} />
                <span className="text-xs font-semibold">No inventory assets available</span>
              </div>
            ) : (
              highestValueList.map((p) => (
                <div key={p.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <ProductThumbnail productName={p.name} />
                      <span className="font-bold text-slate-700 truncate">{p.name}</span>
                    </div>
                    <span className="font-black text-slate-800">{fmt(p.value)}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div style={{ width: `${(p.value / maxVal) * 100}%` }} className="h-full bg-emerald-600 rounded-full" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main Table List */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
        {/* Table Filters & Search */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:flex-none">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products, SKU..."
                className="w-full sm:w-[220px] pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            
            {/* Platform Wise filter */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-bold uppercase whitespace-nowrap">Platform:</span>
              <select 
                value={platformFilter} 
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
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
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto scrollbar-none max-w-full">
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
                  stockFilter === f.id ? 'bg-red-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 bg-transparent'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sticky Header Table Container */}
        <div className="max-h-[500px] overflow-y-auto border border-slate-100 rounded-2xl">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Package size={36} className="mb-2 opacity-30" />
              <p className="text-xs font-semibold">No products match the selected criteria</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 uppercase font-extrabold sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3">Product details</th>
                  <th className="px-4 py-3">Stock level</th>
                  <th className="px-4 py-3">Cost Price</th>
                  <th className="px-4 py-3">Platform Selling Prices</th>
                  <th className="px-4 py-3">Branded Margins</th>
                  <th className="px-4 py-3">Attributes</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filtered.map((p) => {
                  const cp = p.costPrice || 0;
                  const amazonMargin = (p.amazonPrice || 0) - cp;
                  const flipkartMargin = (p.flipkartPrice || 0) - cp;
                  const meeshoMargin = (p.meeshoPrice || 0) - cp;
                  const offlineMargin = (p.offlinePrice || p.unitPrice || 0) - cp;
                  
                  const badges = getProductBadges(p);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <ProductThumbnail productName={p.name} />
                          <div className="space-y-0.5 truncate max-w-[180px]">
                            <p className="font-bold text-slate-700 truncate">{p.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono tracking-wider">{p.sku || 'NO SKU'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">
                        <div className="space-y-1">
                          <p className="font-extrabold text-slate-800">{p.availableQty} units</p>
                          <div>{stockBadge(p.availableQty)}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-black text-slate-700 whitespace-nowrap">
                        {fmt(p.costPrice)}
                      </td>
                      <td className="px-4 py-3 text-[10px]">
                        <div className="space-y-1 font-semibold text-slate-500">
                          <p className="flex justify-between gap-3"><span>Amazon:</span> <span className="font-bold text-slate-700">{fmt(p.amazonPrice)}</span></p>
                          <p className="flex justify-between gap-3"><span>Flipkart:</span> <span className="font-bold text-slate-700">{fmt(p.flipkartPrice)}</span></p>
                          <p className="flex justify-between gap-3"><span>Meesho:</span> <span className="font-bold text-slate-700">{fmt(p.meeshoPrice)}</span></p>
                          <p className="flex justify-between gap-3"><span>Offline:</span> <span className="font-bold text-slate-700">{fmt(p.offlinePrice || p.unitPrice)}</span></p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[10px]">
                        <div className="space-y-1 font-semibold">
                          <p className="flex justify-between gap-3">
                            <span className="text-slate-400">Amazon:</span> 
                            <span className={`font-bold ${amazonMargin >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmt(amazonMargin)}</span>
                          </p>
                          <p className="flex justify-between gap-3">
                            <span className="text-slate-400">Flipkart:</span> 
                            <span className={`font-bold ${flipkartMargin >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmt(flipkartMargin)}</span>
                          </p>
                          <p className="flex justify-between gap-3">
                            <span className="text-slate-400">Meesho:</span> 
                            <span className={`font-bold ${meeshoMargin >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmt(meeshoMargin)}</span>
                          </p>
                          <p className="flex justify-between gap-3">
                            <span className="text-slate-400">Offline:</span> 
                            <span className={`font-bold ${offlineMargin >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmt(offlineMargin)}</span>
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                          {badges.map((b, bIdx) => (
                            <span key={bIdx} className={`px-2 py-0.5 rounded-lg text-[9px] font-black border ${b.className} whitespace-nowrap`}>
                              {b.text}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all"><Pencil size={13} /></button>
                          <button onClick={() => handleDelete(p.id)} disabled={user?.role === 'employee'} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"><Trash2 size={13} /></button>
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
        <Modal title={editing ? 'Edit Product Ledger' : 'Add Product Ledger'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-3.5 text-xs">
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-500 uppercase tracking-wide">Product Name *</label>
                <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="e.g. Premium Power Strip" />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-500 uppercase tracking-wide">SKU / Model Code</label>
                  <input value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="e.g. PPS-100" />
                </div>
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-500 uppercase tracking-wide">Category</label>
                  <input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="e.g. Electronics" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-500 uppercase tracking-wide">Quantity *</label>
                  <input required type="number" min="0" value={form.qty} onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="100" />
                </div>
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-500 uppercase tracking-wide">Cost Price (₹) *</label>
                  <input required type="number" min="0" value={form.costPrice} onChange={(e) => setForm((f) => ({ ...f, costPrice: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-500 uppercase tracking-wide">Offline Price (₹) *</label>
                  <input required type="number" min="0" value={form.offlinePrice} onChange={(e) => setForm((f) => ({ ...f, offlinePrice: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="0" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                    <span className="text-orange-500">Amazon</span> Price (₹)
                  </label>
                  <input type="number" min="0" value={form.amazonPrice} onChange={(e) => setForm((f) => ({ ...f, amazonPrice: e.target.value }))}
                    className="w-full px-2.5 py-2 border border-orange-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white" placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                    <span className="text-blue-500">Flipkart</span> Price (₹)
                  </label>
                  <input type="number" min="0" value={form.flipkartPrice} onChange={(e) => setForm((f) => ({ ...f, flipkartPrice: e.target.value }))}
                    className="w-full px-2.5 py-2 border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                    <span className="text-pink-500">Meesho</span> Price (₹)
                  </label>
                  <input type="number" min="0" value={form.meeshoPrice} onChange={(e) => setForm((f) => ({ ...f, meeshoPrice: e.target.value }))}
                    className="w-full px-2.5 py-2 border border-pink-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 bg-white" placeholder="0" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-slate-500 uppercase tracking-wide">Description</label>
                <textarea rows={2.5} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" placeholder="Optional notes…" />
              </div>
            </div>

            {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}
            
            <div className="flex gap-4 pt-3 border-t border-slate-100">
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2">
                {saving && <Loader2 size={16} className="animate-spin" />}
                {editing ? 'Update' : 'Add Product'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
