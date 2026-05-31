import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { 
  Plus, Trash2, X, Loader2, Search, Undo2, TrendingUp, TrendingDown,
  Percent, Calendar, IndianRupee, AlertTriangle, CheckCircle2, Filter, 
  Download, Layers, Activity, FileText, CheckSquare, Eye, Pencil, 
  ArrowLeftRight, HelpCircle, RefreshCw, PlusCircle, ShoppingBag, Store, UserCheck, Trash
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SearchableSelect from '../components/SearchableSelect';
import { useLocation } from 'react-router-dom';

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
  broken: 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50',
  scrap: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
};

const CONDITION_LABELS = {
  good: '🟢 Good Condition',
  inspection: '🟡 Inspection Required',
  broken: '🔴 Damaged',
  scrap: '⚫ Scrap / Waste',
};

const STATUS_LABELS = {
  good: { text: 'Recovered', class: 'bg-emerald-50 text-emerald-700 border-emerald-150 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50' },
  inspection: { text: 'Pending review', class: 'bg-amber-50 text-amber-700 border-amber-150 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50' },
  broken: { text: 'Disposed', class: 'bg-rose-50 text-rose-700 border-rose-150 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50' },
  scrap: { text: 'Disposed', class: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' },
};

const today = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
};

const emptyForm = () => ({ 
  productId: '', 
  platform: 'amazon', 
  shopId: '', 
  shopName: '', 
  action: 'return', 
  date: today(), 
  condition: 'good', 
  qty: '1', 
  notes: '' 
});

const emptyBulkRow = () => ({
  productId: '',
  platform: 'amazon',
  shopId: '',
  shopName: '',
  action: 'return',
  date: today(),
  condition: 'good',
  qty: '1',
  notes: ''
});

