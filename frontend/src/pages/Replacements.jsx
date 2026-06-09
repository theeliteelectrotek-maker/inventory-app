import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import SearchableSelect from '../components/SearchableSelect';
import {
  Plus, Trash2, X, Loader2, Search, ArrowLeftRight, TrendingUp, TrendingDown,
  Calendar, IndianRupee, AlertTriangle, CheckCircle2, Filter, Download,
  Layers, Activity, FileText, CheckSquare, Eye, Pencil, RefreshCw,
  PlusCircle, Building2, User, Clock, Truck, ShieldAlert, AlertCircle, XCircle
} from 'lucide-react';

const REASONS = [
  'Manufacturing Defect',
  'Physical Damage During Transit',
  'Wrong Product Delivered',
  'Quality Issue',
  'Warranty Claim',
  'Other'
];

const CONDITIONS = [
  'Unused',
  'Used',
  'Damaged',
  'Defective',
  'Customer Complaint'
];

const STATUSES = [
  'Pending',
  'Under Review',
  'Approved',
  'Rejected',
  'Dispatched',
  'Completed'
];

const STATUS_COLORS = {
  'Pending': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  'Under Review': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Approved': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'Rejected': 'bg-rose-500/10 text-rose-450 border-rose-500/20',
  'Dispatched': 'bg-indigo-500/10 text-indigo-405 border-indigo-500/20',
  'Completed': 'bg-teal-500/10 text-teal-400 border-teal-500/20'
};

const REASON_COLORS = [
  '#dc2626', // Red
  '#4f46e5', // Indigo
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#8b5cf6', // Violet
  '#64748b'  // Slate
];

const today = () => {
  const d = new Date();
  return d.toISOString().split('T')[0];
};

const emptyForm = () => ({
  shopId: '',
  shopName: '',
  contactPerson: '',
  mobile: '',
  cityState: '',
  dealerCode: '',
  productId: '',
  productName: '',
  productCategory: 'General',
  sku: '',
  batchNumber: '',
  qty: '1',
  invoiceNumber: '',
  invoiceDate: '',
  reason: REASONS[0],
  condition: CONDITIONS[0],
  productImages: [],
  invoiceCopy: [],
  damageProof: [],
  additionalDocs: [],
  status: 'Pending',
  approvalRemarks: '',
  approvedBy: '',
  dispatchDate: '',
  trackingNumber: '',
  courierPartner: '',
  productValue: 0,
  replacementCost: 0,
  recoveryAmount: 0,
  netLoss: 0
});

function Modal({ title, onClose, children, maxWidth = 'max-w-2xl' }) {
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
        <div className="px-6 py-6 max-h-[78vh] overflow-y-auto scrollbar-thin">{children}</div>
      </div>
    </div>
  );
}

