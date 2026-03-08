import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Plus, Trash2, Store, X, Loader2, Search, Edit2, PlusCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const emptyItem = { productId: '', qty: '', amount: '' };
const today = () => new Date().toISOString().split('T')[0];
const emptyOrder = () => ({ date: today(), items: [{ ...emptyItem }] });
const emptyTxn = () => ({ amount: '', method: 'cash', date: today() });
const emptyForm = { buyerName: '', orders: [emptyOrder()], transactions: [], notes: '' };

const METHOD_COLORS = { cash: 'bg-green-100 text-green-700', upi: 'bg-blue-100 text-blue-700' };

function TxnRow({ txn, onChange, onRemove }) {
  return (
    <div className="flex items-center gap-2">
      <input type="number" min="0" value={txn.amount} onChange={(e) => onChange('amount', e.target.value)}
        className="w-32 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="₹ Amount" />
      <select value={txn.method} onChange={(e) => onChange('method', e.target.value)}
        className="w-28 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
        <option value="cash">Cash</option>
        <option value="upi">UPI</option>
      </select>
      <input type="date" value={txn.date} onChange={(e) => onChange('date', e.target.value)}
        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
      <button type="button" onClick={onRemove}
        className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors flex-shrink-0">
        <X size={15} />
      </button>
    </div>
  );
}

