import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Plus, Pencil, Trash2, Search, X, Loader2, Package } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const empty = { name: '', description: '', qty: '', offlinePrice: '', onlinePrice: '' };

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 !m-0">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export default function Products() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function load() {
    api.getProducts().then(setProducts).catch(console.error).finally(() => setLoading(false));
  }
  useEffect(load, []);

  function openAdd() { setForm(empty); setEditing(null); setError(''); setShowModal(true); }
  function openEdit(p) {
    setForm({
      name: p.name,
      description: p.description,
      qty: p.totalQty,
      offlinePrice: p.offlinePrice ?? p.unitPrice ?? '',
      onlinePrice: p.onlinePrice ?? p.unitPrice ?? '',
    });
    setEditing(p);
    setError('');
    setShowModal(true);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this product?')) return;
    await api.deleteProduct(id);
    setProducts((ps) => ps.filter((p) => p.id !== id));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const payload = {
        name: form.name,
        description: form.description,
        totalQty: form.qty,
        availableQty: form.qty,
        unitPrice: form.offlinePrice,
        offlinePrice: form.offlinePrice,
        onlinePrice: form.onlinePrice,
      };
      if (editing) {
        // keep availableQty relative to qty change
        const diff = Number(form.qty) - editing.totalQty;
        payload.availableQty = Math.max(0, editing.availableQty + diff);
        const updated = await api.updateProduct(editing.id, payload);
        setProducts((ps) => ps.map((p) => (p.id === editing.id ? updated : p)));
      } else {
        const added = await api.addProduct(payload);
        setProducts((ps) => [added, ...ps]);
      }
      setShowModal(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  function stockBadge(qty) {
    if (qty === 0) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">Out of stock</span>;
    if (qty < 20) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-600">Low stock</span>;
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-600">In stock</span>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Products</h1>
          <p className="text-slate-500 text-sm">{products.length} products total</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products…"
              className="w-[400px] pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap">
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 size={24} className="animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-slate-400">
            <Package size={40} className="mb-3 opacity-40" />
            <p className="text-sm">{search ? 'No products match your search' : 'No products yet. Add your first product!'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b">
                  {['Product', 'Qty', 'Offline Price', 'Online Price', 'Status', ''].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{p.totalQty}</td>
                    <td className="px-4 py-3 text-orange-600 font-medium">₹{p.offlinePrice ?? p.unitPrice ?? 0}</td>
                    <td className="px-4 py-3 text-purple-600 font-medium">₹{p.onlinePrice ?? p.unitPrice ?? 0}</td>
                    <td className="px-4 py-3">{stockBadge(p.totalQty)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"><Pencil size={15} /></button>
                        <button onClick={() => handleDelete(p.id)} disabled={user?.role === 'employee'} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <Modal title={editing ? 'Edit Product' : 'Add Product'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Product Name *</label>
                <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="e.g. Power Strip" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Quantity *</label>
                <input required type="number" min="0" value={form.qty} onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="100" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  <span className="text-orange-500">Offline</span> Price (₹)
                </label>
                <input type="number" min="0" value={form.offlinePrice} onChange={(e) => setForm((f) => ({ ...f, offlinePrice: e.target.value }))}
                  className="w-full px-3 py-2 border border-orange-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder="0" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  <span className="text-purple-500">Online</span> Price (₹)
                </label>
                <input type="number" min="0" value={form.onlinePrice} onChange={(e) => setForm((f) => ({ ...f, onlinePrice: e.target.value }))}
                  className="w-full px-3 py-2 border border-purple-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" placeholder="0" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                <textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" placeholder="Optional description…" />
              </div>
            </div>
            {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />}
                {editing ? 'Update' : 'Add Product'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
