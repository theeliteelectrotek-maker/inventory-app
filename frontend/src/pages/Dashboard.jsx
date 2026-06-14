import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import {
  Package, ShoppingCart, Store, Clock, IndianRupee, Loader2, Building2,
  AlertTriangle, CheckCircle2, Activity, TrendingUp, TrendingDown, Plus, ShieldAlert,
  ArrowUpRight, RotateCcw, AlertCircle, User, Users, Tag, Calendar, Search, Download, Filter, Eye, RefreshCw, FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import MetricCard from '../components/MetricCard';

function parseLocalDate(dateStr) {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-');
  if (parts.length !== 3) return new Date(dateStr);
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return new Date(year, month, day);
}

// --- Date Range Presets Helper ---
const getTodayStr = (offsetDays = 0) => {
  const d = new Date();
  if (offsetDays !== 0) d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
};

const getStartOfMonth = (offsetMonths = 0) => {
  const d = new Date();
  d.setMonth(d.getMonth() + offsetMonths);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
};

const getEndOfMonth = (offsetMonths = 0) => {
  const d = new Date();
  d.setMonth(d.getMonth() + offsetMonths + 1);
  const lastDay = new Date(d.getFullYear(), d.getMonth(), 0);
  const year = lastDay.getFullYear();
  const month = String(lastDay.getMonth() + 1).padStart(2, '0');
  const date = String(lastDay.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
};

const getStartOfYear = () => {
  return `${new Date().getFullYear()}-01-01`;
};

const PRESETS = [
  { id: 'today', label: 'Today', getRange: () => ({ start: getTodayStr(), end: getTodayStr() }) },
  { id: 'yesterday', label: 'Yesterday', getRange: () => ({ start: getTodayStr(-1), end: getTodayStr(-1) }) },
  { id: '7days', label: 'Last 7 Days', getRange: () => ({ start: getTodayStr(-6), end: getTodayStr() }) },
  { id: '30days', label: 'Last 30 Days', getRange: () => ({ start: getTodayStr(-29), end: getTodayStr() }) },
  { id: 'thisMonth', label: 'This Month', getRange: () => ({ start: getStartOfMonth(), end: getTodayStr() }) },
  { id: 'lastMonth', label: 'Last Month', getRange: () => ({ start: getStartOfMonth(-1), end: getEndOfMonth(-1) }) },
  { id: 'thisYear', label: 'This Year', getRange: () => ({ start: getStartOfYear(), end: getTodayStr() }) },
  { id: 'custom', label: 'Custom Range', getRange: (s, e) => ({ start: s || getTodayStr(), end: e || getTodayStr() }) },
];

const PLATFORM_COLORS = { 
  amazon: 'bg-orange-500/10 text-orange-400 border-orange-500/20', 
  flipkart: 'bg-blue-500/10 text-blue-400 border-blue-500/20', 
  meesho: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  website: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
};

const getPaymentModeBadge = (method) => {
  const m = (method || '').toLowerCase().trim();
  if (m === 'cash') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  if (m === 'upi') return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
  if (m === 'cheque') return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  return 'bg-blue-500/10 text-blue-400 border-blue-500/20'; // Bank Transfer / Platform Pay / default
};

const formatActivityTime = (ts) => {
  if (!ts) return '-';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return ts;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// --- Custom Responsive SVG Line/Area Chart ---
function SalesTrendChart({ data }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        No sales trend data available for this range.
      </div>
    );
  }

  let maxVal = 1000;
  data.forEach((d) => {
    if (d.combined > maxVal) maxVal = d.combined;
    if (d.online > maxVal) maxVal = d.online;
    if (d.offline > maxVal) maxVal = d.offline;
  });
  maxVal = Math.ceil(maxVal * 1.15);

  const width = 600;
  const height = 240;
  const paddingLeft = 60;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const getX = (index) => {
    if (data.length <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (index / (data.length - 1)) * chartWidth;
  };

  const getY = (value) => {
    return paddingTop + chartHeight - (value / maxVal) * chartHeight;
  };

  const labelInterval = Math.max(1, Math.floor(data.length / 6));
  const yTicks = 4;
  const gridLinesY = Array.from({ length: yTicks + 1 }).map((_, i) => (maxVal / yTicks) * i);

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
        <defs>
          <linearGradient id="combinedGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EF4444" stopOpacity="0.2"/>
            <stop offset="100%" stopColor="#EF4444" stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="onlineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EC4899" stopOpacity="0.15"/>
            <stop offset="100%" stopColor="#EC4899" stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="offlineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.15"/>
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0"/>
          </linearGradient>
        </defs>

        {/* Horizontal Gridlines */}
        {gridLinesY.map((val, i) => {
          const y = getY(val);
          return (
            <g key={i} className="opacity-40">
              <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#334155" strokeDasharray="3,3" />
              <text x={paddingLeft - 8} y={y + 4} textAnchor="end" className="text-[10px] font-bold fill-slate-400">
                ₹{val >= 100000 ? `${(val / 100000).toFixed(1)}L` : val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
              </text>
            </g>
          );
        })}

        {/* Areas */}
        {data.length > 1 && (
          <>
            <polygon points={`${getX(0)},${getY(0)} ${data.map((d, i) => `${getX(i)},${getY(d.combined || 0)}`).join(' ')} ${getX(data.length - 1)},${getY(0)}`} fill="url(#combinedGrad)" />
            <polygon points={`${getX(0)},${getY(0)} ${data.map((d, i) => `${getX(i)},${getY(d.online || 0)}`).join(' ')} ${getX(data.length - 1)},${getY(0)}`} fill="url(#onlineGrad)" />
            <polygon points={`${getX(0)},${getY(0)} ${data.map((d, i) => `${getX(i)},${getY(d.offline || 0)}`).join(' ')} ${getX(data.length - 1)},${getY(0)}`} fill="url(#offlineGrad)" />
          </>
        )}

        {/* Lines */}
        {['combined', 'online', 'offline'].map((key, kIdx) => {
          const points = data.map((d, i) => `${getX(i)},${getY(d[key] || 0)}`).join(' ');
          const color = key === 'combined' ? '#EF4444' : key === 'online' ? '#EC4899' : '#3B82F6';
          return (
            <g key={key}>
              <polyline
                fill="none"
                stroke={color}
                strokeWidth={key === 'combined' ? "3" : "2"}
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
              />
              {data.map((d, i) => (
                <circle
                  key={i}
                  cx={getX(i)}
                  cy={getY(d[key] || 0)}
                  r={hoveredIdx === i ? "5" : "2.5"}
                  fill="#1E293B"
                  stroke={color}
                  strokeWidth={hoveredIdx === i ? "2.5" : "1.5"}
                  className="cursor-pointer transition-all duration-150"
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              ))}
            </g>
          );
        })}

        {/* Hover Line */}
        {hoveredIdx !== null && (
          <line
            x1={getX(hoveredIdx)}
            y1={paddingTop}
            x2={getX(hoveredIdx)}
            y2={paddingTop + chartHeight}
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeDasharray="2,2"
            className="pointer-events-none"
          />
        )}

        {/* X Axis Labels */}
        {data.map((d, i) => {
          if (i % labelInterval !== 0 && i !== data.length - 1) return null;
          const x = getX(i);
          const rawLabel = d.label || '';
          let displayLabel = rawLabel;
          if (rawLabel.includes('-') && rawLabel.length === 10) {
            const parts = rawLabel.split('-');
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            displayLabel = `${parts[2]} ${months[parseInt(parts[1], 10) - 1]}`;
          }
          return (
            <text
              key={i}
              x={x}
              y={height - paddingBottom + 18}
              textAnchor="middle"
              className="text-[9px] sm:text-[10px] font-bold fill-slate-400"
            >
              {displayLabel}
            </text>
          );
        })}
      </svg>

      {hoveredIdx !== null && (
        <div 
          className="absolute z-20 bg-slate-950 text-white rounded-xl shadow-xl p-3 border border-slate-800 text-xs flex flex-col gap-1 pointer-events-none transition-all duration-100"
          style={{
            left: `${Math.min(90, Math.max(10, (getX(hoveredIdx) / width) * 100))}%`,
            top: '5%',
            transform: 'translateX(-50%)',
          }}
        >
          <div className="font-bold border-b border-slate-800 pb-1 mb-1 text-slate-300">
            {data[hoveredIdx].label}
          </div>
          {[
            { key: 'combined', label: 'Combined', color: '#EF4444' },
            { key: 'online', label: 'Online Sales', color: '#EC4899' },
            { key: 'offline', label: 'Offline Sales', color: '#3B82F6' }
          ].map((cfg) => (
            <div key={cfg.key} className="flex justify-between gap-6">
              <span className="font-semibold text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: cfg.color }} />
                {cfg.label}:
              </span>
              <span className="font-extrabold text-white">₹{(data[hoveredIdx][cfg.key] || 0).toLocaleString('en-IN')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Date states
  const [preset, setPreset] = useState('today');
  const [customStart, setCustomStart] = useState(getTodayStr());
  const [customEnd, setCustomEnd] = useState(getTodayStr());

  // Dashboard stats state
  const [stats, setStats] = useState(null);
  const [chatStats, setChatStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Table controls (Sales)
  const [salesTab, setSalesTab] = useState('all'); // 'all' | 'online' | 'offline'
  const [salesSearch, setSalesSearch] = useState('');
  const [salesDateFilter, setSalesDateFilter] = useState('');
  const [salesRowsLimit, setSalesRowsLimit] = useState(25);

  // Table controls (Payments)
  const [paymentsPreset, setPaymentsPreset] = useState('today');
  const [paymentsCustomStart, setPaymentsCustomStart] = useState(getTodayStr());
  const [paymentsCustomEnd, setPaymentsCustomEnd] = useState(getTodayStr());
  const [paymentsTab, setPaymentsTab] = useState('all'); // 'all' | 'cash' | 'upi' | 'cheque' | 'bank transfer'
  const [paymentsSearch, setPaymentsSearch] = useState('');
  const [paymentsRowsLimit, setPaymentsRowsLimit] = useState(25);

  const [paymentsAppliedRange, setPaymentsAppliedRange] = useState({ start: getTodayStr(), end: getTodayStr() });
  const [paymentsStats, setPaymentsStats] = useState(null);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  const activeRange = () => {
    const matched = PRESETS.find(p => p.id === preset);
    if (preset === 'custom') {
      return { start: customStart, end: customEnd };
    }
    return matched ? matched.getRange() : PRESETS[0].getRange();
  };

  // Main fetch effect
  const fetchData = () => {
    setLoading(true);
    const range = activeRange();
    Promise.all([
      api.getStats(range.start, range.end),
      api.getChatStats()
    ])
      .then(([apiStats, chatSt]) => {
        setStats(apiStats);
        setChatStats(chatSt || null);
        setError(null);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load dashboard statistics. Please ensure server is running.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [preset, customStart, customEnd]);

  // Sync payments stats when the applied payments range changes
  useEffect(() => {
    const gRange = activeRange();

    // Optimize: if ranges match exactly, reuse stats
    if (paymentsAppliedRange.start === gRange.start && paymentsAppliedRange.end === gRange.end && stats) {
      setPaymentsStats(stats);
      return;
    }

    setPaymentsLoading(true);
    api.getStats(paymentsAppliedRange.start, paymentsAppliedRange.end)
      .then(res => {
        setPaymentsStats(res);
      })
      .catch(console.error)
      .finally(() => setPaymentsLoading(false));
  }, [paymentsAppliedRange, stats]);

  // Sync payments date state when a local preset changes (excluding custom)
  useEffect(() => {
    if (paymentsPreset !== 'custom') {
      const matched = PRESETS.find(p => p.id === paymentsPreset);
      const range = matched ? matched.getRange() : PRESETS[0].getRange();
      setPaymentsAppliedRange(range);
    }
  }, [paymentsPreset]);

  // Sync payments date settings when the global range changes
  useEffect(() => {
    setPaymentsPreset(preset);
    setPaymentsCustomStart(customStart);
    setPaymentsCustomEnd(customEnd);
    if (preset !== 'custom') {
      const matched = PRESETS.find(p => p.id === preset);
      const range = matched ? matched.getRange() : PRESETS[0].getRange();
      setPaymentsAppliedRange(range);
    } else {
      setPaymentsAppliedRange({ start: customStart, end: customEnd });
    }
  }, [preset, customStart, customEnd]);

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
      <button onClick={fetchData} className="px-5 py-2.5 bg-red-600 hover:bg-red-750 text-white rounded-2xl text-sm font-bold shadow-md transition-all flex items-center gap-2">
        <RefreshCw size={14} /> Retry Connection
      </button>
    </div>
  );

  const fmt = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val || 0);

  const getActivePeriodText = () => {
    const matched = PRESETS.find(p => p.id === preset);
    if (preset === 'custom') {
      const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length !== 3) return dateStr;
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${parts[2]} ${months[parseInt(parts[1], 10) - 1]} ${parts[0]}`;
      };
      return `${formatDate(customStart)} - ${formatDate(customEnd)}`;
    }
    return matched ? matched.label : 'Today';
  };

  const getPaymentsPeriodText = () => {
    const matched = PRESETS.find(p => p.id === paymentsPreset);
    if (paymentsPreset === 'custom') {
      const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length !== 3) return dateStr;
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${parts[2]} ${months[parseInt(parts[1], 10) - 1]} ${parts[0]}`;
      };
      return `${formatDate(paymentsCustomStart)} - ${formatDate(paymentsCustomEnd)}`;
    }
    return matched ? matched.label : 'Today';
  };

  // KPIs
  const salesToday = stats.todaySales || 0;
  const collectionsToday = stats.collectionsToday || 0;
  const totalPendingDues = stats.pendingPayments || 0;
  const lowStockCount = stats.lowStock || 0;
  const totalShopsCount = stats.totalShops || 0;
  const totalIndividualsCount = stats.totalIndividuals || 0;

  // Filter Sales list dynamically
  const filteredSales = (stats.allSales || []).filter(s => {
    if (salesTab === 'online' && s.type !== 'online') return false;
    if (salesTab === 'offline' && s.type !== 'offline') return false;

    if (salesSearch) {
      const q = salesSearch.toLowerCase();
      const matchName = s.productName?.toLowerCase().includes(q);
      const matchBuyer = s.buyerName?.toLowerCase().includes(q);
      const matchId = s.id?.toLowerCase().includes(q);
      if (!matchName && !matchBuyer && !matchId) return false;
    }

    if (salesDateFilter) {
      if (s.date !== salesDateFilter) return false;
    }

    return true;
  });

  const visibleSales = filteredSales.slice(0, salesRowsLimit);

  // Tab counts for sales
  const salesAllCount = (stats.allSales || []).length;
  const salesOnlineCount = (stats.allSales || []).filter(s => s.type === 'online').length;
  const salesOfflineCount = (stats.allSales || []).filter(s => s.type === 'offline').length;

  // Payments processing logic
  const paymentsRawList = paymentsStats?.allPayments || [];

  // Filtered payments list
  const filteredPayments = paymentsRawList.filter(p => {
    // 1. Method filters
    const m = (p.method || '').toLowerCase().trim();
    if (paymentsTab === 'cash' && m !== 'cash') return false;
    if (paymentsTab === 'upi' && m !== 'upi') return false;
    if (paymentsTab === 'cheque' && m !== 'cheque') return false;
    if (paymentsTab === 'bank transfer' && m !== 'bank transfer') return false;

    // 2. Smart search
    if (paymentsSearch) {
      const q = paymentsSearch.toLowerCase().trim();
      const matchCust = p.buyerName?.toLowerCase().includes(q);
      const matchRef = p.referenceNumber?.toLowerCase().includes(q);
      const matchInv = p.invoiceNumber?.toLowerCase().includes(q);
      const matchDate = p.date?.toLowerCase().includes(q);
      const matchCreatedBy = p.createdBy?.toLowerCase().includes(q);
      const matchMethod = p.method?.toLowerCase().includes(q);
      if (!matchCust && !matchRef && !matchInv && !matchDate && !matchCreatedBy && !matchMethod) return false;
    }

    return true;
  });

  const visiblePayments = filteredPayments.slice(0, paymentsRowsLimit);

  // Payments Tab Counts (based on current date range stats)
  const paymentsAllCount = paymentsRawList.length;
  const paymentsCashCount = paymentsRawList.filter(p => (p.method || '').toLowerCase().trim() === 'cash').length;
  const paymentsUPICount = paymentsRawList.filter(p => (p.method || '').toLowerCase().trim() === 'upi').length;
  const paymentsChequeCount = paymentsRawList.filter(p => (p.method || '').toLowerCase().trim() === 'cheque').length;
  const paymentsBTCount = paymentsRawList.filter(p => (p.method || '').toLowerCase().trim() === 'bank transfer').length;

  // Payments Summary Bar computations (update in real-time with filters)
  const summaryTotalPayments = filteredPayments.length;
  const summaryTotalCollection = filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const summaryCashCollection = filteredPayments.filter(p => (p.method || '').toLowerCase().trim() === 'cash').reduce((sum, p) => sum + (p.amount || 0), 0);
  const summaryUPICollection = filteredPayments.filter(p => (p.method || '').toLowerCase().trim() === 'upi').reduce((sum, p) => sum + (p.amount || 0), 0);
  const summaryChequeCollection = filteredPayments.filter(p => (p.method || '').toLowerCase().trim() === 'cheque').reduce((sum, p) => sum + (p.amount || 0), 0);

  const handleExportCSV = () => {
    let csv = 'data:text/csv;charset=utf-8,ID,Product Name,Customer/Channel,Type,Date,Amount\n';
    filteredSales.forEach(s => {
      const nameEsc = (s.productName || '').replace(/"/g, '""');
      const buyerEsc = (s.buyerName || '').replace(/"/g, '""');
      csv += `"${s.id || ''}","${nameEsc}","${buyerEsc}","${s.type || ''}",${s.date || ''},${s.amount || 0}\n`;
    });
    const encoded = encodeURI(csv);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `sales_report_${getActivePeriodText().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    let content = "ID\tProduct Name\tCustomer/Channel\tType\tDate\tAmount\n";
    filteredSales.forEach(s => {
      content += `${s.id || ''}\t${s.productName || ''}\t${s.buyerName || ''}\t${s.type || ''}\t${s.date || ''}\t${s.amount || 0}\n`;
    });
    const blob = new Blob([content], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sales_report_${getActivePeriodText().replace(/\s+/g, '_')}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPaymentsCSV = () => {
    let csv = 'data:text/csv;charset=utf-8,Customer,Payment Mode,Reference No.,Invoice No.,Date,Amount,Received By\n';
    filteredPayments.forEach(p => {
      const custEsc = (p.buyerName || '').replace(/"/g, '""');
      const refEsc = (p.referenceNumber || '').replace(/"/g, '""');
      const invEsc = (p.invoiceNumber || '').replace(/"/g, '""');
      const byEsc = (p.createdBy || '').replace(/"/g, '""');
      csv += `"${custEsc}","${p.method || ''}","${refEsc}","${invEsc}",${p.date || ''},${p.amount || 0},"${byEsc}"\n`;
    });
    const encoded = encodeURI(csv);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `payments_report_${getPaymentsPeriodText().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPaymentsExcel = () => {
    let content = "Customer\tPayment Mode\tReference No.\tInvoice No.\tDate\tAmount\tReceived By\n";
    filteredPayments.forEach(p => {
      content += `${p.buyerName || ''}\t${p.method || ''}\t${p.referenceNumber || ''}\t${p.invoiceNumber || ''}\t${p.date || ''}\t${p.amount || 0}\t${p.createdBy || ''}\n`;
    });
    const blob = new Blob([content], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payments_report_${getPaymentsPeriodText().replace(/\s+/g, '_')}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPaymentsPDF = () => {
    const printWindow = window.open('', '_blank');
    let html = `
      <html>
      <head>
        <title>Payments Ledger Report</title>
        <style>
          body { font-family: sans-serif; padding: 20px; color: #333; }
          h1 { text-align: center; margin-bottom: 5px; }
          .subtitle { text-align: center; color: #666; margin-top: 0; margin-bottom: 25px; }
          .summary { display: flex; justify-content: space-between; margin-bottom: 20px; border: 1px solid #ccc; padding: 15px; border-radius: 8px; background: #f9f9f9; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
          th { background-color: #f2f2f2; font-weight: bold; }
          .amount { text-align: right; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>Payments Ledger Report</h1>
        <p class="subtitle"><strong>Period:</strong> ${getPaymentsPeriodText()} | <strong>Filter:</strong> ${paymentsTab.toUpperCase()} | <strong>Search:</strong> ${paymentsSearch || 'None'}</p>
        <div class="summary">
          <div><strong>Total Payments:</strong> ${summaryTotalPayments}</div>
          <div><strong>Total Collection:</strong> ${fmt(summaryTotalCollection)}</div>
          <div><strong>Cash:</strong> ${fmt(summaryCashCollection)}</div>
          <div><strong>UPI:</strong> ${fmt(summaryUPICollection)}</div>
          <div><strong>Cheque:</strong> ${fmt(summaryChequeCollection)}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Payment Mode</th>
              <th>Reference No.</th>
              <th>Invoice No.</th>
              <th>Date</th>
              <th class="amount">Amount</th>
              <th>Received By</th>
            </tr>
          </thead>
          <tbody>
    `;
    filteredPayments.forEach(p => {
      html += `
        <tr>
          <td>${p.buyerName || ''}</td>
          <td>${p.method || ''}</td>
          <td>${p.referenceNumber || ''}</td>
          <td>${p.invoiceNumber || ''}</td>
          <td>${p.date || ''}</td>
          <td class="amount">${fmt(p.amount)}</td>
          <td>${p.createdBy || ''}</td>
        </tr>
      `;
    });
    html += `
          </tbody>
        </table>
        <script>
          window.onload = function() { window.print(); window.close(); }
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const iconMap = {
    Store: Store,
    IndianRupee: IndianRupee,
    ShoppingCart: ShoppingCart,
    RotateCcw: RotateCcw,
    Package: Package,
    Building2: Building2
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 text-slate-800 dark:text-[#CBD5E1]">
      
      {/* 1. Dashboard title & period selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-slate-200 dark:border-[#334155] shadow-sm">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-10 bg-[#EF4444] rounded-full shrink-0"></span>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-[#F8FAFC] tracking-tight">
              Dashboard Analytics
            </h1>
            <p className="text-slate-500 dark:text-[#94A3B8] text-sm mt-1 font-medium">
              Period: <span className="text-[#EF4444] font-bold">{getActivePeriodText()}</span>
            </p>
          </div>
        </div>

        {/* Action Panel Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button 
            onClick={() => navigate('/offline-sales', { state: { openAddModal: true } })}
            className="flex items-center gap-1.5 bg-[#EF4444] hover:bg-red-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
          >
            <Plus size={14} /> Add Sale
          </button>
          <button 
            onClick={() => navigate('/shops', { state: { openAddModal: true } })}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 dark:bg-[#1E293B] dark:hover:bg-[#334155] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
          >
            <Plus size={14} /> Add Shop
          </button>
          <button 
            onClick={() => navigate('/products', { state: { openAddModal: true } })}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
          >
            <Plus size={14} /> Add Product
          </button>
        </div>
      </div>

      {/* Global Date Preset Sticky Bar on scroll */}
      <div className="sticky top-0 z-30 bg-[#F8FAFC]/90 dark:bg-[#0F172A]/90 backdrop-blur-md pb-4 pt-2 -mt-2 border-b border-slate-200/50 dark:border-slate-800/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white dark:bg-[#1E293B] p-3 rounded-2xl border border-slate-150 dark:border-[#334155] shadow-sm">
          <div className="flex items-center gap-3 overflow-x-auto scrollbar-none w-full lg:w-auto">
            <span className="text-xs font-extrabold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap">
              <Calendar size={14} /> Date range:
            </span>
            <div className="flex gap-1">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPreset(p.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    preset === p.id 
                      ? 'bg-[#EF4444] text-white shadow-sm' 
                      : 'text-slate-650 hover:text-slate-900 dark:text-[#94A3B8] dark:hover:text-[#F8FAFC] bg-slate-50 dark:bg-[#0F172A] hover:bg-slate-100 dark:hover:bg-[#1E293B]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          
          {preset === 'custom' && (
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto mt-2 lg:mt-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-150 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="py-1.5 px-3 border border-slate-200 dark:border-[#334155] rounded-xl text-xs bg-slate-50 dark:bg-[#0F172A] dark:text-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <span className="text-slate-400 dark:text-slate-555 text-xs font-bold uppercase">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="py-1.5 px-3 border border-slate-200 dark:border-[#334155] rounded-xl text-xs bg-slate-50 dark:bg-[#0F172A] dark:text-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <button
                onClick={fetchData}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-750 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ROW 1: 4 KPI Cards */}
      <div className="grid gap-6 xl:grid-cols-4 lg:grid-cols-4 md:grid-cols-2 grid-cols-1">
        <MetricCard
          header="Total Sales"
          value={salesToday}
          isCurrency
          accentColor="border-t-[#EF4444]"
          valueClassName="text-slate-900 dark:text-[#F8FAFC]"
          description="Invoiced orders in period"
          icon={
            <div className="w-12 h-12 rounded-xl bg-red-55/10 dark:bg-red-950/20 border border-red-500/10 text-[#EF4444] flex items-center justify-center shrink-0">
              <ShoppingCart size={22} />
            </div>
          }
        />
        <MetricCard
          header="Collections"
          value={collectionsToday}
          isCurrency
          accentColor="border-t-[#10B981]"
          valueClassName="text-[#10B981]"
          description="Collected payments in period"
          icon={
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/20 border border-emerald-500/10 text-[#10B981] flex items-center justify-center shrink-0">
              <IndianRupee size={22} />
            </div>
          }
        />
        <MetricCard
          header="Outstanding Dues"
          value={totalPendingDues}
          isCurrency
          accentColor="border-t-[#F59E0B]"
          valueClassName="text-[#F59E0B]"
          description="Unpaid amount in period"
          icon={
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 dark:bg-amber-950/20 border border-amber-500/10 text-[#F59E0B] flex items-center justify-center shrink-0">
              <Clock size={22} />
            </div>
          }
        />
        <MetricCard
          header="Low Stock Items"
          value={`${lowStockCount}`}
          accentColor="border-t-purple-500"
          valueClassName="text-purple-500"
          description="SKUs running low (<= 20)"
          icon={
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 dark:bg-purple-950/20 border border-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
              <Package size={22} />
            </div>
          }
        />
      </div>

      {/* CUSTOMER COUNTS SUB-ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Shops Card */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1E293B] border-t-4 border-t-indigo-500 rounded-2xl p-5 shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 dark:bg-indigo-950/20 border border-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
              <Building2 size={22} />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-505 dark:text-[#94A3B8] uppercase tracking-wider block">Registered Shops</span>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-[#F8FAFC] leading-none mt-1">{totalShopsCount}</p>
            </div>
          </div>
          <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
            🏪 Shops
          </span>
        </div>

        {/* Individual Customers Card */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1E293B] border-t-4 border-t-orange-500 rounded-2xl p-5 shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 dark:bg-orange-950/20 border border-orange-500/10 text-orange-400 flex items-center justify-center shrink-0">
              <User size={22} />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-505 dark:text-[#94A3B8] uppercase tracking-wider block">Registered Customers</span>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-[#F8FAFC] leading-none mt-1">{totalIndividualsCount}</p>
            </div>
          </div>
          <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20 uppercase tracking-wider">
            👤 Individuals
          </span>
        </div>
      </div>

      {/* PIECE & BOX SELLING TELEMETRY */}
      <div className="grid gap-6 xl:grid-cols-4 lg:grid-cols-4 md:grid-cols-2 grid-cols-1">
        <MetricCard
          header="Pieces Sold"
          value={(stats.totalPiecesSold || 0).toLocaleString('en-IN')}
          accentColor="border-t-purple-500"
          valueClassName="text-slate-900 dark:text-[#F8FAFC]"
          description="Single unit sales"
          icon={
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 dark:bg-purple-950/20 border border-purple-500/10 text-purple-555 flex items-center justify-center shrink-0">
              <Tag size={20} />
            </div>
          }
        />
        <MetricCard
          header="Boxes Sold"
          value={(stats.totalBoxesSold || 0).toLocaleString('en-IN')}
          accentColor="border-t-pink-500"
          valueClassName="text-slate-900 dark:text-[#F8FAFC]"
          description="Box packaging sales"
          icon={
            <div className="w-12 h-12 rounded-xl bg-pink-500/10 dark:bg-pink-950/20 border border-pink-500/10 text-pink-550 flex items-center justify-center shrink-0">
              <Package size={20} />
            </div>
          }
        />
        <MetricCard
          header="Piece Revenue"
          value={stats.revenueFromPieceSales}
          isCurrency
          accentColor="border-t-emerald-500"
          valueClassName="text-slate-900 dark:text-[#F8FAFC]"
          description="Pieces sales income"
          icon={
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/20 border border-emerald-500/10 text-[#10B981] flex items-center justify-center shrink-0">
              <IndianRupee size={20} />
            </div>
          }
        />
        <MetricCard
          header="Box Revenue"
          value={stats.revenueFromBoxSales}
          isCurrency
          accentColor="border-t-blue-500"
          valueClassName="text-slate-900 dark:text-[#F8FAFC]"
          description="Boxes sales income"
          icon={
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 dark:bg-blue-950/20 border border-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
              <IndianRupee size={20} />
            </div>
          }
        />
      </div>

      {/* SALES TREND CHART AREA */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1E293B] rounded-3xl p-6 shadow-sm flex flex-col hover:shadow-md transition-all duration-300">
        <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-4 mb-4">
          <div>
            <h3 className="font-extrabold text-slate-850 dark:text-[#F8FAFC] text-base">Sales Trend Chart</h3>
            <p className="text-slate-400 dark:text-[#94A3B8] text-xs mt-0.5">Online vs Offline vs Combined revenue trajectory</p>
          </div>
          <Activity size={18} className="text-red-500" />
        </div>
        <SalesTrendChart data={stats.dailyTrend || []} />
      </div>

      {/* ROW 2: Transaction Tables Split (Vertical Stacked ERP Ledger) */}
      <div className="flex flex-col gap-10">
        
        {/* Recent Sales Table */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1E293B] rounded-3xl shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-all duration-300">
          <div className="flex flex-col border-b border-slate-150 dark:border-[#1E293B]">
            {/* Header + Tabs */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 py-4 gap-3 bg-slate-50/50 dark:bg-slate-900/40">
              <span className="text-sm font-extrabold text-slate-850 dark:text-[#F8FAFC] uppercase tracking-wider">
                Recent Sales ({filteredSales.length})
              </span>
              <div className="flex bg-slate-150 dark:bg-[#0F172A] p-0.5 rounded-xl border border-slate-200/50 dark:border-slate-800/40 text-[11px] font-bold">
                <button
                  onClick={() => setSalesTab('all')}
                  className={`px-3 py-1 rounded-lg transition-all ${salesTab === 'all' ? 'bg-[#EF4444] text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                >
                  All ({salesAllCount})
                </button>
                <button
                  onClick={() => setSalesTab('online')}
                  className={`px-3 py-1 rounded-lg transition-all ${salesTab === 'online' ? 'bg-[#EF4444] text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                >
                  Online ({salesOnlineCount})
                </button>
                <button
                  onClick={() => setSalesTab('offline')}
                  className={`px-3 py-1 rounded-lg transition-all ${salesTab === 'offline' ? 'bg-[#EF4444] text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                >
                  Offline ({salesOfflineCount})
                </button>
              </div>
            </div>

            {/* Sales Table Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 items-center gap-2.5 px-6 py-3 bg-slate-50/20 dark:bg-slate-900/10 border-t border-slate-150 dark:border-slate-800/60">
              {/* Search box */}
              <div className="relative sm:col-span-2">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search item, customer, ID..."
                  value={salesSearch}
                  onChange={(e) => setSalesSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-100 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 text-xs font-medium rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:border-red-500"
                />
              </div>

              {/* Date Filter */}
              <input
                type="date"
                value={salesDateFilter}
                onChange={(e) => setSalesDateFilter(e.target.value)}
                className="py-1.5 px-3 bg-slate-100 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 text-xs font-semibold rounded-xl text-slate-800 dark:text-[#CBD5E1] focus:outline-none"
              />

              {/* Rows Count Dropdown */}
              <select
                value={salesRowsLimit}
                onChange={(e) => setSalesRowsLimit(Number(e.target.value))}
                className="py-1.5 px-3 bg-slate-100 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 text-xs font-extrabold rounded-xl text-slate-800 dark:text-[#CBD5E1] focus:outline-none"
              >
                <option value={10}>10 rows</option>
                <option value={25}>25 rows</option>
                <option value={50}>50 rows</option>
                <option value={100}>100 rows</option>
              </select>

              {/* Export Buttons */}
              <div className="flex gap-1.5 justify-end">
                <button
                  onClick={handleExportCSV}
                  title="Export CSV"
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#0F172A] dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                  <Download size={14} />
                </button>
                <button
                  onClick={handleExportExcel}
                  title="Export Excel (.xls)"
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#0F172A] dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-1 font-bold text-[10px]"
                >
                  <FileText size={14} />
                </button>
              </div>
            </div>
          </div>

          {visibleSales.length === 0 ? (
            <p className="text-center text-slate-400 dark:text-[#94A3B8] text-xs py-10">No sales transactions match filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50/80 dark:bg-[#1E293B] text-slate-555 dark:text-[#94A3B8] font-bold uppercase text-[10px] tracking-wider border-b border-slate-155 dark:border-[#1E293B]">
                  <tr>
                    <th className="px-6 py-3.5">Item/Invoice</th>
                    <th className="px-6 py-3.5">Customer/Channel</th>
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-[#1E293B] bg-white dark:bg-[#111827] font-semibold text-slate-700 dark:text-[#CBD5E1]">
                  {visibleSales.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-[#1E293B]/40 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800 dark:text-[#F8FAFC] truncate max-w-[160px]">{s.productName}</td>
                      <td className="px-6 py-4">
                        {s.type === 'online' ? (
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${PLATFORM_COLORS[(s.buyerName || '').toLowerCase()] || 'bg-slate-850 text-slate-300'}`}>{s.buyerName}</span>
                        ) : (
                          <span className="font-semibold text-slate-555 dark:text-[#94A3B8]">{s.buyerName}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-400 dark:text-slate-500 font-medium">{s.date}</td>
                      <td className="px-6 py-4 text-right font-black text-slate-900 dark:text-[#F8FAFC]">{fmt(s.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Upgraded Recent Payments ERP Ledger Table */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1E293B] rounded-3xl shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-all duration-300">
          
          <div className="flex flex-col border-b border-slate-150 dark:border-[#1E293B]">
            {/* Header + Mode Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 py-4 gap-3 bg-slate-50/50 dark:bg-slate-900/40">
              <span className="text-sm font-extrabold text-slate-850 dark:text-[#F8FAFC] uppercase tracking-wider">
                Recent Payments
              </span>
              <div className="flex bg-slate-150 dark:bg-[#0F172A] p-0.5 rounded-xl border border-slate-200/50 dark:border-slate-800/40 text-[11px] font-bold overflow-x-auto scrollbar-none max-w-full">
                <button
                  onClick={() => setPaymentsTab('all')}
                  className={`px-3 py-1 rounded-lg transition-all shrink-0 ${paymentsTab === 'all' ? 'bg-[#EF4444] text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                >
                  All ({paymentsAllCount})
                </button>
                <button
                  onClick={() => setPaymentsTab('cash')}
                  className={`px-3 py-1 rounded-lg transition-all shrink-0 ${paymentsTab === 'cash' ? 'bg-[#EF4444] text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                >
                  Cash ({paymentsCashCount})
                </button>
                <button
                  onClick={() => setPaymentsTab('upi')}
                  className={`px-3 py-1 rounded-lg transition-all shrink-0 ${paymentsTab === 'upi' ? 'bg-[#EF4444] text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                >
                  UPI ({paymentsUPICount})
                </button>
                <button
                  onClick={() => setPaymentsTab('cheque')}
                  className={`px-3 py-1 rounded-lg transition-all shrink-0 ${paymentsTab === 'cheque' ? 'bg-[#EF4444] text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                >
                  Cheque ({paymentsChequeCount})
                </button>
                <button
                  onClick={() => setPaymentsTab('bank transfer')}
                  className={`px-3 py-1 rounded-lg transition-all shrink-0 ${paymentsTab === 'bank transfer' ? 'bg-[#EF4444] text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                >
                  Bank Transfer ({paymentsBTCount})
                </button>
              </div>
            </div>

            {/* Local Date Preset Picker for Payments */}
            <div className="flex items-center gap-2 px-6 py-2.5 bg-slate-100/50 dark:bg-slate-900/30 border-t border-slate-150 dark:border-slate-800/50 overflow-x-auto scrollbar-none">
              <span className="text-[10px] font-extrabold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider whitespace-nowrap">Ledger Period:</span>
              <div className="flex gap-1 shrink-0">
                {PRESETS.filter(p => p.id !== 'thisYear').map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPaymentsPreset(p.id)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all shrink-0 ${
                      paymentsPreset === p.id 
                        ? 'bg-slate-800 dark:bg-slate-700 text-white' 
                        : 'text-slate-500 hover:text-slate-800 dark:text-[#94A3B8] dark:hover:text-[#F8FAFC] bg-transparent'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {paymentsPreset === 'custom' && (
                <div className="flex items-center gap-1.5 shrink-0 pl-3 ml-3 border-l border-slate-200 dark:border-slate-800">
                  <input
                    type="date"
                    value={paymentsCustomStart}
                    onChange={(e) => setPaymentsCustomStart(e.target.value)}
                    className="py-1 px-2 border border-slate-200 dark:border-[#334155] rounded-lg text-[10px] bg-slate-50 dark:bg-[#0F172A] dark:text-[#CBD5E1] focus:outline-none"
                  />
                  <span className="text-slate-400 text-[9px] font-extrabold">TO</span>
                  <input
                    type="date"
                    value={paymentsCustomEnd}
                    onChange={(e) => setPaymentsCustomEnd(e.target.value)}
                    className="py-1 px-2 border border-slate-200 dark:border-[#334155] rounded-lg text-[10px] bg-slate-50 dark:bg-[#0F172A] dark:text-[#CBD5E1] focus:outline-none"
                  />
                  <button
                    onClick={() => setPaymentsAppliedRange({ start: paymentsCustomStart, end: paymentsCustomEnd })}
                    className="px-2.5 py-1 bg-red-600 hover:bg-red-750 text-white text-[10px] font-bold rounded-lg transition-all shadow-sm ml-1 shrink-0"
                  >
                    Apply
                  </button>
                  <button
                    onClick={() => {
                      setPaymentsPreset('today');
                      setPaymentsCustomStart(getTodayStr());
                      setPaymentsCustomEnd(getTodayStr());
                    }}
                    className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold rounded-lg transition-all ml-1 shrink-0"
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>

            {/* Payments Ledger Search & Exports controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 items-center gap-2.5 px-6 py-3 bg-slate-50/20 dark:bg-slate-900/10 border-t border-slate-150 dark:border-slate-800/60">
              {/* Search box */}
              <div className="relative sm:col-span-2">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search ledger customer, ref, invoice..."
                  value={paymentsSearch}
                  onChange={(e) => setPaymentsSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-100 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 text-xs font-medium rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:border-red-500"
                />
              </div>

              {/* Rows Selector */}
              <select
                value={paymentsRowsLimit}
                onChange={(e) => setPaymentsRowsLimit(Number(e.target.value))}
                className="py-1.5 px-3 bg-slate-100 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 text-xs font-extrabold rounded-xl text-slate-800 dark:text-[#CBD5E1] focus:outline-none"
              >
                <option value={10}>10 Rows</option>
                <option value={25}>25 Rows</option>
                <option value={50}>50 Rows</option>
                <option value={100}>100 Rows</option>
                <option value={250}>250 Rows</option>
              </select>

              {/* Export Buttons */}
              <div className="flex gap-1.5 justify-end sm:col-span-2 lg:col-span-2">
                <button
                  onClick={handleExportPaymentsCSV}
                  title="Export CSV"
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#0F172A] dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-white transition-colors"
                >
                  <Download size={12} /> CSV
                </button>
                <button
                  onClick={handleExportPaymentsExcel}
                  title="Export Excel"
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#0F172A] dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-white transition-colors"
                >
                  <FileText size={12} /> Excel
                </button>
                <button
                  onClick={handleExportPaymentsPDF}
                  title="Export PDF / Print Report"
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#0F172A] dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-white transition-colors"
                >
                  <FileText size={12} /> PDF
                </button>
              </div>
            </div>

            {/* Dynamic Summary Bar */}
            <div className="grid grid-cols-2 md:grid-cols-5 text-center divide-x divide-slate-150 dark:divide-slate-800 bg-slate-100/30 dark:bg-slate-900/40 py-2 border-t border-slate-150 dark:border-slate-800/60 text-[11px] font-bold text-slate-500 dark:text-[#94A3B8]">
              <div>
                Total Payments: <span className="text-slate-900 dark:text-white font-extrabold ml-1">{summaryTotalPayments}</span>
              </div>
              <div>
                Total Collection: <span className="text-slate-900 dark:text-white font-extrabold ml-1">{fmt(summaryTotalCollection)}</span>
              </div>
              <div>
                Cash: <span className="text-emerald-500 font-extrabold ml-1">{fmt(summaryCashCollection)}</span>
              </div>
              <div>
                UPI: <span className="text-purple-400 font-extrabold ml-1">{fmt(summaryUPICollection)}</span>
              </div>
              <div>
                Cheque: <span className="text-amber-500 font-extrabold ml-1">{fmt(summaryChequeCollection)}</span>
              </div>
            </div>
          </div>

          {paymentsLoading ? (
            <div className="flex items-center justify-center py-10 text-slate-400 gap-2">
              <Loader2 size={20} className="animate-spin text-red-650" />
              <span className="text-xs font-bold">Refreshing Ledger indices…</span>
            </div>
          ) : visiblePayments.length === 0 ? (
            <p className="text-center text-slate-400 dark:text-[#94A3B8] text-xs py-10">No ledger payments match filters.</p>
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left border-collapse text-xs min-w-[700px]">
                <thead className="bg-slate-50/80 dark:bg-[#1E293B] text-slate-550 dark:text-[#94A3B8] font-bold uppercase text-[10px] tracking-wider border-b border-slate-150 dark:border-[#1E293B]">
                  <tr>
                    <th className="px-5 py-3.5">Customer</th>
                    <th className="px-5 py-3.5">Payment Mode</th>
                    <th className="px-5 py-3.5">Reference No.</th>
                    <th className="px-5 py-3.5">Invoice No.</th>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5 text-right">Amount</th>
                    <th className="px-5 py-3.5">Received By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-[#1E293B] bg-white dark:bg-[#111827] font-semibold text-slate-700 dark:text-[#CBD5E1]">
                  {visiblePayments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-[#1E293B]/40 transition-colors">
                      <td className="px-5 py-4 font-bold text-slate-800 dark:text-[#F8FAFC] truncate max-w-[150px]" title={p.buyerName}>{p.buyerName}</td>
                      <td className="px-5 py-4">
                        <span className={`text-[9.5px] font-extrabold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${getPaymentModeBadge(p.method)}`}>
                          {p.method}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-500 font-mono text-[11px] truncate max-w-[120px]" title={p.referenceNumber}>{p.referenceNumber}</td>
                      <td className="px-5 py-4 text-slate-500 font-mono text-[11px] truncate max-w-[120px]" title={p.invoiceNumber}>{p.invoiceNumber}</td>
                      <td className="px-5 py-4 text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap">{p.date}</td>
                      <td className="px-5 py-4 text-right font-black text-emerald-600 dark:text-[#10B981] whitespace-nowrap">+ {fmt(p.amount)}</td>
                      <td className="px-5 py-4 text-slate-400 dark:text-slate-500 font-medium truncate max-w-[100px]" title={p.createdBy}>{p.createdBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ROW 3: Action Required Alert Strip */}
      <div className="space-y-4">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-1 bg-amber-500 rounded-full" />
          <span className="text-xs font-bold tracking-wider text-slate-400 dark:text-[#94A3B8] uppercase">Action Required</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-xs font-semibold">
          {/* Overdue Payments */}
          <div className={`p-5 border rounded-2xl flex items-center justify-between transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 ${stats.overduePaymentsCount > 0 ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/40 text-rose-800 dark:text-[#EF4444]' : 'bg-white dark:bg-[#111827] border-slate-200 dark:border-[#1E293B] text-slate-700 dark:text-[#CBD5E1]'}`}>
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider block">Overdue Invoices</span>
              <span className="text-2xl font-black text-slate-805 dark:text-[#F8FAFC] block mt-1">{stats.overduePaymentsCount}</span>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${stats.overduePaymentsCount > 0 ? 'bg-rose-100/80 text-rose-600 dark:bg-rose-950/50 dark:text-[#EF4444]' : 'bg-slate-50 dark:bg-[#1E293B] text-slate-400 dark:text-[#CBD5E1]'}`}>
              <ShieldAlert size={18} />
            </div>
          </div>

          {/* Low Stock */}
          <div className={`p-5 border rounded-2xl flex items-center justify-between transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 ${stats.lowStock > 0 ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/40 text-amber-800 dark:text-[#F59E0B]' : 'bg-white dark:bg-[#111827] border-slate-200 dark:border-[#1E293B] text-slate-700 dark:text-[#CBD5E1]'}`}>
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider block">Low Stock SKUs</span>
              <span className="text-2xl font-black text-slate-805 dark:text-[#F8FAFC] block mt-1">{stats.lowStock}</span>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${stats.lowStock > 0 ? 'bg-amber-100/80 text-amber-600 dark:bg-amber-950/50 dark:text-[#F59E0B]' : 'bg-slate-50 dark:bg-[#1E293B] text-slate-400 dark:text-[#CBD5E1]'}`}>
              <AlertCircle size={18} />
            </div>
          </div>

          {/* Out Of Stock */}
          <div className={`p-5 border rounded-2xl flex items-center justify-between transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 ${stats.outOfStock > 0 ? 'bg-red-50/50 dark:bg-red-950/20 border-red-100 dark:border-red-900/40 text-red-855 dark:text-[#EF4444]' : 'bg-white dark:bg-[#111827] border-slate-200 dark:border-[#1E293B] text-slate-700 dark:text-[#CBD5E1]'}`}>
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider block">Out Of Stock</span>
              <span className="text-2xl font-black text-slate-850 dark:text-[#F8FAFC] block mt-1">{stats.outOfStock}</span>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${stats.outOfStock > 0 ? 'bg-red-100/80 text-red-655 dark:bg-red-950/50 dark:text-[#EF4444]' : 'bg-slate-50 dark:bg-[#1E293B] text-slate-400 dark:text-[#CBD5E1]'}`}>
              <AlertTriangle size={18} />
            </div>
          </div>

          {/* Pending Returns */}
          <div className={`p-5 border rounded-2xl flex items-center justify-between transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 ${stats.pendingReturnsCount > 0 ? 'bg-violet-50/50 dark:bg-violet-950/20 border-violet-100 dark:border-violet-900/40 text-violet-850 dark:text-violet-400' : 'bg-white dark:bg-[#111827] border-slate-200 dark:border-[#1E293B] text-slate-700 dark:text-[#CBD5E1]'}`}>
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider block">Returns Review</span>
              <span className="text-2xl font-black text-slate-805 dark:text-[#F8FAFC] block mt-1">{stats.pendingReturnsCount}</span>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${stats.pendingReturnsCount > 0 ? 'bg-violet-100/80 text-violet-650 dark:bg-violet-950/50 dark:text-violet-400' : 'bg-slate-50 dark:bg-[#1E293B] text-slate-400 dark:text-[#CBD5E1]'}`}>
              <RotateCcw size={18} />
            </div>
          </div>
        </div>
      </div>

      {/* TEAM COLLABORATION HUB SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Announcements */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1E293B] rounded-3xl shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#1E293B] bg-slate-50/50 dark:bg-slate-900/50">
            <span className="text-sm font-extrabold text-slate-850 dark:text-[#F8FAFC] uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert size={16} className="text-red-505" /> Recent Announcements
            </span>
            <button onClick={() => navigate('/communication')} className="text-[10px] font-bold text-red-650 dark:text-red-400 hover:underline">View Chat</button>
          </div>
          <div className="p-5 flex-1 space-y-3.5 overflow-y-auto max-h-[240px] scrollbar-thin">
            {!chatStats?.announcements || chatStats.announcements.length === 0 ? (
              <p className="text-center text-slate-400 dark:text-[#94A3B8] text-xs py-8">No official announcements posted.</p>
            ) : (
              chatStats.announcements.slice(0, 3).map((ann) => (
                <div key={ann.id} className="p-3 bg-red-500/5 dark:bg-red-950/10 border border-red-500/10 rounded-xl text-xs flex gap-2">
                  <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200">{ann.senderName}:</span>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{ann.content}</p>
                    <span className="text-[8px] text-slate-400 dark:text-slate-555 block mt-1.5">{new Date(ann.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1E293B] rounded-3xl shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#1E293B] bg-slate-50/50 dark:bg-slate-900/50">
            <span className="text-sm font-extrabold text-slate-850 dark:text-[#F8FAFC] uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-emerald-500" /> Pending Tasks
            </span>
            <span className="text-[9px] font-bold text-slate-555 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
              {chatStats?.pendingTasks?.length || 0} Pending
            </span>
          </div>
          <div className="p-5 flex-1 space-y-3.5 overflow-y-auto max-h-[240px] scrollbar-thin">
            {!chatStats?.pendingTasks || chatStats.pendingTasks.length === 0 ? (
              <p className="text-center text-slate-400 dark:text-[#94A3B8] text-xs py-8">🎉 No pending tasks assigned to you!</p>
            ) : (
              chatStats.pendingTasks.map((tMsg) => (
                <div key={tMsg.id} className="p-3 bg-slate-50 dark:bg-[#1E293B]/40 border border-slate-150 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-800 dark:text-[#F8FAFC] truncate">{tMsg.task.title}</h4>
                    <p className="text-[9px] text-slate-400 mt-0.5">Assigned by {tMsg.senderName}</p>
                  </div>
                  <button
                    onClick={() => navigate('/communication')}
                    className="px-2.5 py-1 bg-red-600 hover:bg-red-750 text-white font-bold text-[9px] rounded-lg shadow-sm shrink-0"
                  >
                    Open
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Online Employees & Chat Activity Feed */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1E293B] rounded-3xl shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#1E293B] bg-slate-50/50 dark:bg-slate-900/50">
            <span className="text-sm font-extrabold text-slate-850 dark:text-[#F8FAFC] uppercase tracking-wider flex items-center gap-1.5">
              <Users size={16} className="text-indigo-500" /> Team Telemetry
            </span>
            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-55/10 dark:bg-emerald-950/20 border border-emerald-500/10 px-2 py-0.5 rounded-full">
              {chatStats?.onlineCount || 0} Online
            </span>
          </div>
          <div className="p-4 flex-1 space-y-2.5 overflow-y-auto max-h-[240px] scrollbar-thin">
            <span className="text-[9px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-widest block border-b border-slate-150 dark:border-slate-800 pb-1">Activity Feed</span>
            {!chatStats?.activityFeed || chatStats.activityFeed.length === 0 ? (
              <p className="text-center text-slate-400 dark:text-[#94A3B8] text-xs py-8">No recent chat activity.</p>
            ) : (
              chatStats.activityFeed.slice(0, 4).map((act) => (
                <div key={act.id} className="text-[11px] leading-relaxed flex gap-2 text-slate-600 dark:text-[#CBD5E1] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-slate-800 dark:text-[#F8FAFC]">{act.userName}</span> {act.content}
                    <span className="text-[8px] text-slate-400 dark:text-slate-555 block mt-0.5">{new Date(act.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ROW 4: Live Activity Feed */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1E293B] rounded-3xl shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-all duration-300">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-155 dark:border-[#1E293B]">
          <div className="flex items-center gap-2">
            <Activity className="text-[#EF4444] animate-pulse" size={16} />
            <span className="text-sm font-extrabold text-slate-850 dark:text-[#F8FAFC] uppercase tracking-wider">Live Activity Feed</span>
          </div>
          <span className="text-[9px] font-bold text-slate-405 dark:text-[#94A3B8] uppercase tracking-widest bg-slate-50 dark:bg-[#0F172A] border border-slate-100 dark:border-[#1E293B] px-2.5 py-1 rounded-full">Telemetry Log</span>
        </div>

        {stats.recentActivities.length === 0 ? (
          <div className="text-center py-10 text-slate-400 dark:text-[#94A3B8] text-xs">No activity logged in period.</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-[#1E293B]">
            {stats.recentActivities.map((act) => {
              const IconComponent = iconMap[act.icon] || AlertTriangle;
              return (
                <div key={act.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50/40 dark:hover:bg-[#1E293B]/30 transition-colors text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 bg-slate-50 dark:bg-[#1E293B] border-slate-150 dark:border-[#334155] ${act.iconColor}`}>
                      <IconComponent size={15} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 dark:text-[#F8FAFC] truncate">{act.title}</p>
                      <p className="text-[10px] text-slate-400 dark:text-[#94A3B8] font-medium truncate mt-0.5">{act.details}</p>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 pl-4">
                    <span className={`font-black block text-[12px] ${
                      act.valueType === 'positive' ? 'text-slate-800 dark:text-[#F8FAFC]' :
                      act.valueType === 'highlight' ? 'text-emerald-600 dark:text-[#10B981] font-extrabold' :
                      act.valueType === 'negative' ? 'text-red-500 dark:text-[#EF4444]' :
                      'text-slate-550 dark:text-[#CBD5E1]'
                    }`}>
                      {act.valueText}
                    </span>
                    <span className="text-[8px] text-slate-400 dark:text-slate-550 font-semibold block mt-0.5">
                      {typeof formatActivityTime === 'function' ? formatActivityTime(act.timestamp) : '-'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
