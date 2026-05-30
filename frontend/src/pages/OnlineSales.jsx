import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { 
  Plus, Trash2, ShoppingCart, X, Loader2, Search, PlusCircle, 
  TrendingUp, TrendingDown, ArrowUpRight, Percent, Award, 
  ShoppingBag, Layers, IndianRupee 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SearchableSelect from '../components/SearchableSelect';

const PLATFORMS = [
  { id: 'amazon', label: 'Amazon', color: 'bg-orange-500', light: 'bg-orange-100 text-orange-700', border: 'border-orange-200 text-orange-600 bg-orange-50/50' },
  { id: 'flipkart', label: 'Flipkart', color: 'bg-blue-500', light: 'bg-blue-100 text-blue-700', border: 'border-blue-200 text-blue-600 bg-blue-50/50' },
  { id: 'meesho', label: 'Meesho', color: 'bg-pink-500', light: 'bg-pink-100 text-pink-700', border: 'border-pink-200 text-pink-600 bg-pink-50/50' },
];

const today = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
};

const emptyItem = { productId: '', qty: 1, amount: '' };
const emptyForm = () => ({ items: [{ ...emptyItem }], platform: '', orderId: '', date: today(), notes: '' });

function Modal({ onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 !m-0">
      <div className="bg-white rounded-2xl shadow-2xl w-[95%] sm:w-full max-w-[800px]">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-semibold text-slate-800">Log Online Sale</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="px-6 py-5 overflow-auto max-h-[80vh]">{children}</div>
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

// --- Custom Responsive Donut Chart ---
function PlatformDonutChart({ data, centerValue, centerLabel }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-sm">
        No sales data available.
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
          <circle cx="0" cy="0" r="0.65" fill="#ffffff" />
        </svg>
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
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider truncate max-w-full">
                {centerLabel}
              </span>
              <span className="text-xs font-black text-slate-800 truncate max-w-full mt-0.5">
                {centerValue}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        {sectors.map((s) => (
          <div
            key={s.idx}
            className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer ${
              hoveredIdx === s.idx ? 'bg-slate-50' : ''
            }`}
            onMouseEnter={() => setHoveredIdx(s.idx)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <div className="flex items-center gap-2 truncate mr-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
              <span className="font-bold text-slate-700 truncate">{s.label}</span>
            </div>
            <span className="font-black text-slate-500 text-[11px] whitespace-nowrap">
              ₹{Math.round(s.value).toLocaleString('en-IN')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Custom Responsive Line Chart ---
function SalesTrendChart({ data }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
        No sales trend data available.
      </div>
    );
  }

  let maxVal = 1000;
  data.forEach((d) => {
    if (d.revenue > maxVal) maxVal = d.revenue;
  });
  maxVal = Math.ceil(maxVal * 1.15);

  const width = 600;
  const height = 220;
  const paddingLeft = 55;
  const paddingRight = 15;
  const paddingTop = 15;
  const paddingBottom = 35;

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
  const points = data.map((d, i) => `${getX(i)},${getY(d.revenue || 0)}`).join(' ');

  const areaPoints = [
    `${getX(0)},${getY(0)}`,
    ...data.map((d, i) => `${getX(i)},${getY(d.revenue || 0)}`),
    `${getX(data.length - 1)},${getY(0)}`
  ].join(' ');

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
        <defs>
          <linearGradient id="salesChartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ec4899" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Horizontal Gridlines */}
        {gridLinesY.map((val, i) => {
          const y = getY(val);
          return (
            <g key={i} className="opacity-40">
              <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#f1f5f9" strokeWidth="1" />
              <text x={paddingLeft - 8} y={y + 3} textAnchor="end" className="text-[9px] font-bold fill-slate-400">
                ₹{val >= 100000 ? `${(val / 100000).toFixed(1)}L` : val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
              </text>
            </g>
          );
        })}

        {/* Fill Area */}
        <polygon points={areaPoints} fill="url(#salesChartGrad)" />

        {/* Line */}
        <polyline
          fill="none"
          stroke="#ec4899"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />

        {/* Interactive Circles */}
        {data.map((d, i) => (
          <circle
            key={i}
            cx={getX(i)}
            cy={getY(d.revenue || 0)}
            r={hoveredIdx === i ? "4.5" : "2"}
            fill="#ffffff"
            stroke="#ec4899"
            strokeWidth={hoveredIdx === i ? "2.5" : "1.5"}
            className="cursor-pointer transition-all duration-150"
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          />
        ))}

        {hoveredIdx !== null && (
          <line
            x1={getX(hoveredIdx)}
            y1={paddingTop}
            x2={getX(hoveredIdx)}
            y2={paddingTop + chartHeight}
            stroke="#ec4899"
            strokeWidth="1"
            strokeDasharray="2,2"
            className="pointer-events-none"
          />
        )}

        {/* X Axis Labels */}
        {data.map((d, i) => {
          if (i % labelInterval !== 0 && i !== data.length - 1) return null;
          const x = getX(i);
          const rawLabel = d.date || '';
          let displayLabel = rawLabel;
          if (rawLabel.includes('-')) {
            const parts = rawLabel.split('-');
            if (parts.length === 3) {
              const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              displayLabel = `${parts[2]} ${months[parseInt(parts[1], 10) - 1]}`;
            }
          }
          return (
            <text
              key={i}
              x={x}
              y={height - paddingBottom + 18}
              textAnchor="middle"
              className="text-[9px] font-bold fill-slate-400"
            >
              {displayLabel}
            </text>
          );
        })}
      </svg>

      {hoveredIdx !== null && (
        <div 
          className="absolute z-20 bg-slate-950 text-white rounded-xl shadow-xl p-2.5 border border-slate-800 text-[10px] flex flex-col gap-0.5 pointer-events-none transition-all duration-100"
          style={{
            left: `${Math.min(85, Math.max(15, (getX(hoveredIdx) / width) * 100))}%`,
            top: '5%',
            transform: 'translateX(-50%)',
          }}
        >
          <div className="font-bold border-b border-slate-800 pb-1 mb-1 text-slate-400">
            {data[hoveredIdx].date}
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Revenue:</span>
            <span className="font-bold text-white">₹{data[hoveredIdx].revenue.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Orders:</span>
            <span className="font-bold text-white">{data[hoveredIdx].orders}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OnlineSales() {
  const { user } = useAuth();
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  function load() {
    Promise.all([api.getOnlineSales(), api.getProducts()])
      .then(([s, p]) => { 
        setSales(s.reverse()); 
        setProducts(p); 
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  function getPlatformPrice(product, platform) {
    if (!product) return 0;
    if (platform === 'amazon') return product.amazonPrice !== undefined ? product.amazonPrice : (product.onlinePrice ?? product.unitPrice ?? 0);
    if (platform === 'flipkart') return product.flipkartPrice !== undefined ? product.flipkartPrice : (product.onlinePrice ?? product.unitPrice ?? 0);
    if (platform === 'meesho') return product.meeshoPrice !== undefined ? product.meeshoPrice : (product.onlinePrice ?? product.unitPrice ?? 0);
    return product.onlinePrice ?? product.unitPrice ?? 0;
  }

  function handlePlatformChange(platformId) {
    setForm((f) => {
      const items = f.items.map((item) => {
        if (!item.productId) return item;
        const p = products.find((x) => x.id === item.productId);
        const platformPrice = getPlatformPrice(p, platformId);
        const qty = Number(item.qty) || 1;
        return { ...item, amount: platformPrice ? String(platformPrice * qty) : item.amount };
      });
      return { ...f, platform: platformId, items };
    });
  }

  function handleItemProductChange(index, productId) {
    const p = products.find((x) => x.id === productId);
    const platformPrice = getPlatformPrice(p, form.platform);
    setForm((f) => {
      const items = [...f.items];
      const qty = Number(items[index].qty) || 1;
      items[index] = { ...items[index], productId, amount: platformPrice ? String(platformPrice * qty) : '' };
      return { ...f, items };
    });
  }

  function handleItemQtyChange(index, qtyVal) {
    const qty = Math.max(1, Number(qtyVal) || 1);
    setForm((f) => {
      const items = [...f.items];
      const p = products.find((x) => x.id === items[index].productId);
      const platformPrice = getPlatformPrice(p, f.platform);
      items[index] = { ...items[index], qty, amount: platformPrice ? String(platformPrice * qty) : items[index].amount };
      return { ...f, items };
    });
  }

  function handleItemAmountChange(index, amount) {
    setForm((f) => {
      const items = [...f.items];
      items[index] = { ...items[index], amount };
      return { ...f, items };
    });
  }

  function addItem() {
    setForm((f) => ({ ...f, items: [...f.items, { ...emptyItem }] }));
  }

  function removeItem(index) {
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== index) }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validItems = form.items.filter(i => i.productId && i.qty);
    if (!form.platform) { setError('Select a platform.'); return; }
    if (validItems.length === 0) { setError('Add at least one product.'); return; }

    setSaving(true); setError('');
    try {
      const newSales = [];
      let updatedProducts = [...products];

      for (const item of validItems) {
        const payload = {
          productId: item.productId,
          qty: item.qty,
          amount: item.amount,
          platform: form.platform,
          orderId: form.orderId,
          date: form.date,
          notes: form.notes
        };
        const sale = await api.addOnlineSale(payload);
        newSales.push(sale);

        updatedProducts = updatedProducts.map((p) =>
          p.id === sale.productId ? { ...p, availableQty: p.availableQty - sale.qty } : p
        );
      }

      setSales((ss) => [...newSales.reverse(), ...ss]);
      setProducts(updatedProducts);
      setShowModal(false);
      setForm(emptyForm());
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this sale? Stock will be restored.')) return;
    await api.deleteOnlineSale(id);
    const sale = sales.find((s) => s.id === id);
    setSales((ss) => ss.filter((s) => s.id !== id));
    if (sale) setProducts((ps) => ps.map((p) => p.id === sale.productId ? { ...p, availableQty: p.availableQty + sale.qty } : p));
  }

  // --- Calculations for metrics and widgets ---
  const totalRevenue = sales.reduce((sum, s) => sum + (s.amount || 0), 0);
  const totalOrders = sales.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const platformRevenue = { amazon: 0, flipkart: 0, meesho: 0 };
  const platformOrders = { amazon: 0, flipkart: 0, meesho: 0 };
  sales.forEach(s => {
    const p = s.platform ? s.platform.toLowerCase() : '';
    if (platformRevenue[p] !== undefined) {
      platformRevenue[p] += s.amount || 0;
      platformOrders[p] += 1;
    }
  });

  const bestPlat = Object.entries(platformRevenue).sort((a,b) => b[1] - a[1])[0];
  const bestPerformingPlatform = bestPlat && bestPlat[1] > 0 ? bestPlat[0] : 'None';

  // 30 Days Trend Calculations
  const trendData = {};
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const dateVal = String(d.getDate()).padStart(2, '0');
    const dStr = `${year}-${month}-${dateVal}`;
    trendData[dStr] = { date: dStr, revenue: 0, orders: 0 };
  }

  sales.forEach(s => {
    if (trendData[s.date]) {
      trendData[s.date].revenue += s.amount || 0;
      trendData[s.date].orders += 1;
    }
  });
  const dailyTrend = Object.values(trendData).sort((a,b) => a.date.localeCompare(b.date));

  // Platform Donut Data
  const donutData = [
    { label: 'Amazon', value: platformRevenue.amazon, color: '#f97316' },
    { label: 'Flipkart', value: platformRevenue.flipkart, color: '#3b82f6' },
    { label: 'Meesho', value: platformRevenue.meesho, color: '#ec4899' }
  ];

  const platformStats = {
    amazon: { revenue: platformRevenue.amazon, orders: platformOrders.amazon, share: totalRevenue > 0 ? (platformRevenue.amazon / totalRevenue) * 100 : 0 },
    flipkart: { revenue: platformRevenue.flipkart, orders: platformOrders.flipkart, share: totalRevenue > 0 ? (platformRevenue.flipkart / totalRevenue) * 100 : 0 },
    meesho: { revenue: platformRevenue.meesho, orders: platformOrders.meesho, share: totalRevenue > 0 ? (platformRevenue.meesho / totalRevenue) * 100 : 0 }
  };

  // Top Selling Products
  const productSales = {};
  sales.forEach(s => {
    if (!productSales[s.productId]) {
      productSales[s.productId] = { name: s.productName, qty: 0, revenue: 0 };
    }
    productSales[s.productId].qty += s.qty;
    productSales[s.productId].revenue += s.amount || 0;
  });
  const topProducts = Object.values(productSales)
    .sort((a,b) => b.qty - a.qty)
    .slice(0, 5);

  const maxQty = topProducts[0]?.qty || 1;

  // Recent Orders (last 5)
  const recentOrders = [...sales].slice(0, 5);

  // Full History Filter & Search
  const filtered = sales.filter((s) => {
    const matchPlatform = filter === 'all' || s.platform === filter;
    const matchSearch = !search || s.productName.toLowerCase().includes(search.toLowerCase()) || s.orderId.toLowerCase().includes(search.toLowerCase());
    return matchPlatform && matchSearch;
  });

  const fmt = (val) => `₹${Math.round(val || 0).toLocaleString('en-IN')}`;

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 text-slate-400 gap-3">
      <Loader2 size={36} className="animate-spin text-red-600" />
      <p className="text-sm font-semibold">Loading Marketplace intelligence stats…</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* 1. Header Page Title Block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Marketplace Analytics & Online Sales</h1>
          <p className="text-slate-500 text-sm mt-1">Configure line item orders and audit cross-platform sales trends</p>
        </div>
        <button onClick={() => { setForm(emptyForm()); setError(''); setShowModal(true); }}
          className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold px-5 py-3 rounded-2xl transition-all shadow-md hover:shadow-lg self-start">
          <Plus size={16} /> Log Online Sale
        </button>
      </div>

      {/* 2. Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Revenue</span>
            <p className="text-2xl font-black text-slate-800">{fmt(totalRevenue)}</p>
            <span className="text-[9px] font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full inline-block">
              Combined platforms receipts
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-pink-50 border border-pink-100 text-pink-600 flex items-center justify-center">
            <IndianRupee size={22} />
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Orders</span>
            <p className="text-2xl font-black text-slate-800">{totalOrders} orders</p>
            <span className="text-[9px] font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full inline-block">
              Lifetime online logs
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
            <ShoppingBag size={22} />
          </div>
        </div>

        {/* Average Order Value */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Average Order Value</span>
            <p className="text-2xl font-black text-slate-800">{fmt(avgOrderValue)}</p>
            <span className="text-[9px] font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full inline-block">
              Revenue per ticket order
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
            <Layers size={22} />
          </div>
        </div>

        {/* Best Performing Platform */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Best Performing Platform</span>
            <p className="text-2xl font-black text-slate-800 capitalize">{bestPerformingPlatform}</p>
            <span className="text-[9px] font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full inline-block">
              Leader by sales volume
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
            <Award size={22} />
          </div>
        </div>
      </div>

      {/* 3. Platform Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {PLATFORMS.map((p) => {
          const stats = platformStats[p.id] || { revenue: 0, orders: 0, share: 0 };
          return (
            <div key={p.id} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-50 pb-3 mb-3">
                <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-xl border ${p.border}`}>
                  {p.label}
                </span>
                <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2.5 py-1 rounded-xl">
                  {stats.share.toFixed(0)}% Share
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Platform Revenue</span>
                <p className="text-2xl font-black text-slate-800">{fmt(stats.revenue)}</p>
                <p className="text-xs text-slate-500 font-semibold">{stats.orders} orders processed</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Sales Trends & Platform Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Line Chart */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 lg:col-span-2 flex flex-col justify-between min-h-[300px]">
          <div>
            <h3 className="font-extrabold text-slate-800 text-base">30-Day Sales Trend</h3>
            <p className="text-slate-400 text-xs mt-0.5">Telemetry log detailing daily receipts from marketplace sales</p>
          </div>
          <div className="flex-1 flex items-center mt-4">
            <SalesTrendChart data={dailyTrend} />
          </div>
        </div>

        {/* Platform Share Donut Chart */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-slate-800 text-base">Platform Distribution</h3>
            <p className="text-slate-400 text-xs mt-0.5">Contribution percentages of revenue across channels</p>
          </div>
          <div className="flex-1 flex items-center mt-6">
            <PlatformDonutChart 
              data={donutData} 
              centerLabel="Online Sales" 
              centerValue={fmt(totalRevenue)}
            />
          </div>
        </div>
      </div>

      {/* 5. Top Selling Products & Recent Orders Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Selling Products */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-slate-800 text-base">Top Selling Products</h3>
            <p className="text-slate-400 text-xs mt-0.5">Marketplace products sorted by cumulative quantities sold</p>
          </div>

          <div className="space-y-4 mt-5 flex-1 flex flex-col justify-around">
            {topProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                <ShoppingCart size={32} className="opacity-30 mb-2" />
                <span className="text-xs font-semibold">No sales logged</span>
              </div>
            ) : (
              topProducts.map((p, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <ProductThumbnail productName={p.name} />
                      <span className="font-bold text-slate-700 truncate">{p.name}</span>
                    </div>
                    <span className="font-black text-slate-500">{p.qty} sold</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div style={{ width: `${(p.qty / maxQty) * 100}%` }} className="h-full bg-pink-500 rounded-full" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Orders (Latest 5) */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 lg:col-span-2 flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-slate-800 text-base">Recent Orders</h3>
            <p className="text-slate-400 text-xs mt-0.5">The last 5 online orders logged in the system</p>
          </div>

          <div className="overflow-x-auto mt-4 flex-1">
            {recentOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <ShoppingBag size={32} className="opacity-30 mb-2" />
                <span className="text-xs font-semibold">No orders logged</span>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase font-extrabold">
                    <th className="py-2.5">Date</th>
                    <th className="py-2.5">Product</th>
                    <th className="py-2.5">Platform</th>
                    <th className="py-2.5">Order ID</th>
                    <th className="py-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentOrders.map((o) => {
                    const pl = PLATFORMS.find(p => p.id === o.platform);
                    return (
                      <tr key={o.id} className="hover:bg-slate-50/50">
                        <td className="py-3 text-slate-500">{o.date}</td>
                        <td className="py-3 font-semibold text-slate-700">
                          <div className="flex items-center gap-2 truncate">
                            <ProductThumbnail productName={o.productName} />
                            <span className="truncate">{o.productName}</span>
                          </div>
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${pl?.light || 'bg-slate-100 text-slate-600'}`}>
                            {o.platform}
                          </span>
                        </td>
                        <td className="py-3 text-slate-500 font-mono">{o.orderId || '—'}</td>
                        <td className="py-3 font-bold text-slate-800 text-right">₹{o.amount}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* 6. Historical Ledger Section (Scrollable Table) */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-extrabold text-slate-800 text-base">All Orders Audit Ledger</h3>
            <p className="text-slate-400 text-xs mt-0.5">Search and audit the complete marketplace transaction logs</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Platform pills filters */}
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto scrollbar-none max-w-full">
              {['all', ...PLATFORMS.map((p) => p.id)].map((f) => (
                <button 
                  key={f} 
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize shrink-0 ${
                    filter === f ? 'bg-red-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 bg-transparent'
                  }`}
                >
                  {f === 'all' ? 'All Channels' : PLATFORMS.find((p) => p.id === f)?.label}
                </button>
              ))}
            </div>

            {/* Search filter input */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                placeholder="Search orders, SKU..."
                className="w-full sm:w-[220px] pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-red-500" 
              />
            </div>
          </div>
        </div>

        {/* Scrollable table container */}
        <div className="max-h-[400px] overflow-y-auto border border-slate-100 rounded-2xl">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <ShoppingCart size={36} className="mb-2 opacity-30" />
              <p className="text-xs font-semibold">No sales match the selected filters</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 uppercase font-extrabold sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-4 py-3">Marketplace</th>
                  <th className="px-4 py-3">Order ID</th>
                  <th className="px-4 py-3">Qty</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filtered.map((s) => {
                  const pl = PLATFORMS.find((p) => p.id === s.platform);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{s.date}</td>
                      <td className="px-4 py-3 font-semibold text-slate-700">
                        <div className="flex items-center gap-2 truncate">
                          <ProductThumbnail productName={s.productName} />
                          <span className="truncate">{s.productName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold capitalize ${pl?.light || 'bg-slate-100 text-slate-600'}`}>
                          {s.platform}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono">{s.orderId || '—'}</td>
                      <td className="px-4 py-3 text-slate-700 font-bold">{s.qty}</td>
                      <td className="px-4 py-3 font-black text-slate-800">₹{s.amount}</td>
                      <td className="px-4 py-3 text-right">
                        <button 
                          onClick={() => handleDelete(s.id)} 
                          disabled={user?.role === 'employee'} 
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal - Log Online Sale */}
      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Platform selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Platform *</label>
              <div className="grid grid-cols-3 gap-3">
                {PLATFORMS.map((p) => (
                  <button key={p.id} type="button" onClick={() => handlePlatformChange(p.id)}
                    className={`py-3 px-4 rounded-xl text-sm font-semibold border-2 transition-all ${
                      form.platform === p.id ? `${p.color} text-white border-transparent shadow-sm` : 'border-slate-200 text-slate-600 hover:border-slate-300 bg-white'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Products *</label>
                {form.platform && (
                  <span className="text-xs text-slate-400 font-medium">
                    Pricing using <span className="font-semibold capitalize text-red-600">{form.platform}</span>
                  </span>
                )}
              </div>

              {/* Desktop Headers */}
              {form.items.length > 0 && (
                <div className="hidden md:grid md:grid-cols-[61%_15%_24%] gap-4 pr-12 pl-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <div>Product *</div>
                  <div>Qty *</div>
                  <div>Amount (₹) *</div>
                </div>
              )}

              <div className="space-y-4">
                {form.items.map((item, idx) => {
                  const selProd = products.find((p) => p.id === item.productId);
                  return (
                    <div key={idx} className="p-4 border border-slate-200 rounded-2xl bg-slate-50/30 space-y-3 animate-fadeIn">
                      <div className="flex items-center gap-3">
                        <div className="grid grid-cols-1 md:grid-cols-[61%_15%_24%] gap-4 flex-1 items-start">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 md:hidden">Product *</label>
                            <SearchableSelect
                              required
                              value={item.productId}
                              onChange={(val) => handleItemProductChange(idx, val)}
                              placeholder="Select product…"
                              options={products.filter((p) => p.availableQty > 0 || p.id === item.productId).map((p) => ({ value: p.id, label: `${p.name} (Stock: ${p.availableQty})` }))}
                              className="w-full"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 md:hidden">Qty *</label>
                            <input required type="number" min="1" max={selProd?.availableQty || 9999} value={item.qty}
                              onChange={(e) => handleItemQtyChange(idx, e.target.value)}
                              className="w-full h-[42px] px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="1" />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 md:hidden">Amount (₹) *</label>
                            <input required type="number" min="0" value={item.amount}
                              onChange={(e) => handleItemAmountChange(idx, e.target.value)}
                              className="w-full h-[42px] px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white" placeholder="Amount (₹)" />
                          </div>
                        </div>

                        {form.items.length > 1 && (
                          <button type="button" onClick={() => removeItem(idx)}
                            className="p-2.5 mt-0 md:mt-1.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>

                      {selProd && (
                        <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 bg-slate-100/40 px-3 py-2.5 rounded-xl border border-slate-200/40">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-slate-400">Stock Available:</span>
                            <span className={`font-semibold ${selProd.availableQty < 20 ? 'text-yellow-600' : 'text-slate-700'}`}>
                              {selProd.availableQty} units
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 sm:mt-0">
                            <span className="font-medium text-slate-400">
                              {form.platform ? `${PLATFORMS.find(p => p.id === form.platform)?.label} Price:` : 'Platform Price:'}
                            </span>
                            <span className="font-bold text-red-600">
                              ₹{getPlatformPrice(selProd, form.platform)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button type="button" onClick={addItem}
                className="flex items-center gap-1.5 text-red-600 hover:text-red-700 text-sm font-semibold transition-colors mt-2">
                <PlusCircle size={16} /> Add another product
              </button>
            </div>

            {/* Order ID and Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Order ID</label>
                <input value={form.orderId} onChange={(e) => setForm((f) => ({ ...f, orderId: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="e.g. ORD-123" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Date *</label>
                <input required type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Notes</label>
              <textarea rows={2.5} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" placeholder="Optional notes…" />
            </div>

            {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

            {/* Action buttons */}
            <div className="flex gap-4 pt-3 border-t border-slate-100">
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm">
                {saving && <Loader2 size={16} className="animate-spin" />} Log Sale
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
