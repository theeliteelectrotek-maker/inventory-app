import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import SearchableSelect from '../components/SearchableSelect';
import { useLocation } from 'react-router-dom';
import {
  Plus, Trash2, X, Loader2, Search, Undo2, TrendingUp, TrendingDown,
  Calendar, IndianRupee, AlertTriangle, CheckCircle2, Filter, Download,
  Layers, Activity, FileText, CheckSquare, Eye, Pencil, RefreshCw,
  PlusCircle, Building2, User, Clock, Trash, AlertCircle, ShoppingCart
} from 'lucide-react';

const PLATFORMS = ['amazon', 'flipkart', 'meesho', 'shop'];

const PLATFORM_LABELS = {
  amazon: '📦 Amazon',
  flipkart: '📦 Flipkart',
  meesho: '📦 Meesho',
  shop: '🏪 Shop Invoice',
};

const CONDITION_COLORS = {
  good: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50',
  inspection: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50',
  broken: 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-450 dark:border-rose-900/50',
  scrap: 'bg-slate-150 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-350 dark:border-slate-700',
};

const CONDITION_LABELS = {
  good: '🟢 Good Condition',
  inspection: '🟡 Inspection Required',
  broken: '🔴 Damaged',
  scrap: '⚫ Scrap / Waste',
};

const REASONS = [
  'Manufacturing Defect',
  'Physical Damage During Transit',
  'Wrong Product Delivered',
  'Quality Issue',
  'Warranty Claim',
  'Other'
];

const today = () => {
  const d = new Date();
  return d.toISOString().split('T')[0];
};

const emptyForm = () => ({
  platform: 'amazon',
  shopId: '',
  shopName: '',
  invoiceNumber: '',
  action: 'return',
  date: today(),
  notes: '', // Overall remarks
  items: [{ productId: '', qty: 1, condition: 'good', reason: REASONS[0], notes: '', maxQty: 99999 }]
});

