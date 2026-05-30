import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import {
  Database, Download, Upload, FileSpreadsheet, FileText,
  Calendar, AlertTriangle, CheckCircle2, Info, Lock,
  RefreshCw, FileDown, Play, Clock, Sparkles, AlertOctagon, HelpCircle
} from 'lucide-react';

const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

function getToken() {
  return localStorage.getItem('inv_token') || '';
}

export default function AdminPanel() {
  const { user } = useAuth();

  // Export States
  const [exportType, setExportType] = useState('products');
  const [exportFormat, setExportFormat] = useState('xlsx');
  const [exportRange, setExportRange] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exporting, setExporting] = useState(false);

  // Import States
  const [importType, setImportType] = useState('products');
  const [importFile, setImportFile] = useState(null);
  const [importFileName, setImportFileName] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [previewError, setPreviewError] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [importingData, setImportingData] = useState(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState('');

  // Backup States
  const [backupStatus, setBackupStatus] = useState({ lastBackupDate: null, backupSize: null });
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [downloadingBackup, setDownloadingBackup] = useState(false);

  // Restore States
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoreFileName, setRestoreFileName] = useState('');
  const [restoreConfirmText, setRestoreConfirmText] = useState('');
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState('');
  const [restoreSuccess, setRestoreSuccess] = useState(false);

  useEffect(() => {
    fetchBackupStatus();
    api.logAdminAction('Accessed Admin Control Center').catch(err => console.error(err));
  }, []);

  async function fetchBackupStatus() {
    setLoadingStatus(true);
    try {
      const status = await api.getBackupStatus();
      setBackupStatus(status);
    } catch (e) {
      console.error('Failed to load backup status', e);
    } finally {
      setLoadingStatus(false);
    }
  }

  // Format Helper
  function formatBytes(bytes) {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function formatTime(isoStr) {
    if (!isoStr) return 'Never';
    const d = new Date(isoStr);
    return d.toLocaleString();
  }

  // 1. Trigger Data Export File Download
  async function handleExport(e) {
    e.preventDefault();
    setExporting(true);
    try {
      let query = `type=${exportType}&format=${exportFormat}&rangeType=${exportRange}`;
      if (exportRange === 'month') {
        query += `&selectedMonth=${selectedMonth}`;
      } else if (exportRange === 'custom') {
        query += `&startDate=${startDate}&endDate=${endDate}`;
      }

      const res = await fetch(`${BASE}/export?${query}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`
        }
      });

      if (!res.ok) {
        throw new Error('Export download request failed');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const fileExt = exportFormat === 'xlsx' ? 'xlsx' : (exportFormat === 'csv' && exportType === 'all' ? 'zip' : 'csv');
      const formattedDate = new Date().toISOString().split('T')[0];
      a.download = `TEE_${exportType}_export_${formattedDate}.${fileExt}`;
      
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to download export report. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  // 2. Import Excel/CSV Preview parsing
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportFile(file);
    setImportFileName(file.name);
    setPreviewData(null);
    setPreviewError('');
    setImportSuccessMsg('');
    
    // Read file and convert to base64
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target.result.split(',')[1];
      setLoadingPreview(true);
      try {
        const preview = await api.importPreview(base64, importType);
        setPreviewData(preview);
      } catch (err) {
        setPreviewError(err.message || 'Failed to parse file preview.');
      } finally {
        setLoadingPreview(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // 3. Import Confirmation Execution
  async function handleImportConfirm() {
    if (!previewData || !previewData.rows) return;
    setImportingData(true);
    setImportSuccessMsg('');
    try {
      // Send only rows that have no blocking validation errors
      const validRecords = previewData.rows
        .filter(r => r.errors.length === 0)
        .map(r => r.data);

      if (validRecords.length === 0) {
        alert('There are no valid data rows to import.');
        setImportingData(false);
        return;
      }

      const res = await api.importConfirm(importType, validRecords);
      setImportSuccessMsg(`🎉 Successfully imported/updated ${res.count} records!`);
      // Reset preview states
      setPreviewData(null);
      setImportFile(null);
      setImportFileName('');
    } catch (err) {
      alert(err.message || 'Import failed.');
    } finally {
      setImportingData(false);
    }
  }

  // 4. Download Full Database Backup ZIP
  async function handleDownloadBackup() {
    setDownloadingBackup(true);
    try {
      const res = await fetch(`${BASE}/backup/download`, {
        headers: {
          Authorization: `Bearer ${getToken()}`
        }
      });
      if (!res.ok) throw new Error('Backup download failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TEE_Backup_${new Date().toISOString().split('T')[0].replace(/-/g, '_')}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      // Reload status to show updated size and timestamp
      await fetchBackupStatus();
    } catch (e) {
      console.error(e);
      alert('Failed to generate backup ZIP.');
    } finally {
      setDownloadingBackup(false);
    }
  }

  // 5. Restore Backup ZIP Upload Handler
  const handleRestoreFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setRestoreFile(file);
    setRestoreFileName(file.name);
    setRestoreError('');
    setRestoreSuccess(false);
  };

  async function handleRestoreSubmit(e) {
    e.preventDefault();
    if (!restoreFile) return;
    setRestoring(true);
    setRestoreError('');
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target.result.split(',')[1];
        try {
          const res = await api.restoreDatabase(base64);
          if (res.success) {
            setRestoreSuccess(true);
            setRestoreFile(null);
            setRestoreFileName('');
            setRestoreConfirmText('');
            setShowRestoreModal(false);
            alert('Database successfully restored! Dashboard metrics and lists will refresh.');
          }
        } catch (err) {
          setRestoreError(err.message || 'Restore failed. Ensure the uploaded zip file is a valid TEE backup.');
        } finally {
          setRestoring(false);
        }
      };
      reader.readAsDataURL(restoreFile);
    } catch (err) {
      setRestoreError(err.message || 'File reader error');
      setRestoring(false);
    }
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-6 lg:p-8 text-white shadow-xl border border-slate-700/30">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Database size={150} />
        </div>
        <div className="relative space-y-4 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-bold border border-red-500/20 uppercase tracking-widest">
            <Sparkles size={11} /> Administrator panel
          </span>
          <h1 className="text-2xl lg:text-4xl font-black tracking-tight leading-none">Admin Control Center</h1>
          <p className="text-slate-300 text-xs lg:text-sm font-medium leading-relaxed">
            Manage data import workflows, generate custom spreadsheet or PDF ledger reports, and handle full database zip backup & restore checkpoints.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* ================= SECTION 1: DATA EXPORT CENTER ================= */}
        <section className="bg-white/95 backdrop-blur-md rounded-3xl p-6 shadow-md border border-slate-200/60 flex flex-col space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2.5 bg-red-50 text-red-600 rounded-xl">
              <Download size={20} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-800">Export Center</h2>
              <p className="text-xs text-slate-400 font-semibold">Generate structured reports and ledgers</p>
            </div>
          </div>

          <form onSubmit={handleExport} className="space-y-4 flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
              {/* Category */}
              <div className="space-y-2">
                <label className="block">Dataset Category</label>
                <select
                  value={exportType}
                  onChange={(e) => setExportType(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 capitalize focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all shadow-sm"
                >
                  <option value="products">Products list</option>
                  <option value="shops">Shops & customers</option>
                  <option value="online-sales">Online sales</option>
                  <option value="offline-sales">Offline sales</option>
                  <option value="returns">Product returns</option>
                  <option value="pending-dues">Pending payments ledger</option>
                  <option value="all">Full backup bundle</option>
                </select>
              </div>

              {/* Format */}
              <div className="space-y-2">
                <label className="block">File Format</label>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all shadow-sm"
                >
                  <option value="xlsx">Excel (.xlsx)</option>
                  <option value="csv">CSV Sheet</option>
                  <option value="pdf">PDF Report</option>
                </select>
              </div>
            </div>

            {/* Date Range Selection */}
            <div className="space-y-2 text-xs font-bold text-slate-500 uppercase tracking-wider pt-2">
              <label className="block">Scope & Date Range Filter</label>
              <div className="grid grid-cols-3 gap-2">
                {['all', 'month', 'custom'].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setExportRange(mode)}
                    className={`py-2 px-3 rounded-xl border text-[11px] font-bold transition-all shadow-sm ${
                      exportRange === mode
                        ? 'bg-red-600 border-red-600 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {mode === 'all' && 'All Time'}
                    {mode === 'month' && 'By Month'}
                    {mode === 'custom' && 'Custom Date'}
                  </button>
                ))}
              </div>

              {/* Range Filters Fields */}
              {exportRange === 'month' && (
                <div className="pt-2 animate-fadeIn">
                  <input
                    type="month"
                    required
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all shadow-sm"
                  />
                </div>
              )}

              {exportRange === 'custom' && (
                <div className="grid grid-cols-2 gap-3 pt-2 animate-fadeIn">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Start Date</span>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all shadow-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">End Date</span>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all shadow-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={exporting}
                className="w-full py-3.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-2xl transition-all shadow-md shadow-red-600/10 flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 text-sm"
              >
                {exporting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Generating Document Report...
                  </>
                ) : (
                  <>
                    <FileDown size={16} />
                    Download Exported File
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* ================= SECTION 2: SYSTEM BACKUP & RESTORE ================= */}
        <section className="bg-white/95 backdrop-blur-md rounded-3xl p-6 shadow-md border border-slate-200/60 flex flex-col space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Database size={20} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-800">System Backup & Restore</h2>
              <p className="text-xs text-slate-400 font-semibold">Checkpoint and restore the entire database</p>
            </div>
          </div>

          <div className="space-y-6 flex-1 flex flex-col justify-between">
            {/* Status Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 relative overflow-hidden group">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Last Backup Generated</span>
                <p className="text-xs font-bold text-slate-700 mt-1">
                  {loadingStatus ? 'Checking...' : formatTime(backupStatus.lastBackupDate)}
                </p>
                <Clock size={40} className="absolute -right-4 -bottom-4 text-slate-200/50 group-hover:scale-110 transition-transform duration-300" />
              </div>
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 relative overflow-hidden group">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Backup File Size</span>
                <p className="text-xs font-bold text-slate-700 mt-1">
                  {loadingStatus ? 'Checking...' : formatBytes(backupStatus.backupSize)}
                </p>
                <FileSpreadsheet size={40} className="absolute -right-4 -bottom-4 text-slate-200/50 group-hover:scale-110 transition-transform duration-300" />
              </div>
            </div>

            {/* DANGER RESTORE BOX */}
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 space-y-3.5">
              <div className="flex items-center gap-2 text-rose-800 font-extrabold text-xs uppercase tracking-wider">
                <AlertTriangle size={15} className="text-rose-600 animate-pulse" /> DANGER ZONE: Database Restore
              </div>
              <p className="text-[11px] text-rose-700 font-medium leading-relaxed">
                Restoring database from ZIP will erase all current records and load backup data. Ensure you have downloaded a copy before restoring!
              </p>
              
              <div className="flex gap-2">
                <label className="flex-1">
                  <span className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 bg-white border border-rose-200 hover:bg-rose-100 cursor-pointer text-rose-700 rounded-xl text-xs font-bold transition-all text-center">
                    <Upload size={13} />
                    {restoreFileName ? restoreFileName.slice(0, 20) + '...' : 'Select ZIP File'}
                  </span>
                  <input
                    type="file"
                    accept=".zip"
                    onChange={handleRestoreFileChange}
                    className="hidden"
                  />
                </label>

                {restoreFile && (
                  <button
                    onClick={() => {
                      setRestoreConfirmText('');
                      setShowRestoreModal(true);
                    }}
                    className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-all shadow-sm"
                  >
                    Restore Now
                  </button>
                )}
              </div>
            </div>

            {/* Download Backup Trigger */}
            <button
              onClick={handleDownloadBackup}
              disabled={downloadingBackup}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-2xl transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 text-sm"
            >
              {downloadingBackup ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Generating Full Zip Archive...
                </>
              ) : (
                <>
                  <FileSpreadsheet size={16} />
                  Generate & Download Full Backup (.zip)
                </>
              )}
            </button>
          </div>
        </section>

      </div>

      {/* ================= SECTION 3: INTERACTIVE IMPORT WIZARD ================= */}
      <section className="bg-white/95 backdrop-blur-md rounded-3xl p-6 shadow-md border border-slate-200/60 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <Upload size={20} />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-800">Interactive Import Wizard</h2>
            <p className="text-xs text-slate-400 font-semibold">Bulk upload Excel or CSV files with real-time pre-validation preview</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
            {/* Import Category Selector */}
            <div className="space-y-2 md:col-span-1">
              <label className="block">Target Import Category</label>
              <select
                value={importType}
                onChange={(e) => {
                  setImportType(e.target.value);
                  setPreviewData(null);
                  setImportFile(null);
                  setImportFileName('');
                }}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all shadow-sm"
              >
                <option value="products">🆕 Products (Add / Overwrite)</option>
                <option value="shops">🏪 Shops / Customer Ledgers</option>
                <option value="price-lists">🏷️ Price Lists (Bulk Update Prices)</option>
                <option value="inventory-stock">📦 Inventory Stock (Bulk Update Qty)</option>
              </select>
            </div>

            {/* File Drag and Drop Zone */}
            <div className="md:col-span-2 space-y-2">
              <label className="block">Upload Spreadsheet (.xlsx, .csv)</label>
              <label className="flex items-center gap-3 w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all shadow-sm">
                <FileSpreadsheet size={18} className="text-slate-400" />
                <span className="text-xs font-semibold truncate">
                  {importFileName ? importFileName : 'Select Spreadsheet File'}
                </span>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Real-time Preview Validation Table */}
          {loadingPreview && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-xs font-semibold space-y-2">
              <RefreshCw size={24} className="animate-spin text-red-500" />
              <span>Analyzing spreadsheet rows and querying duplicates...</span>
            </div>
          )}

          {previewError && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle size={16} />
              {previewError}
            </div>
          )}

          {importSuccessMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-sm">
              <CheckCircle2 size={16} className="text-emerald-500" />
              {importSuccessMsg}
            </div>
          )}

          {previewData && (
            <div className="space-y-4 pt-2 animate-fadeIn">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 rounded-2xl p-4 border border-slate-100 text-xs font-semibold">
                <div className="flex gap-4">
                  <span className="flex items-center gap-1"><Info size={14} className="text-slate-400" /> Total Rows: {previewData.rows?.length || 0}</span>
                  <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 size={14} /> Valid: {previewData.rows?.filter(r => r.errors.length === 0).length || 0}</span>
                  <span className="flex items-center gap-1 text-red-500"><AlertTriangle size={14} /> Errors: {previewData.rows?.filter(r => r.errors.length > 0).length || 0}</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  {previewData.isValid ? (
                    <span className="text-emerald-600 font-extrabold">✓ Spreadsheet Validated</span>
                  ) : (
                    <span className="text-rose-500 font-extrabold">⚠️ Contains Validation Errors</span>
                  )}
                </div>
              </div>

              {/* Table Data Preview */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-[300px] overflow-y-auto text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[9px] font-extrabold border-b sticky top-0">
                    <tr>
                      <th className="px-4 py-2.5 w-12 text-center">Row</th>
                      <th className="px-4 py-2.5">Identifier / Name</th>
                      <th className="px-4 py-2.5">Mapped Parameters preview</th>
                      <th className="px-4 py-2.5">Validation details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {previewData.rows.map((row) => (
                      <tr key={row.index} className={`hover:bg-slate-50/50 ${row.errors.length > 0 ? 'bg-red-50/20' : (row.isDuplicate ? 'bg-amber-50/20' : '')}`}>
                        <td className="px-4 py-3 text-center text-slate-400">{row.index}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {row.data.name || row.data.sku || 'N/A'}
                        </td>
                        <td className="px-4 py-3 font-mono text-[10px] text-slate-500">
                          {Object.entries(row.data)
                            .filter(([key]) => key !== 'name' && key !== 'sku')
                            .map(([key, val]) => `${key}: ${val}`).join(' | ') || 'No secondary fields'}
                        </td>
                        <td className="px-4 py-3 space-y-1">
                          {row.errors.map((e, i) => (
                            <span key={i} className="inline-block bg-red-50 text-red-600 border border-red-100 rounded-full px-2.5 py-0.5 text-[9px] font-extrabold uppercase">
                              {e}
                            </span>
                          ))}
                          {row.warnings.map((w, i) => (
                            <span key={i} className="inline-block bg-amber-50 text-amber-600 border border-amber-100 rounded-full px-2.5 py-0.5 text-[9px] font-extrabold">
                              {w}
                            </span>
                          ))}
                          {row.errors.length === 0 && row.warnings.length === 0 && (
                            <span className="inline-block bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full px-2.5 py-0.5 text-[9px] font-extrabold">
                              ✓ Row Valid
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setPreviewData(null);
                    setImportFile(null);
                    setImportFileName('');
                  }}
                  className="flex-1 py-3 border border-slate-200 rounded-2xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all text-center"
                >
                  Clear Import
                </button>
                <button
                  type="button"
                  onClick={handleImportConfirm}
                  disabled={importingData || previewData.rows.filter(r => r.errors.length === 0).length === 0}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-2xl transition-all shadow-md shadow-emerald-600/10 flex items-center justify-center gap-1.5"
                >
                  {importingData ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Importing Records...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      Confirm & Import Valid Records ({previewData.rows.filter(r => r.errors.length === 0).length})
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* DANGER OVERWRITE RESTORE WARNING MODAL */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-scaleUp space-y-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-100 text-red-600 rounded-2xl shrink-0">
                <AlertOctagon size={28} />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-800">Restore Complete Database</h3>
                <p className="text-xs text-slate-400 font-semibold">WARNING: Irreversible Database Overwrite</p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                You are about to restore the database from <span className="font-extrabold text-slate-800">"{restoreFileName}"</span>.
                This operation will <span className="text-red-600 font-extrabold">DELETE ALL CURRENT DATA</span> including active products, shop ledgers, sales records, returns history, and metadata.
              </p>
              
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-[11px] text-red-700 font-bold space-y-1.5">
                <p>⚠️ To confirm this destructive action, please type the confirmation code below:</p>
                <div className="flex items-center gap-2 pt-1">
                  <span className="bg-white border border-red-200 select-all font-mono px-2 py-0.5 rounded text-xs select-none">RESTORE</span>
                  <input
                    type="text"
                    value={restoreConfirmText}
                    onChange={(e) => setRestoreConfirmText(e.target.value)}
                    placeholder="Type RESTORE"
                    className="flex-1 px-3 py-1 bg-white border border-red-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-red-500 uppercase font-mono"
                  />
                </div>
              </div>

              {restoreError && (
                <p className="text-xs text-red-600 font-bold bg-red-50 px-3 py-2 rounded-xl border border-red-100">{restoreError}</p>
              )}
            </div>

            <div className="flex gap-4 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowRestoreModal(false);
                  setRestoreConfirmText('');
                  setRestoreError('');
                }}
                className="flex-1 py-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRestoreSubmit}
                disabled={restoring || restoreConfirmText !== 'RESTORE'}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                {restoring ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Restoring...
                  </>
                ) : (
                  <>
                    <Play size={12} />
                    Confirm Restore
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
