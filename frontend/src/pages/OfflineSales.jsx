import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { 
  Plus, Trash2, Store, X, Loader2, Search, Edit2, PlusCircle, 
  ChevronDown, ChevronUp, TrendingUp, IndianRupee, AlertTriangle, 
  Clock, Calendar, CheckCircle2, ArrowUpRight, DollarSign, 
  Wallet, CreditCard, Filter, RefreshCw, Eye, Tag, FileText, UserCheck, 
  CalendarDays, Percent, Building2, UserCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SearchableSelect from '../components/SearchableSelect';

const emptyItem = { productId: '', qty: '', amount: '' };
const today = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
};
const emptyOrder = () => ({ date: today(), items: [{ ...emptyItem }], gst: false });
const emptyTxn = () => ({ amount: '', method: 'cash', date: today() });
const emptyForm = { buyerName: '', orders: [emptyOrder()], transactions: [], notes: '' };

const METHOD_LABELS = {
  cash: '💵 Cash',
  upi: '⚡ UPI',
  bank_transfer: '🏦 Bank Transfer',
  cheque: '✍️ Cheque'
};

const METHOD_COLORS = { 
  cash: 'bg-emerald-50 text-emerald-700 border-emerald-100', 
  upi: 'bg-blue-50 text-blue-700 border-blue-100',
  bank_transfer: 'bg-sky-50 text-sky-700 border-sky-100',
  cheque: 'bg-indigo-50 text-indigo-700 border-indigo-100'
};

function TxnRow({ txn, onChange, onRemove }) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 sm:p-0 border border-slate-100 sm:border-0 rounded-2xl sm:rounded-none bg-slate-50/50 sm:bg-transparent relative">
      <div className="flex gap-3">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">₹</span>
          <input type="number" min="0" value={txn.amount} onChange={(e) => onChange('amount', e.target.value)}
            className="w-full sm:w-36 pl-7 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white" placeholder="Amount" />
        </div>
        <select value={txn.method} onChange={(e) => onChange('method', e.target.value)}
          className="w-full sm:w-32 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white font-medium text-slate-700">
          <option value="cash">💵 Cash</option>
          <option value="upi">⚡ UPI</option>
        </select>
      </div>
      <div className="flex items-center gap-3 w-full">
        <input type="date" value={txn.date} onChange={(e) => onChange('date', e.target.value)}
          className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white" />
        <button type="button" onClick={onRemove}
          className="p-2 rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors flex-shrink-0">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

