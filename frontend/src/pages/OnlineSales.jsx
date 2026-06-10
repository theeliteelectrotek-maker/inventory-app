import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { 
  Plus, Trash2, ShoppingCart, X, Loader2, Search, PlusCircle, 
  TrendingUp, TrendingDown, ArrowUpRight, Percent, Award, 
  ShoppingBag, Layers, IndianRupee, RotateCcw, Calendar, Download,
  XCircle, CheckCircle2, AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useIsDarkMode } from '../context/ThemeContext';
import SearchableSelect from '../components/SearchableSelect';
import KPICardValue from '../components/KPICardValue';

const PLATFORMS = [
  { id: 'amazon', label: 'Amazon', color: 'bg-orange-500', light: 'bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-450', border: 'border-orange-200 text-orange-600 bg-orange-50/50 dark:border-orange-900/50 dark:text-orange-400 dark:bg-orange-950/20' },
  { id: 'flipkart', label: 'Flipkart', color: 'bg-blue-500', light: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-450', border: 'border-blue-200 text-blue-600 bg-blue-50/50 dark:border-blue-900/50 dark:text-blue-400 dark:bg-blue-950/20' },
  { id: 'meesho', label: 'Meesho', color: 'bg-pink-500', light: 'bg-pink-100 text-pink-700 dark:bg-pink-950/30 dark:text-pink-450', border: 'border-pink-200 text-pink-600 bg-pink-50/50 dark:border-pink-900/50 dark:text-pink-400 dark:bg-pink-950/20' },
];

const formatDateYYYYMMDD = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
};

