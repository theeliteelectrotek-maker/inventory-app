import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { 
  Plus, Trash2, Store, X, Loader2, Search, Edit2, PlusCircle, 
  ChevronDown, ChevronUp, TrendingUp, IndianRupee, AlertTriangle, 
  Clock, Calendar, CheckCircle2, ArrowUpRight, DollarSign, 
  Wallet, CreditCard, Filter, RefreshCw, Eye, Tag, FileText, UserCheck, 
  CalendarDays, Percent, Building2, UserCircle2, Printer, Download
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SearchableSelect from '../components/SearchableSelect';
import { useLocation } from 'react-router-dom';
import KPICardValue from '../components/KPICardValue';
import MetricCard from '../components/MetricCard';

const emptyItem = { productId: '', qty: '', amount: '', saleType: 'Piece' };

const getEffectiveOfflinePrice = (product, saleType) => {
  if (!product) return 0;
  if (saleType === 'Box') {
    return product.boxSellingPrice || 0;
  }
  if (product.pieceSellingPrice > 0) {
    return product.pieceSellingPrice;
  }
  return product.offlinePrice ?? product.unitPrice ?? 0;
};

const today = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
};
const emptyOrder = () => ({ date: today(), items: [{ ...emptyItem }], gst: false });
const emptyTxn = () => ({ 
  id: 'txn_' + Math.random().toString(36).substr(2, 9),
  amount: '', 
  method: 'cash', 
  date: today(),
  chequeNumber: '',
  bankName: '',
  chequeDate: '',
  expectedClearingDate: '',
  isPDC: false,
  chequeStatus: 'pending'
});
const emptyForm = { buyerName: '', orders: [emptyOrder()], transactions: [], notes: '' };

const METHOD_LABELS = {
  cash: '💵 Cash',
  upi: '⚡ UPI',
  bank_transfer: '🏦 Bank Transfer',
  cheque: '✍️ Cheque'
};