function ItemRow({ item, products, onProductChange, onQtyChange, onAmountChange, onRemove, showRemove, isGst }) {
  const selProd = products.find((p) => p.id === item.productId);
  return (
    <div className="space-y-2 p-4 sm:p-0 border border-slate-100 sm:border-0 rounded-2xl sm:rounded-none bg-slate-50/50 sm:bg-transparent">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1">
          <SearchableSelect
            value={item.productId}
            onChange={onProductChange}
            placeholder="Select product…"
            options={products.filter((p) => p.availableQty > 0).map((p) => ({ value: p.id, label: `${p.name} (Stock: ${p.availableQty})` }))}
            className="w-full"
          />
        </div>
        <div className="flex items-center gap-3">
          <input type="number" min="1" max={selProd?.availableQty || 9999} value={item.qty}
            onChange={(e) => onQtyChange(e.target.value)}
            className="w-full sm:w-24 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-center" placeholder="Qty" />
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">₹</span>
            <input type="number" min="0" value={item.amount}
              onChange={(e) => onAmountChange(e.target.value)}
              className="w-full sm:w-32 pl-7 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white" placeholder="Amount" />
          </div>
          {showRemove && (
            <button type="button" onClick={onRemove}
              className="p-2 rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors flex-shrink-0">
              <X size={16} />
            </button>
          )}
        </div>
      </div>
      {selProd && (
        <p className="text-xs text-slate-400 pl-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
          <span>
            📍 Stock: <span className="font-semibold text-slate-700">{selProd.availableQty} units</span>
            &nbsp;· Base Price: <span className="font-semibold text-rose-600">₹{selProd.offlinePrice ?? selProd.unitPrice ?? 0}</span>
          </span>
          {item.amount && (
            <span className={`self-start sm:self-auto text-[10px] font-bold px-2 py-0.5 rounded-full border ${isGst ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
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
      <div className="bg-white rounded-3xl shadow-2xl w-[95%] sm:w-full max-w-2xl border border-slate-100 overflow-hidden transform transition-all scale-100">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
            {title}
          </h3>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition-colors"><X size={18} /></button>
        </div>
        <div className="px-6 py-6 max-h-[75vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export default function OfflineSales() {
  const { user } = useAuth();
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [customerCategory, setCustomerCategory] = useState('shop');
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
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  function load() {
    Promise.all([api.getOfflineSales(), api.getProducts(), api.getShops()])
      .then(([s, p, sh]) => { setSales(s.reverse()); setProducts(p); setShops(sh); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  // ── Add-form order handlers ────────────────────────────────
  function setOrderDate(oi, date) {
    setForm((f) => { const orders = [...f.orders]; orders[oi] = { ...orders[oi], date }; return { ...f, orders }; });
  }

  function handleItemProductChange(oi, ii, productId) {
    const p = products.find((x) => x.id === productId);
    const unitPrice = p ? (p.offlinePrice ?? p.unitPrice ?? 0) : 0;
    setForm((f) => {
      const orders = [...f.orders];
      const items = [...orders[oi].items];
      const qty = Number(items[ii].qty) || 1;
      const baseAmount = unitPrice * qty;
      const finalAmount = orders[oi].gst ? Math.round(baseAmount * 1.18) : baseAmount;
      items[ii] = { ...items[ii], productId, amount: finalAmount ? String(finalAmount) : '' };
      orders[oi] = { ...orders[oi], items };
      return { ...f, orders };
    });
  }

  function handleItemQtyChange(oi, ii, qty) {
    setForm((f) => {
      const orders = [...f.orders];
      const items = [...orders[oi].items];
      const p = products.find((x) => x.id === items[ii].productId);
      const unitPrice = p ? (p.offlinePrice ?? p.unitPrice ?? 0) : 0;
      const baseAmount = unitPrice * Number(qty);
      const finalAmount = orders[oi].gst ? Math.round(baseAmount * 1.18) : baseAmount;
      items[ii] = { ...items[ii], qty, amount: finalAmount ? String(finalAmount) : items[ii].amount };
      orders[oi] = { ...orders[oi], items };
      return { ...f, orders };
    });
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
        const newAmount = nextGst ? Math.round(currentAmount * 1.18) : Math.round(currentAmount / 1.18);
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
    const p = products.find((x) => x.id === productId);
    const unitPrice = p ? (p.offlinePrice ?? p.unitPrice ?? 0) : 0;
    setEditNewItems((items) => {
      const updated = [...items];
      const qty = Number(updated[idx].qty) || 1;
      const baseAmount = unitPrice * qty;
      const finalAmount = editGst ? Math.round(baseAmount * 1.18) : baseAmount;
      updated[idx] = { ...updated[idx], productId, amount: finalAmount ? String(finalAmount) : '' };
      return updated;
    });
  }

  // ── Expand function ────────────────────────────────────────
  function toggleExpand(id) {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handleEditItemQtyChange(idx, qty) {
    setEditNewItems((items) => {
      const updated = [...items];
      const p = products.find((x) => x.id === updated[idx].productId);
      const unitPrice = p ? (p.offlinePrice ?? p.unitPrice ?? 0) : 0;
      const baseAmount = unitPrice * Number(qty);
      const finalAmount = editGst ? Math.round(baseAmount * 1.18) : baseAmount;
      updated[idx] = { ...updated[idx], qty, amount: finalAmount ? String(finalAmount) : updated[idx].amount };
      return updated;
    });
  }

  function toggleEditGst() {
    setEditGst((prev) => {
      const nextGst = !prev;
      setEditNewItems((items) =>
        items.map((item) => {
          if (!item.amount) return item;
          const currentAmount = Number(item.amount) || 0;
          const newAmount = nextGst ? Math.round(currentAmount * 1.18) : Math.round(currentAmount / 1.18);
          return { ...item, amount: String(newAmount) };
        })
      );
      setEditModal((prevModal) => {
        if (!prevModal) return prevModal;
        const updatedItems = (prevModal.items || []).map((item) => {
          if (!item.amount) return item;
          const currentAmount = Number(item.amount) || 0;
          const newAmount = nextGst ? Math.round(currentAmount * 1.18) : Math.round(currentAmount / 1.18);
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
  const totalReceived = form.transactions.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const amountLeft = computedTotal - totalReceived;

  // ── Submit ─────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    const allItems = form.orders.flatMap((o) =>
      o.items.filter((i) => i.productId && i.qty).map((i) => ({ ...i, date: o.date }))
    );
    if (allItems.length === 0) { setError('Add at least one product.'); return; }
    
    let finalBuyerName = form.buyerName;
    let finalNotes = form.notes;
    
    if (customerCategory === 'walk-in') {
      finalBuyerName = walkInName.trim() || 'Walk-in Customer';
      if (walkInMobile.trim()) {
        finalNotes = `[Mobile: ${walkInMobile.trim()}] ${form.notes}`.trim();
      }
    } else {
      if (!finalBuyerName) {
        setError('Please select a customer shop.');
        return;
      }
    }

    setSaving(true); setError('');
    try {
      const validTxns = form.transactions.filter((t) => t.amount);
      const payload = {
        buyerName: finalBuyerName, items: allItems, totalAmount: computedTotal,
        transactions: validTxns, amountReceived: totalReceived, notes: finalNotes,
        gst: form.orders.some((o) => o.gst),
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
    const validNewItems = editNewItems.filter((i) => i.productId && i.qty);
    const validNewTxns = editNewTxns.filter((t) => t.amount);
    try {
      const updated = await api.updateOfflineSale(editModal.id, {
        items: editModal.items,
        totalAmount: editModal.totalAmount,
        gst: editGst,
        newTransactions: validNewTxns.length > 0 ? validNewTxns : undefined,
        newItems: validNewItems.length > 0 ? validNewItems : undefined,
        newItemsDate: editNewDate || today(),
      });
      setSales((ss) => ss.map((s) => s.id === updated.id ? updated : s));
      if (validNewItems.length > 0) {
        setProducts((ps) => {
          let result = [...ps];
          for (const item of validNewItems) {
            result = result.map((p) => p.id === item.productId ? { ...p, availableQty: p.availableQty - Number(item.qty) } : p);
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
      (filterMethod === 'none' && txns.length === 0);

    // 5. Date range filter
    let matchesDate = true;
    if (filterStartDate) matchesDate = matchesDate && s.date >= filterStartDate;
    if (filterEndDate) matchesDate = matchesDate && s.date <= filterEndDate;

    return matchesSearch && matchesStatus && matchesShop && matchesMethod && matchesDate;
  });

  // ── KPI / Metrics computations (based on filtered list) ─────
  const summaryRevenue = filtered.reduce((s, x) => s + x.totalAmount, 0);
  const summaryReceived = filtered.reduce((s, x) => s + x.amountReceived, 0);
  const summaryPending = filtered.reduce((s, x) => s + x.amountLeft, 0);
  const summaryUpi = filtered.reduce((s, x) => s + (x.transactions || []).filter((t) => t.method === 'upi').reduce((a, t) => a + (Number(t.amount) || 0), 0), 0);
  const summaryCash = filtered.reduce((s, x) => s + (x.transactions || []).filter((t) => t.method === 'cash').reduce((a, t) => a + (Number(t.amount) || 0), 0), 0);

  // ── High-level Business Insights (always based on total sales for context) ──
  const todayStr = today();
  const currentMonthStr = todayStr.slice(0, 7);
  const todaySalesVal = sales.filter(s => s.date === todayStr).reduce((sum, s) => sum + s.totalAmount, 0);
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
  const hasActiveFilters = filterStatus !== 'all' || filterShop !== 'all' || filterMethod !== 'all' || filterStartDate !== '' || filterEndDate !== '' || search !== '';
  const resetFilters = () => {
    setFilterStatus('all');
    setFilterShop('all');
    setFilterMethod('all');
    setFilterStartDate('');
    setFilterEndDate('');
    setSearch('');
  };

  // Build shop name map to retrieve customer type
  const shopMap = {};
  shops.forEach(s => { shopMap[s.name] = s.type; });

  // Format currency helper
  const fmt = (num) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num || 0);

  // Get status details helper
  const getSaleStatus = (s) => {
    const diffDays = Math.floor((new Date() - new Date(s.date)) / (1000 * 60 * 60 * 24));
    const isOverdue = s.amountLeft > 0 && diffDays > 10;
    
    if (s.amountLeft === 0) {
      return {
        label: 'Paid',
        colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        dotClass: 'bg-emerald-500'
      };
    }
    if (isOverdue) {
      return {
        label: 'Overdue',
        colorClass: 'bg-rose-50 text-rose-800 border-rose-200 font-semibold animate-pulse',
        dotClass: 'bg-rose-600'
      };
    }
    if (s.amountReceived > 0) {
      return {
        label: 'Partial',
        colorClass: 'bg-amber-50 text-amber-700 border-amber-200',
        dotClass: 'bg-amber-500'
      };
    }
    return {
      label: 'Pending',
      colorClass: 'bg-red-50 text-red-700 border-red-200',
      dotClass: 'bg-red-500'
    };
  };

  // Render Customer Type Badge
  const renderCustomerBadge = (buyerName) => {
    const type = shopMap[buyerName];
    const isWalkIn = type === 'walk-in' || buyerName === 'Walk-in Customer' || buyerName.toLowerCase().includes('walk-in');
    
    if (isWalkIn) {
      return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/50">
          👤 Walk-in Customer
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-150">
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
    <div className="space-y-6 pb-12">
      <style>{`
        .premium-card {
          border-radius: 20px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .premium-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 24px -10px rgba(15, 23, 42, 0.08);
        }
        .expand-transition {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Main Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            Offline Sales Dashboard
          </h1>
          <p className="text-slate-400 text-xs mt-0.5">Manage customer billing, invoices, payment history, and collection metrics.</p>
        </div>
        <button onClick={() => { setForm(emptyForm); setCustomerCategory('shop'); setWalkInName(''); setWalkInMobile(''); setError(''); setShowModal(true); }}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-sm font-semibold px-5 py-3 rounded-2xl transition-all shadow-md shadow-red-500/10 hover:shadow-lg hover:-translate-y-0.5 whitespace-nowrap">
          <Plus size={16} /> Log New Invoice
        </button>
      </div>

      {/* Business Insights Strip */}
      <div className="bg-slate-50 border border-slate-100 rounded-3xl p-3.5 grid grid-cols-2 md:grid-cols-5 gap-3 text-xs shadow-inner">
        <div className="bg-white/90 p-3 rounded-2xl border border-slate-200/50 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <CalendarDays size={12} className="text-indigo-500" /> Today's Sales
          </span>
          <span className="font-extrabold text-slate-800 text-sm mt-1">{fmt(todaySalesVal)}</span>
        </div>
        <div className="bg-white/90 p-3 rounded-2xl border border-slate-200/50 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <TrendingUp size={12} className="text-emerald-500" /> This Month
          </span>
          <span className="font-extrabold text-slate-800 text-sm mt-1">{fmt(thisMonthSalesVal)}</span>
        </div>
        <div className="bg-white/90 p-3 rounded-2xl border border-slate-200/50 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle size={12} className="text-rose-500" /> Total Outstanding
          </span>
          <span className="font-extrabold text-rose-600 text-sm mt-1">{fmt(totalOutstandingDues)}</span>
        </div>
        <div className="bg-white/90 p-3 rounded-2xl border border-slate-200/50 flex flex-col justify-between truncate">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 truncate">
            <UserCheck size={12} className="text-sky-500" /> Top Customer
          </span>
          <span className="font-extrabold text-slate-800 text-sm mt-1 truncate" title={topCustomerName}>{topCustomerName}</span>
        </div>
        <div className="bg-white/90 p-3 rounded-2xl border border-slate-200/50 flex flex-col justify-between col-span-2 md:col-span-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Percent size={12} className="text-violet-500" /> Avg Order Value
          </span>
          <span className="font-extrabold text-slate-800 text-sm mt-1">{fmt(avgOrderValue)}</span>
        </div>
      </div>

      {/* KPI Header Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Revenue */}
        <div className="premium-card bg-gradient-to-br from-indigo-50 to-blue-50/20 p-5 border border-indigo-100/60 shadow-sm flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute right-0 bottom-0 translate-y-1/3 translate-x-1/6 text-indigo-500/5 group-hover:scale-110 transition-transform duration-300">
            <IndianRupee size={120} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">Total Sales</span>
            <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-xl"><TrendingUp size={16} /></div>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-black text-indigo-950 tracking-tight">{fmt(summaryRevenue)}</p>
            <p className="text-[10px] text-indigo-400 font-semibold mt-0.5 flex items-center gap-0.5">
              <ArrowUpRight size={10} /> Active sales aggregate
            </p>
          </div>
        </div>

        {/* Amount Received */}
        <div className="premium-card bg-gradient-to-br from-emerald-50 to-teal-50/20 p-5 border border-emerald-100/60 shadow-sm flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute right-0 bottom-0 translate-y-1/3 translate-x-1/6 text-emerald-500/5 group-hover:scale-110 transition-transform duration-300">
            <CheckCircle2 size={120} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Total Received</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl"><CheckCircle2 size={16} /></div>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-black text-emerald-950 tracking-tight">{fmt(summaryReceived)}</p>
            <p className="text-[10px] text-emerald-400 font-semibold mt-0.5 flex items-center gap-0.5">
              <CheckCircle2 size={10} /> Cleared customer bills
            </p>
          </div>
        </div>

        {/* Pending Amount */}
        <div className="premium-card bg-gradient-to-br from-rose-50 to-orange-50/20 p-5 border border-rose-100/60 shadow-sm flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute right-0 bottom-0 translate-y-1/3 translate-x-1/6 text-rose-500/5 group-hover:scale-110 transition-transform duration-300">
            <AlertTriangle size={120} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-500 uppercase tracking-wider">Pending Dues</span>
            <div className="p-2 bg-rose-500/10 text-rose-600 rounded-xl"><Clock size={16} /></div>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-black text-rose-950 tracking-tight">{fmt(summaryPending)}</p>
            <p className="text-[10px] text-rose-400 font-semibold mt-0.5 flex items-center gap-0.5">
              <Clock size={10} /> Awaiting collection
            </p>
          </div>
        </div>

        {/* UPI Collection */}
        <div className="premium-card bg-gradient-to-br from-sky-50 to-indigo-50/20 p-5 border border-sky-100/60 shadow-sm flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute right-0 bottom-0 translate-y-1/3 translate-x-1/6 text-sky-500/5 group-hover:scale-110 transition-transform duration-300">
            <CreditCard size={120} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-500 uppercase tracking-wider">UPI Payments</span>
            <div className="p-2 bg-sky-500/10 text-sky-600 rounded-xl"><CreditCard size={16} /></div>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-black text-sky-950 tracking-tight">{fmt(summaryUpi)}</p>
            <p className="text-[10px] text-sky-400 font-semibold mt-0.5 flex items-center gap-0.5">
              ⚡ Instant digital transfers
            </p>
          </div>
        </div>

        {/* Cash Collection */}
        <div className="premium-card bg-gradient-to-br from-violet-50 to-purple-50/20 p-5 border border-violet-100/60 shadow-sm flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute right-0 bottom-0 translate-y-1/3 translate-x-1/6 text-violet-500/5 group-hover:scale-110 transition-transform duration-300">
            <Wallet size={120} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-violet-500 uppercase tracking-wider">Cash Payments</span>
            <div className="p-2 bg-violet-500/10 text-violet-600 rounded-xl"><Wallet size={16} /></div>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-black text-violet-950 tracking-tight">{fmt(summaryCash)}</p>
            <p className="text-[10px] text-violet-400 font-semibold mt-0.5 flex items-center gap-0.5">
              💵 Store registers cash
            </p>
          </div>
        </div>
      </div>

      {/* Smart Filters Panel */}
      <div className="bg-white/80 backdrop-blur-md border border-slate-200/50 p-6 rounded-3xl shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Filter size={14} className="text-slate-400" /> Filter & Search Operations
          </span>
          {hasActiveFilters && (
            <button onClick={resetFilters}
              className="text-[11px] font-bold text-red-500 hover:text-red-700 transition-colors flex items-center gap-1 bg-red-50 hover:bg-red-100/60 px-3 py-1 rounded-lg">
              <RefreshCw size={10} /> Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search Box */}
          <div className="space-y-1 md:col-span-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Search</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by SKU, customer, or ID…"
                className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-slate-50/50 hover:bg-white transition-colors" />
            </div>
          </div>

          {/* Payment Status Dropdown */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payment Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-slate-50/50 hover:bg-white transition-colors font-medium text-slate-700">
              <option value="all">🟢 All Statuses</option>
              <option value="paid">✅ Fully Paid</option>
              <option value="partial">🟠 Partially Paid</option>
              <option value="pending">🔴 Unpaid / Pending</option>
              <option value="overdue">🚨 Overdue (&gt;10 Days)</option>
            </select>
          </div>

          {/* Customer Dropdown */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customer / Shop</label>
            <select value={filterShop} onChange={(e) => setFilterShop(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-slate-50/50 hover:bg-white transition-colors font-medium text-slate-700">
              <option value="all">👥 All Customers</option>
              {Array.from(new Set(sales.map(s => s.buyerName))).map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          {/* Payment Method Dropdown */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payment Method</label>
            <select value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-slate-50/50 hover:bg-white transition-colors font-medium text-slate-700">
              <option value="all">💳 All Methods</option>
              <option value="upi">⚡ UPI Payment</option>
              <option value="cash">💵 Cash Payment</option>
              <option value="none">🛑 No Payments</option>
            </select>
          </div>
        </div>

        {/* Date Range Sub-row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2 border-t border-slate-50">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Start Date</label>
            <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-slate-50/50 hover:bg-white transition-colors text-slate-600" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">End Date</label>
            <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-slate-50/50 hover:bg-white transition-colors text-slate-600" />
          </div>
          {filtered.length !== sales.length && (
            <div className="flex items-end justify-start pb-2.5 text-xs font-semibold text-indigo-600">
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
                  className={`bg-white border rounded-3xl shadow-sm overflow-hidden hover:border-slate-300 transition-all duration-300 ${isExpanded ? 'ring-2 ring-red-500/20 border-red-200' : 'border-slate-100/80'}`}>
                  
                  {/* Collapsed Top Header row */}
                  <div 
                    onClick={() => toggleExpand(s.id)}
                    className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer select-none hover:bg-slate-50/30 transition-colors">
                    
                    {/* Left block: Product & Date */}
                    <div className="flex items-start gap-3.5 flex-1 min-w-[280px]">
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex-shrink-0 text-slate-400 mt-1">
                        <FileText size={20} />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-800">
                            {s.items && s.items.length > 0
                              ? s.items[0].productName + (s.items.length > 1 ? ` (+${s.items.length - 1} products)` : '')
                              : s.productName || 'Unknown Product'}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200/30">
                            {totalQty(s)} units
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-medium flex items-center gap-1">
                          <Calendar size={12} /> Date: {s.date}
                        </p>
                      </div>
                    </div>

                    {/* Center block: Customer details & badges */}
                    <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[240px]">
                      <div className="space-y-1 w-full">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm text-slate-700">{s.buyerName}</span>
                          {renderCustomerBadge(s.buyerName)}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {s.gst && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200/50 rounded">
                              GST 18%
                            </span>
                          )}
                          {s.transactions && s.transactions.length > 0 ? (
                            s.transactions.map((t, idx) => (
                              <span key={idx} className={`text-[9px] font-bold px-2 py-0.2 rounded border uppercase ${METHOD_COLORS[t.method] || 'bg-slate-100 text-slate-600'}`}>
                                {t.method === 'upi' ? '⚡ upi' : '💵 cash'}
                              </span>
                            ))
                          ) : (
                            <span className="text-[9px] font-bold px-2 py-0.2 rounded border bg-rose-50 text-rose-600 border-rose-100 uppercase">
                              Unpaid
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right block: Financial status pills & expansion toggle */}
                    <div className="flex items-center justify-between lg:justify-end gap-5 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-50">
                      <div className="grid grid-cols-3 gap-4 text-right">
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total</p>
                          <p className="text-xs font-black text-slate-800 mt-0.5">{fmt(s.totalAmount)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Received</p>
                          <p className="text-xs font-black text-emerald-600 mt-0.5">{fmt(s.amountReceived)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Pending</p>
                          <p className={`text-xs font-black mt-0.5 ${s.amountLeft > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                            {fmt(s.amountLeft)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${status.colorClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dotClass}`}></span>
                          {status.label}
                        </span>
                        
                        <div className="text-slate-400 p-1.5 rounded-xl hover:bg-slate-100 transition-colors">
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded detail section */}
                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-slate-100 bg-slate-50/30 animate-fadeIn">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                        
                        {/* Products list detail */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Store size={12} /> Itemized Order Details
                          </h4>
                          <div className="divide-y divide-slate-50 max-h-[250px] overflow-y-auto pr-1">
                            {itemsList.map(([date, items]) => (
                              <div key={date} className="py-2.5 first:pt-0 last:pb-0">
                                <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md">{date}</span>
                                <div className="mt-2 space-y-1.5">
                                  {items.map((item, i) => (
                                    <div key={i} className="flex justify-between items-center text-xs text-slate-700">
                                      <span className="font-semibold">{item.productName}</span>
                                      <div className="space-x-3 text-slate-500 font-medium">
                                        <span>×{item.qty} units</span>
                                        <span className="text-slate-800 font-bold">{fmt(item.amount)}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Payment list detail */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Wallet size={12} /> Transaction Clearing History
                          </h4>
                          <div className="divide-y divide-slate-50 max-h-[250px] overflow-y-auto pr-1">
                            {s.transactions && s.transactions.length > 0 ? (
                              s.transactions.map((t, idx) => {
                                const txn = ensureTxnId(t);
                                return (
                                  <div key={txn.id || idx} className="flex justify-between items-center py-2.5 first:pt-0 last:pb-0 text-xs gap-3">
                                    <div className="flex items-center gap-2 flex-wrap flex-1">
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${METHOD_COLORS[txn.method] || 'bg-slate-100 text-slate-600'}`}>
                                        {METHOD_LABELS[txn.method] || txn.method}
                                      </span>
                                      <span className="text-slate-400 font-medium">{txn.date}</span>
                                      {txn.referenceNumber && (
                                        <span className="text-[9px] text-slate-400 font-medium bg-slate-50 border px-1.5 py-0.2 rounded-md">
                                          Ref: {txn.referenceNumber}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="font-extrabold text-emerald-600">{fmt(txn.amount)}</span>
                                      <div className="flex items-center gap-1">
                                        <button 
                                          onClick={() => handleOpenEditReceipt(s, txn)}
                                          title="Edit Receipt"
                                          className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                                        >
                                          <Edit2 size={12} />
                                        </button>
                                        <button 
                                          onClick={() => handleOpenDeleteReceipt(s, txn)}
                                          title="Delete Receipt"
                                          className="p-1 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                        <button 
                                          onClick={() => handleViewReceiptHistory(s, txn.id)}
                                          title="View Receipt History"
                                          className="p-1 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                        >
                                          <Clock size={12} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="py-8 text-center text-slate-400 text-xs font-medium">
                                🛑 No transaction payments recorded yet for this invoice.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Notes row if any */}
                      {s.notes && (
                        <div className="mt-4 p-3 bg-amber-50/50 border border-amber-100/50 rounded-2xl text-xs text-amber-800">
                          <strong>📝 Notes:</strong> {s.notes}
                        </div>
                      )}

                      {/* Action buttons footer */}
                      <div className="flex items-center justify-between border-t border-slate-100 mt-4 pt-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Invoice ID: <span className="text-slate-500 select-all font-mono">{s.id}</span>
                          </span>
                          {s.corrections && s.corrections.length > 0 && (
                            <button
                              onClick={() => handleViewReceiptHistory(s, null)}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-50 text-blue-700 border border-blue-150 shadow-sm hover:bg-blue-100 transition-colors"
                            >
                              📋 Audit Logs ({s.corrections.length})
                            </button>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <button onClick={() => { setEditModal(s); setEditNewItems([]); setEditNewDate(today()); setEditNewTxns([]); setEditError(''); setEditGst(s.gst || false); }}
                            className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors shadow-sm bg-white">
                            <Edit2 size={12} /> Edit Billing
                          </button>
                          <button onClick={() => handleDelete(s.id)} disabled={user?.role === 'employee'} 
                            className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-150 rounded-xl text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm">
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
            <div className="space-y-3 bg-slate-50/50 p-4 border border-slate-200/50 rounded-2xl">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Customer Category</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerCategory('shop');
                      setForm((f) => ({ ...f, buyerName: '' }));
                    }}
                    className={`py-2 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      customerCategory === 'shop'
                        ? 'bg-red-600 text-white border-red-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    🏪 Existing Shop
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerCategory('walk-in');
                      setForm((f) => ({ ...f, buyerName: 'Walk-in Customer' }));
                    }}
                    className={`py-2 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      customerCategory === 'walk-in'
                        ? 'bg-red-600 text-white border-red-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    👤 Walk-in Customer
                  </button>
                </div>
              </div>

              {customerCategory === 'shop' ? (
                <div className="space-y-1 pt-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Select Registered Shop *</label>
                  <select 
                    required={customerCategory === 'shop'} 
                    value={form.buyerName} 
                    onChange={(e) => setForm((f) => ({ ...f, buyerName: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 font-medium text-slate-700 bg-white"
                  >
                    <option value="">Select customer shop…</option>
                    {shops.map((s) => (
                      <option key={s.id} value={s.name}>{s.name}{s.mobile ? ` — ${s.mobile}` : ''}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Customer Name (Optional)</label>
                    <input 
                      type="text"
                      value={walkInName}
                      onChange={(e) => setWalkInName(e.target.value)}
                      placeholder="e.g. Ram Kumar"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Mobile Number (Optional)</label>
                    <input 
                      type="text"
                      value={walkInMobile}
                      onChange={(e) => setWalkInMobile(e.target.value)}
                      placeholder="e.g. 9988776655"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Orders */}
            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Orders List</label>
              {form.orders.map((order, oi) => (
                <div key={oi} className="border border-slate-200/80 rounded-2xl overflow-hidden bg-slate-50/20">
                  <div className="flex items-center justify-between gap-3 bg-slate-50 px-4 py-3 border-b border-slate-200/50">
                    <span className="text-xs font-extrabold text-slate-500">Order {oi + 1}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-400">Date:</span>
                      <input type="date" value={order.date} onChange={(e) => setOrderDate(oi, e.target.value)}
                        className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-600 font-medium" />
                      {form.orders.length > 1 && (
                        <button type="button" onClick={() => removeOrder(oi)}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="p-4 space-y-3 bg-white">
                    {order.items.map((item, ii) => (
                      <ItemRow key={ii} item={item} products={products}
                        onProductChange={(v) => handleItemProductChange(oi, ii, v)}
                        onQtyChange={(v) => handleItemQtyChange(oi, ii, v)}
                        onAmountChange={(v) => handleItemAmountChange(oi, ii, v)}
                        onRemove={() => removeItemFromOrder(oi, ii)}
                        showRemove={order.items.length > 1}
                        isGst={order.gst}
                      />
                    ))}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
                      <button type="button" onClick={() => addItemToOrder(oi)}
                        className="flex items-center gap-1.5 text-red-600 hover:text-red-700 text-xs font-bold transition-colors">
                        <PlusCircle size={14} /> Add Product Row
                      </button>
                      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                        <input
                           type="checkbox"
                           checked={order.gst || false}
                           onChange={() => toggleOrderGst(oi)}
                           className="sr-only"
                        />
                        <div className={`relative w-8 h-4.5 rounded-full transition-colors duration-200 ${order.gst ? 'bg-red-600' : 'bg-slate-200'}`}>
                          <div className={`absolute top-[2px] left-[2px] bg-white border border-slate-300 rounded-full h-3.5 w-3.5 transition-transform duration-200 ${order.gst ? 'translate-x-3.5' : 'translate-x-0'}`} />
                        </div>
                        <span className="text-xs font-bold text-slate-500">Apply GST (18%)</span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" onClick={addOrder}
                className="flex items-center justify-center gap-2 w-full py-3 border border-dashed border-red-200 hover:border-red-500 rounded-2xl text-xs font-bold text-red-600 hover:bg-red-50/30 transition-all">
                <PlusCircle size={15} /> Add Another Order Date Group
              </button>
            </div>

            {/* Total */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 flex justify-between text-sm font-bold text-slate-700 shadow-inner">
              <span className="uppercase text-slate-400 text-xs font-bold tracking-wider">Grand Total Amount</span>
              <span className="text-base text-slate-800 font-extrabold">{fmt(computedTotal)}</span>
            </div>

            {/* Transactions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Payments Received</label>
                <button type="button" onClick={addTxn}
                  className="flex items-center gap-1 text-red-600 hover:text-red-700 text-xs font-bold transition-colors">
                  <PlusCircle size={14} /> Add Transaction
                </button>
              </div>
              {form.transactions.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 text-xs text-slate-400 font-medium">
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
                <div className={`mt-3 flex justify-between px-5 py-3.5 rounded-2xl text-sm font-semibold shadow-sm ${amountLeft > 0 ? 'bg-amber-50/70 text-amber-800 border border-amber-100/50' : 'bg-emerald-50 text-emerald-800 border border-emerald-100'}`}>
                  <span>Cleared: {fmt(totalReceived)}</span>
                  <span>Pending Dues: {fmt(amountLeft)}</span>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Remarks / Notes</label>
              <textarea rows={2.5} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none bg-white" placeholder="Optional notes…" />
            </div>

            {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2.5 rounded-xl border border-red-200">{error}</p>}

            <div className="flex gap-4 pt-3 border-t border-slate-100">
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 border border-slate-200 rounded-2xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-colors">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 disabled:opacity-60 text-white text-sm font-semibold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md shadow-red-500/10">
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
        const newTxnsTotal = editNewTxns.reduce((s, t) => s + (Number(t.amount) || 0), 0);
        const updatedReceived = existingReceived + newTxnsTotal;
        const updatedPending = updatedTotal - updatedReceived;
        return (
          <Modal title={`Edit Invoice — ${editModal.buyerName}`} onClose={() => { setEditModal(null); setEditNewItems([]); setEditNewDate(''); setEditNewTxns([]); setEditGst(false); }}>
            <form onSubmit={handleUpdatePayment} className="space-y-5">

              {/* Existing orders (read-only) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Current Orders</label>
                <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white">
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
                        <div className="bg-slate-50/70 px-4 py-2 text-xs font-bold text-slate-500">{date}</div>
                        {items.map((item, i) => (
                          <div key={i} className="flex items-center justify-between px-4 py-3 text-xs border-t border-slate-50">
                            <span className="text-slate-800 font-bold">{item.productName}</span>
                            <div className="flex items-center gap-3 text-slate-500">
                              <span>×{item.qty} units</span>
                              <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                                {fmt(item.amount)}
                                {editGst && <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-green-50 text-green-700 border border-green-200">GST</span>}
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
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Add Products to Billing</label>
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editGst}
                      onChange={toggleEditGst}
                      className="sr-only"
                    />
                    <div className={`relative w-8 h-4.5 rounded-full transition-colors duration-200 ${editGst ? 'bg-red-600' : 'bg-slate-200'}`}>
                      <div className={`absolute top-[2px] left-[2px] bg-white border border-slate-300 rounded-full h-3.5 w-3.5 transition-transform duration-200 ${editGst ? 'translate-x-3.5' : 'translate-x-0'}`} />
                    </div>
                    <span className="text-xs font-bold text-slate-500">Apply GST (18%)</span>
                  </label>
                </div>
                
                {editNewItems.length === 0 ? (
                  <button type="button" onClick={addEditItem}
                    className="flex items-center justify-center gap-2 w-full py-3.5 border border-dashed border-red-200 hover:border-red-500 rounded-2xl text-xs font-bold text-red-600 hover:bg-red-50/20 transition-all">
                    <PlusCircle size={15} /> Add Products to Current Invoice
                  </button>
                ) : (
                  <div className="space-y-3 bg-slate-50/30 p-4 border border-slate-200/50 rounded-2xl">
                    {editNewItems.map((item, idx) => {
                      const selProd = products.find((p) => p.id === item.productId);
                      return (
                        <div key={idx} className="border border-red-100 rounded-2xl p-4 space-y-3 bg-white shadow-sm">
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <div className="flex-1">
                              <SearchableSelect
                                value={item.productId}
                                onChange={(val) => handleEditItemProductChange(idx, val)}
                                placeholder="Select product…"
                                options={products.filter((p) => p.availableQty > 0).map((p) => ({ value: p.id, label: `${p.name} (Stock: ${p.availableQty})` }))}
                                className="w-full"
                              />
                            </div>
                            <div className="flex items-center gap-3">
                              <input type="number" min="1" max={selProd?.availableQty || 9999} value={item.qty}
                                onChange={(e) => handleEditItemQtyChange(idx, e.target.value)}
                                className="w-full sm:w-20 px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 text-center" placeholder="Qty" />
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">₹</span>
                                <input type="number" min="0" value={item.amount}
                                  onChange={(e) => handleEditItemAmountChange(idx, e.target.value)}
                                  className="w-full sm:w-28 pl-7 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="Amt" />
                              </div>
                              <button type="button" onClick={() => removeEditItem(idx)}
                                className="p-2 rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors flex-shrink-0">
                                <X size={15} />
                              </button>
                            </div>
                          </div>
                          {selProd && (
                            <p className="text-[11px] text-slate-400 flex items-center justify-between mt-1">
                              <span>
                                📍 Stock: <span className="font-semibold text-slate-600">{selProd.availableQty} units</span>
                                &nbsp;· Base Price: <span className="font-semibold text-rose-600">₹{selProd.offlinePrice ?? selProd.unitPrice ?? 0}</span>
                              </span>
                              {item.amount && (
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${editGst ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                  {editGst ? 'GST (18%) Included' : 'Excl. GST'}
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                      );
                    })}
                    
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Group Date</label>
                      <input type="date" value={editNewDate} onChange={(e) => setEditNewDate(e.target.value)}
                        className="flex-1 px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-600 font-medium" />
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-200/50">
                      <button type="button" onClick={addEditItem}
                        className="flex items-center gap-1.5 text-red-600 hover:text-red-700 text-xs font-bold transition-colors">
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
              {user?.role === 'admin' && (
                <div className="space-y-2 pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock size={12} className="text-blue-500" /> Receipt Audit Trail (Admin Only)
                  </h4>
                  
                  {!editModal.corrections || editModal.corrections.length === 0 ? (
                    <div className="text-center py-4 bg-slate-50 border border-dashed rounded-2xl text-slate-400 text-[11px] font-semibold">
                      📋 No corrections or deletion logs recorded yet.
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs max-h-[180px] overflow-y-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[9px] border-b sticky top-0">
                          <tr>
                            <th className="px-3 py-2">Timestamp</th>
                            <th className="px-3 py-2">Changed By</th>
                            <th className="px-3 py-2">Reason</th>
                            <th className="px-3 py-2 text-right">Summary</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-600 bg-white text-[10px]">
                          {editModal.corrections.map((log, li) => (
                            <tr key={li} className="hover:bg-slate-50/50">
                              <td className="px-3 py-2 whitespace-nowrap text-slate-400">{log.timestamp}</td>
                              <td className="px-3 py-2 text-slate-700 font-bold">{log.changedBy}</td>
                              <td className="px-3 py-2">{log.reason}</td>
                              <td className="px-3 py-2 text-right">
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${log.type === 'delete' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                  {log.type === 'delete' ? 'Deleted' : 'Edited'}
                                </span>
                                <div className="text-[9px] text-slate-400 mt-0.5 truncate max-w-[120px]" title={`Prev: ${log.previous}`}>
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

              {editError && <p className="text-sm text-red-500 bg-red-50 px-3 py-2.5 rounded-xl border border-red-200">{editError}</p>}

              <div className="flex gap-4 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => { setEditModal(null); setEditNewItems([]); setEditNewDate(''); setEditNewTxns([]); setEditGst(false); }}
                  className="flex-1 py-3 border border-slate-200 rounded-2xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-colors">Cancel</button>
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
                <label className="block font-bold text-slate-500 uppercase tracking-wide">Payment Method *</label>
                <select 
                  required
                  value={editReceiptForm.method} 
                  onChange={(e) => setEditReceiptForm(f => ({ ...f, method: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white font-medium text-slate-700"
                >
                  <option value="cash">💵 Cash</option>
                  <option value="upi">⚡ UPI</option>
                  <option value="bank_transfer">🏦 Bank Transfer</option>
                  <option value="cheque">✍️ Cheque</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-slate-500 uppercase tracking-wide">Amount *</label>
                <input 
                  type="number" 
                  min="1" 
                  required 
                  value={editReceiptForm.amount} 
                  onChange={(e) => setEditReceiptForm(f => ({ ...f, amount: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-slate-500 uppercase tracking-wide">Payment Date *</label>
                <input 
                  type="date" 
                  required 
                  value={editReceiptForm.date} 
                  onChange={(e) => setEditReceiptForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-slate-500 uppercase tracking-wide">Reference Number (Optional)</label>
                <input 
                  type="text" 
                  value={editReceiptForm.referenceNumber} 
                  onChange={(e) => setEditReceiptForm(f => ({ ...f, referenceNumber: e.target.value }))}
                  placeholder="e.g. UPI Transaction ID or Cheque No."
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-slate-500 uppercase tracking-wide">Notes (Optional)</label>
                <textarea 
                  rows={2} 
                  value={editReceiptForm.notes} 
                  onChange={(e) => setEditReceiptForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" 
                />
              </div>

              {/* Mandatory Correction Reason */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block font-bold text-red-600 uppercase tracking-wide">Correction Reason *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-slate-600">
                  {[
                    'Wrong Payment Method',
                    'Wrong Amount',
                    'Wrong Date',
                    'Duplicate Entry',
                    'Data Entry Mistake',
                    'Customer Request',
                    'Other'
                  ].map((r) => (
                    <label key={r} className="flex items-center gap-2 cursor-pointer p-2 border border-slate-150 rounded-xl hover:bg-slate-50">
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
                  <label className="block font-bold text-slate-500 uppercase tracking-wide">Correction Notes *</label>
                  <textarea 
                    rows={2} 
                    required 
                    value={correctionNotes} 
                    onChange={(e) => setCorrectionNotes(e.target.value)}
                    placeholder="Provide detailed correction details..."
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none bg-white" 
                  />
                </div>
              )}
            </div>

            {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}
            
            <div className="flex gap-4 pt-3 border-t border-slate-100">
              <button type="button" onClick={() => setReceiptToEdit(null)} className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
              <button type="submit" disabled={saving || !correctionReason || (correctionReason === 'Other' && !correctionNotes.trim())} className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2">
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
            <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-2xl text-xs font-semibold leading-relaxed">
              ⚠️ <strong>Warning:</strong> This action will affect dues and payment calculations. The invoice's outstanding amount will increase by <strong>{fmt(receiptToDelete.amount)}</strong>.
            </div>

            <form onSubmit={handleSaveDeleteReceipt} className="space-y-4">
              <div className="flex flex-col gap-3.5 text-xs">
                <div className="space-y-2">
                  <label className="block font-bold text-slate-500 uppercase tracking-wide">Select Reason for Deletion *</label>
                  <div className="grid grid-cols-1 gap-2 font-semibold text-slate-600">
                    {[
                      'Duplicate Entry',
                      'Wrong Receipt',
                      'Testing Entry',
                      'Other'
                    ].map((r) => (
                      <label key={r} className="flex items-center gap-2 cursor-pointer p-2 border border-slate-150 rounded-xl hover:bg-slate-50">
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
                    <label className="block font-bold text-slate-500 uppercase tracking-wide">Deletion Notes *</label>
                    <textarea 
                      rows={2} 
                      required 
                      value={deleteNotes} 
                      onChange={(e) => setDeleteNotes(e.target.value)}
                      placeholder="Provide detailed deletion notes..."
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none bg-white" 
                    />
                  </div>
                )}
              </div>

              {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}
              
              <div className="flex gap-4 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setReceiptToDelete(null)} className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" disabled={saving || !deleteReason || (deleteReason === 'Other' && !deleteNotes.trim())} className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2">
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
            <p className="text-xs text-slate-500 font-medium">
              Audit log trace for invoice: <span className="font-bold text-slate-800">{viewReceiptHistorySale.buyerName}</span> (ID: {viewReceiptHistorySale.id.slice(0, 8)})
            </p>

            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
              {!viewReceiptHistorySale.corrections || viewReceiptHistorySale.corrections.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed text-slate-400 text-xs font-semibold">
                  📋 No receipt corrections or audit trail logged yet for this invoice.
                </div>
              ) : (
                <div className="relative border-l-2 border-slate-150 pl-4 ml-2 space-y-6 py-2">
                  {viewReceiptHistorySale.corrections.map((log, idx) => {
                    const isDelete = log.type === 'delete';
                    return (
                      <div key={idx} className="relative space-y-1.5">
                        {/* Dot icon */}
                        <span className={`absolute -left-[23px] top-1 w-2.5 h-2.5 rounded-full ring-4 ring-white ${isDelete ? 'bg-rose-500' : 'bg-blue-500'}`} />
                        
                        <div className="flex items-center justify-between gap-3 text-[10px] text-slate-400 font-semibold">
                          <span>{log.timestamp}</span>
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">By: {log.changedBy}</span>
                        </div>
                        
                        <div className="bg-slate-50/70 border border-slate-150 rounded-2xl p-3.5 text-xs text-slate-700 font-medium leading-relaxed space-y-2">
                          <p className="font-extrabold text-slate-800 text-[11px]">
                            {isDelete ? '❌ Receipt Deletion Log' : '✏️ Receipt Edit Log'}
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
                            <div>
                              <span className="text-slate-400 block uppercase font-bold text-[8px]">Reason</span>
                              <span className="font-bold text-slate-800">{log.reason}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block uppercase font-bold text-[8px]">Operator</span>
                              <span className="font-bold text-slate-800">{log.changedBy}</span>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-200/50 text-[10px] space-y-1">
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

            <div className="pt-2 border-t flex justify-end">
              <button onClick={() => setViewReceiptHistorySale(null)} className="px-5 py-2.5 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-colors">
                Close Timeline
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