const formatFriendlyDate = (dateStr) => {
  if (!dateStr || dateStr === 'N/A') return 'N/A';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const date = parseInt(parts[2], 10);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(date).padStart(2, '0')}-${months[monthIdx]}-${year}`;
};

const today = () => formatDateYYYYMMDD(new Date());

const emptyItem = { productId: '', qty: 1, amount: '', saleType: 'Piece' };
const emptyForm = () => ({ items: [{ ...emptyItem }], platform: '', orderId: '', date: today(), notes: '' });

function Modal({ onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 !m-0">
      <div className="bg-white dark:bg-[#111827] border border-transparent dark:border-[#1E293B] rounded-2xl shadow-2xl w-[95%] sm:w-full max-w-[800px]">
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-[#1E293B]">
          <h3 className="font-semibold text-slate-800 dark:text-[#F8FAFC]">Log Online Sale</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#1E293B]"><X size={18} /></button>
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
    'from-pink-500 to-rose-500 text-rose-50 border-pink-100 dark:border-transparent',
    'from-purple-500 to-indigo-500 text-indigo-50 border-purple-100 dark:border-transparent',
    'from-blue-500 to-cyan-505 text-cyan-50 border-blue-100 dark:border-transparent',
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

// --- Custom Responsive Donut Chart ---
function PlatformDonutChart({ data, centerValue, centerLabel }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const isDark = useIsDarkMode();

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-slate-700 dark:text-[#94A3B8] text-sm font-semibold">
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
    <div className="flex flex-col sm:flex-row items-center justify-around gap-4 py-2 w-full">
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
                opacity={hoveredIdx === null || isHovered ? 1 : 0.75}
                className="transition-all duration-300 cursor-pointer origin-center"
                style={{
                  transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                }}
                onMouseEnter={() => setHoveredIdx(s.idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}
          <circle cx="0" cy="0" r="0.65" fill={isDark ? '#111827' : '#ffffff'} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
          {hoveredIdx !== null ? (
            <>
              <span className="text-[11px] font-black text-slate-800 dark:text-[#94A3B8] uppercase tracking-wider truncate max-w-full">
                {sectors[hoveredIdx].label}
              </span>
              <span className="text-base font-black text-slate-905 dark:text-[#F8FAFC]">
                {((sectors[hoveredIdx].percent) * 100).toFixed(1)}%
              </span>
            </>
          ) : (
            <>
              <span className="text-[11px] font-black text-slate-700 dark:text-[#94A3B8] uppercase tracking-wider truncate max-w-full">
                {centerLabel}
              </span>
              <span className="text-base font-black text-slate-900 dark:text-[#F8FAFC] truncate max-w-full mt-0.5">
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
              hoveredIdx === s.idx ? 'bg-slate-100 dark:bg-[#172554]' : ''
            }`}
            onMouseEnter={() => setHoveredIdx(s.idx)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <div className="flex items-center gap-2 truncate mr-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
              <span className="font-extrabold text-slate-900 dark:text-[#CBD5E1] truncate">{s.label}</span>
            </div>
            <span className="font-black text-slate-900 dark:text-[#F8FAFC] text-xs whitespace-nowrap">
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
  const isDark = useIsDarkMode();

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-700 dark:text-[#94A3B8] text-sm font-semibold">
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
            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Horizontal Gridlines */}
        {gridLinesY.map((val, i) => {
          const y = getY(val);
          return (
            <g key={i} className="opacity-100">
              <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke={isDark ? '#1E293B' : '#cbd5e1'} strokeWidth="1.2" />
              <text x={paddingLeft - 8} y={y + 3} textAnchor="end" className="text-[10px] font-extrabold fill-slate-800 dark:fill-[#94A3B8]">
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
          stroke="#4f46e5"
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
            r={hoveredIdx === i ? "5" : "2.5"}
            fill={isDark ? '#111827' : '#ffffff'}
            stroke="#4f46e5"
            strokeWidth={hoveredIdx === i ? "3" : "2"}
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
            stroke="#4f46e5"
            strokeWidth="1.5"
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
              className="text-[10px] font-extrabold fill-slate-800 dark:fill-[#CBD5E1]"
            >
              {displayLabel}
            </text>
          );
        })}
      </svg>

      {hoveredIdx !== null && (
        <div 
          className="absolute z-20 bg-slate-950 dark:bg-[#020617] text-white rounded-xl shadow-xl p-2.5 border border-slate-850 dark:border-[#1E293B] text-[10px] flex flex-col gap-0.5 pointer-events-none transition-all duration-100"
          style={{
            left: `${Math.min(85, Math.max(15, (getX(hoveredIdx) / width) * 100))}%`,
            top: '5%',
            transform: 'translateX(-50%)',
          }}
        >
          <div className="font-bold border-b border-slate-800 dark:border-[#1E293B] pb-1 mb-1 text-slate-300 dark:text-[#CBD5E1]">
            {data[hoveredIdx].date}
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-400 dark:text-[#94A3B8] font-semibold">Revenue:</span>
            <span className="font-bold text-white">₹{data[hoveredIdx].revenue.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-400 dark:text-[#94A3B8] font-semibold">Orders:</span>
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
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast({ show: false, message: '', type: 'success' });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  // --- Dynamic Date Filtering State ---
  const [dateMode, setDateMode] = useState('thisMonth'); // 'today', 'yesterday', 'thisWeek', 'thisMonth', 'thisYear', 'custom'
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [appliedRange, setAppliedRange] = useState(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start: formatDateYYYYMMDD(start), end: formatDateYYYYMMDD(end) };
  });

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

  function getEffectivePrice(product, platform, saleType) {
    if (!product) return 0;
    if (saleType === 'Box') {
      return product.boxSellingPrice || 0;
    }
    if (product.pieceSellingPrice > 0) {
      return product.pieceSellingPrice;
    }
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
        const effectivePrice = getEffectivePrice(p, platformId, item.saleType);
        const qty = Number(item.qty) || 1;
        return { ...item, amount: effectivePrice ? String(effectivePrice * qty) : item.amount };
      });
      return { ...f, platform: platformId, items };
    });
  }

  function handleItemProductChange(index, productId) {
    const p = products.find((x) => x.id === productId);
    const effectivePrice = getEffectivePrice(p, form.platform, form.items[index].saleType);
    setForm((f) => {
      const items = [...f.items];
      const qty = Number(items[index].qty) || 1;
      items[index] = { ...items[index], productId, amount: effectivePrice ? String(effectivePrice * qty) : '' };
      return { ...f, items };
    });
  }

  function handleItemQtyChange(index, qtyVal) {
    const qty = Math.max(1, Number(qtyVal) || 1);
    setForm((f) => {
      const items = [...f.items];
      const p = products.find((x) => x.id === items[index].productId);
      const effectivePrice = getEffectivePrice(p, f.platform, items[index].saleType);
      items[index] = { ...items[index], qty, amount: effectivePrice ? String(effectivePrice * qty) : items[index].amount };
      return { ...f, items };
    });
  }

  function handleItemSaleTypeChange(index, saleType) {
    setForm((f) => {
      const items = [...f.items];
      const p = products.find((x) => x.id === items[index].productId);
      const effectivePrice = getEffectivePrice(p, f.platform, saleType);
      const qty = Number(items[index].qty) || 1;
      items[index] = { ...items[index], saleType, amount: effectivePrice ? String(effectivePrice * qty) : items[index].amount };
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
          saleQty: item.qty,
          saleType: item.saleType || 'Piece',
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
    console.log(`[API REQUEST] DELETE /api/online-sales/${id}`);
    const sale = sales.find((s) => s.id === id);
    try {
      const result = await api.deleteOnlineSale(id);
      console.log(`[API RESPONSE] DELETE /api/online-sales/${id} SUCCESS:`, result);
      setSales((ss) => ss.filter((s) => s.id !== id));
      if (sale && sale.status !== 'Cancelled') {
        setProducts((ps) => ps.map((p) => p.id === sale.productId ? { ...p, availableQty: p.availableQty + sale.qty } : p));
      }
      setToast({ show: true, message: sale?.status === 'Cancelled' ? 'Cancelled sale record deleted permanently!' : 'Order deleted permanently and stock restored!', type: 'success' });
    } catch (err) {
      console.error(`[API ERROR] DELETE /api/online-sales/${id} FAILED:`, err);
      setToast({ show: true, message: err.message || 'Failed to delete order.', type: 'error' });
    }
  }

  async function handleCancel(id) {
    console.log(`[API REQUEST] POST /api/online-sales/${id}/cancel`);
    try {
      const result = await api.cancelOnlineSale(id);
      console.log(`[API RESPONSE] POST /api/online-sales/${id}/cancel SUCCESS:`, result);
      const updatedSale = result.sale;
      if (updatedSale) {
        setSales((ss) => ss.map((s) => s.id === id ? { ...s, ...updatedSale } : s));
        setProducts((ps) => ps.map((p) => p.id === updatedSale.productId ? { ...p, availableQty: p.availableQty + updatedSale.qty } : p));
        setToast({ show: true, message: 'Order cancelled successfully and stock returned to inventory!', type: 'success' });
      } else {
        throw new Error('No sale object returned from server');
      }
    } catch (err) {
      console.error(`[API ERROR] POST /api/online-sales/${id}/cancel FAILED:`, err);
      setToast({ show: true, message: err.message || 'Failed to cancel order.', type: 'error' });
    }
  }

  // --- Date presets handler ---
  const handlePresetClick = (preset) => {
    setDateMode(preset);
    if (preset === 'custom') {
      return;
    }
    const now = new Date();
    let startStr = '';
    let endStr = '';
    if (preset === 'today') {
      startStr = formatDateYYYYMMDD(now);
      endStr = formatDateYYYYMMDD(now);
    } else if (preset === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      startStr = formatDateYYYYMMDD(yesterday);
      endStr = formatDateYYYYMMDD(yesterday);
    } else if (preset === 'thisWeek') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diff));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      startStr = formatDateYYYYMMDD(monday);
      endStr = formatDateYYYYMMDD(sunday);
    } else if (preset === 'thisMonth') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      startStr = formatDateYYYYMMDD(start);
      endStr = formatDateYYYYMMDD(end);
    } else if (preset === 'thisYear') {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      startStr = formatDateYYYYMMDD(start);
      endStr = formatDateYYYYMMDD(end);
    }
    setAppliedRange({ start: startStr, end: endStr });
  };

  const handleApplyCustom = () => {
    if (customStart && customEnd) {
      if (customStart > customEnd) {
        alert("Start Date cannot be after End Date.");
        return;
      }
      setAppliedRange({ start: customStart, end: customEnd });
    } else {
      alert("Please select both Start and End Dates.");
    }
  };

  const handleResetCustom = () => {
    setCustomStart('');
    setCustomEnd('');
    handlePresetClick('thisMonth');
  };

  // --- Filtered Sales for current range ---
  const filteredSales = sales.filter(s => {
    return s.status !== 'Cancelled' && s.date >= appliedRange.start && s.date <= appliedRange.end;
  });

  const filteredSalesForLedger = sales.filter(s => {
    return s.date >= appliedRange.start && s.date <= appliedRange.end;
  });

  // --- Marketplace KPIs Calculations ---
  const currentKPIs = {
    amazon: { orders: 0, units: 0, revenue: 0 },
    flipkart: { orders: 0, units: 0, revenue: 0 },
    meesho: { orders: 0, units: 0, revenue: 0 },
    total: { orders: 0, units: 0, revenue: 0 }
  };

  filteredSales.forEach(s => {
    const p = s.platform ? s.platform.toLowerCase() : '';
    if (currentKPIs[p]) {
      currentKPIs[p].orders += 1;
      currentKPIs[p].units += s.qty;
      currentKPIs[p].revenue += s.amount || 0;
    }
    currentKPIs.total.orders += 1;
    currentKPIs.total.units += s.qty;
    currentKPIs.total.revenue += s.amount || 0;
  });

  // --- Product Insights Calculations ---
  const currentProdSales = {};
  filteredSales.forEach(s => {
    if (!currentProdSales[s.productId]) {
      currentProdSales[s.productId] = { id: s.productId, name: s.productName, qty: 0, revenue: 0 };
    }
    currentProdSales[s.productId].qty += s.qty;
    currentProdSales[s.productId].revenue += s.amount || 0;
  });

  const sortedByQty = Object.values(currentProdSales).sort((a, b) => b.qty - a.qty);
  const bestSellingProduct = sortedByQty[0] || null;

  const sortedByRev = Object.values(currentProdSales).sort((a, b) => b.revenue - a.revenue);
  const mostRevenueProduct = sortedByRev[0] || null;

  // Fastest Growing Product Logic
  const sDate = new Date(appliedRange.start);
  const eDate = new Date(appliedRange.end);
  const diffTime = Math.abs(eDate - sDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  const prevStart = new Date(sDate);
  prevStart.setDate(sDate.getDate() - diffDays);
  const prevEnd = new Date(sDate);
  prevEnd.setDate(sDate.getDate() - 1);

  const prevStartStr = formatDateYYYYMMDD(prevStart);
  const prevEndStr = formatDateYYYYMMDD(prevEnd);

  const prevSales = sales.filter(s => s.date >= prevStartStr && s.date <= prevEndStr);

  const prevProdSales = {};
  prevSales.forEach(s => {
    if (!prevProdSales[s.productId]) {
      prevProdSales[s.productId] = { qty: 0 };
    }
    prevProdSales[s.productId].qty += s.qty;
  });

  const productGrowth = [];
  Object.keys(currentProdSales).forEach(pid => {
    const currentQty = currentProdSales[pid].qty;
    const prevQty = prevProdSales[pid]?.qty || 0;
    const growthQty = currentQty - prevQty;
    const growthPercent = prevQty > 0 ? ((currentQty - prevQty) / prevQty) * 100 : null;

    productGrowth.push({
      id: pid,
      name: currentProdSales[pid].name,
      currentQty,
      prevQty,
      growthQty,
      growthPercent
    });
  });

  const sortedByGrowth = [...productGrowth].sort((a, b) => b.growthQty - a.growthQty);
  const fastestGrowingProduct = sortedByGrowth[0] || null;

  // --- Leaderboard Calculations ---
  const platformRankings = [
    { id: 'amazon', label: 'Amazon', color: '#f97316' },
    { id: 'flipkart', label: 'Flipkart', color: '#3b82f6' },
    { id: 'meesho', label: 'Meesho', color: '#ec4899' }
  ].map(p => {
    const rev = currentKPIs[p.id]?.revenue || 0;
    const share = currentKPIs.total.revenue > 0 ? (rev / currentKPIs.total.revenue) * 100 : 0;
    return { ...p, revenue: rev, share };
  }).sort((a, b) => b.revenue - a.revenue);

  // --- Quick Insights Calculations ---
  const dailyRevenue = {};
  filteredSales.forEach(s => {
    dailyRevenue[s.date] = (dailyRevenue[s.date] || 0) + (s.amount || 0);
  });
  const activeDates = Object.keys(dailyRevenue);
  let highestSaleDay = { date: 'N/A', revenue: 0 };
  let lowestSaleDay = { date: 'N/A', revenue: 0 };

  if (activeDates.length > 0) {
    let maxRev = -1;
    let minRev = Infinity;
    activeDates.forEach(d => {
      const rev = dailyRevenue[d];
      if (rev > maxRev) {
        maxRev = rev;
        highestSaleDay = { date: d, revenue: rev };
      }
      if (rev < minRev) {
        minRev = rev;
        lowestSaleDay = { date: d, revenue: rev };
      }
    });
  }

  // --- Dynamic Charts Data ---
  const trendData = {};
  const currentDraw = new Date(sDate);
  let count = 0;
  while (currentDraw <= eDate && count < 730) {
    const dStr = formatDateYYYYMMDD(currentDraw);
    trendData[dStr] = { date: dStr, revenue: 0, orders: 0 };
    currentDraw.setDate(currentDraw.getDate() + 1);
    count++;
  }

  filteredSales.forEach(s => {
    if (trendData[s.date]) {
      trendData[s.date].revenue += s.amount || 0;
      trendData[s.date].orders += 1;
    }
  });
  const dailyTrend = Object.values(trendData).sort((a,b) => a.date.localeCompare(b.date));

  const donutData = [
    { label: 'Amazon', value: currentKPIs.amazon.revenue, color: '#f97316' },
    { label: 'Flipkart', value: currentKPIs.flipkart.revenue, color: '#3b82f6' },
    { label: 'Meesho', value: currentKPIs.meesho.revenue, color: '#ec4899' }
  ];

  const topProducts = Object.values(currentProdSales)
    .sort((a,b) => b.qty - a.qty)
    .slice(0, 5);

  const maxQty = topProducts[0]?.qty || 1;

  const recentOrders = [...filteredSales].slice(0, 5);

  // --- Full History Filter & Search for the Ledger table ---
  const filtered = filteredSalesForLedger.filter((s) => {
    const matchPlatform = filter === 'all' || s.platform === filter;
    const matchSearch = !search || s.productName.toLowerCase().includes(search.toLowerCase()) || s.orderId.toLowerCase().includes(search.toLowerCase());
    return matchPlatform && matchSearch;
  });

  const fmt = (val) => `₹${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // --- EXPORTS ---
  const exportToCSV = () => {
    if (filteredSalesForLedger.length === 0) {
      alert("No data available to export in the selected range.");
      return;
    }
    const headers = ['Date', 'Product Name', 'Marketplace', 'Order ID', 'Qty', 'Amount (INR)', 'Status'];
    const rows = filteredSalesForLedger.map(s => [
      s.date,
      `"${s.productName.replace(/"/g, '""')}"`,
      s.platform,
      s.orderId || '',
      s.qty,
      s.amount,
      s.status || 'Active'
    ]);
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Marketplace_Sales_${appliedRange.start}_to_${appliedRange.end}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    if (filteredSales.length === 0) {
      alert("No data available to export in the selected range.");
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to export PDF');
      return;
    }

    const title = `Marketplace Sales Report (${formatFriendlyDate(appliedRange.start)} to ${formatFriendlyDate(appliedRange.end)})`;

    const tableRowsHTML = filteredSales.map(s => `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
        <td style="padding: 8px 12px; color: #475569;">${formatFriendlyDate(s.date)}</td>
        <td style="padding: 8px 12px; font-weight: 600; color: #1e293b;">${s.productName}</td>
        <td style="padding: 8px 12px; text-transform: capitalize; font-weight: bold; color: #4f46e5;">${s.platform}</td>
        <td style="padding: 8px 12px; font-family: monospace; color: #475569;">${s.orderId || '—'}</td>
        <td style="padding: 8px 12px; font-weight: bold; color: #1e293b;">${s.qty}</td>
        <td style="padding: 8px 12px; font-weight: bold; text-align: right; color: #1e293b;">₹${Number(s.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
            body {
              font-family: 'Inter', sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 30px;
              background: #ffffff;
            }
            .header {
              border-bottom: 2px solid #f1f5f9;
              padding-bottom: 20px;
              margin-bottom: 25px;
            }
            .title {
              font-size: 20px;
              font-weight: 900;
              margin: 0;
              color: #0f172a;
              text-transform: uppercase;
              letter-spacing: -0.025em;
            }
            .subtitle {
              font-size: 12px;
              color: #64748b;
              font-weight: 500;
              margin-top: 4px;
            }
            .grid {
              display: grid;
              grid-template-cols: repeat(4, 1fr);
              gap: 15px;
              margin-bottom: 25px;
            }
            .card {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 12px 16px;
            }
            .card-label {
              font-size: 9px;
              font-weight: 700;
              text-transform: uppercase;
              color: #64748b;
              letter-spacing: 0.05em;
              margin-bottom: 4px;
            }
            .card-val {
              font-size: 16px;
              font-weight: 800;
              color: #0f172a;
            }
            .card-sub {
              font-size: 10px;
              color: #64748b;
              margin-top: 4px;
              font-weight: 500;
            }
            .section-title {
              font-size: 13px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              margin-bottom: 12px;
              color: #0f172a;
              border-bottom: 1px solid #cbd5e1;
              padding-bottom: 4px;
            }
            .table-container {
              margin-top: 15px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              text-align: left;
            }
            th {
              background: #f1f5f9;
              color: #475569;
              font-weight: 800;
              text-transform: uppercase;
              font-size: 10px;
              padding: 8px 12px;
              letter-spacing: 0.025em;
            }
            .insights-grid {
              display: grid;
              grid-template-cols: repeat(3, 1fr);
              gap: 15px;
              margin-bottom: 25px;
            }
            @media print {
              body {
                padding: 0;
              }
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <h1 class="title">Marketplace Sales Intelligence Report</h1>
                <div class="subtitle">Filter Period: <strong>${formatFriendlyDate(appliedRange.start)}</strong> to <strong>${formatFriendlyDate(appliedRange.end)}</strong></div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase;">Generated On</div>
                <div style="font-size: 11px; font-weight: 600; color: #0f172a;">${formatFriendlyDate(formatDateYYYYMMDD(new Date()))}</div>
              </div>
            </div>
          </div>

          <div class="section-title">Key Performance Indicators</div>
          <div class="grid">
            <div class="card" style="border-left: 4px solid #6366f1;">
              <div class="card-label">Total Online Revenue</div>
              <div class="card-val">₹${Number(currentKPIs.total.revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div class="card-sub">${currentKPIs.total.orders} orders • ${currentKPIs.total.units} units</div>
            </div>
            <div class="card" style="border-left: 4px solid #f97316;">
              <div class="card-label">Amazon Sales</div>
              <div class="card-val">₹${Number(currentKPIs.amazon.revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div class="card-sub">${currentKPIs.amazon.orders} orders • ${currentKPIs.amazon.units} units</div>
            </div>
            <div class="card" style="border-left: 4px solid #3b82f6;">
              <div class="card-label">Flipkart Sales</div>
              <div class="card-val">₹${Number(currentKPIs.flipkart.revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div class="card-sub">${currentKPIs.flipkart.orders} orders • ${currentKPIs.flipkart.units} units</div>
            </div>
            <div class="card" style="border-left: 4px solid #ec4899;">
              <div class="card-label">Meesho Sales</div>
              <div class="card-val">₹${Number(currentKPIs.meesho.revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div class="card-sub">${currentKPIs.meesho.orders} orders • ${currentKPIs.meesho.units} units</div>
            </div>
          </div>

          <div class="section-title">Product & Unit Economics</div>
          <div class="insights-grid">
            <div class="card">
              <div class="card-label">Best Selling Product</div>
              <div style="font-size: 11px; font-weight: 700; color: #1e293b; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;">
                ${bestSellingProduct ? bestSellingProduct.name : 'N/A'}
              </div>
              <div style="font-size: 11px; font-weight: 800; color: #475569;">
                ${bestSellingProduct ? `${bestSellingProduct.qty} units sold` : '—'}
              </div>
            </div>
            <div class="card">
              <div class="card-label">Most Revenue Product</div>
              <div style="font-size: 11px; font-weight: 700; color: #1e293b; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;">
                ${mostRevenueProduct ? mostRevenueProduct.name : 'N/A'}
              </div>
              <div style="font-size: 11px; font-weight: 800; color: #475569;">
                ${mostRevenueProduct ? `₹${Number(mostRevenueProduct.revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
              </div>
            </div>
            <div class="card">
              <div class="card-label">Avg Order Value (AOV)</div>
              <div class="card-val">
                ₹${Number(currentKPIs.total.orders > 0 ? currentKPIs.total.revenue / currentKPIs.total.orders : 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div class="card-sub">
                Revenue Per Unit: ₹${Number(currentKPIs.total.units > 0 ? currentKPIs.total.revenue / currentKPIs.total.units : 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div class="section-title">Transaction Audit Log</div>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th style="border-radius: 6px 0 0 6px;">Date</th>
                  <th>Product Name</th>
                  <th>Marketplace</th>
                  <th>Order ID</th>
                  <th>Qty</th>
                  <th style="text-align: right; border-radius: 0 6px 6px 0;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${tableRowsHTML || `<tr><td colspan="6" style="padding: 20px; text-align: center; color: #64748b;">No data in selected date range.</td></tr>`}
              </tbody>
            </table>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {toast.show && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl border bg-slate-900 text-slate-100 dark:bg-[#1E293B] border-slate-800 dark:border-slate-700 animate-fadeIn">
          {toast.type === 'success' ? (
            <CheckCircle2 size={16} className="text-emerald-500" />
          ) : (
            <AlertCircle size={16} className="text-red-500" />
          )}
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* 1. Header Page Title Block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-[#F8FAFC] tracking-tight">Marketplace Analytics & Online Sales</h1>
          <p className="text-slate-600 dark:text-[#94A3B8] text-sm mt-1">Configure line item orders and audit cross-platform sales trends</p>
        </div>
        <button onClick={() => { setForm(emptyForm()); setError(''); setShowModal(true); }}
          className="flex items-center justify-center gap-2 bg-[#EF4444] hover:bg-red-600 text-white text-sm font-bold px-5 py-3 rounded-2xl transition-all shadow-md dark:shadow-none hover:shadow-lg self-start">
          <Plus size={16} /> Log Online Sale
        </button>
      </div>

      {/* 2. ONLINE MARKETPLACE PERFORMANCE & FILTER BAR */}
      <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 shadow-md border border-slate-200/80 dark:border-[#1E293B] dark:shadow-none space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-[#F8FAFC] uppercase">Online Marketplace Performance</h2>
            <p className="text-slate-600 dark:text-[#94A3B8] text-xs mt-1">Real-time marketplace analytics and revenue intelligence across channels</p>
          </div>
          
          {/* Preset select buttons */}
          <div className="flex gap-1 bg-slate-150/70 dark:bg-[#1E293B] rounded-xl p-1 overflow-x-auto scrollbar-none max-w-full shrink-0">
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'thisWeek', label: 'This Week' },
              { id: 'thisMonth', label: 'This Month' },
              { id: 'thisYear', label: 'This Year' },
              { id: 'custom', label: 'Custom Range' }
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePresetClick(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  dateMode === p.id 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'text-slate-550 hover:text-slate-805 dark:text-[#94A3B8] dark:hover:text-[#F8FAFC] bg-transparent'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Range Panel */}
        {dateMode === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-4 items-end gap-4 p-4 bg-slate-50 dark:bg-[#0F172A] rounded-2xl border border-slate-202 dark:border-[#1E293B] animate-fadeIn">
            <div className="space-y-1.5 col-span-1">
              <label className="block text-[10px] font-bold text-slate-700 dark:text-[#CBD5E1] uppercase tracking-wider">Start Date</label>
              <input 
                type="date" 
                value={customStart} 
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-[#1E293B] rounded-xl text-xs bg-white dark:bg-[#111827] text-slate-900 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-indigo-500" 
              />
            </div>
            <div className="space-y-1.5 col-span-1">
              <label className="block text-[10px] font-bold text-slate-700 dark:text-[#CBD5E1] uppercase tracking-wider">End Date</label>
              <input 
                type="date" 
                value={customEnd} 
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full px-3 py-2 border border-slate-305 dark:border-[#1E293B] rounded-xl text-xs bg-white dark:bg-[#111827] text-slate-900 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-indigo-500" 
              />
            </div>
            <div className="flex gap-2 col-span-2">
              <button 
                type="button" 
                onClick={handleApplyCustom}
                className="flex-1 py-2 px-4 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all"
              >
                Apply Range
              </button>
              <button 
                type="button" 
                onClick={handleResetCustom}
                className="py-2 px-4 bg-white dark:bg-[#1E293B] hover:bg-slate-100 dark:hover:bg-[#1E293B] text-slate-700 dark:text-[#CBD5E1] text-xs font-bold rounded-xl border border-slate-300 dark:border-[#1E293B] transition-all flex items-center justify-center gap-1.5"
              >
                <RotateCcw size={13} /> Reset
              </button>
            </div>
          </div>
        )}
        
        <div className="text-[11px] text-slate-700 dark:text-[#CBD5E1] font-bold flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block mr-1"></span>
          Active Filter: <span className="text-slate-900 dark:text-[#F8FAFC] font-extrabold">{formatFriendlyDate(appliedRange.start)}</span> to <span className="text-slate-900 dark:text-[#F8FAFC] font-extrabold">{formatFriendlyDate(appliedRange.end)}</span>
        </div>
      </div>

      {/* 3. Marketplace KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Online Card */}
        <div className="bg-white dark:bg-[#111827] rounded-3xl p-5 border-t-4 border-t-indigo-600 border-x border-b border-slate-200 dark:border-[#1E293B] shadow-md dark:shadow-none flex flex-col justify-between min-h-[150px] min-w-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1E293B] pb-2.5">
            <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50 px-2.5 py-0.5 rounded-xl">
              Total Online
            </span>
            <span className="text-[9px] font-extrabold text-slate-805 dark:text-[#F8FAFC]">All Platforms</span>
          </div>
          <div className="mt-3.5 space-y-2.5 min-w-0">
            <div className="min-w-0">
              <span className="text-[8px] font-bold text-slate-600 dark:text-[#94A3B8] uppercase tracking-wider block">Revenue</span>
              <KPICardValue value={currentKPIs.total.revenue} className="text-[#111827] dark:text-[#F8FAFC]" />
            </div>
            <div className="grid grid-cols-2 border-t border-slate-100 dark:border-[#1E293B] pt-2 text-xs">
              <div>
                <span className="text-[8px] font-bold text-slate-600 dark:text-[#94A3B8] uppercase tracking-wider block">Orders</span>
                <span className="font-extrabold text-slate-900 dark:text-[#CBD5E1]">{currentKPIs.total.orders}</span>
              </div>
              <div>
                <span className="text-[8px] font-bold text-slate-600 dark:text-[#94A3B8] uppercase tracking-wider block">Units Sold</span>
                <span className="font-extrabold text-slate-900 dark:text-[#CBD5E1]">{currentKPIs.total.units}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Amazon Card */}
        <div className="bg-white dark:bg-[#111827] rounded-3xl p-5 border-t-4 border-t-orange-500 border-x border-b border-slate-200 dark:border-[#1E293B] shadow-md dark:shadow-none flex flex-col justify-between min-h-[150px] min-w-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1E293B] pb-2.5">
            <span className="text-[10px] font-black uppercase tracking-wider bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-900/50 px-2.5 py-0.5 rounded-xl">
              Amazon
            </span>
            <span className="text-[9px] font-extrabold text-slate-805 dark:text-[#F8FAFC]">Marketplace</span>
          </div>
          <div className="mt-3.5 space-y-2.5 min-w-0">
            <div className="min-w-0">
              <span className="text-[8px] font-bold text-slate-600 dark:text-[#94A3B8] uppercase tracking-wider block">Revenue</span>
              <KPICardValue value={currentKPIs.amazon.revenue} className="text-[#111827] dark:text-[#F8FAFC]" />
            </div>
            <div className="grid grid-cols-2 border-t border-slate-100 dark:border-[#1E293B] pt-2 text-xs">
              <div>
                <span className="text-[8px] font-bold text-slate-600 dark:text-[#94A3B8] uppercase tracking-wider block">Orders</span>
                <span className="font-extrabold text-slate-900 dark:text-[#CBD5E1]">{currentKPIs.amazon.orders}</span>
              </div>
              <div>
                <span className="text-[8px] font-bold text-slate-600 dark:text-[#94A3B8] uppercase tracking-wider block">Units Sold</span>
                <span className="font-extrabold text-slate-900 dark:text-[#CBD5E1]">{currentKPIs.amazon.units}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Flipkart Card */}
        <div className="bg-white dark:bg-[#111827] rounded-3xl p-5 border-t-4 border-t-blue-500 border-x border-b border-slate-200 dark:border-[#1E293B] shadow-md dark:shadow-none flex flex-col justify-between min-h-[150px] min-w-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1E293B] pb-2.5">
            <span className="text-[10px] font-black uppercase tracking-wider bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 px-2.5 py-0.5 rounded-xl">
              Flipkart
            </span>
            <span className="text-[9px] font-extrabold text-slate-805 dark:text-[#F8FAFC]">Marketplace</span>
          </div>
          <div className="mt-3.5 space-y-2.5 min-w-0">
            <div className="min-w-0">
              <span className="text-[8px] font-bold text-slate-600 dark:text-[#94A3B8] uppercase tracking-wider block">Revenue</span>
              <KPICardValue value={currentKPIs.flipkart.revenue} className="text-[#111827] dark:text-[#F8FAFC]" />
            </div>
            <div className="grid grid-cols-2 border-t border-slate-100 dark:border-[#1E293B] pt-2 text-xs">
              <div>
                <span className="text-[8px] font-bold text-slate-600 dark:text-[#94A3B8] uppercase tracking-wider block">Orders</span>
                <span className="font-extrabold text-slate-900 dark:text-[#CBD5E1]">{currentKPIs.flipkart.orders}</span>
              </div>
              <div>
                <span className="text-[8px] font-bold text-slate-600 dark:text-[#94A3B8] uppercase tracking-wider block">Units Sold</span>
                <span className="font-extrabold text-slate-900 dark:text-[#CBD5E1]">{currentKPIs.flipkart.units}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Meesho Card */}
        <div className="bg-white dark:bg-[#111827] rounded-3xl p-5 border-t-4 border-t-pink-500 border-x border-b border-slate-200 dark:border-[#1E293B] shadow-md dark:shadow-none flex flex-col justify-between min-h-[150px] min-w-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1E293B] pb-2.5">
            <span className="text-[10px] font-black uppercase tracking-wider bg-pink-50 dark:bg-pink-950/30 text-pink-700 dark:text-pink-400 border border-pink-200 dark:border-pink-900/50 px-2.5 py-0.5 rounded-xl">
              Meesho
            </span>
            <span className="text-[9px] font-extrabold text-slate-805 dark:text-[#F8FAFC]">Marketplace</span>
          </div>
          <div className="mt-3.5 space-y-2.5 min-w-0">
            <div className="min-w-0">
              <span className="text-[8px] font-bold text-slate-600 dark:text-[#94A3B8] uppercase tracking-wider block">Revenue</span>
              <KPICardValue value={currentKPIs.meesho.revenue} className="text-[#111827] dark:text-[#F8FAFC]" />
            </div>
            <div className="grid grid-cols-2 border-t border-slate-100 dark:border-[#1E293B] pt-2 text-xs">
              <div>
                <span className="text-[8px] font-bold text-slate-600 dark:text-[#94A3B8] uppercase tracking-wider block">Orders</span>
                <span className="font-extrabold text-slate-900 dark:text-[#CBD5E1]">{currentKPIs.meesho.orders}</span>
              </div>
              <div>
                <span className="text-[8px] font-bold text-slate-600 dark:text-[#94A3B8] uppercase tracking-wider block">Units Sold</span>
                <span className="font-extrabold text-slate-900 dark:text-[#CBD5E1]">{currentKPIs.meesho.units}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Sales Trends & Platform Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Line Chart */}
        <div className="bg-white dark:bg-[#111827] rounded-3xl p-5 shadow-md border border-slate-200 dark:border-[#1E293B] dark:shadow-none min-h-[300px] lg:col-span-2 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-[#F8FAFC] text-base">Sales Trend</h3>
            <p className="text-slate-600 dark:text-[#94A3B8] text-xs mt-0.5">Telemetry log detailing daily receipts from marketplace sales in active period</p>
          </div>
          <div className="flex-1 flex items-center mt-4">
            <SalesTrendChart data={dailyTrend} />
          </div>
        </div>

        {/* Platform Share Donut Chart */}
        <div className="bg-white dark:bg-[#111827] rounded-3xl p-5 shadow-md border border-slate-200 dark:border-[#1E293B] dark:shadow-none flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-[#F8FAFC] text-base">Platform Distribution</h3>
            <p className="text-slate-600 dark:text-[#94A3B8] text-xs mt-0.5">Contribution percentages of revenue across channels in active period</p>
          </div>
          <div className="flex-1 flex items-center mt-6">
            <PlatformDonutChart 
              data={donutData} 
              centerLabel="Online Sales" 
              centerValue={fmt(currentKPIs.total.revenue)}
            />
          </div>
        </div>
      </div>

      {/* 5. Product Insights, Leaderboard, & Quick Insights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Product Insights */}
        <div className="bg-white dark:bg-[#111827] rounded-3xl p-5 border border-slate-200 dark:border-[#1E293B] shadow-md dark:shadow-none flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-[#F8FAFC] text-base flex items-center gap-1.5">
              <TrendingUp size={16} className="text-indigo-650 dark:text-[#3B82F6]" />
              Product Insights
            </h3>
            <p className="text-slate-600 dark:text-[#94A3B8] text-xs mt-0.5">Top products and growth trends vs preceding identical duration</p>
          </div>

          <div className="space-y-4 mt-5 flex-1 flex flex-col justify-around">
            {/* Best Selling */}
            <div className="p-3 bg-slate-50 dark:bg-[#1E293B]/40 border border-slate-200 dark:border-[#1E293B] rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 truncate min-w-0">
                <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/30 text-orange-850 dark:text-orange-400 border border-orange-200 dark:border-orange-900/50 flex items-center justify-center flex-shrink-0 font-extrabold text-base">
                  🏆
                </div>
                <div className="truncate min-w-0">
                  <span className="text-[9px] font-bold text-slate-700 dark:text-[#CBD5E1] uppercase tracking-wider block">Best Selling Product</span>
                  <span className="font-extrabold text-slate-900 dark:text-[#F8FAFC] text-xs truncate block">
                    {bestSellingProduct ? bestSellingProduct.name : 'No Sales'}
                  </span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-xs font-black text-slate-950 dark:text-[#F8FAFC] block">
                  {bestSellingProduct ? `${bestSellingProduct.qty} units` : '—'}
                </span>
                <span className="text-[9px] font-bold text-slate-700 dark:text-[#94A3B8] uppercase tracking-wider">By Volume</span>
              </div>
            </div>

            {/* Most Revenue */}
            <div className="p-3 bg-slate-50 dark:bg-[#1E293B]/40 border border-slate-200 dark:border-[#1E293B] rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 truncate min-w-0">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/30 text-indigo-805 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50 flex items-center justify-center flex-shrink-0 font-extrabold text-base">
                  💎
                </div>
                <div className="truncate min-w-0">
                  <span className="text-[9px] font-bold text-slate-700 dark:text-[#CBD5E1] uppercase tracking-wider block">Most Revenue Product</span>
                  <span className="font-extrabold text-slate-900 dark:text-[#F8FAFC] text-xs truncate block">
                    {mostRevenueProduct ? mostRevenueProduct.name : 'No Sales'}
                  </span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-xs font-black text-slate-955 dark:text-[#F8FAFC] block">
                  {mostRevenueProduct ? fmt(mostRevenueProduct.revenue) : '—'}
                </span>
                <span className="text-[9px] font-bold text-slate-700 dark:text-[#94A3B8] uppercase tracking-wider">By Revenue</span>
              </div>
            </div>

            {/* Fastest Growing */}
            <div className="p-3 bg-slate-50 dark:bg-[#1E293B]/40 border border-slate-205 dark:border-[#1E293B] rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 truncate min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/30 text-emerald-805 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-center flex-shrink-0 font-extrabold text-base">
                  ⚡
                </div>
                <div className="truncate min-w-0">
                  <span className="text-[9px] font-bold text-slate-700 dark:text-[#CBD5E1] uppercase tracking-wider block">Fastest Growing Product</span>
                  <span className="font-extrabold text-slate-900 dark:text-[#F8FAFC] text-xs truncate block">
                    {fastestGrowingProduct ? fastestGrowingProduct.name : 'No Sales'}
                  </span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-xs font-black text-emerald-750 dark:text-[#10B981] block">
                  {fastestGrowingProduct 
                    ? `${fastestGrowingProduct.growthQty >= 0 ? '+' : ''}${fastestGrowingProduct.growthQty} units` 
                    : '—'}
                </span>
                <span className="text-[9px] font-bold text-emerald-900 dark:text-[#10B981] bg-emerald-100 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 px-1.5 py-0.5 rounded-full inline-block mt-0.5">
                  {fastestGrowingProduct && fastestGrowingProduct.growthPercent !== null 
                    ? `${fastestGrowingProduct.growthQty >= 0 ? '+' : ''}${fastestGrowingProduct.growthPercent.toFixed(0)}%` 
                    : 'New Product'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Marketplace Leaderboard */}
        <div className="bg-white dark:bg-[#111827] rounded-3xl p-5 border border-slate-200 dark:border-[#1E293B] shadow-md dark:shadow-none flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-[#F8FAFC] text-base flex items-center gap-1.5">
              <Award size={16} className="text-indigo-600 dark:text-indigo-400" />
              Marketplace Leaderboard
            </h3>
            <p className="text-slate-600 dark:text-[#94A3B8] text-xs mt-0.5">Ranking channels by revenue generated in active range</p>
          </div>

          <div className="space-y-4 mt-5 flex-1 flex flex-col justify-around">
            {platformRankings.map((plat, index) => {
              const rankStyles = [
                'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/30 dark:text-[#F59E0B] dark:border-amber-900/50 font-extrabold',
                'bg-slate-100 text-slate-900 border-slate-300 dark:bg-[#1E293B] dark:text-[#CBD5E1] dark:border-[#1E293B] font-extrabold',
                'bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900/50 font-extrabold'
              ];
              const rankLabels = ['🥇 1st', '🥈 2nd', '🥉 3rd'];
              return (
                <div key={plat.id} className="flex flex-col gap-1.5 text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-800 dark:text-[#CBD5E1]">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-lg border text-[9px] ${rankStyles[index] || 'bg-slate-100 text-slate-900'}`}>
                        {rankLabels[index] || `${index + 1}th`}
                      </span>
                      <span className="capitalize text-slate-900 dark:text-[#F8FAFC] font-extrabold">{plat.label}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-slate-900 dark:text-[#F8FAFC]">{fmt(plat.revenue)}</span>
                      <span className="text-[9px] text-slate-700 dark:text-[#94A3B8] font-bold block">{plat.share.toFixed(1)}% share</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-[#0F172A] border border-slate-200 dark:border-[#1E293B] h-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${plat.share}%`, backgroundColor: plat.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Insights & Export Options */}
        <div className="bg-white dark:bg-[#111827] rounded-3xl p-5 border border-slate-200 dark:border-[#1E293B] shadow-md dark:shadow-none flex flex-col justify-between md:col-span-2 lg:col-span-1">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-[#F8FAFC] text-base flex items-center gap-1.5">
              <Layers size={16} className="text-indigo-650 dark:text-[#3B82F6]" />
              Quick Insights
            </h3>
            <p className="text-slate-600 dark:text-[#94A3B8] text-xs mt-0.5">Critical unit economics and sales outliers</p>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 mt-5">
            <div>
              <span className="text-[9px] font-bold text-slate-700 dark:text-[#94A3B8] uppercase tracking-wider block">Total Orders</span>
              <span className="text-xs font-black text-slate-900 dark:text-[#F8FAFC]">{currentKPIs.total.orders} orders</span>
            </div>
            
            <div>
              <span className="text-[9px] font-bold text-slate-700 dark:text-[#94A3B8] uppercase tracking-wider block">Total Units Sold</span>
              <span className="text-xs font-black text-slate-900 dark:text-[#F8FAFC]">{currentKPIs.total.units} units</span>
            </div>

            <div>
              <span className="text-[9px] font-bold text-slate-700 dark:text-[#94A3B8] uppercase tracking-wider block">Avg Order Value (AOV)</span>
              <span className="text-xs font-black text-slate-900 dark:text-[#F8FAFC]">
                {fmt(currentKPIs.total.orders > 0 ? currentKPIs.total.revenue / currentKPIs.total.orders : 0)}
              </span>
            </div>

            <div>
              <span className="text-[9px] font-bold text-slate-700 dark:text-[#94A3B8] uppercase tracking-wider block">Revenue Per Unit</span>
              <span className="text-xs font-black text-slate-900 dark:text-[#F8FAFC]">
                {fmt(currentKPIs.total.units > 0 ? currentKPIs.total.revenue / currentKPIs.total.units : 0)}
              </span>
            </div>

            <div className="col-span-2 border-t border-slate-200 dark:border-[#1E293B] pt-2.5">
              <span className="text-[9px] font-bold text-slate-700 dark:text-[#94A3B8] uppercase tracking-wider block">Highest Sale Day</span>
              <span className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC] flex items-center justify-between">
                <span>{formatFriendlyDate(highestSaleDay.date)}</span>
                <span className="text-emerald-700 dark:text-[#10B981] font-extrabold">{fmt(highestSaleDay.revenue)}</span>
              </span>
            </div>

            <div className="col-span-2">
              <span className="text-[9px] font-bold text-slate-700 dark:text-[#94A3B8] uppercase tracking-wider block">Lowest Sale Day</span>
              <span className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC] flex items-center justify-between">
                <span>{formatFriendlyDate(lowestSaleDay.date)}</span>
                <span className="text-red-750 dark:text-[#EF4444] font-extrabold">{fmt(lowestSaleDay.revenue)}</span>
              </span>
            </div>
          </div>

          {/* Export Options */}
          <div className="border-t border-slate-200 dark:border-[#1E293B] pt-3 mt-4">
            <span className="text-[9px] font-bold text-slate-700 dark:text-[#94A3B8] uppercase tracking-wider block mb-2">Export Data</span>
            <div className="grid grid-cols-2 gap-2">
              <button 
                type="button" 
                onClick={exportToCSV}
                className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all shadow-sm dark:shadow-none"
              >
                <Download size={12} /> Excel
              </button>
              <button 
                type="button" 
                onClick={exportToPDF}
                className="flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3 py-2 rounded-xl transition-all shadow-sm dark:shadow-none"
              >
                <Download size={12} /> PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Historical Ledger Section (Scrollable Table) */}
      <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-[#1E293B] space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-[#1E293B] pb-4">
          <div>
            <h3 className="font-extrabold text-slate-800 dark:text-[#F8FAFC] text-base">All Orders Audit Ledger</h3>
            <p className="text-slate-400 dark:text-[#94A3B8] text-xs mt-0.5">Search and audit the complete marketplace transaction logs</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Platform pills filters */}
            <div className="flex gap-1 bg-slate-100 dark:bg-[#1E293B] rounded-xl p-1 overflow-x-auto scrollbar-none max-w-full">
              {['all', ...PLATFORMS.map((p) => p.id)].map((f) => (
                <button 
                  key={f} 
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize shrink-0 ${
                    filter === f ? 'bg-red-600 text-white shadow-sm' : 'text-slate-505 dark:text-[#CBD5E1] hover:text-slate-800 dark:hover:text-[#F8FAFC] bg-transparent'
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
                className="w-full sm:w-[220px] pl-8 pr-3 py-2 border border-slate-202 dark:border-[#1E293B] rounded-xl text-xs bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-red-500" 
              />
            </div>
          </div>
        </div>

        {/* Scrollable table container */}
        <div className="max-h-[400px] overflow-y-auto border border-slate-100 dark:border-[#1E293B] rounded-2xl">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-[#94A3B8]">
              <ShoppingCart size={36} className="mb-2 opacity-30" />
              <p className="text-xs font-semibold">No sales match the selected filters</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/70 dark:bg-[#1E293B] border-b border-slate-100 dark:border-[#1E293B] text-slate-500 dark:text-[#94A3B8] uppercase font-extrabold sticky top-0 z-10">
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
              <tbody className="divide-y divide-slate-100 dark:divide-[#1E293B] bg-white dark:bg-[#111827]">
                {filtered.map((s) => {
                  const pl = PLATFORMS.find((p) => p.id === s.platform);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-[#172554] transition-colors">
                      <td className="px-4 py-3 text-slate-550 dark:text-[#94A3B8] whitespace-nowrap">{s.date}</td>
                      <td className="px-4 py-3 font-semibold text-slate-700 dark:text-[#F8FAFC]">
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
                      <td className="px-4 py-3 text-slate-500 dark:text-[#94A3B8] font-mono">{s.orderId || '—'}</td>
                      <td className="px-4 py-3 text-slate-707 dark:text-[#CBD5E1] font-bold">
                        {s.saleType === 'Box' ? `${s.saleQty} Box${s.saleQty > 1 ? 'es' : ''} (${s.qty} pcs)` : `${s.qty} Piece${s.qty > 1 ? 's' : ''}`}
                      </td>
                      <td className="px-4 py-3 font-black text-slate-800 dark:text-[#F8FAFC]">₹{s.amount}</td>
                      <td className="px-4 py-3 text-right flex items-center justify-end gap-1.5">
                        {s.status === 'Cancelled' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-900/50">
                            Cancelled
                          </span>
                        ) : (
                          <button 
                            onClick={() => handleCancel(s.id)} 
                            title="Cancel Order"
                            className="p-1.5 rounded-lg text-slate-400 dark:text-[#CBD5E1] hover:bg-red-55 dark:hover:bg-red-950/30 hover:text-red-500 dark:hover:text-[#EF4444] transition-all"
                          >
                            <XCircle size={13} />
                          </button>
                        )}
                        <button 
                          onClick={() => handleDelete(s.id)} 
                          disabled={user?.role === 'EMPLOYEE'} 
                          className="p-1.5 rounded-lg text-slate-400 dark:text-[#CBD5E1] hover:bg-red-55 dark:hover:bg-red-950/30 hover:text-red-500 dark:hover:text-[#EF4444] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
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
              <label className="block text-xs font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider">Platform *</label>
              <div className="grid grid-cols-3 gap-3">
                {PLATFORMS.map((p) => (
                  <button key={p.id} type="button" onClick={() => handlePlatformChange(p.id)}
                    className={`py-3 px-4 rounded-xl text-sm font-semibold border-2 transition-all ${
                      form.platform === p.id 
                        ? `${p.color} text-white border-transparent shadow-sm` 
                        : 'border-slate-202 dark:border-[#1E293B] text-slate-600 dark:text-[#CBD5E1] hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-[#0F172A]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-101 dark:border-[#1E293B] pb-2">
                <label className="block text-xs font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider">Products *</label>
                {form.platform && (
                  <span className="text-xs text-slate-400 dark:text-[#94A3B8] font-medium">
                    Pricing using <span className="font-semibold capitalize text-red-600 dark:text-[#EF4444]">{form.platform}</span>
                  </span>
                )}
              </div>

              {/* Desktop Headers */}
              {form.items.length > 0 && (
                <div className="hidden md:grid md:grid-cols-[45%_20%_15%_20%] gap-4 pr-12 pl-4 text-xs font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider">
                  <div>Product *</div>
                  <div>Sale Type *</div>
                  <div>Qty *</div>
                  <div>Amount (₹) *</div>
                </div>
              )}

              <div className="space-y-4">
                {form.items.map((item, idx) => {
                  const selProd = products.find((p) => p.id === item.productId);
                  return (
                    <div key={idx} className="p-4 border border-slate-200 dark:border-[#1E293B] rounded-2xl bg-slate-50/30 dark:bg-[#0F172A]/30 space-y-3 animate-fadeIn">
                      <div className="flex items-center gap-3">
                        <div className="grid grid-cols-1 md:grid-cols-[45%_20%_15%_20%] gap-4 flex-1 items-start">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider mb-1.5 md:hidden">Product *</label>
                            <SearchableSelect
                              required
                              value={item.productId}
                              onChange={(val) => handleItemProductChange(idx, val)}
                              placeholder="Select product…"
                              options={products.filter((p) => p.availableQty > 0 || p.id === item.productId).map((p) => ({ value: p.id, label: `${p.name} (Stock: ${p.availableQty})` }))}
                              className="w-full text-slate-900"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider mb-1.5 md:hidden">Sale Type *</label>
                            <select
                              value={item.saleType || 'Piece'}
                              onChange={(e) => handleItemSaleTypeChange(idx, e.target.value)}
                              className="w-full h-[42px] px-3 py-2 border border-slate-200 dark:border-[#1E293B] rounded-xl text-sm bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-red-500"
                            >
                              <option value="Piece">Piece</option>
                              {selProd?.piecesPerBox > 0 && <option value="Box">Box</option>}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider mb-1.5 md:hidden">{item.saleType === 'Box' ? 'Boxes *' : 'Qty *'}</label>
                            <input required type="number" min="1" max={item.saleType === 'Box' ? Math.floor(selProd?.availableQty / (selProd?.piecesPerBox || 1)) : (selProd?.availableQty || 9999)} value={item.qty}
                              onChange={(e) => handleItemQtyChange(idx, e.target.value)}
                              className="w-full h-[42px] px-4 py-2.5 border border-slate-200 dark:border-[#1E293B] rounded-xl text-sm text-center bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="1" />
                            {selProd && item.saleType === 'Box' && (
                              <span className="block text-[10px] text-slate-400 font-medium mt-1 text-center">
                                (= {item.qty * (selProd.piecesPerBox || 1)} pcs)
                              </span>
                            )}
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider mb-1.5 md:hidden">Amount (₹) *</label>
                            <input required type="number" step="0.01" min="0" value={item.amount}
                              onChange={(e) => handleItemAmountChange(idx, e.target.value)}
                              className="w-full h-[42px] px-4 py-2.5 border border-slate-200 dark:border-[#1E293B] rounded-xl text-sm bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="Amount (₹)" />
                          </div>
                        </div>

                        {form.items.length > 1 && (
                          <button type="button" onClick={() => removeItem(idx)}
                            className="p-2.5 mt-0 md:mt-1.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex-shrink-0">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>

                      {selProd && (
                        <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-550 dark:text-[#CBD5E1] bg-slate-100/40 dark:bg-[#1E293B]/40 px-3 py-2.5 rounded-xl border border-slate-200/40 dark:border-[#1E293B]">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-slate-400">Stock Available:</span>
                            <span className={`font-semibold ${selProd.availableQty < 20 ? 'text-yellow-600 dark:text-[#F59E0B]' : 'text-slate-700 dark:text-[#F8FAFC]'}`}>
                              {selProd.availableQty} units {selProd.piecesPerBox > 0 && `(${Math.floor(selProd.availableQty / selProd.piecesPerBox)} boxes)`}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 sm:mt-0">
                            <span className="font-medium text-slate-400">
                              {item.saleType === 'Box' ? 'Box Price:' : (form.platform ? `${PLATFORMS.find(p => p.id === form.platform)?.label} Price:` : 'Platform Price:')}
                            </span>
                            <span className="font-bold text-red-650 dark:text-[#EF4444]">
                              ₹{getEffectivePrice(selProd, form.platform, item.saleType)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button type="button" onClick={addItem}
                className="flex items-center gap-1.5 text-red-600 dark:text-[#EF4444] hover:text-red-700 text-sm font-semibold transition-colors mt-2">
                <PlusCircle size={16} /> Add another product
              </button>
            </div>

            {/* Order ID and Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider">Order ID</label>
                <input value={form.orderId} onChange={(e) => setForm((f) => ({ ...f, orderId: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-[#1E293B] rounded-xl text-sm bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="e.g. ORD-123" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider">Date *</label>
                <input required type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-[#1E293B] rounded-xl text-sm bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider">Notes</label>
              <textarea rows={2.5} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-[#1E293B] rounded-xl text-sm bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-red-550 resize-none" placeholder="Optional notes…" />
            </div>

            {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/20 px-3 py-2 rounded-xl border border-red-100 dark:border-red-900/50">{error}</p>}

            {/* Action buttons */}
            <div className="flex gap-4 pt-3 border-t border-slate-100 dark:border-[#1E293B]">
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 border border-slate-200 dark:border-[#1E293B] rounded-xl text-sm font-semibold text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-55 dark:hover:bg-[#1E293B] transition-colors">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 py-3 bg-[#EF4444] hover:bg-red-600 disabled:opacity-60 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm dark:shadow-none">
                {saving && <Loader2 size={16} className="animate-spin" />} Log Sale
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
