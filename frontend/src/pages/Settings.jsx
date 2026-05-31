import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  Building2, Upload, UserPlus, Edit2, Key, UserX, UserCheck,
  History, Save, QrCode, AlertCircle, Eye, RefreshCw, X, ShieldAlert,
  Mail, Phone, FileText, CheckCircle2, ChevronRight, HelpCircle
} from 'lucide-react';

export default function Settings() {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('company'); // 'company' | 'users'
  
  // Company Profile states
  const [profile, setProfile] = useState({
    companyName: '',
    logo: '',
    gstNumber: '',
    address: '',
    mobile: '',
    email: '',
    upiId: '',
    upiQr: ''
  });
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [savingCompany, setSavingCompany] = useState(false);
  const [companyError, setCompanyError] = useState('');
  const [companySuccess, setCompanySuccess] = useState('');

  // Employees states
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [employeesError, setEmployeesError] = useState('');
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  
  // Selected Employee for modal operations
  const [selectedEmp, setSelectedEmp] = useState(null);
  
  // Form states for modals
  const [addForm, setAddForm] = useState({ name: '', username: '', password: '' });
  const [editForm, setEditForm] = useState({ name: '', username: '' });
  const [passwordForm, setPasswordForm] = useState({ password: '', confirmPassword: '' });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);
  
  // Logs Audit state
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsTab, setLogsTab] = useState('login'); // 'login' | 'activity'

  useEffect(() => {
    fetchCompanySettings();
    fetchEmployees();
  }, []);

  const fetchCompanySettings = async () => {
    try {
      setLoadingCompany(true);
      const data = await api.getCompanySettings();
      if (data) {
        setProfile({
          companyName: data.companyName || '',
          logo: data.logo || '',
          gstNumber: data.gstNumber || '',
          address: data.address || '',
          mobile: data.mobile || '',
          email: data.email || '',
          upiId: data.upiId || '',
          upiQr: data.upiQr || ''
        });
      }
      setCompanyError('');
    } catch (err) {
      console.error(err);
      setCompanyError('Failed to fetch company profile settings.');
    } finally {
      setLoadingCompany(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const data = await api.getEmployees();
      // Ensure we sort employees so admin is on top or alphabetically
      const sorted = Array.isArray(data) ? [...data].sort((a, b) => {
        if (a.username === 'admin') return -1;
        if (b.username === 'admin') return 1;
        return a.name.localeCompare(b.name);
      }) : [];
      setEmployees(sorted);
      setEmployeesError('');
    } catch (err) {
      console.error(err);
      setEmployeesError('Failed to fetch employee list.');
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleSaveCompany = async (e) => {
    e.preventDefault();
    setSavingCompany(true);
    setCompanyError('');
    setCompanySuccess('');
    try {
      // Validate mobile if entered
      if (profile.mobile && !/^\d{10}$/.test(profile.mobile.replace(/[\s-+]/g, '').slice(-10))) {
        throw new Error('Please enter a valid 10-digit mobile number');
      }
      // Validate email if entered
      if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
        throw new Error('Please enter a valid email address');
      }

      await api.updateCompanySettings(profile);
      setCompanySuccess('Company settings saved successfully!');
      setTimeout(() => setCompanySuccess(''), 4000);
    } catch (err) {
      console.error(err);
      setCompanyError(err.message || 'Failed to update company settings.');
    } finally {
      setSavingCompany(false);
    }
  };

  const handleFileChange = (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // File size validation (limit to 2MB to keep Mongo base64 performant)
    if (file.size > 2 * 1024 * 1024) {
      alert('File size too large. Please select an image under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setProfile(prev => ({ ...prev, [field]: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (field) => {
    setProfile(prev => ({ ...prev, [field]: '' }));
  };

  // Add Employee Form handler
  const handleAddEmployee = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    
    if (!addForm.name.trim() || !addForm.username.trim() || !addForm.password.trim()) {
      setFormError('All fields are required.');
      return;
    }

    if (addForm.password.length < 4) {
      setFormError('Password must be at least 4 characters long.');
      return;
    }

    try {
      setModalSubmitting(true);
      await api.addEmployee(addForm);
      setFormSuccess('Employee created successfully!');
      setAddForm({ name: '', username: '', password: '' });
      await fetchEmployees();
      setTimeout(() => {
        setShowAddModal(false);
        setFormSuccess('');
      }, 1500);
    } catch (err) {
      console.error(err);
      setFormError(err.message || 'Failed to add employee.');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Edit Employee Form handler
  const handleEditEmployee = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!editForm.name.trim() || !editForm.username.trim()) {
      setFormError('Name and Username are required.');
      return;
    }

    try {
      setModalSubmitting(true);
      await api.updateEmployee(selectedEmp.id, editForm);
      setFormSuccess('Employee updated successfully!');
      await fetchEmployees();
      setTimeout(() => {
        setShowEditModal(false);
        setFormSuccess('');
      }, 1500);
    } catch (err) {
      console.error(err);
      setFormError(err.message || 'Failed to update employee details.');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Reset Password Form handler
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!passwordForm.password) {
      setFormError('Password is required.');
      return;
    }

    if (passwordForm.password.length < 4) {
      setFormError('Password must be at least 4 characters long.');
      return;
    }

    if (passwordForm.password !== passwordForm.confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    try {
      setModalSubmitting(true);
      await api.updateEmployee(selectedEmp.id, { password: passwordForm.password });
      setFormSuccess('Password reset successfully!');
      setPasswordForm({ password: '', confirmPassword: '' });
      setTimeout(() => {
        setShowPasswordModal(false);
        setFormSuccess('');
      }, 1500);
    } catch (err) {
      console.error(err);
      setFormError(err.message || 'Failed to reset employee password.');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Toggle Disable / Enable Employee
  const handleToggleStatus = async (employee) => {
    // Prevent self-disable
    if (employee.id === currentUser?.id || employee.username === currentUser?.username) {
      alert("You cannot disable your own administrator account.");
      return;
    }

    const nextStatus = !employee.disabled;
    const confirmMsg = nextStatus
      ? `Are you sure you want to DISABLE ${employee.name}'s account? They will lose access immediately.`
      : `Are you sure you want to ENABLE ${employee.name}'s account?`;
      
    if (!window.confirm(confirmMsg)) return;

    try {
      await api.updateEmployee(employee.id, { disabled: nextStatus });
      // Update local state instantly
      setEmployees(prev => prev.map(e => e.id === employee.id ? { ...e, disabled: nextStatus } : e));
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to update employee status.');
    }
  };

  // Load audit logs and open popup
  const handleOpenLogs = async (employee) => {
    setSelectedEmp(employee);
    setAuditLogs([]);
    setLogsTab('login');
    setShowLogsModal(true);
    setLoadingLogs(true);
    try {
      const allLogs = await api.getAuditLogs();
      // Filter logs belonging to this employee
      // Logs user field has format: "Name (@username)"
      const searchString = `(@${employee.username})`;
      const filtered = allLogs.filter(log => log.user && log.user.includes(searchString));
      setAuditLogs(filtered);
    } catch (err) {
      console.error(err);
      alert('Failed to load employee activity history.');
    } finally {
      setLoadingLogs(false);
    }
  };

  // Filter logs based on login vs activity tabs
  const filteredLogs = auditLogs.filter(log => {
    if (logsTab === 'login') {
      return log.action === 'Logged in';
    } else {
      return log.action !== 'Logged in';
    }
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 bg-[#F8FAFC]">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-md border border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="text-[#EF4444] w-8 h-8" />
            System Settings
          </h1>
          <p className="text-slate-500 font-medium text-sm mt-1">
            Configure company invoices, profile documents, and manage employee accounts and security settings.
          </p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('company')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === 'company'
                ? 'bg-white text-[#EF4444] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Company Profile
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === 'users'
                ? 'bg-white text-[#EF4444] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Employee Management
          </button>
        </div>
      </div>

      {/* Tabs Content */}
      {activeTab === 'company' ? (
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Company Invoice & Receipt Details</h2>
            <button
              onClick={fetchCompanySettings}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              title="Refresh settings"
            >
              <RefreshCw size={18} className={loadingCompany ? 'animate-spin text-[#EF4444]' : ''} />
            </button>
          </div>

          {loadingCompany ? (
            <div className="py-20 text-center text-slate-500 font-semibold flex flex-col items-center justify-center gap-3">
              <RefreshCw className="animate-spin text-[#EF4444] w-8 h-8" />
              Loading profile settings...
            </div>
          ) : (
            <form onSubmit={handleSaveCompany} className="p-6 md:p-8 space-y-8">
              {companyError && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl flex items-start gap-3">
                  <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                  <div>
                    <h5 className="text-sm font-bold text-red-800">Error Saving Changes</h5>
                    <p className="text-xs font-semibold text-red-700 mt-1">{companyError}</p>
                  </div>
                </div>
              )}

              {companySuccess && (
                <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-xl flex items-start gap-3">
                  <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={18} />
                  <div>
                    <h5 className="text-sm font-bold text-emerald-800">Profile Updated</h5>
                    <p className="text-xs font-semibold text-emerald-700 mt-0.5">{companySuccess}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form fields */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-900 mb-1.5">Company Name</label>
                    <input
                      type="text"
                      value={profile.companyName}
                      onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                      required
                      placeholder="e.g. The Elite Electrotek"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444] font-semibold text-slate-950 transition-all text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-1.5 font-sans">GST Number</label>
                    <input
                      type="text"
                      value={profile.gstNumber}
                      onChange={(e) => setProfile({ ...profile, gstNumber: e.target.value.toUpperCase() })}
                      placeholder="e.g. 22AAAAA0000A1Z5"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444] font-mono font-bold text-slate-950 transition-all text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-1.5">UPI ID (For Payments)</label>
                    <input
                      type="text"
                      value={profile.upiId}
                      onChange={(e) => setProfile({ ...profile, upiId: e.target.value.toLowerCase() })}
                      placeholder="e.g. company@ybl, elite@okaxis"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444] font-semibold text-slate-950 transition-all text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-1.5">Mobile Number</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                        <Phone size={16} />
                      </span>
                      <input
                        type="text"
                        value={profile.mobile}
                        onChange={(e) => setProfile({ ...profile, mobile: e.target.value })}
                        placeholder="e.g. +91 98765 43210"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444] font-semibold text-slate-950 transition-all text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-1.5">Email Address</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                        <Mail size={16} />
                      </span>
                      <input
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                        placeholder="e.g. info@eliteelectrotek.com"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444] font-semibold text-slate-950 transition-all text-sm"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-900 mb-1.5">Company Office Address</label>
                    <textarea
                      rows={3}
                      value={profile.address}
                      onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                      placeholder="Enter complete company registered address..."
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444] font-semibold text-slate-950 transition-all text-sm resize-none"
                    />
                  </div>
                </div>

                {/* Upload columns */}
                <div className="flex flex-col gap-6">
                  {/* Logo Upload Card */}
                  <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center flex flex-col items-center justify-center group relative min-h-[190px]">
                    {profile.logo ? (
                      <div className="space-y-3 w-full">
                        <img
                          src={profile.logo}
                          alt="Logo Preview"
                          className="h-20 max-w-full object-contain mx-auto rounded-lg shadow-sm border border-slate-200 bg-white p-1"
                        />
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-xs font-bold text-slate-500">Company Logo</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveImage('logo')}
                            className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-1 rounded-md transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center justify-center h-full w-full">
                        <div className="w-12 h-12 rounded-full bg-red-55 text-[#EF4444] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-200">
                          <Upload size={20} />
                        </div>
                        <span className="text-sm font-bold text-slate-800">Upload Company Logo</span>
                        <span className="text-xs font-semibold text-slate-400 mt-1">Drag & drop or browse PNG/JPG</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e, 'logo')}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  {/* UPI QR Code Upload Card */}
                  <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center flex flex-col items-center justify-center group relative min-h-[190px]">
                    {profile.upiQr ? (
                      <div className="space-y-3 w-full">
                        <img
                          src={profile.upiQr}
                          alt="UPI QR Code Preview"
                          className="h-24 max-w-full object-contain mx-auto rounded-lg shadow-sm border border-slate-200 bg-white p-1"
                        />
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                            <QrCode size={13} className="text-[#EF4444]" />
                            UPI Payments QR
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveImage('upiQr')}
                            className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-1 rounded-md transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center justify-center h-full w-full">
                        <div className="w-12 h-12 rounded-full bg-red-55 text-[#EF4444] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-200">
                          <QrCode size={20} />
                        </div>
                        <span className="text-sm font-bold text-slate-800">Upload UPI QR Code</span>
                        <span className="text-xs font-semibold text-slate-400 mt-1">Used on invoices & checkout</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e, 'upiQr')}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit panel */}
              <div className="pt-6 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={savingCompany}
                  className="bg-[#EF4444] hover:bg-red-600 text-white font-bold px-6 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Save size={18} />
                  {savingCompany ? 'Saving settings...' : 'Save Settings'}
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Employee list container */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Active Employee Directory</h2>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">
                  Create employee system credentials, enable/disable access, and check activity timelines.
                </p>
              </div>
              <button
                onClick={() => {
                  setAddForm({ name: '', username: '', password: '' });
                  setFormError('');
                  setShowAddModal(true);
                }}
                className="bg-[#EF4444] hover:bg-red-600 text-white font-bold px-4 py-2 rounded-xl shadow-md flex items-center gap-2 transition-all text-sm hover:-translate-y-0.5"
              >
                <UserPlus size={16} />
                Add Employee
              </button>
            </div>

            {loadingEmployees ? (
              <div className="py-20 text-center text-slate-500 font-semibold flex flex-col items-center justify-center gap-3">
                <RefreshCw className="animate-spin text-[#EF4444] w-8 h-8" />
                Loading employee list...
              </div>
            ) : employeesError ? (
              <div className="p-8 text-center text-red-500 font-bold">{employeesError}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-3.5 text-xs font-bold text-slate-700 uppercase tracking-wider">Employee Name</th>
                      <th className="px-6 py-3.5 text-xs font-bold text-slate-700 uppercase tracking-wider">Username</th>
                      <th className="px-6 py-3.5 text-xs font-bold text-slate-700 uppercase tracking-wider">System Role</th>
                      <th className="px-6 py-3.5 text-xs font-bold text-slate-700 uppercase tracking-wider">Account Status</th>
                      <th className="px-6 py-3.5 text-xs font-bold text-slate-700 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {employees.map((emp) => {
                      const isSelf = emp.id === currentUser?.id || emp.username === currentUser?.username;
                      const isAdmin = emp.role === 'ADMIN' || emp.role === 'admin' || emp.username === 'admin';
                      
                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-6 py-4.5">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-full font-bold flex items-center justify-center text-sm shadow-sm ${
                                isAdmin ? 'bg-[#111827]/10 text-[#111827]' : 'bg-red-50 text-red-600'
                              }`}>
                                {emp.name?.[0]?.toUpperCase()}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 text-sm block">{emp.name}</span>
                                {isSelf && (
                                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase mt-0.5 inline-block">
                                    You
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4.5">
                            <span className="font-semibold text-slate-900 font-mono text-sm">@{emp.username}</span>
                          </td>
                          <td className="px-6 py-4.5">
                            <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold ${
                              isAdmin ? 'bg-[#111827]/10 text-[#111827] border border-[#111827]/20' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {emp.role}
                            </span>
                          </td>
                          <td className="px-6 py-4.5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                              emp.disabled
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${emp.disabled ? 'bg-red-600 animate-pulse' : 'bg-emerald-600'}`}></span>
                              {emp.disabled ? 'Disabled' : 'Active'}
                            </span>
                          </td>
                          <td className="px-6 py-4.5 text-right space-x-2 whitespace-nowrap">
                            {/* View Logs */}
                            <button
                              onClick={() => handleOpenLogs(emp)}
                              className="text-slate-600 hover:text-[#EF4444] hover:bg-red-50 p-1.5 rounded-lg inline-flex items-center gap-1 text-xs font-bold border border-slate-200 bg-white shadow-sm transition-all"
                              title="Audit Timeline"
                            >
                              <History size={14} />
                              Logs
                            </button>
                            
                            {/* Edit Info (Admin only on employee accounts, exclude system admin username if needed, but we can edit standard accounts) */}
                            <button
                              onClick={() => {
                                setSelectedEmp(emp);
                                setEditForm({ name: emp.name, username: emp.username });
                                setFormError('');
                                setShowEditModal(true);
                              }}
                              disabled={emp.username === 'admin'}
                              className="text-slate-600 hover:text-[#EF4444] hover:bg-red-50 p-1.5 rounded-lg inline-flex items-center gap-1 text-xs font-bold border border-slate-200 bg-white shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                              title="Edit Employee Name/Username"
                            >
                              <Edit2 size={14} />
                              Edit
                            </button>

                            {/* Reset Password */}
                            <button
                              onClick={() => {
                                setSelectedEmp(emp);
                                setPasswordForm({ password: '', confirmPassword: '' });
                                setFormError('');
                                setShowPasswordModal(true);
                              }}
                              className="text-slate-600 hover:text-[#EF4444] hover:bg-red-50 p-1.5 rounded-lg inline-flex items-center gap-1 text-xs font-bold border border-slate-200 bg-white shadow-sm transition-all"
                              title="Reset Password"
                            >
                              <Key size={14} />
                              Key
                            </button>

                            {/* Toggle Account Status */}
                            <button
                              onClick={() => handleToggleStatus(emp)}
                              disabled={isSelf || emp.username === 'admin'}
                              className={`p-1.5 rounded-lg inline-flex items-center gap-1 text-xs font-bold border shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                                emp.disabled
                                  ? 'text-emerald-700 hover:bg-emerald-50 border-emerald-200 bg-white'
                                  : 'text-red-700 hover:bg-red-50 border-red-200 bg-white'
                              }`}
                              title={emp.disabled ? 'Enable Account' : 'Disable Account'}
                            >
                              {emp.disabled ? <UserCheck size={14} /> : <UserX size={14} />}
                              {emp.disabled ? 'Enable' : 'Disable'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- ADD EMPLOYEE MODAL --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200/80 overflow-hidden transform transition-all">
            <div className="px-6 py-4.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 flex items-center gap-2">
                <UserPlus className="text-[#EF4444] w-5 h-5" />
                Add New Employee Account
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleAddEmployee} className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded text-xs font-bold text-red-700 flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="bg-emerald-50 border-l-4 border-emerald-500 p-3 rounded text-xs font-bold text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 size={15} className="shrink-0" />
                  {formSuccess}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  placeholder="e.g. Karan Kumar"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444] font-semibold text-slate-950 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Username (Login ID)</label>
                <input
                  type="text"
                  required
                  value={addForm.username}
                  onChange={(e) => setAddForm({ ...addForm, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                  placeholder="e.g. karan"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444] font-mono font-bold text-slate-950 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Login Password</label>
                <input
                  type="password"
                  required
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  placeholder="Minimum 4 characters"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444] font-semibold text-slate-950 text-sm"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-4 py-2 bg-[#EF4444] hover:bg-red-600 text-white font-bold rounded-xl shadow-md transition-all text-sm flex items-center gap-1.5"
                >
                  {modalSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT EMPLOYEE DETAILS MODAL --- */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200/80 overflow-hidden transform transition-all">
            <div className="px-6 py-4.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 flex items-center gap-2">
                <Edit2 className="text-[#EF4444] w-5 h-5" />
                Edit Employee Details
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleEditEmployee} className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded text-xs font-bold text-red-700 flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="bg-emerald-50 border-l-4 border-emerald-500 p-3 rounded text-xs font-bold text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 size={15} className="shrink-0" />
                  {formSuccess}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444] font-semibold text-slate-950 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Username (Login ID)</label>
                <input
                  type="text"
                  required
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444] font-mono font-bold text-slate-950 text-sm"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-4 py-2 bg-[#EF4444] hover:bg-red-600 text-white font-bold rounded-xl shadow-md transition-all text-sm"
                >
                  {modalSubmitting ? 'Updating...' : 'Update Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- RESET PASSWORD MODAL --- */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200/80 overflow-hidden transform transition-all">
            <div className="px-6 py-4.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 flex items-center gap-2">
                <Key className="text-[#EF4444] w-5 h-5" />
                Reset Employee Password
              </h3>
              <button onClick={() => setShowPasswordModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 mb-2">
                <p className="text-xs font-semibold text-slate-600 leading-normal">
                  You are resetting the password for <strong className="text-slate-900">{selectedEmp?.name}</strong> (username: <strong className="text-slate-900 font-mono">@{selectedEmp?.username}</strong>).
                </p>
              </div>

              {formError && (
                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded text-xs font-bold text-red-700 flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="bg-emerald-50 border-l-4 border-emerald-500 p-3 rounded text-xs font-bold text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 size={15} className="shrink-0" />
                  {formSuccess}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={passwordForm.password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                  placeholder="Minimum 4 characters"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444] font-semibold text-slate-950 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  placeholder="Retype password to confirm"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444] font-semibold text-slate-950 text-sm"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-4 py-2 bg-[#EF4444] hover:bg-red-600 text-white font-bold rounded-xl shadow-md transition-all text-sm"
                >
                  {modalSubmitting ? 'Saving...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- AUDIT TIMELINE HISTORY LOGS MODAL --- */}
      {showLogsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200/80 overflow-hidden transform transition-all flex flex-col max-h-[85vh]">
            <div className="px-6 py-4.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-extrabold text-slate-900 flex items-center gap-2">
                  <History className="text-[#EF4444] w-5 h-5 animate-pulse" />
                  Audit Logs: {selectedEmp?.name}
                </h3>
                <span className="text-[11px] font-semibold text-slate-500 block mt-0.5 font-mono">
                  Username: @{selectedEmp?.username}
                </span>
              </div>
              <button onClick={() => setShowLogsModal(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="px-6 py-2.5 border-b border-slate-100 flex gap-4 bg-slate-50/50 shrink-0">
              <button
                onClick={() => setLogsTab('login')}
                className={`pb-1 text-xs font-bold border-b-2 transition-all ${
                  logsTab === 'login'
                    ? 'border-[#EF4444] text-[#EF4444]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Login History
              </button>
              <button
                onClick={() => setLogsTab('activity')}
                className={`pb-1 text-xs font-bold border-b-2 transition-all ${
                  logsTab === 'activity'
                    ? 'border-[#EF4444] text-[#EF4444]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Activity History
              </button>
            </div>

            {/* Timeline Log Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loadingLogs ? (
                <div className="py-20 text-center text-slate-500 font-semibold flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="animate-spin text-[#EF4444] w-6 h-6" />
                  Loading logs audit...
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                    <HelpCircle size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-700 text-sm">No History Recorded</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      No logs found for this employee under "{logsTab === 'login' ? 'Login History' : 'Activity History'}"
                    </p>
                  </div>
                </div>
              ) : (
                <div className="relative border-l-2 border-slate-200 ml-3 pl-6 space-y-6">
                  {filteredLogs.map((log) => {
                    const logDate = new Date(log.time);
                    const formattedDate = logDate.toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    });
                    const formattedTime = logDate.toLocaleTimeString(undefined, {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    });

                    return (
                      <div key={log.id} className="relative group">
                        {/* Bullet Dot */}
                        <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow bg-[#EF4444] group-hover:scale-110 transition-transform duration-150"></div>
                        
                        <div className="bg-slate-50/80 border border-slate-100 hover:border-slate-200/80 p-3 rounded-2xl transition-all shadow-sm">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-xs font-bold text-[#EF4444] font-mono">
                              {formattedDate} at {formattedTime}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold uppercase font-sans">
                              {log.id.slice(0, 8)}
                            </span>
                          </div>
                          <p className="text-sm font-bold text-slate-800 mt-1.5 leading-normal">
                            {log.action}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-150 bg-slate-50 text-right shrink-0">
              <button
                type="button"
                onClick={() => setShowLogsModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-350 text-slate-800 font-bold rounded-xl text-sm transition-colors"
              >
                Close Logs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
