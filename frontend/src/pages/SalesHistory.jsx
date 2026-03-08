import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { History, ShoppingCart, Store, Loader2, Search, Calendar } from 'lucide-react';

const PLATFORM_COLORS = { amazon: 'bg-orange-100 text-orange-700', flipkart: 'bg-blue-100 text-blue-700', meesho: 'bg-pink-100 text-pink-700' };

export default function SalesHistory() {
  const [onlineSales, setOnlineSales] = useState([]);
  const [offlineSales, setOfflineSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all'); // 'all' | 'online' | 'offline'
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    Promise.all([api.getOnlineSales(), api.getOfflineSales()])
      .then(([o, f]) => { setOnlineSales(o); setOfflineSales(f); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Combine all for 'all' tab
  const allEntries = [
    ...onlineSales.map((s) => ({ ...s, type: 'online' })),
    ...offlineSales.map((s) => ({ ...s, type: 'offline' })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  function applyFilters(list) {
    return list.filter((s) => {
      const matchSearch = !search || s.productName.toLowerCase().includes(search.toLowerCase());
      const matchFrom = !dateFrom || s.date >= dateFrom;
      const matchTo = !dateTo || s.date <= dateTo;
      return matchSearch && matchFrom && matchTo;
    });
  }

  const displayList = applyFilters(
    tab === 'all' ? allEntries : tab === 'online' ? onlineSales.map((s) => ({ ...s, type: 'online' })) : offlineSales.map((s) => ({ ...s, type: 'offline' }))
  );

  const onlineTotal = applyFilters(onlineSales.map((s) => ({ ...s, type: 'online' }))).reduce((s, x) => s + x.amount, 0);
  const offlineTotal = applyFilters(offlineSales.map((s) => ({ ...s, type: 'offline' }))).reduce((s, x) => s + x.totalAmount, 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Sales History</h1>
        <p className="text-slate-500 text-sm">{onlineSales.length + offlineSales.length} total records</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingCart size={16} className="text-purple-600" />
            <span className="text-sm text-slate-500 font-medium">Online Revenue</span>
          </div>
          <p className="text-xl font-bold text-slate-800">₹{onlineTotal.toFixed(0)}</p>
          <p className="text-xs text-slate-400">{onlineSales.length} orders</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            <Store size={16} className="text-teal-600" />
            <span className="text-sm text-slate-500 font-medium">Offline Revenue</span>
          </div>
          <p className="text-xl font-bold text-slate-800">₹{offlineTotal.toFixed(0)}</p>
          <p className="text-xs text-slate-400">{offlineSales.length} orders</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            <History size={16} className="text-indigo-600" />
            <span className="text-sm text-slate-500 font-medium">Total Revenue</span>
          </div>
          <p className="text-xl font-bold text-slate-800">₹{(onlineTotal + offlineTotal).toFixed(0)}</p>
          <p className="text-xs text-slate-400">{onlineSales.length + offlineSales.length} orders</p>
        </div>
      </div>

      {/* Tabs + Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1">
          {[{ id: 'all', label: 'All' }, { id: 'online', label: 'Online' }, { id: 'offline', label: 'Offline' }].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search product…"
            className="pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={15} className="text-slate-400" />
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="py-2 px-3 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <span className="text-slate-400 text-sm">to</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="py-2 px-3 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 size={24} className="animate-spin" /></div>
        ) : displayList.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-slate-400">
            <History size={40} className="mb-3 opacity-40" />
            <p className="text-sm">No records found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b">
                  {['Date', 'Type', 'Product', 'Buyer/Platform', 'Qty', 'Amount', 'Status'].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {displayList.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500">{s.date}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.type === 'online' ? 'bg-purple-100 text-purple-700' : 'bg-teal-100 text-teal-700'}`}>
                        {s.type === 'online' ? 'Online' : 'Offline'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">{s.productName}</td>
                    <td className="px-4 py-3">
                      {s.type === 'online'
                        ? <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${PLATFORM_COLORS[s.platform] || 'bg-slate-100 text-slate-600'}`}>{s.platform}</span>
                        : <span className="text-slate-700">{s.buyerName}</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.qty}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      ₹{s.type === 'online' ? s.amount : s.totalAmount}
                    </td>
                    <td className="px-4 py-3">
                      {s.type === 'online'
                        ? <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-600">Completed</span>
                        : s.amountLeft === 0
                          ? <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-600">Paid</span>
                          : <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600">Due ₹{s.amountLeft}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