const METHOD_COLORS = { 
  cash: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-[#10B981] dark:border-emerald-900/50', 
  upi: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50',
  bank_transfer: 'bg-sky-50 text-sky-700 border-sky-100 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900/50',
  cheque: 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/50'
};

function TxnRow({ txn, onChange, onRemove }) {
  const handleChequeDateChange = (dateVal) => {
    onChange('chequeDate', dateVal);
    const todayStr = today();
    if (dateVal > todayStr) {
      onChange('isPDC', true);
      onChange('chequeStatus', 'pdc');
    } else {
      onChange('isPDC', false);
      onChange('chequeStatus', 'pending');
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4 border border-slate-100 dark:border-[#1E293B] rounded-2xl bg-slate-50/50 dark:bg-[#1E293B]/30 relative">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex gap-3 flex-1">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 dark:text-[#94A3B8]">₹</span>
            <input type="number" step="0.01" min="0" value={txn.amount} onChange={(e) => onChange('amount', e.target.value)}
              className="w-full pl-7 pr-3 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-[#1E293B] text-slate-900 dark:text-[#F8FAFC]" placeholder="Amount" required />
          </div>
          <select value={txn.method} onChange={(e) => {
              const m = e.target.value;
              onChange('method', m);
              if (m === 'cheque') {
                onChange('chequeStatus', 'pending');
              }
            }}
            className="w-36 px-3 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-[#1E293B] font-medium text-slate-700 dark:text-[#CBD5E1]">
            <option value="cash" className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">💵 Cash</option>
            <option value="upi" className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">⚡ UPI</option>
            <option value="cheque" className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">✍️ Cheque</option>
          </select>
        </div>
        <div className="flex items-center gap-3 flex-1">
          <input type="date" value={txn.date} onChange={(e) => onChange('date', e.target.value)}
            className="flex-1 px-3 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-[#1E293B] text-slate-900 dark:text-[#F8FAFC]" />
          <button type="button" onClick={onRemove}
            className="p-2 rounded-xl text-slate-400 dark:text-[#94A3B8] hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-500 dark:hover:text-[#EF4444] transition-colors flex-shrink-0">
            <X size={16} />
          </button>
        </div>
      </div>

      {txn.method === 'cheque' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-3 border-t border-slate-200/50 dark:border-[#334155]/50 animate-fadeIn">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider">Cheque Number *</label>
            <input type="text" value={txn.chequeNumber || ''} onChange={(e) => onChange('chequeNumber', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-[#334155] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-[#1E293B] text-slate-900 dark:text-[#F8FAFC]" placeholder="e.g. 123456" required />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider">Bank Name *</label>
            <input type="text" value={txn.bankName || ''} onChange={(e) => onChange('bankName', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-[#334155] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-[#1E293B] text-slate-900 dark:text-[#F8FAFC]" placeholder="e.g. HDFC Bank" required />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider">Cheque Date *</label>
            <input type="date" value={txn.chequeDate || ''} onChange={(e) => handleChequeDateChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-[#334155] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-[#1E293B] text-slate-900 dark:text-[#F8FAFC]" required />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider">Expected Clearing Date *</label>
            <input type="date" value={txn.expectedClearingDate || ''} onChange={(e) => onChange('expectedClearingDate', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-[#334155] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-[#1E293B] text-slate-900 dark:text-[#F8FAFC]" required />
          </div>
          <div className="flex items-center gap-2 pt-5">
            <input type="checkbox" id={`isPDC-${txn.id}`} checked={txn.isPDC || false} onChange={(e) => {
              const checked = e.target.checked;
              onChange('isPDC', checked);
              onChange('chequeStatus', checked ? 'pdc' : 'pending');
            }} className="text-red-550 rounded focus:ring-red-500" />
            <label htmlFor={`isPDC-${txn.id}`} className="text-xs font-bold text-slate-500 dark:text-[#CBD5E1] cursor-pointer">
              Post Dated Cheque (PDC)
            </label>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider font-semibold">Cheque Status</label>
            <select value={txn.chequeStatus || 'pending'} onChange={(e) => onChange('chequeStatus', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-[#334155] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-[#1E293B] text-slate-900 dark:text-[#F8FAFC]">
              <option value="pending">🟡 Pending Clearance</option>
              <option value="cleared">🟢 Cleared</option>
              <option value="bounced">🔴 Bounced</option>
              <option value="pdc">🔵 PDC (Future Date)</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

const filterProductOption = (option, search) => {
  const p = option.product;
  if (!p) return false;
  const searchLower = (search || '').toLowerCase();
  const name = p.name ? String(p.name).toLowerCase() : '';
  const sku = p.sku ? String(p.sku).toLowerCase() : '';
  const category = p.category ? String(p.category).toLowerCase() : '';
  const description = p.description ? String(p.description).toLowerCase() : '';
  return (
    name.includes(searchLower) ||
    sku.includes(searchLower) ||
    category.includes(searchLower) ||
    description.includes(searchLower)
  );
};

const renderProductOption = (opt) => {
  const p = opt.product;
  if (!p) return opt.label;
  return (
    <div className="flex flex-col text-left py-0.5">
      <span className="font-extrabold text-slate-800 dark:text-[#F8FAFC] text-xs uppercase">{p.name}</span>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-500 dark:text-[#94A3B8] mt-1 font-semibold">
        <span>SKU: {p.sku || 'N/A'}</span>
        <span>Stock: {p.availableQty || 0}</span>
        <span>Selling Price: ₹{p.offlinePrice ?? p.unitPrice ?? 0}</span>
      </div>
    </div>
  );
};

function ItemRow({ item, products, onProductChange, onQtyChange, onSaleTypeChange, onAmountChange, onRemove, showRemove, isGst, loading }) {
  const selProd = products.find((p) => p.id === item.productId);
  return (
    <div className="space-y-2 p-4 sm:p-0 border border-slate-100 dark:border-[#1E293B] sm:border-0 rounded-2xl sm:rounded-none bg-slate-50/50 dark:bg-[#1E293B]/30 sm:bg-transparent">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <SearchableSelect
            value={item.productId}
            onChange={onProductChange}
            placeholder="Search or Select Product..."
            options={products.map((p) => ({ value: p.id, label: p.name, product: p }))}
            filterOption={filterProductOption}
            renderOption={renderProductOption}
            loading={loading}
            className="w-full"
          />
        </div>
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          <select
            value={item.saleType || 'Piece'}
            onChange={(e) => onSaleTypeChange && onSaleTypeChange(e.target.value)}
            className="w-full sm:w-28 px-3 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-[#1E293B] font-medium text-slate-707 dark:text-[#CBD5E1]"
          >
            <option value="Piece">Piece</option>
            {selProd?.piecesPerBox > 0 && <option value="Box">Box</option>}
          </select>

          <input type="number" min="1" max={item.saleType === 'Box' ? Math.floor(selProd?.availableQty / (selProd?.piecesPerBox || 1)) : (selProd?.availableQty || 9999)} value={item.qty}
            onChange={(e) => onQtyChange(e.target.value)}
            className="w-full sm:w-20 px-3 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-[#1E293B] text-slate-900 dark:text-[#F8FAFC] text-center" placeholder={item.saleType === 'Box' ? 'Boxes' : 'Qty'} />
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 dark:text-[#94A3B8]">₹</span>
            <input type="number" step="0.01" min="0" value={item.amount}
              onChange={(e) => onAmountChange(e.target.value)}
              className="w-full sm:w-28 pl-7 pr-3 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-[#1E293B] text-slate-900 dark:text-[#F8FAFC]" placeholder="Amount" />
          </div>
          {showRemove && (
            <button type="button" onClick={onRemove}
              className="p-2 rounded-xl text-slate-400 dark:text-[#94A3B8] hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-500 dark:hover:text-[#EF4444] transition-colors flex-shrink-0">
              <X size={16} />
            </button>
          )}
        </div>
      </div>
      {selProd && (
        <p className="text-xs text-slate-400 dark:text-[#94A3B8] pl-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-1 bg-slate-50 dark:bg-[#1E293B]/50 p-2 rounded-lg border border-slate-100 dark:border-[#334155]">
          <span>
            📍 Stock: <span className="font-semibold text-slate-700 dark:text-[#CBD5E1]">{selProd.availableQty} units {selProd.piecesPerBox > 0 && `(${Math.floor(selProd.availableQty / selProd.piecesPerBox)} boxes)`}</span>
            &nbsp;· {item.saleType === 'Box' ? 'Box Price:' : 'Base Price:'} <span className="font-semibold text-rose-600 dark:text-[#EF4444]">₹{typeof getEffectiveOfflinePrice === 'function' ? getEffectiveOfflinePrice(selProd, item.saleType) : (selProd?.boxSellingPrice || selProd?.pieceSellingPrice || selProd?.offlinePrice || selProd?.unitPrice || 0)}</span>
            {item.saleType === 'Box' && (
              <span className="font-semibold text-slate-500"> (= {Number(item.qty || 0) * (selProd.piecesPerBox || 1)} pcs)</span>
            )}
          </span>
          {item.amount && (
            <span className={`self-start sm:self-auto text-[10px] font-bold px-2 py-0.5 rounded-full border ${isGst ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-[#10B981] dark:border-emerald-900/50' : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-[#1E293B] dark:text-[#CBD5E1] dark:border-[#334155]'}`}>
              {isGst ? 'GST (18%) Included' : 'Excl. GST'}
            </span>
          )}
        </p>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm !m-0 animate-fadeIn">
      <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-2xl w-[95%] sm:w-full max-w-2xl border border-slate-100 dark:border-[#1E293B] overflow-visible transform transition-all scale-100">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-[#1E293B] bg-slate-50/50 dark:bg-[#1E293B]/30 rounded-t-3xl">
          <h3 className="font-bold text-slate-800 dark:text-[#F8FAFC] text-base flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 dark:bg-[#EF4444]"></span>
            {title}
          </h3>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 dark:text-[#CBD5E1] hover:bg-slate-200/60 dark:hover:bg-[#1E293B] hover:text-slate-600 dark:hover:text-[#F8FAFC] transition-colors"><X size={18} /></button>
        </div>
        <div className="px-6 py-6 max-h-[75vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export default function OfflineSales() {
  const { user } = useAuth();
  const location = useLocation();
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [customerCategory, setCustomerCategory] = useState('existing_shop');
  const [newShopName, setNewShopName] = useState('');
  const [newShopOwner, setNewShopOwner] = useState('');
  const [newShopMobile, setNewShopMobile] = useState('');
  const [newShopAddress, setNewShopAddress] = useState('');
  const [newShopGst, setNewShopGst] = useState('');

  const [newIndName, setNewIndName] = useState('');
  const [newIndMobile, setNewIndMobile] = useState('');
  const [newIndAddress, setNewIndAddress] = useState('');
  const [walkInName, setWalkInName] = useState('');
  const [walkInMobile, setWalkInMobile] = useState('');
  const [editModal, setEditModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editNewItems, setEditNewItems] = useState([]);
  const [editGst, setEditGst] = useState(false);
  const [editNewDate, setEditNewDate] = useState('');
  const [editNewTxns, setEditNewTxns] = useState([]);
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [companySettings, setCompanySettings] = useState(null);

  // Receipt Audit states
  const [receiptToEdit, setReceiptToEdit] = useState(null);
  const [receiptToDelete, setReceiptToDelete] = useState(null);
  const [activeSaleForReceipt, setActiveSaleForReceipt] = useState(null);
  const [correctionReason, setCorrectionReason] = useState('');
  const [correctionNotes, setCorrectionNotes] = useState('');
  const [editReceiptForm, setEditReceiptForm] = useState({ method: 'cash', amount: '', date: today(), referenceNumber: '', notes: '' });
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteNotes, setDeleteNotes] = useState('');
  const [viewReceiptHistorySale, setViewReceiptHistorySale] = useState(null);

  const ensureTxnId = (t) => {
    if (!t.id) {
      t.id = Math.random().toString(36).substring(2, 9);
    }
    return t;
  };

  const handleOpenEditReceipt = (sale, txn) => {
    setActiveSaleForReceipt(sale);
    setReceiptToEdit(txn);
    setCorrectionReason('');
    setCorrectionNotes('');
    setEditReceiptForm({
      method: txn.method || 'cash',
      amount: String(txn.amount || ''),
      date: txn.date || today(),
      referenceNumber: txn.referenceNumber || '',
      notes: txn.notes || ''
    });
    setError('');
  };

  const handleOpenDeleteReceipt = (sale, txn) => {
    setActiveSaleForReceipt(sale);
    setReceiptToDelete(txn);
    setDeleteReason('');
    setDeleteNotes('');
    setError('');
  };

  const handleViewReceiptHistory = (sale, txnId) => {
    setViewReceiptHistorySale(sale);
  };

  const getChequeBadgeStyle = (status) => {
    if (status === 'cleared') return 'bg-emerald-50 text-emerald-705 border-emerald-100 dark:bg-emerald-950/30 dark:text-[#10B981] dark:border-emerald-900/50';
    if (status === 'bounced') return 'bg-rose-50 text-rose-705 border-rose-100 dark:bg-rose-950/30 dark:text-[#EF4444] dark:border-rose-900/50';
    if (status === 'pdc') return 'bg-blue-50 text-blue-705 border-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50';
    return 'bg-amber-50 text-amber-705 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50';
  };

  const handleUpdateChequeStatus = async (sale, txnId, newStatus) => {
    if (!confirm(`Are you sure you want to mark this cheque as ${newStatus.toUpperCase()}?`)) return;
    setSaving(true);
    try {
      const updatedTxns = (sale.transactions || []).map((t) => {
        const txn = ensureTxnId(t);
        if (txn.id === txnId) {
          return {
            ...txn,
            chequeStatus: newStatus
          };
        }
        return txn;
      });

      const formattedTimestamp = new Date().toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      });
      
      const targetTxn = sale.transactions.find(t => t.id === txnId);
      const prevSummary = `${METHOD_LABELS[targetTxn.method] || targetTxn.method} (Status: ${targetTxn.chequeStatus || 'pending'})`;
      const updatedSummary = `${METHOD_LABELS[targetTxn.method] || targetTxn.method} (Status: ${newStatus})`;
      
      const logEntry = {
        type: 'edit',
        txnId: txnId,
        timestamp: formattedTimestamp,
        changedBy: user?.name || user?.role || 'Admin',
        reason: `Cheque marked as ${newStatus.toUpperCase()}`,
        previous: prevSummary,
        updated: updatedSummary
      };

      const updated = await api.updateOfflineSale(sale.id, {
        transactions: updatedTxns,
        corrections: [...(sale.corrections || []), logEntry]
      });

      setSales((ss) => ss.map((s) => s.id === updated.id ? updated : s));
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const exportChequesCSV = (statusFilter) => {
    const headers = ['Invoice No', 'Date', 'Customer Name', 'Cheque Number', 'Bank Name', 'Cheque Date', 'Expected Clearing Date', 'PDC', 'Cheque Amount', 'Status'];
    const rows = [];
    
    sales.forEach((s) => {
      (s.transactions || []).forEach((t) => {
        if (t.method === 'cheque' && (statusFilter === 'all' || t.chequeStatus === statusFilter)) {
          rows.push([
            s.invoiceNumber || s.id || '',
            s.date || '',
            s.buyerName || '',
            t.chequeNumber || '',
            t.bankName || '',
            t.chequeDate || '',
            t.expectedClearingDate || '',
            t.isPDC ? 'Yes' : 'No',
            t.amount || 0,
            t.chequeStatus || ''
          ]);
        }
      });
    });

    if (rows.length === 0) {
      alert('No cheques found for the selected status.');
      return;
    }

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Cheque_Report_${statusFilter}_${today()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportChequesPDF = (statusFilter) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to export report');
      return;
    }

    const title = `Cheque Report - ${statusFilter.toUpperCase()}`;
    const compName = companySettings?.companyName || 'The Elite Electrotek';
    
    const rows = [];
    let totalAmt = 0;
    sales.forEach((s) => {
      (s.transactions || []).forEach((t) => {
        if (t.method === 'cheque' && (statusFilter === 'all' || t.chequeStatus === statusFilter)) {
          rows.push({
            invoiceNumber: s.invoiceNumber || s.id,
            date: s.date,
            buyerName: s.buyerName,
            chequeNumber: t.chequeNumber,
            bankName: t.bankName,
            chequeDate: t.chequeDate,
            expectedClearingDate: t.expectedClearingDate,
            isPDC: t.isPDC,
            amount: Number(t.amount) || 0,
            status: t.chequeStatus
          });
          totalAmt += Number(t.amount) || 0;
        }
      });
    });

    if (rows.length === 0) {
      alert('No cheques found for the selected status.');
      printWindow.close();
      return;
    }

    const tableRowsHTML = rows.map((row, idx) => `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
        <td style="padding: 8px 10px; color: #475569;">${idx + 1}</td>
        <td style="padding: 8px 10px; font-weight: 600; color: #1e293b;">${row.invoiceNumber}</td>
        <td style="padding: 8px 10px; color: #475569;">${row.buyerName}</td>
        <td style="padding: 8px 10px; font-family: monospace;">${row.chequeNumber || '—'}</td>
        <td style="padding: 8px 10px;">${row.bankName || '—'}</td>
        <td style="padding: 8px 10px;">${row.chequeDate || '—'}</td>
        <td style="padding: 8px 10px;">${row.expectedClearingDate || '—'}</td>
        <td style="padding: 8px 10px; text-transform: uppercase; font-weight: bold; color: ${
          row.status === 'cleared' ? '#047857' : row.status === 'bounced' ? '#b91c1c' : '#b45309'
        };">
          ${row.status}
        </td>
        <td style="padding: 8px 10px; font-weight: bold; text-align: right; color: #1e293b;">₹${row.amount.toLocaleString('en-IN')}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            body {
              font-family: 'Inter', sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 40px;
              background: #ffffff;
            }
            .report-box {
              max-width: 900px;
              margin: auto;
              border: 1px solid #e2e8f0;
              border-radius: 16px;
              padding: 30px;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 15px;
              margin-bottom: 20px;
            }
            .report-title {
              font-size: 20px;
              font-weight: 800;
              color: #ef4444;
              margin: 0;
              text-transform: uppercase;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th {
              background: #f1f5f9;
              color: #475569;
              font-weight: 800;
              text-transform: uppercase;
              font-size: 10px;
              padding: 10px;
              text-align: left;
            }
            .totals {
              font-size: 14px;
              font-weight: 850;
              text-align: right;
              padding-top: 10px;
              border-top: 2px solid #e2e8f0;
            }
            @media print {
              body { padding: 0; }
              .report-box { border: none; padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="report-box">
            <div class="header">
              <div>
                <h1 class="report-title">${title}</h1>
                <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Company: ${compName}</div>
              </div>
              <div style="font-size: 11px; color: #64748b; text-align: right;">
                <div>Export Date: ${today()}</div>
                <div>Records: ${rows.length}</div>
              </div>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Invoice No</th>
                  <th>Customer</th>
                  <th>Cheque No</th>
                  <th>Bank Name</th>
                  <th>Cheque Date</th>
                  <th>Clearing Date</th>
                  <th>Status</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${tableRowsHTML}
              </tbody>
            </table>
            
            <div class="totals">
              Total Amount: ₹${totalAmt.toLocaleString('en-IN')}
            </div>
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

  const handleSaveEditReceipt = async (e) => {
    e.preventDefault();
    if (!activeSaleForReceipt || !receiptToEdit) return;
    setSaving(true); setError('');
    try {
      const updatedTxns = activeSaleForReceipt.transactions.map((t) => {
        const txn = ensureTxnId(t);
        if (txn.id === receiptToEdit.id) {
          return {
            id: txn.id,
            method: editReceiptForm.method,
            amount: Number(editReceiptForm.amount) || 0,
            date: editReceiptForm.date,
            referenceNumber: editReceiptForm.referenceNumber,
            notes: editReceiptForm.notes
          };
        }
        return txn;
      });

      const formattedTimestamp = new Date().toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      });
      const prevSummary = `${METHOD_LABELS[receiptToEdit.method] || receiptToEdit.method} ${fmt(receiptToEdit.amount)} on ${receiptToEdit.date}`;
      const updatedSummary = `${METHOD_LABELS[editReceiptForm.method] || editReceiptForm.method} ${fmt(editReceiptForm.amount)} on ${editReceiptForm.date}`;
      
      const logEntry = {
        type: 'edit',
        txnId: receiptToEdit.id,
        timestamp: formattedTimestamp,
        changedBy: user?.name || user?.role || 'Admin',
        reason: correctionReason === 'Other' ? `Other: ${correctionNotes}` : correctionReason,
        previous: prevSummary,
        updated: updatedSummary
      };

      const updated = await api.updateOfflineSale(activeSaleForReceipt.id, {
        transactions: updatedTxns,
        corrections: [...(activeSaleForReceipt.corrections || []), logEntry]
      });

      setSales((ss) => ss.map((s) => s.id === updated.id ? updated : s));
      setReceiptToEdit(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDeleteReceipt = async (e) => {
    e.preventDefault();
    if (!activeSaleForReceipt || !receiptToDelete) return;
    setSaving(true); setError('');
    try {
      const updatedTxns = activeSaleForReceipt.transactions.filter((t) => {
        const txn = ensureTxnId(t);
        return txn.id !== receiptToDelete.id;
      });

      const formattedTimestamp = new Date().toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      });
      const prevSummary = `${METHOD_LABELS[receiptToDelete.method] || receiptToDelete.method} ${fmt(receiptToDelete.amount)} on ${receiptToDelete.date}`;
      
      const logEntry = {
        type: 'delete',
        txnId: receiptToDelete.id,
        timestamp: formattedTimestamp,
        changedBy: user?.name || user?.role || 'Admin',
        reason: deleteReason === 'Other' ? `Other: ${deleteNotes}` : deleteReason,
        previous: prevSummary,
        updated: 'Deleted'
      };

      const updated = await api.updateOfflineSale(activeSaleForReceipt.id, {
        transactions: updatedTxns,
        corrections: [...(activeSaleForReceipt.corrections || []), logEntry]
      });

      setSales((ss) => ss.map((s) => s.id === updated.id ? updated : s));
      setReceiptToDelete(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Expandable Sales Cards state
  const [expandedIds, setExpandedIds] = useState({});

  // Filter states
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterShop, setFilterShop] = useState('all');
  const [filterMethod, setFilterMethod] = useState('all');
  const [filterChequeStatus, setFilterChequeStatus] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterGstType, setFilterGstType] = useState('all');

  function load() {
    Promise.all([api.getOfflineSales(), api.getProducts(), api.getShops(), api.getCompanySettings()])
      .then(([s, p, sh, comp]) => {
        setSales(s.reverse());
        setProducts(p);
        setShops(sh);
        if (comp) setCompanySettings(comp);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  const handlePrintInvoice = (s, isPdfMode = false) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print/export invoice');
      return;
    }

    const title = `Invoice_${s.invoiceNumber || s.id}`;

    const compName = companySettings?.companyName || 'The Elite Electrotek';
    const compGst = companySettings?.gstNumber || '';
    const compAddr = companySettings?.address || '';
    const compMobile = companySettings?.mobile || '';
    const compEmail = companySettings?.email || '';
    const compLogo = companySettings?.logo || '';

    const isGST = s.isGSTInvoice;
    const baseAmount = isGST ? Math.round((s.totalAmount / 1.18) * 100) / 100 : s.totalAmount;
    const taxAmount = s.totalAmount - baseAmount;

    const itemsHTML = (s.items || []).map((item, idx) => {
      const itemBasePrice = isGST ? (item.amount / item.qty) / 1.18 : (item.amount / item.qty);
      return `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
          <td style="padding: 10px 12px; color: #475569;">${idx + 1}</td>
          <td style="padding: 10px 12px; font-weight: 600; color: #1e293b;">
            ${item.productName}
          </td>
          <td style="padding: 10px 12px; font-family: monospace; color: #475569;">${item.productId || '—'}</td>
          <td style="padding: 10px 12px; font-weight: bold; color: #1e293b; text-align: center;">
            ${item.saleType === 'Box' ? `${item.saleQty} Box${item.saleQty > 1 ? 'es' : ''} (${item.qty} pcs)` : `${item.qty} Piece${item.qty > 1 ? 's' : ''}`}
          </td>
          <td style="padding: 10px 12px; font-weight: bold; color: #1e293b; text-align: right;">₹${Number(itemBasePrice).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          ${isGST ? `<td style="padding: 10px 12px; font-weight: bold; color: #1e293b; text-align: right;">18%</td>` : ''}
          <td style="padding: 10px 12px; font-weight: bold; text-align: right; color: #1e293b;">₹${Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
      `;
    }).join('');

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
              padding: 40px;
              background: #ffffff;
            }
            .invoice-box {
              max-width: 800px;
              margin: auto;
              border: 1px solid #e2e8f0;
              border-radius: 16px;
              padding: 30px;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            }
            .header-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            .header-table td {
              vertical-align: top;
            }
            .company-title {
              font-size: 24px;
              font-weight: 900;
              color: #ef4444;
              margin: 0 0 5px 0;
              text-transform: uppercase;
            }
            .meta-label {
              font-size: 10px;
              font-weight: 700;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              margin-bottom: 2px;
            }
            .meta-value {
              font-size: 13px;
              font-weight: 600;
              color: #0f172a;
            }
            .bill-details {
              display: grid;
              grid-template-cols: repeat(2, 1fr);
              gap: 20px;
              margin-bottom: 30px;
              padding: 20px;
              background: #f8fafc;
              border-radius: 12px;
              border: 1px solid #e2e8f0;
            }
            .bill-title {
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              color: #64748b;
              margin-bottom: 6px;
            }
            table.items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            table.items-table th {
              background: #f1f5f9;
              color: #475569;
              font-weight: 800;
              text-transform: uppercase;
              font-size: 10px;
              padding: 10px 12px;
              letter-spacing: 0.025em;
              border: none;
            }
            .totals-table {
              width: 300px;
              margin-left: auto;
              border-collapse: collapse;
            }
            .totals-table td {
              padding: 8px 12px;
              font-size: 12px;
            }
            .totals-table tr.grand-total {
              background: #f8fafc;
              font-weight: 800;
              font-size: 14px;
              border-top: 2px solid #e2e8f0;
            }
            .badge {
              display: inline-block;
              font-size: 10px;
              font-weight: 800;
              padding: 4px 8px;
              border-radius: 6px;
              text-transform: uppercase;
              margin-top: 5px;
            }
            .badge-gst {
              background: #ecfdf5;
              color: #047857;
              border: 1px solid #a7f3d0;
            }
            .badge-nongst {
              background: #f1f5f9;
              color: #475569;
              border: 1px solid #cbd5e1;
            }
            @media print {
              body {
                padding: 0;
              }
              .invoice-box {
                border: none;
                box-shadow: none;
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="invoice-box">
            <table class="header-table">
              <tr>
                <td>
                  ${compLogo ? `<img src="${compLogo}" style="height: 50px; max-width: 180px; object-fit: contain; margin-bottom: 10px;" />` : ''}
                  <h1 class="company-title">${compName}</h1>
                  <div style="font-size: 11px; color: #475569; line-height: 1.5;">
                    ${compAddr ? `<div>${compAddr}</div>` : ''}
                    ${compMobile ? `<div>Mobile: ${compMobile}</div>` : ''}
                    ${compEmail ? `<div>Email: ${compEmail}</div>` : ''}
                    ${compGst ? `<div style="font-weight: bold; margin-top: 5px; color: #0f172a;">GSTIN: ${compGst}</div>` : ''}
                  </div>
                </td>
                <td style="text-align: right; width: 250px;">
                  <div style="font-size: 18px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin-bottom: 15px;">
                    ${isGST ? 'Tax Invoice' : 'Bill of Supply'}
                  </div>
                  <div style="margin-bottom: 8px;">
                    <div class="meta-label">Invoice Number</div>
                    <div class="meta-value" style="color: #ef4444; font-family: monospace; font-size: 14px;">${s.invoiceNumber || 'N/A'}</div>
                  </div>
                  <div style="margin-bottom: 8px;">
                    <div class="meta-label">Date</div>
                    <div class="meta-value">${s.date}</div>
                  </div>
                  <div>
                    <div class="meta-label">GST Classification</div>
                    <div class="badge ${isGST ? 'badge-gst' : 'badge-nongst'}">${isGST ? 'GST 18%' : 'Non-GST'}</div>
                  </div>
                </td>
              </tr>
            </table>

            <div class="bill-details">
              <div>
                <div class="bill-title">Billed To</div>
                <div style="font-size: 14px; font-weight: 700; color: #0f172a;">${s.buyerName}</div>
                <div style="font-size: 11px; color: #475569; margin-top: 3px;">
                  Customer Name: ${s.buyerName}
                </div>
              </div>
              <div style="text-align: right;">
                <div class="bill-title">Payment Status</div>
                <div style="font-size: 14px; font-weight: 700; color: ${s.amountLeft === 0 ? '#10b981' : '#ef4444'}">
                  ${s.amountLeft === 0 ? 'Fully Paid' : s.amountReceived > 0 ? 'Partially Paid' : 'Unpaid'}
                </div>
                <div style="font-size: 11px; color: #475569; margin-top: 3px;">
                  Pending Dues: ₹${s.amountLeft.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; color: #64748b;">Line Items</div>
            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 40px; border-radius: 8px 0 0 8px; text-align: left;">#</th>
                  <th style="text-align: left;">Product Name</th>
                  <th style="text-align: left; width: 100px;">SKU/ID</th>
                  <th style="text-align: center; width: 60px;">Qty</th>
                  <th style="text-align: right; width: 100px;">Rate</th>
                  ${isGST ? `<th style="text-align: right; width: 60px;">GST</th>` : ''}
                  <th style="text-align: right; width: 100px; border-radius: 0 8px 8px 0;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHTML}
              </tbody>
            </table>

            <table class="totals-table">
              ${isGST ? `
                <tr>
                  <td style="color: #64748b; font-weight: 500;">Taxable Value</td>
                  <td style="text-align: right; font-weight: 600; color: #1e293b;">₹${Number(baseAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; font-weight: 500;">CGST (9%)</td>
                  <td style="text-align: right; font-weight: 600; color: #1e293b;">₹${(Math.round((taxAmount / 2) * 100) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; font-weight: 500;">SGST (9%)</td>
                  <td style="text-align: right; font-weight: 600; color: #1e293b;">₹${(Math.round((taxAmount / 2) * 100) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              ` : `
                <tr>
                  <td style="color: #64748b; font-weight: 500;">Subtotal</td>
                  <td style="text-align: right; font-weight: 600; color: #1e293b;">₹${Number(s.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              `}
              <tr class="grand-total">
                <td style="color: #0f172a; font-weight: 800;">Grand Total</td>
                <td style="text-align: right; font-weight: 900; color: #ef4444;">₹${Number(s.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            </table>

            ${s.notes ? `
              <div style="margin-top: 40px; padding: 15px; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 11px; background: #fafafa;">
                <strong style="color: #0f172a;">Notes/Instructions:</strong>
                <div style="margin-top: 5px; color: #475569; line-height: 1.5;">${s.notes}</div>
              </div>
            ` : ''}
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

  function openLogInvoiceModal() {
    setForm(emptyForm);
    setCustomerCategory('existing_shop');
    setWalkInName('');
    setWalkInMobile('');
    setNewShopName('');
    setNewShopOwner('');
    setNewShopMobile('');
    setNewShopAddress('');
    setNewShopGst('');
    setNewIndName('');
    setNewIndMobile('');
    setNewIndAddress('');
    setError('');
    setShowModal(true);
  }

  useEffect(() => {
    load();
    if (location.state?.openAddModal) {
      openLogInvoiceModal();
    }
  }, [location.state]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const searchParam = params.get('search');
    const idParam = params.get('id');
    if (searchParam) {
      setSearch(searchParam);
    }
    if (idParam) {
      setExpandedIds((prev) => ({ ...prev, [idParam]: true }));
    }
  }, [location.search]);

  // ── Add-form order handlers ────────────────────────────────
  function setOrderDate(oi, date) {
    setForm((f) => { const orders = [...f.orders]; orders[oi] = { ...orders[oi], date }; return { ...f, orders }; });
  }

  function handleItemProductChange(oi, ii, productId) {
    try {
      console.log(`[OfflineSales] handleItemProductChange called: orderIndex=${oi}, itemIndex=${ii}, productId=${productId}`);
      
      const p = products?.find((x) => x.id === productId);
      if (!p) {
        console.error('[OfflineSales] Product not found in list for ID:', productId);
        return;
      }
      
      const currentItem = form.orders[oi]?.items[ii];
      if (!currentItem) {
        console.error(`[OfflineSales] Order item at index ${ii} in order ${oi} not found.`);
        return;
      }

      const saleType = currentItem.saleType || 'Piece';
      const unitPrice = getEffectiveOfflinePrice(p, saleType);
      const qty = Number(currentItem.qty) || 1;
      const baseAmount = unitPrice * qty;
      const isGst = !!form.orders[oi]?.gst;
      const finalAmount = isGst ? Math.round(baseAmount * 1.18 * 100) / 100 : baseAmount;

      console.log(`[OfflineSales] Calculating amount for selected product: name=${p.name}, saleType=${saleType}, unitPrice=${unitPrice}, qty=${qty}, baseAmount=${baseAmount}, isGst=${isGst}, finalAmount=${finalAmount}`);

      setForm((f) => {
        try {
          const orders = [...f.orders];
          if (!orders[oi]) return f;
          const items = [...orders[oi].items];
          if (!items[ii]) return f;
          
          items[ii] = { 
            ...items[ii], 
            productId, 
            amount: finalAmount ? String(finalAmount) : '' 
          };
          orders[oi] = { ...orders[oi], items };
          console.log('[OfflineSales] State update successful for product change');
          return { ...f, orders };
        } catch (stateErr) {
          console.error('[OfflineSales] State update failed for product change:', stateErr);
          return f;
        }
      });
    } catch (err) {
      console.error('[OfflineSales] handleItemProductChange error caught:', err);
    }
  }

  function handleItemQtyChange(oi, ii, qty) {
    try {
      console.log(`[OfflineSales] handleItemQtyChange called: orderIndex=${oi}, itemIndex=${ii}, qty=${qty}`);
      
      const currentItem = form.orders[oi]?.items[ii];
      if (!currentItem) {
        console.error(`[OfflineSales] Order item at index ${ii} in order ${oi} not found.`);
        return;
      }
      
      const p = products?.find((x) => x.id === currentItem.productId);
      if (!p) {
        console.warn('[OfflineSales] Product not found in products list for item:', currentItem.productId);
      }
      
      const saleType = currentItem.saleType || 'Piece';
      const unitPrice = getEffectiveOfflinePrice(p, saleType);
      const baseAmount = unitPrice * Number(qty);
      const isGst = !!form.orders[oi]?.gst;
      const finalAmount = isGst ? Math.round(baseAmount * 1.18 * 100) / 100 : baseAmount;

      console.log(`[OfflineSales] Calculating amount for qty change: unitPrice=${unitPrice}, qty=${qty}, baseAmount=${baseAmount}, isGst=${isGst}, finalAmount=${finalAmount}`);

      setForm((f) => {
        try {
          const orders = [...f.orders];
          if (!orders[oi]) return f;
          const items = [...orders[oi].items];
          if (!items[ii]) return f;
          
          items[ii] = { 
            ...items[ii], 
            qty, 
            amount: finalAmount ? String(finalAmount) : items[ii].amount 
          };
          orders[oi] = { ...orders[oi], items };
          console.log('[OfflineSales] State update successful for qty change');
          return { ...f, orders };
        } catch (stateErr) {
          console.error('[OfflineSales] State update failed for qty change:', stateErr);
          return f;
        }
      });
    } catch (err) {
      console.error('[OfflineSales] handleItemQtyChange error caught:', err);
    }
  }

  function handleItemSaleTypeChange(oi, ii, saleType) {
    try {
      console.log(`[OfflineSales] handleItemSaleTypeChange called: orderIndex=${oi}, itemIndex=${ii}, saleType=${saleType}`);
      
      const currentItem = form.orders[oi]?.items[ii];
      if (!currentItem) {
        console.error(`[OfflineSales] Order item at index ${ii} in order ${oi} not found.`);
        return;
      }
      
      const p = products?.find((x) => x.id === currentItem.productId);
      if (!p) {
        console.warn('[OfflineSales] Product not found in products list for item:', currentItem.productId);
      }
      
      const unitPrice = getEffectiveOfflinePrice(p, saleType);
      const qty = Number(currentItem.qty) || 1;
      const baseAmount = unitPrice * qty;
      const isGst = !!form.orders[oi]?.gst;
      const finalAmount = isGst ? Math.round(baseAmount * 1.18 * 100) / 100 : baseAmount;

      console.log(`[OfflineSales] Calculating amount for saleType change: unitPrice=${unitPrice}, qty=${qty}, baseAmount=${baseAmount}, isGst=${isGst}, finalAmount=${finalAmount}`);

      setForm((f) => {
        try {
          const orders = [...f.orders];
          if (!orders[oi]) return f;
          const items = [...orders[oi].items];
          if (!items[ii]) return f;
          
          items[ii] = { 
            ...items[ii], 
            saleType, 
            amount: finalAmount ? String(finalAmount) : items[ii].amount 
          };
          orders[oi] = { ...orders[oi], items };
          console.log('[OfflineSales] State update successful for saleType change');
          return { ...f, orders };
        } catch (stateErr) {
          console.error('[OfflineSales] State update failed for saleType change:', stateErr);
          return f;
        }
      });
    } catch (err) {
      console.error('[OfflineSales] handleItemSaleTypeChange error caught:', err);
    }
  }

  function toggleOrderGst(oi) {
    setForm((f) => {
      const orders = [...f.orders];
      const order = { ...orders[oi] };
      const nextGst = !order.gst;
      order.gst = nextGst;
      order.items = order.items.map((item) => {
        if (!item.amount) return item;
        const currentAmount = Number(item.amount) || 0;
        const newAmount = nextGst ? Math.round(currentAmount * 1.18 * 100) / 100 : Math.round((currentAmount / 1.18) * 100) / 100;
        return { ...item, amount: String(newAmount) };
      });
      orders[oi] = order;
      return { ...f, orders };
    });
  }

  function handleItemAmountChange(oi, ii, amount) {
    setForm((f) => {
      const orders = [...f.orders];
      const items = [...orders[oi].items];
      items[ii] = { ...items[ii], amount };
      orders[oi] = { ...orders[oi], items };
      return { ...f, orders };
    });
  }

  function addItemToOrder(oi) {
    setForm((f) => {
      const orders = [...f.orders];
      orders[oi] = { ...orders[oi], items: [...orders[oi].items, { ...emptyItem }] };
      return { ...f, orders };
    });
  }

  function removeItemFromOrder(oi, ii) {
    setForm((f) => {
      const orders = [...f.orders];
      orders[oi] = { ...orders[oi], items: orders[oi].items.filter((_, i) => i !== ii) };
      return { ...f, orders };
    });
  }

  function addOrder() { setForm((f) => ({ ...f, orders: [...f.orders, emptyOrder()] })); }
  function removeOrder(oi) { setForm((f) => ({ ...f, orders: f.orders.filter((_, i) => i !== oi) })); }

  // ── Add-form transaction handlers ──────────────────────────
  function addTxn() { setForm((f) => ({ ...f, transactions: [...f.transactions, emptyTxn()] })); }
  function removeTxn(ti) { setForm((f) => ({ ...f, transactions: f.transactions.filter((_, i) => i !== ti) })); }
  function updateTxn(ti, key, val) {
    setForm((f) => {
      const transactions = [...f.transactions];
      transactions[ti] = { ...transactions[ti], [key]: val };
      return { ...f, transactions };
    });
  }

  // ── Edit new-item handlers ─────────────────────────────────
  function handleEditItemProductChange(idx, productId) {
    try {
      console.log(`[OfflineSales] handleEditItemProductChange called: index=${idx}, productId=${productId}`);
      
      const p = products?.find((x) => x.id === productId);
      if (!p) {
        console.error('[OfflineSales] Product not found in list for ID:', productId);
        return;
      }
      
      const currentItem = editNewItems[idx];
      if (!currentItem) {
        console.error(`[OfflineSales] Edit new item at index ${idx} not found.`);
        return;
      }

      const saleType = currentItem.saleType || 'Piece';
      const unitPrice = getEffectiveOfflinePrice(p, saleType);
      const qty = Number(currentItem.qty) || 1;
      const baseAmount = unitPrice * qty;
      const finalAmount = editGst ? Math.round(baseAmount * 1.18 * 100) / 100 : baseAmount;

      console.log(`[OfflineSales] Calculating amount for selected edit product: name=${p.name}, saleType=${saleType}, unitPrice=${unitPrice}, qty=${qty}, baseAmount=${baseAmount}, isGst=${editGst}, finalAmount=${finalAmount}`);

      setEditNewItems((items) => {
        try {
          const updated = [...items];
          if (!updated[idx]) return items;
          updated[idx] = { 
            ...updated[idx], 
            productId, 
            amount: finalAmount ? String(finalAmount) : '' 
          };
          console.log('[OfflineSales] State update successful for edit product change');
          return updated;
        } catch (stateErr) {
          console.error('[OfflineSales] State update failed for edit product change:', stateErr);
          return items;
        }
      });
    } catch (err) {
      console.error('[OfflineSales] handleEditItemProductChange error caught:', err);
    }
  }

  // ── Expand function ────────────────────────────────────────
  function toggleExpand(id) {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handleEditItemQtyChange(idx, qty) {
    try {
      console.log(`[OfflineSales] handleEditItemQtyChange called: index=${idx}, qty=${qty}`);
      
      const currentItem = editNewItems[idx];
      if (!currentItem) {
        console.error(`[OfflineSales] Edit new item at index ${idx} not found.`);
        return;
      }
      
      const p = products?.find((x) => x.id === currentItem.productId);
      if (!p) {
        console.warn('[OfflineSales] Product not found in products list for item:', currentItem.productId);
      }
      
      const saleType = currentItem.saleType || 'Piece';
      const unitPrice = getEffectiveOfflinePrice(p, saleType);
      const baseAmount = unitPrice * Number(qty);
      const finalAmount = editGst ? Math.round(baseAmount * 1.18 * 100) / 100 : baseAmount;

      console.log(`[OfflineSales] Calculating amount for edit qty change: unitPrice=${unitPrice}, qty=${qty}, baseAmount=${baseAmount}, isGst=${editGst}, finalAmount=${finalAmount}`);

      setEditNewItems((items) => {
        try {
          const updated = [...items];
          if (!updated[idx]) return items;
          updated[idx] = { 
            ...updated[idx], 
            qty, 
            amount: finalAmount ? String(finalAmount) : updated[idx].amount 
          };
          console.log('[OfflineSales] State update successful for edit qty change');
          return updated;
        } catch (stateErr) {
          console.error('[OfflineSales] State update failed for edit qty change:', stateErr);
          return items;
        }
      });
    } catch (err) {
      console.error('[OfflineSales] handleEditItemQtyChange error caught:', err);
    }
  }

  function handleEditItemSaleTypeChange(idx, saleType) {
    try {
      console.log(`[OfflineSales] handleEditItemSaleTypeChange called: index=${idx}, saleType=${saleType}`);
      
      const currentItem = editNewItems[idx];
      if (!currentItem) {
        console.error(`[OfflineSales] Edit new item at index ${idx} not found.`);
        return;
      }
      
      const p = products?.find((x) => x.id === currentItem.productId);
      if (!p) {
        console.warn('[OfflineSales] Product not found in products list for item:', currentItem.productId);
      }
      
      const unitPrice = getEffectiveOfflinePrice(p, saleType);
      const qty = Number(currentItem.qty) || 1;
      const baseAmount = unitPrice * qty;
      const finalAmount = editGst ? Math.round(baseAmount * 1.18 * 100) / 100 : baseAmount;

      console.log(`[OfflineSales] Calculating amount for edit saleType change: unitPrice=${unitPrice}, qty=${qty}, baseAmount=${baseAmount}, isGst=${editGst}, finalAmount=${finalAmount}`);

      setEditNewItems((items) => {
        try {
          const updated = [...items];
          if (!updated[idx]) return items;
          updated[idx] = { 
            ...updated[idx], 
            saleType, 
            amount: finalAmount ? String(finalAmount) : updated[idx].amount 
          };
          console.log('[OfflineSales] State update successful for edit saleType change');
          return updated;
        } catch (stateErr) {
          console.error('[OfflineSales] State update failed for edit saleType change:', stateErr);
          return items;
        }
      });
    } catch (err) {
      console.error('[OfflineSales] handleEditItemSaleTypeChange error caught:', err);
    }
  }

  function toggleEditGst() {
    setEditGst((prev) => {
      const nextGst = !prev;
      setEditNewItems((items) =>
        items.map((item) => {
          if (!item.amount) return item;
          const currentAmount = Number(item.amount) || 0;
          const newAmount = nextGst ? Math.round(currentAmount * 1.18 * 100) / 100 : Math.round((currentAmount / 1.18) * 100) / 100;
          return { ...item, amount: String(newAmount) };
        })
      );
      setEditModal((prevModal) => {
        if (!prevModal) return prevModal;
        const updatedItems = (prevModal.items || []).map((item) => {
          if (!item.amount) return item;
          const currentAmount = Number(item.amount) || 0;
          const newAmount = nextGst ? Math.round(currentAmount * 1.18 * 100) / 100 : Math.round((currentAmount / 1.18) * 100) / 100;
          return { ...item, amount: newAmount };
        });
        const updatedTotal = updatedItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        return {
          ...prevModal,
          items: updatedItems,
          totalAmount: updatedTotal,
        };
      });
      return nextGst;
    });
  }

  function handleEditItemAmountChange(idx, amount) {
    setEditNewItems((items) => { const u = [...items]; u[idx] = { ...u[idx], amount }; return u; });
  }

  function addEditItem() { setEditNewItems((items) => [...items, { ...emptyItem }]); }
  function removeEditItem(idx) { setEditNewItems((items) => items.filter((_, i) => i !== idx)); }

  // ── Edit new-transaction handlers ──────────────────────────
  function addEditTxn() { setEditNewTxns((t) => [...t, emptyTxn()]); }
  function removeEditTxn(ti) { setEditNewTxns((t) => t.filter((_, i) => i !== ti)); }
  function updateEditTxn(ti, key, val) {
    setEditNewTxns((t) => { const u = [...t]; u[ti] = { ...u[ti], [key]: val }; return u; });
  }

  // ── Computed totals ────────────────────────────────────────
  const computedTotal = form.orders.reduce((s, o) => s + o.items.reduce((is, i) => is + (Number(i.amount) || 0), 0), 0);
  const totalReceived = form.transactions.reduce((s, t) => {
    if (t.method === 'cheque' && t.chequeStatus !== 'cleared') {
      return s;
    }
    return s + (Number(t.amount) || 0);
  }, 0);
  const amountLeft = computedTotal - totalReceived;

  // ── Submit ─────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    const allItems = form.orders.flatMap((o) =>
      o.items.filter((i) => i.productId && i.qty).map((i) => ({
        ...i,
        saleQty: i.qty,
        saleType: i.saleType || 'Piece',
        date: o.date
      }))
    );
    if (allItems.length === 0) { setError('Add at least one product.'); return; }
    
    setSaving(true); setError('');
    try {
      let finalBuyerName = form.buyerName;
      let finalNotes = form.notes;
      if (customerCategory === 'existing_shop') {
        if (!finalBuyerName) {
          setError('Please select a customer shop.');
          setSaving(false);
          return;
        }
      } else if (customerCategory === 'existing_individual') {
        if (!finalBuyerName) {
          setError('Please select a registered individual customer.');
          setSaving(false);
          return;
        }
      } else if (customerCategory === 'new_shop') {
        if (!newShopName.trim()) {
          setError('Shop name is required.');
          setSaving(false);
          return;
        }
        if (newShopMobile.trim() && (!/^\d+$/.test(newShopMobile.trim()) || newShopMobile.trim().length !== 10)) {
          setError('Phone number must contain exactly 10 digits');
          setSaving(false);
          return;
        }
        const createdShop = await api.addShop({
          name: newShopName.trim(),
          type: 'shop',
          ownerName: newShopOwner.trim(),
          mobile: newShopMobile.trim(),
          address: newShopAddress.trim(),
          gstNumber: newShopGst.trim(),
          notes: 'Created inline from Offline Sales'
        });
        setShops((prev) => [...prev, createdShop]);
        finalBuyerName = createdShop.name;
      } else if (customerCategory === 'new_individual') {
        if (!newIndName.trim()) {
          setError('Customer name is required.');
          setSaving(false);
          return;
        }
        if (newIndMobile.trim() && (!/^\d+$/.test(newIndMobile.trim()) || newIndMobile.trim().length !== 10)) {
          setError('Phone number must contain exactly 10 digits');
          setSaving(false);
          return;
        }
        const createdInd = await api.addShop({
          name: newIndName.trim(),
          type: 'individual',
          mobile: newIndMobile.trim(),
          address: newIndAddress.trim(),
          notes: 'Created inline from Offline Sales'
        });
        setShops((prev) => [...prev, createdInd]);
        finalBuyerName = createdInd.name;
      } else if (customerCategory === 'walk-in') {
        finalBuyerName = walkInName.trim() || 'Walk-in Customer';
        if (walkInMobile.trim()) {
          finalNotes = `[Mobile: ${walkInMobile.trim()}] ${form.notes}`.trim();
        }
      }
      const validTxns = form.transactions.filter((t) => t.amount);
      const isGSTInvoice = form.orders.some((o) => o.gst);
      const payload = {
        buyerName: finalBuyerName, items: allItems, totalAmount: computedTotal,
        transactions: validTxns, amountReceived: totalReceived, notes: finalNotes,
        gst: isGSTInvoice,
        isGSTInvoice,
      };
      const sale = await api.addOfflineSale(payload);
      setSales((ss) => [sale, ...ss]);
      setProducts((ps) => {
        let updated = [...ps];
        for (const item of sale.items || []) {
          updated = updated.map((p) => p.id === item.productId ? { ...p, availableQty: p.availableQty - item.qty } : p);
        }
        return updated;
      });
      setShowModal(false);
      setForm(emptyForm);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdatePayment(e) {
    e.preventDefault();
    setSaving(true); setEditError('');
    const validNewItems = editNewItems.filter((i) => i.productId && i.qty).map((i) => ({
      ...i,
      saleQty: i.qty,
      saleType: i.saleType || 'Piece'
    }));
    const validNewTxns = editNewTxns.filter((t) => t.amount);
    try {
      const updated = await api.updateOfflineSale(editModal.id, {
        // NOTE: Do NOT send `items` here. invoice.items are permanent accounting
        // records and must never be replaced by a payment or product-line-add
        // operation. The backend guards against this but we also prevent it here.
        totalAmount: editModal.totalAmount,
        gst: editGst,
        isGSTInvoice: editGst,
        newTransactions: validNewTxns.length > 0 ? validNewTxns : undefined,
        newItems: validNewItems.length > 0 ? validNewItems : undefined,
        newItemsDate: editNewDate || today(),
      });
      setSales((ss) => ss.map((s) => s.id === updated.id ? updated : s));
      if (validNewItems.length > 0) {
        setProducts((ps) => {
          let result = [...ps];
          for (const item of validNewItems) {
            const product = result.find(p => p.id === item.productId);
            const piecesPerBox = product ? (product.piecesPerBox || 1) : 1;
            const deductQty = item.saleType === 'Box' ? Number(item.qty) * piecesPerBox : Number(item.qty);
            result = result.map((p) => p.id === item.productId ? { ...p, availableQty: p.availableQty - deductQty } : p);
          }
          return result;
        });
      }
      setEditModal(null);
      setEditNewItems([]);
      setEditNewDate('');
      setEditNewTxns([]);
    } catch (err) {
      setEditError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this sale? Stock will be restored.')) return;
    await api.deleteOfflineSale(id);
    const sale = sales.find((s) => s.id === id);
    setSales((ss) => ss.filter((s) => s.id !== id));
    if (sale) {
      const items = sale.items || [{ productId: sale.productId, qty: sale.qty }];
      setProducts((ps) => {
        let updated = [...ps];
        for (const item of items) {
          updated = updated.map((p) => p.id === item.productId ? { ...p, availableQty: p.availableQty + item.qty } : p);
        }
        return updated;
      });
    }
  }

  // ── Filter logic ───────────────────────────────────────────
  const filtered = sales.filter((s) => {
    // 1. Search filter (Product names, buyer name or id)
    const matchesSearch = !search ||
      (s.items ? s.items.some((i) => i.productName?.toLowerCase().includes(search.toLowerCase())) : s.productName?.toLowerCase().includes(search.toLowerCase())) ||
      s.buyerName.toLowerCase().includes(search.toLowerCase()) ||
      (s.invoiceNumber && s.invoiceNumber.toLowerCase().includes(search.toLowerCase())) ||
      (s.id && s.id.toLowerCase().includes(search.toLowerCase()));

    // 2. Status filter (Paid, Partial, Pending, Overdue)
    const diffDays = Math.floor((new Date() - new Date(s.date)) / (1000 * 60 * 60 * 24));
    const isOverdue = s.amountLeft > 0 && diffDays > 10;
    const isPaid = s.amountLeft === 0;
    const isPending = s.amountLeft === s.totalAmount;
    const isPartial = s.amountLeft > 0 && s.amountLeft < s.totalAmount;

    let matchesStatus = true;
    if (filterStatus === 'paid') matchesStatus = isPaid;
    else if (filterStatus === 'partial') matchesStatus = isPartial && !isOverdue;
    else if (filterStatus === 'pending') matchesStatus = isPending && !isOverdue;
    else if (filterStatus === 'overdue') matchesStatus = isOverdue;

    // 3. Shop/Customer filter
    const matchesShop = filterShop === 'all' || s.buyerName === filterShop;

    // 4. Payment method filter
    const txns = s.transactions || [];
    const matchesMethod = filterMethod === 'all' || 
      (filterMethod === 'cash' && txns.some(t => t.method === 'cash')) ||
      (filterMethod === 'upi' && txns.some(t => t.method === 'upi')) ||
      (filterMethod === 'cheque' && txns.some(t => t.method === 'cheque')) ||
      (filterMethod === 'none' && txns.length === 0);

    // Cheque status filter
    const matchesChequeStatus = filterChequeStatus === 'all' ||
      txns.some(t => t.method === 'cheque' && t.chequeStatus === filterChequeStatus);

    // 5. Date range filter
    let matchesDate = true;
    if (filterStartDate) matchesDate = matchesDate && s.date >= filterStartDate;
    if (filterEndDate) matchesDate = matchesDate && s.date <= filterEndDate;

    // 6. GST Type filter
    let matchesGst = true;
    if (filterGstType === 'gst') matchesGst = s.isGSTInvoice === true;
    else if (filterGstType === 'non-gst') matchesGst = s.isGSTInvoice !== true;

    return matchesSearch && matchesStatus && matchesShop && matchesMethod && matchesChequeStatus && matchesDate && matchesGst;
  });

  // ── KPI / Metrics computations (based on filtered list) ─────
  const summaryRevenue = filtered.reduce((s, x) => s + x.totalAmount, 0);
  const summaryReceived = filtered.reduce((s, x) => s + x.amountReceived, 0);
  const summaryPending = filtered.reduce((s, x) => s + x.amountLeft, 0);
  const summaryUpi = filtered.reduce((s, x) => s + (x.transactions || []).filter((t) => t.method === 'upi').reduce((a, t) => a + (Number(t.amount) || 0), 0), 0);
  const summaryCash = filtered.reduce((s, x) => s + (x.transactions || []).filter((t) => t.method === 'cash').reduce((a, t) => a + (Number(t.amount) || 0), 0), 0);

  // Cheque metrics computations
  let chequePendingAmt = 0;
  let chequeClearedAmt = 0;
  let chequeBouncedAmt = 0;
  let chequePdcAmt = 0;
  let upcomingCollectionsAmt = 0;
  
  const todayStr = today();

  filtered.forEach((s) => {
    (s.transactions || []).forEach((t) => {
      if (t.method === 'cheque') {
        const amt = Number(t.amount) || 0;
        if (t.chequeStatus === 'pending') {
          chequePendingAmt += amt;
        } else if (t.chequeStatus === 'cleared') {
          chequeClearedAmt += amt;
        } else if (t.chequeStatus === 'bounced') {
          chequeBouncedAmt += amt;
        } else if (t.chequeStatus === 'pdc') {
          chequePdcAmt += amt;
        }
        
        if (t.chequeStatus === 'pending' || t.chequeStatus === 'pdc') {
          upcomingCollectionsAmt += amt;
        }
      }
    });
  });

  const alertsList = [];
  const oneWeekLater = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const date = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${date}`;
  })();

  filtered.forEach((s) => {
    (s.transactions || []).forEach((t) => {
      if (t.method === 'cheque') {
        const amt = Number(t.amount) || 0;
        if (t.chequeStatus === 'bounced') {
          alertsList.push({
            type: 'bounced',
            message: `Bounced Cheque: ₹${amt.toLocaleString('en-IN')} (${t.bankName || 'N/A'}, No: ${t.chequeNumber || '—'}) for customer "${s.buyerName}" has bounced. Action required!`,
            sale: s,
            txnId: t.id
          });
        } else if (t.chequeStatus === 'pending' && t.expectedClearingDate && t.expectedClearingDate < todayStr) {
          alertsList.push({
            type: 'overdue',
            message: `Overdue Cheque: Cheque (No: ${t.chequeNumber || '—'}) of ₹${amt.toLocaleString('en-IN')} for "${s.buyerName}" was expected to clear on ${t.expectedClearingDate}.`,
            sale: s,
            txnId: t.id
          });
        } else if (t.chequeStatus === 'pending' && t.expectedClearingDate === todayStr) {
          alertsList.push({
            type: 'clearing_today',
            message: `Clearing Today: Cheque (No: ${t.chequeNumber || '—'}) of ₹${amt.toLocaleString('en-IN')} for "${s.buyerName}" is scheduled for clearance today.`,
            sale: s,
            txnId: t.id
          });
        } else if (t.chequeStatus === 'pdc' && t.chequeDate && t.chequeDate > todayStr && t.chequeDate <= oneWeekLater) {
          alertsList.push({
            type: 'upcoming_pdc',
            message: `Upcoming PDC Maturity: Post-dated Cheque of ₹${amt.toLocaleString('en-IN')} (No: ${t.chequeNumber || '—'}) for "${s.buyerName}" matures on ${t.chequeDate}.`,
            sale: s,
            txnId: t.id
          });
        }
      }
    });
  });

  // Filtered calculations for GST and Non-GST
  const gstInvoices = filtered.filter(s => s.isGSTInvoice);
  const nonGstInvoices = filtered.filter(s => !s.isGSTInvoice);

  const gstRevenue = gstInvoices.reduce((sum, s) => sum + s.totalAmount, 0);
  const nonGstRevenue = nonGstInvoices.reduce((sum, s) => sum + s.totalAmount, 0);

  const gstCount = gstInvoices.length;
  const nonGstCount = nonGstInvoices.length;

  const totalGstInvoicesCount = gstInvoices.length;
  const totalGstRevenue = gstRevenue;
  const gstTaxableAmount = gstInvoices.reduce((sum, s) => sum + Math.round((s.totalAmount / 1.18) * 100) / 100, 0);
  const gstCollected = totalGstRevenue - gstTaxableAmount;

  const totalNonGstInvoicesCount = nonGstInvoices.length;
  const totalNonGstRevenue = nonGstRevenue;

  // ── High-level Business Insights (always based on total sales for context) ──
  const todaySalesVal = sales.filter(s => s.date === todayStr).reduce((sum, s) => sum + s.totalAmount, 0);
  const currentMonthStr = todayStr.slice(0, 7);
  const thisMonthSalesVal = sales.filter(s => s.date && s.date.startsWith(currentMonthStr)).reduce((sum, s) => sum + s.totalAmount, 0);
  const totalOutstandingDues = sales.reduce((sum, s) => sum + s.amountLeft, 0);
  const avgOrderValue = sales.length > 0 ? (sales.reduce((sum, s) => sum + s.totalAmount, 0) / sales.length) : 0;
  
  const customerTotals = {};
  sales.forEach(s => { customerTotals[s.buyerName] = (customerTotals[s.buyerName] || 0) + s.totalAmount; });
  let topCustomerName = 'None';
  let topCustomerVal = 0;
  Object.entries(customerTotals).forEach(([name, val]) => {
    if (val > topCustomerVal) {
      topCustomerVal = val;
      topCustomerName = name;
    }
  });

  // Check filter active status
  const hasActiveFilters = filterStatus !== 'all' || filterShop !== 'all' || filterMethod !== 'all' || filterChequeStatus !== 'all' || filterStartDate !== '' || filterEndDate !== '' || search !== '' || filterGstType !== 'all';
  const resetFilters = () => {
    setFilterStatus('all');
    setFilterShop('all');
    setFilterMethod('all');
    setFilterChequeStatus('all');
    setFilterStartDate('');
    setFilterEndDate('');
    setSearch('');
    setFilterGstType('all');
  };

  // Build shop name map to retrieve customer type
  const shopMap = {};
  shops.forEach(s => { shopMap[s.name] = s.type; });

  // Format currency helper
  const fmt = (num) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num || 0);

  // Get status details helper
  const getSaleStatus = (s) => {
    const diffDays = Math.floor((new Date() - new Date(s.date)) / (1000 * 60 * 60 * 24));
    const isOverdue = s.amountLeft > 0 && diffDays > 10;
    
    if (s.amountLeft === 0) {
      return {
        label: 'Paid',
        colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-[#10B981] dark:border-emerald-900/50',
        dotClass: 'bg-emerald-500'
      };
    }
    if (isOverdue) {
      return {
        label: 'Overdue',
        colorClass: 'bg-rose-50 text-rose-850 border-rose-200 font-semibold animate-pulse dark:bg-rose-950/30 dark:text-[#EF4444] dark:border-rose-900/50',
        dotClass: 'bg-rose-600'
      };
    }
    if (s.amountReceived > 0) {
      return {
        label: 'Partial',
        colorClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50',
        dotClass: 'bg-amber-500'
      };
    }
    return {
      label: 'Pending',
      colorClass: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-[#EF4444] dark:border-red-900/50',
      dotClass: 'bg-red-500'
    };
  };

  // Render Customer Type Badge
  const renderCustomerBadge = (buyerName) => {
    const type = shopMap[buyerName];
    const isInd = type === 'individual' || type === 'walk-in' || buyerName === 'Walk-in Customer' || buyerName.toLowerCase().includes('walk-in');
    
    if (isInd) {
      return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-100 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900/50">
          👤 Individual
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/50">
          🏪 Shop
        </span>
      );
    }
  };

  function getOrderGroups(s) {
    const src = s.items && s.items.length > 0
      ? s.items
      : [{ productName: s.productName, qty: s.qty, amount: s.totalAmount, date: s.date }];
    const groups = {};
    for (const item of src) {
      const d = item.date || s.date || '—';
      if (!groups[d]) groups[d] = [];
      groups[d].push(item);
    }
    return Object.entries(groups);
  }

  function totalQty(s) {
    if (s.items) return s.items.reduce((t, i) => t + Number(i.qty), 0);
    return s.qty;
  }

  return (
    <div className="space-y-6">
      {/* Main Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-[#1E293B]">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-[#F8FAFC] tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-8 bg-red-650 dark:bg-[#EF4444] rounded-full"></span>
            Offline Sales Dashboard
          </h1>
          <p className="text-slate-500 dark:text-[#94A3B8] text-sm mt-1 font-medium">Manage customer billing, invoices, payment history, and collection metrics.</p>
        </div>
        <button onClick={openLogInvoiceModal}
          className="flex items-center justify-center gap-2 bg-[#EF4444] hover:bg-red-600 text-white text-xs font-bold px-5 py-3 rounded-2xl transition-all shadow-md hover:shadow-lg hover:shadow-red-500/10 self-start">
          <Plus size={16} /> Log New Invoice
        </button>
      </div>

      {/* Business Insights Strip */}
      <div className="bg-slate-50 dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] rounded-2xl p-4 grid grid-cols-2 md:grid-cols-5 gap-4 text-xs shadow-sm">
        <div className="bg-white dark:bg-[#111827] p-3.5 rounded-xl border border-slate-200 dark:border-[#334155] hover:shadow-sm transition-all flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
            <CalendarDays size={14} className="text-indigo-500" /> Today's Sales
          </span>
          <span className="font-extrabold text-slate-900 dark:text-[#F8FAFC] text-base mt-2">{fmt(todaySalesVal)}</span>
        </div>
        <div className="bg-white dark:bg-[#111827] p-3.5 rounded-xl border border-slate-200 dark:border-[#334155] hover:shadow-sm transition-all flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp size={14} className="text-emerald-500" /> This Month
          </span>
          <span className="font-extrabold text-slate-900 dark:text-[#F8FAFC] text-base mt-2">{fmt(thisMonthSalesVal)}</span>
        </div>
        <div className="bg-white dark:bg-[#111827] p-3.5 rounded-xl border border-slate-200 dark:border-[#334155] hover:shadow-sm transition-all flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle size={14} className="text-red-500" /> Total Outstanding
          </span>
          <span className="font-extrabold text-red-600 dark:text-[#EF4444] text-base mt-2">{fmt(totalOutstandingDues)}</span>
        </div>
        <div className="bg-white dark:bg-[#111827] p-3.5 rounded-xl border border-slate-200 dark:border-[#334155] hover:shadow-sm transition-all flex flex-col justify-between truncate">
          <span className="text-[11px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5 truncate">
            <UserCheck size={14} className="text-sky-500" /> Top Customer
          </span>
          <span className="font-extrabold text-slate-900 dark:text-[#F8FAFC] text-base mt-2 truncate" title={topCustomerName}>{topCustomerName}</span>
        </div>
        <div className="bg-white dark:bg-[#111827] p-3.5 rounded-xl border border-slate-200 dark:border-[#334155] hover:shadow-sm transition-all flex flex-col justify-between col-span-2 md:col-span-1">
          <span className="text-[11px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
            <Percent size={14} className="text-violet-500" /> Avg Order Value
          </span>
          <span className="font-extrabold text-slate-900 dark:text-[#F8FAFC] text-base mt-2">{fmt(avgOrderValue)}</span>
        </div>
      </div>

      {/* KPI Header Grid */}
      <div className="grid gap-4 xl:grid-cols-5 lg:grid-cols-5 md:grid-cols-2 grid-cols-1">
        <MetricCard
          header="Total Sales"
          value={summaryRevenue}
          isCurrency
          accentColor="border-t-indigo-500"
          valueClassName="text-slate-900 dark:text-[#F8FAFC]"
          description="Sales aggregate"
        />
        <MetricCard
          header="Total Received"
          value={summaryReceived}
          isCurrency
          accentColor="border-t-emerald-500"
          valueClassName="text-emerald-600 dark:text-[#10B981]"
          description="Cleared collections"
        />
        <MetricCard
          header="Pending Dues"
          value={summaryPending}
          isCurrency
          accentColor="border-t-red-500"
          valueClassName="text-red-650 dark:text-[#EF4444]"
          description="Awaiting collection"
        />
        <MetricCard
          header="UPI Payments"
          value={summaryUpi}
          isCurrency
          accentColor="border-t-blue-500"
          valueClassName="text-slate-900 dark:text-[#F8FAFC]"
          description="⚡ Digital receipts"
        />
        <MetricCard
          header="Cash Payments"
          value={summaryCash}
          isCurrency
          accentColor="border-t-violet-500"
          valueClassName="text-slate-900 dark:text-[#F8FAFC]"
          description="💵 Paper receipts"
        />
      </div>

      {/* GST Segregation KPI Grid */}
      <div className="grid gap-4 xl:grid-cols-4 lg:grid-cols-4 md:grid-cols-2 grid-cols-1 mt-6">
        <MetricCard
          header="GST Sales"
          value={gstRevenue}
          isCurrency
          accentColor="border-t-emerald-600"
          valueClassName="text-slate-900 dark:text-[#F8FAFC]"
          description="18% GST invoices"
        />
        <MetricCard
          header="Non GST Sales"
          value={nonGstRevenue}
          isCurrency
          accentColor="border-t-slate-500"
          valueClassName="text-slate-900 dark:text-[#F8FAFC]"
          description="Exempt / Cash invoices"
        />
        <MetricCard
          header="GST Invoices"
          value={`${gstCount} bills`}
          accentColor="border-t-teal-500"
          valueClassName="text-slate-900 dark:text-[#F8FAFC]"
          description="GST billing count"
        />
        <MetricCard
          header="Non GST Invoices"
          value={`${nonGstCount} bills`}
          accentColor="border-t-gray-400"
          valueClassName="text-slate-900 dark:text-[#F8FAFC]"
          description="Standard / Cash count"
        />
      </div>

      {/* GST & Non-GST Billing Summaries */}
      <div className="bg-slate-50 dark:bg-[#1E293B]/50 border border-slate-200 dark:border-[#334155] rounded-3xl p-6 grid grid-cols-1 md:grid-cols-2 gap-6 shadow-sm mt-6">
        {/* GST Summary */}
        <div className="space-y-3">
          <h3 className="text-sm font-extrabold text-slate-700 dark:text-[#CBD5E1] uppercase tracking-wider border-b border-slate-200 dark:border-[#334155] pb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> GST Summary
          </h3>
          <div className="space-y-2 text-xs font-semibold text-slate-600 dark:text-[#94A3B8]">
            <div className="flex justify-between">
              <span>Total GST Bills:</span>
              <span className="text-slate-900 dark:text-[#F8FAFC] font-bold">{totalGstInvoicesCount} bills</span>
            </div>
            <div className="flex justify-between">
              <span>Taxable Amount (Base Price):</span>
              <span className="text-slate-900 dark:text-[#F8FAFC] font-bold">{fmt(gstTaxableAmount)}</span>
            </div>
            <div className="flex justify-between text-emerald-600 dark:text-[#10B981] font-bold">
              <span>GST Collected (18%):</span>
              <span>{fmt(gstCollected)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 dark:border-[#334155] pt-2 font-bold text-slate-800 dark:text-[#F8FAFC]">
              <span>Total Revenue:</span>
              <span>{fmt(totalGstRevenue)}</span>
            </div>
          </div>
        </div>

        {/* Non-GST Summary */}
        <div className="space-y-3">
          <h3 className="text-sm font-extrabold text-slate-700 dark:text-[#CBD5E1] uppercase tracking-wider border-b border-slate-200 dark:border-[#334155] pb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span> Non GST Summary
          </h3>
          <div className="space-y-2 text-xs font-semibold text-slate-600 dark:text-[#94A3B8]">
            <div className="flex justify-between">
              <span>Total Bills:</span>
              <span className="text-slate-900 dark:text-[#F8FAFC] font-bold">{totalNonGstInvoicesCount} bills</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 dark:border-[#334155] pt-8 font-bold text-slate-800 dark:text-[#F8FAFC]">
              <span>Total Revenue:</span>
              <span className="text-slate-900 dark:text-[#F8FAFC] font-bold">{fmt(totalNonGstRevenue)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Smart Filters Panel */}
      <div className="bg-white/80 dark:bg-[#111827]/80 backdrop-blur-md border border-slate-200/50 dark:border-[#1E293B]/50 p-6 rounded-3xl shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1E293B] pb-3">
          <span className="text-xs font-bold text-slate-700 dark:text-[#CBD5E1] uppercase tracking-wider flex items-center gap-1.5">
            <Filter size={14} className="text-slate-400" /> Filter & Search Operations
          </span>
          {hasActiveFilters && (
            <button onClick={resetFilters}
              className="text-[11px] font-bold text-red-500 hover:text-red-700 transition-colors flex items-center gap-1 bg-red-50 dark:bg-red-950/30 hover:bg-red-100/60 dark:hover:bg-red-900/40 px-3 py-1 rounded-lg">
              <RefreshCw size={10} /> Reset Filters
            </button>
          )}
        </div>

        {/* GST Segregation Tab Filters */}
        <div className="flex flex-wrap gap-2 pb-2">
          <button
            type="button"
            onClick={() => setFilterGstType('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filterGstType === 'all'
                ? 'bg-slate-800 text-white dark:bg-[#F8FAFC] dark:text-[#0F172A] shadow-sm'
                : 'bg-slate-50 dark:bg-[#1E293B] text-slate-650 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#334155]'
            }`}
          >
            📋 All Bills
          </button>
          <button
            type="button"
            onClick={() => setFilterGstType('gst')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filterGstType === 'gst'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-50 dark:bg-[#1E293B] text-slate-650 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#334155]'
            }`}
          >
            🟢 GST Bills
          </button>
          <button
            type="button"
            onClick={() => setFilterGstType('non-gst')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filterGstType === 'non-gst'
                ? 'bg-slate-500 text-white shadow-sm'
                : 'bg-slate-50 dark:bg-[#1E293B] text-slate-650 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#334155]'
            }`}
          >
            ⚪ Non-GST Bills
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search Box */}
          <div className="space-y-1 md:col-span-2">
            <label className="text-[10px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider">Search</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by SKU, customer, or ID…"
                className="w-full pl-9 pr-3 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-slate-50/50 dark:bg-[#1E293B] hover:bg-white dark:hover:bg-[#1E293B]/80 text-slate-900 dark:text-[#F8FAFC] transition-colors" />
            </div>
          </div>

          {/* Payment Status Dropdown */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider">Payment Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-slate-50/50 dark:bg-[#1E293B] hover:bg-white dark:hover:bg-[#1E293B]/80 transition-colors font-medium text-slate-700 dark:text-[#CBD5E1]">
              <option value="all" className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">🟢 All Statuses</option>
              <option value="paid" className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">✅ Fully Paid</option>
              <option value="partial" className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">🟠 Partially Paid</option>
              <option value="pending" className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">🔴 Unpaid / Pending</option>
              <option value="overdue" className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">🚨 Overdue (&gt;10 Days)</option>
            </select>
          </div>

          {/* Customer Dropdown */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider">Customer / Shop</label>
            <select value={filterShop} onChange={(e) => setFilterShop(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-slate-50/50 dark:bg-[#1E293B] hover:bg-white dark:hover:bg-[#1E293B]/80 transition-colors font-medium text-slate-700 dark:text-[#CBD5E1]">
              <option value="all" className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">👥 All Customers</option>
              {Array.from(new Set(sales.map(s => s.buyerName))).map(name => (
                <option key={name} value={name} className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">{name}</option>
              ))}
            </select>
          </div>

          {/* Payment Method Dropdown */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider">Payment Method</label>
            <select value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-slate-50/50 dark:bg-[#1E293B] hover:bg-white dark:hover:bg-[#1E293B]/80 transition-colors font-medium text-slate-700 dark:text-[#CBD5E1]">
              <option value="all" className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">💳 All Methods</option>
              <option value="upi" className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">⚡ UPI Payment</option>
              <option value="cash" className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">💵 Cash Payment</option>
              <option value="none" className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">🛑 No Payments</option>
            </select>
          </div>
        </div>

        {/* Date Range Sub-row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-[#1E293B]">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider">Start Date</label>
            <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-slate-50/50 dark:bg-[#1E293B] hover:bg-white dark:hover:bg-[#1E293B]/80 transition-colors text-slate-650 dark:text-[#CBD5E1]" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider">End Date</label>
            <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-slate-50/50 dark:bg-[#1E293B] hover:bg-white dark:hover:bg-[#1E293B]/80 transition-colors text-slate-650 dark:text-[#CBD5E1]" />
          </div>
          {filtered.length !== sales.length && (
            <div className="flex items-end justify-start pb-2.5 text-xs font-semibold text-indigo-650 dark:text-indigo-400">
              ⚡ Showing {filtered.length} of {sales.length} invoices matching filters.
            </div>
          )}
        </div>
      </div>

      {/* Main List */}
      <div>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 bg-white border border-slate-100 rounded-3xl shadow-sm">
            <Loader2 size={32} className="animate-spin text-red-500" />
            <p className="text-xs font-semibold mt-3 text-slate-500">Querying database sales...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4 bg-white/50 backdrop-blur-sm border border-slate-100 rounded-3xl shadow-sm">
            <div className="w-24 h-24 mb-4 flex items-center justify-center rounded-full bg-slate-50 border border-slate-100 shadow-inner">
              <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Sales Match Your Filters</h3>
            <p className="text-slate-400 text-xs mt-1 max-w-xs">Try clearing some filtering options or refine your query text.</p>
            {hasActiveFilters && (
              <button onClick={resetFilters}
                className="mt-4 px-4 py-2 text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200/60 rounded-xl transition-all border border-slate-200">
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((s) => {
              const status = getSaleStatus(s);
              const isExpanded = !!expandedIds[s.id];
              const itemsList = getOrderGroups(s);
              const itemsCount = s.items ? s.items.length : 1;

              return (
                <div key={s.id} 
                  className={`bg-white dark:bg-[#1E293B] border rounded-3xl shadow-sm overflow-hidden hover:border-slate-300 dark:hover:border-[#334155] transition-all duration-300 ${isExpanded ? 'ring-2 ring-red-500/20 border-red-200 dark:border-red-900/50' : 'border-slate-100/80 dark:border-[#334155]/80'}`}>
                  
                  {/* Collapsed Top Header row */}
                  <div 
                    onClick={() => toggleExpand(s.id)}
                    className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer select-none hover:bg-slate-50/30 dark:hover:bg-[#111827]/30 transition-colors">
                    
                    {/* Left block: Product & Date */}
                    <div className="flex items-start gap-3.5 flex-1 min-w-[280px]">
                      <div className="p-3 bg-slate-50 dark:bg-[#111827] rounded-2xl border border-slate-100 dark:border-[#334155] flex-shrink-0 text-slate-400 dark:text-[#94A3B8] mt-1">
                        <FileText size={20} />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-800 dark:text-[#F8FAFC]">
                            {s.items && s.items.length > 0
                              ? s.items[0].productName + (s.items.length > 1 ? ` (+${s.items.length - 1} products)` : '')
                              : s.productName || 'Unknown Product'}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#111827] text-slate-500 dark:text-[#94A3B8] border border-slate-200/30 dark:border-[#334155]/30">
                            {totalQty(s)} units
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-md bg-red-50 text-[#EF4444] border border-red-200/30 dark:bg-red-950/30 dark:text-[#EF4444] dark:border-red-900/30">
                            Invoice # {s.invoiceNumber || 'N/A'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-[#94A3B8] font-medium flex items-center gap-1">
                          <Calendar size={12} /> Date: {s.date}
                        </p>
                      </div>
                    </div>

                    {/* Center block: Customer details & badges */}
                    <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[240px]">
                      <div className="space-y-1 w-full">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm text-slate-700 dark:text-[#CBD5E1]">{s.buyerName}</span>
                          {renderCustomerBadge(s.buyerName)}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {s.isGSTInvoice ? (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200/50 rounded dark:bg-emerald-950/30 dark:text-[#10B981] dark:border-emerald-900/50 uppercase">
                              GST BILL
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold px-1.5 py-0.2 bg-slate-100 text-slate-500 border border-slate-200/50 rounded dark:bg-[#1E293B] dark:text-[#CBD5E1] dark:border-[#334155]/50 uppercase">
                              NON GST
                            </span>
                          )}
                          {s.transactions && s.transactions.length > 0 ? (
                            s.transactions.map((t, idx) => (
                              <span key={idx} className={`text-[9px] font-bold px-2 py-0.2 rounded border uppercase ${METHOD_COLORS[t.method] || 'bg-slate-100 text-slate-600'}`}>
                                {t.method === 'upi' ? '⚡ upi' : '💵 cash'}
                              </span>
                            ))
                          ) : (
                            <span className="text-[9px] font-bold px-2 py-0.2 rounded border bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/30 dark:text-[#EF4444] dark:border-rose-900/50 uppercase">
                              Unpaid
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right block: Financial status pills & expansion toggle */}
                    <div className="flex items-center justify-between lg:justify-end gap-5 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-50 dark:border-[#334155]">
                      <div className="grid grid-cols-3 gap-4 text-right">
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider">Total</p>
                          <p className="text-xs font-black text-slate-800 dark:text-[#F8FAFC] mt-0.5">{fmt(s.totalAmount)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider">Received</p>
                          <p className="text-xs font-black text-emerald-600 dark:text-[#10B981] mt-0.5">{fmt(s.amountReceived)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider">Pending</p>
                          <p className={`text-xs font-black mt-0.5 ${s.amountLeft > 0 ? 'text-red-505 dark:text-[#EF4444]' : 'text-slate-400 dark:text-[#94A3B8]'}`}>
                            {fmt(s.amountLeft)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${status.colorClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dotClass}`}></span>
                          {status.label}
                        </span>
                        
                        <div className="text-slate-400 dark:text-[#94A3B8] p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#111827] transition-colors">
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded detail section */}
                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-slate-100 dark:border-[#334155] bg-slate-50/30 dark:bg-[#111827]/10 animate-fadeIn">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                        
                        {/* Products list detail */}
                        <div className="bg-white dark:bg-[#1E293B] p-4 rounded-2xl border border-slate-100 dark:border-[#334155] shadow-sm space-y-3">
                          <h4 className="text-xs font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
                            <Store size={12} /> Itemized Order Details
                          </h4>
                          <div className="divide-y divide-slate-50 dark:divide-[#334155] max-h-[250px] overflow-y-auto pr-1">
                            {itemsList.map(([date, items]) => (
                              <div key={date} className="py-2.5 first:pt-0 last:pb-0">
                                <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-md">{date}</span>
                                <div className="mt-2 space-y-1.5">
                                  {items.map((item, i) => (
                                    <div key={i} className="flex justify-between items-center text-xs text-slate-700 dark:text-[#CBD5E1]">
                                      <span className="font-semibold text-slate-900 dark:text-[#F8FAFC]">{item.productName}</span>
                                      <div className="space-x-3 text-slate-500 dark:text-[#94A3B8] font-medium">
                                        <span>
                                          {item.saleType === 'Box' ? `${item.saleQty} Box${item.saleQty > 1 ? 'es' : ''} (${item.qty} pcs)` : `${item.qty} Piece${item.qty > 1 ? 's' : ''}`}
                                        </span>
                                        <span className="text-slate-800 dark:text-[#F8FAFC] font-bold">{fmt(item.amount)}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Payment list detail */}
                        <div className="bg-white dark:bg-[#1E293B] p-4 rounded-2xl border border-slate-100 dark:border-[#334155] shadow-sm space-y-3">
                          <h4 className="text-xs font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
                            <Wallet size={12} /> Transaction Clearing History
                          </h4>
                          <div className="divide-y divide-slate-50 dark:divide-[#334155] max-h-[250px] overflow-y-auto pr-1">
                            {s.transactions && s.transactions.length > 0 ? (
                              s.transactions.map((t, idx) => {
                                const txn = ensureTxnId(t);
                                return (
                                  <div key={txn.id || idx} className="flex justify-between items-center py-2.5 first:pt-0 last:pb-0 text-xs gap-3">
                                    <div className="flex items-center gap-2 flex-wrap flex-1">
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${METHOD_COLORS[txn.method] || 'bg-slate-100 text-slate-600'}`}>
                                        {METHOD_LABELS[txn.method] || txn.method}
                                      </span>
                                      <span className="text-slate-400 dark:text-[#94A3B8] font-medium">{txn.date}</span>
                                      {txn.referenceNumber && (
                                        <span className="text-[9px] text-slate-400 dark:text-[#94A3B8] font-medium bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-[#334155] px-1.5 py-0.2 rounded-md">
                                          Ref: {txn.referenceNumber}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="font-extrabold text-emerald-600 dark:text-[#10B981]">{fmt(txn.amount)}</span>
                                      <div className="flex items-center gap-1">
                                        <button 
                                          onClick={() => handleOpenEditReceipt(s, txn)}
                                          title="Edit Receipt"
                                          className="p-1 rounded-lg text-slate-400 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#111827] hover:text-slate-800 dark:hover:text-[#F8FAFC] transition-colors"
                                        >
                                          <Edit2 size={12} />
                                        </button>
                                        <button 
                                          onClick={() => handleOpenDeleteReceipt(s, txn)}
                                          title="Delete Receipt"
                                          className="p-1 rounded-lg text-slate-400 dark:text-[#94A3B8] hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-[#EF4444] transition-colors"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                        <button 
                                          onClick={() => handleViewReceiptHistory(s, txn.id)}
                                          title="View Receipt History"
                                          className="p-1 rounded-lg text-slate-400 dark:text-[#94A3B8] hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                        >
                                          <Clock size={12} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="py-8 text-center text-slate-400 dark:text-[#94A3B8] text-xs font-medium">
                                🛑 No transaction payments recorded yet for this invoice.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Notes row if any */}
                      {s.notes && (
                        <div className="mt-4 p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100/50 dark:border-amber-900/30 text-amber-800 dark:text-amber-400 rounded-2xl text-xs">
                          <strong>📝 Notes:</strong> {s.notes}
                        </div>
                      )}

                      {/* Action buttons footer */}
                      <div className="flex items-center justify-between border-t border-slate-100 dark:border-[#334155] mt-4 pt-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider">
                            Invoice #: <span className="text-red-505 font-black select-all font-mono">{s.invoiceNumber || 'N/A'}</span>
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider">
                            Invoice ID: <span className="text-slate-500 dark:text-[#CBD5E1] select-all font-mono">{s.id}</span>
                          </span>
                          {s.corrections && s.corrections.length > 0 && (
                            <button
                              onClick={() => handleViewReceiptHistory(s, null)}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-150 dark:border-blue-900/50 shadow-sm hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors w-fit mt-1"
                            >
                              📋 Audit Logs ({s.corrections.length})
                            </button>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-3">
                          <button onClick={() => handlePrintInvoice(s, false)}
                            className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 dark:border-[#334155] rounded-xl text-xs font-semibold text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#111827] transition-colors shadow-sm bg-white dark:bg-[#1E293B]">
                            <Printer size={12} /> Print Invoice
                          </button>
                          <button onClick={() => handlePrintInvoice(s, true)}
                            className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 dark:border-[#334155] rounded-xl text-xs font-semibold text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#111827] transition-colors shadow-sm bg-white dark:bg-[#1E293B]">
                            <Download size={12} /> PDF Export
                          </button>
                          <button onClick={() => { setEditModal(s); setEditNewItems([]); setEditNewDate(today()); setEditNewTxns([]); setEditError(''); setEditGst(s.gst || false); }}
                            className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 dark:border-[#334155] rounded-xl text-xs font-semibold text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#111827] transition-colors shadow-sm bg-white dark:bg-[#1E293B]">
                            <Edit2 size={12} /> Edit Billing
                          </button>
                          <button onClick={() => handleDelete(s.id)} disabled={user?.role === 'EMPLOYEE'} 
                            className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-150 rounded-xl text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm dark:bg-rose-950/30 dark:text-[#EF4444] dark:border-rose-900/50 dark:hover:bg-rose-900/40">
                            <Trash2 size={12} /> Void Invoice
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Sale Modal */}
      {showModal && (
        <Modal title="Log Offline Invoice" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Customer Type / Selection */}
            <div className="space-y-3 bg-slate-50/50 dark:bg-[#1E293B]/20 p-4 border border-slate-200/50 dark:border-[#334155]/50 rounded-2xl">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider">Customer Category</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerCategory('existing_shop');
                      setForm((f) => ({ ...f, buyerName: '' }));
                    }}
                    className={`py-2 px-1.5 rounded-xl border text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${
                      customerCategory === 'existing_shop'
                        ? 'bg-[#EF4444] text-white border-[#EF4444] shadow-sm'
                        : 'bg-white dark:bg-[#1E293B] text-slate-600 dark:text-[#CBD5E1] border-slate-200 dark:border-[#334155] hover:bg-slate-50 dark:hover:bg-[#334155]/50'
                    }`}
                  >
                    🏪 Existing Shop
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerCategory('existing_individual');
                      setForm((f) => ({ ...f, buyerName: '' }));
                    }}
                    className={`py-2 px-1.5 rounded-xl border text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${
                      customerCategory === 'existing_individual'
                        ? 'bg-[#EF4444] text-white border-[#EF4444] shadow-sm'
                        : 'bg-white dark:bg-[#1E293B] text-slate-600 dark:text-[#CBD5E1] border-slate-200 dark:border-[#334155] hover:bg-slate-50 dark:hover:bg-[#334155]/50'
                    }`}
                  >
                    👤 Existing Individual
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerCategory('walk-in');
                      setForm((f) => ({ ...f, buyerName: 'Walk-in Customer' }));
                    }}
                    className={`py-2 px-1.5 rounded-xl border text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${
                      customerCategory === 'walk-in'
                        ? 'bg-[#EF4444] text-white border-[#EF4444] shadow-sm'
                        : 'bg-white dark:bg-[#1E293B] text-slate-600 dark:text-[#CBD5E1] border-slate-200 dark:border-[#334155] hover:bg-slate-50 dark:hover:bg-[#334155]/50'
                    }`}
                  >
                    👤 Walk-in
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerCategory('new_shop');
                      setForm((f) => ({ ...f, buyerName: '' }));
                    }}
                    className={`py-2 px-1.5 rounded-xl border text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${
                      customerCategory === 'new_shop'
                        ? 'bg-[#EF4444] text-white border-[#EF4444] shadow-sm'
                        : 'bg-white dark:bg-[#1E293B] text-slate-600 dark:text-[#CBD5E1] border-slate-200 dark:border-[#334155] hover:bg-slate-50 dark:hover:bg-[#334155]/50'
                    }`}
                  >
                    🏪 + New Shop
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerCategory('new_individual');
                      setForm((f) => ({ ...f, buyerName: '' }));
                    }}
                    className={`py-2 px-1.5 rounded-xl border text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${
                      customerCategory === 'new_individual'
                        ? 'bg-[#EF4444] text-white border-[#EF4444] shadow-sm'
                        : 'bg-white dark:bg-[#1E293B] text-slate-600 dark:text-[#CBD5E1] border-slate-200 dark:border-[#334155] hover:bg-slate-50 dark:hover:bg-[#334155]/50'
                    }`}
                  >
                    👤 + New Individual
                  </button>
                </div>
              </div>

              {customerCategory === 'existing_shop' && (
                <div className="space-y-1 pt-1">
                  <label className="block text-xs font-bold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide">Select Registered Shop *</label>
                  <select 
                    required={customerCategory === 'existing_shop'} 
                    value={form.buyerName} 
                    onChange={(e) => setForm((f) => ({ ...f, buyerName: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 font-medium text-slate-700 dark:text-[#CBD5E1] bg-white dark:bg-[#1E293B]"
                  >
                    <option value="" className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">Select customer shop…</option>
                    {shops.filter((s) => s.type === 'shop').map((s) => (
                      <option key={s.id} value={s.name} className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">{s.name}{s.mobile ? ` — ${s.mobile}` : ''}</option>
                    ))}
                  </select>
                </div>
              )}

              {customerCategory === 'existing_individual' && (
                <div className="space-y-1 pt-1">
                  <label className="block text-xs font-bold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide">Select Registered Individual *</label>
                  <select 
                    required={customerCategory === 'existing_individual'} 
                    value={form.buyerName} 
                    onChange={(e) => setForm((f) => ({ ...f, buyerName: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 font-medium text-slate-700 dark:text-[#CBD5E1] bg-white dark:bg-[#1E293B]"
                  >
                    <option value="" className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">Select registered individual…</option>
                    {shops.filter((s) => s.type === 'individual' || s.type === 'walk-in').map((s) => (
                      <option key={s.id} value={s.name} className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">{s.name}{s.mobile ? ` — ${s.mobile}` : ''}</option>
                    ))}
                  </select>
                </div>
              )}

              {customerCategory === 'walk-in' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide">Customer Name (Optional)</label>
                    <input 
                      type="text"
                      value={walkInName}
                      onChange={(e) => setWalkInName(e.target.value)}
                      placeholder="e.g. Ram Kumar"
                      className="w-full px-3 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-[#1E293B] text-slate-800 dark:text-[#F8FAFC]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide">Mobile Number (Optional)</label>
                    <input 
                      type="text"
                      value={walkInMobile}
                      onChange={(e) => setWalkInMobile(e.target.value)}
                      placeholder="e.g. 9988776655"
                      className="w-full px-3 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-[#1E293B] text-slate-800 dark:text-[#F8FAFC]"
                    />
                  </div>
                </div>
              )}

              {customerCategory === 'new_shop' && (
                <div className="space-y-3 pt-1">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide">Shop Name *</label>
                    <input 
                      type="text"
                      required={customerCategory === 'new_shop'}
                      value={newShopName}
                      onChange={(e) => setNewShopName(e.target.value)}
                      placeholder="e.g. Sharma Electronics"
                      className="w-full px-3 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-[#1E293B] text-slate-800 dark:text-[#F8FAFC]"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide">Owner Name</label>
                      <input 
                        type="text"
                        value={newShopOwner}
                        onChange={(e) => setNewShopOwner(e.target.value)}
                        placeholder="e.g. Ramesh Sharma"
                        className="w-full px-3 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-[#1E293B] text-slate-850 dark:text-[#F8FAFC]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide">Mobile Number</label>
                      <input 
                        type="text"
                        value={newShopMobile}
                        onChange={(e) => setNewShopMobile(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="w-full px-3 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-[#1E293B] text-slate-850 dark:text-[#F8FAFC]"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide">Shop Address</label>
                    <textarea 
                      rows={2}
                      value={newShopAddress}
                      onChange={(e) => setNewShopAddress(e.target.value)}
                      placeholder="e.g. 12, Market Road, Delhi"
                      className="w-full px-3 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-[#1E293B] text-slate-850 dark:text-[#F8FAFC] resize-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide">GST Number (Optional)</label>
                    <input 
                      type="text"
                      value={newShopGst}
                      onChange={(e) => setNewShopGst(e.target.value)}
                      placeholder="e.g. 07AAAAA1111A1Z1"
                      className="w-full px-3 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-[#1E293B] text-slate-850 dark:text-[#F8FAFC]"
                    />
                  </div>
                </div>
              )}

              {customerCategory === 'new_individual' && (
                <div className="space-y-3 pt-1">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide">Customer Name *</label>
                    <input 
                      type="text"
                      required={customerCategory === 'new_individual'}
                      value={newIndName}
                      onChange={(e) => setNewIndName(e.target.value)}
                      placeholder="e.g. Ramesh Kumar"
                      className="w-full px-3 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-[#1E293B] text-slate-850 dark:text-[#F8FAFC]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide">Mobile Number</label>
                    <input 
                      type="text"
                      value={newIndMobile}
                      onChange={(e) => setNewIndMobile(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full px-3 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-[#1E293B] text-slate-850 dark:text-[#F8FAFC]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide">Address (Optional)</label>
                    <textarea 
                      rows={2}
                      value={newIndAddress}
                      onChange={(e) => setNewIndAddress(e.target.value)}
                      placeholder="e.g. 12, Market Road, Delhi"
                      className="w-full px-3 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-[#1E293B] text-slate-850 dark:text-[#F8FAFC] resize-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Orders */}
            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider">Orders List</label>
              {form.orders.map((order, oi) => (
                <div key={oi} className="border border-slate-200/80 dark:border-[#334155]/80 rounded-2xl bg-slate-50/20 dark:bg-[#1E293B]/20 relative">
                  <div className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-[#111827] px-4 py-3 border-b border-slate-200/50 dark:border-b-[#334155] rounded-t-2xl">
                    <span className="text-xs font-extrabold text-slate-500 dark:text-[#CBD5E1]">Order {oi + 1}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-400 dark:text-[#94A3B8]">Date:</span>
                      <input type="date" value={order.date} onChange={(e) => setOrderDate(oi, e.target.value)}
                        className="px-2 py-1.5 border border-slate-200 dark:border-[#334155] rounded-lg text-xs bg-white dark:bg-[#1E293B] focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-650 dark:text-[#CBD5E1] font-medium" />
                      {form.orders.length > 1 && (
                        <button type="button" onClick={() => removeOrder(oi)}
                          className="p-1.5 rounded-lg text-slate-400 dark:text-[#94A3B8] hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-500 dark:hover:text-[#EF4444] transition-colors">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="p-4 space-y-3 bg-white dark:bg-[#1E293B]">
                    {order.items.map((item, ii) => (
                      <ItemRow key={ii} item={item} products={products}
                        onProductChange={(v) => handleItemProductChange(oi, ii, v)}
                        onQtyChange={(v) => handleItemQtyChange(oi, ii, v)}
                        onSaleTypeChange={(v) => handleItemSaleTypeChange(oi, ii, v)}
                        onAmountChange={(v) => handleItemAmountChange(oi, ii, v)}
                        onRemove={() => removeItemFromOrder(oi, ii)}
                        showRemove={order.items.length > 1}
                        isGst={order.gst}
                        loading={loading}
                      />
                    ))}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50 dark:border-[#334155]">
                      <button type="button" onClick={() => addItemToOrder(oi)}
                        className="flex items-center gap-1.5 text-red-650 dark:text-[#EF4444] hover:text-red-700 dark:hover:text-red-500 text-xs font-bold transition-colors">
                        <PlusCircle size={14} /> Add Product Row
                      </button>
                      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                        <input
                           type="checkbox"
                           checked={order.gst || false}
                           onChange={() => toggleOrderGst(oi)}
                           className="sr-only"
                        />
                        <div className={`relative w-8 h-4.5 rounded-full transition-colors duration-200 ${order.gst ? 'bg-[#EF4444]' : 'bg-slate-200 dark:bg-[#334155]'}`}>
                          <div className={`absolute top-[2px] left-[2px] bg-white border border-slate-300 dark:border-slate-600 rounded-full h-3.5 w-3.5 transition-transform duration-200 ${order.gst ? 'translate-x-3.5' : 'translate-x-0'}`} />
                        </div>
                        <span className="text-xs font-bold text-slate-500 dark:text-[#CBD5E1]">Apply GST (18%)</span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" onClick={addOrder}
                className="flex items-center justify-center gap-2 w-full py-3 border border-dashed border-red-200 dark:border-red-900/50 hover:border-red-500 dark:hover:border-[#EF4444] rounded-2xl text-xs font-bold text-[#EF4444] hover:bg-red-50/30 dark:hover:bg-red-950/20 transition-all">
                <PlusCircle size={15} /> Add Another Order Date Group
              </button>
            </div>

            {/* Total */}
            <div className="bg-slate-50 dark:bg-[#1E293B] border border-slate-100 dark:border-[#334155] rounded-2xl px-5 py-3.5 flex justify-between text-sm font-bold text-slate-700 dark:text-[#CBD5E1] shadow-inner">
              <span className="uppercase text-slate-400 dark:text-[#94A3B8] text-xs font-bold tracking-wider">Grand Total Amount</span>
              <span className="text-base text-slate-800 dark:text-[#F8FAFC] font-extrabold">{fmt(computedTotal)}</span>
            </div>

            {/* Transactions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-slate-50 dark:border-[#334155] pb-2">
                <label className="text-xs font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider">Payments Received</label>
                <button type="button" onClick={addTxn}
                  className="flex items-center gap-1 text-[#EF4444] hover:text-red-500 text-xs font-bold transition-colors">
                  <PlusCircle size={14} /> Add Transaction
                </button>
              </div>
              {form.transactions.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-slate-200 dark:border-[#334155] rounded-2xl bg-slate-50/50 dark:bg-[#1E293B]/20 text-xs text-slate-400 dark:text-[#CBD5E1] font-medium">
                  💳 No payments logged yet. Invoice defaults to fully pending.
                </div>
              ) : (
                <div className="space-y-3">
                  {form.transactions.map((txn, ti) => (
                    <TxnRow key={ti} txn={txn} onChange={(k, v) => updateTxn(ti, k, v)} onRemove={() => removeTxn(ti)} />
                  ))}
                </div>
              )}
              {form.transactions.length > 0 && (
                <div className={`mt-3 flex justify-between px-5 py-3.5 rounded-2xl text-sm font-semibold shadow-sm ${amountLeft > 0 ? 'bg-amber-50/70 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 border border-amber-100/50 dark:border-amber-900/30' : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-[#10B981] border border-emerald-100 dark:border-emerald-900/30'}`}>
                  <span>Cleared: {fmt(totalReceived)}</span>
                  <span>Pending Dues: {fmt(amountLeft)}</span>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider">Remarks / Notes</label>
              <textarea rows={2.5} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none bg-white dark:bg-[#1E293B] text-slate-900 dark:text-[#F8FAFC]" placeholder="Optional notes…" />
            </div>

            {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 px-3 py-2.5 rounded-xl border border-red-200 dark:border-red-900/50">{error}</p>}

            <div className="flex gap-4 pt-3 border-t border-slate-100 dark:border-[#334155]">
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 border border-slate-200 dark:border-[#334155] rounded-2xl text-sm font-bold text-slate-500 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#1E293B] transition-colors">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 py-3 bg-[#EF4444] hover:bg-red-650 disabled:opacity-60 text-white text-sm font-semibold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md shadow-red-500/10">
                {saving && <Loader2 size={16} className="animate-spin" />} Submit Invoice
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Sale Modal */}
      {editModal && (() => {
        const newItemsTotal = editNewItems.reduce((s, i) => s + (Number(i.amount) || 0), 0);
        const updatedTotal = editModal.totalAmount + newItemsTotal;
        const existingReceived = editModal.amountReceived || 0;
        const newTxnsTotal = editNewTxns.reduce((s, t) => {
          if (t.method === 'cheque' && t.chequeStatus !== 'cleared') {
            return s;
          }
          return s + (Number(t.amount) || 0);
        }, 0);
        const updatedReceived = existingReceived + newTxnsTotal;
        const updatedPending = updatedTotal - updatedReceived;
        return (
          <Modal title={`Edit Invoice — ${editModal.buyerName}`} onClose={() => { setEditModal(null); setEditNewItems([]); setEditNewDate(''); setEditNewTxns([]); setEditGst(false); }}>
            <form onSubmit={handleUpdatePayment} className="space-y-5">

              {/* Existing orders (read-only) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider">Current Orders</label>
                <div className="border border-slate-200 dark:border-[#334155] rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-[#334155] bg-white dark:bg-[#1E293B]">
                  {(() => {
                    const src = editModal.items || [{ productName: editModal.productName, qty: editModal.qty, amount: editModal.totalAmount, date: editModal.date }];
                    const groups = {};
                    for (const item of src) {
                      const d = item.date || editModal.date || '—';
                      if (!groups[d]) groups[d] = [];
                      groups[d].push(item);
                    }
                    return Object.entries(groups).map(([date, items], gi) => (
                      <div key={date}>
                        <div className="bg-slate-50/70 dark:bg-[#111827]/70 px-4 py-2 text-xs font-bold text-slate-500 dark:text-[#CBD5E1]">{date}</div>
                        {items.map((item, i) => (
                          <div key={i} className="flex items-center justify-between px-4 py-3 text-xs border-t border-slate-50 dark:border-[#334155]">
                            <span className="text-slate-800 dark:text-[#F8FAFC] font-bold">{item.productName}</span>
                            <div className="flex items-center gap-3 text-slate-500 dark:text-[#94A3B8]">
                              <span>{item.saleType === 'Box' ? `${item.saleQty} Box${item.saleQty > 1 ? 'es' : ''} (${item.qty} pcs)` : `${item.qty} Piece${item.qty > 1 ? 's' : ''}`}</span>
                              <span className="font-extrabold text-slate-800 dark:text-[#F8FAFC] flex items-center gap-1.5">
                                {fmt(item.amount)}
                                {editGst && <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-green-50 dark:bg-emerald-950/30 text-green-700 dark:text-[#10B981] border border-green-200 dark:border-emerald-900/50">GST</span>}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Add new order */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider">Add Products to Billing</label>
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editGst}
                      onChange={toggleEditGst}
                      className="sr-only"
                    />
                    <div className={`relative w-8 h-4.5 rounded-full transition-colors duration-200 ${editGst ? 'bg-red-650' : 'bg-slate-200 dark:bg-[#334155]'}`}>
                      <div className={`absolute top-[2px] left-[2px] bg-white border border-slate-300 dark:border-slate-600 rounded-full h-3.5 w-3.5 transition-transform duration-200 ${editGst ? 'translate-x-3.5' : 'translate-x-0'}`} />
                    </div>
                    <span className="text-xs font-bold text-slate-500 dark:text-[#CBD5E1]">Apply GST (18%)</span>
                  </label>
                </div>
                
                {editNewItems.length === 0 ? (
                  <button type="button" onClick={addEditItem}
                    className="flex items-center justify-center gap-2 w-full py-3.5 border border-dashed border-red-200 dark:border-red-900/50 hover:border-red-500 dark:hover:border-[#EF4444] rounded-2xl text-xs font-bold text-[#EF4444] hover:bg-red-50/20 dark:hover:bg-red-950/20 transition-all">
                    <PlusCircle size={15} /> Add Products to Current Invoice
                  </button>
                ) : (
                  <div className="space-y-3 bg-slate-50/30 dark:bg-[#1E293B]/20 p-4 border border-slate-200/50 dark:border-[#334155]/50 rounded-2xl">
                    {editNewItems.map((item, idx) => {
                      const selProd = products.find((p) => p.id === item.productId);
                      return (
                        <div key={idx} className="border border-red-100 dark:border-red-900/30 rounded-2xl p-4 space-y-3 bg-white dark:bg-[#1E293B] shadow-sm">
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <div className="flex-1">
                              <SearchableSelect
                                value={item.productId}
                                onChange={(val) => handleEditItemProductChange(idx, val)}
                                placeholder="Search or Select Product..."
                                options={products.map((p) => ({ value: p.id, label: p.name, product: p }))}
                                filterOption={filterProductOption}
                                renderOption={renderProductOption}
                                loading={loading}
                                className="w-full"
                              />
                            </div>
                            <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                              <select
                                value={item.saleType || 'Piece'}
                                onChange={(e) => handleEditItemSaleTypeChange(idx, e.target.value)}
                                className="w-full sm:w-28 px-3 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-[#111827] font-medium text-slate-700 dark:text-[#CBD5E1]"
                              >
                                <option value="Piece">Piece</option>
                                {selProd?.piecesPerBox > 0 && <option value="Box">Box</option>}
                              </select>

                              <input type="number" min="1" max={item.saleType === 'Box' ? Math.floor(selProd?.availableQty / (selProd?.piecesPerBox || 1)) : (selProd?.availableQty || 9999)} value={item.qty}
                                onChange={(e) => handleEditItemQtyChange(idx, e.target.value)}
                                className="w-full sm:w-20 px-3 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 text-center bg-white dark:bg-[#111827] text-slate-900 dark:text-[#F8FAFC]" placeholder={item.saleType === 'Box' ? 'Boxes' : 'Qty'} />

                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 dark:text-[#94A3B8]">₹</span>
                                <input type="number" step="0.01" min="0" value={item.amount}
                                  onChange={(e) => handleEditItemAmountChange(idx, e.target.value)}
                                  className="w-full sm:w-28 pl-7 pr-3 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#EF4444] bg-white dark:bg-[#111827] text-slate-900 dark:text-[#F8FAFC]" placeholder="Amt" />
                              </div>
                              <button type="button" onClick={() => removeEditItem(idx)}
                                className="p-2 rounded-xl text-slate-400 dark:text-[#94A3B8] hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-500 dark:hover:text-[#EF4444] transition-colors flex-shrink-0">
                                <X size={15} />
                              </button>
                            </div>
                          </div>
                          {selProd && (
                            <p className="text-[11px] text-slate-400 dark:text-[#94A3B8] flex items-center justify-between mt-1">
                              <span>
                                📍 Stock: <span className="font-semibold text-slate-650 dark:text-[#CBD5E1]">{selProd.availableQty} units {selProd.piecesPerBox > 0 && `(${Math.floor(selProd.availableQty / selProd.piecesPerBox)} boxes)`}</span>
                                &nbsp;· {item.saleType === 'Box' ? 'Box Price:' : 'Base Price:'} <span className="font-semibold text-rose-600 dark:text-[#EF4444]">₹{typeof getEffectiveOfflinePrice === 'function' ? getEffectiveOfflinePrice(selProd, item.saleType) : (selProd?.boxSellingPrice || selProd?.pieceSellingPrice || selProd?.offlinePrice || selProd?.unitPrice || 0)}</span>
                                {item.saleType === 'Box' && (
                                  <span className="font-semibold text-slate-500"> (= {Number(item.qty || 0) * (selProd.piecesPerBox || 1)} pcs)</span>
                                )}
                              </span>
                              {item.amount && (
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${editGst ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-[#10B981] border border-emerald-200 dark:border-emerald-900/50' : 'bg-slate-100 dark:bg-[#111827] text-slate-500 dark:text-[#CBD5E1] border border-slate-200 dark:border-[#334155]'}`}>
                                  {editGst ? 'GST (18%) Included' : 'Excl. GST'}
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                      );
                    })}
                    
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
                      <label className="text-xs font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider whitespace-nowrap">Group Date</label>
                      <input type="date" value={editNewDate} onChange={(e) => setEditNewDate(e.target.value)}
                        className="flex-1 px-3 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-sm bg-white dark:bg-[#111827] focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-650 dark:text-[#CBD5E1] font-medium" />
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-200/50 dark:border-[#334155]/50">
                      <button type="button" onClick={addEditItem}
                        className="flex items-center gap-1.5 text-[#EF4444] hover:text-red-500 text-xs font-bold transition-colors">
                        <PlusCircle size={14} /> Add Another Product Line
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Updated total */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 flex justify-between text-sm font-bold text-slate-700 shadow-inner">
                <span className="uppercase text-slate-400 text-xs tracking-wider">Recalculated Invoice Total</span>
                <span className="text-base text-slate-800 font-extrabold">{fmt(updatedTotal)}</span>
              </div>

              {/* Existing transactions (read-only) */}
              {(editModal.transactions || []).length > 0 && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Receipts Collected</label>
                  <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden bg-white shadow-sm">
                    {editModal.transactions.map((t, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-3 text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${METHOD_COLORS[t.method] || 'bg-slate-100 text-slate-600'}`}>{t.method}</span>
                          <span className="text-slate-400 font-medium">{t.date}</span>
                        </div>
                        <span className="font-extrabold text-slate-700">{fmt(t.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add new transactions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Log New Payment Receipt</label>
                  <button type="button" onClick={addEditTxn}
                    className="flex items-center gap-1 text-red-600 hover:text-red-700 text-xs font-bold transition-colors">
                    <PlusCircle size={14} /> Add Receipt
                  </button>
                </div>
                {editNewTxns.length > 0 && (
                  <div className="space-y-3 bg-slate-50/50 p-4 border border-slate-200/50 rounded-2xl">
                    {editNewTxns.map((txn, ti) => (
                      <TxnRow key={ti} txn={txn} onChange={(k, v) => updateEditTxn(ti, k, v)} onRemove={() => removeEditTxn(ti)} />
                    ))}
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className={`flex justify-between px-5 py-4 rounded-2xl text-sm font-semibold border ${updatedPending > 0 ? 'bg-amber-50/80 text-amber-800 border-amber-100/50' : 'bg-emerald-50 text-emerald-800 border-emerald-100'}`}>
                <span>Updated Payments: {fmt(updatedReceived)}</span>
                <span>Remaining Dues: {fmt(updatedPending)}</span>
              </div>

              {/* Admin Receipt Audit History */}
              {(user?.role === 'ADMIN' || user?.role === 'admin' || user?.username === 'admin') && (
                <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-[#334155]">
                  <h4 className="text-xs font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider flex items-center gap-1.5">
                    <Clock size={12} className="text-blue-500" /> Receipt Audit Trail (Admin Only)
                  </h4>
                  
                  {!editModal.corrections || editModal.corrections.length === 0 ? (
                    <div className="text-center py-4 bg-slate-50 dark:bg-[#1E293B] border border-dashed border-slate-200 dark:border-[#334155] rounded-2xl text-slate-400 dark:text-[#CBD5E1] text-[11px] font-semibold">
                      📋 No corrections or deletion logs recorded yet.
                    </div>
                  ) : (
                    <div className="border border-slate-200 dark:border-[#334155] rounded-2xl overflow-hidden text-xs max-h-[180px] overflow-y-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-[#111827] text-slate-500 dark:text-[#CBD5E1] font-extrabold uppercase text-[9px] border-b dark:border-[#334155] sticky top-0">
                          <tr>
                            <th className="px-3 py-2">Timestamp</th>
                            <th className="px-3 py-2">Changed By</th>
                            <th className="px-3 py-2">Reason</th>
                            <th className="px-3 py-2 text-right">Summary</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-[#334155] font-medium text-slate-600 dark:text-[#CBD5E1] bg-white dark:bg-[#1E293B] text-[10px]">
                          {editModal.corrections.map((log, li) => (
                            <tr key={li} className="hover:bg-slate-50/50 dark:hover:bg-[#111827]/50">
                              <td className="px-3 py-2 whitespace-nowrap text-slate-400 dark:text-[#94A3B8]">{log.timestamp}</td>
                              <td className="px-3 py-2 text-slate-700 dark:text-[#F8FAFC] font-bold">{log.changedBy}</td>
                              <td className="px-3 py-2">{log.reason}</td>
                              <td className="px-3 py-2 text-right">
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${log.type === 'delete' ? 'bg-red-50 dark:bg-rose-950/30 text-red-600 dark:text-[#EF4444]' : 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400'}`}>
                                  {log.type === 'delete' ? 'Deleted' : 'Edited'}
                                </span>
                                <div className="text-[9px] text-slate-400 dark:text-[#94A3B8] mt-0.5 truncate max-w-[120px]" title={`Prev: ${log.previous}`}>
                                  {log.previous}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {editError && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 px-3 py-2.5 rounded-xl border border-red-200 dark:border-red-900/50">{editError}</p>}

              <div className="flex gap-4 pt-3 border-t border-slate-100 dark:border-[#334155]">
                <button type="button" onClick={() => { setEditModal(null); setEditNewItems([]); setEditNewDate(''); setEditNewTxns([]); setEditGst(false); }}
                  className="flex-1 py-3 border border-slate-200 dark:border-[#334155] rounded-2xl text-sm font-bold text-slate-500 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#1E293B] transition-colors">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 disabled:opacity-60 text-white text-sm font-semibold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md shadow-red-500/10">
                  {saving && <Loader2 size={16} className="animate-spin" />} Save Billing Changes
                </button>
              </div>
            </form>
          </Modal>
        );
      })()}
      {/* Edit Receipt Modal */}
      {receiptToEdit && (
        <Modal title="Edit Payment Receipt" onClose={() => setReceiptToEdit(null)}>
          <form onSubmit={handleSaveEditReceipt} className="space-y-4">
            <div className="flex flex-col gap-3.5 text-xs">
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide">Payment Method *</label>
                <select 
                  required
                  value={editReceiptForm.method} 
                  onChange={(e) => setEditReceiptForm(f => ({ ...f, method: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-[#1E293B] font-medium text-slate-700 dark:text-[#CBD5E1]"
                >
                  <option value="cash" className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">💵 Cash</option>
                  <option value="upi" className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">⚡ UPI</option>
                  <option value="bank_transfer" className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">🏦 Bank Transfer</option>
                  <option value="cheque" className="dark:bg-[#1E293B] dark:text-[#F8FAFC]">✍️ Cheque</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide">Amount *</label>
                <input 
                  type="number" 
                  step="0.01"
                  min="0" 
                  required 
                  value={editReceiptForm.amount} 
                  onChange={(e) => setEditReceiptForm(f => ({ ...f, amount: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-[#1E293B] text-slate-900 dark:text-[#F8FAFC]" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide">Payment Date *</label>
                <input 
                  type="date" 
                  required 
                  value={editReceiptForm.date} 
                  onChange={(e) => setEditReceiptForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-[#1E293B] text-slate-900 dark:text-[#F8FAFC]" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide">Reference Number (Optional)</label>
                <input 
                  type="text" 
                  value={editReceiptForm.referenceNumber} 
                  onChange={(e) => setEditReceiptForm(f => ({ ...f, referenceNumber: e.target.value }))}
                  placeholder="e.g. UPI Transaction ID or Cheque No."
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-[#1E293B] text-slate-900 dark:text-[#F8FAFC]" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide">Notes (Optional)</label>
                <textarea 
                  rows={2} 
                  value={editReceiptForm.notes} 
                  onChange={(e) => setEditReceiptForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-[#1E293B] text-slate-900 dark:text-[#F8FAFC] resize-none" 
                />
              </div>

              {/* Mandatory Correction Reason */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-[#334155]">
                <label className="block font-bold text-red-655 dark:text-[#EF4444] uppercase tracking-wide">Correction Reason *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-slate-650 dark:text-[#CBD5E1]">
                  {[
                    'Wrong Payment Method',
                    'Wrong Amount',
                    'Wrong Date',
                    'Duplicate Entry',
                    'Data Entry Mistake',
                    'Customer Request',
                    'Other'
                  ].map((r) => (
                    <label key={r} className="flex items-center gap-2 cursor-pointer p-2 border border-slate-150 dark:border-[#334155] rounded-xl hover:bg-slate-50 dark:hover:bg-[#1E293B]">
                      <input 
                        type="radio" 
                        name="correctionReason" 
                        value={r} 
                        checked={correctionReason === r} 
                        onChange={() => {
                          setCorrectionReason(r);
                          if (r !== 'Other') setCorrectionNotes('');
                        }}
                        className="text-red-600 focus:ring-red-500" 
                      />
                      {r}
                    </label>
                  ))}
                </div>
              </div>

              {correctionReason === 'Other' && (
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide">Correction Notes *</label>
                  <textarea 
                    rows={2} 
                    required 
                    value={correctionNotes} 
                    onChange={(e) => setCorrectionNotes(e.target.value)}
                    placeholder="Provide detailed correction details..."
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none bg-white dark:bg-[#1E293B] text-slate-900 dark:text-[#F8FAFC]" 
                  />
                </div>
              )}
            </div>

            {error && <p className="text-sm text-red-505 dark:text-[#EF4444] bg-red-50 dark:bg-rose-950/30 px-3 py-2 rounded-xl border border-red-200 dark:border-rose-900/50">{error}</p>}
            
            <div className="flex gap-4 pt-3 border-t border-slate-100 dark:border-[#334155]">
              <button type="button" onClick={() => setReceiptToEdit(null)} className="flex-1 py-3 border border-slate-200 dark:border-[#334155] rounded-xl text-sm font-semibold text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#1E293B] transition-colors">Cancel</button>
              <button type="submit" disabled={saving || !correctionReason || (correctionReason === 'Other' && !correctionNotes.trim())} className="flex-1 py-3 bg-red-650 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2">
                {saving && <Loader2 size={16} className="animate-spin" />} Save Correction
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Receipt Modal */}
      {receiptToDelete && (
        <Modal title="Delete Payment Receipt?" onClose={() => setReceiptToDelete(null)}>
          <div className="space-y-4">
            <div className="p-3 bg-red-50 dark:bg-rose-950/30 border border-red-100 dark:border-rose-900/50 text-red-700 dark:text-[#EF4444] rounded-2xl text-xs font-semibold leading-relaxed">
              ⚠️ <strong>Warning:</strong> This action will affect dues and payment calculations. The invoice's outstanding amount will increase by <strong>{fmt(receiptToDelete.amount)}</strong>.
            </div>

            <form onSubmit={handleSaveDeleteReceipt} className="space-y-4">
              <div className="flex flex-col gap-3.5 text-xs">
                <div className="space-y-2">
                  <label className="block font-bold text-slate-505 dark:text-[#CBD5E1] uppercase tracking-wide">Select Reason for Deletion *</label>
                  <div className="grid grid-cols-1 gap-2 font-semibold text-slate-650 dark:text-[#CBD5E1]">
                    {[
                      'Duplicate Entry',
                      'Wrong Receipt',
                      'Testing Entry',
                      'Other'
                    ].map((r) => (
                      <label key={r} className="flex items-center gap-2 cursor-pointer p-2 border border-slate-150 dark:border-[#334155] rounded-xl hover:bg-slate-50 dark:hover:bg-[#1E293B]">
                        <input 
                          type="radio" 
                          name="deleteReason" 
                          value={r} 
                          checked={deleteReason === r} 
                          onChange={() => {
                            setDeleteReason(r);
                            if (r !== 'Other') setDeleteNotes('');
                          }}
                          className="text-red-600 focus:ring-red-500" 
                        />
                        {r}
                      </label>
                    ))}
                  </div>
                </div>

                {deleteReason === 'Other' && (
                  <div className="space-y-1.5">
                    <label className="block font-bold text-slate-505 dark:text-[#CBD5E1] uppercase tracking-wide">Deletion Notes *</label>
                    <textarea 
                      rows={2} 
                      required 
                      value={deleteNotes} 
                      onChange={(e) => setDeleteNotes(e.target.value)}
                      placeholder="Provide detailed deletion notes..."
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-[#1E293B] text-slate-900 dark:text-[#F8FAFC] resize-none" 
                    />
                  </div>
                )}
              </div>

              {error && <p className="text-sm text-red-500 dark:text-[#EF4444] bg-red-50 dark:bg-rose-950/30 px-3 py-2 rounded-xl border border-red-200 dark:border-rose-900/50">{error}</p>}
              
              <div className="flex gap-4 pt-3 border-t border-slate-100 dark:border-[#334155]">
                <button type="button" onClick={() => setReceiptToDelete(null)} className="flex-1 py-3 border border-slate-200 dark:border-[#334155] rounded-xl text-sm font-semibold text-slate-650 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#1E293B] transition-colors">Cancel</button>
                <button type="submit" disabled={saving || !deleteReason || (deleteReason === 'Other' && !deleteNotes.trim())} className="flex-1 py-3 bg-red-650 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2">
                  {saving && <Loader2 size={16} className="animate-spin" />} Confirm Deletion
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Receipt History / Audit Modal */}
      {viewReceiptHistorySale && (
        <Modal title="Payment Receipt History & Audit Timeline" onClose={() => setViewReceiptHistorySale(null)} maxWidth="max-w-lg">
          <div className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-[#94A3B8] font-medium">
              Audit log trace for invoice: <span className="font-bold text-slate-800 dark:text-[#F8FAFC]">{viewReceiptHistorySale.buyerName}</span> (ID: {viewReceiptHistorySale.id.slice(0, 8)})
            </p>

            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
              {!viewReceiptHistorySale.corrections || viewReceiptHistorySale.corrections.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 dark:bg-[#1E293B] border border-dashed border-slate-200 dark:border-[#334155] text-slate-400 dark:text-[#CBD5E1] text-xs font-semibold rounded-2xl">
                  📋 No receipt corrections or audit trail logged yet for this invoice.
                </div>
              ) : (
                <div className="relative border-l-2 border-slate-150 dark:border-[#334155] pl-4 ml-2 space-y-6 py-2">
                  {viewReceiptHistorySale.corrections.map((log, idx) => {
                    const isDelete = log.type === 'delete';
                    return (
                      <div key={idx} className="relative space-y-1.5">
                        {/* Dot icon */}
                        <span className={`absolute -left-[23px] top-1 w-2.5 h-2.5 rounded-full ring-4 ring-white dark:ring-[#111827] ${isDelete ? 'bg-rose-500' : 'bg-blue-500'}`} />
                        
                        <div className="flex items-center justify-between gap-3 text-[10px] text-slate-400 dark:text-[#94A3B8] font-semibold">
                          <span>{log.timestamp}</span>
                          <span className="bg-slate-100 dark:bg-[#1E293B] text-slate-600 dark:text-[#CBD5E1] px-2 py-0.5 rounded-md">By: {log.changedBy}</span>
                        </div>
                        
                        <div className="bg-slate-50/70 dark:bg-[#1E293B]/50 border border-slate-150 dark:border-[#334155] rounded-2xl p-3.5 text-xs text-slate-700 dark:text-[#CBD5E1] font-medium leading-relaxed space-y-2">
                          <p className="font-extrabold text-slate-800 dark:text-[#F8FAFC] text-[11px]">
                            {isDelete ? '❌ Receipt Deletion Log' : '✏️ Receipt Edit Log'}
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
                            <div>
                              <span className="text-slate-400 dark:text-[#94A3B8] block uppercase font-bold text-[8px]">Reason</span>
                              <span className="font-bold text-slate-850 dark:text-[#F8FAFC]">{log.reason}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 dark:text-[#94A3B8] block uppercase font-bold text-[8px]">Operator</span>
                              <span className="font-bold text-slate-850 dark:text-[#F8FAFC]">{log.changedBy}</span>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-200/50 dark:border-[#334155]/50 text-[10px] space-y-1">
                            <p><strong>Previous:</strong> <span className="text-rose-600">{log.previous}</span></p>
                            {!isDelete && <p><strong>Updated:</strong> <span className="text-emerald-600 font-extrabold">{log.updated}</span></p>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-2 border-t dark:border-[#334155] flex justify-end">
              <button onClick={() => setViewReceiptHistorySale(null)} className="px-5 py-2.5 bg-slate-800 dark:bg-[#111827] text-white rounded-xl text-xs font-bold hover:bg-slate-900 dark:hover:bg-[#1E293B] transition-colors">
                Close Timeline
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
