import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  KeyRound, Clock, CheckCircle2, XCircle, Eye,
  RefreshCw, Sparkles, User, Calendar, FileText, AlertCircle, X
} from 'lucide-react';

export default function AdminPasswordRequests() {
  const { user: adminUser } = useAuth();
  
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  
  // Modal states
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [processing, setProcessing] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchRequests = async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const data = await api.getPasswordChangeRequests();
      setRequests(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to fetch password change requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    api.logAdminAction('Accessed Password Change Requests Review Center').catch(err => console.error(err));
  }, []);

  const handleOpenDetails = (req) => {
    setSelectedRequest(req);
    setAdminNote(req.admin_note || '');
    setModalError('');
    setActionSuccess('');
  };

  const handleCloseDetails = () => {
    setSelectedRequest(null);
    setAdminNote('');
    setModalError('');
  };

  const handleProcessRequest = async (status) => {
    if (!selectedRequest) return;
    setProcessing(true);
    setModalError('');
    setActionSuccess('');
    try {
      let res;
      if (status === 'approved') {
        res = await api.approvePasswordChangeRequest(selectedRequest.id, adminNote);
        setActionSuccess('Password updated successfully.');
      } else {
        res = await api.rejectPasswordChangeRequest(selectedRequest.id, adminNote);
        setActionSuccess('Password change request rejected.');
      }
      
      // Refresh list silently
      await fetchRequests(true);
      
      // Close modal after a short delay
      setTimeout(() => {
        handleCloseDetails();
        setActionSuccess('');
      }, 1500);
    } catch (err) {
      console.error(err);
      setModalError(err.message || 'Failed to process request.');
    } finally {
      setProcessing(false);
    }
  };

  // Metrics
  const pendingRequests = requests.filter(r => r.status === 'pending');
  
  const approvedToday = requests.filter(r => {
    if (r.status !== 'approved' || !r.reviewed_at) return false;
    const reviewedDate = new Date(r.reviewed_at).toDateString();
    const todayDate = new Date().toDateString();
    return reviewedDate === todayDate;
  });

  const rejectedRequests = requests.filter(r => r.status === 'rejected');

  function formatTime(isoStr) {
    if (!isoStr) return 'N/A';
    const d = new Date(isoStr);
    return d.toLocaleString();
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-6 lg:p-8 text-white shadow-xl border border-slate-700/30">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <KeyRound size={150} />
        </div>
        <div className="relative space-y-4 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-bold border border-red-500/20 uppercase tracking-widest">
            <Sparkles size={11} /> Review center
          </span>
          <h1 className="text-2xl lg:text-4xl font-black tracking-tight leading-none">Password Change Requests</h1>
          <p className="text-slate-300 text-xs lg:text-sm font-medium leading-relaxed">
            Review and manage password change requests submitted by employees. Verify identities, input administrative feedback, and approve/reject credentials changes.
          </p>
        </div>
      </div>

      {/* Metrics Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pending Requests Card */}
        <div className="bg-slate-900/40 dark:bg-[#020617]/35 rounded-3xl p-5 border border-slate-900 relative overflow-hidden group">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Pending Requests</span>
          <p className="text-3xl font-black text-amber-500 mt-1">{pendingRequests.length}</p>
          <p className="text-[10px] text-slate-500 mt-1 font-semibold">Requires administrator intervention</p>
          <Clock size={45} className="absolute -right-4 -bottom-4 text-slate-800/10 dark:text-slate-800/5 group-hover:scale-110 transition-transform duration-300" />
        </div>

        {/* Approved Today Card */}
        <div className="bg-slate-900/40 dark:bg-[#020617]/35 rounded-3xl p-5 border border-slate-900 relative overflow-hidden group">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Approved Today</span>
          <p className="text-3xl font-black text-emerald-500 mt-1">{approvedToday.length}</p>
          <p className="text-[10px] text-slate-500 mt-1 font-semibold">Passwords updated successfully</p>
          <CheckCircle2 size={45} className="absolute -right-4 -bottom-4 text-slate-800/10 dark:text-slate-800/5 group-hover:scale-110 transition-transform duration-300" />
        </div>

        {/* Rejected Requests Card */}
        <div className="bg-slate-900/40 dark:bg-[#020617]/35 rounded-3xl p-5 border border-slate-900 relative overflow-hidden group">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Rejected Requests</span>
          <p className="text-3xl font-black text-rose-500 mt-1">{rejectedRequests.length}</p>
          <p className="text-[10px] text-slate-500 mt-1 font-semibold">Denied or invalid credentials changes</p>
          <XCircle size={45} className="absolute -right-4 -bottom-4 text-slate-800/10 dark:text-slate-800/5 group-hover:scale-110 transition-transform duration-300" />
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white/95 dark:bg-[#1E293B]/95 backdrop-blur-md rounded-3xl p-6 shadow-md border border-slate-200/60 dark:border-[#334155]/60 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#334155] pb-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-800 dark:text-[#F8FAFC]">All Password Change Requests</h2>
            <p className="text-xs text-slate-400 dark:text-[#94A3B8] font-semibold">History log and pending queue of employee requests</p>
          </div>
          <button
            onClick={() => fetchRequests(false)}
            className="p-2 text-slate-400 dark:text-[#94A3B8] hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-[#F8FAFC] rounded-xl transition-all border border-slate-200 dark:border-[#334155]"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-2xl text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div className="border border-slate-200 dark:border-[#334155] rounded-2xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400 dark:text-slate-500">
              <RefreshCw size={24} className="animate-spin text-red-500" />
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
              <KeyRound size={36} className="mb-2 opacity-30 text-slate-400" />
              <p className="text-xs font-semibold">No password change requests registered yet</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50 dark:bg-[#0F172A] border-b border-slate-200 dark:border-b-[#334155] text-slate-500 dark:text-[#94A3B8] uppercase font-bold sticky top-0 z-10 text-[9px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Employee Details</th>
                  <th className="px-4 py-3">Date Requested</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#334155] font-medium text-slate-700 dark:text-[#CBD5E1] bg-white dark:bg-[#1E293B]">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        {r.employee_avatar ? (
                          <img
                            src={r.employee_avatar}
                            alt={r.employee_name}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-800 shadow-sm"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-red-650 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                            {r.employee_name?.[0]?.toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="text-xs font-bold text-slate-850 dark:text-[#F8FAFC]">{r.employee_name}</div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold font-mono">ID: {r.employee_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-450 font-semibold">
                      {formatTime(r.requested_at)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                        r.status === 'pending'
                          ? 'bg-amber-955/20 text-amber-400 border-amber-900/40 animate-pulse'
                          : r.status === 'approved'
                          ? 'bg-emerald-955/20 text-emerald-450 border-emerald-900/40'
                          : 'bg-rose-955/20 text-rose-400 border-rose-900/40'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => handleOpenDetails(r)}
                        className="py-1 px-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-[#CBD5E1] border border-slate-200 dark:border-[#334155] rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5"
                      >
                        <Eye size={12} />
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Details Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 dark:bg-[#1E293B] rounded-3xl max-w-lg w-full shadow-2xl border border-slate-800 overflow-hidden transform transition-all text-slate-100">
            {/* Modal Header */}
            <div className="px-6 py-4.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-200 flex items-center gap-2 text-sm uppercase tracking-wider">
                <KeyRound className="text-red-500 w-5 h-5" />
                Request Details
              </h3>
              <button
                onClick={handleCloseDetails}
                disabled={processing}
                className="text-slate-400 hover:text-slate-250 p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5">
              {/* Success Alert */}
              {actionSuccess && (
                <div className="bg-emerald-955/25 border-l-4 border-emerald-500 p-3 rounded-lg text-xs font-bold text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 size={15} className="shrink-0" />
                  {actionSuccess}
                </div>
              )}
              {/* Error Alert */}
              {modalError && (
                <div className="bg-rose-955/25 border-l-4 border-rose-500 p-3 rounded-lg text-xs font-bold text-rose-455 flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  {modalError}
                </div>
              )}

              {/* Employee Summary Card */}
              <div className="flex items-center gap-4 p-4 bg-slate-950 rounded-2xl border border-slate-800">
                {selectedRequest.employee_avatar ? (
                  <img
                    src={selectedRequest.employee_avatar}
                    alt={selectedRequest.employee_name}
                    className="w-12 h-12 rounded-full object-cover border border-slate-800 shadow"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-red-650 text-white flex items-center justify-center text-lg font-bold shadow">
                    {selectedRequest.employee_name?.[0]?.toUpperCase()}
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-black text-slate-200">{selectedRequest.employee_name}</h4>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">Employee ID: {selectedRequest.employee_id}</p>
                </div>
              </div>

              {/* Request Metadata Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-950/45 p-3 rounded-xl border border-slate-900/60">
                  <span className="text-[10px] text-slate-500 uppercase font-black block tracking-wider">Date Requested</span>
                  <span className="font-bold text-slate-300 mt-1 block">{formatTime(selectedRequest.requested_at)}</span>
                </div>
                <div className="bg-slate-950/45 p-3 rounded-xl border border-slate-900/60">
                  <span className="text-[10px] text-slate-500 uppercase font-black block tracking-wider">Current Status</span>
                  <span className={`inline-block text-[9px] font-black uppercase tracking-wider border rounded-full px-2 py-0.2 mt-1.5 ${
                    selectedRequest.status === 'pending'
                      ? 'bg-amber-955/20 text-amber-400 border-amber-900/40 animate-pulse'
                      : selectedRequest.status === 'approved'
                      ? 'bg-emerald-955/20 text-emerald-450 border-emerald-900/40'
                      : 'bg-rose-955/20 text-rose-400 border-rose-900/40'
                  }`}>
                    {selectedRequest.status}
                  </span>
                </div>
              </div>

              {/* Password Hashes (Security Section) */}
              <div className="space-y-2 p-3 bg-slate-950/20 rounded-2xl border border-slate-900">
                <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider block">Security Details (SHA-255 Hex Hashes)</span>
                <div className="space-y-1.5 pt-1">
                  <div className="text-[10px] font-mono leading-relaxed bg-slate-950 p-2.5 rounded-xl border border-slate-900 flex justify-between gap-4">
                    <span className="text-slate-500 font-bold shrink-0">Current Hash:</span>
                    <span className="text-slate-400 truncate select-all">{selectedRequest.current_password_hash}</span>
                  </div>
                  <div className="text-[10px] font-mono leading-relaxed bg-slate-950 p-2.5 rounded-xl border border-slate-900 flex justify-between gap-4">
                    <span className="text-slate-505 font-bold shrink-0 text-red-400">New Hash:</span>
                    <span className="text-red-300 truncate select-all">{selectedRequest.new_password_hash}</span>
                  </div>
                </div>
              </div>

              {/* Historical Audit Info (If Reviewed) */}
              {selectedRequest.status !== 'pending' && (
                <div className="bg-slate-950/45 p-4 rounded-xl border border-slate-900 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">Reviewed At:</span>
                    <span className="text-slate-350 font-semibold">{formatTime(selectedRequest.reviewed_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">Reviewed By Admin:</span>
                    <span className="text-slate-350 font-semibold font-mono">ID: {selectedRequest.reviewed_by_admin_id}</span>
                  </div>
                  {selectedRequest.admin_note && (
                    <div className="pt-1.5 border-t border-slate-900/60 mt-1.5">
                      <span className="text-slate-500 font-bold block mb-1">Administrator Note:</span>
                      <p className="text-slate-300 italic bg-slate-950 p-2.5 rounded-lg border border-slate-900">{selectedRequest.admin_note}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Action Form (Only for Pending) */}
              {selectedRequest.status === 'pending' && (
                <div className="space-y-3">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Administrator Note / Rejection Reason (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Enter review remarks or rejection reasons..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444] font-semibold bg-slate-950 text-slate-105 text-xs placeholder:text-slate-600"
                    disabled={processing}
                  />

                  {/* Actions Footer */}
                  <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => handleProcessRequest('rejected')}
                      disabled={processing}
                      className="px-4 py-2 bg-rose-650 hover:bg-rose-700 text-white font-bold rounded-xl shadow transition-colors text-xs uppercase tracking-wider flex items-center gap-1.5"
                    >
                      <XCircle size={14} />
                      Reject Request
                    </button>
                    <button
                      type="button"
                      onClick={() => handleProcessRequest('approved')}
                      disabled={processing}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow transition-colors text-xs uppercase tracking-wider flex items-center gap-1.5"
                    >
                      <CheckCircle2 size={14} />
                      Approve & Update
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
