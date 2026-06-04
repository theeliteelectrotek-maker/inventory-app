import React, { useEffect, useState } from 'react';
import { api } from '../api';
import {
  Plus, Pencil, Trash2, X, Loader2, Search, Building2, Phone, MapPin,
  IndianRupee, TrendingUp, AlertTriangle, Clock, CheckCircle2,
  Landmark, ChevronRight, FileText, Download, Upload, Percent, ShieldAlert
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useIsDarkMode } from '../context/ThemeContext';
import KPICardValue from '../components/KPICardValue';

// --- General Modal Component ---
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl shadow-2xl w-[95%] sm:w-full max-w-lg border border-slate-100 dark:border-[#334155] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#334155] bg-slate-50/50 dark:bg-slate-900/50">
          <h3 className="font-bold text-slate-805 dark:text-[#F8FAFC] text-base flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-650"></span>
            {title}
          </h3>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto max-h-[75vh] scrollbar-thin">{children}</div>
      </div>
    </div>
  );
}

export default function PurchasesFactories() {
  const { user } = useAuth();
  const isAdmin = user && (user.role === 'ADMIN' || user.role === 'admin' || user.username === 'admin');

  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'suppliers', 'purchases', 'payments', 'documents', 'audit'

  // Entities state
  const [suppliers, setSuppliers] = useState([]);
  const [archivedSuppliers, setArchivedSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [payments, setPayments] = useState([]);
  const [products, setProducts] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Search
  const [supplierSearch, setSupplierSearch] = useState('');
  const [purchaseSearch, setPurchaseSearch] = useState('');

  // View state
  const [showArchivedView, setShowArchivedView] = useState(false);

  // Modals visibility & items to delete
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedSupplierProfile, setSelectedSupplierProfile] = useState(null);
  const [editingSupplier, setEditingSupplier] = useState(null);

  // Deletion modals state
  const [supplierToDelete, setSupplierToDelete] = useState(null);
  const [paymentToDelete, setPaymentToDelete] = useState(null);
  const [paymentToEdit, setPaymentToEdit] = useState(null);
  const [editPaymentForm, setEditPaymentForm] = useState({ date: '', amount: '', paymentMethod: 'Cash', referenceNumber: '', category: 'GST', notes: '', reason: '' });
  const [purchaseToDelete, setPurchaseToDelete] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [showForceDeleteConfirm, setShowForceDeleteConfirm] = useState(false);
  const [typedSupplierName, setTypedSupplierName] = useState('');

  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Forms state
  const emptySupplier = { factoryName: '', ownerName: '', mobile: '', gstNumber: '', address: '' };
  const [supplierForm, setSupplierForm] = useState(emptySupplier);

  const emptyPurchase = {
    invoiceNumber: '', purchaseDate: new Date().toISOString().split('T')[0], supplierId: '',
    gstType: 'GST', paymentType: 'Credit', dueDate: '', transportCharges: 0, loadingCharges: 0, otherExpenses: 0,
    items: [{ productId: '', qty: 1, rate: 0, gstPercent: 18, discount: 0 }],
    invoiceFile: '', invoiceFileName: '', invoiceFileType: '', autoAdjustStock: true
  };
  const [purchaseForm, setPurchaseForm] = useState(emptyPurchase);

  const emptyPayment = {
    supplierId: '', date: new Date().toISOString().split('T')[0], amount: '',
    paymentMethod: 'Cash', referenceNumber: '', category: 'GST', notes: '', receiptFile: '', receiptFileName: ''
  };
  const [paymentForm, setPaymentForm] = useState(emptyPayment);

  // Mobile number validation logic
  const isMobileValid = (num) => {
    return /^\d{10}$/.test(num);
  };

  const getMobileValidationError = (num) => {
    if (!num) return '';
    if (!/^\d+$/.test(num)) return 'Mobile number must contain digits only';
    if (num.length !== 10) return `Mobile number must be exactly 10 digits (currently ${num.length})`;
    return '';
  };

  // Fetch all initial data
  const loadAllData = async () => {
    setLoading(true);
    try {
      const [sList, pList, payList, prodList, logList, statData, archList] = await Promise.all([
        api.getSuppliers(),
        api.getPurchases(),
        api.getSupplierPayments(),
        api.getProducts(),
        api.getPurchaseAuditLogs(),
        api.getPurchaseStats(),
        api.getArchivedSuppliers()
      ]);
      setSuppliers(sList);
      setPurchases(pList);
      setPayments(payList);
      setProducts(prodList);
      setAuditLogs(logList);
      setStats(statData);
      setArchivedSuppliers(archList || []);
    } catch (err) {
      console.error('Failed to load simplified purchases data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      api.getPurchaseStats().then(setStats).catch(console.error);
    }
  }, [activeTab]);

  // Handle supplier submits
  const handleSupplierSubmit = async (e) => {
    e.preventDefault();
    if (!isMobileValid(supplierForm.mobile)) {
      setFormError('Cannot save: Mobile number is invalid');
      return;
    }
    setFormSaving(true);
    setFormError('');
    try {
      if (editingSupplier) {
        await api.updateSupplier(editingSupplier.id, supplierForm);
      } else {
        await api.addSupplier(supplierForm);
      }
      setShowSupplierModal(false);
      loadAllData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormSaving(false);
    }
  };

  const openSupplierEdit = (s) => {
    setEditingSupplier(s);
    setSupplierForm({
      factoryName: s.factoryName,
      ownerName: s.ownerName,
      mobile: s.mobile,
      gstNumber: s.gstNumber || '',
      address: s.address
    });
    setFormError('');
    setShowSupplierModal(true);
  };

  const handleSupplierArchive = async (id, reason) => {
    try {
      await api.deleteSupplier(id, reason);
      loadAllData();
      setSupplierToDelete(null);
      setDeleteReason('');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSupplierDeletePermanent = async (id, reason) => {
    try {
      await api.deleteSupplierPermanent(id, reason);
      loadAllData();
      setSupplierToDelete(null);
      setDeleteReason('');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSupplierDeleteForce = async (id, reason) => {
    try {
      await api.deleteSupplierForce(id, reason);
      loadAllData();
      setSupplierToDelete(null);
      setDeleteReason('');
      setShowForceDeleteConfirm(false);
      setTypedSupplierName('');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSupplierRestore = async (id) => {
    try {
      await api.restoreSupplier(id);
      loadAllData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handlePaymentDelete = async (id, reason) => {
    try {
      await api.deleteSupplierPayment(id, reason);
      loadAllData();
      setPaymentToDelete(null);
      setDeleteReason('');
      // If we deleted payment from inside profile view, let's refresh selectedSupplierProfile
      if (selectedSupplierProfile) {
        const refreshed = suppliers.find(s => s.id === selectedSupplierProfile.id);
        if (refreshed) setSelectedSupplierProfile(refreshed);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handlePaymentEditSubmit = async (e) => {
    e.preventDefault();
    if (!paymentToEdit) return;
    try {
      await api.updateSupplierPayment(paymentToEdit.id, editPaymentForm);
      loadAllData();
      setPaymentToEdit(null);
      if (selectedSupplierProfile) {
        const refreshed = suppliers.find(s => s.id === selectedSupplierProfile.id);
        if (refreshed) setSelectedSupplierProfile(refreshed);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handlePurchaseDelete = async (id, reason) => {
    try {
      await api.deletePurchase(id, reason);
      loadAllData();
      setPurchaseToDelete(null);
      setDeleteReason('');
    } catch (err) {
      alert(err.message);
    }
  };

  // Convert File uploads to base64
  const handleFileChange = (e, formType) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (formType === 'purchase') {
        setPurchaseForm(prev => ({
          ...prev,
          invoiceFile: reader.result,
          invoiceFileName: file.name,
          invoiceFileType: file.type
        }));
      } else if (formType === 'payment') {
        setPaymentForm(prev => ({
          ...prev,
          receiptFile: reader.result,
          receiptFileName: file.name
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Purchase Form helpers
  const addPurchaseItemRow = () => {
    setPurchaseForm(prev => ({
      ...prev,
      items: [...prev.items, { productId: '', qty: 1, rate: 0, gstPercent: 18, discount: 0 }]
    }));
  };

  const removePurchaseItemRow = (idx) => {
    const updated = [...purchaseForm.items];
    updated.splice(idx, 1);
    setPurchaseForm(prev => ({ ...prev, items: updated }));
  };

  const updatePurchaseItem = (idx, field, val) => {
    const updated = [...purchaseForm.items];
    updated[idx][field] = val;
    setPurchaseForm(prev => ({ ...prev, items: updated }));
  };

  const getPurchaseTotals = () => {
    let subtotal = 0;
    let gstAmount = 0;
    purchaseForm.items.forEach(it => {
      const base = (Number(it.qty) || 0) * (Number(it.rate) || 0) - (Number(it.discount) || 0);
      const gst = purchaseForm.gstType === 'GST' ? base * (Number(it.gstPercent) || 0) / 100 : 0;
      subtotal += base;
      gstAmount += gst;
    });
    const expenses = Number(purchaseForm.transportCharges || 0) + Number(purchaseForm.loadingCharges || 0) + Number(purchaseForm.otherExpenses || 0);
    const grandTotal = subtotal + gstAmount + expenses;
    return { subtotal, gstAmount, expenses, grandTotal };
  };

  const totals = getPurchaseTotals();

  const handlePurchaseSubmit = async (e) => {
    e.preventDefault();
    setFormSaving(true);
    setFormError('');
    try {
      const selectedSup = suppliers.find(s => s.id === purchaseForm.supplierId);
      const payload = {
        ...purchaseForm,
        supplierName: selectedSup ? selectedSup.factoryName : ''
      };
      await api.addPurchase(payload);
      setShowPurchaseModal(false);
      loadAllData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormSaving(false);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setFormSaving(true);
    setFormError('');
    try {
      await api.addSupplierPayment(paymentForm);
      setShowPaymentModal(false);
      loadAllData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormSaving(false);
    }
  };


  // Profile View calculation helpers
  const getSupplierProfileStats = (supplierId, name) => {
    const sPurchases = purchases.filter(p => p.supplierId === supplierId);
    const sPayments = payments.filter(p => p.supplierId === supplierId);
    const totalPurchases = sPurchases.reduce((sum, p) => sum + p.grandTotal, 0);
    const totalPayments = sPayments.reduce((sum, p) => sum + p.amount, 0);
    return { totalPurchases, totalPayments };
  };

  // Compile unified running ledger for supplier profile
  const getSupplierLedger = (supplierId, openingGst = 0, openingNonGst = 0) => {
    const sPurchases = purchases.filter(p => p.supplierId === supplierId);
    const sPayments = payments.filter(p => p.supplierId === supplierId);

    const ledger = [];
    sPurchases.forEach(p => {
      ledger.push({
        id: p.id,
        date: p.purchaseDate,
        type: 'Purchase',
        gstType: p.gstType,
        amount: p.grandTotal,
        reference: p.invoiceNumber,
        isPayment: false,
        rawObj: p
      });
    });

    sPayments.forEach(pay => {
      ledger.push({
        id: pay.id,
        date: pay.date,
        type: pay.paymentMethod,
        gstType: pay.category,
        amount: pay.amount,
        reference: pay.referenceNumber || 'N/A',
        isPayment: true,
        rawObj: pay
      });
    });

    // Sort newest date on top
    ledger.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Calculate balance after payment for history table
    let currentGst = openingGst;
    let currentNonGst = openingNonGst;

    // To compute chronological balance after payment, we must compute forward
    const chronLedger = [...ledger].reverse();
    let balance = 0;
    const ledgerWithBalances = chronLedger.map(entry => {
      if (entry.isPayment) {
        balance -= entry.amount;
      } else {
        balance += entry.amount;
      }
      return {
        ...entry,
        balanceAfter: balance
      };
    });

    return ledgerWithBalances.reverse(); // Newest on top
  };

  // Filtered Lists
  const filteredSuppliers = suppliers.filter(s =>
    s.factoryName.toLowerCase().includes(supplierSearch.toLowerCase()) ||
    s.ownerName.toLowerCase().includes(supplierSearch.toLowerCase()) ||
    s.mobile.includes(supplierSearch)
  );

  const filteredArchivedSuppliers = archivedSuppliers.filter(s =>
    s.factoryName.toLowerCase().includes(supplierSearch.toLowerCase()) ||
    s.ownerName.toLowerCase().includes(supplierSearch.toLowerCase()) ||
    s.mobile.includes(supplierSearch)
  );

  const filteredPurchases = purchases.filter(p =>
    p.invoiceNumber.toLowerCase().includes(purchaseSearch.toLowerCase()) ||
    p.supplierName.toLowerCase().includes(purchaseSearch.toLowerCase())
  );

  const formatRupees = (val) => `₹${Math.round(val || 0).toLocaleString('en-IN')}`;

  const mobileError = getMobileValidationError(supplierForm.mobile);
  const isSupplierFormInvalid = !supplierForm.factoryName || !supplierForm.ownerName || !supplierForm.address || !!mobileError || !supplierForm.mobile;

  return (
    <div className="space-y-6 pb-12 text-slate-800 dark:text-[#CBD5E1]">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-slate-200 dark:border-[#334155] shadow-sm">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-10 bg-red-650 dark:bg-red-500 rounded-full shrink-0"></span>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-[#F8FAFC] tracking-tight">
              Procurement & Factory Hub
            </h1>
            <p className="text-slate-500 dark:text-[#94A3B8] text-sm mt-1 font-medium">Simplified procurement ledger with split GST / Non-GST outstanding balance control</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={() => { setSupplierForm(emptySupplier); setEditingSupplier(null); setFormError(''); setShowSupplierModal(true); }} className="flex items-center justify-center gap-2 bg-[#EF4444] hover:bg-red-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md">
            <Plus size={14} /> Add Supplier
          </button>
          <button onClick={() => { setPurchaseForm(emptyPurchase); setFormError(''); setShowPurchaseModal(true); }} className="flex items-center justify-center gap-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md">
            <Plus size={14} /> Log Purchase Invoice
          </button>
          <button onClick={() => { setPaymentForm(emptyPayment); setFormError(''); setShowPaymentModal(true); }} className="flex items-center justify-center gap-2 bg-emerald-650 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md">
            <Plus size={14} /> Enter Payment
          </button>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex bg-slate-100 dark:bg-slate-900 rounded-xl p-1 overflow-x-auto scrollbar-none max-w-full">
        {[
          { id: 'dashboard', label: '📊 Dashboard Overview' },
          { id: 'suppliers', label: '🏭 Suppliers Directory' },
          { id: 'purchases', label: '📄 Purchase Entries' },
          { id: 'documents', label: '📂 Document Center' },
          { id: 'audit', label: '🔔 Activity Logs' }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 whitespace-nowrap ${
              activeTab === t.id ? 'bg-[#EF4444] text-white shadow-sm' : 'text-slate-550 dark:text-[#94A3B8] hover:text-slate-800 dark:hover:text-[#F8FAFC] bg-transparent'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500">
          <Loader2 size={36} className="animate-spin mb-2" />
          <span className="text-sm font-semibold">Loading daily procurement desk...</span>
        </div>
      ) : (
        <div className="animate-fadeIn">
          
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && stats && (
            <div className="space-y-6">
              
              {/* Alert Center notifications banner */}
              {stats.alerts && stats.alerts.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-red-500 text-sm font-bold">
                    <ShieldAlert size={16} />
                    <span>Vendor Balances Alert Feed</span>
                  </div>
                  <div className="space-y-1 text-xs text-red-400 font-semibold pl-6">
                    {stats.alerts.map((al, index) => (
                      <div key={index} className="list-disc">{al.message}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* KPI cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Total GST Outstanding', val: formatRupees(stats.totalGstOutstanding), desc: 'Tax accounts payable balance', color: 'border-t-indigo-500' },
                  { label: 'Total NON-GST Outstanding', val: formatRupees(stats.totalNonGstOutstanding), desc: 'Non-tax accounts payable balance', color: 'border-t-orange-500' },
                  { label: "Today's Payments", val: formatRupees(stats.todayPayments), desc: 'Settlements cleared today', color: 'border-t-emerald-500' },
                  { label: 'This Month Payments', val: formatRupees(stats.thisMonthPayments), desc: 'Gross payments this month', color: 'border-t-teal-500' }
                ].map((c, i) => (
                  <div key={i} className={`bg-white dark:bg-[#1E293B] rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-[#334155] border-t-4 ${c.color} hover:shadow-md transition-all flex flex-col justify-between h-32`}>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider block">{c.label}</span>
                      <p className="text-2xl font-extrabold text-slate-900 dark:text-[#F8FAFC] tracking-tight mt-1 truncate">{c.val}</p>
                    </div>
                    <span className="text-[10px] font-medium text-slate-400 dark:text-[#94A3B8] bg-slate-50 dark:bg-slate-900 px-2 py-0.5 rounded-lg inline-block w-fit truncate">
                      {c.desc}
                    </span>
                  </div>
                ))}
              </div>

              {/* Grid of recent ledger payments & top factories */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Recent Payments Ledger */}
                <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 border border-slate-200 dark:border-[#334155] shadow-sm lg:col-span-2">
                  <h3 className="font-bold text-slate-800 dark:text-[#F8FAFC] text-base flex items-center gap-2 mb-4">
                    <Clock className="text-indigo-500" size={16} /> Recent Supplier Payments History
                  </h3>
                  <div className="max-h-[350px] overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-xl scrollbar-thin">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-slate-500 uppercase font-bold sticky top-0 z-10">
                        <tr>
                          <th className="px-3 py-2.5">Date</th>
                          <th className="px-3 py-2.5">Supplier</th>
                          <th className="px-3 py-2.5">Type / Category</th>
                          <th className="px-3 py-2.5">Reference</th>
                          <th className="px-3 py-2.5 text-right">Amount</th>
                          {isAdmin && <th className="px-3 py-2.5 text-center">Actions</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-[#1E293B] font-medium text-slate-650 dark:text-[#CBD5E1]">
                        {payments.length === 0 ? (
                          <tr>
                            <td colSpan={isAdmin ? "6" : "5"} className="text-center py-10 text-slate-400">No payment logs registered yet</td>
                          </tr>
                        ) : (
                          payments.slice(0, 10).map((pay, idx) => (
                            <tr key={idx} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                              <td className="px-3 py-3 whitespace-nowrap">{pay.date}</td>
                              <td className="px-3 py-3 font-bold uppercase truncate max-w-[140px]">{pay.supplierName}</td>
                              <td className="px-3 py-3">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black border ${
                                  pay.category === 'GST' ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' : 'bg-orange-500/10 text-orange-500 border-orange-500/20'
                                }`}>
                                  {pay.paymentMethod} • {pay.category}
                                </span>
                              </td>
                              <td className="px-3 py-3 truncate max-w-[120px] font-semibold text-slate-500">{pay.referenceNumber || 'N/A'}</td>
                              <td className="px-3 py-3 text-right font-black text-emerald-600 dark:text-emerald-450">{formatRupees(pay.amount)}</td>
                              {isAdmin && (
                                <td className="px-3 py-3 text-center whitespace-nowrap">
                                  <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPaymentToEdit(pay);
                                        setEditPaymentForm({
                                          date: pay.date,
                                          amount: pay.amount,
                                          paymentMethod: pay.paymentMethod,
                                          referenceNumber: pay.referenceNumber || '',
                                          category: pay.category,
                                          notes: pay.notes || '',
                                          reason: ''
                                        });
                                      }}
                                      className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                                      title="Edit"
                                    >
                                      ✏️ Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPaymentToDelete(pay);
                                        setDeleteReason('');
                                      }}
                                      className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-505 dark:text-red-400 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                                      title="Delete"
                                    >
                                      🗑 Delete
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Top Suppliers by Purchase Value */}
                <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 border border-slate-200 dark:border-[#334155] shadow-sm">
                  <h3 className="font-bold text-slate-800 dark:text-[#F8FAFC] text-base flex items-center gap-2 mb-4">
                    <TrendingUp className="text-emerald-500" size={16} /> Leaderboard Factories
                  </h3>
                  <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
                    {stats.topSuppliers?.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <Building2 size={32} className="opacity-30 mb-2" />
                        <span className="text-xs">No active factory logs found</span>
                      </div>
                    ) : (
                      stats.topSuppliers?.map((s, idx) => {
                        const maxVal = stats.topSuppliers[0]?.value || 1;
                        return (
                          <div key={idx} className="space-y-1.5 text-xs font-semibold">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-slate-700 dark:text-[#CBD5E1] truncate max-w-[180px] uppercase">{s.label}</span>
                              <span className="font-black text-slate-805 dark:text-[#F8FAFC]">{formatRupees(s.value)}</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-900 h-1.5 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-650 rounded-full" style={{ width: `${(s.value / maxVal) * 100}%` }}></div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: SUPPLIER DIRECTORY */}
          {activeTab === 'suppliers' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-[#1E293B] p-4 rounded-xl border border-slate-200 dark:border-[#334155]">
                <div className="relative w-full sm:w-[320px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={supplierSearch}
                    onChange={(e) => setSupplierSearch(e.target.value)}
                    placeholder="Search by factory name, owner, phone..."
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-[#334155] rounded-xl text-xs bg-white dark:bg-[#0F172A] text-slate-750 focus:outline-none focus:ring-2 focus:ring-[#EF4444]"
                  />
                </div>
                
                <button
                  type="button"
                  onClick={() => setShowArchivedView(!showArchivedView)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all shrink-0 border ${
                    showArchivedView
                      ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  {showArchivedView ? '🗄️ View Active Suppliers' : '🗄️ View Archived Suppliers'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(showArchivedView ? filteredArchivedSuppliers : filteredSuppliers).map((s) => (
                  <div key={s.id} onClick={() => setSelectedSupplierProfile(s)} className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 border border-slate-200 dark:border-[#334155] hover:border-red-500/50 dark:hover:border-red-500/55 cursor-pointer transition-all shadow-sm flex flex-col justify-between min-h-[220px]">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="font-extrabold text-slate-800 dark:text-[#F8FAFC] text-sm uppercase flex items-center gap-1.5">
                            {s.factoryName}
                            {s.archived && <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20">Archived</span>}
                          </h4>
                          <p className="text-[10px] text-slate-400 dark:text-[#94A3B8] font-bold mt-0.5">Owner: {s.ownerName}</p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-1.5 text-xs font-semibold text-slate-500 dark:text-[#CBD5E1]">
                        <div className="flex items-center gap-2">
                          <Phone size={12} className="text-slate-400" />
                          <span>{s.mobile}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin size={12} className="text-slate-400" />
                          <span className="truncate">{s.address}</span>
                        </div>
                        {s.gstNumber && (
                          <div className="flex items-center gap-2">
                            <Percent size={12} className="text-slate-400" />
                            <span>GSTIN: <span className="uppercase font-bold">{s.gstNumber}</span></span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Split balances & controls */}
                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 mt-4">
                      <div className="grid grid-cols-2 gap-4 flex-1">
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase block">GST Balance</span>
                          <span className="font-black text-xs text-indigo-500">{formatRupees(s.gstBalance)}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase block">Non-GST Balance</span>
                          <span className="font-black text-xs text-orange-500">{formatRupees(s.nonGstBalance)}</span>
                        </div>
                      </div>
                      <div className="flex gap-1.5 items-center" onClick={(e) => e.stopPropagation()}>
                        {!s.archived ? (
                          <>
                            <button onClick={() => openSupplierEdit(s)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-750 dark:hover:text-white transition-colors">
                              <Pencil size={12} />
                            </button>
                            {isAdmin && (
                              <button onClick={() => { setSupplierToDelete(s); setDeleteReason(''); }} className="p-2 rounded-lg text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-500 transition-colors">
                                <Trash2 size={12} />
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            {isAdmin && (
                              <>
                                <button
                                  onClick={() => handleSupplierRestore(s.id)}
                                  className="px-2.5 py-1.5 rounded-lg text-[9px] font-black text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all border border-emerald-500/20"
                                >
                                  Restore
                                </button>
                                <button
                                  onClick={() => { setSupplierToDelete(s); setDeleteReason(''); }}
                                  className="p-2 rounded-lg text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: PURCHASE ENTRIES */}
          {activeTab === 'purchases' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-[#1E293B] p-4 rounded-xl border border-slate-200 dark:border-[#334155]">
                <div className="relative w-full sm:w-[320px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={purchaseSearch}
                    onChange={(e) => setPurchaseSearch(e.target.value)}
                    placeholder="Search by invoice, supplier name..."
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-[#334155] rounded-xl text-xs bg-white dark:bg-[#0F172A] text-slate-750 focus:outline-none focus:ring-2 focus:ring-[#EF4444]"
                  />
                </div>
              </div>

              <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-[#334155] text-slate-500 dark:text-[#94A3B8] uppercase font-bold sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3">Invoice Details</th>
                      <th className="px-4 py-3">Supplier Name</th>
                      <th className="px-4 py-3">Classification / Pay Type</th>
                      <th className="px-4 py-3">Invoice Total</th>
                      <th className="px-4 py-3">Dues Outstanding</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#334155] bg-white dark:bg-[#1E293B] font-medium text-slate-605 dark:text-[#CBD5E1]">
                    {filteredPurchases.map((p) => {
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3.5">
                            <p className="font-extrabold text-slate-805 dark:text-[#F8FAFC] uppercase">Inv #{p.invoiceNumber}</p>
                            <p className="text-[9px] text-slate-400 mt-0.5">Date: {p.purchaseDate}</p>
                          </td>
                          <td className="px-4 py-3.5 font-bold uppercase text-slate-700 dark:text-[#CBD5E1]">
                            {p.supplierName}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black border ${
                              p.gstType === 'GST' ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' : 'bg-orange-500/10 text-orange-500 border-orange-500/20'
                            }`}>
                              {p.gstType} • {p.paymentType}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-black text-slate-800 dark:text-[#F8FAFC]">
                            {formatRupees(p.grandTotal)}
                          </td>
                          <td className={`px-4 py-3.5 font-black ${p.remainingAmount > 0 ? 'text-red-500' : 'text-slate-450'}`}>
                            {formatRupees(p.remainingAmount)}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {p.invoiceFile && (
                                <a href={p.invoiceFile} download={`Inv_${p.invoiceNumber}_${p.supplierName}.${p.invoiceFileType?.split('/')[1] || 'pdf'}`} className="p-1.5 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-550 transition-colors">
                                  <Download size={13} />
                                </a>
                              )}
                              {isAdmin && (
                                <button onClick={() => { setPurchaseToDelete(p); setDeleteReason(''); }} className="p-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors">
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: DOCUMENT CENTER */}
          {activeTab === 'documents' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Invoices folder */}
              <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 border border-slate-200 dark:border-[#334155] shadow-sm space-y-4">
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/20 text-red-600 border border-red-200 dark:border-red-900/50 flex items-center justify-center text-lg font-black">📁</div>
                <div>
                  <h4 className="font-extrabold text-slate-800 dark:text-[#F8FAFC] text-sm">Purchase Invoices copy</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">{purchases.filter(p => p.invoiceFile).length} files archived</p>
                </div>
                <div className="max-h-[220px] overflow-y-auto pr-1 text-xs space-y-1 font-semibold text-slate-500 scrollbar-thin">
                  {purchases.filter(p => p.invoiceFile).map(p => (
                    <div key={p.id} className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 py-1">
                      <span className="truncate max-w-[140px] uppercase">Inv #{p.invoiceNumber} ({p.gstType})</span>
                      <a href={p.invoiceFile} download={`Inv_${p.invoiceNumber}.${p.invoiceFileType?.split('/')[1] || 'pdf'}`} className="text-red-500 hover:text-red-650"><Download size={11} /></a>
                    </div>
                  ))}
                </div>
              </div>

              {/* Receipts folder */}
              <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 border border-slate-200 dark:border-[#334155] shadow-sm space-y-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/20 text-emerald-600 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-center text-lg font-black">📁</div>
                <div>
                  <h4 className="font-extrabold text-slate-800 dark:text-[#F8FAFC] text-sm">Cleared Payment Receipts</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">{payments.filter(pay => pay.receiptFile).length} files archived</p>
                </div>
                <div className="max-h-[220px] overflow-y-auto pr-1 text-xs space-y-1 font-semibold text-slate-500 scrollbar-thin">
                  {payments.filter(pay => pay.receiptFile).map(pay => (
                    <div key={pay.id} className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 py-1">
                      <span className="truncate max-w-[140px]">{pay.referenceNumber || 'UTR Receipt'}</span>
                      <a href={pay.receiptFile} download={`Receipt_${pay.referenceNumber}`} className="text-emerald-500 hover:text-emerald-600"><Download size={11} /></a>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 5: ACTIVITY LOGS */}
          {activeTab === 'audit' && (
            <div className="bg-white dark:bg-[#1E293B] p-6 rounded-2xl border border-slate-200 dark:border-[#334155] shadow-sm">
              <h3 className="font-bold text-slate-800 dark:text-[#F8FAFC] text-lg flex items-center gap-2 mb-4">
                <Clock className="text-indigo-500" size={18} /> Operation Log Trail
              </h3>
              <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
                {auditLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <FileText size={36} className="opacity-30 mb-2" />
                    <p className="text-xs">No procurement activity logged</p>
                  </div>
                ) : (
                  auditLogs.map((log, idx) => (
                    <div key={idx} className="text-xs border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div className="flex justify-between font-bold text-slate-550">
                        <span className="text-[10px] uppercase font-black text-slate-705 dark:text-[#F8FAFC] bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-200">{log.action}</span>
                        <span className="text-[10px]">{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-slate-650 dark:text-[#CBD5E1] mt-1.5 font-semibold">{log.details}</p>
                      <p className="text-[9px] text-slate-400 mt-1">Operator: {log.userName}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>
      )}

      {/* MODAL 1: ADD / EDIT SUPPLIER PROFILE */}
      {showSupplierModal && (
        <Modal title={editingSupplier ? 'Modify Supplier Profile' : 'Register New Supplier'} onClose={() => setShowSupplierModal(false)}>
          <form onSubmit={handleSupplierSubmit} className="space-y-4 text-xs font-semibold text-slate-500">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">Factory Name *</label>
              <input
                required
                value={supplierForm.factoryName}
                onChange={(e) => setSupplierForm(prev => ({ ...prev, factoryName: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC]"
                placeholder="e.g. Havells India Ltd"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">Factory Owner Name *</label>
                <input
                  required
                  value={supplierForm.ownerName}
                  onChange={(e) => setSupplierForm(prev => ({ ...prev, ownerName: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC]"
                  placeholder="e.g. Anil Rai Gupta"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">Mobile Number (10 Digits) *</label>
                <input
                  required
                  value={supplierForm.mobile}
                  onChange={(e) => setSupplierForm(prev => ({ ...prev, mobile: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-xl bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC] ${
                    mobileError ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 dark:border-[#334155] focus:ring-red-500'
                  }`}
                  placeholder="e.g. 9876543210"
                />
                {mobileError && <p className="text-[10px] text-red-500 mt-1 font-bold">{mobileError}</p>}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">GSTIN Number (Optional)</label>
              <input
                value={supplierForm.gstNumber}
                onChange={(e) => setSupplierForm(prev => ({ ...prev, gstNumber: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC] uppercase"
                placeholder="15-digit GSTIN"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">Full Address *</label>
              <textarea
                required
                value={supplierForm.address}
                onChange={(e) => setSupplierForm(prev => ({ ...prev, address: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC] resize-none"
                rows={3}
                placeholder="Enter complete factory address"
              />
            </div>

            {formError && <p className="text-red-500 text-xs font-bold bg-red-500/10 p-2.5 rounded-xl border border-red-500/20">{formError}</p>}

            <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button type="button" onClick={() => setShowSupplierModal(false)} className="flex-1 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-slate-750 dark:text-[#CBD5E1] hover:bg-slate-100 font-bold">Cancel</button>
              <button type="submit" disabled={formSaving || isSupplierFormInvalid} className="flex-1 py-2.5 bg-[#EF4444] hover:bg-red-600 disabled:opacity-60 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md">
                {formSaving && <Loader2 size={14} className="animate-spin" />} Save Supplier Profile
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 2: LOG NEW PURCHASE INVOICE */}
      {showPurchaseModal && (
        <Modal title="Submit Purchase Invoice" onClose={() => setShowPurchaseModal(false)}>
          <form onSubmit={handlePurchaseSubmit} className="space-y-4 text-xs font-semibold text-slate-500">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">Invoice Number *</label>
                <input
                  required
                  value={purchaseForm.invoiceNumber}
                  onChange={(e) => setPurchaseForm(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC]"
                  placeholder="e.g. HAV-5592"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">Invoice Date *</label>
                <input
                  required
                  type="date"
                  value={purchaseForm.purchaseDate}
                  onChange={(e) => setPurchaseForm(prev => ({ ...prev, purchaseDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC]"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">Factory/Supplier *</label>
                <select
                  required
                  value={purchaseForm.supplierId}
                  onChange={(e) => setPurchaseForm(prev => ({ ...prev, supplierId: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-slate-805 dark:text-[#CBD5E1]"
                >
                  <option value="">-- Select Supplier --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.factoryName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">Category Classification</label>
                <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-900 rounded-xl p-1">
                  {['GST', 'Non-GST'].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setPurchaseForm(prev => ({ ...prev, gstType: t }))}
                      className={`py-1 rounded-lg text-[10px] font-black ${purchaseForm.gstType === t ? 'bg-[#EF4444] text-white shadow-sm' : 'text-slate-500'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">Payment Type</label>
                <select
                  value={purchaseForm.paymentType}
                  onChange={(e) => setPurchaseForm(prev => ({ ...prev, paymentType: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-slate-805 dark:text-[#CBD5E1]"
                >
                  <option value="Credit">🏦 Credit (outstanding)</option>
                  <option value="Cash">💵 Cash</option>
                  <option value="UPI">⚡ UPI</option>
                  <option value="Bank Transfer">🏦 Bank Transfer</option>
                </select>
              </div>
            </div>

            {purchaseForm.paymentType === 'Credit' && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">Payment Due Date *</label>
                <input
                  required
                  type="date"
                  value={purchaseForm.dueDate}
                  onChange={(e) => setPurchaseForm(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC]"
                />
              </div>
            )}

            <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-[10px] font-black uppercase text-slate-800 dark:text-[#F8FAFC] tracking-wider">Purchase Line Items</h4>
                <button type="button" onClick={addPurchaseItemRow} className="text-red-500 hover:text-red-650 flex items-center gap-1 font-bold">
                  <Plus size={12} /> Add Item Line
                </button>
              </div>
              <div className="space-y-3">
                {purchaseForm.items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-[40%_15%_15%_10%_12%_8%] gap-2 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-105 dark:border-slate-800">
                    <div>
                      <select
                        required
                        value={it.productId}
                        onChange={(e) => {
                          const pObj = products.find(p => p.id === e.target.value);
                          updatePurchaseItem(idx, 'productId', e.target.value);
                          updatePurchaseItem(idx, 'productName', pObj ? pObj.name : '');
                          updatePurchaseItem(idx, 'rate', pObj ? pObj.costPrice || pObj.unitPrice || 0 : 0);
                        }}
                        className="w-full px-2 py-1.5 border border-slate-200 dark:border-[#334155] rounded-lg bg-white dark:bg-[#0F172A] text-slate-805 dark:text-[#CBD5E1]"
                      >
                        <option value="">-- Choose Product --</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <input
                        required
                        type="number"
                        min="1"
                        value={it.qty}
                        onChange={(e) => updatePurchaseItem(idx, 'qty', Number(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 border border-slate-200 dark:border-[#334155] rounded-lg bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC]"
                        placeholder="Qty"
                      />
                    </div>
                    <div>
                      <input
                        required
                        type="number"
                        value={it.rate}
                        onChange={(e) => updatePurchaseItem(idx, 'rate', Number(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 border border-slate-200 dark:border-[#334155] rounded-lg bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC]"
                        placeholder="Rate"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        value={it.gstPercent}
                        onChange={(e) => updatePurchaseItem(idx, 'gstPercent', Number(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 border border-slate-200 dark:border-[#334155] rounded-lg bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC]"
                        disabled={purchaseForm.gstType === 'Non-GST'}
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        value={it.discount}
                        onChange={(e) => updatePurchaseItem(idx, 'discount', Number(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 border border-slate-200 dark:border-[#334155] rounded-lg bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC]"
                        placeholder="Disc"
                      />
                    </div>
                    <div className="flex items-center justify-end">
                      <button type="button" onClick={() => removePurchaseItemRow(idx)} disabled={purchaseForm.items.length === 1} className="p-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-500 disabled:opacity-30">
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 border-t border-slate-100 dark:border-slate-800 pt-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">Transport (₹)</label>
                <input
                  type="number"
                  value={purchaseForm.transportCharges}
                  onChange={(e) => setPurchaseForm(prev => ({ ...prev, transportCharges: Number(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">Loading (₹)</label>
                <input
                  type="number"
                  value={purchaseForm.loadingCharges}
                  onChange={(e) => setPurchaseForm(prev => ({ ...prev, loadingCharges: Number(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">Other exp (₹)</label>
                <input
                  type="number"
                  value={purchaseForm.otherExpenses}
                  onChange={(e) => setPurchaseForm(prev => ({ ...prev, otherExpenses: Number(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
              <label className="flex items-center gap-2 text-slate-700 dark:text-[#CBD5E1] cursor-pointer">
                <input
                  type="checkbox"
                  checked={purchaseForm.autoAdjustStock}
                  onChange={(e) => setPurchaseForm(prev => ({ ...prev, autoAdjustStock: e.target.checked }))}
                  className="text-red-500 rounded focus:ring-red-500"
                />
                <span>Auto-adjust stock immediately in inventory</span>
              </label>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-[#334155] rounded-xl bg-slate-50 dark:bg-slate-900 cursor-pointer text-slate-650 hover:bg-slate-100">
                  <Upload size={12} /> Invoice Copy
                  <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFileChange(e, 'purchase')} className="hidden" />
                </label>
                <span className="text-[10px] text-slate-400 max-w-[120px] truncate">{purchaseForm.invoiceFileName || 'No file'}</span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between font-black text-sm text-slate-805 dark:text-[#F8FAFC]">
                <span>Grand Total:</span>
                <span className="text-[#EF4444]">{formatRupees(totals.grandTotal)}</span>
              </div>
            </div>

            {formError && <p className="text-red-500 text-xs font-bold bg-red-500/10 p-2.5 rounded-xl border border-red-500/20">{formError}</p>}

            <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button type="button" onClick={() => setShowPurchaseModal(false)} className="flex-1 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-slate-750 dark:text-[#CBD5E1] hover:bg-slate-100 font-bold">Cancel</button>
              <button type="submit" disabled={formSaving} className="flex-1 py-2.5 bg-[#EF4444] hover:bg-red-600 disabled:opacity-60 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md">
                {formSaving && <Loader2 size={14} className="animate-spin" />} Submit Invoice
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 3: LOG SUPPLIER PAYMENT */}
      {showPaymentModal && (
        <Modal title="Log Supplier Payment" onClose={() => setShowPaymentModal(false)}>
          <form onSubmit={handlePaymentSubmit} className="space-y-4 text-xs font-semibold text-slate-500">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">Factory/Supplier *</label>
              <select
                required
                value={paymentForm.supplierId}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, supplierId: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-slate-805 dark:text-[#CBD5E1]"
              >
                <option value="">-- Choose Supplier --</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.factoryName} (GST: {formatRupees(s.gstBalance)} | Non-GST: {formatRupees(s.nonGstBalance)})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">Payment Date *</label>
                <input
                  required
                  type="date"
                  value={paymentForm.date}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">Payment Amount (₹) *</label>
                <input
                  required
                  type="number"
                  min="1"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: Number(e.target.value) || '' }))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC]"
                  placeholder="Enter amount"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">Payment Type</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-slate-805 dark:text-[#CBD5E1]"
                >
                  <option value="Cash">💵 Cash</option>
                  <option value="UPI">⚡ UPI</option>
                  <option value="Cheque">✍️ Cheque</option>
                  <option value="Bank Transfer">🏦 Bank Transfer</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">Payment Category *</label>
                <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-900 rounded-xl p-1">
                  {['GST', 'Non-GST'].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setPaymentForm(prev => ({ ...prev, category: t }))}
                      className={`py-1 rounded-lg text-[10px] font-black ${paymentForm.category === t ? 'bg-[#EF4444] text-white shadow-sm' : 'text-slate-500'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 items-center pt-2">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">UTR Reference Number</label>
                <input
                  value={paymentForm.referenceNumber}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, referenceNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC]"
                  placeholder="Ref / Chq / UTR"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">Receipt copy</label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 dark:border-[#334155] rounded-xl bg-slate-50 dark:bg-slate-900 cursor-pointer text-slate-650 hover:bg-slate-105">
                    <Upload size={12} /> Receipt File
                    <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFileChange(e, 'payment')} className="hidden" />
                  </label>
                  <span className="text-[10px] text-slate-400 max-w-[120px] truncate">{paymentForm.receiptFileName || 'No file'}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">Notes</label>
              <input
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC]"
                placeholder="Optional notes"
              />
            </div>

            {formError && <p className="text-red-500 text-xs font-bold bg-red-500/10 p-2.5 rounded-xl border border-red-500/20">{formError}</p>}

            <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button type="button" onClick={() => setShowPaymentModal(false)} className="flex-1 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-slate-750 dark:text-[#CBD5E1] hover:bg-slate-100 font-bold">Cancel</button>
              <button type="submit" disabled={formSaving} className="flex-1 py-2.5 bg-[#EF4444] hover:bg-red-600 disabled:opacity-60 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md">
                {formSaving && <Loader2 size={14} className="animate-spin" />} Clear Payment
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 4: DETAILED SUPPLIER PROFILE & PAYMENT LEDGER VIEW */}
      {selectedSupplierProfile && (
        <Modal title={`Supplier Ledger Profile: ${selectedSupplierProfile.factoryName}`} onClose={() => setSelectedSupplierProfile(null)}>
          <div className="space-y-6 text-xs text-slate-600 dark:text-[#CBD5E1]">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[9px] font-bold text-slate-400 block uppercase">Factory Name</span>
                <p className="text-sm font-extrabold text-slate-800 dark:text-[#F8FAFC] uppercase">{selectedSupplierProfile.factoryName}</p>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 block uppercase">Owner Name</span>
                <p className="text-sm font-extrabold text-slate-800 dark:text-[#F8FAFC]">{selectedSupplierProfile.ownerName}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800 pt-3">
              <div>
                <span className="text-[9px] font-bold text-slate-400 block uppercase">Mobile Phone</span>
                <p className="font-extrabold text-slate-805 dark:text-[#F8FAFC]">{selectedSupplierProfile.mobile}</p>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 block uppercase">GSTIN Number</span>
                <p className="font-extrabold text-slate-805 dark:text-[#F8FAFC] uppercase">{selectedSupplierProfile.gstNumber || 'Unregistered'}</p>
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
              <span className="text-[9px] font-bold text-slate-400 block uppercase">Full Factory Address</span>
              <p className="font-semibold text-slate-705 dark:text-[#CBD5E1] bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 mt-1">{selectedSupplierProfile.address}</p>
            </div>

            {/* Split balances & stats */}
            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800 pt-3 text-center">
              <div className="p-3 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl">
                <span className="text-[9px] font-bold text-indigo-500 block uppercase">GST Balance</span>
                <span className="font-black text-sm text-indigo-500">{formatRupees(selectedSupplierProfile.gstBalance)}</span>
              </div>
              <div className="p-3 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl">
                <span className="text-[9px] font-bold text-orange-500 block uppercase">Non-GST Balance</span>
                <span className="font-black text-sm text-orange-500">{formatRupees(selectedSupplierProfile.nonGstBalance)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-3 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl">
                <span className="text-[9px] font-bold text-slate-400 block uppercase">Total Purchases</span>
                <span className="font-black text-sm">{formatRupees(getSupplierProfileStats(selectedSupplierProfile.id).totalPurchases)}</span>
              </div>
              <div className="p-3 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl">
                <span className="text-[9px] font-bold text-slate-400 block uppercase">Total Payments</span>
                <span className="font-black text-sm">{formatRupees(getSupplierProfileStats(selectedSupplierProfile.id).totalPayments)}</span>
              </div>
            </div>

            {/* PAYMENT LEDGER TABLE */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-3">
              <h4 className="text-[10px] font-black uppercase text-slate-800 dark:text-[#F8FAFC] tracking-wider">Payment Ledger History</h4>
              
              <div className="max-h-[220px] overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-xl scrollbar-thin">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-slate-500 font-bold sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">GST/NON-GST</th>
                      <th className="px-3 py-2">Amount</th>
                      <th className="px-3 py-2">Reference</th>
                      <th className="px-3 py-2 text-right">Balance After</th>
                      {isAdmin && <th className="px-3 py-2 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-[#1E293B] font-medium text-slate-600 dark:text-[#CBD5E1]">
                    {getSupplierLedger(selectedSupplierProfile.id).map((entry, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-850">
                        <td className="px-3 py-2">{entry.date}</td>
                        <td className="px-3 py-2">{entry.type}</td>
                        <td className="px-3 py-2">{entry.gstType}</td>
                        <td className={`px-3 py-2 font-bold ${entry.isPayment ? 'text-green-600 dark:text-green-450' : 'text-red-500'}`}>
                          {entry.isPayment ? '-' : '+'}{formatRupees(entry.amount)}
                        </td>
                        <td className="px-3 py-2 font-semibold text-slate-400">{entry.reference}</td>
                        <td className="px-3 py-2 text-right font-extrabold text-slate-800 dark:text-[#F8FAFC]">{formatRupees(entry.balanceAfter)}</td>
                        {isAdmin && (
                          <td className="px-3 py-2 text-right">
                            {entry.isPayment ? (
                              (!entry.reference || !entry.reference.startsWith('AUTO-PAID-')) && (
                                <div className="flex justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const pay = entry.rawObj;
                                      setPaymentToEdit(pay);
                                      setEditPaymentForm({
                                        date: pay.date,
                                        amount: pay.amount,
                                        paymentMethod: pay.paymentMethod,
                                        referenceNumber: pay.referenceNumber || '',
                                        category: pay.category,
                                        notes: pay.notes || '',
                                        reason: ''
                                      });
                                    }}
                                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                                    title="Edit Payment"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { setPaymentToDelete(entry.rawObj); setDeleteReason(''); }}
                                    className="p-1 rounded hover:bg-red-500/10 text-red-500 transition-colors"
                                    title="Delete Payment"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              )
                            ) : (
                              <button
                                type="button"
                                onClick={() => { setPurchaseToDelete(entry.rawObj); setDeleteReason(''); }}
                                className="p-1 rounded hover:bg-red-500/10 text-red-500 transition-colors"
                                title="Delete Purchase Invoice"
                              >
                                <Trash2 size={11} />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button type="button" onClick={() => setSelectedSupplierProfile(null)} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-center shadow-md">Done</button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 5: CONFIRM DELETE/ARCHIVE SUPPLIER */}
      {supplierToDelete && (() => {
        const isTestOrDemo = /test|demo/i.test(supplierToDelete.factoryName);
        const hasTrans = !isTestOrDemo && (
                         purchases.some(p => p.supplierId === supplierToDelete.id) ||
                         payments.some(pay => pay.supplierId === supplierToDelete.id) ||
                         (supplierToDelete.gstBalance || 0) > 0 ||
                         (supplierToDelete.nonGstBalance || 0) > 0);
        return (
          <Modal title="Delete / Archive Supplier" onClose={() => { setSupplierToDelete(null); setShowForceDeleteConfirm(false); setTypedSupplierName(''); }}>
            <div className="space-y-4 text-xs font-semibold text-slate-500">
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Factory Name</span>
                <span className="text-sm font-extrabold text-slate-805 dark:text-[#F8FAFC] uppercase">{supplierToDelete.factoryName}</span>
                <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-200 dark:border-slate-850">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">GST Balance</span>
                    <span className="font-black text-indigo-500">{formatRupees(supplierToDelete.gstBalance)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Non-GST Balance</span>
                    <span className="font-black text-orange-500">{formatRupees(supplierToDelete.nonGstBalance)}</span>
                  </div>
                </div>
              </div>

              {!showForceDeleteConfirm && (
                <>
                  {hasTrans ? (
                    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 p-3.5 rounded-xl font-bold">
                      ⚠️ This supplier contains transaction history and cannot be permanently deleted. You can archive them instead.
                    </div>
                  ) : (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-505 p-3.5 rounded-xl font-bold">
                      ⚠️ Are you sure you want to permanently delete this supplier? {isTestOrDemo ? 'This test/demo supplier and all its records will be completely deleted.' : 'This action is irreversible.'}
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">Reason for Action *</label>
                    <input
                      required
                      value={deleteReason}
                      onChange={(e) => setDeleteReason(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC]"
                      placeholder="e.g. Account closed / Merge duplicate"
                    />
                  </div>

                  <div className="flex flex-col gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex gap-3">
                      <button type="button" onClick={() => { setSupplierToDelete(null); setShowForceDeleteConfirm(false); setTypedSupplierName(''); }} className="flex-1 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-slate-750 dark:text-[#CBD5E1] hover:bg-slate-100 font-bold">Cancel</button>
                      {hasTrans ? (
                        <button
                          type="button"
                          disabled={!deleteReason.trim()}
                          onClick={() => handleSupplierArchive(supplierToDelete.id, deleteReason)}
                          className="flex-1 py-2.5 bg-amber-550 hover:bg-amber-600 disabled:opacity-60 text-white font-bold rounded-xl shadow-md"
                        >
                          Archive Supplier
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={!deleteReason.trim()}
                          onClick={() => handleSupplierDeletePermanent(supplierToDelete.id, deleteReason)}
                          className="flex-1 py-2.5 bg-red-600 hover:bg-red-750 disabled:opacity-60 text-white font-bold rounded-xl shadow-md"
                        >
                          Delete Permanently
                        </button>
                      )}
                    </div>
                    {hasTrans && isAdmin && (
                      <button
                        type="button"
                        onClick={() => { setShowForceDeleteConfirm(true); setTypedSupplierName(''); }}
                        className="w-full py-2 border border-red-500/20 text-red-500 hover:bg-red-500/10 rounded-xl text-xs font-black transition-all mt-2"
                      >
                        🗑️ Force Delete Permanently (Admin Only)
                      </button>
                    )}
                  </div>
                </>
              )}

              {showForceDeleteConfirm && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3.5 rounded-xl space-y-2">
                    <span className="font-extrabold block">🚨 CRITICAL WARNING (ADMIN ONLY)</span>
                    <p>This action will permanently delete:</p>
                    <ul className="list-disc list-inside pl-2 space-y-0.5 font-bold">
                      <li>Supplier record</li>
                      <li>Purchase history</li>
                      <li>Payment history</li>
                      <li>GST balances & Non-GST balances</li>
                      <li>Activity logs & Related documents</li>
                    </ul>
                    <p className="font-extrabold uppercase mt-2">This action cannot be undone!</p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">Reason for Force Delete *</label>
                    <input
                      required
                      value={deleteReason}
                      onChange={(e) => setDeleteReason(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC]"
                      placeholder="e.g. Account closed / Merge duplicate"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">
                      Type supplier name exactly to confirm: <span className="text-[#EF4444] font-black">{supplierToDelete.factoryName}</span>
                    </label>
                    <input
                      value={typedSupplierName}
                      onChange={(e) => setTypedSupplierName(e.target.value)}
                      className="w-full px-3 py-2 border border-red-500/30 rounded-xl bg-white dark:bg-[#0F172A] text-slate-850 dark:text-[#F8FAFC] focus:ring-red-500 font-extrabold uppercase"
                      placeholder="Type exact factory name"
                    />
                  </div>

                  <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => { setShowForceDeleteConfirm(false); setTypedSupplierName(''); }}
                      className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-[#334155] text-slate-700 dark:text-[#CBD5E1] hover:bg-slate-100 font-bold"
                    >
                      Cancel Force Delete
                    </button>
                    <button
                      type="button"
                      disabled={typedSupplierName !== supplierToDelete.factoryName || !deleteReason.trim()}
                      onClick={() => handleSupplierDeleteForce(supplierToDelete.id, deleteReason)}
                      className="flex-1 py-2 bg-red-600 hover:bg-red-750 disabled:opacity-60 text-white font-extrabold rounded-xl shadow-md"
                    >
                      I understand, Force Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Modal>
        );
      })()}

      {/* MODAL 6: CONFIRM DELETE PAYMENT */}
      {paymentToDelete && (
        <Modal title="Delete Payment Record" onClose={() => setPaymentToDelete(null)}>
          <div className="space-y-4 text-xs font-semibold text-slate-500">
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3.5 rounded-xl font-bold">
              ⚠️ Deleting this payment will restore the supplier's outstanding balance. This action is permanent.
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase">Supplier:</span>
                <span className="font-extrabold text-slate-800 dark:text-[#F8FAFC] uppercase">{paymentToDelete.supplierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase">Amount:</span>
                <span className="font-black text-red-500">{formatRupees(paymentToDelete.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase">Date:</span>
                <span className="font-extrabold text-slate-800 dark:text-[#F8FAFC]">{paymentToDelete.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase">Category / Method:</span>
                <span className="font-extrabold text-slate-800 dark:text-[#F8FAFC]">{paymentToDelete.category} • {paymentToDelete.paymentMethod}</span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">Reason for Deletion *</label>
              <input
                required
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC]"
                placeholder="e.g. Bounced cheque / Error in entry"
              />
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button type="button" onClick={() => setPaymentToDelete(null)} className="flex-1 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-slate-750 dark:text-[#CBD5E1] hover:bg-slate-100 font-bold">Cancel</button>
              <button
                type="button"
                disabled={!deleteReason.trim()}
                onClick={() => handlePaymentDelete(paymentToDelete.id, deleteReason)}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold rounded-xl shadow-md"
              >
                Delete Payment
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 6.5: EDIT PAYMENT RECORD */}
      {paymentToEdit && (
        <Modal title="Edit Payment Record" onClose={() => setPaymentToEdit(null)}>
          <form onSubmit={handlePaymentEditSubmit} className="space-y-4 text-xs font-semibold text-slate-500">
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-4">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Original Amount</span>
                <span className="text-sm font-extrabold text-slate-705 dark:text-slate-300">{formatRupees(paymentToEdit.amount)}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Current Amount</span>
                <span className="text-sm font-extrabold text-indigo-500">{formatRupees(editPaymentForm.amount || 0)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">Payment Date *</label>
                <input
                  type="date"
                  required
                  value={editPaymentForm.date}
                  onChange={(e) => setEditPaymentForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={editPaymentForm.amount}
                  onChange={(e) => setEditPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC]"
                  placeholder="Enter amount"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">Payment Type *</label>
                <select
                  value={editPaymentForm.paymentMethod}
                  onChange={(e) => setEditPaymentForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC]"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">Category *</label>
                <select
                  value={editPaymentForm.category}
                  onChange={(e) => setEditPaymentForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC]"
                >
                  <option value="GST">GST Category</option>
                  <option value="Non-GST">Non-GST Category</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">Reference Number</label>
              <input
                type="text"
                value={editPaymentForm.referenceNumber}
                onChange={(e) => setEditPaymentForm(prev => ({ ...prev, referenceNumber: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC]"
                placeholder="e.g. Transaction ID / Cheque No"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">Notes</label>
              <textarea
                value={editPaymentForm.notes}
                onChange={(e) => setEditPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC] h-16 resize-none"
                placeholder="Payment notes..."
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">Reason for Edit *</label>
              <input
                type="text"
                required
                value={editPaymentForm.reason}
                onChange={(e) => setEditPaymentForm(prev => ({ ...prev, reason: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC]"
                placeholder="e.g. Typo in payment amount / Category adjustment"
              />
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button type="button" onClick={() => setPaymentToEdit(null)} className="flex-1 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-slate-750 dark:text-[#CBD5E1] hover:bg-slate-100 font-bold">Cancel</button>
              <button
                type="submit"
                disabled={!editPaymentForm.reason.trim() || !editPaymentForm.amount}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold rounded-xl shadow-md font-extrabold"
              >
                Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 7: CONFIRM DELETE PURCHASE INVOICE */}
      {purchaseToDelete && (
        <Modal title="Delete Purchase Invoice" onClose={() => setPurchaseToDelete(null)}>
          <div className="space-y-4 text-xs font-semibold text-slate-500">
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3.5 rounded-xl font-bold">
              ⚠️ Deleting this invoice will reverse stock levels in inventory and adjust outstanding supplier balances. This action is permanent.
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase">Invoice Number:</span>
                <span className="font-extrabold text-slate-800 dark:text-[#F8FAFC] uppercase">#{purchaseToDelete.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase">Supplier:</span>
                <span className="font-extrabold text-slate-800 dark:text-[#F8FAFC] uppercase">{purchaseToDelete.supplierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase">Invoice Total:</span>
                <span className="font-black text-[#EF4444]">{formatRupees(purchaseToDelete.grandTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase">Date:</span>
                <span className="font-extrabold text-slate-800 dark:text-[#F8FAFC]">{purchaseToDelete.purchaseDate}</span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1">Reason for Deletion *</label>
              <input
                required
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-[#334155] rounded-xl bg-white dark:bg-[#0F172A] text-slate-800 dark:text-[#F8FAFC]"
                placeholder="e.g. Return of goods / Error in calculation"
              />
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button type="button" onClick={() => setPurchaseToDelete(null)} className="flex-1 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-slate-750 dark:text-[#CBD5E1] hover:bg-slate-105 font-bold">Cancel</button>
              <button
                type="button"
                disabled={!deleteReason.trim()}
                onClick={() => handlePurchaseDelete(purchaseToDelete.id, deleteReason)}
                className="flex-1 py-2.5 bg-red-650 hover:bg-red-700 disabled:opacity-60 text-white font-bold rounded-xl shadow-md"
              >
                Delete Invoice
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
