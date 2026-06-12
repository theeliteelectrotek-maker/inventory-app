import React, { useEffect, useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../api';
import { 
  Plus, Pencil, Trash2, Search, X, Loader2, Package, 
  IndianRupee, TrendingUp, AlertTriangle, AlertOctagon, 
  CheckCircle2, Box, Sparkles, DollarSign, History, RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const empty = { 
  name: '', 
  sku: '', 
  description: '', 
  qty: '', 
  costPrice: '', 
  offlinePrice: '', 
  amazonPrice: '', 
  flipkartPrice: '', 
  meeshoPrice: '', 
  category: 'General', 
  piecesPerBox: '', 
  boxCostPrice: '', 
  boxSellingPrice: '', 
  pieceSellingPrice: '' 
};

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

export default function ProductDetails() {
  const { user } = useAuth();
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [onlineSales, setOnlineSales] = useState([]);
  const [offlineSales, setOfflineSales] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Tabs layout inside drawer
  const [activeTab, setActiveTab] = useState('general');

  // Table Inline Edit State
  const [inlineEdit, setInlineEdit] = useState(null);
  const [inlineValue, setInlineValue] = useState('');

  // Filters State
  const [stockFilter, setStockFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');

  // Auto-calculate single piece cost price if piecesPerBox and boxCostPrice are provided
  useEffect(() => {
    const p = Number(form.piecesPerBox);
    const bc = Number(form.boxCostPrice);
    if (p > 0 && bc > 0) {
      setForm(f => ({ ...f, costPrice: String(Math.round((bc / p) * 100) / 100) }));
    }
  }, [form.piecesPerBox, form.boxCostPrice]);

  function load() {
    setLoading(true);
    const promises = [
      api.getProducts(),
      api.getOnlineSales(),
      api.getOfflineSales()
    ];
    
    promises.push(
      api.getAuditLogs().catch(err => {
        console.warn('Could not load audit logs:', err.message);
        return [];
      })
    );

    Promise.all(promises)
      .then(([p, online, offline, logs]) => {
        setProducts(p);
        setOnlineSales(online);
        setOfflineSales(offline);
        setAuditLogs(logs || []);
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

  function openAdd() { 
    setForm(empty); 
    setEditing(null); 
    setError(''); 
    setActiveTab('general');
    setShowModal(true); 
  }

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
    setActiveTab('general');
    setShowModal(true);
  }

  async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) return;
    
    const product = products.find(p => p.id === id);
    console.log('[DELETE] Initiating delete for product:', { id, name: product?.name });
    
    try {
      const result = await api.deleteProduct(id);
      console.log('[DELETE] API response:', result);
      
      setProducts((ps) => ps.filter((p) => p.id !== id));
      
      // Close drawer if this product was being edited
      if (editing?.id === id) {
        setShowModal(false);
        setEditing(null);
      }
      
      alert(`✅ Product "${product?.name || id}" deleted successfully.`);
    } catch (err) {
      console.error('[DELETE] Error deleting product:', err);
      
      const msg = err.message || '';
      if (msg.includes('403') || msg.toLowerCase().includes('denied') || msg.toLowerCase().includes('admin')) {
        alert(`❌ Permission Denied: Only administrators can delete products.`);
      } else if (msg.toLowerCase().includes('linked') || msg.toLowerCase().includes('foreign') || msg.toLowerCase().includes('constraint') || msg.toLowerCase().includes('sales')) {
        alert(`⚠️ Cannot delete "${product?.name}": This product is linked to existing sales or purchase records. Remove linked records first.`);
      } else if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
        alert(`⚠️ Product not found — it may have already been deleted.`);
        setProducts((ps) => ps.filter((p) => p.id !== id));
      } else {
        alert(`❌ Failed to delete product: ${msg}`);
      }
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true); 
    setError('');
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
      
      if (user?.role === 'admin') {
        const logs = await api.getAuditLogs();
        setAuditLogs(logs);
      }

      setShowModal(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // --- Smart Quick Table Edit Handlers ---
  const handleCellClick = (p, field, currentVal) => {
    setInlineEdit({ id: p.id, field });
    setInlineValue(String(currentVal));
  };

  const handleInlineSave = async (p, field) => {
    if (inlineValue === '' || isNaN(Number(inlineValue))) {
      setInlineEdit(null);
      return;
    }
    const val = Number(inlineValue);
    
    let originalVal = 0;
    if (field === 'qty') originalVal = p.totalQty;
    else if (field === 'offlinePrice') originalVal = p.offlinePrice;
    else if (field === 'costPrice') originalVal = p.costPrice;

    if (val === originalVal) {
      setInlineEdit(null);
      return;
    }

    try {
      const payload = {
        name: p.name,
        sku: p.sku || '',
        category: p.category || 'General',
        totalQty: p.totalQty,
        availableQty: p.availableQty,
        costPrice: p.costPrice,
        offlinePrice: p.offlinePrice,
        amazonPrice: p.amazonPrice || 0,
        flipkartPrice: p.flipkartPrice || 0,
        meeshoPrice: p.meeshoPrice || 0,
        piecesPerBox: p.piecesPerBox,
        boxCostPrice: p.boxCostPrice || 0,
        boxSellingPrice: p.boxSellingPrice || 0,
        pieceSellingPrice: p.pieceSellingPrice || 0
      };

      if (field === 'qty') {
        const diff = val - p.totalQty;
        payload.totalQty = val;
        payload.availableQty = Math.max(0, p.availableQty + diff);
      } else if (field === 'offlinePrice') {
        payload.offlinePrice = val;
      } else if (field === 'costPrice') {
        payload.costPrice = val;
      }

      const updated = await api.updateProduct(p.id, payload);
      setProducts((ps) => ps.map((prod) => (prod.id === p.id ? updated : prod)));

      if (user?.role === 'admin') {
        const logs = await api.getAuditLogs();
        setAuditLogs(logs);
      }
    } catch (err) {
      console.error('Error saving inline update:', err);
    } finally {
      setInlineEdit(null);
    }
  };

  const handleKeyDown = (e, p, field) => {
    if (e.key === 'Enter') {
      handleInlineSave(p, field);
    } else if (e.key === 'Escape') {
      setInlineEdit(null);
    }
  };

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

  // --- Filtering & Sorting ---
  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()));
    
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

  const sortedAndFiltered = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const nameA = (a.name || '').trim();
      const nameB = (b.name || '').trim();
      const aStartsWithDigit = /^[0-9]/.test(nameA);
      const bStartsWithDigit = /^[0-9]/.test(nameB);
      // Alphabetical names first, numeric-starting names after
      if (aStartsWithDigit !== bStartsWithDigit) {
        return aStartsWithDigit ? 1 : -1;
      }
      // Within each group, natural alphanumeric sort
      return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [filtered]);

  const fmt = (val) => `₹${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  function getStockBadge(qty) {
    if (qty === 0) {
      return (
        <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-red-50 text-red-650 border border-red-150 dark:bg-red-950/30 dark:border-red-900/50 dark:text-[#EF4444] block text-center">
          Out of Stock
        </span>
      );
    }
    if (qty <= 10) {
      return (
        <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-650 border border-amber-150 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-[#F59E0B] block text-center">
          Low Stock ({qty})
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-green-50 text-green-650 border border-green-150 dark:bg-green-950/30 dark:border-green-900/50 dark:text-[#10B981] block text-center">
        Healthy ({qty})
      </span>
    );
  }

  // --- Compact Platform Badges Render ---
  const renderPlatformBadges = (p) => {
    const badges = [];
    if (p.amazonPrice > 0) badges.push({ code: 'AMZ', price: p.amazonPrice, color: 'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/30' });
    if (p.flipkartPrice > 0) badges.push({ code: 'FLK', price: p.flipkartPrice, color: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30' });
    if (p.meeshoPrice > 0) badges.push({ code: 'MSH', price: p.meeshoPrice, color: 'bg-pink-50 text-pink-700 border-pink-100 dark:bg-pink-950/20 dark:text-pink-400 dark:border-pink-900/30' });
    if (p.offlinePrice > 0) badges.push({ code: 'OFF', price: p.offlinePrice, color: 'bg-slate-50 text-slate-700 border-slate-150 dark:bg-[#1E293B] dark:text-[#CBD5E1] dark:border-[#334155]' });

    if (badges.length === 0) return <span className="text-slate-400 dark:text-[#64748B]">None</span>;

    const maxBadges = 2;
    const visible = badges.slice(0, maxBadges);
    const overflow = badges.length - maxBadges;

    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {visible.map((b, i) => (
          <span key={i} className={`px-2 py-0.5 text-[10px] font-bold rounded-lg border ${b.color} whitespace-nowrap`}>
            {b.code} ₹{b.price}
          </span>
        ))}
        {overflow > 0 && (
          <span className="text-[10px] font-extrabold text-slate-400 pl-0.5">
            +{overflow} more
          </span>
        )}
      </div>
    );
  };

  // --- Tab 2 profit margin calculations helper ---
  const getProfitAndMargin = (sellingPrice) => {
    const cp = Number(form.costPrice) || 0;
    const sp = Number(sellingPrice) || 0;
    const profit = sp - cp;
    const margin = cp > 0 ? (profit / cp) * 100 : 0;
    return { profit, margin };
  };

  // --- Filtering Audit Logs for Target Product ---
  const productAuditLogs = useMemo(() => {
    if (!editing) return [];
    return auditLogs.filter(log => 
      log.action.includes(editing.id) || 
      (editing.name && log.action.toLowerCase().includes(editing.name.toLowerCase()))
    );
  }, [editing, auditLogs]);

  const lastEditEvent = productAuditLogs[0];
  const lastEditedBy = lastEditEvent ? lastEditEvent.user : 'System';
  const lastUpdatedTime = lastEditEvent 
    ? new Date(lastEditEvent.time).toLocaleString('en-IN') 
    : (editing ? new Date(editing.updatedAt).toLocaleString('en-IN') : 'N/A');

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Drawer slide-in/sticky css styling injector */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .drawer-slide-in {
          animation: slideIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .frozen-col {
          position: sticky;
          left: 0;
          z-index: 5;
        }
      `}} />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-[#1E293B]">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-[#F8FAFC] tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-8 bg-red-650 dark:bg-[#EF4444] rounded-full"></span>
            Products Management
          </h1>
          <p className="text-slate-500 dark:text-[#94A3B8] font-medium text-sm mt-1">Manage products — search, filter, edit prices, update stock, and configure catalog items</p>
        </div>
        <div className="flex items-center gap-3 self-start">
          {/* Product Count */}
          <div className="bg-slate-100 dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] rounded-2xl px-4 py-2.5 flex items-center gap-2">
            <Package className="text-red-650 dark:text-[#EF4444]" size={18} />
            <span className="text-lg font-black text-slate-800 dark:text-[#F8FAFC]">{products.length}</span>
            <span className="text-[10px] font-extrabold text-slate-400 dark:text-[#94A3B8] uppercase">Products</span>
          </div>
          <button 
            onClick={openAdd} 
            className="flex items-center justify-center gap-2 bg-[#EF4444] hover:bg-red-600 text-white text-xs font-bold px-5 py-3 rounded-2xl transition-all shadow-md shadow-red-600/10 dark:shadow-none hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus size={16} /> Add Product
          </button>
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
                placeholder="Search products..."
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

          {/* Sort indicator label */}
          <span className="text-[10px] font-bold text-slate-400 dark:text-[#64748B] uppercase tracking-wider whitespace-nowrap flex items-center gap-1 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            Sorted: A→Z, then 0→9
          </span>
        </div>

        {/* Horizontal & Vertical Scrollable Table Container */}
        <div className="max-h-[600px] overflow-y-auto overflow-x-auto border border-slate-200 dark:border-[#1E293B] rounded-2xl scrollbar-thin relative">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 className="animate-spin text-red-600 mb-2" size={36} />
              <span className="text-sm font-semibold">Loading products...</span>
            </div>
          ) : sortedAndFiltered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-[#94A3B8]">
              <Package size={42} className="mb-2 opacity-30" />
              <p className="text-sm font-semibold">No products match the selected criteria</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm border-collapse min-w-[1000px]">
              <thead className="bg-slate-50/80 dark:bg-[#1E293B] border-b border-slate-200 dark:border-[#1E293B] text-slate-550 dark:text-[#94A3B8] uppercase font-bold text-xs sticky top-0 z-20 backdrop-blur-md">
                <tr>
                  {/* Frozen Header Column */}
                  <th className="px-4 py-3 sticky left-0 bg-slate-50 dark:bg-[#1E293B] z-30 border-r border-slate-200 dark:border-[#1E293B] pl-4"># &nbsp; Product Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-center" style={{ width: '130px' }}>Stock</th>
                  <th className="px-4 py-3 text-right" style={{ width: '120px' }}>Cost</th>
                  <th className="px-4 py-3 text-right" style={{ width: '130px' }}>Offline Price</th>
                  <th className="px-4 py-3">Platforms</th>
                  <th className="px-4 py-3 text-right">Profit %</th>
                  <th className="px-4 py-3 text-right sticky right-0 bg-slate-50 dark:bg-[#1E293B] z-20 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] border-l border-slate-200 dark:border-[#1E293B]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#1E293B] bg-white dark:bg-[#111827] font-semibold text-slate-705 dark:text-[#CBD5E1]">
                {sortedAndFiltered.map((p, idx) => {
                  // Average profit margin computation
                  const sps = [p.amazonPrice, p.flipkartPrice, p.meeshoPrice, p.offlinePrice].filter(v => v > 0);
                  const avgSp = sps.length > 0 ? sps.reduce((a, b) => a + b, 0) / sps.length : 0;
                  const profitMargin = p.costPrice > 0 ? ((avgSp - p.costPrice) / p.costPrice) * 100 : 0;

                  return (
                    <tr 
                      key={p.id} 
                      onClick={(e) => {
                        const cursorTarget = e.target.closest('.cursor-pointer');
                        if (e.target.closest('input') || e.target.closest('button') || (cursorTarget && cursorTarget !== e.currentTarget)) {
                          return;
                        }
                        openEdit(p);
                      }}
                      className="group hover:bg-slate-50/70 dark:hover:bg-[#1E293B]/25 cursor-pointer transition-colors text-xs"
                    >
                      {/* Product Name Column (Frozen) */}
                      <td className="sticky left-0 bg-white dark:bg-[#111827] px-4 py-3 z-10 border-r border-slate-100 dark:border-[#1E293B] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 dark:text-slate-500 font-mono text-[10px] w-6 shrink-0 text-center">#{idx + 1}</span>
                          <ProductThumbnail productName={p.name} />
                          <div className="space-y-0.5 truncate max-w-[150px]">
                            <p className="font-bold text-slate-800 dark:text-[#F8FAFC] truncate" title={p.name}>{p.name}</p>
                            <p className="text-[10px] text-slate-400 dark:text-[#94A3B8] font-mono tracking-wider">{p.sku || 'NO SKU'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3 text-slate-500 dark:text-[#94A3B8]">
                        {p.category || 'General'}
                      </td>

                      {/* Stock Column (Inline Editable) */}
                      <td className="px-4 py-3 text-center">
                        {inlineEdit?.id === p.id && inlineEdit?.field === 'qty' ? (
                          <input
                            type="number"
                            value={inlineValue}
                            onChange={(e) => setInlineValue(e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, p, 'qty')}
                            onBlur={() => handleInlineSave(p, 'qty')}
                            autoFocus
                            className="w-16 px-1.5 py-0.5 border border-slate-350 dark:border-[#334155] rounded text-xs text-center bg-white dark:bg-[#111827] text-slate-800 dark:text-[#F8FAFC] font-extrabold focus:outline-none"
                          />
                        ) : (
                          <div 
                            onClick={() => handleCellClick(p, 'qty', p.totalQty)}
                            className="cursor-pointer hover:bg-slate-100 dark:hover:bg-[#1E293B]/60 p-1 rounded transition-colors inline-block w-full"
                          >
                            {getStockBadge(p.availableQty)}
                          </div>
                        )}
                      </td>

                      {/* Cost Price Column (Inline Editable) */}
                      <td className="px-4 py-3 text-right">
                        {inlineEdit?.id === p.id && inlineEdit?.field === 'costPrice' ? (
                          <input
                            type="number"
                            step="0.01"
                            value={inlineValue}
                            onChange={(e) => setInlineValue(e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, p, 'costPrice')}
                            onBlur={() => handleInlineSave(p, 'costPrice')}
                            autoFocus
                            className="w-20 px-1.5 py-0.5 border border-slate-350 dark:border-[#334155] rounded text-xs text-right bg-white dark:bg-[#111827] text-slate-800 dark:text-[#F8FAFC] font-extrabold focus:outline-none"
                          />
                        ) : (
                          <div 
                            onClick={() => handleCellClick(p, 'costPrice', p.costPrice)}
                            className="cursor-pointer hover:bg-slate-100 dark:hover:bg-[#1E293B]/60 p-1 rounded transition-colors text-right font-extrabold text-slate-900 dark:text-[#F8FAFC]"
                          >
                            {fmt(p.costPrice)}
                          </div>
                        )}
                      </td>

                      {/* Offline Price Column (Inline Editable) */}
                      <td className="px-4 py-3 text-right">
                        {inlineEdit?.id === p.id && inlineEdit?.field === 'offlinePrice' ? (
                          <input
                            type="number"
                            step="0.01"
                            value={inlineValue}
                            onChange={(e) => setInlineValue(e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, p, 'offlinePrice')}
                            onBlur={() => handleInlineSave(p, 'offlinePrice')}
                            autoFocus
                            className="w-20 px-1.5 py-0.5 border border-slate-350 dark:border-[#334155] rounded text-xs text-right bg-white dark:bg-[#111827] text-slate-800 dark:text-[#F8FAFC] font-extrabold focus:outline-none"
                          />
                        ) : (
                          <div 
                            onClick={() => handleCellClick(p, 'offlinePrice', p.offlinePrice)}
                            className="cursor-pointer hover:bg-slate-100 dark:hover:bg-[#1E293B]/60 p-1 rounded transition-colors text-right font-extrabold text-slate-900 dark:text-[#F8FAFC]"
                          >
                            {fmt(p.offlinePrice)}
                          </div>
                        )}
                      </td>

                      {/* Platforms Badges Column */}
                      <td className="px-4 py-3">
                        {renderPlatformBadges(p)}
                      </td>

                      {/* Profit % Column */}
                      <td className={`px-4 py-3 text-right font-extrabold ${profitMargin >= 40 ? 'text-emerald-500' : profitMargin > 0 ? 'text-blue-500' : 'text-slate-400'}`}>
                        {profitMargin > 0 ? `+${profitMargin.toFixed(0)}%` : `${profitMargin.toFixed(0)}%`}
                      </td>

                      {/* Hover Actions & Action Column (Frozen Right) */}
                      <td className="px-4 py-3 text-right sticky right-0 bg-white dark:bg-[#111827] z-10 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] border-l border-slate-100 dark:border-[#1E293B]">
                        <div className="flex items-center justify-end gap-1.5 h-6">
                          {/* Row Hover Smart Actions */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center gap-1.5 text-[9px] uppercase tracking-wider font-black text-slate-400 dark:text-[#94A3B8] mr-2">
                            <button onClick={() => openEdit(p)} className="hover:text-red-500">Edit</button>
                            <span>·</span>
                            <button onClick={() => handleCellClick(p, 'qty', p.totalQty)} className="hover:text-emerald-500">Stock</button>
                            <span>·</span>
                            <button onClick={() => handleCellClick(p, 'offlinePrice', p.offlinePrice)} className="hover:text-blue-500">Price</button>
                            <span>·</span>
                            <button onClick={() => { openEdit(p); setActiveTab('pricing'); }} className="hover:text-amber-500">History</button>
                          </div>

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

      {/* Right-Side Slide Drawer instead of popup Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
          {/* Backdrop Click to Close */}
          <div className="absolute inset-0" onClick={() => setShowModal(false)} />
          
          {/* Drawer Content Container */}
          <div className="relative w-full max-w-2xl bg-white dark:bg-[#111827] h-full shadow-2xl flex flex-col z-10 drawer-slide-in">
            {/* Drawer Header & Summary metrics */}
            <div className="p-6 border-b border-slate-150 dark:border-[#1E293B] bg-slate-50/50 dark:bg-[#0F172A]/30">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-red-650 dark:text-[#EF4444] uppercase tracking-widest">{form.category || 'General'}</span>
                  <h2 className="text-xl font-black text-slate-850 dark:text-[#F8FAFC] tracking-tight leading-tight mt-1 truncate max-w-[500px]" title={form.name || 'New Product'}>
                    {form.name || 'Create New Product'}
                  </h2>
                  <p className="text-xs text-slate-400 dark:text-[#94A3B8] mt-1 font-mono">{form.sku || 'NO SKU'}</p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:bg-slate-150 dark:hover:bg-[#1E293B] rounded-xl transition-all">
                  <X size={18} />
                </button>
              </div>
              
              {/* Product Valuation / Summary Cards */}
              {editing && (
                <div className="grid grid-cols-3 gap-4 mt-6 animate-fadeIn">
                  <div className="bg-white dark:bg-[#111827] border border-slate-150 dark:border-[#1E293B] rounded-2xl p-4 flex flex-col justify-between shadow-sm">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Current Stock</span>
                    <span className={`text-lg font-black mt-1 inline-block ${Number(form.qty) === 0 ? 'text-red-500' : Number(form.qty) <= 10 ? 'text-amber-500' : 'text-emerald-500'}`}>
                      {form.qty || 0} units
                    </span>
                  </div>
                  <div className="bg-white dark:bg-[#111827] border border-slate-150 dark:border-[#1E293B] rounded-2xl p-4 flex flex-col justify-between shadow-sm">
                    <span className="text-[9px] font-bold text-emerald-600 dark:text-[#10B981] uppercase tracking-wider block">Offline Price</span>
                    <span className="text-lg font-black text-emerald-650 dark:text-[#10B981] mt-1">{fmt(form.offlinePrice)}</span>
                  </div>
                  <div className="bg-white dark:bg-[#111827] border border-slate-150 dark:border-[#1E293B] rounded-2xl p-4 flex flex-col justify-between shadow-sm">
                    <span className="text-[9px] font-bold text-emerald-600 dark:text-[#10B981] uppercase tracking-wider block">Inventory Value</span>
                    <span className="text-lg font-black text-emerald-600 dark:text-[#10B981] mt-1">
                      {fmt((Number(form.qty) || 0) * (Number(form.costPrice) || 0))}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Tab navigation bar */}
            <div className="flex border-b border-slate-150 dark:border-[#1E293B] px-6">
              {[
                { id: 'general', label: 'General' },
                { id: 'pricing', label: 'Pricing Info' },
                { id: 'inventory', label: 'Inventory details' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 px-4 border-b-2 font-bold text-xs uppercase tracking-wider transition-all -mb-[1px] ${
                    activeTab === tab.id 
                      ? 'border-red-500 text-red-650 dark:text-[#EF4444]' 
                      : 'border-transparent text-slate-400 dark:text-[#94A3B8] hover:text-slate-600 dark:hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Scrollable Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Tab 1 - General */}
                {activeTab === 'general' && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wide">Product Name *</label>
                      <input 
                        required 
                        value={form.name} 
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        className="w-full px-4 py-3 border border-slate-200 dark:border-[#1E293B] rounded-xl text-sm bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-red-550/35 font-semibold" 
                        placeholder="e.g. Premium Power Strip" 
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wide">SKU / Model Code</label>
                        <input 
                          value={form.sku} 
                          onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                          className="w-full px-4 py-3 border border-slate-200 dark:border-[#1E293B] rounded-xl text-sm bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-red-550/35 font-semibold" 
                          placeholder="e.g. PPS-100" 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wide">Category</label>
                        <input 
                          value={form.category} 
                          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                          className="w-full px-4 py-3 border border-slate-200 dark:border-[#1E293B] rounded-xl text-sm bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-red-550/35 font-semibold" 
                          placeholder="e.g. Electronics" 
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wide">Description</label>
                      <textarea 
                        rows={4} 
                        value={form.description} 
                        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                        className="w-full px-4 py-3 border border-slate-200 dark:border-[#1E293B] rounded-xl text-sm bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-red-550/35 resize-none font-semibold" 
                        placeholder="Add descriptive details or specs..." 
                      />
                    </div>
                  </div>
                )}

                {/* Tab 2 - Pricing (Compact grid horizontal cards showing live calculations) */}
                {activeTab === 'pricing' && (
                  <div className="space-y-4 animate-fadeIn">
                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider block">Platform Pricing Analyzer</span>
                    
                    {/* Row Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pb-2">
                      
                      {/* Cost Card */}
                      <div className="bg-amber-50/10 dark:bg-amber-950/10 border border-amber-350/70 dark:border-amber-900/50 rounded-2xl p-3 flex flex-col justify-between min-w-[110px]">
                        <span className="text-[9px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider block">Cost Price</span>
                        <div className="relative mt-2">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-amber-500 text-xs">₹</span>
                          <input 
                            type="number" 
                            step="0.01"
                            value={form.costPrice} 
                            onChange={(e) => setForm(f => ({ ...f, costPrice: e.target.value }))}
                            className="w-full pl-5 pr-1 py-1.5 border border-amber-250 dark:border-amber-900/40 rounded-lg text-xs bg-white dark:bg-[#111827] text-amber-600 dark:text-amber-400 font-extrabold focus:outline-none focus:ring-1 focus:ring-amber-500 text-center" 
                          />
                        </div>
                        <div className="mt-4 text-[9px] font-bold text-amber-500/80">Baseline Cost</div>
                      </div>

                      {/* Offline Card */}
                      {(() => {
                        const { profit, margin } = getProfitAndMargin(form.offlinePrice);
                        return (
                          <div className="bg-emerald-50/10 dark:bg-emerald-950/10 border border-emerald-350/70 dark:border-emerald-900/50 rounded-2xl p-3 flex flex-col justify-between min-w-[110px]">
                            <span className="text-[9px] font-bold text-emerald-650 dark:text-[#10B981] uppercase tracking-wider block">Offline Price</span>
                            <div className="relative mt-2">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#10B981] text-xs">₹</span>
                              <input 
                                type="number" 
                                step="0.01"
                                value={form.offlinePrice} 
                                onChange={(e) => setForm(f => ({ ...f, offlinePrice: e.target.value }))}
                                className="w-full pl-5 pr-1 py-1.5 border border-emerald-250 dark:border-emerald-900/40 rounded-lg text-xs bg-white dark:bg-[#111827] text-emerald-600 dark:text-[#10B981] font-extrabold focus:outline-none focus:ring-1 focus:ring-emerald-500 text-center" 
                              />
                            </div>
                            <div className="mt-2 text-[9px] font-bold flex flex-col gap-0.5 leading-tight">
                              <span className={profit >= 0 ? 'text-emerald-500' : 'text-red-500'}>{profit >= 0 ? '+' : ''}₹{profit.toFixed(0)} Profit</span>
                              <span className={margin >= 0 ? 'text-emerald-500' : 'text-red-500'}>{margin >= 0 ? '+' : ''}{margin.toFixed(0)}% Margin</span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Amazon Card */}
                      {(() => {
                        const { profit, margin } = getProfitAndMargin(form.amazonPrice);
                        return (
                          <div className="bg-emerald-50/5 dark:bg-emerald-950/5 border border-emerald-200/55 dark:border-emerald-900/30 rounded-2xl p-3 flex flex-col justify-between min-w-[110px]">
                            <span className="text-[9px] font-bold text-orange-500 uppercase tracking-wider block">Amazon</span>
                            <div className="relative mt-2">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#10B981] text-xs">₹</span>
                              <input 
                                type="number" 
                                step="0.01"
                                value={form.amazonPrice} 
                                onChange={(e) => setForm(f => ({ ...f, amazonPrice: e.target.value }))}
                                className="w-full pl-5 pr-1 py-1.5 border border-emerald-250/70 dark:border-emerald-900/30 rounded-lg text-xs bg-white dark:bg-[#111827] text-emerald-600 dark:text-[#10B981] font-extrabold focus:outline-none focus:ring-1 focus:ring-emerald-500 text-center" 
                              />
                            </div>
                            <div className="mt-2 text-[9px] font-bold flex flex-col gap-0.5 leading-tight">
                              <span className={profit >= 0 ? 'text-emerald-500' : 'text-red-500'}>{profit >= 0 ? '+' : ''}₹{profit.toFixed(0)} Profit</span>
                              <span className={margin >= 0 ? 'text-emerald-500' : 'text-red-500'}>{margin >= 0 ? '+' : ''}{margin.toFixed(0)}% Margin</span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Flipkart Card */}
                      {(() => {
                        const { profit, margin } = getProfitAndMargin(form.flipkartPrice);
                        return (
                          <div className="bg-emerald-50/5 dark:bg-emerald-950/5 border border-emerald-200/55 dark:border-emerald-900/30 rounded-2xl p-3 flex flex-col justify-between min-w-[110px]">
                            <span className="text-[9px] font-bold text-blue-500 uppercase tracking-wider block">Flipkart</span>
                            <div className="relative mt-2">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#10B981] text-xs">₹</span>
                              <input 
                                type="number" 
                                step="0.01"
                                value={form.flipkartPrice} 
                                onChange={(e) => setForm(f => ({ ...f, flipkartPrice: e.target.value }))}
                                className="w-full pl-5 pr-1 py-1.5 border border-emerald-250/70 dark:border-emerald-900/30 rounded-lg text-xs bg-white dark:bg-[#111827] text-emerald-600 dark:text-[#10B981] font-extrabold focus:outline-none focus:ring-1 focus:ring-emerald-500 text-center" 
                              />
                            </div>
                            <div className="mt-2 text-[9px] font-bold flex flex-col gap-0.5 leading-tight">
                              <span className={profit >= 0 ? 'text-emerald-500' : 'text-red-500'}>{profit >= 0 ? '+' : ''}₹{profit.toFixed(0)} Profit</span>
                              <span className={margin >= 0 ? 'text-emerald-500' : 'text-red-500'}>{margin >= 0 ? '+' : ''}{margin.toFixed(0)}% Margin</span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Meesho Card */}
                      {(() => {
                        const { profit, margin } = getProfitAndMargin(form.meeshoPrice);
                        return (
                          <div className="bg-emerald-50/5 dark:bg-emerald-950/5 border border-emerald-200/55 dark:border-emerald-900/30 rounded-2xl p-3 flex flex-col justify-between min-w-[110px]">
                            <span className="text-[9px] font-bold text-pink-500 uppercase tracking-wider block">Meesho</span>
                            <div className="relative mt-2">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#10B981] text-xs">₹</span>
                              <input 
                                type="number" 
                                step="0.01"
                                value={form.meeshoPrice} 
                                onChange={(e) => setForm(f => ({ ...f, meeshoPrice: e.target.value }))}
                                className="w-full pl-5 pr-1 py-1.5 border border-emerald-250/70 dark:border-emerald-900/30 rounded-lg text-xs bg-white dark:bg-[#111827] text-emerald-600 dark:text-[#10B981] font-extrabold focus:outline-none focus:ring-1 focus:ring-emerald-500 text-center" 
                              />
                            </div>
                            <div className="mt-2 text-[9px] font-bold flex flex-col gap-0.5 leading-tight">
                              <span className={profit >= 0 ? 'text-emerald-500' : 'text-red-500'}>{profit >= 0 ? '+' : ''}₹{profit.toFixed(0)} Profit</span>
                              <span className={margin >= 0 ? 'text-emerald-500' : 'text-red-500'}>{margin >= 0 ? '+' : ''}{margin.toFixed(0)}% Margin</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Tab 3 - Inventory */}
                {activeTab === 'inventory' && (
                  <div className="space-y-6 animate-fadeIn">
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wide">Current Stock (Total Pieces) *</label>
                        <input 
                          required 
                          type="number" 
                          min="0" 
                          value={form.qty} 
                          onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))}
                          className="w-full px-4 py-3 border border-slate-200 dark:border-[#1E293B] rounded-xl text-sm bg-white dark:bg-[#0F172A] text-slate-850 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-red-550/35 font-semibold text-center" 
                          placeholder="e.g. 100" 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wide">Pieces Per Box</label>
                        <input 
                          type="number" 
                          min="1" 
                          value={form.piecesPerBox} 
                          onChange={(e) => setForm((f) => ({ ...f, piecesPerBox: e.target.value }))}
                          className="w-full px-4 py-3 border border-slate-200 dark:border-[#1E293B] rounded-xl text-sm bg-white dark:bg-[#0F172A] text-slate-850 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-red-550/35 font-semibold text-center" 
                          placeholder="e.g. 10" 
                        />
                      </div>
                    </div>

                    {/* Packaging Section details */}
                    <div className="p-4 bg-slate-50 dark:bg-[#0F172A]/30 border border-slate-200 dark:border-[#1E293B] rounded-2xl space-y-4">
                      <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider block">Box Valuation Matrix</span>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <label className="block text-[9px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider text-center">Box Cost</label>
                          <input 
                            type="number" 
                            step="0.01" 
                            min="0" 
                            value={form.boxCostPrice} 
                            onChange={(e) => setForm((f) => ({ ...f, boxCostPrice: e.target.value }))}
                            className="w-full px-3 py-2 border border-amber-250 dark:border-amber-900/40 rounded-xl text-xs bg-white dark:bg-[#111827] text-amber-600 dark:text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold text-center" 
                            placeholder="₹0" 
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-[9px] font-bold text-emerald-650 dark:text-[#10B981] uppercase tracking-wider text-center">Box Selling</label>
                          <input 
                            type="number" 
                            step="0.01" 
                            min="0" 
                            value={form.boxSellingPrice} 
                            onChange={(e) => setForm((f) => ({ ...f, boxSellingPrice: e.target.value }))}
                            className="w-full px-3 py-2 border border-emerald-250 dark:border-emerald-900/40 rounded-xl text-xs bg-white dark:bg-[#111827] text-emerald-600 dark:text-[#10B981] focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-center" 
                            placeholder="₹0" 
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-[9px] font-bold text-emerald-650 dark:text-[#10B981] uppercase tracking-wider text-center">Piece Selling</label>
                          <input 
                            type="number" 
                            step="0.01" 
                            min="0" 
                            value={form.pieceSellingPrice} 
                            onChange={(e) => setForm((f) => ({ ...f, pieceSellingPrice: e.target.value }))}
                            className="w-full px-3 py-2 border border-emerald-250 dark:border-emerald-900/40 rounded-xl text-xs bg-white dark:bg-[#111827] text-emerald-600 dark:text-[#10B981] focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-center" 
                            placeholder="₹0" 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <p className="text-xs font-bold text-red-650 bg-red-50 border border-red-100 p-3 rounded-xl dark:bg-red-950/20 dark:border-red-900/30">
                    {error}
                  </p>
                )}
                
                {/* Hidden submit trigger */}
                <button type="submit" className="hidden" id="drawer-submit-btn" />
              </form>

              {/* Advanced Timeline & Activity Logs displayed at the bottom for existing items */}
              {editing && (
                <div className="mt-8 border-t border-slate-150 dark:border-[#1E293B] pt-6 space-y-6">
                  
                  {/* Metadata fields */}
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-[#0F172A]/20 p-4 rounded-2xl text-xs font-semibold text-slate-500 dark:text-[#94A3B8]">
                    <div>
                      <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider">Last Edited By</span>
                      <span className="mt-1 block font-extrabold text-slate-800 dark:text-[#CBD5E1] truncate">{lastEditedBy}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase font-bold text-slate-400 tracking-wider">Last Updated Time</span>
                      <span className="mt-1 block font-extrabold text-slate-800 dark:text-[#CBD5E1]">{lastUpdatedTime}</span>
                    </div>
                  </div>

                  {/* Price Timeline */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5">
                      <History size={14} className="text-slate-450" />
                      <h4 className="text-xs font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider">Price Change Timeline</h4>
                    </div>
                    {productAuditLogs.filter(log => log.action.toLowerCase().includes('price')).length === 0 ? (
                      <p className="text-xs text-slate-400 pl-5">No pricing adjustments recorded</p>
                    ) : (
                      <div className="relative border-l-2 border-slate-150 dark:border-[#1E293B] ml-2 pl-4 space-y-4 pt-1">
                        {productAuditLogs.filter(log => log.action.toLowerCase().includes('price')).slice(0, 5).map((log, idx) => (
                          <div key={log.id || idx} className="relative">
                            <div className="absolute -left-[22px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#EF4444] border-2 border-white dark:border-[#111827]" />
                            <div className="text-[10px] font-bold text-slate-400">{new Date(log.time).toLocaleString('en-IN')}</div>
                            <div className="text-xs font-semibold text-slate-700 dark:text-[#CBD5E1] mt-0.5 leading-tight">{log.action}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* General Activity */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5">
                      <RefreshCw size={12} className="text-slate-450" />
                      <h4 className="text-xs font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider">Recent Activity Logs</h4>
                    </div>
                    {productAuditLogs.length === 0 ? (
                      <p className="text-xs text-slate-400 pl-5">No activity recorded for this product</p>
                    ) : (
                      <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
                        {productAuditLogs.slice(0, 10).map((log, idx) => (
                          <div key={log.id || idx} className="text-xs p-2.5 rounded-xl bg-slate-50/55 dark:bg-[#1E293B]/20 border border-slate-100 dark:border-[#1E293B]/30 flex justify-between gap-4">
                            <span className="font-semibold text-slate-705 dark:text-[#CBD5E1] leading-snug">{log.action}</span>
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 shrink-0 font-bold self-start mt-0.5">
                              {new Date(log.time).toLocaleDateString('en-IN')}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Bottom Actions Bar */}
            <div className="p-4 border-t border-slate-150 dark:border-[#1E293B] bg-slate-50 dark:bg-[#0F172A]/50 flex gap-3 shadow-inner">
              <button 
                type="button" 
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 border border-slate-200 dark:border-[#334155] rounded-xl text-xs font-bold text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#1E293B] transition-colors"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={() => document.getElementById('drawer-submit-btn')?.click()}
                disabled={saving}
                className="flex-1 py-3 bg-[#EF4444] hover:bg-red-650 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-600/10 flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                {saving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