function Modal({ title, onClose, children, maxWidth = 'max-w-4xl' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm !m-0 animate-fadeIn">
      <div className={`bg-white dark:bg-[#1E293B] rounded-3xl shadow-2xl w-[95%] sm:w-full ${maxWidth} border border-slate-100 dark:border-[#334155] overflow-hidden transform transition-all scale-100`}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-[#334155] bg-slate-50/50 dark:bg-slate-900/50">
          <h3 className="font-bold text-slate-800 dark:text-[#F8FAFC] text-base flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-650"></span>
            {title}
          </h3>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 dark:text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-[#F8FAFC] transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-6 max-h-[78vh] overflow-y-auto scrollbar-thin">{children}</div>
      </div>
    </div>
  );
}

function ProductThumbnail({ name }) {
  const initial = name ? name.charAt(0).toUpperCase() : 'P';
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    'from-red-500 to-rose-500 text-red-50 border-red-150',
    'from-slate-700 to-slate-900 text-slate-50 border-slate-800',
    'from-indigo-600 to-indigo-800 text-indigo-50 border-indigo-700',
    'from-emerald-500 to-teal-500 text-emerald-50 border-emerald-100'
  ];
  const colorClass = colors[Math.abs(hash) % colors.length];

  return (
    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center text-sm font-black shadow-sm border flex-shrink-0`}>
      {initial}
    </div>
  );
}

export default function Returns() {
  const { user } = useAuth();
  const location = useLocation();
  const [returns, setReturns] = useState([]);
  const [products, setProducts] = useState([]);
  const [shops, setShops] = useState([]);
  const [offlineSales, setOfflineSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [detailsModal, setDetailsModal] = useState(null);
  const [editingReturn, setEditingReturn] = useState(null);

  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Filters state
  const [search, setSearch] = useState('');
  const [filterCondition, setFilterCondition] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [filterProduct, setFilterProduct] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  useEffect(() => {
    fetchData();
  }, [location.state]);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.getReturns(),
      api.getProducts(),
      api.getShops(),
      api.getOfflineSales ? api.getOfflineSales() : Promise.resolve([])
    ])
      .then(([r, p, s, sales]) => {
        setReturns(r.reverse());
        setProducts(p);
        setShops(s);
        setOfflineSales(sales);
        if (location.state?.openAddModal) {
          setForm(emptyForm());
          setEditingReturn(null);
          setError('');
          setShowModal(true);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const getReturnPrice = (productId, platform) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return 0;
    let price = prod.unitPrice || 0;
    if (platform === 'amazon') price = prod.amazonPrice || prod.onlinePrice || prod.unitPrice || 0;
    else if (platform === 'flipkart') price = prod.flipkartPrice || prod.onlinePrice || prod.unitPrice || 0;
    else if (platform === 'meesho') price = prod.meeshoPrice || prod.onlinePrice || prod.unitPrice || 0;
    else if (platform === 'shop') price = prod.offlinePrice || prod.unitPrice || 0;
    return price;
  };

  const getProductCost = (productId) => {
    const prod = products.find(p => p.id === productId);
    return prod ? (prod.costPrice || prod.offlinePrice || 0) : 0;
  };

  const getReturnValues = (r) => {
    const items = r.items && r.items.length > 0 ? r.items : [{ productId: r.productId, qty: r.qty || 1, condition: r.condition }];
    let totalRecovery = 0;
    let totalLoss = 0;

    items.forEach(item => {
      const price = getReturnPrice(item.productId, r.platform);
      const cost = getProductCost(item.productId);
      const q = Number(item.qty) || 1;

      if (item.condition === 'good') {
        totalRecovery += (price * q);
      } else if (item.condition === 'broken' || item.condition === 'scrap') {
        totalLoss += (cost * q);
      }
    });

    return {
      recoveryVal: totalRecovery,
      lossVal: totalLoss
    };
  };

  // Add empty row
  const addRow = () => {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, { productId: '', qty: 1, condition: 'good', reason: REASONS[0], notes: '', maxQty: 99999 }]
    }));
  };

  // Remove row
  const removeRow = (idx) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx)
    }));
  };

  // Update item field
  const updateItemField = (idx, field, value) => {
    setForm(prev => {
      const newItems = [...prev.items];
      newItems[idx] = { ...newItems[idx], [field]: value };
      
      // Auto-fill SKU and Category when product changes
      if (field === 'productId') {
        const prod = products.find(p => p.id === value);
        if (prod) {
          newItems[idx].sku = prod.sku || '';
          newItems[idx].category = prod.category || 'General';
          newItems[idx].productName = prod.name;
        }
      }
      return { ...prev, items: newItems };
    });
  };

  // Invoice Load
  const handleInvoiceSelect = (invoiceId) => {
    const sale = offlineSales.find(s => s.id === invoiceId || s.invoiceNumber === invoiceId);
    if (sale) {
      const newItems = (sale.items || []).map(item => {
        const prod = products.find(p => p.id === item.productId || p.name === item.productName);
        return {
          productId: prod ? prod.id : item.productId,
          productName: item.productName,
          sku: prod ? prod.sku : '',
          category: prod ? prod.category : 'General',
          qty: item.qty, // Default to total sold quantity
          maxQty: item.qty, // Cap limits
          condition: 'good',
          reason: ' MANUFACTURING DEFECT',
          notes: ''
        };
      });

      setForm(prev => ({
        ...prev,
        shopName: sale.buyerName,
        invoiceNumber: sale.invoiceNumber,
        items: newItems.length > 0 ? newItems : prev.items
      }));
    }
  };

  // Submit
  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');

    // Validation
    const emptyProduct = form.items.some(it => !it.productId);
    if (emptyProduct) {
      setError('Please select a product for all rows.');
      setSaving(false);
      return;
    }

    const invalidQty = form.items.some(it => Number(it.qty) <= 0);
    if (invalidQty) {
      setError('Returned quantity must be greater than zero.');
      setSaving(false);
      return;
    }

    // Exceed limits check
    const exceedsLimit = form.items.some(it => Number(it.qty) > it.maxQty);
    if (exceedsLimit) {
      setError('Returned quantity cannot exceed original invoice quantity.');
      setSaving(false);
      return;
    }

    // Duplicates check
    const productIds = form.items.map(it => it.productId);
    const hasDuplicates = productIds.some((val, idx) => productIds.indexOf(val) !== idx);
    if (hasDuplicates) {
      setError('Duplicate product selections are not allowed within the same return.');
      setSaving(false);
      return;
    }

    try {
      if (editingReturn) {
        // Edit Return Simulation: Delete old first, then add new
        await api.deleteReturn(editingReturn.id);
        const ret = await api.addReturn(form);
        setReturns(prev => prev.map(r => r.id === editingReturn.id ? ret : r));
        setEditingReturn(null);
      } else {
        const ret = await api.addReturn(form);
        setReturns(prev => [ret, ...prev]);
      }
      setShowModal(false);
      setForm(emptyForm());
      fetchData(); // Sync database & local inventory
    } catch (err) {
      setError(err.message || 'Submission failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this return transaction? Inventory stocks will be automatically adjusted.')) return;
    try {
      await api.deleteReturn(id);
      setReturns(prev => prev.filter(r => r.id !== id));
      fetchData();
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  }

  const hasActiveFilters = !!(search || filterCondition !== 'all' || filterSource !== 'all' || filterProduct !== 'all' || filterStartDate || filterEndDate);

  const resetFilters = () => {
    setSearch('');
    setFilterCondition('all');
    setFilterSource('all');
    setFilterProduct('all');
    setFilterStartDate('');
    setFilterEndDate('');
  };

  // Filters logic
  const filtered = returns.filter(r => {
    const items = r.items && r.items.length > 0 ? r.items : [{ productId: r.productId, condition: r.condition, productName: r.productName }];
    const vals = getReturnValues(r);

    // 1. Search text
    const matchesSearch = !search ||
      r.platform?.toLowerCase().includes(search.toLowerCase()) ||
      r.shopName?.toLowerCase().includes(search.toLowerCase()) ||
      r.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) ||
      items.some(it => it.productName?.toLowerCase().includes(search.toLowerCase()) || it.sku?.toLowerCase().includes(search.toLowerCase()));

    // 2. Condition filter
    const matchesCondition = filterCondition === 'all' || items.some(it => it.condition === filterCondition);

    // 3. Source filter
    let matchesSource = true;
    if (filterSource === 'shops') {
      matchesSource = r.platform === 'shop' && r.shopName !== 'Walk-in Customer';
    } else if (filterSource === 'walk-in') {
      matchesSource = r.platform === 'shop' && r.shopName === 'Walk-in Customer';
    } else if (filterSource === 'online') {
      matchesSource = r.platform !== 'shop';
    }

    // 4. Product filter
    const matchesProduct = filterProduct === 'all' || items.some(it => it.productId === filterProduct);

    // 5. Date Range filter
    let matchesDate = true;
    if (filterStartDate) matchesDate = matchesDate && r.date >= filterStartDate;
    if (filterEndDate) matchesDate = matchesDate && r.date <= filterEndDate;

    return matchesSearch && matchesCondition && matchesSource && matchesProduct && matchesDate;
  });

  // KPI calculations based on filtered list
  const totalReturnsCount = filtered.length;
  const totalReturnedUnits = filtered.reduce((s, r) => {
    const items = r.items && r.items.length > 0 ? r.items : [{ qty: r.qty || 1 }];
    return s + items.reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
  }, 0);

  const totalStockRecoveredVal = filtered.reduce((s, r) => s + getReturnValues(r).recoveryVal, 0);
  const totalDamagedLossVal = filtered.reduce((s, r) => s + getReturnValues(r).lossVal, 0);

  const goodReturnsCount = filtered.reduce((s, r) => {
    const items = r.items && r.items.length > 0 ? r.items : [{ qty: r.qty || 1, condition: r.condition }];
    return s + items.filter(it => it.condition === 'good').reduce((sum, it) => sum + it.qty, 0);
  }, 0);

  const pendingInspectionCount = filtered.reduce((s, r) => {
    const items = r.items && r.items.length > 0 ? r.items : [{ qty: r.qty || 1, condition: r.condition }];
    return s + items.filter(it => it.condition === 'inspection').reduce((sum, it) => sum + it.qty, 0);
  }, 0);

  const damagedReturnsCount = filtered.reduce((s, r) => {
    const items = r.items && r.items.length > 0 ? r.items : [{ qty: r.qty || 1, condition: r.condition }];
    return s + items.filter(it => it.condition === 'broken' || it.condition === 'scrap').reduce((sum, it) => sum + it.qty, 0);
  }, 0);

  // Conic gradient percent computations
  const totalConditionSum = (goodReturnsCount + pendingInspectionCount + damagedReturnsCount) || 1;
  const goodPct = Math.round((goodReturnsCount / totalConditionSum) * 100);
  const pendingPct = Math.round((pendingInspectionCount / totalConditionSum) * 100);
  const damagedPct = Math.round((damagedReturnsCount / totalConditionSum) * 100);

  // Return source breakdown metrics
  const sourceShopsCount = filtered.filter(r => r.platform === 'shop' && r.shopName !== 'Walk-in Customer').reduce((s, r) => s + (r.items && r.items.length > 0 ? r.items.reduce((sum, it) => sum + it.qty, 0) : r.qty || 1), 0);
  const sourceWalkInCount = filtered.filter(r => r.platform === 'shop' && r.shopName === 'Walk-in Customer').reduce((s, r) => s + (r.items && r.items.length > 0 ? r.items.reduce((sum, it) => sum + it.qty, 0) : r.qty || 1), 0);
  const sourceOnlineCount = filtered.filter(r => r.platform !== 'shop').reduce((s, r) => s + (r.items && r.items.length > 0 ? r.items.reduce((sum, it) => sum + it.qty, 0) : r.qty || 1), 0);
  const totalSourceUnits = (sourceShopsCount + sourceWalkInCount + sourceOnlineCount) || 1;

  // Last 15 Days Trend Chart helper
  const get15DaysTrend = () => {
    const dates = [];
    const counts = {};
    const now = new Date();
    for (let i = 14; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      dates.push(d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }));
      counts[dateStr] = 0;
    }

    filtered.forEach(r => {
      const dateStr = r.date;
      const testDate = new Date(dateStr);
      const displayStr = testDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      if (dates.includes(displayStr)) {
        const items = r.items && r.items.length > 0 ? r.items : [{ qty: r.qty || 1 }];
        counts[displayStr] = (counts[displayStr] || 0) + items.reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
      }
    });

    return dates.map(d => ({ label: d, val: counts[d] || 0 }));
  };

  const trendList = get15DaysTrend();
  const maxTrendVal = Math.max(...trendList.map(x => x.val), 1);
  const trendPoints = trendList.map((item, idx) => {
    const x = (idx / (trendList.length - 1)) * 500;
    const y = 110 - (item.val / maxTrendVal) * 90;
    return `${x},${y}`;
  }).join(' ');

  const fillPoints = `0,120 ${trendPoints} 500,120`;

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      alert('No returns data available to export.');
      return;
    }
    let csv = 'data:text/csv;charset=utf-8,Return ID,Platform,Source Customer,Invoice Number,Date,Product Name,SKU,Category,Qty,Condition,Reason,Notes\n';
    filtered.forEach(r => {
      const items = r.items && r.items.length > 0 ? r.items : [{
        productId: r.productId,
        productName: r.productName,
        qty: r.qty || 1,
        condition: r.condition || 'good',
        notes: r.notes || ''
      }];
      
      const sourceStr = r.platform === 'shop' ? (r.shopName || 'Shop') : r.platform.toUpperCase();

      items.forEach(it => {
        const prod = products.find(p => p.id === it.productId);
        const sku = it.sku || (prod ? prod.sku : '');
        const category = it.category || (prod ? prod.category : 'General');
        csv += `${r.id},${r.platform},"${sourceStr}","${r.invoiceNumber || ''}",${r.date},"${it.productName || ''}","${sku}","${category}",${it.qty},${it.condition},"${it.reason || ''}","${it.notes || ''}"\n`;
      });
    });

    const encoded = encodeURI(csv);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `returns_multi_report_${today()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Form summaries helper
  const formSummary = () => {
    let totProd = form.items.length;
    let totQty = form.items.reduce((s, x) => s + (Number(x.qty) || 0), 0);
    let good = form.items.filter(x => x.condition === 'good').reduce((s, x) => s + (Number(x.qty) || 0), 0);
    let review = form.items.filter(x => x.condition === 'inspection').reduce((s, x) => s + (Number(x.qty) || 0), 0);
    let broken = form.items.filter(x => x.condition === 'broken').reduce((s, x) => s + (Number(x.qty) || 0), 0);
    let scrap = form.items.filter(x => x.condition === 'scrap').reduce((s, x) => s + (Number(x.qty) || 0), 0);
    
    let recoveryVal = 0;
    let lossVal = 0;
    form.items.forEach(it => {
      const qtyNum = Number(it.qty) || 0;
      if (it.productId) {
        if (it.condition === 'good') {
          recoveryVal += getReturnPrice(it.productId, form.platform) * qtyNum;
        } else if (it.condition === 'broken' || it.condition === 'scrap') {
          lossVal += getProductCost(it.productId) * qtyNum;
        }
      }
    });

    return { totProd, totQty, good, review, damaged: broken + scrap, recoveryVal, lossVal, scrap };
  };

  const formStats = formSummary();

  const fmt = (num) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num || 0);

  return (
    <div className="space-y-6 pb-12 relative text-slate-800 dark:text-[#CBD5E1]">
      <style>{`
        .glass-card {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(226, 232, 240, 0.8);
          border-radius: 24px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .glass-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 24px -8px rgba(220, 38, 38, 0.08);
          border-color: rgba(220, 38, 38, 0.2);
        }
        .dark .glass-card {
          background: rgba(30, 41, 59, 0.85);
          border-color: rgba(51, 65, 85, 0.8);
        }
        .dark .glass-card:hover {
          box-shadow: 0 12px 24px -8px rgba(239, 68, 68, 0.15);
          border-color: rgba(239, 68, 68, 0.3);
        }
        .animate-fadeIn {
          animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-slate-200 dark:border-[#334155] shadow-sm">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-10 bg-red-650 dark:bg-[#EF4444] rounded-full shrink-0"></span>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-[#F8FAFC] tracking-tight">
              Return Management
            </h1>
            <p className="text-slate-500 dark:text-[#94A3B8] text-sm mt-1 font-medium">Log and track returned products, quality states, and salvage value recoveries</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => { setForm(emptyForm()); setEditingReturn(null); setError(''); setShowModal(true); }}
            className="flex items-center justify-center gap-1.5 bg-[#EF4444] hover:bg-red-600 text-white text-xs font-bold px-5 py-3 rounded-2xl transition-all shadow-md hover:shadow-lg whitespace-nowrap"
          >
            <Plus size={14} /> Log Return Transaction
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-1.5 bg-white dark:bg-[#1E293B] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-[#F8FAFC] border border-slate-200 dark:border-[#334155] text-xs font-bold px-5 py-3 rounded-2xl transition-all shadow-sm hover:shadow-md whitespace-nowrap"
          >
            <Download size={14} className="text-slate-500 dark:text-slate-400" /> Export CSV
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Total Returns */}
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-[#334155] border-t-4 border-t-slate-500 dark:border-t-slate-400 flex flex-col justify-between h-32">
          <div className="flex justify-between items-center text-slate-400 dark:text-[#94A3B8]">
            <span className="text-[10px] font-bold uppercase tracking-wider block">Returns Transactions</span>
            <div className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg"><Undo2 size={12} /></div>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-slate-900 dark:text-[#F8FAFC] tracking-tight">{totalReturnsCount}</p>
            <p className="text-[10px] text-slate-400 dark:text-[#94A3B8] font-semibold mt-1">Logged requests</p>
          </div>
        </div>

        {/* Total Units */}
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-[#334155] border-t-4 border-t-indigo-500 dark:border-t-indigo-500 flex flex-col justify-between h-32">
          <div className="flex justify-between items-center text-slate-400 dark:text-[#94A3B8]">
            <span className="text-[10px] font-bold uppercase tracking-wider block">Total Returned Units</span>
            <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg text-indigo-505"><Layers size={12} /></div>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-slate-900 dark:text-[#F8FAFC] tracking-tight">{totalReturnedUnits}</p>
            <p className="text-[10px] text-indigo-405 font-semibold mt-1">Cumulative units</p>
          </div>
        </div>

        {/* Good/Cleared */}
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-[#334155] border-t-4 border-t-emerald-500 dark:border-t-emerald-500 flex flex-col justify-between h-32">
          <div className="flex justify-between items-center text-slate-400 dark:text-[#94A3B8]">
            <span className="text-[10px] font-bold uppercase tracking-wider block text-emerald-500">Restocked Units</span>
            <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg text-emerald-500"><CheckCircle2 size={12} /></div>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-slate-900 dark:text-[#F8FAFC] tracking-tight">{goodReturnsCount}</p>
            <p className="text-[10px] text-emerald-500 font-semibold mt-1">Good condition (Sellable)</p>
          </div>
        </div>

        {/* Review/Review */}
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-[#334155] border-t-4 border-t-amber-500 dark:border-t-amber-500 flex flex-col justify-between h-32">
          <div className="flex justify-between items-center text-slate-400 dark:text-[#94A3B8]">
            <span className="text-[10px] font-bold uppercase tracking-wider block text-amber-500">Pending Review</span>
            <div className="p-1.5 bg-amber-50 dark:bg-amber-950/20 rounded-lg text-amber-500"><Clock size={12} /></div>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-slate-900 dark:text-[#F8FAFC] tracking-tight">{pendingInspectionCount}</p>
            <p className="text-[10px] text-amber-505 font-semibold mt-1">Under inspection</p>
          </div>
        </div>

        {/* Stock Recovery Value */}
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-[#334155] border-t-4 border-t-teal-500 dark:border-t-teal-500 flex flex-col justify-between h-32">
          <div className="flex justify-between items-center text-slate-400 dark:text-[#94A3B8]">
            <span className="text-[10px] font-bold uppercase tracking-wider block text-teal-600 dark:text-teal-400">Stock Recovered</span>
            <div className="p-1.5 bg-teal-50 dark:bg-teal-950/20 rounded-lg text-teal-500"><IndianRupee size={12} /></div>
          </div>
          <div>
            <p className="text-xl font-extrabold text-emerald-650 dark:text-emerald-400 tracking-tight truncate" title={fmt(totalStockRecoveredVal)}>{fmt(totalStockRecoveredVal)}</p>
            <p className="text-[10px] text-emerald-500 font-semibold mt-1">Restocked inventory value</p>
          </div>
        </div>

        {/* Damaged Loss Value */}
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-[#334155] border-t-4 border-t-rose-500 dark:border-t-rose-400 flex flex-col justify-between h-32">
          <div className="flex justify-between items-center text-slate-400 dark:text-[#94A3B8]">
            <span className="text-[10px] font-bold uppercase tracking-wider block text-rose-500">Write-off Loss</span>
            <div className="p-1.5 bg-rose-50 dark:bg-rose-950/20 rounded-lg text-rose-550"><AlertTriangle size={12} /></div>
          </div>
          <div>
            <p className="text-xl font-extrabold text-red-650 dark:text-red-400 tracking-tight truncate" title={fmt(totalDamagedLossVal)}>{fmt(totalDamagedLossVal)}</p>
            <p className="text-[10px] text-red-500 font-semibold mt-1">Damaged/Scrapped cost loss</p>
          </div>
        </div>
      </div>

      {/* Analytics visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Area Chart */}
        <div className="bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-slate-200 dark:border-[#334155] shadow-sm flex flex-col justify-between h-[230px]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-[#F8FAFC] text-lg tracking-tight">Returns timeline</h3>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5 font-medium">Returned units history (Last 15 Days)</p>
            </div>
            <Activity size={16} className="text-red-500 animate-pulse" />
          </div>

          <div className="relative mt-2 flex-1 flex items-end">
            <svg viewBox="0 0 500 120" className="w-full h-[100px] overflow-visible">
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity="0.25"/>
                  <stop offset="100%" stopColor="#EF4444" stopOpacity="0.0"/>
                </linearGradient>
              </defs>
              <polygon points={fillPoints} fill="url(#areaGrad)" />
              <polyline points={trendPoints} fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="0" y1="110" x2="500" y2="110" stroke="#f1f5f9" className="stroke-slate-100 dark:stroke-slate-800" strokeWidth="1" strokeDasharray="3" />
            </svg>
          </div>

          <div className="flex justify-between text-[9px] font-bold text-slate-400 dark:text-[#94A3B8] px-1 pt-1.5 border-t border-slate-100 dark:border-[#334155]">
            <span>{trendList[0]?.label}</span>
            <span>{trendList[Math.floor(trendList.length / 2)]?.label}</span>
            <span>{trendList[trendList.length - 1]?.label}</span>
          </div>
        </div>

        {/* Source breakdown chart */}
        <div className="bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-slate-200 dark:border-[#334155] shadow-sm flex flex-col justify-between h-[230px]">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-[#F8FAFC] text-lg tracking-tight">Return Origins</h3>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5 font-medium">Breakdown of return sources by quantity</p>
          </div>

          <div className="space-y-3.5 my-auto">
            {/* Shops */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-[#CBD5E1]">
                <span className="flex items-center gap-1 font-semibold">🏪 Registered Shops</span>
                <span className="font-bold text-slate-700 dark:text-[#F8FAFC]">{sourceShopsCount} units ({Math.round(sourceShopsCount / totalSourceUnits * 105) || 0}%)</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div style={{ width: `${(sourceShopsCount / totalSourceUnits) * 100}%` }} className="h-full bg-indigo-600 rounded-full" />
              </div>
            </div>
            {/* Walk-in */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-[#CBD5E1]">
                <span className="flex items-center gap-1 font-semibold">👤 Walk-in Customers</span>
                <span className="font-bold text-slate-700 dark:text-[#F8FAFC]">{sourceWalkInCount} units ({Math.round(sourceWalkInCount / totalSourceUnits * 100) || 0}%)</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div style={{ width: `${(sourceWalkInCount / totalSourceUnits) * 100}%` }} className="h-full bg-amber-500 rounded-full" />
              </div>
            </div>
            {/* Online orders */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-[#CBD5E1]">
                <span className="flex items-center gap-1 font-semibold">📦 Online Platforms</span>
                <span className="font-bold text-slate-700 dark:text-[#F8FAFC]">{sourceOnlineCount} units ({Math.round(sourceOnlineCount / totalSourceUnits * 100) || 0}%)</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div style={{ width: `${(sourceOnlineCount / totalSourceUnits) * 100}%` }} className="h-full bg-[#EF4444] rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Quality Breakdown Pie Chart */}
        <div className="bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-slate-200 dark:border-[#334155] shadow-sm flex flex-col justify-between h-[230px]">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-[#F8FAFC] text-lg tracking-tight">Quality breakdown</h3>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5 font-medium">Return log condition segments</p>
          </div>

          <div className="flex items-center justify-between gap-5 my-auto">
            <div className="relative w-24 h-24 flex items-center justify-center rounded-full border border-slate-50 dark:border-slate-800/50 flex-shrink-0"
              style={{
                background: `conic-gradient(
                  #10b981 0% ${goodPct}%, 
                  #f59e0b ${goodPct}% ${goodPct + pendingPct}%, 
                  #f43f5e ${goodPct + pendingPct}% 100%
                )`
              }}
            >
              <div className="w-18 h-18 rounded-full bg-white dark:bg-[#1E293B] flex flex-col items-center justify-center shadow-inner">
                <span className="text-[9px] font-bold text-slate-400 dark:text-[#94A3B8] block uppercase">Cleared</span>
                <span className="text-sm font-black text-slate-800 dark:text-[#F8FAFC]">{goodPct}%</span>
              </div>
            </div>

            <div className="flex-1 space-y-1 text-[10px] font-semibold text-slate-600 dark:text-[#CBD5E1]">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-emerald-500 inline-block shrink-0"></span> Good Condition</span>
                <span className="text-slate-800 dark:text-[#F8FAFC]">{goodReturnsCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-amber-500 inline-block shrink-0"></span> Inspected / Review</span>
                <span className="text-slate-800 dark:text-[#F8FAFC]">{pendingInspectionCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded bg-rose-500 inline-block shrink-0"></span> Damaged / Scrap</span>
                <span className="text-slate-800 dark:text-[#F8FAFC]">{damagedReturnsCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <div className="bg-white/95 dark:bg-[#1E293B]/95 backdrop-blur-sm border border-slate-200/50 dark:border-[#334155]/50 p-6 rounded-3xl shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#334155] pb-3">
          <span className="text-xs font-bold text-slate-700 dark:text-[#F8FAFC] uppercase tracking-wider flex items-center gap-1.5">
            <Filter size={14} className="text-slate-400 dark:text-slate-500" /> Filter & Search returned items
          </span>
          {hasActiveFilters && (
            <button onClick={resetFilters}
              className="text-[11px] font-bold text-red-650 dark:text-red-400 hover:text-red-705 transition-colors flex items-center gap-1 bg-red-50 dark:bg-red-950/40 hover:bg-red-100/60 dark:hover:bg-red-900/40 px-3 py-1 rounded-lg">
              <RefreshCw size={10} /> Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Search bar */}
          <div className="space-y-1 md:col-span-2">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Search Query</label>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search product, platform, or invoice…"
                className="w-full pl-8 pr-3 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-xs bg-slate-50/50 dark:bg-[#0F172A]/50 hover:bg-white dark:hover:bg-[#0F172A] focus:outline-none focus:ring-2 focus:ring-red-500 transition-all font-medium text-slate-700 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-500" />
            </div>
          </div>

          {/* Condition Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Condition</label>
            <select value={filterCondition} onChange={(e) => setFilterCondition(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-xs bg-slate-50/50 dark:bg-[#0F172A]/50 hover:bg-white dark:hover:bg-[#0F172A] focus:outline-none focus:ring-2 focus:ring-red-500 transition-all font-medium text-slate-700 dark:text-[#F8FAFC]">
              <option value="all" className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">🟢 All Conditions</option>
              <option value="good" className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">🟢 Good Condition</option>
              <option value="inspection" className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">🟡 Under Inspection</option>
              <option value="broken" className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">🔴 Damaged</option>
              <option value="scrap" className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">⚫ Scrap</option>
            </select>
          </div>

          {/* Source Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Origin Source</label>
            <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-xs bg-slate-50/50 dark:bg-[#0F172A]/50 hover:bg-white dark:hover:bg-[#0F172A] focus:outline-none focus:ring-2 focus:ring-red-500 transition-all font-medium text-slate-700 dark:text-[#F8FAFC]">
              <option value="all" className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">👥 All Sources</option>
              <option value="shops" className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">🏪 Shop Orders</option>
              <option value="walk-in" className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">👤 Walk-in Customers</option>
              <option value="online" className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">📦 Online Platforms</option>
            </select>
          </div>

          {/* Product Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Product Name</label>
            <select value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-xs bg-slate-50/50 dark:bg-[#0F172A]/50 hover:bg-white dark:hover:bg-[#0F172A] focus:outline-none focus:ring-2 focus:ring-red-500 transition-all font-medium text-slate-700 dark:text-[#F8FAFC]">
              <option value="all" className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">🏷️ All Products</option>
              {products.map(p => (
                <option key={p.id} value={p.id} className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Ranges Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-[#334155]">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Start Date</label>
            <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-xs bg-slate-50/50 dark:bg-[#0F172A]/50 hover:bg-white dark:hover:bg-[#0F172A] text-slate-600 dark:text-[#F8FAFC] focus:outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">End Date</label>
            <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-xs bg-slate-50/50 dark:bg-[#0F172A]/50 hover:bg-white dark:hover:bg-[#0F172A] text-slate-600 dark:text-[#F8FAFC] focus:outline-none" />
          </div>
          {filtered.length !== returns.length && (
            <div className="flex items-end justify-start pb-2.5 text-xs font-bold text-red-650 dark:text-red-400">
              ⚡ Showing {filtered.length} of {returns.length} return transactions matching filters.
            </div>
          )}
        </div>
      </div>

      {/* Main List Container */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-[#334155] rounded-3xl">
            <Loader2 size={32} className="animate-spin text-red-650 dark:text-[#EF4444]" />
            <p className="text-xs font-bold text-slate-400 dark:text-[#94A3B8] mt-3">Fetching return details…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-[#334155] rounded-3xl shadow-sm">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-[#334155] rounded-2xl flex items-center justify-center text-slate-350 dark:text-slate-500 mb-4">
              <Undo2 size={28} />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-[#F8FAFC] text-sm">No return records matched</h3>
            <p className="text-slate-450 dark:text-[#94A3B8] text-xs mt-1 max-w-xs">Verify your search strings or select other filter options.</p>
            {hasActiveFilters && (
              <button onClick={resetFilters} className="mt-4 px-4 py-2 border border-slate-200 dark:border-[#334155] text-xs font-bold text-slate-655 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all">
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4.5">
            {filtered.map(r => {
              const items = r.items && r.items.length > 0 ? r.items : [{
                productId: r.productId,
                productName: r.productName,
                qty: r.qty || 1,
                condition: r.condition || 'good',
                reason: 'Legacy Return'
              }];

              const vals = getReturnValues(r);
              const totalItemsQty = items.reduce((sum, it) => sum + it.qty, 0);

              return (
                <div key={r.id} className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-[#334155] hover:border-slate-300 dark:hover:border-slate-500 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4 relative">
                  {/* Left Side: Origin & Details */}
                  <div className="space-y-1.5 flex-1 min-w-[280px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-extrabold text-slate-800 dark:text-[#F8FAFC] tracking-tight">Return ID: {r.id.substring(0, 8)}...</span>
                      {r.platform === 'shop' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold border bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-150 dark:border-indigo-900/40 uppercase">
                          🏪 {r.shopName || 'Shop'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold border bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-350 border-rose-150 dark:border-rose-900/40 uppercase">
                          🌐 {r.platform}
                        </span>
                      )}
                      {r.invoiceNumber && (
                        <span className="text-[9px] px-1.5 py-0.2 bg-slate-50/50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-150 dark:border-slate-800 rounded font-mono font-bold uppercase">Inv: {r.invoiceNumber}</span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-405 dark:text-[#94A3B8] font-semibold flex items-center gap-3">
                      <span className="flex items-center gap-0.5"><Calendar size={11} /> Date: {r.date}</span>
                      <span className="flex items-center gap-0.5">📦 Products: <span className="font-extrabold text-slate-800 dark:text-[#F8FAFC]">{items.length} ({totalItemsQty} units)</span></span>
                    </div>
                  </div>

                  {/* Middle Side: Summary items list */}
                  <div className="flex-1 min-w-[260px] text-xs space-y-1 py-1 max-h-[85px] overflow-y-auto pr-2 scrollbar-thin border-l border-slate-100 dark:border-slate-800 pl-4">
                    {items.slice(0, 3).map((it, idx) => (
                      <div key={idx} className="flex justify-between items-center text-slate-600 dark:text-[#CBD5E1] font-semibold">
                        <span className="truncate max-w-[180px]">{it.productName || 'Unknown Product'}</span>
                        <span className="shrink-0 text-slate-400 font-bold ml-1.5">{it.qty}x ({it.condition})</span>
                      </div>
                    ))}
                    {items.length > 3 && (
                      <p className="text-[10px] text-slate-400 font-bold block pt-0.5">+ {items.length - 3} more items...</p>
                    )}
                  </div>

                  {/* Right Side: Totals & Action triggers */}
                  <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-slate-50 dark:border-slate-800 shrink-0">
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Recovery: {fmt(vals.recoveryVal)}</p>
                      <p className="text-[10px] font-bold text-rose-600 dark:text-rose-405 mt-0.5">Loss: {fmt(vals.lossVal)}</p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => setDetailsModal(r)} title="View Dossier"
                        className="p-2 rounded-xl text-slate-400 dark:text-slate-555 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-[#F8FAFC] transition-all">
                        <Eye size={14} />
                      </button>

                      <button onClick={() => {
                        const newForm = {
                          platform: r.platform,
                          shopId: r.shopId || '',
                          shopName: r.shopName || '',
                          invoiceNumber: r.invoiceNumber || '',
                          action: r.action || 'return',
                          date: r.date,
                          notes: r.notes || '',
                          items: items.map(it => ({
                            productId: it.productId,
                            productName: it.productName,
                            sku: it.sku || '',
                            category: it.category || 'General',
                            qty: it.qty,
                            condition: it.condition,
                            reason: it.reason || REASONS[0],
                            notes: it.notes || '',
                            maxQty: 99999
                          }))
                        };
                        setForm(newForm);
                        setEditingReturn(r);
                        setError('');
                        setShowModal(true);
                      }} title="Edit Return"
                        className="p-2 rounded-xl text-slate-400 dark:text-slate-555 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-[#F8FAFC] transition-all">
                        <Pencil size={14} />
                      </button>

                      <button onClick={() => handleDelete(r.id)} disabled={user?.role === 'EMPLOYEE'} title="Delete Log"
                        className="p-2 rounded-xl text-slate-400 dark:text-slate-555 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-650 dark:hover:text-rose-400 transition-all disabled:opacity-30">
                        <Trash size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Log Multi-product Return Modal */}
      {showModal && (
        <Modal title={editingReturn ? "Edit Return Transaction" : "Log New Return Transaction"} onClose={() => setShowModal(false)} maxWidth="max-w-5xl">
          <form onSubmit={handleSubmit} className="space-y-6 text-slate-700 dark:text-[#CBD5E1]">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl p-3.5 text-xs font-bold flex items-center gap-2">
                <AlertCircle size={15} /> {error}
              </div>
            )}

            {/* Platform & Source parameters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-4.5 rounded-2xl">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Return Source Category *</label>
                <select required value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}
                  className="w-full h-[42px] px-3 py-2 border border-slate-200 dark:border-[#334155] rounded-xl text-sm bg-white dark:bg-[#1E293B] focus:ring-2 focus:ring-red-500 focus:outline-none">
                  {PLATFORMS.map(p => <option key={p} value={p}>{PLATFORM_LABELS[p] || p}</option>)}
                </select>
              </div>

              {form.platform === 'shop' ? (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Search Shop Invoice</label>
                    <SearchableSelect
                      options={offlineSales.map(s => ({ value: s.invoiceNumber, label: `${s.invoiceNumber} - ${s.buyerName}` }))}
                      value={form.invoiceNumber}
                      onChange={handleInvoiceSelect}
                      placeholder="Search Invoice Number..."
                      emptyPlaceholder="No matching invoice found"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Shop Name / Buyer Name</label>
                    <input type="text" value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} placeholder="Customer or Shop Name..."
                      className="w-full h-[42px] px-4 py-2 border border-slate-200 dark:border-[#334155] rounded-xl text-sm bg-white dark:bg-[#1E293B] focus:ring-2 focus:ring-red-500 focus:outline-none" />
                  </div>
                </>
              ) : (
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Customer Ref / Name (Optional)</label>
                  <input type="text" value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} placeholder="Reference details..."
                    className="w-full h-[42px] px-4 py-2 border border-slate-200 dark:border-[#334155] rounded-xl text-sm bg-white dark:bg-[#1E293B] focus:ring-2 focus:ring-red-500 focus:outline-none" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Return Transaction Date *</label>
                <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full h-[42px] px-3 py-2 border border-slate-200 dark:border-[#334155] rounded-xl text-xs bg-white dark:bg-[#1E293B] focus:ring-2 focus:ring-red-500 focus:outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Inspection Notes / Overall Remarks</label>
                <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Return sign-off remarks..."
                  className="w-full h-[42px] px-4 py-2 border border-slate-200 dark:border-[#334155] rounded-xl text-sm bg-white dark:bg-[#1E293B] focus:ring-2 focus:ring-red-500 focus:outline-none" />
              </div>
            </div>

            {/* Dynamic returns items table */}
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b border-slate-150 dark:border-slate-800 pb-2">
                <h4 className="text-xs font-extrabold uppercase text-[#EF4444] tracking-wider flex items-center gap-1.5">
                  <Layers size={14} /> Returns items matrix
                </h4>
                <button type="button" onClick={addRow}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg text-[10px] font-bold transition-all">
                  <Plus size={10} /> Add Product Row
                </button>
              </div>

              {/* Items grid */}
              <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1 scrollbar-thin">
                {form.items.map((item, idx) => {
                  return (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end p-4 border border-slate-150 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-[#0F172A]/30">
                      {/* Product Selector */}
                      <div className="space-y-1 md:col-span-4">
                        <label className="text-[9px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">Product Name *</label>
                        <SearchableSelect
                          options={products.map(p => ({ value: p.id, label: `${p.name} (${p.sku || 'No SKU'})` }))}
                          value={item.productId}
                          onChange={(val) => updateItemField(idx, 'productId', val)}
                          placeholder="Select Product..."
                        />
                      </div>

                      {/* SKU & Category display */}
                      <div className="grid grid-cols-2 gap-2 md:col-span-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider block">SKU</label>
                          <input type="text" disabled value={item.sku || ''} className="w-full h-[42px] px-3 py-2 border border-slate-200 dark:border-[#334155] rounded-xl text-xs bg-slate-50 dark:bg-slate-800 text-slate-450 dark:text-slate-400 cursor-not-allowed" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider block">Category</label>
                          <input type="text" disabled value={item.category || ''} className="w-full h-[42px] px-3 py-2 border border-slate-200 dark:border-[#334155] rounded-xl text-xs bg-slate-50 dark:bg-slate-800 text-slate-450 dark:text-slate-400 cursor-not-allowed" />
                        </div>
                      </div>

                      {/* Qty */}
                      <div className="space-y-1 md:col-span-1.5">
                        <label className="text-[9px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider flex justify-between items-center">
                          <span>Qty *</span>
                          {item.maxQty < 99999 && <span className="text-[8px] text-red-500 font-bold shrink-0">max {item.maxQty}</span>}
                        </label>
                        <input type="number" required min="1" max={item.maxQty} value={item.qty} onChange={(e) => updateItemField(idx, 'qty', e.target.value)}
                          className="w-full h-[42px] px-3 py-2 border border-slate-200 dark:border-[#334155] rounded-xl text-xs bg-white dark:bg-[#1E293B] focus:outline-none" />
                      </div>

                      {/* Condition */}
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[9px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider">Condition *</label>
                        <select required value={item.condition} onChange={(e) => updateItemField(idx, 'condition', e.target.value)}
                          className="w-full h-[42px] px-2 py-2 border border-slate-200 dark:border-[#334155] rounded-xl text-xs bg-white dark:bg-[#1E293B] focus:outline-none">
                          <option value="good">🟢 Good</option>
                          <option value="inspection">🟡 Review</option>
                          <option value="broken">🔴 Damaged</option>
                          <option value="scrap">⚫ Scrap</option>
                        </select>
                      </div>

                      {/* Reason */}
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[9px] font-bold text-slate-400 dark:text-slate-555 uppercase tracking-wider">Return Reason</label>
                        <select value={item.reason} onChange={(e) => updateItemField(idx, 'reason', e.target.value)}
                          className="w-full h-[42px] px-2 py-2 border border-slate-200 dark:border-[#334155] rounded-xl text-xs bg-white dark:bg-[#1E293B] focus:outline-none">
                          {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>

                      {/* Delete button */}
                      <div className="md:col-span-0.5 pb-2 text-center shrink-0">
                        <button type="button" disabled={form.items.length === 1} onClick={() => removeRow(idx)}
                          className="p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-30">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Summaries Panel */}
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-4.5 rounded-2xl space-y-4">
              <h5 className="font-extrabold text-[10px] uppercase text-[#EF4444] tracking-wider border-b border-slate-200/40 pb-1.5">Fulfillment Financial Summary</h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-white dark:bg-[#1E293B] border border-slate-150 dark:border-slate-800 rounded-xl">
                  <p className="text-slate-400 dark:text-slate-500 text-[8px] uppercase font-bold">Total Products</p>
                  <p className="font-black text-slate-800 dark:text-[#F8FAFC] text-sm mt-0.5">{formStats.totProd} SKU(s)</p>
                </div>
                <div className="p-3 bg-white dark:bg-[#1E293B] border border-slate-150 dark:border-slate-800 rounded-xl">
                  <p className="text-slate-400 dark:text-slate-500 text-[8px] uppercase font-bold">Total Units</p>
                  <p className="font-black text-slate-800 dark:text-[#F8FAFC] text-sm mt-0.5">{formStats.totQty} unit(s)</p>
                </div>
                <div className="p-3 bg-white dark:bg-[#1E293B] border border-slate-150 dark:border-slate-800 rounded-xl text-emerald-600 dark:text-emerald-450">
                  <p className="text-slate-400 dark:text-slate-500 text-[8px] uppercase font-bold">Recovery Value</p>
                  <p className="font-black text-sm mt-0.5">+{fmt(formStats.recoveryVal)}</p>
                </div>
                <div className="p-3 bg-white dark:bg-[#1E293B] border border-slate-150 dark:border-slate-800 rounded-xl text-rose-500">
                  <p className="text-slate-400 dark:text-slate-500 text-[8px] uppercase font-bold">Write-off Loss</p>
                  <p className="font-black text-sm mt-0.5">-{fmt(formStats.lossVal)}</p>
                </div>
              </div>

              <div className="flex gap-6 justify-center text-[10px] font-bold text-slate-405 pb-1">
                <span>🟢 Good: {formStats.good}</span>
                <span>🟡 Review: {formStats.review}</span>
                <span>🔴 Damaged/Scrap: {formStats.damaged}</span>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 dark:border-[#334155]">
              <button type="button" onClick={() => setShowModal(false)}
                className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-[#CBD5E1] rounded-2xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-750 transition-all">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="flex items-center justify-center gap-1.5 px-6 py-2.5 bg-[#EF4444] hover:bg-[#dc2626] text-white rounded-2xl text-xs font-bold transition-all shadow-md disabled:opacity-50">
                {saving && <Loader2 size={12} className="animate-spin" />}
                {editingReturn ? 'Save Changes' : 'Log Return'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Return Transaction Dossier details */}
      {detailsModal && (() => {
        const r = detailsModal;
        const items = r.items && r.items.length > 0 ? r.items : [{
          productId: r.productId,
          productName: r.productName || 'Unknown Product',
          qty: r.qty || 1,
          condition: r.condition || 'good',
          notes: r.notes || ''
        }];
        const vals = getReturnValues(r);

        return (
          <Modal title="Return Transaction Dossier" onClose={() => setDetailsModal(null)} maxWidth="max-w-4xl">
            <div className="space-y-6 text-xs text-slate-650 dark:text-[#CBD5E1] font-medium">
              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-4.5 rounded-2xl">
                <div>
                  <p className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[8px]">Transaction Reference</p>
                  <span className="font-extrabold text-slate-800 dark:text-[#F8FAFC] text-sm block mt-0.5">{r.id}</span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[8px]">Origin Platform</p>
                  <span className="font-black text-slate-850 dark:text-[#F8FAFC] block mt-0.5 uppercase">{r.platform}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-100/50 dark:border-[#334155]/50 space-y-2">
                  <h5 className="font-extrabold text-[10px] uppercase text-[#EF4444] tracking-wider border-b border-slate-200/40 pb-1">Ledger Parameters</h5>
                  <div className="space-y-1">
                    <p className="text-slate-450 dark:text-slate-500 text-[8px] uppercase font-bold">Source Customer / Shop</p>
                    <p className="font-bold text-slate-800 dark:text-[#F8FAFC]">{r.shopName || r.platform.toUpperCase()}</p>
                  </div>
                  {r.invoiceNumber && (
                    <div className="space-y-1">
                      <p className="text-slate-450 dark:text-slate-500 text-[8px] uppercase font-bold">Invoice Reference</p>
                      <p className="font-bold text-slate-800 dark:text-[#F8FAFC]">{r.invoiceNumber}</p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-slate-450 dark:text-slate-500 text-[8px] uppercase font-bold">Date Received</p>
                    <p className="font-bold text-slate-800 dark:text-[#F8FAFC]">{r.date}</p>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-100/50 dark:border-[#334155]/50 space-y-2 flex flex-col justify-between">
                  <div className="space-y-2">
                    <h5 className="font-extrabold text-[10px] uppercase text-[#EF4444] tracking-wider border-b border-slate-200/40 pb-1">Audit Ledger Remarks</h5>
                    <p className="text-slate-700 dark:text-[#CBD5E1] leading-relaxed italic">{r.notes || 'No overall remarks registered.'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center border-t border-slate-200/40 pt-2.5">
                    <div>
                      <p className="text-slate-450 dark:text-slate-500 text-[8px] uppercase font-bold">Recovery Stock Value</p>
                      <p className="font-bold text-emerald-600 dark:text-emerald-450 text-[11px] mt-0.5">{fmt(vals.recoveryVal)}</p>
                    </div>
                    <div>
                      <p className="text-slate-455 dark:text-slate-500 text-[8px] uppercase font-bold">Write-off Loss Value</p>
                      <p className="font-bold text-rose-600 dark:text-rose-450 text-[11px] mt-0.5">{fmt(vals.lossVal)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Dossier Grid */}
              <div className="space-y-2">
                <h5 className="font-extrabold text-[10px] uppercase text-[#EF4444] tracking-wider border-b border-slate-200/40 pb-1">Returned Items Ledger</h5>
                <div className="border border-slate-150 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-[#1E293B]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-900 font-bold uppercase text-[9px] tracking-wider border-b border-slate-150 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                      <tr>
                        <th className="px-4 py-2.5">Product Name</th>
                        <th className="px-4 py-2.5 text-center">Qty</th>
                        <th className="px-4 py-2.5">Condition</th>
                        <th className="px-4 py-2.5">Reason</th>
                        <th className="px-4 py-2.5">Item Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 dark:divide-slate-800 text-slate-650 dark:text-[#CBD5E1] font-semibold">
                      {items.map((it, idx) => {
                        const prod = products.find(p => p.id === it.productId);
                        const sku = it.sku || (prod ? prod.sku : '');
                        return (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="px-4 py-3">
                              <span className="font-bold block text-slate-800 dark:text-[#F8FAFC]">{it.productName || 'Unknown Product'}</span>
                              {sku && <span className="font-mono text-[9px] text-slate-400">SKU: {sku}</span>}
                            </td>
                            <td className="px-4 py-3 text-center font-black">{it.qty}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 text-[10px] font-bold border rounded-full ${CONDITION_COLORS[it.condition] || 'bg-slate-100 text-slate-600'}`}>
                                {CONDITION_LABELS[it.condition] || it.condition}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-rose-500 font-bold">{it.reason || 'None'}</td>
                            <td className="px-4 py-3 text-slate-450 italic">{it.notes || 'None'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-150 dark:border-[#334155] justify-end">
                <button type="button" onClick={() => setDetailsModal(null)}
                  className="px-5 py-2.5 bg-slate-800 dark:bg-slate-700 text-white rounded-2xl text-xs font-bold hover:bg-slate-900 dark:hover:bg-slate-600 transition-all">
                  Close Dossier
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}
