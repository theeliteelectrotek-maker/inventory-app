import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Plus, Pencil, Trash2, X, Loader2, Search, Building2, Phone, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const empty = { name: '', address: '', mobile: '' };

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

function shopStats(shopName, offlineSales) {
  const sales = offlineSales.filter((s) => s.buyerName === shopName);
  const totalSales = sales.length;
  const totalAmount = sales.reduce((s, x) => s + (x.totalAmount || 0), 0);
  const amountReceived = sales.reduce((s, x) => s + (x.amountReceived || 0), 0);
  const amountPending = sales.reduce((s, x) => s + (x.amountLeft || 0), 0);
  let upi = 0, cash = 0;
  for (const sale of sales) {
    for (const t of sale.transactions || []) {
      if (t.method === 'upi') upi += Number(t.amount) || 0;
      else cash += Number(t.amount) || 0;
    }
  }
  return { totalSales, totalAmount, amountReceived, amountPending, upi, cash };
}

export default function Shops() {
  const { user } = useAuth();
  const [shops, setShops] = useState([]);
  const [offlineSales, setOfflineSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.getShops(), api.getOfflineSales()])
      .then(([s, os]) => { setShops(s); setOfflineSales(os); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function openAdd() { setForm(empty); setEditing(null); setError(''); setShowModal(true); }
  function openEdit(s) { setForm({ name: s.name, address: s.address, mobile: s.mobile }); setEditing(s); setError(''); setShowModal(true); }

  async function handleDelete(id) {
    if (!confirm('Delete this shop?')) return;
    await api.deleteShop(id);
    setShops((ss) => ss.filter((s) => s.id !== id));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (editing) {
        const updated = await api.updateShop(editing.id, form);
        setShops((ss) => ss.map((s) => s.id === editing.id ? updated : s));
      } else {
        const added = await api.addShop(form);
        setShops((ss) => [added, ...ss]);
      }
      setShowModal(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const filtered = shops.filter((s) =>
    !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.mobile.includes(search) ||
    s.address.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Shops</h1>
          <p className="text-slate-500 text-sm">{shops.length} shops total</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search shops…"
              className="w-[400px] pl-8 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500" />
          </div>
          <button onClick={openAdd}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap">
            <Plus size={16} /> Add Shop
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 size={24} className="animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-slate-400">
            <Building2 size={40} className="mb-3 opacity-40" />
            <p className="text-sm">{search ? 'No shops match your search' : 'No shops yet. Add your first shop!'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b">
                  {['Shop Name', 'Mobile', 'Address', 'Total Sales', 'Total Amt', 'Received', 'Pending', 'UPI', 'Cash', ''].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((s) => {
                  const st = shopStats(s.name, offlineSales);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                            <Building2 size={15} className="text-red-600" />
                          </div>
                          <span className="font-medium text-slate-800">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {s.mobile ? (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Phone size={13} className="text-slate-400" />
                            {s.mobile}
                          </div>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {s.address ? (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <MapPin size={13} className="text-slate-400 flex-shrink-0" />
                            <span className="max-w-xs truncate">{s.address}</span>
                          </div>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-medium">{st.totalSales || <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">{st.totalAmount ? `₹${st.totalAmount}` : <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3 font-medium text-green-600 whitespace-nowrap">{st.amountReceived ? `₹${st.amountReceived}` : <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3 font-medium text-red-500 whitespace-nowrap">{st.amountPending ? `₹${st.amountPending}` : <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {st.upi ? <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">₹{st.upi}</span> : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {st.cash ? <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">₹{st.cash}</span> : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"><Pencil size={15} /></button>
                          <button onClick={() => handleDelete(s.id)} disabled={user?.role === 'employee'} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <Modal title={editing ? 'Edit Shop' : 'Add Shop'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Shop Name *</label>
              <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="e.g. Sharma Electronics" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Mobile Number</label>
              <input value={form.mobile} onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="e.g. 9876543210" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Address</label>
              <textarea rows={2} value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" placeholder="e.g. 12, Market Road, Delhi" />
            </div>
            {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-medium rounded-xl flex items-center justify-center gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />}
                {editing ? 'Update' : 'Add Shop'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
