import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import {
  Package, ShoppingCart, Store, TrendingUp, AlertTriangle,
  XCircle, Clock, IndianRupee, Loader2, CalendarDays, Building2, 
  ChevronLeft, ChevronRight, CheckCircle2, RotateCcw, ShieldCheck,
  Percent, ArrowUpRight, DollarSign, Activity, FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PLATFORM_COLORS = { 
  amazon: 'bg-orange-100 text-orange-700 border-orange-200', 
  flipkart: 'bg-blue-100 text-blue-700 border-blue-200', 
  meesho: 'bg-pink-100 text-pink-700 border-pink-200' 
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function currentYear() { return new Date().getFullYear(); }

function matchesFilter(dateStr, year, month) {
  if (!dateStr) return false;
  if (month !== null) return dateStr.slice(0, 7) === `${year}-${String(month + 1).padStart(2, '0')}`;
  return dateStr.startsWith(String(year));
}

function filterLabel(year, month) {
  if (month !== null) return `${MONTHS[month]} ${year}`;
  return String(year);
}

function parseLocalDate(dateStr) {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-');
  if (parts.length !== 3) return new Date(dateStr);
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return new Date(year, month, day);
}

// --- Circular Health Score Gauge ---
function CircularProgress({ score }) {
  const radius = 46;
  const stroke = 7;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  let color = 'stroke-emerald-500';
  let bg = 'bg-emerald-50 text-emerald-600 border-emerald-100';
  let text = 'Excellent';
  if (score < 60) {
    color = 'stroke-red-500';
    bg = 'bg-red-50 text-red-600 border-red-100';
    text = 'Critical';
  } else if (score < 80) {
    color = 'stroke-yellow-500';
    bg = 'bg-yellow-50 text-yellow-600 border-yellow-100';
    text = 'Warning';
  } else if (score < 90) {
    color = 'stroke-blue-500';
    bg = 'bg-blue-50 text-blue-600 border-blue-100';
    text = 'Good';
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5 bg-white rounded-3xl p-5 shadow-sm border border-slate-100 h-full">
      <div className="relative w-24 h-24 flex-shrink-0 flex items-center justify-center">
        <svg height={radius * 2} width={radius * 2} className="-rotate-90">
          <circle
            stroke="#f1f5f9"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <circle
            className={`transition-all duration-700 ease-out ${color}`}
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={circumference + ' ' + circumference}
            style={{ strokeDashoffset }}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute text-xl font-black text-slate-800">{score}%</span>
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Business Health Index</span>
        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold mt-1 border ${bg}`}>
          {text}
        </span>
        <p className="text-slate-500 text-[11px] mt-2 leading-relaxed">
          {score >= 90 ? 'Operational metrics are in perfect health. Low dues, healthy inventory count, and high profits.' :
           score >= 80 ? 'Operations are stable. Mind low stocks and outstanding shop payments.' :
           score >= 60 ? 'Moderate concerns detected. Out of stock products and high pending payments require review.' :
           'Critical. Significant outstanding debts and high percentage of out of stock products.'}
        </p>
      </div>
    </div>
  );
}

// --- Custom Dashboard Trend Line Chart ---
function TrendLineChart({ data }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
        No sales data recorded.
      </div>
    );
  }

  // Find max value
  let maxVal = 1000;
  data.forEach((d) => {
    if (d.combined > maxVal) maxVal = d.combined;
  });
  maxVal = Math.ceil(maxVal * 1.15);

  const width = 600;
  const height = 180;
  const paddingLeft = 55;
  const paddingRight = 15;
  const paddingTop = 15;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const getX = (index) => {
    if (data.length <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (index / (data.length - 1)) * chartWidth;
  };

  const getY = (value) => {
    return paddingTop + chartHeight - (value / maxVal) * chartHeight;
  };

  const labelInterval = Math.max(1, Math.floor(data.length / 5));

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
        {/* Horizontal Ticks & Gridlines */}
        {[0, 0.5, 1].map((p, i) => {
          const val = Math.floor(maxVal * p);
          const y = getY(val);
          return (
            <g key={i} className="opacity-45">
              <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#f1f5f9" strokeWidth="1" />
              <text x={paddingLeft - 8} y={y + 3} textAnchor="end" className="text-[9px] font-bold fill-slate-400">
                ₹{val >= 100000 ? `${(val / 100000).toFixed(1)}L` : val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
              </text>
            </g>
          );
        })}

        {/* Combined sales path */}
        {(() => {
          const points = data.map((d, i) => `${getX(i)},${getY(d.combined || 0)}`).join(' ');
          return (
            <polyline
              fill="none"
              stroke="#6366f1"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
            />
          );
        })()}

        {/* Online sales path (dashed orange) */}
        {(() => {
          const points = data.map((d, i) => `${getX(i)},${getY(d.online || 0)}`).join(' ');
          return (
            <polyline
              fill="none"
              stroke="#f97316"
              strokeWidth="1.5"
              strokeDasharray="3,3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
            />
          );
        })()}

        {/* Offline sales path (dashed blue) */}
        {(() => {
          const points = data.map((d, i) => `${getX(i)},${getY(d.offline || 0)}`).join(' ');
          return (
            <polyline
              fill="none"
              stroke="#3b82f6"
              strokeWidth="1.5"
              strokeDasharray="3,3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
            />
          );
        })()}

        {/* Dynamic Hover circles */}
        {data.map((d, i) => (
          <circle
            key={i}
            cx={getX(i)}
            cy={getY(d.combined || 0)}
            r={hoveredIdx === i ? "5" : "3"}
            fill="#ffffff"
            stroke="#6366f1"
            strokeWidth={hoveredIdx === i ? "3" : "1.5"}
            className="cursor-pointer transition-all duration-100"
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          />
        ))}

        {/* Hover alignment vertical bar */}
        {hoveredIdx !== null && (
          <line
            x1={getX(hoveredIdx)}
            y1={paddingTop}
            x2={getX(hoveredIdx)}
            y2={paddingTop + chartHeight}
            stroke="#cbd5e1"
            strokeWidth="1"
            strokeDasharray="2,2"
          />
        )}

        {/* X labels */}
        {data.map((d, i) => {
          if (i % labelInterval !== 0 && i !== data.length - 1) return null;
          const x = getX(i);
          const rawLabel = d.date || '';
          let displayLabel = rawLabel;
          if (rawLabel.includes('-')) {
            const parts = rawLabel.split('-');
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            displayLabel = `${parts[2]} ${months[parseInt(parts[1], 10) - 1]}`;
          }
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

      {/* Tooltip Card */}
      {hoveredIdx !== null && (
        <div
          className="absolute z-20 bg-slate-900 border border-slate-800 text-white rounded-xl shadow-xl p-2.5 text-[10px] pointer-events-none flex flex-col gap-0.5"
          style={{
            left: `${(getX(hoveredIdx) / width) * 100}%`,
            top: '5%',
            transform: 'translateX(-50%)',
          }}
        >
          <div className="font-bold text-slate-400 border-b border-slate-800 pb-1 mb-1">{data[hoveredIdx].date}</div>
          <div className="flex justify-between gap-4">
            <span className="font-semibold text-slate-300">Revenue (Combined):</span>
            <span className="font-black text-indigo-400">₹{Math.round(data[hoveredIdx].combined).toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="font-semibold text-slate-300">Online Sales:</span>
            <span className="font-black text-orange-400">₹{Math.round(data[hoveredIdx].online).toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="font-semibold text-slate-300">Offline Sales:</span>
            <span className="font-black text-blue-400">₹{Math.round(data[hoveredIdx].offline).toLocaleString('en-IN')}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Custom SVG Donut Chart (Revenue Breakdown) ---
function RevenueDonut({ data, total }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  
  if (total === 0) {
    return <div className="text-center text-slate-400 text-xs py-8">No data recorded.</div>;
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
    <div className="flex flex-col sm:flex-row items-center justify-around gap-4 h-full">
      <div className="relative w-32 h-32 flex-shrink-0">
        <svg viewBox="-1.1 -1.1 2.2 2.2" className="w-full h-full -rotate-90">
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
                style={{ transform: isHovered ? 'scale(1.04)' : 'scale(1)' }}
                onMouseEnter={() => setHoveredIdx(s.idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}
          <circle cx="0" cy="0" r="0.65" fill="#ffffff" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-1">
          {hoveredIdx !== null ? (
            <>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider truncate max-w-full">
                {sectors[hoveredIdx].label}
              </span>
              <span className="text-xs font-black text-slate-800">
                {((sectors[hoveredIdx].percent) * 100).toFixed(0)}%
              </span>
            </>
          ) : (
            <>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Breakdown</span>
              <span className="text-[10px] font-extrabold text-slate-800">Revenue</span>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1 flex-1 min-w-0">
        {sectors.map((s) => (
          <div
            key={s.idx}
            className={`flex items-center justify-between text-xs px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
              hoveredIdx === s.idx ? 'bg-slate-50' : ''
            }`}
            onMouseEnter={() => setHoveredIdx(s.idx)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <div className="flex items-center gap-1.5 truncate mr-2">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
              <span className="font-semibold text-slate-600 truncate">{s.label}</span>
            </div>
            <span className="font-bold text-slate-700 text-[10px] whitespace-nowrap">
              ₹{Math.round(s.value).toLocaleString('en-IN')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Main Dashboard Redesign Component ---
export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [onlineSales, setOnlineSales] = useState([]);
  const [offlineSales, setOfflineSales] = useState([]);
  const [totalShops, setTotalShops] = useState(0);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [year, setYear] = useState(currentYear());
  const [month, setMonth] = useState(new Date().getMonth());

  useEffect(() => {
    Promise.all([api.getStats(), api.getOnlineSales(), api.getOfflineSales(), api.getShops(), api.getReturns()])
      .then(([apiStats, online, offline, shops, rets]) => {
        setStats(apiStats);
        setOnlineSales(online);
        setOfflineSales(offline);
        setTotalShops(shops.length);
        setReturns(rets);
        setError(null);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load dashboard statistics. Please ensure node servers are running.");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400 gap-2">
      <Loader2 size={24} className="animate-spin text-red-600" />
      <span className="text-sm font-semibold">Loading command center dashboard…</span>
    </div>
  );

  if (error || !stats) return (
    <div className="flex flex-col items-center justify-center h-64 text-slate-500 space-y-3">
      <AlertTriangle size={36} className="text-red-500" />
      <p className="font-semibold text-slate-700">{error || "Data unavailable"}</p>
      <button onClick={() => window.location.reload()} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors">Retry Connection</button>
    </div>
  );

  // Client-side monthly filters (for recent list matching)
  const filteredOnline = onlineSales.filter((s) => matchesFilter(s.date, year, month));
  const filteredReturns = returns.filter((r) => matchesFilter(r.date || r.createdAt, year, month));
  const filteredOffline = offlineSales.filter((s) => matchesFilter(s.date, year, month));

  const recentOnline = [...filteredOnline].reverse().slice(0, 5);
  const recentOffline = [...filteredOffline].reverse().slice(0, 5);

  const label = filterLabel(year, month);
  const fmt = (val) => `₹${Math.round(val || 0).toLocaleString('en-IN')}`;

  // Overdue pending list (> 10 days old)
  const overdueCompanies = {};
  const todayMs = new Date().setHours(0, 0, 0, 0);
  offlineSales.forEach((s) => {
    if (s.amountLeft > 0 && s.date) {
      const saleMs = parseLocalDate(s.date).setHours(0, 0, 0, 0);
      const ageDays = Math.floor((todayMs - saleMs) / (1000 * 60 * 60 * 24));
      if (ageDays > 10) {
        if (!overdueCompanies[s.buyerName]) {
          overdueCompanies[s.buyerName] = { amount: 0, maxAge: 0 };
        }
        overdueCompanies[s.buyerName].amount += s.amountLeft;
        overdueCompanies[s.buyerName].maxAge = Math.max(overdueCompanies[s.buyerName].maxAge, ageDays);
      }
    }
  });
  const overdueList = Object.entries(overdueCompanies).map(([name, data]) => ({
    name,
    amount: data.amount,
    age: data.maxAge
  })).sort((a, b) => b.amount - a.amount);

  // Maximum Qty Sold for Top 5 progress scaling
  const maxSellingQty = stats.top5SellingProducts?.[0]?.qty || 1;

  // Donut chart breakdown mapping
  const breakdownTotal = stats.onlineRevenueTotal + stats.offlineRevenueTotal;
  const breakdownData = [
    { label: 'Online Sales', value: stats.onlineRevenueTotal, color: '#ec4899' },
    { label: 'Offline Sales', value: stats.offlineRevenueTotal, color: '#3b82f6' },
    { label: 'Returns Loss', value: stats.returnsValue, color: '#ef4444' },
    { label: 'Net Profit', value: stats.netProfit, color: '#10b981' }
  ];

  return (
    <div className="space-y-6">
      {/* Page Title Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Business Command Center</h1>
          <p className="text-slate-500 text-sm mt-1">Real-time telemetry, operational health indices, and quick insights</p>
        </div>

        {/* Month/Year selector filter */}
        <div className="flex flex-wrap items-center gap-2.5 bg-white border border-slate-200 rounded-2xl p-2.5 shadow-sm max-w-full overflow-hidden">
          <div className="flex items-center gap-1.5">
            <CalendarDays size={16} className="text-slate-400 flex-shrink-0" />
            <button onClick={() => setYear((y) => y - 1)} className="p-0.5 rounded text-slate-400 hover:text-slate-700"><ChevronLeft size={15} /></button>
            <span className="text-xs font-bold text-slate-700 w-10 text-center">{year}</span>
            <button onClick={() => setYear((y) => y + 1)} className="p-0.5 rounded text-slate-400 hover:text-slate-700"><ChevronRight size={15} /></button>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none max-w-full py-0.5 border-l border-slate-100 pl-2">
            <button
              onClick={() => setMonth(null)}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 ${month === null ? 'bg-red-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-800'}`}>
              All
            </button>
            {MONTHS.map((m, i) => (
              <button key={m} onClick={() => setMonth(i)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 ${month === i ? 'bg-red-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-800'}`}>
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Top KPI Section cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Today's Sales</span>
            <p className="text-2xl font-black text-slate-800">{fmt(stats.todaySales)}</p>
            <span className="text-[9px] font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full inline-block">
              {stats.onlineSalesToday + stats.offlineSalesToday} orders today
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
            <ShoppingCart size={22} />
          </div>
        </div>

        {/* Today's Profit */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Today's Profit</span>
            <p className={`text-2xl font-black ${stats.todayProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {fmt(stats.todayProfit)}
            </p>
            <span className="text-[9px] font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full inline-block">
              Revenue minus product cost
            </span>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
            stats.todayProfit >= 0 
              ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
              : 'bg-red-50 border-red-100 text-red-500'
          }`}>
            <TrendingUp size={22} />
          </div>
        </div>

        {/* Inventory Value */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Inventory Valuation</span>
            <p className="text-2xl font-black text-slate-800">{fmt(stats.inventoryValue)}</p>
            <span className="text-[9px] font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full inline-block">
              Asset values in warehouse
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
            <Package size={22} />
          </div>
        </div>

        {/* Pending Payments */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pending Customer Dues</span>
            <p className="text-2xl font-black text-red-500">{fmt(stats.pendingPayments)}</p>
            <span className="text-[9px] font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full inline-block">
              Awaiting shop clearance
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 text-red-500 flex items-center justify-center">
            <Clock size={22} />
          </div>
        </div>
      </div>

      {/* 3. Middle Section: Health score Radial & Trend Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Business Health Widget */}
        <div className="lg:col-span-1">
          <CircularProgress score={stats.healthScore} />
        </div>

        {/* Combined Daily Trend Line Chart */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm">Combined Daily Sales Trend</h3>
              <p className="text-slate-400 text-[10px] mt-0.5">Trailing 30 days combined sales (Orange: Online, Blue: Offline, Indigo: Combined)</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-500 flex items-center justify-center">
              <Activity size={15} />
            </div>
          </div>
          <div className="flex-1 flex items-center">
            <TrendLineChart data={stats.dailyTrend || []} />
          </div>
        </div>
      </div>

      {/* 4. Lower Cards: Insights, Selling progress, Revenue breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Quick Insights */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="pb-3 border-b border-slate-100 mb-3">
            <h3 className="font-extrabold text-slate-800 text-sm">Quick Business Insights</h3>
            <p className="text-slate-400 text-[11px]">Highlights of current stock states and receivables</p>
          </div>

          <div className="space-y-3 flex-1 flex flex-col justify-around py-1">
            {/* Best Seller */}
            <div className="flex items-center justify-between text-xs border-b border-slate-50 pb-2">
              <span className="text-slate-400 font-semibold">Top Selling SKU</span>
              <span className="font-bold text-slate-800 truncate max-w-[150px]">{stats.bestSellingProduct}</span>
            </div>
            {/* Low stock */}
            <div className="flex items-center justify-between text-xs border-b border-slate-50 pb-2">
              <span className="text-slate-400 font-semibold">Low Stock Products (&lt; 20)</span>
              <span className={`px-2 py-0.5 rounded-full font-bold ${stats.lowStock > 0 ? 'bg-yellow-50 text-yellow-600 border border-yellow-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                {stats.lowStock} products
              </span>
            </div>
            {/* Out of stock */}
            <div className="flex items-center justify-between text-xs border-b border-slate-50 pb-2">
              <span className="text-slate-400 font-semibold">Out of Stock Products</span>
              <span className={`px-2 py-0.5 rounded-full font-bold ${stats.outOfStock > 0 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                {stats.outOfStock} products
              </span>
            </div>
            {/* Biggest Pending Debtor */}
            <div className="flex items-center justify-between text-xs border-b border-slate-50 pb-2">
              <span className="text-slate-400 font-semibold">Biggest Outstanding Debtor</span>
              <div className="text-right">
                <span className="font-bold text-slate-800 block">{stats.biggestPendingCustomer.name}</span>
                <span className="text-[10px] font-extrabold text-red-500 block mt-0.5">{fmt(stats.biggestPendingCustomer.amount)}</span>
              </div>
            </div>
            {/* Inventory valuation */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-semibold">Asset Capital held</span>
              <span className="font-black text-slate-700">{fmt(stats.inventoryValue)}</span>
            </div>
          </div>
        </div>

        {/* Top 5 selling products progress bars */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col">
          <div className="pb-3 border-b border-slate-100 mb-3">
            <h3 className="font-extrabold text-slate-800 text-sm">Top 5 Selling Products</h3>
            <p className="text-slate-400 text-[11px]">Rankings based on units sold across all channels</p>
          </div>

          <div className="space-y-4 flex-1 flex flex-col justify-around py-2 text-xs">
            {stats.top5SellingProducts?.length === 0 ? (
              <div className="text-center text-slate-400 py-12">No sales entries logged yet.</div>
            ) : (
              stats.top5SellingProducts.map((p, idx) => {
                const percent = Math.round((p.qty / maxSellingQty) * 100);
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between font-semibold">
                      <span className="text-slate-700 truncate max-w-[180px]">{p.name}</span>
                      <span className="text-slate-500 font-bold">{p.qty} sold</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-red-600 rounded-full transition-all duration-500" 
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Revenue Breakdown Donut Chart */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col">
          <div className="pb-3 border-b border-slate-100 mb-3">
            <h3 className="font-extrabold text-slate-800 text-sm">Financial Contribution</h3>
            <p className="text-slate-400 text-[11px]">Aggregate Revenue Breakdown & profits share</p>
          </div>
          <div className="flex-1">
            <RevenueDonut data={breakdownData} total={breakdownTotal} />
          </div>
        </div>
      </div>

      {/* Overdue list alert row */}
      {overdueList.length > 0 && (
        <div className="bg-white rounded-3xl p-5 border border-red-100 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="text-red-500" size={15} /> Overdue Payments (&gt; 10 Days)
            </span>
            <span className="text-[10px] font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
              {overdueList.length} companies delayed
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {overdueList.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100/50">
                <div className="truncate mr-2">
                  <span className="font-semibold text-slate-800 block truncate" title={item.name}>{item.name}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">{item.age} days outstanding</span>
                </div>
                <span className="font-black text-red-600 text-[13px]">{fmt(item.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity logs */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Online */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-800 text-sm">Recent Online Sales</h2>
            <Link to="/online-sales" className="text-xs text-red-600 hover:underline font-semibold flex items-center gap-0.5">
              View all <ChevronRight size={12} />
            </Link>
          </div>
          {recentOnline.length === 0 ? (
            <p className="text-center text-slate-400 text-xs py-12">No online sales in {label}</p>
          ) : (
            <ul className="divide-y divide-slate-50">
              {recentOnline.map((s) => (
                <li key={s.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/50 transition-colors">
                  <div>
                    <p className="text-xs font-bold text-slate-800">{s.productName}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{s.date} · Qty: {s.qty}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold capitalize border ${PLATFORM_COLORS[s.platform] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                      {s.platform}
                    </span>
                    <span className="text-xs font-black text-slate-700">{fmt(s.amount)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent Offline */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-800 text-sm">Recent Offline Sales</h2>
            <Link to="/offline-sales" className="text-xs text-red-600 hover:underline font-semibold flex items-center gap-0.5">
              View all <ChevronRight size={12} />
            </Link>
          </div>
          {recentOffline.length === 0 ? (
            <p className="text-center text-slate-400 text-xs py-12">No offline sales in {label}</p>
          ) : (
            <ul className="divide-y divide-slate-50">
              {recentOffline.map((s) => (
                <li key={s.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/50 transition-colors">
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      {s.items && s.items.length > 0
                        ? s.items[0].productName + (s.items.length > 1 ? ` (+ ${s.items.length - 1} more)` : '')
                        : s.productName || 'Unknown Product'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{s.date} · {s.buyerName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-slate-700">{fmt(s.totalAmount)}</p>
                    {s.amountLeft > 0 && (
                      <p className="text-[10px] font-bold text-red-500 mt-0.5">Due: {fmt(s.amountLeft)}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
