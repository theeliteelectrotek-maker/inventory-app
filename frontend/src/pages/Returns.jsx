import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Plus, Trash2, X, Loader2, Search, Undo2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SearchableSelect from '../components/SearchableSelect';

const PLATFORMS = ['amazon', 'flipkart', 'meesho', 'shop'];
const PLATFORM_COLORS = {
  amazon: 'bg-orange-100 text-orange-700',
  flipkart: 'bg-blue-100 text-blue-700',
  meesho: 'bg-pink-100 text-pink-700',
  shop: 'bg-slate-100 text-slate-700',
};
const CONDITION_COLORS = {
  good: 'bg-green-100 text-green-700',
  broken: 'bg-red-100 text-red-700',
};

const today = () => new Date().toISOString().split('T')[0];
const emptyForm = () => ({ productId: '', platform: 'amazon', shopId: '', shopName: '', action: 'return', date: today(), condition: 'good', qty: '1', notes: '' });

function Modal({ onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 !m-0">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-semibold text-slate-800">Log Return</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export default function Returns() {
  const { user } = useAuth();
  const [returns, setReturns] = useState([]);
  const [products, setProducts] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([api.getReturns(), api.getProducts(), api.getShops()])
      .then(([r, p, s]) => { setReturns(r.reverse()); setProducts(p); setShops(s); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const ret = await api.addReturn(form);
      setReturns((rs) => [ret, ...rs]);
      if (form.condition === 'good' && form.action !== 'replace') {
        const q = Number(form.qty) || 1;
        setProducts((ps) => ps.map((p) =>
          p.id === form.productId ? { ...p, availableQty: p.availableQty + q, totalQty: p.totalQty + q } : p
        ));
      }
      setShowModal(false);
      setForm(emptyForm());
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this return?')) return;
    const ret = returns.find((r) => r.id === id);
    await api.deleteReturn(id);
    setReturns((rs) => rs.filter((r) => r.id !== id));
    if (ret?.condition === 'good' && ret?.action !== 'replace') {
      const q = Number(ret.qty) || 1;
      setProducts((ps) => ps.map((p) =>
        p.id === ret.productId ? { ...p, availableQty: p.availableQty - q, totalQty: p.totalQty - q } : p
      ));
    }
  }

  const filtered = returns.filter((r) =>
    !search ||
    r.productName?.toLowerCase().includes(search.toLowerCase()) ||
    r.platform?.toLowerCase().includes(search.toLowerCase())
  );

  const totalGood = returns.filter((r) => r.condition === 'good').length;
  const totalBroken = returns.filter((r) => r.condition === 'broken').length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Returns</h1>
          <p className="text-slate-500 text-sm">{returns.length} total returns</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by product or platform…"
              className="w-[400px] pl-8 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500" />
          </div>
          <button onClick={() => { setForm(emptyForm()); setError(''); setShowModal(true); }}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap">
            <Plus size={16} /> Log Return
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-500 font-medium">Total Returns</p>
          <p className="text-xl font-bold text-slate-800 mt-1">{returns.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-500 font-medium">Good Condition</p>
          <p className="text-xl font-bold text-green-600 mt-1">{totalGood}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-500 font-medium">Broken / Damaged</p>
          <p className="text-xl font-bold text-red-500 mt-1">{totalBroken}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 size={24} className="animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-slate-400">
            <Undo2 size={40} className="mb-3 opacity-40" />
            <p className="text-sm">{search ? 'No returns match your search' : 'No returns logged yet'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b">
                  {['Product', 'Platform', 'Qty', 'Date', 'Condition', 'Notes', ''].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{r.productName}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${PLATFORM_COLORS[r.platform] || 'bg-slate-100 text-slate-600'}`}>
                        {r.platform}{r.shopName ? ` - ${r.shopName}` : ''} {r.action === 'replace' ? '(Replace)' : ''}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-medium">{r.qty || 1}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{r.date}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${CONDITION_COLORS[r.condition] || 'bg-slate-100 text-slate-600'}`}>
                        {r.condition}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{r.notes || <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(r.id)} disabled={user?.role === 'employee'}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Platform *</label>
              <div className="flex gap-2">
                {PLATFORMS.map((p) => (
                  <button key={p} type="button" onClick={() => setForm((f) => ({ ...f, platform: p }))}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium capitalize border transition-colors ${
                      form.platform === p
                        ? `${PLATFORM_COLORS[p]} border-transparent`
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {form.platform === 'shop' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Select Shop *</label>
                  <select required value={form.shopId || ''} onChange={(e) => {
                    const sName = shops.find(s => s.id === e.target.value)?.name || '';
                    setForm((f) => ({ ...f, shopId: e.target.value, shopName: sName }));
                  }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                    <option value="">Select shop…</option>
                    {shops.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} {s.address ? `(${s.address})` : ''}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Action *</label>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                      <input type="radio" name="action" value="return" checked={form.action === 'return' || !form.action} 
                        onChange={() => setForm(f => ({ ...f, action: 'return' }))} 
                        className="text-red-600 focus:ring-red-500" />
                      Return (Restocks if good)
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                      <input type="radio" name="action" value="replace" checked={form.action === 'replace'} 
                        onChange={() => setForm(f => ({ ...f, action: 'replace' }))} 
                        className="text-red-600 focus:ring-red-500" />
                      Replace (Do not restock)
                    </label>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Product *</label>
              <SearchableSelect
                required
                value={form.productId}
                onChange={(val) => setForm((f) => ({ ...f, productId: val }))}
                placeholder="Select product…"
                options={products.map((p) => ({ value: p.id, label: p.name }))}
                className="w-full"
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-600 mb-1">Date *</label>
                <input type="date" required value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div className="w-28">
                <label className="block text-xs font-medium text-slate-600 mb-1">Qty *</label>
                <input type="number" min="1" required value={form.qty} onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="1" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Condition *</label>
              <div className="flex gap-3">
                {['good', 'broken'].map((c) => (
                  <button key={c} type="button" onClick={() => setForm((f) => ({ ...f, condition: c }))}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium capitalize border transition-colors ${
                      form.condition === c
                        ? `${CONDITION_COLORS[c]} border-transparent`
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}>
                    {c === 'good' ? 'Good (restocks inventory)' : 'Broken / Damaged'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
              <textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                placeholder="Optional notes…" />
            </div>

            {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-medium rounded-xl flex items-center justify-center gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />} Log Return
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
