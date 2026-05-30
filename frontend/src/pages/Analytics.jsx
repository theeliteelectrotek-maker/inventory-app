import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { 
  TrendingUp, TrendingDown, Calendar, AlertTriangle, 
  Loader2, IndianRupee, ShoppingCart, Percent, RotateCcw, 
  ChevronRight, ChevronLeft, BarChart3, HelpCircle, AlertOctagon,
  Boxes, Package2, DollarSign
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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

const PRESETS = [
  { id: 'today', label: 'Today', getRange: () => ({ start: getTodayStr(), end: getTodayStr() }) },
  { id: 'yesterday', label: 'Yesterday', getRange: () => ({ start: getTodayStr(-1), end: getTodayStr(-1) }) },
  { id: '7days', label: 'Last 7 Days', getRange: () => ({ start: getTodayStr(-6), end: getTodayStr() }) },
  { id: '30days', label: 'Last 30 Days', getRange: () => ({ start: getTodayStr(-29), end: getTodayStr() }) },
  { id: 'thisMonth', label: 'This Month', getRange: () => ({ start: getStartOfMonth(), end: getTodayStr() }) },
  { id: 'lastMonth', label: 'Last Month', getRange: () => ({ start: getStartOfMonth(-1), end: getEndOfMonth(-1) }) },
  { id: 'custom', label: 'Custom Range', getRange: (s, e) => ({ start: s || getTodayStr(-29), end: e || getTodayStr() }) },
];

const PLATFORM_INFO = {
  amazon: { label: 'Amazon', color: '#f97316', bg: 'bg-orange-50 border-orange-200', text: 'text-orange-700' },
  flipkart: { label: 'Flipkart', color: '#3b82f6', bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
  meesho: { label: 'Meesho', color: '#ec4899', bg: 'bg-pink-50 border-pink-200', text: 'text-pink-700' },
  offline: { label: 'Offline Sales', color: '#64748b', bg: 'bg-slate-50 border-slate-200', text: 'text-slate-700' },
};

// --- Custom Responsive SVG Donut Chart ---
function DonutChart({ data, title, centerValueLabel, centerValue }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-sm">
        No asset data available.
      </div>
    );
  }

  let accumulatedPercent = 0;
  const sectors = data.map((item, idx) => {
    const percent = item.value / total;
    const startPercent = accumulatedPercent;
    accumulatedPercent += percent;
    return { ...item, startPercent, endPercent: accumulatedPercent, percent, idx };
  });

  const getCoordinatesForPercent = (percent) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-around gap-4 py-2">
      {/* SVG Container */}
      <div className="relative w-36 h-36 flex-shrink-0">
        <svg viewBox="-1.2 -1.2 2.4 2.4" className="w-full h-full -rotate-90">
          {sectors.map((s) => {
            const [startX, startY] = getCoordinatesForPercent(s.startPercent);
            const [endX, endY] = getCoordinatesForPercent(s.endPercent);
            const largeArcFlag = s.percent > 0.5 ? 1 : 0;
            const pathData = s.percent === 1
              ? `M 0 -1 A 1 1 0 1 1 -0.0001 -1 Z`
              : `M ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} L 0 0 Z`;

            const isHovered = hoveredIdx === s.idx;
            return (
              <path
                key={s.idx}
                d={pathData}
                fill={s.color}
                opacity={hoveredIdx === null || isHovered ? 1 : 0.65}
                className="transition-all duration-300 cursor-pointer origin-center"
                style={{
                  transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                }}
                onMouseEnter={() => setHoveredIdx(s.idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}
          {/* Inner cutout for Donut */}
          <circle cx="0" cy="0" r="0.65" fill="#ffffff" />
        </svg>
        {/* Absolute Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
          {hoveredIdx !== null ? (
            <>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate max-w-full">
                {sectors[hoveredIdx].label}
              </span>
              <span className="text-sm font-extrabold text-slate-800">
                {((sectors[hoveredIdx].percent) * 100).toFixed(1)}%
              </span>
            </>
          ) : (
            <>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate max-w-full">
                {centerValueLabel}
              </span>
              <span className="text-xs font-extrabold text-slate-800 truncate max-w-full">
                {centerValue}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Legends */}
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 hidden sm:block">{title}</h4>
        {sectors.map((s) => (
          <div
            key={s.idx}
            className={`flex items-center justify-between text-xs px-2 py-1 rounded-lg transition-colors cursor-pointer ${
              hoveredIdx === s.idx ? 'bg-slate-50' : ''
            }`}
            onMouseEnter={() => setHoveredIdx(s.idx)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <div className="flex items-center gap-2 truncate mr-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
              <span className="font-semibold text-slate-700 truncate">{s.label}</span>
            </div>
            <span className="font-bold text-slate-500 text-[11px] whitespace-nowrap">
              ₹{s.value.toLocaleString('en-IN')} ({((s.percent) * 100).toFixed(0)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Custom Responsive SVG Line Chart ---
function LineChart({ data, dataKeys, colors, labels }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        No trend data available for this range.
      </div>
    );
  }

  let maxVal = 1000;
  data.forEach((d) => {
    dataKeys.forEach((key) => {
      if (d[key] > maxVal) maxVal = d[key];
    });
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
        {/* Horizontal Gridlines */}
        {gridLinesY.map((val, i) => {
          const y = getY(val);
          return (
            <g key={i} className="opacity-40">
              <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#e2e8f0" strokeDasharray="3,3" />
              <text x={paddingLeft - 8} y={y + 4} textAnchor="end" className="text-[10px] font-bold fill-slate-400">
                ₹{val >= 100000 ? `${(val / 100000).toFixed(1)}L` : val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
              </text>
            </g>
          );
        })}

        {/* Lines and Paths */}
        {dataKeys.map((key, kIdx) => {
          const points = data.map((d, i) => `${getX(i)},${getY(d[key] || 0)}`).join(' ');
          return (
            <g key={key}>
              <polyline
                fill="none"
                stroke={colors[kIdx]}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
                className="transition-all duration-300"
              />
              {data.map((d, i) => (
                <circle
                  key={i}
                  cx={getX(i)}
                  cy={getY(d[key] || 0)}
                  r={hoveredIdx === i ? "5" : "3"}
                  fill="#ffffff"
                  stroke={colors[kIdx]}
                  strokeWidth={hoveredIdx === i ? "3" : "2"}
                  className="cursor-pointer transition-all duration-150"
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              ))}
            </g>
          );
        })}

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
          const rawLabel = d.date || d.week || d.month || '';
          let displayLabel = rawLabel;
          if (rawLabel.includes('-')) {
            const parts = rawLabel.split('-');
            if (parts.length === 3) {
              const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              displayLabel = `${parts[2]} ${months[parseInt(parts[1], 10) - 1]}`;
            } else if (parts.length === 2) {
              const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              displayLabel = `${months[parseInt(parts[1], 10) - 1]} ${parts[0].substring(2)}`;
            }
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
            left: `${Math.min(chartWidth + 30, Math.max(30, (getX(hoveredIdx) / width) * 100))}%`,
            top: '5%',
            transform: 'translateX(-50%)',
          }}
        >
          <div className="font-bold border-b border-slate-800 pb-1 mb-1 text-slate-300">
            {data[hoveredIdx].date || data[hoveredIdx].week || data[hoveredIdx].month}
          </div>
          {dataKeys.map((key, kIdx) => (
            <div key={key} className="flex justify-between gap-6">
              <span className="font-semibold text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: colors[kIdx] }} />
                {labels[kIdx]}:
              </span>
              <span className="font-extrabold text-white">₹{data[hoveredIdx][key].toLocaleString('en-IN')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Custom Responsive SVG Bar Chart ---
function BarChart({ data, dataKey, color, label }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
        No asset details found.
      </div>
    );
  }

  let maxVal = 10;
  data.forEach((d) => {
    if (d[dataKey] > maxVal) maxVal = d[dataKey];
  });
  maxVal = Math.ceil(maxVal * 1.1);

  const width = 500;
  const height = 180;
  const paddingLeft = 60; // wider padding for product name bars
  const paddingRight = 10;
  const paddingTop = 10;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const barWidth = Math.max(4, Math.floor((chartWidth / data.length) * 0.65));
  const getX = (index) => {
    const spacing = chartWidth / data.length;
    return paddingLeft + index * spacing + (spacing - barWidth) / 2;
  };

  const getY = (value) => {
    return paddingTop + chartHeight - (value / maxVal) * chartHeight;
  };

  const labelInterval = Math.max(1, Math.floor(data.length / 5));

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
        {/* Horizontal Gridlines */}
        {[0, 0.5, 1].map((p, i) => {
          const val = Math.floor(maxVal * p);
          const y = getY(val);
          return (
            <g key={i} className="opacity-45">
              <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#f1f5f9" strokeWidth="1" />
              <text x={paddingLeft - 8} y={y + 4} textAnchor="end" className="text-[9px] font-bold fill-slate-400">
                {val >= 100000 ? `${(val / 100000).toFixed(1)}L` : val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const val = d[dataKey] || 0;
          const x = getX(i);
          const y = getY(val);
          const barHeight = chartHeight - (y - paddingTop);

          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(0, barHeight)}
              fill={color}
              rx={Math.min(3, barWidth / 3)}
              opacity={hoveredIdx === null || hoveredIdx === i ? 1 : 0.6}
              className="cursor-pointer transition-opacity duration-150"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          );
        })}

        {/* X Axis Labels */}
        {data.map((d, i) => {
          if (i % labelInterval !== 0 && i !== data.length - 1) return null;
          const x = getX(i) + barWidth / 2;
          const rawLabel = d.date || d.week || d.month || d.label || '';
          
          // Truncate labels for product names
          const displayLabel = rawLabel.length > 8 ? `${rawLabel.substring(0, 7)}…` : rawLabel;
          return (
            <text
              key={i}
              x={x}
              y={height - paddingBottom + 16}
              textAnchor="middle"
              className="text-[9px] font-bold fill-slate-400"
            >
              {displayLabel}
            </text>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoveredIdx !== null && (
        <div
          className="absolute z-20 bg-slate-950 text-white rounded-lg shadow-lg px-2.5 py-1.5 text-[10px] pointer-events-none text-center max-w-[150px]"
          style={{
            left: `${(getX(hoveredIdx) / width) * 100}%`,
            top: '5%',
            transform: 'translateX(-50%)',
          }}
        >
          <div className="font-bold text-slate-300 truncate">{data[hoveredIdx].date || data[hoveredIdx].week || data[hoveredIdx].month || data[hoveredIdx].label}</div>
          <div className="font-extrabold mt-0.5">₹{data[hoveredIdx][dataKey].toLocaleString('en-IN')}</div>
        </div>
      )}
    </div>
  );
}

// --- Main Analytics Component ---
export default function Analytics() {
  const { user } = useAuth();
  
  // Tab Switcher state: 'profitability' | 'inventory'
  const [activeTab, setActiveTab] = useState('profitability');
  
  // Date states for profitability tab
  const [preset, setPreset] = useState('30days');
  const [customStart, setCustomStart] = useState(getTodayStr(-29));
  const [customEnd, setCustomEnd] = useState(getTodayStr());
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState(null);

  const [trendTab, setTrendTab] = useState('daily');
  const [productTab, setProductTab] = useState('profitable');

  const activeRange = () => {
    const matched = PRESETS.find(p => p.id === preset);
    if (preset === 'custom') {
      return { start: customStart, end: customEnd };
    }
    return matched ? matched.getRange() : PRESETS[3].getRange();
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const range = activeRange();
      const res = await api.getAnalytics(range.start, range.end);
      setAnalytics(res);
    } catch (err) {
      setError(err.message || 'Failed to load business analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [preset, customStart, customEnd]);

  // Format currency helper
  const fmt = (val) => {
    if (val === undefined || val === null) return '₹0';
    return `₹${Math.round(val).toLocaleString('en-IN')}`;
  };

  const overview = analytics?.overview || {};
  const platforms = analytics?.platforms || {};
  const productsList = analytics?.products || {};
  const trends = analytics?.trends || {};
  const inv = analytics?.inventory || {
    summary: { totalProducts: 0, totalUnits: 0, totalValue: 0 },
    lowStock: [],
    outOfStock: [],
    rankings: { highest: [], lowest: [] },
    distribution: { byCategory: [], byProduct: [] }
  };

  const getDonutData = (metric) => {
    return Object.keys(platforms).map(key => {
      const p = platforms[key];
      return {
        label: PLATFORM_INFO[key]?.label || key,
        value: p[metric] || 0,
        color: PLATFORM_INFO[key]?.color || '#cbd5e1'
      };
    });
  };

  // Category donut colors mapping
  const categoryDonutData = (inv.distribution?.byCategory || []).map((cat, idx) => {
    const colors = ['#f59e0b', '#3b82f6', '#ec4899', '#10b981', '#8b5cf6', '#ef4444', '#14b8a6', '#64748b'];
    return {
      label: cat.category,
      value: cat.value,
      color: colors[idx % colors.length]
    };
  });

  const productBarData = (inv.distribution?.byProduct || []).map(p => ({
    label: p.name,
    value: p.value
  }));

  return (
    <div className="space-y-6">
      {/* 1. Header Page Title Block */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Business Analytics & Profit Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Real-time overview of business profitability, marketplaces, and current inventory assets</p>
        </div>

        {/* Section View Tabs Switched Navigation */}
        <div className="flex p-1 bg-slate-200/80 rounded-2xl self-start w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('profitability')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'profitability'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <DollarSign size={14} />
            Sales & Profitability
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'inventory'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Boxes size={14} />
            Inventory Value & Alerts
          </button>
        </div>
      </div>

      {/* Loading & Error Overlays */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 text-slate-400 gap-3">
          <Loader2 size={36} className="animate-spin text-red-600" />
          <p className="text-sm font-semibold">Recalculating analytics ledger indices…</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl flex items-center gap-3">
          <AlertTriangle className="text-red-500 flex-shrink-0" />
          <div>
            <h4 className="font-bold">Error Loading Data</h4>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      ) : (
        <>
          {/* TAB 1: SALES & PROFITABILITY VIEW */}
          {activeTab === 'profitability' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Date Filters Header bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={14} /> Period filters:
                </span>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPreset(p.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        preset === p.id 
                          ? 'bg-red-600 text-white shadow-sm' 
                          : 'text-slate-500 hover:bg-slate-200/60 hover:text-slate-800'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {preset === 'custom' && (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-center gap-4 animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-500 uppercase">Custom Dates</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="py-1.5 px-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <span className="text-slate-400 text-xs font-bold uppercase">to</span>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="py-1.5 px-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <button
                    onClick={fetchAnalytics}
                    className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                  >
                    Apply Range
                  </button>
                </div>
              )}

              {/* Profitability Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Revenue</span>
                    <p className="text-xl font-black text-slate-800 mt-1">{fmt(overview.revenue)}</p>
                  </div>
                  <div className="mt-3 text-[10px] font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg self-start">
                    Gross sales receipts
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Product Cost (COGS)</span>
                    <p className="text-xl font-black text-slate-800 mt-1">{fmt(overview.productCost)}</p>
                  </div>
                  <div className="mt-3 text-[10px] font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg self-start">
                    Cost of materials sold
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Gross Profit</span>
                    <p className="text-xl font-black text-slate-800 mt-1">{fmt(overview.grossProfit)}</p>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-[10px] font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-lg self-start">
                    <TrendingUp size={11} /> {overview.revenue > 0 ? ((overview.grossProfit / overview.revenue) * 100).toFixed(0) : 0}% margin
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Returns Cost</span>
                    <p className="text-xl font-black text-red-500 mt-1">{fmt(overview.returnsValue)}</p>
                  </div>
                  <div className="mt-3 text-[10px] font-semibold text-red-500 bg-red-50 px-2 py-1 rounded-lg self-start">
                    Lost returned sales value
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between relative overflow-hidden ring-2 ring-emerald-500 ring-offset-2">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Net Profit</span>
                    <p className="text-2xl font-black text-emerald-600 mt-1">{fmt(overview.netProfit)}</p>
                  </div>
                  <div className={`mt-3 flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg self-start ${
                    overview.netProfit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                  }`}>
                    {overview.netProfit >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    {overview.revenue > 0 ? ((overview.netProfit / overview.revenue) * 100).toFixed(0) : 0}% net margin
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Units Sold</span>
                    <p className="text-xl font-black text-slate-800 mt-1">{overview.unitsSold || 0} pcs</p>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg self-start">
                    <Percent size={11} className="text-orange-500" /> {overview.returnPercentage ? overview.returnPercentage.toFixed(1) : 0}% returns
                  </div>
                </div>
              </div>

              {/* Profit Trends and Platform Share charts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 lg:col-span-2 flex flex-col">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-base">Monthly Profit Trend</h3>
                      <p className="text-slate-400 text-xs mt-0.5">Tracking revenue vs net profit over time</p>
                    </div>
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-xl self-start">
                      {['daily', 'weekly', 'monthly'].map((t) => (
                        <button
                          key={t}
                          onClick={() => setTrendTab(t)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                            trendTab === t 
                              ? 'bg-white text-slate-800 shadow-sm' 
                              : 'text-slate-400 hover:text-slate-700'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 flex items-center">
                    <LineChart
                      data={trends[trendTab] || []}
                      dataKeys={['revenue', 'profit']}
                      colors={['#e11d48', '#10b981']}
                      labels={['Revenue', 'Net Profit']}
                    />
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col gap-6">
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-base">Platform Distribution</h3>
                    <p className="text-slate-400 text-xs mt-0.5">Distribution of revenue and profits per marketplace</p>
                  </div>
                  
                  <div className="divide-y divide-slate-100 flex-1 flex flex-col justify-around">
                    <div className="pb-4">
                      <DonutChart
                        data={getDonutData('revenue')}
                        title="Revenue Share"
                        centerValueLabel="Total Revenue"
                        centerValue={fmt(overview.revenue)}
                      />
                    </div>
                    <div className="pt-4">
                      <DonutChart
                        data={getDonutData('netProfit')}
                        title="Profit Share"
                        centerValueLabel="Net Profit"
                        centerValue={fmt(overview.netProfit)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Platform performance breakdown */}
              <div className="space-y-4">
                <h3 className="font-extrabold text-slate-800 text-base">Marketplace & Offline Performance</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Object.keys(PLATFORM_INFO).map((key) => {
                    const p = platforms[key] || { revenue: 0, productCost: 0, grossProfit: 0, returnsValue: 0, netProfit: 0, unitsSold: 0, unitsReturned: 0 };
                    const info = PLATFORM_INFO[key];
                    const rPercent = p.unitsSold > 0 ? ((p.unitsReturned / p.unitsSold) * 100) : 0;
                    
                    return (
                      <div key={key} className={`bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col`}>
                        <div className={`px-4 py-3 flex items-center justify-between border-b ${info.bg}`}>
                          <span className={`text-sm font-bold uppercase tracking-wider ${info.text}`}>{info.label}</span>
                          <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full shadow-sm">
                            {p.unitsSold} sold
                          </span>
                        </div>

                        <div className="p-4 flex-1 flex flex-col justify-between gap-3 text-xs">
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-slate-400 font-semibold">Revenue</span>
                              <span className="font-bold text-slate-800">{fmt(p.revenue)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400 font-semibold">Product Cost</span>
                              <span className="font-bold text-slate-600">{fmt(p.productCost)}</span>
                            </div>
                            <div className="flex justify-between border-t border-slate-50 pt-1.5">
                              <span className="text-slate-400 font-semibold">Gross Profit</span>
                              <span className="font-bold text-slate-800">{fmt(p.grossProfit)}</span>
                            </div>
                            <div className="flex justify-between text-red-500">
                              <span className="font-semibold">Returns Loss</span>
                              <span className="font-bold">-{fmt(p.returnsValue)}</span>
                            </div>
                          </div>

                          <div className="border-t pt-3 flex justify-between items-center">
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">Net Profit</span>
                              <span className={`text-base font-extrabold ${p.netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                {fmt(p.netProfit)}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] font-bold text-slate-400 block">Returns %</span>
                              <span className="font-bold text-slate-600">{rPercent.toFixed(0)}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Product rankings lists & returns cost */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 lg:col-span-2 flex flex-col">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-base">Product Contribution Profit</h3>
                      <p className="text-slate-400 text-xs mt-0.5">Rankings of product profit performance</p>
                    </div>
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                      <button
                        onClick={() => setProductTab('profitable')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                          productTab === 'profitable' 
                            ? 'bg-white text-slate-800 shadow-sm' 
                            : 'text-slate-400 hover:text-slate-700'
                        }`}
                      >
                        Top Profitable
                      </button>
                      <button
                        onClick={() => setProductTab('leastProfitable')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                          productTab === 'leastProfitable' 
                            ? 'bg-white text-slate-800 shadow-sm' 
                            : 'text-slate-400 hover:text-slate-700'
                        }`}
                      >
                        Least Profitable
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="text-[10px] font-bold uppercase text-slate-400 tracking-wider border-b pb-2">
                          <th className="py-2">Rank / Product</th>
                          <th className="py-2 text-center">Qty Sold</th>
                          <th className="py-2 text-right">Revenue</th>
                          <th className="py-2 text-right">Product Cost</th>
                          <th className="py-2 text-right">Net Profit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(productTab === 'profitable' ? productsList.top10 : productsList.least10 || []).map((p, idx) => (
                          <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-2.5">
                              <div className="flex items-center gap-2">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] flex-shrink-0 ${
                                  productTab === 'profitable' 
                                    ? idx < 3 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                                    : idx < 3 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {idx + 1}
                                </span>
                                <span className="font-semibold text-slate-800 max-w-[150px] sm:max-w-[200px] truncate block" title={p.name}>
                                  {p.name}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 text-center font-medium text-slate-600">{p.soldQty}</td>
                            <td className="py-2.5 text-right font-medium text-slate-700">{fmt(p.revenue)}</td>
                            <td className="py-2.5 text-right font-medium text-slate-600">{fmt(p.productCost)}</td>
                            <td className={`py-2.5 text-right font-bold ${p.netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                              {fmt(p.netProfit)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col gap-4">
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-base">Return Trends & Metrics</h3>
                    <p className="text-slate-400 text-xs mt-0.5">Analysis of items returned and refunds per channel</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-2.5 text-center">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Total Returns</span>
                      <span className="text-sm font-black text-slate-700 block mt-0.5">{overview.unitsReturned || 0} pcs</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-2.5 text-center">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Return Rate</span>
                      <span className="text-sm font-black text-orange-600 block mt-0.5">
                        {overview.returnPercentage ? overview.returnPercentage.toFixed(1) : 0}%
                      </span>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-2.5 text-center">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Refund Cost</span>
                      <span className="text-sm font-black text-red-500 block mt-0.5">{fmt(overview.returnsValue)}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    {Object.keys(platforms).map(key => {
                      const p = platforms[key] || {};
                      const label = PLATFORM_INFO[key]?.label || key;
                      const count = p.unitsReturned || 0;
                      const val = p.returnsValue || 0;
                      return (
                        <div key={key} className="flex justify-between items-center bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                          <span className="font-semibold text-slate-600">{label} Returns</span>
                          <span className="font-bold text-slate-800 text-[11px]">
                            {count} items <span className="text-slate-400 font-normal">({fmt(val)})</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-100 flex-1 flex flex-col justify-end">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Returns Trend Timeline</span>
                    <BarChart
                      data={trends[trendTab] || []}
                      dataKey="returns"
                      color="#ef4444"
                      label="Units Returned"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INVENTORY VALUE & ALERTS VIEW */}
          {activeTab === 'inventory' && (
            <div className="space-y-6 animate-fadeIn">
              {/* 1. Inventory Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {/* Total Inventory Value */}
                <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
                  <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-10">
                    <IndianRupee size={160} />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-100/80">Current Inventory Value</span>
                  <h2 className="text-3xl font-black mt-2">{fmt(inv.summary.totalValue)}</h2>
                  <p className="text-xs text-emerald-100/90 mt-2 font-medium">Asset value based on cost price</p>
                </div>

                {/* Total Products */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Products</span>
                    <p className="text-3xl font-black text-slate-800 mt-2">{inv.summary.totalProducts || 0}</p>
                  </div>
                  <div className="mt-4 text-xs font-semibold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl self-start">
                    Unique active SKUs in collection
                  </div>
                </div>

                {/* Total Units In Stock */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Units in Stock</span>
                    <p className="text-3xl font-black text-slate-800 mt-2">{(inv.summary.totalUnits || 0).toLocaleString()}</p>
                  </div>
                  <div className="mt-4 text-xs font-semibold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl self-start">
                    Aggregate pieces in warehouses
                  </div>
                </div>
              </div>

              {/* 2. Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Category Donut Share Chart */}
                <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col">
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-base">Value share by Category</h3>
                    <p className="text-slate-400 text-xs mt-0.5">Asset investment share per product category</p>
                  </div>
                  <div className="flex-1 flex items-center">
                    <DonutChart
                      data={categoryDonutData}
                      title="Category share"
                      centerValueLabel="Total Value"
                      centerValue={fmt(inv.summary.totalValue)}
                    />
                  </div>
                </div>

                {/* Highest Investment Products Bar Chart */}
                <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 lg:col-span-2 flex flex-col">
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-base">Top Product Investments</h3>
                    <p className="text-slate-400 text-xs mt-0.5">Highest value concentrations in stock</p>
                  </div>
                  <div className="flex-1 flex items-center">
                    <BarChart
                      data={productBarData}
                      dataKey="value"
                      color="#10b981"
                      label="Inventory Value"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Alerts: Low stock / Out of stock lists */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Low Stock Alerts */}
                <div className="bg-white rounded-3xl p-5 shadow-sm border border-red-100 flex flex-col max-h-[380px]">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-3 flex-shrink-0">
                    <AlertTriangle className="text-red-500" size={18} />
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-sm">Low Stock Alerts (Stock &le; 10)</h3>
                      <p className="text-slate-400 text-[11px] mt-0.5">Products running low and needing restock</p>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto pr-1">
                    {inv.lowStock.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                        <Boxes size={24} className="opacity-40" />
                        <span className="text-xs font-semibold">No low stock items. All good!</span>
                      </div>
                    ) : (
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="text-[10px] text-slate-400 uppercase font-bold tracking-wider border-b pb-1.5">
                            <th className="py-1">Product</th>
                            <th className="py-1 text-right">Available Qty</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {inv.lowStock.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50">
                              <td className="py-2 font-medium text-slate-700">{p.name}</td>
                              <td className="py-2 text-right font-black text-red-600">{p.availableQty} units</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* Out of Stock Products */}
                <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 flex flex-col max-h-[380px]">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-3 flex-shrink-0">
                    <AlertOctagon className="text-slate-400" size={18} />
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-sm">Out of Stock Products</h3>
                      <p className="text-slate-400 text-[11px] mt-0.5">Products with zero units in stock</p>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto pr-1">
                    {inv.outOfStock.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                        <Package2 size={24} className="opacity-40" />
                        <span className="text-xs font-semibold">No products are completely out of stock.</span>
                      </div>
                    ) : (
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="text-[10px] text-slate-400 uppercase font-bold tracking-wider border-b pb-1.5">
                            <th className="py-1">Product</th>
                            <th className="py-1 text-right">Stock</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {inv.outOfStock.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50">
                              <td className="py-2 font-medium text-slate-700">{p.name}</td>
                              <td className="py-2 text-right font-bold text-slate-400">0 units</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>

              {/* 4. Investment Rankings listings */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Highest Value Products */}
                <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col">
                  <div className="pb-3 border-b border-slate-100 mb-3">
                    <h3 className="font-extrabold text-slate-800 text-sm">Highest Inventory Value (Top 10)</h3>
                    <p className="text-slate-400 text-[11px] mt-0.5">Top products carrying maximum investment capital</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="text-[10px] text-slate-400 uppercase font-bold tracking-wider border-b pb-2">
                          <th className="py-2">Product</th>
                          <th className="py-2 text-center">Stock Qty</th>
                          <th className="py-2 text-right">Cost Price</th>
                          <th className="py-2 text-right">Inventory Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {inv.rankings.highest.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50/50">
                            <td className="py-2.5 font-semibold text-slate-800">{p.name}</td>
                            <td className="py-2.5 text-center font-medium text-slate-600">{p.qty}</td>
                            <td className="py-2.5 text-right font-medium text-slate-600">{fmt(p.costPrice)}</td>
                            <td className="py-2.5 text-right font-extrabold text-slate-800">{fmt(p.value)}</td>
                          </tr>
                        ))}
                        {inv.rankings.highest.length === 0 && (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-slate-400 font-semibold">No stock values to list.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Lowest Value Products */}
                <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col">
                  <div className="pb-3 border-b border-slate-100 mb-3">
                    <h3 className="font-extrabold text-slate-800 text-sm">Lowest Inventory Value (Top 10 Active)</h3>
                    <p className="text-slate-400 text-[11px] mt-0.5">Active products holding minimal stock asset values</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="text-[10px] text-slate-400 uppercase font-bold tracking-wider border-b pb-2">
                          <th className="py-2">Product</th>
                          <th className="py-2 text-center">Stock Qty</th>
                          <th className="py-2 text-right">Cost Price</th>
                          <th className="py-2 text-right">Inventory Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {inv.rankings.lowest.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50/50">
                            <td className="py-2.5 font-semibold text-slate-700">{p.name}</td>
                            <td className="py-2.5 text-center font-medium text-slate-600">{p.qty}</td>
                            <td className="py-2.5 text-right font-medium text-slate-600">{fmt(p.costPrice)}</td>
                            <td className="py-2.5 text-right font-bold text-slate-600">{fmt(p.value)}</td>
                          </tr>
                        ))}
                        {inv.rankings.lowest.length === 0 && (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-slate-400 font-semibold">No stock values to list.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
