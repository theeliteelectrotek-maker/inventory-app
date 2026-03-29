import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Plus, Trash2, ShoppingCart, X, Loader2, Search, PlusCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PLATFORMS = [
  { id: 'amazon', label: 'Amazon', color: 'bg-orange-500', light: 'bg-orange-100 text-orange-700' },
  { id: 'flipkart', label: 'Flipkart', color: 'bg-blue-500', light: 'bg-blue-100 text-blue-700' },
  { id: 'meesho', label: 'Meesho', color: 'bg-pink-500', light: 'bg-pink-100 text-pink-700' },
];

const today = () => new Date().toISOString().split('T')[0];
const emptyItem = { productId: '', qty: 1, amount: '' };
const emptyForm = () => ({ items: [{ ...emptyItem }], platform: '', orderId: '', date: today(), notes: '' });

function Modal({ onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 !m-0">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-semibold text-slate-800">Log Online Sale</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="px-6 py-5 overflow-auto max-h-[80vh]">{children}</div>
      </div>
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
      .then(([s, p]) => { setSales(s.reverse()); setProducts(p); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  function handleItemProductChange(index, productId) {
    const p = products.find((x) => x.id === productId);
    const unitPrice = p ? (p.onlinePrice ?? p.unitPrice ?? 0) : 0;
    setForm((f) => {
      const items = [...f.items];
      const qty = Number(items[index].qty) || 1;
      items[index] = { ...items[index], productId, amount: unitPrice ? String(unitPrice * qty) : '' };
      return { ...f, items };
    });
  }

  function handleItemQtyChange(index, qtyVal) {
    const qty = Math.max(1, Number(qtyVal) || 1);
    setForm((f) => {
      const items = [...f.items];
      const p = products.find((x) => x.id === items[index].productId);
      const unitPrice = p ? (p.onlinePrice ?? p.unitPrice ?? 0) : 0;
      items[index] = { ...items[index], qty, amount: unitPrice ? String(unitPrice * qty) : items[index].amount };
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

  const filtered = sales.filter((s) => {
    const matchPlatform = filter === 'all' || s.platform === filter;
    const matchSearch = !search || s.productName.toLowerCase().includes(search.toLowerCase()) || s.orderId.toLowerCase().includes(search.toLowerCase());
    return matchPlatform && matchSearch;
  });

  const totals = { amazon: 0, flipkart: 0, meesho: 0 };
  sales.forEach((s) => { if (totals[s.platform] !== undefined) totals[s.platform] += s.amount; });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Online Sales</h1>
          <p className="text-slate-500 text-sm">{sales.length} total entries</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1">
            {['all', ...PLATFORMS.map((p) => p.id)].map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${filter === f ? 'bg-red-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}>
                {f === 'all' ? 'All' : PLATFORMS.find((p) => p.id === f)?.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…"
              className="w-[400px] pl-8 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500" />
          </div>
          <button onClick={() => { setForm(emptyForm()); setError(''); setShowModal(true); }}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap">
            <Plus size={16} /> Log Sale
          </button>
        </div>
      </div>

      {/* Platform summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {PLATFORMS.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-3 h-3 rounded-full ${p.color}`} />
              <span className="text-sm font-medium text-slate-700">{p.label}</span>
            </div>
            <p className="text-xl font-bold text-slate-800">₹{totals[p.id].toFixed(0)}</p>
            <p className="text-xs text-slate-400">{sales.filter((s) => s.platform === p.id).length} orders</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 size={24} className="animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-slate-400">
            <ShoppingCart size={40} className="mb-3 opacity-40" />
            <p className="text-sm">No online sales logged yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b">
                  {['Date', 'Product', 'Platform', 'Order ID', 'Qty', 'Amount', ''].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((s) => {
                  const pl = PLATFORMS.find((p) => p.id === s.platform);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-500">{s.date}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{s.productName}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${pl?.light || 'bg-slate-100 text-slate-600'}`}>{s.platform}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">{s.orderId || '—'}</td>
                      <td className="px-4 py-3 text-slate-700">{s.qty}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">₹{s.amount}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleDelete(s.id)} disabled={user?.role === 'employee'} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Platform selector */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2">Platform *</label>
              <div className="grid grid-cols-3 gap-2">
                {PLATFORMS.map((p) => (
                  <button key={p.id} type="button" onClick={() => setForm((f) => ({ ...f, platform: p.id }))}
                    className={`py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${form.platform === p.id ? `${p.color} text-white border-transparent` : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-3">
              <label className="block text-xs font-medium text-slate-600">Products *</label>
              {form.items.map((item, idx) => {
                const selProd = products.find((p) => p.id === item.productId);
                return (
                  <div key={idx} className="p-3 border border-slate-200 rounded-xl space-y-2 bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <select required value={item.productId} onChange={(e) => handleItemProductChange(idx, e.target.value)}
                        className="w-full px-2 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white">
                        <option value="">Select product…</option>
                        {products.filter((p) => p.availableQty > 0 || p.id === item.productId).map((p) => (
                          <option key={p.id} value={p.id}>{p.name} (Stock: {p.availableQty})</option>
                        ))}
                      </select>

                      <input required type="number" min="1" max={selProd?.availableQty || 9999} value={item.qty}
                        onChange={(e) => handleItemQtyChange(idx, e.target.value)}
                        className="w-16 h-[36.5px] px-2 py-1 border border-slate-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="1" />

                      <div className="flex items-center gap-2 flex-1">
                        <input required type="number" min="0" value={item.amount}
                          onChange={(e) => handleItemAmountChange(idx, e.target.value)}
                          className="w-20 h-[36.5px]  px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white" placeholder="Amount (₹)" />
                      </div>

                      {form.items.length > 1 && (
                        <button type="button" onClick={() => removeItem(idx)}
                          className="rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors flex-shrink-0">
                          <X size={15} />
                        </button>
                      )}
                    </div>

                    {selProd && (
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Stock: <span className="font-semibold text-slate-600">{selProd.availableQty}</span></span>
                        <span>Unedited Price: <span className="font-semibold text-red-600">₹{selProd.onlinePrice ?? selProd.unitPrice ?? 0}</span></span>
                      </div>
                    )}
                  </div>
                );
              })}
              <button type="button" onClick={addItem}
                className="flex items-center gap-1.5 text-red-600 hover:text-red-700 text-sm font-medium transition-colors">
                <PlusCircle size={16} /> Add another product
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Order ID</label>
                <input value={form.orderId} onChange={(e) => setForm((f) => ({ ...f, orderId: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="ORD-123" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
                <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
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
    </div>
  );
}