function ProductThumbnail({ name }) {
  const initial = name ? name.charAt(0).toUpperCase() : 'R';
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    'from-rose-500 to-red-600 text-rose-50 border-rose-400/20',
    'from-blue-600 to-indigo-700 text-blue-50 border-blue-400/20',
    'from-amber-500 to-orange-600 text-amber-50 border-amber-400/20',
    'from-emerald-500 to-teal-600 text-emerald-50 border-emerald-400/20',
    'from-purple-650 to-violet-800 text-purple-50 border-purple-400/20'
  ];
  const colorClass = colors[Math.abs(hash) % colors.length];

  return (
    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center text-sm font-black shadow-sm border flex-shrink-0`}>
      {initial}
    </div>
  );
}

export default function Replacements() {
  const { user } = useAuth();
  const [replacements, setReplacements] = useState([]);
  const [products, setProducts] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [detailsModal, setDetailsModal] = useState(null);
  const [editingRequest, setEditingRequest] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [previewImage, setPreviewImage] = useState(null);

  // Filters state
  const [search, setSearch] = useState('');
  const [filterShop, setFilterShop] = useState('all');
  const [filterProduct, setFilterProduct] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterReason, setFilterReason] = useState('all');
  const [filterBatch, setFilterBatch] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.getReplacements ? api.getReplacements() : Promise.resolve([]),
      api.getProducts(),
      api.getShops()
    ])
      .then(([reps, prods, shps]) => {
        setReplacements(reps.reverse());
        setProducts(prods);
        setShops(shps);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleShopSelect = (shopId) => {
    const selectedShop = shops.find(s => s.id === shopId);
    if (selectedShop) {
      setForm(prev => ({
        ...prev,
        shopId: selectedShop.id,
        shopName: selectedShop.name,
        mobile: selectedShop.mobile || '',
        contactPerson: selectedShop.ownerName || '',
        cityState: selectedShop.address || '',
        dealerCode: selectedShop.gstNumber || ''
      }));
    }
  };

  useEffect(() => {
    const selectedProd = products.find(p => p.id === form.productId);
    const costPrice = selectedProd ? (selectedProd.costPrice || selectedProd.offlinePrice || 0) : 0;
    const qtyNum = Number(form.qty) || 0;
    const calculatedCost = costPrice * qtyNum;
    
    setForm(prev => {
      if (prev.replacementCost !== calculatedCost) {
        return {
          ...prev,
          replacementCost: calculatedCost,
          netLoss: calculatedCost - (prev.recoveryAmount || 0)
        };
      }
      return prev;
    });
  }, [form.productId, form.qty, products]);

  const handleProductSelect = (productId) => {
    const selectedProd = products.find(p => p.id === productId);
    if (selectedProd) {
      setForm(prev => ({
        ...prev,
        productId: selectedProd.id,
        productName: selectedProd.name,
        sku: selectedProd.sku || '',
        productCategory: selectedProd.category || 'General',
        productValue: selectedProd.offlinePrice || selectedProd.unitPrice || 0
      }));
    }
  };

  const handleFileChange = (e, field) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(prev => ({
          ...prev,
          [field]: [...prev[field], reader.result]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeEvidenceFile = (field, index) => {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const handleFinanceChange = (field, value) => {
    const val = Number(value) || 0;
    setForm(prev => {
      const updated = { ...prev, [field]: val };
      updated.netLoss = updated.replacementCost - updated.recoveryAmount;
      return updated;
    });
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      let finalForm = { ...form };
      finalForm.netLoss = finalForm.replacementCost - finalForm.recoveryAmount;

      if (editingRequest) {
        const updated = await api.updateReplacement(editingRequest.id, finalForm);
        setReplacements(prev => prev.map(r => r.id === editingRequest.id ? updated : r));
      } else {
        const created = await api.addReplacement(finalForm);
        setReplacements(prev => [created, ...prev]);
      }
      setShowModal(false);
      setForm(emptyForm());
      setEditingRequest(null);
      // Re-fetch to sync updated product stocks
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to save replacement request');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this replacement record? Product inventory will be automatically restored.')) return;
    try {
      await api.deleteReplacement(id);
      setReplacements(prev => prev.filter(r => r.id !== id));
      fetchData();
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  }

  // Filter Logic
  const filtered = replacements.filter(r => {
    const matchesSearch = !search ||
      r.shopName?.toLowerCase().includes(search.toLowerCase()) ||
      r.productName?.toLowerCase().includes(search.toLowerCase()) ||
      r.sku?.toLowerCase().includes(search.toLowerCase()) ||
      r.dealerCode?.toLowerCase().includes(search.toLowerCase()) ||
      r.trackingNumber?.toLowerCase().includes(search.toLowerCase());

    const matchesShop = filterShop === 'all' || r.shopId === filterShop;
    const matchesProduct = filterProduct === 'all' || r.productId === filterProduct;
    const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
    const matchesReason = filterReason === 'all' || r.reason === filterReason;
    const matchesBatch = !filterBatch || r.batchNumber?.toLowerCase().includes(filterBatch.toLowerCase());

    let matchesDate = true;
    if (filterStartDate) matchesDate = matchesDate && r.date >= filterStartDate;
    if (filterEndDate) matchesDate = matchesDate && r.date <= filterEndDate;

    return matchesSearch && matchesShop && matchesProduct && matchesStatus && matchesReason && matchesBatch && matchesDate;
  });

  // KPI calculations
  const totalClaims = replacements.length;
  const pendingRequests = replacements.filter(r => r.status === 'Pending' || r.status === 'Under Review').length;
  const approvedRequests = replacements.filter(r => r.status === 'Approved').length;
  const rejectedRequests = replacements.filter(r => r.status === 'Rejected').length;
  const totalValue = replacements.reduce((sum, r) => sum + (r.productValue * (r.qty || 1)), 0);
  
  const completedRequests = replacements.filter(r => r.status === 'Completed' || r.status === 'Dispatched').length;
  const completionRate = totalClaims > 0 ? Math.round((completedRequests / totalClaims) * 100) : 0;

  // Monthly trends (Last 6 Months)
  const getMonthlyTrend = () => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const trend = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      trend.push({
        key: mKey,
        label: `${monthNames[d.getMonth()]} ${d.getFullYear().toString().substring(2)}`,
        count: 0,
        value: 0
      });
    }

    replacements.forEach(r => {
      if (r.date) {
        const yrMth = r.date.substring(0, 7); // YYYY-MM
        const found = trend.find(t => t.key === yrMth);
        if (found) {
          found.count += 1;
          found.value += (r.productValue * r.qty);
        }
      }
    });
    return trend;
  };

  const trendData = getMonthlyTrend();
  const maxCount = Math.max(...trendData.map(t => t.count), 1);
  const trendPoints = trendData.map((item, idx) => {
    const x = (idx / (trendData.length - 1)) * 400 + 50;
    const y = 140 - (item.count / maxCount) * 100;
    return `${x},${y}`;
  }).join(' ');

  const fillPoints = `50,140 ${trendPoints} 450,140`;

  // Source breakdown (Reasons)
  const getReasonBreakdown = () => {
    const breakdown = REASONS.map(r => ({ name: r, count: 0, percentage: 0 }));
    replacements.forEach(rep => {
      const found = breakdown.find(b => b.name === rep.reason);
      if (found) found.count += 1;
    });
    const total = replacements.length || 1;
    breakdown.forEach(b => {
      b.percentage = Math.round((b.count / total) * 100);
    });
    return breakdown.sort((a, b) => b.count - a.count);
  };

  const reasonStats = getReasonBreakdown();
  
  // Pie chart conic gradient calculation
  let gradientStopSum = 0;
  const conicGradientStops = reasonStats.map((stat, idx) => {
    const start = gradientStopSum;
    gradientStopSum += stat.percentage;
    return `${REASON_COLORS[idx % REASON_COLORS.length]} ${start}% ${gradientStopSum}%`;
  }).join(', ');

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      alert('No replacement records to export.');
      return;
    }
    let csv = 'data:text/csv;charset=utf-8,ID,Date,Shop Name,Dealer Code,Product Name,SKU,Batch Number,Qty,Reason,Condition,Status,Product Value,Replacement Cost,Recovery Amount,Net Loss,Courier Partner,Tracking Number\n';
    filtered.forEach(r => {
      const shopClean = r.shopName.replace(/,/g, ';');
      const prodClean = r.productName.replace(/,/g, ';');
      csv += `${r.id},${r.date},${shopClean},${r.dealerCode || ''},${prodClean},${r.sku || ''},${r.batchNumber || ''},${r.qty},${r.reason},${r.condition},${r.status},${r.productValue},${r.replacementCost},${r.recoveryAmount},${r.netLoss},${r.courierPartner || ''},${r.trackingNumber || ''}\n`;
    });
    const encoded = encodeURI(csv);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `replacements_report_${today()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const hasActiveFilters = filterShop !== 'all' || filterProduct !== 'all' || filterStatus !== 'all' || filterReason !== 'all' || filterBatch !== '' || filterStartDate !== '' || filterEndDate !== '' || search !== '';
  const resetFilters = () => {
    setFilterShop('all');
    setFilterProduct('all');
    setFilterStatus('all');
    setFilterReason('all');
    setFilterBatch('');
    setFilterStartDate('');
    setFilterEndDate('');
    setSearch('');
  };

  const fmt = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val || 0);

  const productSelectOptions = products.map(p => ({ value: p.id, label: `${p.name} (${p.sku || 'No SKU'})` }));
  const shopSelectOptions = shops.map(s => ({ value: s.id, label: s.name }));

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
              Replacement claims
            </h1>
            <p className="text-slate-500 dark:text-[#94A3B8] text-sm mt-1 font-medium">Track product replacements, dealer warranty claims, and fulfillment lifecycles</p>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => { setForm(emptyForm()); setEditingRequest(null); setError(''); setShowModal(true); }}
            className="flex items-center justify-center gap-1.5 bg-[#EF4444] hover:bg-red-600 text-white text-xs font-bold px-5 py-3 rounded-2xl transition-all shadow-md hover:shadow-lg hover:shadow-red-500/10 whitespace-nowrap"
          >
            <Plus size={14} /> Log Replacement
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-1.5 bg-white dark:bg-[#1E293B] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-[#F8FAFC] border border-slate-200 dark:border-[#334155] text-xs font-bold px-5 py-3 rounded-2xl transition-all shadow-sm hover:shadow-md whitespace-nowrap"
          >
            <Download size={14} className="text-slate-500 dark:text-slate-400" /> Export CSV
          </button>
        </div>
      </div>

      {/* Top Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Total Claims */}
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-[#334155] border-t-4 border-t-slate-500 dark:border-t-slate-400 flex flex-col justify-between h-32">
          <div className="flex justify-between items-center text-slate-400 dark:text-[#94A3B8]">
            <span className="text-[10px] font-bold uppercase tracking-wider block">Total Claims</span>
            <div className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg"><ArrowLeftRight size={12} /></div>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-slate-900 dark:text-[#F8FAFC] tracking-tight">{totalClaims}</p>
            <p className="text-[10px] text-slate-400 dark:text-[#94A3B8] font-semibold mt-1">Logged requests</p>
          </div>
        </div>

        {/* Pending Claims */}
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-[#334155] border-t-4 border-t-amber-500 dark:border-t-amber-500 flex flex-col justify-between h-32">
          <div className="flex justify-between items-center text-slate-400 dark:text-[#94A3B8]">
            <span className="text-[10px] font-bold uppercase tracking-wider block text-amber-500">Pending Review</span>
            <div className="p-1.5 bg-amber-50 dark:bg-amber-950/20 rounded-lg text-amber-500"><Clock size={12} /></div>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-slate-900 dark:text-[#F8FAFC] tracking-tight">{pendingRequests}</p>
            <p className="text-[10px] text-amber-500 font-semibold mt-1">Awaiting approval</p>
          </div>
        </div>

        {/* Approved Claims */}
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-[#334155] border-t-4 border-t-emerald-500 dark:border-t-emerald-500 flex flex-col justify-between h-32">
          <div className="flex justify-between items-center text-slate-400 dark:text-[#94A3B8]">
            <span className="text-[10px] font-bold uppercase tracking-wider block text-emerald-500">Approved claims</span>
            <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg text-emerald-500"><CheckCircle2 size={12} /></div>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-slate-900 dark:text-[#F8FAFC] tracking-tight">{approvedRequests}</p>
            <p className="text-[10px] text-emerald-500 font-semibold mt-1">Ready for dispatch</p>
          </div>
        </div>

        {/* Rejected Claims */}
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-[#334155] border-t-4 border-t-rose-500 dark:border-t-rose-500 flex flex-col justify-between h-32">
          <div className="flex justify-between items-center text-slate-400 dark:text-[#94A3B8]">
            <span className="text-[10px] font-bold uppercase tracking-wider block text-rose-500">Rejected claims</span>
            <div className="p-1.5 bg-rose-50 dark:bg-rose-950/20 rounded-lg text-rose-500"><XCircle size={12} /></div>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-slate-900 dark:text-[#F8FAFC] tracking-tight">{rejectedRequests}</p>
            <p className="text-[10px] text-rose-500 font-semibold mt-1">Disallowed claims</p>
          </div>
        </div>

        {/* Net Value */}
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-[#334155] border-t-4 border-t-indigo-500 dark:border-t-indigo-500 flex flex-col justify-between h-32">
          <div className="flex justify-between items-center text-slate-400 dark:text-[#94A3B8]">
            <span className="text-[10px] font-bold uppercase tracking-wider block text-indigo-500">Claim Value</span>
            <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg text-indigo-500"><IndianRupee size={12} /></div>
          </div>
          <div>
            <p className="text-xl font-extrabold text-slate-900 dark:text-[#F8FAFC] tracking-tight truncate" title={fmt(totalValue)}>{fmt(totalValue)}</p>
            <p className="text-[10px] text-indigo-400 font-semibold mt-1">Product retail value</p>
          </div>
        </div>

        {/* Completion Rate */}
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-[#334155] border-t-4 border-t-teal-500 dark:border-t-teal-500 flex flex-col justify-between h-32">
          <div className="flex justify-between items-center text-slate-400 dark:text-[#94A3B8]">
            <span className="text-[10px] font-bold uppercase tracking-wider block text-teal-500">Fulfillment Rate</span>
            <div className="p-1.5 bg-teal-50 dark:bg-teal-950/20 rounded-lg text-teal-500"><TrendingUp size={12} /></div>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-slate-900 dark:text-[#F8FAFC] tracking-tight">{completionRate}%</p>
            <p className="text-[10px] text-teal-500 font-semibold mt-1">Dispatched/Completed</p>
          </div>
        </div>
      </div>

      {/* Telemetry Analytics Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Area Chart */}
        <div className="bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-slate-200 dark:border-[#334155] shadow-sm flex flex-col justify-between h-[230px]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-[#F8FAFC] text-lg tracking-tight">Replacement Trends</h3>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5 font-medium">Claims timeline count (Last 6 Months)</p>
            </div>
            <Activity size={16} className="text-red-500 animate-pulse" />
          </div>

          <div className="relative mt-2 flex-1 flex items-end">
            <svg viewBox="0 0 500 150" className="w-full h-[100px] overflow-visible">
              <defs>
                <linearGradient id="repAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity="0.25"/>
                  <stop offset="100%" stopColor="#EF4444" stopOpacity="0.0"/>
                </linearGradient>
              </defs>
              <polygon points={`50,140 ${trendPoints} 450,140`} fill="url(#repAreaGrad)" />
              <polyline points={trendPoints} fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="50" y1="140" x2="450" y2="140" stroke="#f1f5f9" className="stroke-slate-150 dark:stroke-slate-800" strokeWidth="1" strokeDasharray="3" />
            </svg>
          </div>

          <div className="flex justify-between text-[10px] font-bold text-slate-400 dark:text-[#94A3B8] px-2 pt-1 border-t border-slate-100 dark:border-[#334155]">
            {trendData.map((t, i) => (
              <span key={i} className="text-center">{t.label}</span>
            ))}
          </div>
        </div>

        {/* Reason Share Pie Chart */}
        <div className="bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-slate-200 dark:border-[#334155] shadow-sm flex flex-col justify-between h-[230px]">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-[#F8FAFC] text-lg tracking-tight">Reason breakdown</h3>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5 font-medium">Claims classification breakdown share</p>
          </div>

          {replacements.length === 0 ? (
            <div className="text-center py-6 text-slate-400 dark:text-[#94A3B8] text-xs">No claims statistics available.</div>
          ) : (
            <div className="flex items-center justify-between gap-4 my-auto">
              <div className="relative w-24 h-24 flex items-center justify-center rounded-full border border-slate-50 dark:border-slate-800/50 flex-shrink-0"
                style={{
                  background: `conic-gradient(${conicGradientStops})`
                }}
              >
                <div className="w-18 h-18 rounded-full bg-white dark:bg-[#1E293B] flex flex-col items-center justify-center shadow-inner">
                  <span className="text-[9px] font-bold text-slate-400 dark:text-[#94A3B8] block uppercase">Claims</span>
                  <span className="text-sm font-black text-slate-800 dark:text-[#F8FAFC]">{totalClaims}</span>
                </div>
              </div>

              <div className="flex-1 space-y-1 text-[10px] font-semibold text-slate-650 dark:text-[#CBD5E1] max-h-[120px] overflow-y-auto pr-1 scrollbar-thin">
                {reasonStats.map((stat, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 truncate">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: REASON_COLORS[idx % REASON_COLORS.length] }}></span>
                      <span className="truncate">{stat.name}</span>
                    </span>
                    <span className="text-slate-800 dark:text-[#F8FAFC] shrink-0">{stat.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Financial Loss Impact */}
        <div className="bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-slate-200 dark:border-[#334155] shadow-sm flex flex-col justify-between h-[230px]">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-[#F8FAFC] text-lg tracking-tight">ERP Financial Summary</h3>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5 font-medium">Claims financial losses & recovery amounts</p>
          </div>

          <div className="space-y-3.5 my-auto">
            {/* Total Replacement Costs */}
            <div className="flex justify-between items-center text-xs font-semibold text-slate-600 dark:text-[#CBD5E1]">
              <span className="flex items-center gap-1">💸 Total Replacement Cost</span>
              <span className="font-bold text-slate-700 dark:text-[#F8FAFC]">{fmt(replacements.reduce((sum, r) => sum + r.replacementCost, 0))}</span>
            </div>
            {/* Total Recoveries */}
            <div className="flex justify-between items-center text-xs font-semibold text-slate-600 dark:text-[#CBD5E1] pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="flex items-center gap-1">🛡️ Salvage/Recovery Value</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-450">{fmt(replacements.reduce((sum, r) => sum + r.recoveryAmount, 0))}</span>
            </div>
            {/* Net Adjustment Loss */}
            <div className="flex justify-between items-center text-xs font-extrabold text-rose-600 dark:text-rose-400 pt-2.5 border-t border-slate-150 dark:border-slate-800">
              <span className="flex items-center gap-1">⚠️ Net Adjustment Loss</span>
              <span className="text-sm font-black">{fmt(replacements.reduce((sum, r) => sum + r.netLoss, 0))}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <div className="bg-white/95 dark:bg-[#1E293B]/95 backdrop-blur-sm border border-slate-200/50 dark:border-[#334155]/50 p-6 rounded-3xl shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#334155] pb-3">
          <span className="text-xs font-bold text-slate-700 dark:text-[#F8FAFC] uppercase tracking-wider flex items-center gap-1.5">
            <Filter size={14} className="text-slate-400 dark:text-slate-500" /> Filter & Search Claims
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
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search shop, product SKU, tracking…"
                className="w-full pl-8 pr-3 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-xs bg-slate-50/50 dark:bg-[#0F172A]/50 hover:bg-white dark:hover:bg-[#0F172A] focus:outline-none focus:ring-2 focus:ring-red-500 transition-all font-medium text-slate-700 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-500" />
            </div>
          </div>

          {/* Shop Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Shop Name</label>
            <select value={filterShop} onChange={(e) => setFilterShop(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-xs bg-slate-50/50 dark:bg-[#0F172A]/50 hover:bg-white dark:hover:bg-[#0F172A] focus:outline-none focus:ring-2 focus:ring-red-500 transition-all font-medium text-slate-700 dark:text-[#F8FAFC]">
              <option value="all" className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">🏪 All Shops</option>
              {shops.map(s => <option key={s.id} value={s.id} className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">{s.name}</option>)}
            </select>
          </div>

          {/* Product Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Product Name</label>
            <select value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-xs bg-slate-50/50 dark:bg-[#0F172A]/50 hover:bg-white dark:hover:bg-[#0F172A] focus:outline-none focus:ring-2 focus:ring-red-500 transition-all font-medium text-slate-700 dark:text-[#F8FAFC]">
              <option value="all" className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">🏷️ All Products</option>
              {products.map(p => <option key={p.id} value={p.id} className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">{p.name}</option>)}
            </select>
          </div>

          {/* Status Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Workflow Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-xs bg-slate-50/50 dark:bg-[#0F172A]/50 hover:bg-white dark:hover:bg-[#0F172A] focus:outline-none focus:ring-2 focus:ring-red-500 transition-all font-medium text-slate-700 dark:text-[#F8FAFC]">
              <option value="all" className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">🛡️ All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s} className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">{s}</option>)}
            </select>
          </div>

          {/* Reason Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Claim Reason</label>
            <select value={filterReason} onChange={(e) => setFilterReason(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-xs bg-slate-50/50 dark:bg-[#0F172A]/50 hover:bg-white dark:hover:bg-[#0F172A] focus:outline-none focus:ring-2 focus:ring-red-500 transition-all font-medium text-slate-700 dark:text-[#F8FAFC]">
              <option value="all" className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">🔍 All Reasons</option>
              {REASONS.map(r => <option key={r} value={r} className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">{r}</option>)}
            </select>
          </div>
        </div>

        {/* Sub Row: Dates & Batch Numbers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-[#334155]">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Batch Number</label>
            <input type="text" value={filterBatch} onChange={(e) => setFilterBatch(e.target.value)} placeholder="e.g. BATCH-2026..."
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-xs bg-slate-50/50 dark:bg-[#0F172A]/50 hover:bg-white dark:hover:bg-[#0F172A] text-slate-650 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-red-500 transition-all placeholder-slate-400 dark:placeholder-slate-550 font-medium" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Start Date</label>
            <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-xs bg-slate-50/50 dark:bg-[#0F172A]/50 hover:bg-white dark:hover:bg-[#0F172A] text-slate-650 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-red-500" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">End Date</label>
            <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-xs bg-slate-50/50 dark:bg-[#0F172A]/50 hover:bg-white dark:hover:bg-[#0F172A] text-slate-650 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-red-500" />
          </div>
        </div>

        {filtered.length !== replacements.length && (
          <div className="text-[11px] font-bold text-red-650 dark:text-red-400 pt-1">
            ⚡ Showing {filtered.length} of {replacements.length} replacement requests matching criteria.
          </div>
        )}
      </div>

      {/* Main List Container */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-[#334155] rounded-3xl">
            <Loader2 size={32} className="animate-spin text-red-650 dark:text-[#EF4444]" />
            <p className="text-xs font-bold text-slate-400 dark:text-[#94A3B8] mt-3">Fetching replacement claims...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-[#334155] rounded-3xl shadow-sm">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-[#334155] rounded-2xl flex items-center justify-center text-slate-350 dark:text-slate-500 mb-4">
              <ArrowLeftRight size={28} />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-[#F8FAFC] text-sm">No replacement claims matched</h3>
            <p className="text-slate-450 dark:text-[#94A3B8] text-xs mt-1 max-w-xs">Verify your search strings or select other filter options.</p>
            {hasActiveFilters && (
              <button onClick={resetFilters} className="mt-4 px-4 py-2 border border-slate-200 dark:border-[#334155] text-xs font-bold text-slate-655 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all">
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filtered.map(r => {
              const statusColor = STATUS_COLORS[r.status] || 'bg-slate-100 text-slate-600 border-slate-200';
              return (
                <div key={r.id} className="bg-white dark:bg-[#1E293B] border border-slate-100 dark:border-[#334155] hover:border-slate-300 dark:hover:border-slate-500 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4 relative">
                  {/* Product Details */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-[280px]">
                    <ProductThumbnail name={r.productName} />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-800 dark:text-[#F8FAFC] tracking-tight">{r.productName}</span>
                        {r.sku && <span className="text-[9px] px-1.5 py-0.2 bg-slate-50 dark:bg-slate-800 text-slate-550 dark:text-slate-400 border border-slate-150 dark:border-slate-800 rounded font-mono font-bold uppercase">{r.sku}</span>}
                      </div>
                      <p className="text-[10px] text-slate-400 dark:text-[#94A3B8] font-semibold flex items-center gap-1">
                        <Calendar size={11} /> Date: {r.date || r.createdAt?.split('T')[0]} · Qty: <span className="text-slate-800 dark:text-slate-250 font-bold">{r.qty}</span>
                      </p>
                    </div>
                  </div>

                  {/* Shop Details */}
                  <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[200px]">
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-555 block uppercase tracking-wider">Shop Name</span>
                      <span className="font-bold text-slate-700 dark:text-[#CBD5E1] text-xs flex items-center gap-1.5">
                        <Building2 size={12} className="text-slate-400" /> {r.shopName}
                      </span>
                    </div>
                  </div>

                  {/* Reason & Value */}
                  <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[180px]">
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-555 block uppercase tracking-wider">Claim / Cost</span>
                      <div className="text-xs text-slate-500 dark:text-[#94A3B8] font-bold">
                        <span className="text-slate-650 dark:text-[#F8FAFC]">{r.reason}</span>
                        <span className="block text-[11px] font-bold text-rose-500/90 mt-0.5">Cost: {fmt(r.replacementCost)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status & Actions */}
                  <div className="flex items-center justify-between md:justify-end gap-3.5 border-t md:border-t-0 pt-3 md:pt-0 border-slate-50 dark:border-slate-800 shrink-0">
                    <span className={`px-2.5 py-1 text-[10px] font-extrabold border rounded-full capitalize ${statusColor}`}>
                      {r.status}
                    </span>

                    <div className="flex items-center gap-1">
                      <button onClick={() => setDetailsModal(r)} title="View Details"
                        className="p-2 rounded-xl text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-850 hover:text-slate-700 dark:hover:text-[#F8FAFC] transition-all">
                        <Eye size={14} />
                      </button>

                      <button onClick={() => { setForm(r); setEditingRequest(r); setError(''); setShowModal(true); }} title="Edit Claim"
                        className="p-2 rounded-xl text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-850 hover:text-slate-700 dark:hover:text-[#F8FAFC] transition-all">
                        <Pencil size={14} />
                      </button>

                      <button onClick={() => handleDelete(r.id)} disabled={user?.role === 'EMPLOYEE'} title="Delete Claim"
                        className="p-2 rounded-xl text-slate-400 dark:text-slate-555 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-650 dark:hover:text-rose-400 transition-all disabled:opacity-30">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Log/Edit Replacement Modal */}
      {showModal && (
        <Modal title={editingRequest ? "Edit Replacement Request" : "Log New Replacement Request"} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-6 text-slate-700 dark:text-[#CBD5E1]">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl p-3.5 text-xs font-bold flex items-center gap-2">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            {/* Shop Details */}
            <div className="space-y-3.5 border-b border-slate-150 dark:border-slate-850 pb-5">
              <h4 className="text-xs font-extrabold uppercase text-[#EF4444] tracking-wider flex items-center gap-1.5">
                <Building2 size={14} /> 1. Customer & Shop Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Select Existing Shop (Auto-fills details)</label>
                  <SearchableSelect
                    options={shopSelectOptions}
                    value={form.shopId}
                    onChange={handleShopSelect}
                    placeholder="Search/Select Registered Shop..."
                    emptyPlaceholder="No matching shops found"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Shop/Customer Name *</label>
                  <input type="text" required value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} placeholder="Enter Shop or Customer Name..."
                    className="w-full h-[42px] px-4 py-2 border border-slate-200 dark:border-[#334155] rounded-xl text-sm bg-white dark:bg-[#1E293B] focus:ring-2 focus:ring-red-500 focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Contact Person</label>
                  <input type="text" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} placeholder="Owner or manager name..."
                    className="w-full h-[42px] px-4 py-2 border border-slate-200 dark:border-[#334155] rounded-xl text-sm bg-white dark:bg-[#1E293B] focus:ring-2 focus:ring-red-500 focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Mobile Number</label>
                  <input type="text" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} placeholder="10 digit mobile..."
                    className="w-full h-[42px] px-4 py-2 border border-slate-200 dark:border-[#334155] rounded-xl text-sm bg-white dark:bg-[#1E293B] focus:ring-2 focus:ring-red-500 focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">City / State</label>
                  <input type="text" value={form.cityState} onChange={(e) => setForm({ ...form, cityState: e.target.value })} placeholder="e.g. Mumbai, Maharashtra..."
                    className="w-full h-[42px] px-4 py-2 border border-slate-200 dark:border-[#334155] rounded-xl text-sm bg-white dark:bg-[#1E293B] focus:ring-2 focus:ring-red-500 focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Dealer Code / GSTIN</label>
                  <input type="text" value={form.dealerCode} onChange={(e) => setForm({ ...form, dealerCode: e.target.value })} placeholder="GST number or dealer reference..."
                    className="w-full h-[42px] px-4 py-2 border border-slate-200 dark:border-[#334155] rounded-xl text-sm bg-white dark:bg-[#1E293B] focus:ring-2 focus:ring-red-500 focus:outline-none" />
                </div>
              </div>
            </div>

            {/* Product Details */}
            <div className="space-y-3.5 border-b border-slate-150 dark:border-slate-850 pb-5">
              <h4 className="text-xs font-extrabold uppercase text-[#EF4444] tracking-wider flex items-center gap-1.5">
                <Layers size={14} /> 2. Product Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Select Registered Product *</label>
                  <SearchableSelect
                    options={productSelectOptions}
                    value={form.productId}
                    onChange={handleProductSelect}
                    placeholder="Search/Select product SKU..."
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Category</label>
                    <input type="text" value={form.productCategory} onChange={(e) => setForm({ ...form, productCategory: e.target.value })} placeholder="Category..."
                      className="w-full h-[42px] px-4 py-2 border border-slate-200 dark:border-[#334155] rounded-xl text-sm bg-white dark:bg-[#1E293B] focus:ring-2 focus:ring-red-500 focus:outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">SKU / Code</label>
                    <input type="text" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="Product code..."
                      className="w-full h-[42px] px-4 py-2 border border-slate-200 dark:border-[#334155] rounded-xl text-sm bg-white dark:bg-[#1E293B] focus:ring-2 focus:ring-red-500 focus:outline-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Batch Number</label>
                  <input type="text" value={form.batchNumber} onChange={(e) => setForm({ ...form, batchNumber: e.target.value })} placeholder="Batch manufacturing code..."
                    className="w-full h-[42px] px-4 py-2 border border-slate-200 dark:border-[#334155] rounded-xl text-sm bg-white dark:bg-[#1E293B] focus:ring-2 focus:ring-red-500 focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Quantity *</label>
                  <input type="number" required min="1" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} placeholder="Quantity..."
                    className="w-full h-[42px] px-4 py-2 border border-slate-200 dark:border-[#334155] rounded-xl text-sm bg-white dark:bg-[#1E293B] focus:ring-2 focus:ring-red-500 focus:outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Invoice No.</label>
                    <input type="text" value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} placeholder="Inv Ref..."
                      className="w-full h-[42px] px-4 py-2 border border-slate-200 dark:border-[#334155] rounded-xl text-sm bg-white dark:bg-[#1E293B] focus:ring-2 focus:ring-red-500 focus:outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Invoice Date</label>
                    <input type="date" value={form.invoiceDate} onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })}
                      className="w-full h-[42px] px-3 py-2 border border-slate-200 dark:border-[#334155] rounded-xl text-xs bg-white dark:bg-[#1E293B] focus:ring-2 focus:ring-red-500 focus:outline-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* Reasons & Condition */}
            <div className="space-y-3.5 border-b border-slate-150 dark:border-slate-850 pb-5">
              <h4 className="text-xs font-extrabold uppercase text-[#EF4444] tracking-wider flex items-center gap-1.5">
                <AlertTriangle size={14} /> 3. Claim Parameters
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Replacement Reason *</label>
                  <select required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    className="w-full h-[42px] px-3 py-2 border border-slate-200 dark:border-[#334155] rounded-xl text-sm bg-white dark:bg-[#1E293B] focus:ring-2 focus:ring-red-500 focus:outline-none">
                    {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Product Condition *</label>
                  <select required value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}
                    className="w-full h-[42px] px-3 py-2 border border-slate-200 dark:border-[#334155] rounded-xl text-sm bg-white dark:bg-[#1E293B] focus:ring-2 focus:ring-red-500 focus:outline-none">
                    {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Documents and Evidence */}
            <div className="space-y-3.5 border-b border-slate-150 dark:border-slate-850 pb-5 text-xs">
              <h4 className="text-xs font-extrabold uppercase text-[#EF4444] tracking-wider flex items-center gap-1.5">
                <FileText size={14} /> 4. Evidence Uploads (Base64)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Images */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-150 dark:border-slate-800">
                  <label className="font-bold text-[10px] uppercase text-slate-550 dark:text-slate-400 block mb-1">Product Damage Images</label>
                  <input type="file" multiple accept="image/*" onChange={(e) => handleFileChange(e, 'productImages')} className="text-[11px] block mt-1" />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.productImages.map((img, i) => (
                      <div key={i} className="relative w-12 h-12 rounded border overflow-hidden shrink-0">
                        <img src={img} className="w-full h-full object-cover" />
                        <button type="button" onClick={() => removeEvidenceFile('productImages', i)} className="absolute top-0 right-0 p-0.5 bg-red-600 text-white rounded-bl"><X size={10} /></button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Invoice Copy */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-150 dark:border-slate-800">
                  <label className="font-bold text-[10px] uppercase text-slate-550 dark:text-slate-400 block mb-1">Invoice Copy/Bill Proof</label>
                  <input type="file" multiple accept="image/*,application/pdf" onChange={(e) => handleFileChange(e, 'invoiceCopy')} className="text-[11px] block mt-1" />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.invoiceCopy.map((img, i) => (
                      <div key={i} className="relative w-12 h-12 rounded border overflow-hidden shrink-0 bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                        {img.startsWith('data:application/pdf') ? <FileText size={16} /> : <img src={img} className="w-full h-full object-cover" />}
                        <button type="button" onClick={() => removeEvidenceFile('invoiceCopy', i)} className="absolute top-0 right-0 p-0.5 bg-red-600 text-white rounded-bl"><X size={10} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Approval and Fulfillment (Fulfillment flow details) */}
            <div className="space-y-3.5 border-b border-slate-150 dark:border-slate-850 pb-5">
              <h4 className="text-xs font-extrabold uppercase text-[#EF4444] tracking-wider flex items-center gap-1.5">
                <Truck size={14} /> 5. Approval & Fulfillment Workflow
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Workflow Status *</label>
                  <select required value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full h-[42px] px-3 py-2 border border-slate-200 dark:border-[#334155] rounded-xl text-sm bg-white dark:bg-[#1E293B] focus:ring-2 focus:ring-red-500 focus:outline-none">
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Approved By (Admin Name)</label>
                  <input type="text" value={form.approvedBy} onChange={(e) => setForm({ ...form, approvedBy: e.target.value })} placeholder="Authorized Signatory Name..."
                    className="w-full h-[42px] px-4 py-2 border border-slate-200 dark:border-[#334155] rounded-xl text-sm bg-white dark:bg-[#1E293B] focus:ring-2 focus:ring-red-500 focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Dispatch Date</label>
                  <input type="date" value={form.dispatchDate} onChange={(e) => setForm({ ...form, dispatchDate: e.target.value })}
                    className="w-full h-[42px] px-3 py-2 border border-slate-200 dark:border-[#334155] rounded-xl text-xs bg-white dark:bg-[#1E293B] focus:ring-2 focus:ring-red-500 focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Courier Partner Name</label>
                  <input type="text" value={form.courierPartner} onChange={(e) => setForm({ ...form, courierPartner: e.target.value })} placeholder="e.g. Delhivery, BlueDart, DTDC..."
                    className="w-full h-[42px] px-4 py-2 border border-slate-200 dark:border-[#334155] rounded-xl text-sm bg-white dark:bg-[#1E293B] focus:ring-2 focus:ring-red-500 focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">AWB / Tracking Number</label>
                  <input type="text" value={form.trackingNumber} onChange={(e) => setForm({ ...form, trackingNumber: e.target.value })} placeholder="Courier Tracking ID..."
                    className="w-full h-[42px] px-4 py-2 border border-slate-200 dark:border-[#334155] rounded-xl text-sm bg-white dark:bg-[#1E293B] focus:ring-2 focus:ring-red-500 focus:outline-none" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Approval / Processing Remarks</label>
                <textarea value={form.approvalRemarks} onChange={(e) => setForm({ ...form, approvalRemarks: e.target.value })} placeholder="Add audit logs or status notes..." rows="2"
                  className="w-full p-3 border border-slate-200 dark:border-[#334155] rounded-xl text-sm bg-white dark:bg-[#1E293B] focus:ring-2 focus:ring-red-500 focus:outline-none" />
              </div>
            </div>

            {/* Financial Details */}
            <div className="space-y-3.5">
              <h4 className="text-xs font-extrabold uppercase text-[#EF4444] tracking-wider flex items-center gap-1.5">
                <IndianRupee size={14} /> 6. ERP Financial Impact (INR)
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Retail Value</label>
                  <input type="number" step="0.01" min="0" value={form.productValue} onChange={(e) => handleFinanceChange('productValue', e.target.value)}
                    className="w-full h-[42px] px-4 py-2 border border-slate-200 dark:border-[#334155] rounded-xl text-sm bg-white dark:bg-[#1E293B] focus:ring-2 focus:ring-red-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Replacement Cost</label>
                  <input type="number" step="0.01" min="0" disabled value={form.replacementCost}
                    className="w-full h-[42px] px-4 py-2 border border-slate-200 dark:border-[#334155] rounded-xl text-sm bg-slate-50 dark:bg-slate-800 text-slate-550 dark:text-[#94A3B8] font-bold focus:outline-none cursor-not-allowed" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Recovery/Salvage Amount</label>
                  <input type="number" step="0.01" min="0" value={form.recoveryAmount} onChange={(e) => handleFinanceChange('recoveryAmount', e.target.value)}
                    className="w-full h-[42px] px-4 py-2 border border-slate-200 dark:border-[#334155] rounded-xl text-sm bg-white dark:bg-[#1E293B] focus:ring-2 focus:ring-red-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Net Loss/Adjustment</label>
                  <input type="number" step="0.01" min="0" disabled value={form.netLoss}
                    className="w-full h-[42px] px-4 py-2 border border-slate-200 dark:border-[#334155] rounded-xl text-sm bg-slate-50 dark:bg-slate-800 text-rose-500 font-extrabold focus:outline-none cursor-not-allowed" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 dark:border-[#334155]">
              <button type="button" onClick={() => setShowModal(false)}
                className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-[#CBD5E1] rounded-2xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="flex items-center justify-center gap-1.5 px-6 py-2.5 bg-[#EF4444] hover:bg-[#dc2626] text-white rounded-2xl text-xs font-bold transition-all shadow-md disabled:opacity-50">
                {saving && <Loader2 size={12} className="animate-spin" />}
                {editingRequest ? 'Save Changes' : 'Register replacement claim'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Claim Detail View Modal */}
      {detailsModal && (() => {
        const r = detailsModal;
        const statusColor = STATUS_COLORS[r.status] || 'bg-slate-100 text-slate-600 border-slate-200';
        return (
          <Modal title="Replacement Request Dossier" onClose={() => setDetailsModal(null)}>
            <div className="space-y-6 text-xs text-slate-650 dark:text-[#CBD5E1] font-medium">
              
              {/* Product Identity Banner */}
              <div className="flex items-center gap-3.5 border-b border-slate-100 dark:border-[#334155] pb-4">
                <ProductThumbnail name={r.productName} />
                <div className="space-y-0.5">
                  <h4 className="font-extrabold text-slate-800 dark:text-[#F8FAFC] text-sm">{r.productName}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    {r.sku && <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-[#334155] px-1.5 py-0.2 font-mono">SKU: {r.sku}</span>}
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-[#334155] px-1.5 py-0.2">Category: {r.productCategory}</span>
                  </div>
                </div>
              </div>

              {/* Status Header */}
              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl">
                <div className="space-y-1">
                  <p className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[8px]">Request Status</p>
                  <span className={`px-2.5 py-0.5 border rounded-full text-[10px] font-extrabold inline-block mt-0.5 ${statusColor}`}>
                    {r.status}
                  </span>
                </div>
                <div className="space-y-1 text-right">
                  <p className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[8px]">Replacement quantity</p>
                  <span className="font-black text-slate-800 dark:text-[#F8FAFC] text-sm block mt-0.5">{r.qty} units</span>
                </div>
              </div>

              {/* Shop & Product grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Shop Card */}
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100/50 dark:border-[#334155]/50 space-y-2">
                  <h5 className="font-extrabold text-[10px] uppercase text-[#EF4444] tracking-wider border-b border-slate-200/40 pb-1">Shop / Customer Ledger</h5>
                  <div className="space-y-1">
                    <p className="text-slate-400 dark:text-slate-500 text-[9px] uppercase font-bold">Shop Name</p>
                    <p className="font-extrabold text-slate-700 dark:text-[#F8FAFC]">{r.shopName}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <p className="text-slate-400 dark:text-slate-500 text-[9px] uppercase font-bold">Contact Person</p>
                      <p className="font-bold text-slate-700 dark:text-[#CBD5E1]">{r.contactPerson || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 dark:text-slate-500 text-[9px] uppercase font-bold">Mobile</p>
                      <p className="font-bold text-slate-700 dark:text-[#CBD5E1]">{r.mobile || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <p className="text-slate-400 dark:text-slate-500 text-[9px] uppercase font-bold">Dealer Code</p>
                      <p className="font-bold text-slate-700 dark:text-[#CBD5E1]">{r.dealerCode || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 dark:text-slate-500 text-[9px] uppercase font-bold">City/State</p>
                      <p className="font-bold text-slate-700 dark:text-[#CBD5E1]">{r.cityState || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Product Metadata */}
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100/50 dark:border-[#334155]/50 space-y-2">
                  <h5 className="font-extrabold text-[10px] uppercase text-[#EF4444] tracking-wider border-b border-slate-200/40 pb-1">Batch & Invoice Details</h5>
                  <div className="space-y-1">
                    <p className="text-slate-400 dark:text-slate-500 text-[9px] uppercase font-bold">Product Name</p>
                    <p className="font-extrabold text-slate-700 dark:text-[#F8FAFC]">{r.productName}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <p className="text-slate-400 dark:text-slate-500 text-[9px] uppercase font-bold">Batch Number</p>
                      <p className="font-bold text-slate-700 dark:text-[#CBD5E1]">{r.batchNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 dark:text-slate-500 text-[9px] uppercase font-bold">Claim Reason</p>
                      <p className="font-bold text-red-500">{r.reason}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <p className="text-slate-400 dark:text-slate-500 text-[9px] uppercase font-bold">Invoice Number</p>
                      <p className="font-bold text-slate-700 dark:text-[#CBD5E1]">{r.invoiceNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 dark:text-slate-500 text-[9px] uppercase font-bold">Invoice Date</p>
                      <p className="font-bold text-slate-700 dark:text-[#CBD5E1]">{r.invoiceDate || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Section */}
              <div className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 p-4.5 rounded-2xl space-y-3 shadow-inner">
                <h5 className="font-extrabold text-[10px] uppercase text-[#EF4444] tracking-wider border-b border-slate-200/40 pb-1.5">ERP Financial Impact & Losses</h5>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <p className="text-slate-400 dark:text-slate-500 text-[8px] uppercase font-bold">Retail Value</p>
                    <p className="font-bold text-slate-700 dark:text-[#CBD5E1] text-[11px] mt-0.5">{fmt(r.productValue)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 dark:text-slate-500 text-[8px] uppercase font-bold">Replacement Cost</p>
                    <p className="font-bold text-slate-700 dark:text-[#CBD5E1] text-[11px] mt-0.5">{fmt(r.replacementCost)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 dark:text-slate-500 text-[8px] uppercase font-bold">Recovery/Salvage</p>
                    <p className="font-bold text-emerald-600 dark:text-emerald-450 text-[11px] mt-0.5">+{fmt(r.recoveryAmount)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 dark:text-slate-500 text-[8px] uppercase font-bold text-rose-500">Net Loss Adjustment</p>
                    <p className="font-black text-rose-600 dark:text-rose-400 text-sm mt-0.5">{fmt(r.netLoss)}</p>
                  </div>
                </div>
              </div>

              {/* Dispatch & Logistics Card */}
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100/50 dark:border-[#334155]/50 space-y-2">
                <h5 className="font-extrabold text-[10px] uppercase text-[#EF4444] tracking-wider border-b border-slate-200/40 pb-1">Fulfillment & Logistics</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <p className="text-slate-400 dark:text-slate-500 text-[8px] uppercase font-bold">Courier Partner</p>
                    <p className="font-bold text-slate-700 dark:text-[#CBD5E1]">{r.courierPartner || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 dark:text-slate-500 text-[8px] uppercase font-bold">Tracking Number / AWB</p>
                    <p className="font-bold text-slate-700 dark:text-[#CBD5E1] font-mono">{r.trackingNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 dark:text-slate-500 text-[8px] uppercase font-bold">Dispatch Date</p>
                    <p className="font-bold text-slate-700 dark:text-[#CBD5E1]">{r.dispatchDate || 'N/A'}</p>
                  </div>
                </div>
                {r.approvalRemarks && (
                  <div className="pt-2 border-t border-slate-200/40 mt-1">
                    <p className="text-slate-400 dark:text-slate-500 text-[8px] uppercase font-bold">Workflow Sign-off Remarks</p>
                    <p className="text-slate-700 dark:text-[#CBD5E1] mt-0.5 leading-relaxed italic">{r.approvalRemarks}</p>
                  </div>
                )}
              </div>

              {/* Evidence Uploads */}
              {((r.productImages || []).length > 0 || (r.invoiceCopy || []).length > 0) && (
                <div className="space-y-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-850 p-4 rounded-2xl">
                  <h5 className="font-extrabold text-[10px] uppercase text-[#EF4444] tracking-wider border-b border-slate-200/40 pb-1.5">Evidence Attachments</h5>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Damage Proof */}
                    {(r.productImages || []).length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-slate-400 dark:text-slate-500 text-[8px] uppercase font-bold">Product Damage Images</p>
                        <div className="flex flex-wrap gap-2">
                          {r.productImages.map((img, i) => (
                            <img key={i} src={img} onClick={() => setPreviewImage(img)} className="w-12 h-12 object-cover rounded border border-slate-200 dark:border-slate-700 hover:scale-105 cursor-zoom-in transition-all shrink-0" />
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Invoice Copy */}
                    {(r.invoiceCopy || []).length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-slate-400 dark:text-slate-500 text-[8px] uppercase font-bold">Invoice Copy</p>
                        <div className="flex flex-wrap gap-2">
                          {r.invoiceCopy.map((img, i) => (
                            img.startsWith('data:application/pdf') ? (
                              <a key={i} href={img} download={`invoice_${r.id}.pdf`} className="w-12 h-12 rounded border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-550 shrink-0 hover:bg-slate-200"><FileText size={16} /></a>
                            ) : (
                              <img key={i} src={img} onClick={() => setPreviewImage(img)} className="w-12 h-12 object-cover rounded border border-slate-200 dark:border-slate-700 hover:scale-105 cursor-zoom-in transition-all shrink-0" />
                            )
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-3 border-t border-slate-150 dark:border-[#334155] justify-end">
                <button type="button" onClick={() => setDetailsModal(null)}
                  className="px-5 py-2.5 bg-slate-800 dark:bg-slate-700 text-white rounded-2xl text-xs font-bold hover:bg-slate-900 dark:hover:bg-slate-600 transition-all">
                  Close dossier
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* Image Preview Overlay Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-4xl w-full max-h-[85vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img src={previewImage} className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-slate-800" />
            <button onClick={() => setPreviewImage(null)} className="absolute top-2 right-2 p-2 bg-slate-900/60 text-white rounded-full hover:bg-slate-800/80 transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