function ItemRow({ item, products, onProductChange, onQtyChange, onAmountChange, onRemove, showRemove }) {
  const selProd = products.find((p) => p.id === item.productId);
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <select value={item.productId} onChange={(e) => onProductChange(e.target.value)}
          className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
          <option value="">Select product…</option>
          {products.filter((p) => p.availableQty > 0).map((p) => (
            <option key={p.id} value={p.id}>{p.name} (Stock: {p.availableQty})</option>
          ))}
        </select>
        <input type="number" min="1" max={selProd?.availableQty || 9999} value={item.qty}
          onChange={(e) => onQtyChange(e.target.value)}
          className="w-20 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="Qty" />
        <input type="number" min="0" value={item.amount}
          onChange={(e) => onAmountChange(e.target.value)}
          className="w-28 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="₹ Amount" />
        {showRemove && (
          <button type="button" onClick={onRemove}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors flex-shrink-0">
            <X size={15} />
          </button>
        )}
      </div>
      {selProd && (
        <p className="text-xs text-slate-400 pl-1">
          Stock: <span className="font-semibold text-slate-600">{selProd.availableQty}</span>
          &nbsp;· Offline Price: <span className="font-semibold text-orange-600">₹{selProd.offlinePrice ?? selProd.unitPrice ?? 0}</span>
        </p>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 !m-0">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="px-6 py-5 max-h-[80vh] overflow-y-auto">{children}</div>
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
  const [editModal, setEditModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editNewItems, setEditNewItems] = useState([]);
  const [editNewDate, setEditNewDate] = useState('');
  const [editNewTxns, setEditNewTxns] = useState([]);
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

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
      items[ii] = { ...items[ii], productId, amount: unitPrice ? String(unitPrice * qty) : '' };
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
      items[ii] = { ...items[ii], qty, amount: unitPrice ? String(unitPrice * Number(qty)) : items[ii].amount };
      orders[oi] = { ...orders[oi], items };
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
      updated[idx] = { ...updated[idx], productId, amount: unitPrice ? String(unitPrice * qty) : '' };
      return updated;
    });
  }

  function handleEditItemQtyChange(idx, qty) {
    setEditNewItems((items) => {
      const updated = [...items];
      const p = products.find((x) => x.id === updated[idx].productId);
      const unitPrice = p ? (p.offlinePrice ?? p.unitPrice ?? 0) : 0;
      updated[idx] = { ...updated[idx], qty, amount: unitPrice ? String(unitPrice * Number(qty)) : updated[idx].amount };
      return updated;
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
    setSaving(true); setError('');
    try {
      const validTxns = form.transactions.filter((t) => t.amount);
      const payload = {
        buyerName: form.buyerName, items: allItems, totalAmount: computedTotal,
        transactions: validTxns, amountReceived: totalReceived, notes: form.notes,
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
        newTransactions: validNewTxns.length > 0 ? validNewTxns : undefined,
        newItems: validNewItems.length > 0 ? validNewItems : undefined,
        newItemsDate: editNewDate || new Date().toISOString().split('T')[0],
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

  // ── Filter & summary ───────────────────────────────────────
  const filtered = sales.filter((s) =>
    !search ||
    (s.items ? s.items.some((i) => i.productName?.toLowerCase().includes(search.toLowerCase())) : s.productName?.toLowerCase().includes(search.toLowerCase())) ||
    s.buyerName.toLowerCase().includes(search.toLowerCase())
  );

  const summaryRevenue = sales.reduce((s, x) => s + x.totalAmount, 0);
  const summaryReceived = sales.reduce((s, x) => s + x.amountReceived, 0);
  const summaryPending = sales.reduce((s, x) => s + x.amountLeft, 0);
  const summaryUpi = sales.reduce((s, x) => s + (x.transactions || []).filter((t) => t.method === 'upi').reduce((a, t) => a + (Number(t.amount) || 0), 0), 0);
  const summaryCash = sales.reduce((s, x) => s + (x.transactions || []).filter((t) => t.method === 'cash').reduce((a, t) => a + (Number(t.amount) || 0), 0), 0);

  // ── Helpers ────────────────────────────────────────────────
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

  function productCell(s) {
    const groups = getOrderGroups(s);
    return (
      <div className="space-y-2">
        {groups.map(([date, items]) => (
          <div key={date}>
            <p className="text-xs font-medium text-slate-400 mb-0.5">{date}</p>
            {items.map((item, i) => (
              <div key={i} className="text-sm text-slate-800">
                {item.productName} <span className="text-slate-400 text-xs">×{item.qty}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  function receivedCell(s) {
    const txns = s.transactions || [];
    if (txns.length === 0) return <span className="text-green-600 font-medium">₹{s.amountReceived}</span>;
    return (
      <div className="space-y-1">
        {txns.map((t, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium uppercase ${METHOD_COLORS[t.method] || 'bg-slate-100 text-slate-600'}`}>{t.method}</span>
            <span className="text-sm text-green-600 font-medium">₹{t.amount}</span>
            {t.date && <span className="text-xs text-slate-400">{t.date}</span>}
          </div>
        ))}
      </div>
    );
  }

  function totalQty(s) {
    if (s.items) return s.items.reduce((t, i) => t + Number(i.qty), 0);
    return s.qty;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Offline Sales</h1>
          <p className="text-slate-500 text-sm">{sales.length} total entries</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by product or buyer…"
              className="w-[400px] pl-8 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500" />
          </div>
          <button onClick={() => { setForm(emptyForm); setError(''); setShowModal(true); }}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap">
            <Plus size={16} /> Log Sale
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-500 font-medium">Total Revenue</p>
          <p className="text-xl font-bold text-slate-800 mt-1">₹{summaryRevenue.toFixed(0)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-500 font-medium">Amount Received</p>
          <p className="text-xl font-bold text-green-600 mt-1">₹{summaryReceived.toFixed(0)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-500 font-medium">Pending / Due</p>
          <p className="text-xl font-bold text-red-500 mt-1">₹{summaryPending.toFixed(0)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-500 font-medium">Received via UPI</p>
          <p className="text-xl font-bold text-blue-600 mt-1">₹{summaryUpi.toFixed(0)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-500 font-medium">Received via Cash</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">₹{summaryCash.toFixed(0)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 size={24} className="animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-slate-400">
            <Store size={40} className="mb-3 opacity-40" />
            <p className="text-sm">No offline sales logged yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b">
                  {['Products', 'Buyer / Shop', 'Total Qty', 'Total Amt', 'Received', 'Pending', 'Status', ''].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">{productCell(s)}</td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{s.buyerName}</td>
                    <td className="px-4 py-3 text-slate-600">{totalQty(s)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">₹{s.totalAmount}</td>
                    <td className="px-4 py-3">{receivedCell(s)}</td>
                    <td className="px-4 py-3 font-medium text-red-500 whitespace-nowrap">₹{s.amountLeft}</td>
                    <td className="px-4 py-3">
                      {s.amountLeft === 0
                        ? <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-600">Paid</span>
                        : <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600">Pending</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditModal(s); setEditNewItems([]); setEditNewDate(new Date().toISOString().split('T')[0]); setEditNewTxns([]); setEditError(''); }}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"><Edit2 size={14} /></button>
                        <button onClick={() => handleDelete(s.id)} disabled={user?.role === 'employee'} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Sale Modal */}
      {showModal && (
        <Modal title="Log Offline Sale" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Buyer */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Buyer / Company / Shop Name *</label>
              <select required value={form.buyerName} onChange={(e) => setForm((f) => ({ ...f, buyerName: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                <option value="">Select shop…</option>
                {shops.map((s) => (
                  <option key={s.id} value={s.name}>{s.name}{s.mobile ? ` — ${s.mobile}` : ''}</option>
                ))}
              </select>
            </div>

            {/* Orders */}
            <div className="space-y-3">
              <label className="block text-xs font-medium text-slate-600">Orders *</label>
              {form.orders.map((order, oi) => (
                <div key={oi} className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between gap-2 bg-slate-50 px-3 py-2 border-b border-slate-200">
                    <span className="text-xs font-semibold text-slate-500 flex-shrink-0">Order {oi + 1}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-500">Date</span>
                      <input type="date" value={order.date} onChange={(e) => setOrderDate(oi, e.target.value)}
                        className="px-2 py-1 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-red-500" />
                      {form.orders.length > 1 && (
                        <button type="button" onClick={() => removeOrder(oi)}
                          className="p-1 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="p-3 space-y-2">
                    {order.items.map((item, ii) => (
                      <ItemRow key={ii} item={item} products={products}
                        onProductChange={(v) => handleItemProductChange(oi, ii, v)}
                        onQtyChange={(v) => handleItemQtyChange(oi, ii, v)}
                        onAmountChange={(v) => handleItemAmountChange(oi, ii, v)}
                        onRemove={() => removeItemFromOrder(oi, ii)}
                        showRemove={order.items.length > 1}
                      />
                    ))}
                    <button type="button" onClick={() => addItemToOrder(oi)}
                      className="flex items-center gap-1.5 text-red-600 hover:text-red-700 text-xs font-medium transition-colors">
                      <PlusCircle size={13} /> Add product to this order
                    </button>
                  </div>
                </div>
              ))}
              <button type="button" onClick={addOrder}
                className="flex items-center gap-1.5 text-red-600 hover:text-red-700 text-sm font-medium transition-colors">
                <PlusCircle size={16} /> Add another order (different date)
              </button>
            </div>

            {/* Total */}
            <div className="bg-slate-50 rounded-xl px-4 py-3 flex justify-between text-sm font-semibold text-slate-700">
              <span>Total Amount</span>
              <span>₹{computedTotal.toFixed(0)}</span>
            </div>

            {/* Transactions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-slate-600">Received Payments</label>
                <button type="button" onClick={addTxn}
                  className="flex items-center gap-1 text-red-600 hover:text-red-700 text-xs font-medium transition-colors">
                  <PlusCircle size={13} /> Add transaction
                </button>
              </div>
              {form.transactions.length === 0 ? (
                <p className="text-xs text-slate-400">No payments recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {form.transactions.map((txn, ti) => (
                    <TxnRow key={ti} txn={txn} onChange={(k, v) => updateTxn(ti, k, v)} onRemove={() => removeTxn(ti)} />
                  ))}
                </div>
              )}
              {form.transactions.length > 0 && (
                <div className={`mt-2 flex justify-between px-4 py-2.5 rounded-xl text-sm font-medium ${amountLeft > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                  <span>Received: ₹{totalReceived.toFixed(0)} · Pending:</span>
                  <span>₹{amountLeft.toFixed(0)}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
              <textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" placeholder="Optional notes…" />
            </div>

            {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-medium rounded-xl flex items-center justify-center gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />} Log Sale
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
          <Modal title={`Edit Sale — ${editModal.buyerName}`} onClose={() => { setEditModal(null); setEditNewItems([]); setEditNewDate(''); setEditNewTxns([]); }}>
            <form onSubmit={handleUpdatePayment} className="space-y-4">

              {/* Existing orders (read-only) */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">Current Orders</label>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  {(() => {
                    const src = editModal.items || [{ productName: editModal.productName, qty: editModal.qty, amount: editModal.totalAmount, date: editModal.date }];
                    const groups = {};
                    for (const item of src) {
                      const d = item.date || editModal.date || '—';
                      if (!groups[d]) groups[d] = [];
                      groups[d].push(item);
                    }
                    return Object.entries(groups).map(([date, items], gi) => (
                      <div key={date} className={gi > 0 ? 'border-t border-slate-200' : ''}>
                        <div className="bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500">{date}</div>
                        {items.map((item, i) => (
                          <div key={i} className="flex items-center justify-between px-3 py-2 text-sm border-t border-slate-100 first:border-0">
                            <span className="text-slate-700 font-medium">{item.productName}</span>
                            <div className="flex items-center gap-3 text-slate-500">
                              <span>×{item.qty}</span>
                              <span className="font-semibold text-slate-700">₹{item.amount}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Add new order */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">Add New Order</label>
                {editNewItems.length === 0 ? (
                  <button type="button" onClick={addEditItem}
                    className="flex items-center gap-1.5 text-red-600 hover:text-red-700 text-sm font-medium transition-colors">
                    <PlusCircle size={16} /> Add product
                  </button>
                ) : (
                  <div className="space-y-2">
                    {editNewItems.map((item, idx) => {
                      const selProd = products.find((p) => p.id === item.productId);
                      return (
                        <div key={idx} className="border border-red-200 rounded-xl p-3 space-y-2 bg-red-50/30">
                          <div className="flex items-center gap-2">
                            <select value={item.productId} onChange={(e) => handleEditItemProductChange(idx, e.target.value)}
                              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white">
                              <option value="">Select product…</option>
                              {products.filter((p) => p.availableQty > 0).map((p) => (
                                <option key={p.id} value={p.id}>{p.name} (Stock: {p.availableQty})</option>
                              ))}
                            </select>
                            <input type="number" min="1" max={selProd?.availableQty || 9999} value={item.qty}
                              onChange={(e) => handleEditItemQtyChange(idx, e.target.value)}
                              className="w-20 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white" placeholder="Qty" />
                            <input type="number" min="0" value={item.amount}
                              onChange={(e) => handleEditItemAmountChange(idx, e.target.value)}
                              className="w-28 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white" placeholder="₹ Amt" />
                            <button type="button" onClick={() => removeEditItem(idx)}
                              className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors flex-shrink-0">
                              <X size={15} />
                            </button>
                          </div>
                          {selProd && (
                            <p className="text-xs text-slate-400">
                              Stock: <span className="font-semibold text-slate-600">{selProd.availableQty}</span>
                              &nbsp;· Offline Price: <span className="font-semibold text-orange-600">₹{selProd.offlinePrice ?? selProd.unitPrice ?? 0}</span>
                            </p>
                          )}
                        </div>
                      );
                    })}
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-slate-600 whitespace-nowrap">Order Date</label>
                      <input type="date" value={editNewDate} onChange={(e) => setEditNewDate(e.target.value)}
                        className="flex-1 px-3 py-2 border border-red-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500" />
                    </div>
                    <button type="button" onClick={addEditItem}
                      className="flex items-center gap-1.5 text-red-600 hover:text-red-700 text-sm font-medium transition-colors">
                      <PlusCircle size={16} /> Add another product
                    </button>
                  </div>
                )}
              </div>

              {/* Updated total */}
              <div className="bg-slate-50 rounded-xl px-4 py-3 flex justify-between text-sm font-semibold text-slate-700">
                <span>Total Amount</span>
                <span>₹{updatedTotal.toFixed(0)}</span>
              </div>

              {/* Existing transactions (read-only) */}
              {(editModal.transactions || []).length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-2">Previous Payments</label>
                  <div className="border border-slate-200 rounded-xl divide-y overflow-hidden">
                    {editModal.transactions.map((t, i) => (
                      <div key={i} className="flex items-center gap-3 px-3 py-2 text-sm">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium uppercase ${METHOD_COLORS[t.method] || 'bg-slate-100 text-slate-600'}`}>{t.method}</span>
                        <span className="font-semibold text-slate-700">₹{t.amount}</span>
                        {t.date && <span className="text-slate-400 text-xs">{t.date}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add new transactions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-slate-600">Add Payment</label>
                  <button type="button" onClick={addEditTxn}
                    className="flex items-center gap-1 text-red-600 hover:text-red-700 text-xs font-medium transition-colors">
                    <PlusCircle size={13} /> Add transaction
                  </button>
                </div>
                {editNewTxns.length > 0 && (
                  <div className="space-y-2">
                    {editNewTxns.map((txn, ti) => (
                      <TxnRow key={ti} txn={txn} onChange={(k, v) => updateEditTxn(ti, k, v)} onRemove={() => removeEditTxn(ti)} />
                    ))}
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className={`flex justify-between px-4 py-2.5 rounded-xl text-sm font-medium ${updatedPending > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                <span>Received: ₹{updatedReceived.toFixed(0)} · Pending:</span>
                <span>₹{updatedPending.toFixed(0)}</span>
              </div>

              {editError && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{editError}</p>}

              <div className="flex gap-3">
                <button type="button" onClick={() => { setEditModal(null); setEditNewItems([]); setEditNewDate(''); setEditNewTxns([]); }}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-medium rounded-xl flex items-center justify-center gap-2">
                  {saving && <Loader2 size={14} className="animate-spin" />} Save Changes
                </button>
              </div>
            </form>
          </Modal>
        );
      })()}
    </div>
  );
}