function Modal({ title, onClose, children, maxWidth = 'max-w-md' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm !m-0 animate-fadeIn">
      <div className={`bg-white dark:bg-[#1E293B] rounded-3xl shadow-2xl w-[95%] sm:w-full ${maxWidth} border border-slate-100 dark:border-[#334155] overflow-hidden transform transition-all scale-100`}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-[#334155] bg-slate-50/50 dark:bg-slate-900/50">
          <h3 className="font-bold text-slate-800 dark:text-[#F8FAFC] text-base flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
            {title}
          </h3>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 dark:text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-[#F8FAFC] transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-6 max-h-[75vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

// Custom Initial Gradient Avatar
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
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [detailsModal, setDetailsModal] = useState(null);
  const [editingReturn, setEditingReturn] = useState(null);
  
  const [form, setForm] = useState(emptyForm());
  const [bulkRows, setBulkRows] = useState([emptyBulkRow()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [bulkError, setBulkError] = useState('');
  
  // Advanced filters state
  const [search, setSearch] = useState('');
  const [filterCondition, setFilterCondition] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [filterProduct, setFilterProduct] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Dropdown options
  const [actionMenuOpen, setActionMenuOpen] = useState(null);

  useEffect(() => {
    Promise.all([api.getReturns(), api.getProducts(), api.getShops()])
      .then(([r, p, s]) => { 
        setReturns(r.reverse()); 
        setProducts(p); 
        setShops(s); 
        if (location.state?.openAddModal) {
          setForm(emptyForm());
          setEditingReturn(null);
          setError('');
          setShowModal(true);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [location.state]);

  // Helper to calculate recovery and loss values
  const getReturnValues = (r) => {
    const prod = products.find(p => p.id === r.productId);
    if (!prod) return { price: 0, cost: 0, recoveryVal: 0, lossVal: 0, sku: '' };
    
    let price = prod.unitPrice || 0;
    if (r.platform === 'amazon') price = prod.amazonPrice || prod.onlinePrice || prod.unitPrice || 0;
    else if (r.platform === 'flipkart') price = prod.flipkartPrice || prod.onlinePrice || prod.unitPrice || 0;
    else if (r.platform === 'meesho') price = prod.meeshoPrice || prod.onlinePrice || prod.unitPrice || 0;
    else if (r.platform === 'shop') price = prod.offlinePrice || prod.unitPrice || 0;

    const cost = prod.costPrice || prod.offlinePrice || prod.unitPrice || 0;
    const qty = Number(r.qty) || 1;
    
    return {
      price,
      cost,
      sku: prod.sku || '',
      recoveryVal: r.condition === 'good' ? (price * qty) : 0,
      lossVal: (r.condition === 'broken' || r.condition === 'scrap') ? (cost * qty) : 0
    };
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (editingReturn) {
        // Edit Return Simulation: Delete first, then create new to ensure consistent stock adjustments
        await api.deleteReturn(editingReturn.id);
        const ret = await api.addReturn(form);
        
        // Local state updates
        setReturns((rs) => rs.map(r => r.id === editingReturn.id ? ret : r));
        
        // Readjust stock logic locally for old return
        let oldQty = Number(editingReturn.qty) || 1;
        let newQty = Number(form.qty) || 1;
        
        setProducts((ps) => ps.map((p) => {
          let updatedP = { ...p };
          // Remove old return stock impact
          if (editingReturn.condition === 'good' && editingReturn.action !== 'replace') {
            updatedP.availableQty -= oldQty;
            updatedP.totalQty -= oldQty;
          }
          // Add new return stock impact
          if (form.condition === 'good' && form.action !== 'replace') {
            updatedP.availableQty += newQty;
            updatedP.totalQty += newQty;
          }
          return updatedP;
        }));
        
        setEditingReturn(null);
      } else {
        // Log new return
        const ret = await api.addReturn(form);
        setReturns((rs) => [ret, ...rs]);
        
        if (form.condition === 'good' && form.action !== 'replace') {
          const q = Number(form.qty) || 1;
          setProducts((ps) => ps.map((p) =>
            p.id === form.productId ? { ...p, availableQty: p.availableQty + q, totalQty: p.totalQty + q } : p
          ));
        }
      }
      setShowModal(false);
      setForm(emptyForm());
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleBulkSubmit(e) {
    e.preventDefault();
    const validRows = bulkRows.filter(r => r.productId && r.qty);
    if (validRows.length === 0) {
      setBulkError('Please log at least one return.');
      return;
    }
    setSaving(true); setBulkError('');
    try {
      const addedReturns = [];
      for (const row of validRows) {
        const ret = await api.addReturn(row);
        addedReturns.push(ret);
        
        // Stock adjustment locally
        if (row.condition === 'good' && row.action !== 'replace') {
          const q = Number(row.qty) || 1;
          setProducts((ps) => ps.map((p) =>
            p.id === row.productId ? { ...p, availableQty: p.availableQty + q, totalQty: p.totalQty + q } : p
          ));
        }
      }
      setReturns((rs) => [...addedReturns, ...rs]);
      setShowBulkModal(false);
      setBulkRows([emptyBulkRow()]);
    } catch (err) {
      setBulkError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this return record? Inventory stock will be adjusted.')) return;
    const ret = returns.find((r) => r.id === id);
    await api.deleteReturn(id);
    setReturns((rs) => rs.filter((r) => r.id !== id));
    
    if (ret?.condition === 'good' && ret?.action !== 'replace') {
      const q = Number(ret.qty) || 1;
      setProducts((ps) => ps.map((p) =>
        p.id === ret.productId ? { ...p, availableQty: p.availableQty - q, totalQty: p.totalQty - q } : p
      ));
    }
    setActionMenuOpen(null);
  }

  // Quick state mutations (Convert to Stock, Mark Damaged)
  async function handleConvertCondition(r, targetCondition) {
    try {
      setLoading(true);
      // Simulate state update via Delete + Add
      await api.deleteReturn(r.id);
      
      const updatedPayload = {
        productId: r.productId,
        platform: r.platform,
        shopId: r.shopId || '',
        shopName: r.shopName || '',
        action: r.action || 'return',
        date: r.date,
        condition: targetCondition,
        qty: String(r.qty || 1),
        notes: r.notes || `[Updated condition to ${targetCondition}]`
      };
      
      const newRet = await api.addReturn(updatedPayload);
      setReturns((rs) => rs.map(item => item.id === r.id ? newRet : item));
      
      // Stock calculations adjust
      const q = Number(r.qty) || 1;
      setProducts((ps) => ps.map((p) => {
        if (p.id !== r.productId) return p;
        let updatedP = { ...p };
        // If changing FROM good to something else
        if (r.condition === 'good' && r.action !== 'replace') {
          updatedP.availableQty -= q;
          updatedP.totalQty -= q;
        }
        // If changing TO good
        if (targetCondition === 'good' && r.action !== 'replace') {
          updatedP.availableQty += q;
          updatedP.totalQty += q;
        }
        return updatedP;
      }));
      
    } catch (err) {
      console.error(err);
      alert('Failed to update return condition: ' + err.message);
    } finally {
      setLoading(false);
      setActionMenuOpen(null);
    }
  }

  // Filter application
  const filtered = returns.filter((r) => {
    const vals = getReturnValues(r);
    
    // 1. Search text
    const matchesSearch = !search ||
      r.productName?.toLowerCase().includes(search.toLowerCase()) ||
      vals.sku?.toLowerCase().includes(search.toLowerCase()) ||
      r.platform?.toLowerCase().includes(search.toLowerCase()) ||
      (r.shopName && r.shopName.toLowerCase().includes(search.toLowerCase()));

    // 2. Condition filter
    const matchesCondition = filterCondition === 'all' || r.condition === filterCondition;

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
    const matchesProduct = filterProduct === 'all' || r.productId === filterProduct;

    // 5. Status filter
    let matchesStatus = true;
    if (filterStatus === 'recovered') matchesStatus = r.condition === 'good';
    else if (filterStatus === 'pending') matchesStatus = r.condition === 'inspection';
    else if (filterStatus === 'disposed') matchesStatus = r.condition === 'broken' || r.condition === 'scrap';

    // 6. Date Range filter
    let matchesDate = true;
    if (filterStartDate) matchesDate = matchesDate && r.date >= filterStartDate;
    if (filterEndDate) matchesDate = matchesDate && r.date <= filterEndDate;

    return matchesSearch && matchesCondition && matchesSource && matchesProduct && matchesStatus && matchesDate;
  });

  // KPI Computations based on total loaded records (or filtered depending on preference. Standard is total for overall business stats)
  const totalReturnsCount = returns.length;
  const totalReturnedUnits = returns.reduce((s, r) => s + (Number(r.qty) || 1), 0);
  const totalStockRecoveredVal = returns.reduce((s, r) => s + getReturnValues(r).recoveryVal, 0);
  const totalDamagedLossVal = returns.reduce((s, r) => s + getReturnValues(r).lossVal, 0);
  
  const goodReturnsCount = returns.filter(r => r.condition === 'good').length;
  const damagedReturnsCount = returns.filter(r => r.condition === 'broken' || r.condition === 'scrap').length;
  const pendingInspectionCount = returns.filter(r => r.condition === 'inspection').length;

  // Pie chart conic gradient helper percentages
  const totalConditionSum = (goodReturnsCount + damagedReturnsCount + pendingInspectionCount) || 1;
  const goodPct = Math.round((goodReturnsCount / totalConditionSum) * 100);
  const damagedPct = Math.round((damagedReturnsCount / totalConditionSum) * 100);
  const pendingPct = Math.round((pendingInspectionCount / totalConditionSum) * 100);

  // Return source breakdown metrics
  const sourceShopsCount = returns.filter(r => r.platform === 'shop' && r.shopName !== 'Walk-in Customer').reduce((s, r) => s + (Number(r.qty) || 1), 0);
  const sourceWalkInCount = returns.filter(r => r.platform === 'shop' && r.shopName === 'Walk-in Customer').reduce((s, r) => s + (Number(r.qty) || 1), 0);
  const sourceOnlineCount = returns.filter(r => r.platform !== 'shop').reduce((s, r) => s + (Number(r.qty) || 1), 0);
  const totalSourceUnits = (sourceShopsCount + sourceWalkInCount + sourceOnlineCount) || 1;

  // Last 30 days trend calculations
  const get30DaysTrend = () => {
    const dates = [];
    const counts = {};
    const now = new Date();
    for (let i = 14; i >= 0; i--) { // 15 points looks clean on dashboards
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      dates.push(d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }));
      counts[dateStr] = 0;
    }
    
    returns.forEach(r => {
      const formattedDate = r.date; // YYYY-MM-DD
      const nowOffset = new Date(r.date);
      const testStr = nowOffset.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      if (dates.includes(testStr)) {
        counts[testStr] = (counts[testStr] || 0) + (Number(r.qty) || 1);
      }
    });

    return dates.map(d => ({ label: d, val: counts[d] || 0 }));
  };

  const trendList = get30DaysTrend();
  const maxTrendVal = Math.max(...trendList.map(x => x.val), 1);
  const trendPoints = trendList.map((item, idx) => {
    const x = (idx / (trendList.length - 1)) * 500;
    const y = 110 - (item.val / maxTrendVal) * 90;
    return `${x},${y}`;
  }).join(' ');

  const fillPoints = `0,120 ${trendPoints} 500,120`;

  // Bulk row helpers
  function addBulkRow() {
    setBulkRows([...bulkRows, emptyBulkRow()]);
  }

  function removeBulkRow(idx) {
    setBulkRows(bulkRows.filter((_, i) => i !== idx));
  }

  function updateBulkRow(idx, key, val) {
    setBulkRows(rows => rows.map((r, i) => {
      if (i !== idx) return r;
      const updated = { ...r, [key]: val };
      if (key === 'platform' && val === 'shop') {
        updated.shopId = '';
        updated.shopName = '';
      }
      return updated;
    }));
  }

  // Export to CSV Functionality
  const handleExportCSV = () => {
    if (filtered.length === 0) {
      alert('No return data matches the selected filters to export.');
      return;
    }
    let csvContent = 'data:text/csv;charset=utf-8,ID,Product,SKU,Platform,Source Customer,Date,Qty,Condition,Notes,Recovery Value,Loss Value\n';
    
    filtered.forEach(r => {
      const vals = getReturnValues(r);
      const sourceStr = r.platform === 'shop' ? (r.shopName || 'Shop') : r.platform.toUpperCase();
      const cleanNotes = (r.notes || '').replace(/,/g, ';').replace(/\n/g, ' ');
      csvContent += `${r.id},${r.productName},${vals.sku},${r.platform},${sourceStr},${r.date},${r.qty},${r.condition},${cleanNotes},${vals.recoveryVal},${vals.lossVal}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `returns_report_${today()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const hasActiveFilters = filterCondition !== 'all' || filterSource !== 'all' || filterProduct !== 'all' || filterStatus !== 'all' || filterStartDate !== '' || filterEndDate !== '' || search !== '';
  const resetFilters = () => {
    setFilterCondition('all');
    setFilterSource('all');
    setFilterProduct('all');
    setFilterStatus('all');
    setFilterStartDate('');
    setFilterEndDate('');
    setSearch('');
  };

  const fmt = (num) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num || 0);

  return (
    <div className="space-y-6 pb-12 relative">
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
            <p className="text-slate-500 dark:text-[#94A3B8] text-sm mt-1 font-medium">Track returned products, damaged inventory, and stock recovery</p>
          </div>
        </div>
        
        {/* Quick Actions Panel */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button 
            onClick={() => { setForm(emptyForm()); setEditingReturn(null); setError(''); setShowModal(true); }}
            className="flex items-center justify-center gap-1.5 bg-[#EF4444] hover:bg-red-600 text-white text-xs font-bold px-4.5 py-3 rounded-2xl transition-all shadow-md hover:shadow-lg hover:shadow-red-500/10"
          >
            <Plus size={14} /> Log Return
          </button>
          <button 
            onClick={() => { setBulkRows([emptyBulkRow()]); setBulkError(''); setShowBulkModal(true); }}
            className="flex items-center justify-center gap-1.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white text-xs font-bold px-4.5 py-3 rounded-2xl transition-all shadow-md hover:shadow-lg"
          >
            <PlusCircle size={14} /> Bulk Return
          </button>
          {(user?.role === 'ADMIN' || user?.role === 'admin' || user?.username === 'admin') && (
            <button 
              onClick={handleExportCSV}
              className="flex items-center justify-center gap-1.5 bg-white dark:bg-[#1E293B] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-[#F8FAFC] border border-slate-200 dark:border-[#334155] text-xs font-bold px-4.5 py-3 rounded-2xl transition-all shadow-sm hover:shadow-md"
            >
              <Download size={14} className="text-slate-500 dark:text-slate-400" /> Export Report
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Total Returns */}
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-[#334155] border-t-4 border-t-slate-500 dark:border-t-slate-400 hover:shadow-md transition-all flex flex-col justify-between h-36">
          <div className="flex justify-between items-center text-slate-400 dark:text-[#94A3B8]">
            <span className="text-xs font-bold uppercase tracking-wider block">Total Returns</span>
            <div className="p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-[#334155] rounded-lg text-slate-500 dark:text-slate-400"><Undo2 size={13} /></div>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-slate-900 dark:text-[#F8FAFC] tracking-tight">{totalReturnsCount}</p>
            <p className="text-[11px] text-slate-400 dark:text-[#94A3B8] font-semibold mt-1">Logs registered</p>
          </div>
        </div>

        {/* Returned Units */}
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-[#334155] border-t-4 border-t-indigo-500 dark:border-t-indigo-400 hover:shadow-md transition-all flex flex-col justify-between h-36">
          <div className="flex justify-between items-center text-slate-400 dark:text-[#94A3B8]">
            <span className="text-xs font-bold uppercase tracking-wider block">Returned Units</span>
            <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/30 rounded-lg text-indigo-500 dark:text-indigo-400"><Layers size={13} /></div>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-slate-900 dark:text-[#F8FAFC] tracking-tight">{totalReturnedUnits}</p>
            <p className="text-[11px] text-indigo-400 dark:text-indigo-300 font-semibold mt-1">Cumulative units</p>
          </div>
        </div>

        {/* Stock Recovered Value */}
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-[#334155] border-t-4 border-t-emerald-500 dark:border-t-emerald-400 hover:shadow-md transition-all flex flex-col justify-between h-36">
          <div className="flex justify-between items-center text-slate-400 dark:text-[#94A3B8]">
            <span className="text-xs font-bold uppercase tracking-wider block text-emerald-600 dark:text-emerald-400">Stock Recovered</span>
            <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/30 rounded-lg text-emerald-500 dark:text-emerald-400"><CheckCircle2 size={13} /></div>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight truncate" title={fmt(totalStockRecoveredVal)}>{fmt(totalStockRecoveredVal)}</p>
            <p className="text-[11px] text-emerald-500 dark:text-emerald-450 font-semibold mt-1">Sellable value</p>
          </div>
        </div>

        {/* Damaged Loss Value */}
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-[#334155] border-t-4 border-t-rose-500 dark:border-t-rose-400 hover:shadow-md transition-all flex flex-col justify-between h-36">
          <div className="flex justify-between items-center text-slate-400 dark:text-[#94A3B8]">
            <span className="text-xs font-bold uppercase tracking-wider block text-rose-600 dark:text-rose-400">Damaged Loss</span>
            <div className="p-1.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/30 rounded-lg text-rose-500 dark:text-rose-400"><AlertTriangle size={13} /></div>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-red-600 dark:text-red-400 tracking-tight truncate" title={fmt(totalDamagedLossVal)}>{fmt(totalDamagedLossVal)}</p>
            <p className="text-[11px] text-red-500 dark:text-red-400 font-semibold mt-1">Cost valuation loss</p>
          </div>
        </div>

        {/* Good Condition returns count */}
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-[#334155] border-t-4 border-t-teal-500 dark:border-t-teal-400 hover:shadow-md transition-all flex flex-col justify-between h-36">
          <div className="flex justify-between items-center text-slate-400 dark:text-[#94A3B8]">
            <span className="text-xs font-bold uppercase tracking-wider block text-teal-600 dark:text-teal-400">Good returns</span>
            <div className="p-1.5 bg-teal-50 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900/30 rounded-lg text-teal-500 dark:text-teal-400"><TrendingUp size={13} /></div>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-slate-900 dark:text-[#F8FAFC] tracking-tight">{goodReturnsCount}</p>
            <p className="text-[11px] text-teal-500 dark:text-teal-400 font-semibold mt-1">Restocked immediately</p>
          </div>
        </div>

        {/* Damaged Returns Count */}
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-[#334155] border-t-4 border-t-amber-500 dark:border-t-amber-400 hover:shadow-md transition-all flex flex-col justify-between h-36">
          <div className="flex justify-between items-center text-slate-400 dark:text-[#94A3B8]">
            <span className="text-xs font-bold uppercase tracking-wider block text-amber-600 dark:text-amber-400">Damaged returns</span>
            <div className="p-1.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/30 rounded-lg text-amber-500 dark:text-amber-400"><TrendingDown size={13} /></div>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-slate-900 dark:text-[#F8FAFC] tracking-tight">{damagedReturnsCount}</p>
            <p className="text-[11px] text-amber-500 dark:text-amber-400 font-semibold mt-1">Unusable/Scrapped</p>
          </div>
        </div>
      </div>

      {/* Analytics Visualization Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Area Chart */}
        <div className="bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-slate-200 dark:border-[#334155] shadow-sm flex flex-col justify-between h-[230px]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-[#F8FAFC] text-xl tracking-tight">Returns Trend</h3>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1 font-medium">Returned units timeline (Last 15 Days)</p>
            </div>
            <Activity size={16} className="text-red-500 animate-pulse" />
          </div>

          <div className="relative mt-2 flex-1 flex items-end">
            <svg viewBox="0 0 500 120" className="w-full h-[110px] overflow-visible">
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity="0.25"/>
                  <stop offset="100%" stopColor="#EF4444" stopOpacity="0.0"/>
                </linearGradient>
              </defs>
              {/* Fill Area */}
              <polygon points={fillPoints} fill="url(#areaGrad)" />
              {/* Stroke line */}
              <polyline points={trendPoints} fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              {/* Grid line guideline */}
              <line x1="0" y1="110" x2="500" y2="110" stroke="#f1f5f9" className="stroke-slate-100 dark:stroke-slate-800" strokeWidth="1" strokeDasharray="3" />
            </svg>
          </div>
          
          <div className="flex justify-between text-[11px] font-bold text-slate-400 dark:text-[#94A3B8] px-1 pt-1.5 border-t border-slate-100 dark:border-[#334155]">
            <span>{trendList[0]?.label}</span>
            <span>{trendList[Math.floor(trendList.length/2)]?.label}</span>
            <span>{trendList[trendList.length - 1]?.label}</span>
          </div>
        </div>

        {/* Source breakdown chart */}
        <div className="bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-slate-200 dark:border-[#334155] shadow-sm flex flex-col justify-between h-[230px]">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-[#F8FAFC] text-xl tracking-tight">Return Source Share</h3>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1 font-medium">Breakdown of return origins by quantity</p>
          </div>

          <div className="space-y-3.5 my-auto">
            {/* Shops */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-[#CBD5E1]">
                <span className="flex items-center gap-1 font-semibold">🏪 Registered Shops</span>
                <span className="font-bold text-slate-700 dark:text-[#F8FAFC]">{sourceShopsCount} units ({Math.round(sourceShopsCount/totalSourceUnits * 100)}%)</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div style={{ width: `${(sourceShopsCount/totalSourceUnits)*100}%` }} className="h-full bg-indigo-600 rounded-full" />
              </div>
            </div>
            {/* Walk-in */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-[#CBD5E1]">
                <span className="flex items-center gap-1 font-semibold">👤 Walk-in Customers</span>
                <span className="font-bold text-slate-700 dark:text-[#F8FAFC]">{sourceWalkInCount} units ({Math.round(sourceWalkInCount/totalSourceUnits * 100)}%)</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div style={{ width: `${(sourceWalkInCount/totalSourceUnits)*100}%` }} className="h-full bg-amber-550 rounded-full" />
              </div>
            </div>
            {/* Online orders */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-[#CBD5E1]">
                <span className="flex items-center gap-1 font-semibold">📦 Online Platforms</span>
                <span className="font-bold text-slate-700 dark:text-[#F8FAFC]">{sourceOnlineCount} units ({Math.round(sourceOnlineCount/totalSourceUnits * 100)}%)</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div style={{ width: `${(sourceOnlineCount/totalSourceUnits)*100}%` }} className="h-full bg-[#EF4444] rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Condition Pie chart */}
        <div className="bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-slate-200 dark:border-[#334155] shadow-sm flex flex-col justify-between h-[230px]">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-[#F8FAFC] text-xl tracking-tight">Quality Breakdown</h3>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1 font-medium">Return log condition segments</p>
          </div>

          <div className="flex items-center justify-between gap-5 my-auto">
            {/* Circular representation */}
            <div className="relative w-28 h-28 flex items-center justify-center rounded-full border border-slate-50 dark:border-slate-800/50 flex-shrink-0"
              style={{
                background: `conic-gradient(
                  #10b981 0% ${goodPct}%, 
                  #f59e0b ${goodPct}% ${goodPct + pendingPct}%, 
                  #f43f5e ${goodPct + pendingPct}% 100%
                )`
              }}
            >
              <div className="w-20 h-20 rounded-full bg-white dark:bg-[#1E293B] flex flex-col items-center justify-center shadow-inner">
                <span className="text-[10px] font-bold text-slate-400 dark:text-[#94A3B8] block uppercase">Cleared</span>
                <span className="text-base font-black text-slate-800 dark:text-[#F8FAFC]">{goodPct}%</span>
              </div>
            </div>

            {/* Labels */}
            <div className="flex-1 space-y-1.5 text-[11px] font-semibold text-slate-600 dark:text-[#CBD5E1]">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block"></span> Good Condition</span>
                <span className="text-slate-800 dark:text-[#F8FAFC]">{goodReturnsCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block"></span> Inspected / Review</span>
                <span className="text-slate-800 dark:text-[#F8FAFC]">{pendingInspectionCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-rose-500 inline-block"></span> Damaged / Scrap</span>
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
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search product, platform, or shop…"
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
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Product SKU</label>
            <select value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-xs bg-slate-50/50 dark:bg-[#0F172A]/50 hover:bg-white dark:hover:bg-[#0F172A] focus:outline-none focus:ring-2 focus:ring-red-500 transition-all font-medium text-slate-700 dark:text-[#F8FAFC]">
              <option value="all" className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">🏷️ All Products</option>
              {products.map(p => (
                <option key={p.id} value={p.id} className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">{p.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-xs bg-slate-50/50 dark:bg-[#0F172A]/50 hover:bg-white dark:hover:bg-[#0F172A] focus:outline-none focus:ring-2 focus:ring-red-500 transition-all font-medium text-slate-700 dark:text-[#F8FAFC]">
              <option value="all" className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">🛡️ All Statuses</option>
              <option value="recovered" className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">Recovered</option>
              <option value="pending" className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">Pending review</option>
              <option value="disposed" className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">Disposed</option>
            </select>
          </div>
        </div>

        {/* Date Ranges sub row */}
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
              ⚡ Showing {filtered.length} of {returns.length} return logs matching filters.
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
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-[#334155] rounded-2xl flex items-center justify-center text-slate-300 dark:text-slate-655 shadow-inner mb-4">
              <Undo2 size={28} />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-[#F8FAFC] text-sm">No return records matched</h3>
            <p className="text-slate-400 dark:text-[#94A3B8] text-xs mt-1 max-w-xs">Verify your search strings or select other filter dimensions.</p>
            {hasActiveFilters && (
              <button onClick={resetFilters} className="mt-4 px-4 py-2 border border-slate-200 dark:border-[#334155] text-xs font-bold text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all">
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4.5">
            {filtered.map((r) => {
              const vals = getReturnValues(r);
              const status = STATUS_LABELS[r.condition] || { text: 'Unknown', class: 'bg-slate-100 text-slate-600 border-slate-200' };
              const isActionOpen = actionMenuOpen === r.id;

              return (
                <div 
                  key={r.id}
                  className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-[#334155] hover:border-slate-300 dark:hover:border-slate-500 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4 select-none relative"
                >
                  {/* Left segment: Product Identity */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-[280px]">
                    <ProductThumbnail name={r.productName} />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-800 dark:text-[#F8FAFC] tracking-tight">{r.productName}</span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-[#334155] rounded font-mono">{vals.sku || 'No SKU'}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 dark:text-[#94A3B8] font-medium flex items-center gap-1">
                        <Calendar size={11} /> Return Date: {r.date}
                      </p>
                    </div>
                  </div>

                  {/* Center segment: Source and quantities */}
                  <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[220px]">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-[#94A3B8] block uppercase">Source</span>
                        {r.platform === 'shop' ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${r.shopName === 'Walk-in Customer' ? 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200/60 dark:border-slate-700/60' : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-150 dark:border-indigo-900/40'}`}>
                            {r.shopName === 'Walk-in Customer' ? '👤 Walk-in' : `🏪 ${r.shopName}`}
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border uppercase bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-350 border-rose-150 dark:border-rose-900/40`}>
                            🌐 {r.platform}
                          </span>
                        )}
                        {r.action === 'replace' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40 rounded">
                            Replacement
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-[#94A3B8] font-bold">
                        <span>Qty: <span className="text-slate-800 dark:text-[#F8FAFC] font-black">{r.qty || 1} units</span></span>
                        {r.condition === 'good' ? (
                          <span className="text-emerald-600 dark:text-emerald-450 flex items-center gap-0.5">Recovered: <span className="font-extrabold">{fmt(vals.recoveryVal)}</span></span>
                        ) : (
                          <span className="text-rose-505 dark:text-rose-450 flex items-center gap-0.5">Loss: <span className="font-extrabold">{fmt(vals.lossVal)}</span></span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right segment: Condition and actions */}
                  <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-3.5 md:pt-0 border-slate-50 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 text-[11px] font-extrabold border rounded-full capitalize ${CONDITION_COLORS[r.condition] || 'bg-slate-100 text-slate-600'}`}>
                        {CONDITION_LABELS[r.condition] || r.condition}
                      </span>
                      <span className={`px-2.5 py-1 text-[11px] font-bold border rounded-full ${status.class}`}>
                        {status.text}
                      </span>
                    </div>

                    {/* Action buttons list */}
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => setDetailsModal(r)}
                        title="View Details"
                        className="p-2 rounded-xl text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-[#F8FAFC] transition-colors"
                      >
                        <Eye size={14} />
                      </button>
                      
                      {/* Context actions toggler */}
                      <div className="relative">
                        <button 
                          onClick={() => setActionMenuOpen(isActionOpen ? null : r.id)}
                          className="p-2 rounded-xl text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-[#F8FAFC] transition-colors font-black text-xs"
                        >
                          <Pencil size={14} />
                        </button>
                        
                        {isActionOpen && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setActionMenuOpen(null)} />
                            <div className="absolute right-0 bottom-full mb-2 sm:bottom-auto sm:top-full sm:mt-2 w-48 bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-[#334155] rounded-2xl shadow-xl z-20 py-2 text-xs font-bold text-slate-600 dark:text-[#CBD5E1] animate-fadeIn">
                              <button 
                                onClick={() => {
                                  setForm({
                                    productId: r.productId,
                                    platform: r.platform,
                                    shopId: r.shopId || '',
                                    shopName: r.shopName || '',
                                    action: r.action || 'return',
                                    date: r.date,
                                    condition: r.condition,
                                    qty: String(r.qty || 1),
                                    notes: r.notes || ''
                                  });
                                  setEditingReturn(r);
                                  setError('');
                                  setActionMenuOpen(null);
                                  setShowModal(true);
                                }}
                                className="w-full px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-[#F8FAFC] transition-colors text-left flex items-center gap-2"
                              >
                                <Pencil size={12} /> Edit Details
                              </button>
                              
                              {r.condition !== 'good' && (
                                <button 
                                  onClick={() => handleConvertCondition(r, 'good')}
                                  className="w-full px-4 py-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors text-left flex items-center gap-2 border-t border-slate-50 dark:border-[#334155]"
                                >
                                  <CheckSquare size={12} className="text-emerald-500" /> Convert to Stock
                                </button>
                              )}
                              
                              {r.condition !== 'broken' && (
                                <button 
                                  onClick={() => handleConvertCondition(r, 'broken')}
                                  className="w-full px-4 py-2.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-700 dark:hover:text-rose-400 transition-colors text-left flex items-center gap-2 border-t border-slate-50 dark:border-[#334155]"
                                >
                                  <AlertTriangle size={12} className="text-rose-500" /> Mark Damaged
                                </button>
                              )}

                              <button 
                                onClick={() => handleDelete(r.id)}
                                disabled={user?.role === 'EMPLOYEE'}
                                className="w-full px-4 py-2.5 hover:bg-rose-100 dark:hover:bg-rose-955/35 hover:text-red-750 dark:hover:text-red-400 text-red-600 dark:text-red-400 transition-colors text-left flex items-center gap-2 border-t border-slate-50 dark:border-[#334155] disabled:opacity-40"
                              >
                                <Trash size={12} /> Delete Record
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* View Details Modal */}
      {detailsModal && (() => {
        const r = detailsModal;
        const vals = getReturnValues(r);
        const status = STATUS_LABELS[r.condition] || { text: 'Unknown', class: 'bg-slate-100 text-slate-600 border-slate-200' };
        
        return (
          <Modal title="Return Transaction Details" onClose={() => setDetailsModal(null)}>
            <div className="space-y-5 text-xs text-slate-650 dark:text-[#CBD5E1] font-medium">
              <div className="flex items-center gap-3.5 border-b border-slate-100 dark:border-[#334155] pb-4">
                <ProductThumbnail name={r.productName} />
                <div className="space-y-0.5">
                  <h4 className="font-extrabold text-slate-800 dark:text-[#F8FAFC] text-sm">{r.productName}</h4>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-[#334155] px-1.5 py-0.2 font-mono inline-block">SKU: {vals.sku || 'No SKU'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl border border-slate-100/50 dark:border-[#334155]/50">
                  <p className="font-bold text-slate-455 dark:text-slate-500 uppercase tracking-wider text-[9px] mb-1">Return Origin Source</p>
                  {r.platform === 'shop' ? (
                    <span className="font-extrabold text-slate-700 dark:text-[#F8FAFC] block text-xs">🏪 {r.shopName || 'Shop'}</span>
                  ) : (
                    <span className="font-extrabold text-slate-700 dark:text-[#F8FAFC] block text-xs uppercase">📦 {r.platform} Order</span>
                  )}
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl border border-slate-100/50 dark:border-[#334155]/50">
                  <p className="font-bold text-slate-455 dark:text-slate-500 uppercase tracking-wider text-[9px] mb-1">Return Date</p>
                  <span className="font-extrabold text-slate-700 dark:text-[#F8FAFC] block text-xs">{r.date}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl border border-slate-100/50 dark:border-[#334155]/50">
                  <p className="font-bold text-slate-455 dark:text-slate-500 uppercase tracking-wider text-[9px] mb-1">Returned Units</p>
                  <span className="font-black text-slate-800 dark:text-[#F8FAFC] text-sm block">{r.qty || 1} units</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl border border-slate-100/50 dark:border-[#334155]/50">
                  <p className="font-bold text-slate-455 dark:text-slate-500 uppercase tracking-wider text-[9px] mb-1">Quality Inspection State</p>
                  <span className={`px-2.5 py-0.5 border rounded-full text-[10px] font-bold inline-block mt-0.5 ${CONDITION_COLORS[r.condition]}`}>
                    {CONDITION_LABELS[r.condition]}
                  </span>
                </div>
              </div>

              {/* Financial calculations */}
              <div className="bg-slate-50 dark:bg-slate-800 border border-slate-100/80 dark:border-[#334155]/80 p-4.5 rounded-2xl space-y-3.5 shadow-inner">
                <h5 className="font-extrabold text-slate-700 dark:text-[#CBD5E1] text-[10px] uppercase tracking-wider border-b border-slate-100 dark:border-[#334155] pb-1.5">Stock Recovery & Impact</h5>
                
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-350">
                  <span>Stock Valuation Impact:</span>
                  {r.condition === 'good' ? (
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-450 flex items-center gap-0.5"><TrendingUp size={11} /> +{r.qty || 1} units restored</span>
                  ) : (
                    <span className="font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-0.5"><TrendingDown size={11} /> 0 units sellable impact</span>
                  )}
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-200/50 dark:border-slate-700/50 text-xs font-bold">
                  {r.condition === 'good' ? (
                    <>
                      <span className="text-slate-500 dark:text-slate-400 uppercase text-[9px]">Recovery Valuation:</span>
                      <span className="text-emerald-700 dark:text-emerald-450 text-sm font-black">{fmt(vals.recoveryVal)}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-slate-500 dark:text-slate-400 uppercase text-[9px]">Loss Write-off (Cost):</span>
                      <span className="text-rose-600 dark:text-rose-450 text-sm font-black">{fmt(vals.lossVal)}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Reason / Notes */}
              <div className="space-y-1 bg-amber-50/55 dark:bg-amber-955/20 p-3.5 border border-amber-100/50 dark:border-amber-900/30 rounded-2xl">
                <p className="font-extrabold text-amber-800 dark:text-amber-400 text-[9px] uppercase tracking-wider">Return Inspection Notes / Remarks</p>
                <p className="text-amber-900 dark:text-amber-300 leading-relaxed font-medium mt-1">{r.notes || 'No custom inspection notes entered.'}</p>
              </div>

              <div className="flex gap-3.5 pt-3 border-t border-slate-100 dark:border-[#334155]">
                {r.condition !== 'good' && (
                  <button 
                    onClick={() => { handleConvertCondition(r, 'good'); setDetailsModal(null); }}
                    className="flex-1 py-2.5 bg-emerald-600 dark:bg-emerald-700 hover:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all text-center flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <CheckSquare size={13} /> Restore to Sellable
                  </button>
                )}
                <button 
                  onClick={() => setDetailsModal(null)}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-[#334155] hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-500 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-white text-xs font-bold rounded-xl transition-all text-center"
                >
                  Close Details
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* Log Return / Edit Return Modal */}
      {showModal && (
        <Modal 
          title={editingReturn ? 'Edit Return Ledger entry' : 'Log Returned Product'} 
          onClose={() => setShowModal(false)}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Platform selection */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Return Source Category *</label>
              <div className="grid grid-cols-2 gap-2">
                {PLATFORMS.map((p) => (
                  <button 
                    key={p} 
                    type="button" 
                    onClick={() => {
                      setForm((f) => ({ ...f, platform: p, shopId: '', shopName: '' }));
                    }}
                    className={`py-2 rounded-xl text-xs font-bold capitalize border transition-all text-center ${
                      form.platform === p
                        ? 'bg-red-50 dark:bg-red-950/40 text-red-650 dark:text-red-400 border-red-200 dark:border-red-900/50'
                        : 'border-slate-200 dark:border-[#334155] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-[#1E293B]'
                    }`}
                  >
                    {PLATFORM_LABELS[p] || p}
                  </button>
                ))}
              </div>
            </div>

            {/* Shop dropdown selection */}
            {form.platform === 'shop' && (
              <div className="space-y-4 bg-slate-50/50 dark:bg-slate-800/50 p-4 border border-slate-200/50 dark:border-[#334155]/50 rounded-2xl">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Return Customer Origin *</label>
                  <select 
                    required 
                    value={form.shopId || ''} 
                    onChange={(e) => {
                      if (e.target.value === 'walk-in') {
                        setForm((f) => ({ ...f, shopId: 'walk-in', shopName: 'Walk-in Customer' }));
                      } else {
                        const sName = shops.find(s => s.id === e.target.value)?.name || '';
                        setForm((f) => ({ ...f, shopId: e.target.value, shopName: sName }));
                      }
                    }}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 font-medium text-slate-700 dark:text-[#F8FAFC] bg-white dark:bg-[#0F172A]"
                  >
                    <option value="" className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">Select Customer / Shop…</option>
                    <option value="walk-in" className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">👤 Walk-in Customer (No profile)</option>
                    {shops.map((s) => (
                      <option key={s.id} value={s.id} className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">🏪 {s.name} {s.mobile ? `(${s.mobile})` : ''}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Stock action *</label>
                  <div className="flex gap-4 text-xs font-semibold text-slate-600 dark:text-slate-350">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="action" value="return" checked={form.action === 'return' || !form.action} 
                        onChange={() => setForm(f => ({ ...f, action: 'return' }))} 
                        className="text-red-650 dark:text-red-550 focus:ring-red-500 dark:bg-[#0F172A] dark:border-[#334155]" />
                      Return (Restock good units)
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="action" value="replace" checked={form.action === 'replace'} 
                        onChange={() => setForm(f => ({ ...f, action: 'replace' }))} 
                        className="text-red-650 dark:text-red-550 focus:ring-red-500 dark:bg-[#0F172A] dark:border-[#334155]" />
                      Replace (No stock restock)
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Product selection */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Select Product *</label>
              <SearchableSelect
                required
                value={form.productId}
                onChange={(val) => setForm((f) => ({ ...f, productId: val }))}
                placeholder="Choose returned model SKU…"
                options={products.map((p) => ({ value: p.id, label: `${p.name} (SKU: ${p.sku})` }))}
                className="w-full"
              />
            </div>

            {/* Date and Qty */}
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Return Date *</label>
                <input type="date" required value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-600 dark:text-[#F8FAFC] bg-white dark:bg-[#0F172A]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Returned Qty *</label>
                <input type="number" min="1" required value={form.qty} onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 text-center text-slate-750 dark:text-[#F8FAFC] font-extrabold bg-white dark:bg-[#0F172A]" placeholder="1" />
              </div>
            </div>

            {/* Condition Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Product Condition *</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'good', label: '🟢 Good (Restock)', color: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50' },
                  { id: 'inspection', label: '🟡 Review / Queue', color: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/50' },
                  { id: 'broken', label: '🔴 Damaged / Loss', color: 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/50' },
                  { id: 'scrap', label: '⚫ Scrap (Trash)', color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700' }
                ].map((c) => (
                  <button 
                    key={c.id} 
                    type="button" 
                    onClick={() => setForm((f) => ({ ...f, condition: c.id }))}
                    className={`py-2.5 rounded-xl border text-center font-bold transition-all ${
                      form.condition === c.id
                        ? `${c.color} border-transparent`
                        : 'border-slate-200 dark:border-[#334155] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850 bg-white dark:bg-[#1E293B]'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Remarks / Inspection Notes</label>
              <textarea rows={2.5} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC]"
                placeholder="Type down reason for returns, inspection results..." />
            </div>

            {error && <p className="text-sm text-red-505 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-3 py-2.5 rounded-xl border border-red-200 dark:border-red-900/40">{error}</p>}

            <div className="flex gap-4 pt-3 border-t border-slate-100 dark:border-[#334155]">
              <button type="button" onClick={() => setShowModal(false)}
                className="flex-1 py-3 border border-slate-200 dark:border-[#334155] rounded-xl text-sm font-semibold text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors">Cancel</button>
              <button type="submit" disabled={saving}
                className="flex-1 py-3 bg-[#EF4444] hover:bg-red-600 disabled:opacity-60 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md">
                {saving && <Loader2 size={14} className="animate-spin" />} {editingReturn ? 'Save Changes' : 'Submit Return Log'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Bulk Return entry modal */}
      {showBulkModal && (
        <Modal 
          title="Batch Log Multiple Returns" 
          onClose={() => setShowBulkModal(false)}
          maxWidth="max-w-4xl"
        >
          <form onSubmit={handleBulkSubmit} className="space-y-4">
            <div className="overflow-x-auto border border-slate-100 dark:border-[#334155] rounded-2xl max-h-[350px]">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800 font-extrabold uppercase text-slate-500 dark:text-[#CBD5E1] sticky top-0 z-15 border-b dark:border-b-[#334155]">
                  <tr>
                    <th className="px-4 py-3 min-w-[200px]">Product SKU *</th>
                    <th className="px-4 py-3 min-w-[150px]">Category / Platform *</th>
                    <th className="px-4 py-3 min-w-[120px]">Qty & Date *</th>
                    <th className="px-4 py-3 min-w-[140px]">Condition *</th>
                    <th className="px-4 py-3 min-w-[150px]">Notes</th>
                    <th className="px-4 py-3 text-right">Remove</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#334155] font-semibold text-slate-650 dark:text-[#CBD5E1] bg-white dark:bg-[#1E293B]">
                  {bulkRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <td className="px-3 py-3">
                        <SearchableSelect
                          required
                          value={row.productId}
                          onChange={(val) => updateBulkRow(idx, 'productId', val)}
                          placeholder="Select product…"
                          options={products.map((p) => ({ value: p.id, label: p.name }))}
                          className="w-full"
                        />
                      </td>
                      <td className="px-3 py-3 space-y-2">
                        <select 
                          value={row.platform} 
                          onChange={(e) => updateBulkRow(idx, 'platform', e.target.value)}
                          className="w-full px-2 py-2 border border-slate-200 dark:border-[#334155] rounded-xl text-xs bg-white dark:bg-[#0F172A] font-medium text-slate-700 dark:text-[#F8FAFC]"
                        >
                          {PLATFORMS.map(p => (
                            <option key={p} value={p} className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">{p.toUpperCase()}</option>
                          ))}
                        </select>
                        {row.platform === 'shop' && (
                          <select 
                            required 
                            value={row.shopId || ''} 
                            onChange={(e) => {
                              if (e.target.value === 'walk-in') {
                                updateBulkRow(idx, 'shopId', 'walk-in');
                                updateBulkRow(idx, 'shopName', 'Walk-in Customer');
                              } else {
                                const sName = shops.find(s => s.id === e.target.value)?.name || '';
                                updateBulkRow(idx, 'shopId', e.target.value);
                                updateBulkRow(idx, 'shopName', sName);
                              }
                            }}
                            className="w-full px-2 py-2 border border-slate-200 dark:border-[#334155] rounded-xl text-[11px] bg-white dark:bg-[#0F172A] font-medium text-slate-700 dark:text-[#F8FAFC]"
                          >
                            <option value="" className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">Select customer…</option>
                            <option value="walk-in" className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">👤 Walk-in Customer</option>
                            {shops.map(s => (
                              <option key={s.id} value={s.id} className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">🏪 {s.name}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-3 py-3 space-y-1.5">
                        <input 
                          type="number" 
                          min="1" 
                          required 
                          value={row.qty} 
                          onChange={(e) => updateBulkRow(idx, 'qty', e.target.value)}
                          className="w-full px-2 py-2 border border-slate-200 dark:border-[#334155] rounded-xl text-center font-bold text-slate-700 dark:text-[#F8FAFC] bg-white dark:bg-[#0F172A]" 
                          placeholder="Qty" 
                        />
                        <input 
                          type="date" 
                          required 
                          value={row.date} 
                          onChange={(e) => updateBulkRow(idx, 'date', e.target.value)}
                          className="w-full px-2 py-2 border border-slate-200 dark:border-[#334155] rounded-xl text-[10px] text-slate-500 dark:text-slate-400 font-semibold bg-white dark:bg-[#0F172A]" 
                        />
                      </td>
                      <td className="px-3 py-3">
                        <select 
                          value={row.condition} 
                          onChange={(e) => updateBulkRow(idx, 'condition', e.target.value)}
                          className="w-full px-2 py-2 border border-slate-200 dark:border-[#334155] rounded-xl text-xs bg-white dark:bg-[#0F172A] font-medium text-slate-700 dark:text-[#F8FAFC]"
                        >
                          <option value="good" className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">🟢 Good (Restocks)</option>
                          <option value="inspection" className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">🟡 Inspection</option>
                          <option value="broken" className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">🔴 Damaged</option>
                          <option value="scrap" className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">⚫ Scrap</option>
                        </select>
                      </td>
                      <td className="px-3 py-3">
                        <textarea 
                          rows={2} 
                          value={row.notes} 
                          onChange={(e) => updateBulkRow(idx, 'notes', e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-[#334155] rounded-xl text-[11px] resize-none bg-white dark:bg-[#0F172A] text-slate-700 dark:text-[#F8FAFC] font-medium" 
                          placeholder="Optional remarks" 
                        />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button 
                          type="button" 
                          onClick={() => removeBulkRow(idx)}
                          disabled={bulkRows.length <= 1}
                          className="p-2 rounded-xl text-slate-400 dark:text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-450 transition-colors disabled:opacity-40"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between mt-2 pt-2">
              <button 
                type="button" 
                onClick={addBulkRow}
                className="flex items-center gap-1.5 text-red-600 dark:text-[#EF4444] hover:text-red-750 dark:hover:text-red-405 text-xs font-bold transition-colors"
              >
                <PlusCircle size={15} /> Add Another Return Row
              </button>
            </div>

            {bulkError && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 px-3 py-2.5 rounded-xl border border-red-200 dark:border-red-900/40">{bulkError}</p>}

            <div className="flex gap-4 pt-3 border-t border-slate-100 dark:border-[#334155]">
              <button type="button" onClick={() => setShowBulkModal(false)}
                className="flex-1 py-3 border border-slate-200 dark:border-[#334155] rounded-xl text-sm font-semibold text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors">Cancel</button>
              <button type="submit" disabled={saving}
                className="flex-1 py-3 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 disabled:opacity-60 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md">
                {saving && <Loader2 size={14} className="animate-spin" />} Bulk Submit Logs
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
