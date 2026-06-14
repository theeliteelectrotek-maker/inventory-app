import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Building2, Upload, UserPlus, Edit2, Key, UserX, UserCheck,
  History, Save, QrCode, AlertCircle, Eye, RefreshCw, X, ShieldAlert,
  Mail, Phone, FileText, CheckCircle2, ChevronRight, HelpCircle,
  Sun, Moon, Monitor, User, Palette, Lock, MapPin, Calendar, Globe,
  Trash2, KeyRound, Smartphone, Laptop, ShieldCheck, UserCog, XCircle, Clock
} from 'lucide-react';

export default function Settings() {
  const { user: currentUser, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();
  
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'admin' || currentUser?.username === 'admin';
  const [activeTab, setActiveTab] = useState(isAdmin ? 'company' : 'profile');

  // --- 1. Company Profile states (Admin Only) ---
  const [profile, setProfile] = useState({
    companyName: '',
    logo: '',
    gstNumber: '',
    address: '',
    mobile: '',
    email: '',
    upiId: '',
    upiQr: '',
    invoicePrefix: 'TEE',
    invoiceStartNumber: '0001'
  });
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [savingCompany, setSavingCompany] = useState(false);
  const [companyError, setCompanyError] = useState('');
  const [companySuccess, setCompanySuccess] = useState('');

  // --- 2. Employees Management states (Admin Only) ---
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

  // --- 3. My Profile states (All Users) ---
  const [myProfileForm, setMyProfileForm] = useState({
    name: '',
    displayName: '',
    mobile: '',
    alternateMobile: '',
    email: '',
    dob: '',
    city: '',
    state: '',
    address: '',
    bio: '',
    emergencyContact: '',
    socialLinks: { linkedin: '', twitter: '', github: '' }
  });
  const [myAvatar, setMyAvatar] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // --- 4. Appearance states (All Users) ---
  const [appearanceForm, setAppearanceForm] = useState({
    theme: 'dark',
    sidebar: 'expanded',
    density: 'comfortable',
    accentColor: 'red',
    fontSize: 'medium',
    soundNotification: true
  });

  // --- 5. Account & Security states (All Users) ---
  const [passwordChange, setPasswordChange] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [myPasswordRequests, setMyPasswordRequests] = useState([]);
  const [loadingPasswordRequests, setLoadingPasswordRequests] = useState(false);

  const [securityQuestions, setSecurityQuestions] = useState([
    { question: 'What was the name of your first school?', answer: '' },
    { question: 'What is your mother\'s maiden name?', answer: '' }
  ]);
  const [securitySaving, setSecuritySaving] = useState(false);
  const [securitySuccess, setSecuritySuccess] = useState('');
  const [securityError, setSecurityError] = useState('');

  const [activeSessions, setActiveSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState('');

  // --- 6. Admin Extra Controls (Employee Profile Modal) ---
  const [showEmpProfileModal, setShowEmpProfileModal] = useState(false);
  const [selectedEmpProfile, setSelectedEmpProfile] = useState(null);
  const [empProfileForm, setEmpProfileForm] = useState({
    name: '',
    displayName: '',
    mobile: '',
    alternateMobile: '',
    email: '',
    dob: '',
    city: '',
    state: '',
    address: '',
    bio: '',
    emergencyContact: '',
    socialLinks: { linkedin: '', twitter: '', github: '' }
  });
  const [empAvatar, setEmpAvatar] = useState('');
  const [empProfileLoading, setEmpProfileLoading] = useState(false);
  const [empProfileSaving, setEmpProfileSaving] = useState(false);
  const [empProfileSuccess, setEmpProfileSuccess] = useState('');
  const [empProfileError, setEmpProfileError] = useState('');

  useEffect(() => {
    if (isAdmin) {
      fetchCompanySettings();
      fetchEmployees();
    } else {
      fetchMyPasswordRequests();
    }
    fetchMyProfile();
    fetchSessions();
  }, [currentUser, isAdmin]);

  useEffect(() => {
    if (currentUser?.appearance) {
      setAppearanceForm({
        theme: currentUser.appearance.theme || 'dark',
        sidebar: currentUser.appearance.sidebar || 'expanded',
        density: currentUser.appearance.density || 'comfortable',
        accentColor: currentUser.appearance.accentColor || 'red',
        fontSize: currentUser.appearance.fontSize || 'medium',
        soundNotification: currentUser.appearance.soundNotification !== undefined ? currentUser.appearance.soundNotification : true
      });
    }
  }, [currentUser]);

  // Image Cropping & Compression Helper
  const compressAndCropImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const size = 256; // High quality square size
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          
          let sx = 0, sy = 0, sw = img.width, sh = img.height;
          if (img.width > img.height) {
            sw = img.height;
            sx = (img.width - img.height) / 2;
          } else {
            sh = img.width;
            sy = (img.height - img.width) / 2;
          }
          
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);
          const base64 = canvas.toDataURL('image/jpeg', 0.85); // Compress 85%
          resolve(base64);
        };
        img.onerror = reject;
        img.src = event.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // --- API Calls ---

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
          upiQr: data.upiQr || '',
          invoicePrefix: data.invoicePrefix || 'TEE',
          invoiceStartNumber: data.invoiceStartNumber || '0001'
        });
      }
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
      const sorted = Array.isArray(data) ? [...data].sort((a, b) => {
        if (a.username === 'admin') return -1;
        if (b.username === 'admin') return 1;
        return a.name.localeCompare(b.name);
      }) : [];
      setEmployees(sorted);
    } catch (err) {
      console.error(err);
      setEmployeesError('Failed to fetch employee list.');
    } finally {
      setLoadingEmployees(false);
    }
  };

  const fetchMyProfile = async () => {
    try {
      setProfileLoading(true);
      const data = await api.getProfile();
      if (data) {
        setMyProfileForm({
          name: data.name || '',
          displayName: data.displayName || '',
          mobile: data.mobile || '',
          alternateMobile: data.alternateMobile || '',
          email: data.email || '',
          dob: data.dob || '',
          city: data.city || '',
          state: data.state || '',
          address: data.address || '',
          bio: data.bio || '',
          emergencyContact: data.emergencyContact || '',
          socialLinks: {
            linkedin: data.socialLinks?.linkedin || '',
            twitter: data.socialLinks?.twitter || '',
            github: data.socialLinks?.github || ''
          }
        });
        setMyAvatar(data.avatar || '');
        if (data.securityQuestions && data.securityQuestions.length > 0) {
          setSecurityQuestions(data.securityQuestions);
        }
      }
    } catch (err) {
      console.error(err);
      setProfileError('Failed to fetch profile settings.');
    } finally {
      setProfileLoading(false);
    }
  };

  const fetchSessions = async () => {
    try {
      setSessionsLoading(true);
      const data = await api.getActiveSessions();
      setActiveSessions(data);
    } catch (err) {
      console.error(err);
      setSessionsError('Failed to fetch login sessions.');
    } finally {
      setSessionsLoading(false);
    }
  };

  const fetchMyPasswordRequests = async () => {
    try {
      setLoadingPasswordRequests(true);
      const data = await api.getMyPasswordChangeRequests();
      setMyPasswordRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPasswordRequests(false);
    }
  };

  // --- Handlers ---

  const handleSaveCompany = async (e) => {
    e.preventDefault();
    setSavingCompany(true);
    setCompanyError('');
    setCompanySuccess('');
    try {
      if (profile.mobile && !/^\d{10}$/.test(profile.mobile.replace(/[\s-+]/g, '').slice(-10))) {
        throw new Error('Please enter a valid 10-digit mobile number');
      }
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

  const handleSaveMyProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSuccess('');
    setProfileError('');
    try {
      if (myProfileForm.mobile && !/^\d{10}$/.test(myProfileForm.mobile.replace(/[\s-+]/g, '').slice(-10))) {
        throw new Error('Please enter a valid 10-digit mobile number');
      }
      if (myProfileForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(myProfileForm.email)) {
        throw new Error('Please enter a valid email address');
      }
      const res = await api.updateProfile(myProfileForm);
      if (res.success) {
        setProfileSuccess('Profile updated successfully!');
        updateUser({ ...currentUser, ...res.user });
        setTimeout(() => setProfileSuccess(''), 4000);
      }
    } catch (err) {
      console.error(err);
      setProfileError(err.message || 'Failed to update profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleMyAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const base64 = await compressAndCropImage(file);
      const res = await api.updateAvatar(base64);
      if (res.success) {
        setMyAvatar(base64);
        updateUser({ ...currentUser, avatar: base64 });
        setProfileSuccess('Avatar updated successfully!');
        setTimeout(() => setProfileSuccess(''), 4000);
      }
    } catch (err) {
      console.error(err);
      setProfileError('Failed to upload and crop image.');
    }
  };

  const handleRemoveMyAvatar = async () => {
    try {
      const res = await api.updateAvatar('');
      if (res.success) {
        setMyAvatar('');
        updateUser({ ...currentUser, avatar: '' });
        setProfileSuccess('Avatar removed successfully!');
        setTimeout(() => setProfileSuccess(''), 4000);
      }
    } catch (err) {
      console.error(err);
      setProfileError('Failed to remove avatar.');
    }
  };

  const handleUpdateAppearance = async (updatedFields) => {
    try {
      const newAppearance = { ...appearanceForm, ...updatedFields };
      setAppearanceForm(newAppearance);
      const res = await api.updateAppearance(newAppearance);
      if (res.success) {
        updateUser({ ...currentUser, appearance: res.appearance });
      }
    } catch (err) {
      console.error('Failed to update appearance:', err);
    }
  };

  const handleSaveSecurityQuestions = async (e) => {
    e.preventDefault();
    setSecuritySaving(true);
    setSecuritySuccess('');
    setSecurityError('');
    try {
      if (securityQuestions.some(q => !q.answer.trim())) {
        throw new Error('Please answer all selected security questions.');
      }
      await api.updateSecurityQuestions(securityQuestions);
      setSecuritySuccess('Security questions updated successfully!');
      setTimeout(() => setSecuritySuccess(''), 4000);
    } catch (err) {
      console.error(err);
      setSecurityError(err.message || 'Failed to update security questions.');
    } finally {
      setSecuritySaving(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordSuccess('');
    setPasswordError('');
    if (passwordChange.newPassword !== passwordChange.confirmPassword) {
      setPasswordError('New passwords do not match.');
      setPasswordSaving(false);
      return;
    }
    try {
      const res = await api.changeMyPassword(passwordChange.currentPassword, passwordChange.newPassword);
      setPasswordSuccess(res.message || 'Password changed successfully!');
      setPasswordChange({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPasswordSuccess(''), 5050);
      
      if (!isAdmin) {
        fetchMyPasswordRequests();
      }
    } catch (err) {
      console.error(err);
      setPasswordError(err.message || 'Failed to update password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleTerminateOtherSessions = async () => {
    if (!window.confirm('Are you sure you want to log out of all other devices?')) return;
    try {
      await api.logoutAllSessions();
      alert('Logged out of all other devices.');
      fetchSessions();
    } catch (err) {
      console.error(err);
      alert('Failed to log out of other sessions.');
    }
  };

  // --- Employee Profile Modals (Admin Only) ---
  const handleOpenEmpProfile = async (emp) => {
    setSelectedEmpProfile(emp);
    setShowEmpProfileModal(true);
    setEmpProfileLoading(true);
    setEmpProfileSuccess('');
    setEmpProfileError('');
    try {
      const data = await api.getEmployeeProfile(emp.id);
      setEmpProfileForm({
        name: data.name || '',
        displayName: data.displayName || '',
        mobile: data.mobile || '',
        alternateMobile: data.alternateMobile || '',
        email: data.email || '',
        dob: data.dob || '',
        city: data.city || '',
        state: data.state || '',
        address: data.address || '',
        bio: data.bio || '',
        emergencyContact: data.emergencyContact || '',
        socialLinks: {
          linkedin: data.socialLinks?.linkedin || '',
          twitter: data.socialLinks?.twitter || '',
          github: data.socialLinks?.github || ''
        }
      });
      setEmpAvatar(data.avatar || '');
    } catch (err) {
      console.error(err);
      setEmpProfileError('Failed to fetch employee details.');
    } finally {
      setEmpProfileLoading(false);
    }
  };

  const handleSaveEmpProfile = async (e) => {
    e.preventDefault();
    setEmpProfileSaving(true);
    setEmpProfileSuccess('');
    setEmpProfileError('');
    try {
      await api.updateEmployeeProfile(selectedEmpProfile.id, empProfileForm);
      setEmpProfileSuccess('Employee profile updated successfully!');
      fetchEmployees();
      setTimeout(() => setEmpProfileSuccess(''), 4000);
    } catch (err) {
      console.error(err);
      setEmpProfileError(err.message || 'Failed to update employee profile.');
    } finally {
      setEmpProfileSaving(false);
    }
  };

  const handleEmpAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const base64 = await compressAndCropImage(file);
      const res = await api.updateEmployeeAvatar(selectedEmpProfile.id, base64);
      if (res.success) {
        setEmpAvatar(base64);
        setEmpProfileSuccess('Employee avatar updated successfully!');
        fetchEmployees();
        setTimeout(() => setEmpProfileSuccess(''), 4000);
      }
    } catch (err) {
      console.error(err);
      setEmpProfileError('Failed to crop and update employee avatar.');
    }
  };

  const handleRemoveEmpAvatar = async () => {
    try {
      const res = await api.updateEmployeeAvatar(selectedEmpProfile.id, '');
      if (res.success) {
        setEmpAvatar('');
        setEmpProfileSuccess('Employee avatar removed successfully!');
        fetchEmployees();
        setTimeout(() => setEmpProfileSuccess(''), 4000);
      }
    } catch (err) {
      console.error(err);
      setEmpProfileError('Failed to remove employee avatar.');
    }
  };

  // --- Core Company Files change handlers (Original) ---
  const handleCompanyFileChange = (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
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

  const handleEditEmployee = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    if (!editForm.name.trim() || !editForm.username.trim()) {
      setFormError('All fields are required.');
      return;
    }
    try {
      setModalSubmitting(true);
      await api.updateEmployee(selectedEmp.id, { name: editForm.name, username: editForm.username });
      setFormSuccess('Employee credentials updated successfully!');
      await fetchEmployees();
      setTimeout(() => {
        setShowEditModal(false);
        setFormSuccess('');
      }, 1500);
    } catch (err) {
      console.error(err);
      setFormError(err.message || 'Failed to edit employee.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    if (!passwordForm.password || passwordForm.password !== passwordForm.confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }
    if (passwordForm.password.length < 4) {
      setFormError('Password must be at least 4 characters long.');
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
      setFormError(err.message || 'Failed to reset password.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleToggleStatus = async (emp) => {
    const confirmation = window.confirm(`Are you sure you want to ${emp.disabled ? 'enable' : 'disable'} this account?`);
    if (!confirmation) return;
    try {
      await api.updateEmployee(emp.id, { disabled: !emp.disabled });
      await fetchEmployees();
    } catch (err) {
      console.error(err);
      alert('Failed to update employee status.');
    }
  };

  const handleOpenLogs = async (emp) => {
    setSelectedEmp(emp);
    setShowLogsModal(true);
    setLoadingLogs(true);
    try {
      const allLogs = await api.getAuditLogs();
      const searchString = `(@${emp.username})`;
      const filtered = allLogs.filter(log => log.user && log.user.includes(searchString));
      setAuditLogs(filtered);
    } catch (err) {
      console.error(err);
      alert('Failed to load employee activity history.');
    } finally {
      setLoadingLogs(false);
    }
  };

  const getCurrentSessionId = () => {
    const token = localStorage.getItem('inv_token');
    if (!token) return null;
    const parts = token.split('_');
    return parts[2] || null;
  };

  const filteredLogs = auditLogs.filter(log => {
    if (logsTab === 'login') {
      return log.action === 'Logged in';
    } else {
      return log.action !== 'Logged in';
    }
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 bg-transparent text-slate-100 font-sans">
      
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-900/60 dark:bg-[#020617]/50 backdrop-blur-md p-6 rounded-3xl shadow-xl border border-slate-200/5 dark:border-[#1E293B]/60 transition-all duration-300">
        <div>
          <h1 className="text-3xl font-extrabold text-[#EF4444] tracking-tight flex items-center gap-2.5">
            <UserCog className="w-9 h-9" />
            System & Profile Settings
          </h1>
          <p className="text-slate-400 dark:text-[#94A3B8] font-semibold text-sm mt-1">
            Manage your personal profile, customize interface theme accents, and review system configuration settings.
          </p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex bg-slate-950/45 p-1 rounded-2xl border border-slate-900 flex-wrap gap-1">
          {isAdmin && (
            <>
              <button
                onClick={() => setActiveTab('company')}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center gap-2 ${
                  activeTab === 'company'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Building2 size={14} />
                Company Settings
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center gap-2 ${
                  activeTab === 'users'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserPlus size={14} />
                Employee Directory
              </button>
            </>
          )}
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'profile'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User size={14} />
            My Profile
          </button>
          <button
            onClick={() => setActiveTab('appearance')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'appearance'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Palette size={14} />
            Appearance
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'security'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock size={14} />
            Security & Active Sessions
          </button>
        </div>
      </div>

      {/* --- COMPANY PROFILE TAB (Admin Only) --- */}
      {isAdmin && activeTab === 'company' && (
        <div className="bg-slate-900/40 dark:bg-[#020617]/35 rounded-3xl shadow-xl border border-slate-900 overflow-hidden transition-all duration-300">
          <div className="p-6 border-b border-slate-900 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-200">Company Invoice & Receipt Details</h2>
              <p className="text-xs font-semibold text-slate-400">Configure global information printed on customer sales receipts and invoices.</p>
            </div>
            <button
              onClick={fetchCompanySettings}
              className="text-slate-400 hover:text-slate-250 hover:bg-slate-900/60 p-2 rounded-xl border border-slate-900 flex items-center gap-1.5 text-xs font-bold transition-all"
            >
              <RefreshCw size={14} className={loadingCompany ? 'animate-spin text-red-500' : ''} />
              Reload
            </button>
          </div>

          {loadingCompany ? (
            <div className="py-20 text-center text-slate-400 font-semibold flex flex-col items-center justify-center gap-2">
              <RefreshCw className="animate-spin text-[#EF4444] w-8 h-8" />
              Loading system variables...
            </div>
          ) : (
            <form onSubmit={handleSaveCompany} className="p-6 md:p-8 space-y-6">
              {companyError && (
                <div className="bg-red-955/20 border-l-4 border-red-500 p-4 rounded-xl text-xs font-bold text-red-400 flex items-center gap-2.5">
                  <AlertCircle size={16} className="shrink-0" />
                  {companyError}
                </div>
              )}
              {companySuccess && (
                <div className="bg-emerald-955/20 border-l-4 border-emerald-500 p-4 rounded-xl text-xs font-bold text-emerald-400 flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="shrink-0" />
                  {companySuccess}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Registered Company Name</label>
                  <input
                    type="text"
                    required
                    value={profile.companyName}
                    onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                    placeholder="e.g. The Elite Electrotek"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444] font-semibold bg-slate-950/45 text-slate-100 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">GSTIN / Tax ID Number</label>
                  <input
                    type="text"
                    value={profile.gstNumber}
                    onChange={(e) => setProfile({ ...profile, gstNumber: e.target.value.toUpperCase() })}
                    placeholder="e.g. 27AAAAA1111A1Z1"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444] font-mono font-bold bg-slate-950/45 text-slate-100 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Primary Contact Number</label>
                  <input
                    type="text"
                    value={profile.mobile}
                    onChange={(e) => setProfile({ ...profile, mobile: e.target.value })}
                    placeholder="10-digit mobile number"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444] font-semibold bg-slate-950/45 text-slate-100 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Company Billing Email</label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    placeholder="e.g. sales@eliteelectrotek.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444] font-semibold bg-slate-950/45 text-slate-100 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">UPI ID (For Digital Payments)</label>
                  <input
                    type="text"
                    value={profile.upiId}
                    onChange={(e) => setProfile({ ...profile, upiId: e.target.value })}
                    placeholder="e.g. eliteelectrotek@okaxis"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444] font-mono bg-slate-950/45 text-slate-100 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Invoice Prefix</label>
                    <input
                      type="text"
                      required
                      value={profile.invoicePrefix}
                      onChange={(e) => setProfile({ ...profile, invoicePrefix: e.target.value.toUpperCase().replace(/\s/g, '') })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444] font-mono font-black bg-slate-950/45 text-slate-100 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Next Invoice Number</label>
                    <input
                      type="text"
                      required
                      value={profile.invoiceStartNumber}
                      onChange={(e) => setProfile({ ...profile, invoiceStartNumber: e.target.value.replace(/\D/g, '') })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444] font-mono font-bold bg-slate-950/45 text-slate-100 text-sm"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Registered Office Address</label>
                  <textarea
                    rows={2}
                    value={profile.address}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                    placeholder="Full street location details"
                    className="w-full px-4 py-3 rounded-xl border border-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444] font-semibold bg-slate-950/45 text-slate-100 text-sm"
                  />
                </div>
              </div>

              {/* Media Settings Section */}
              <div className="pt-6 border-t border-slate-900 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Logo Image */}
                <div className="p-4 bg-slate-950/20 rounded-2xl border border-slate-900/60 flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-24 h-24 rounded-xl bg-slate-950/50 border border-slate-900 flex items-center justify-center overflow-hidden shrink-0 relative group">
                    {profile.logo ? (
                      <img src={profile.logo} alt="Company Logo" className="w-full h-full object-contain p-1" />
                    ) : (
                      <Building2 size={24} className="text-slate-600" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <h4 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">Company Invoice Logo</h4>
                    <p className="text-[10px] text-slate-500 font-semibold leading-normal">JPEG/PNG format under 2MB. Applied to system print invoices.</p>
                    <div className="flex justify-center sm:justify-start gap-2">
                      <label className="bg-[#EF4444] hover:bg-red-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-colors flex items-center gap-1.5">
                        <Upload size={12} />
                        Upload
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleCompanyFileChange(e, 'logo')} />
                      </label>
                      {profile.logo && (
                        <button
                          type="button"
                          onClick={() => handleRemoveImage('logo')}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* UPI QR Code */}
                <div className="p-4 bg-slate-950/20 rounded-2xl border border-slate-900/60 flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-24 h-24 rounded-xl bg-slate-950/50 border border-slate-900 flex items-center justify-center overflow-hidden shrink-0 relative group">
                    {profile.upiQr ? (
                      <img src={profile.upiQr} alt="UPI QR Code" className="w-full h-full object-contain p-1" />
                    ) : (
                      <QrCode size={24} className="text-slate-600 animate-pulse" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <h4 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">Payment UPI QR Code</h4>
                    <p className="text-[10px] text-slate-500 font-semibold leading-normal">QR scan image under 2MB. Printed on receipts for instant digital checkout.</p>
                    <div className="flex justify-center sm:justify-start gap-2">
                      <label className="bg-[#EF4444] hover:bg-red-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-colors flex items-center gap-1.5">
                        <Upload size={12} />
                        Upload
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleCompanyFileChange(e, 'upiQr')} />
                      </label>
                      {profile.upiQr && (
                        <button
                          type="button"
                          onClick={() => handleRemoveImage('upiQr')}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="pt-4 border-t border-slate-900 text-right">
                <button
                  type="submit"
                  disabled={savingCompany}
                  className="px-6 py-2.5 bg-[#EF4444] hover:bg-red-600 text-white font-bold rounded-xl shadow-md transition-all text-sm inline-flex items-center gap-1.5 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40"
                >
                  <Save size={16} />
                  {savingCompany ? 'Saving Variables...' : 'Save Company Settings'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* --- EMPLOYEE DIRECTORY TAB (Admin Only) --- */}
      {isAdmin && activeTab === 'users' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-slate-900/40 dark:bg-[#020617]/35 rounded-3xl shadow-xl border border-slate-900 overflow-hidden">
            <div className="p-6 border-b border-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-200">Active Employee Directory</h2>
                <p className="text-xs font-semibold text-slate-400">Configure core login credentials, lock/unlock system accounts, and update profiles.</p>
              </div>
              <button
                onClick={() => {
                  setAddForm({ name: '', username: '', password: '' });
                  setFormError('');
                  setShowAddModal(true);
                }}
                className="bg-[#EF4444] hover:bg-red-600 text-white font-bold px-4 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition-all text-sm hover:-translate-y-0.5"
              >
                <UserPlus size={16} />
                Add New Employee
              </button>
            </div>

            {loadingEmployees ? (
              <div className="py-20 text-center text-slate-400 font-semibold flex flex-col items-center justify-center gap-3">
                <RefreshCw className="animate-spin text-[#EF4444] w-8 h-8" />
                Loading directory...
              </div>
            ) : employeesError ? (
              <div className="p-8 text-center text-red-500 font-bold">{employeesError}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-950/50 border-b border-slate-900">
                      <th className="px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Employee</th>
                      <th className="px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Username</th>
                      <th className="px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">System Role</th>
                      <th className="px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {employees.map((emp) => {
                      const isSelf = emp.id === currentUser?.id;
                      const isSystemAdmin = emp.username === 'admin';
                      
                      return (
                        <tr key={emp.id} className="hover:bg-slate-950/20 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {emp.avatar ? (
                                <img src={emp.avatar} alt={emp.name} className="w-9 h-9 rounded-xl object-cover border border-slate-900 shadow-sm" />
                              ) : (
                                <div className="w-9 h-9 rounded-xl bg-red-950/30 text-red-400 border border-red-500/20 font-bold flex items-center justify-center text-sm shadow-sm">
                                  {emp.name?.[0]?.toUpperCase()}
                                </div>
                              )}
                              <div>
                                <span className="font-bold text-slate-200 text-sm block">{emp.name}</span>
                                {isSelf && (
                                  <span className="text-[9px] bg-red-950 text-red-400 border border-red-900/50 px-1.5 py-0.2 rounded font-black uppercase mt-0.5 inline-block">
                                    You
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono font-semibold text-slate-350 text-sm">
                            @{emp.username}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              emp.role === 'ADMIN' || emp.role === 'admin'
                                ? 'bg-red-950 text-red-400 border border-red-500/25'
                                : 'bg-slate-950 text-slate-400 border border-slate-900'
                            }`}>
                              {emp.role}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              emp.disabled
                                ? 'bg-red-950 text-red-400 border border-red-900/50'
                                : 'bg-emerald-950 text-emerald-400 border border-emerald-900/50'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${emp.disabled ? 'bg-red-500 animate-ping' : 'bg-emerald-500'}`} />
                              {emp.disabled ? 'Locked' : 'Active'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                            <button
                              onClick={() => handleOpenEmpProfile(emp)}
                              className="text-slate-300 hover:text-red-400 hover:bg-slate-950/60 p-1.5 rounded-lg inline-flex items-center gap-1 text-[11px] font-bold border border-slate-900 shadow-sm transition-all"
                              title="Full profile details & avatar configuration"
                            >
                              <User size={12} />
                              Profile
                            </button>
                            <button
                              onClick={() => handleOpenLogs(emp)}
                              className="text-slate-300 hover:text-red-400 hover:bg-slate-950/60 p-1.5 rounded-lg inline-flex items-center gap-1 text-[11px] font-bold border border-slate-900 shadow-sm transition-all"
                              title="User session history logs"
                            >
                              <History size={12} />
                              Logs
                            </button>
                            <button
                              onClick={() => {
                                setSelectedEmp(emp);
                                setEditForm({ name: emp.name, username: emp.username });
                                setFormError('');
                                setShowEditModal(true);
                              }}
                              disabled={isSystemAdmin}
                              className="text-slate-300 hover:text-red-400 hover:bg-slate-950/60 p-1.5 rounded-lg inline-flex items-center gap-1 text-[11px] font-bold border border-slate-900 shadow-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Modify account name/username"
                            >
                              <Edit2 size={12} />
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                setSelectedEmp(emp);
                                setPasswordForm({ password: '', confirmPassword: '' });
                                setFormError('');
                                setShowPasswordModal(true);
                              }}
                              className="text-slate-300 hover:text-red-400 hover:bg-slate-950/60 p-1.5 rounded-lg inline-flex items-center gap-1 text-[11px] font-bold border border-slate-900 shadow-sm transition-all"
                              title="Reset account password"
                            >
                              <Key size={12} />
                              Key
                            </button>
                            <button
                              onClick={() => handleToggleStatus(emp)}
                              disabled={isSelf || isSystemAdmin}
                              className={`p-1.5 rounded-lg inline-flex items-center gap-1 text-[11px] font-bold border shadow-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                                emp.disabled
                                  ? 'text-emerald-400 hover:bg-slate-950 bg-slate-950/10 border-emerald-950'
                                  : 'text-red-400 hover:bg-slate-950 bg-slate-950/10 border-red-950'
                              }`}
                              title={emp.disabled ? 'Unlock Account' : 'Lock Account'}
                            >
                              {emp.disabled ? <UserCheck size={12} /> : <UserX size={12} />}
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

      {/* --- MY PROFILE TAB (All Users) --- */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Avatar Upload Card */}
          <div className="bg-slate-900/40 dark:bg-[#020617]/35 rounded-3xl p-6 border border-slate-900/80 shadow-xl flex flex-col items-center justify-between text-center space-y-6">
            <div className="w-full flex flex-col items-center">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-6">Profile Photo</h3>
              
              <div className="relative group">
                <div className="w-36 h-36 rounded-3xl bg-slate-950 border border-slate-900 flex items-center justify-center overflow-hidden shadow-2xl relative">
                  {myAvatar ? (
                    <img src={myAvatar} alt={currentUser?.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-rose-600 to-red-700 text-white font-black text-4xl flex items-center justify-center shadow-inner">
                      {currentUser?.name?.[0]?.toUpperCase()}
                    </div>
                  )}
                  {/* Photo Overlay */}
                  <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-1.5 cursor-pointer text-white text-[11px] font-bold rounded-3xl">
                    <Upload size={18} />
                    Change Photo
                    <input type="file" accept="image/*" className="hidden" onChange={handleMyAvatarUpload} />
                  </label>
                </div>
              </div>
              
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                <label className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold px-3.5 py-2 rounded-xl cursor-pointer transition-colors flex items-center gap-1.5">
                  <Upload size={12} />
                  Select Image
                  <input type="file" accept="image/*" className="hidden" onChange={handleMyAvatarUpload} />
                </label>
                {myAvatar && (
                  <button
                    onClick={handleRemoveMyAvatar}
                    className="bg-red-950/40 hover:bg-red-900/40 text-red-400 text-[11px] font-bold px-3.5 py-2 rounded-xl border border-red-900/40 transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 size={12} />
                    Remove
                  </button>
                )}
              </div>
            </div>

            {/* Read-Only Account Details */}
            <div className="w-full bg-slate-950/40 p-4.5 rounded-2xl border border-slate-900 text-left space-y-3">
              <div>
                <span className="text-[10px] text-slate-500 font-extrabold uppercase block tracking-wider">Account ID</span>
                <span className="text-xs font-mono font-bold text-slate-300 block select-all">{currentUser?.id}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-extrabold uppercase block tracking-wider">Login Username</span>
                <span className="text-xs font-mono font-bold text-[#EF4444] block select-all">@{currentUser?.username}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-extrabold uppercase block tracking-wider">System Role</span>
                <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-red-950 text-red-400 border border-red-900/40">{currentUser?.role}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-extrabold uppercase block tracking-wider">Account Created</span>
                <span className="text-xs font-bold text-slate-350 block">
                  {currentUser?.createdAt ? new Date(currentUser.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Edit Profile Info Form */}
          <div className="lg:col-span-2 bg-slate-900/40 dark:bg-[#020617]/35 rounded-3xl shadow-xl border border-slate-900 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-900 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-200">Personal Information</h2>
                <p className="text-xs font-semibold text-slate-400">Configure your public contact information and bio metrics.</p>
              </div>
              {profileSaving && <RefreshCw size={14} className="animate-spin text-red-500" />}
            </div>

            {profileLoading ? (
              <div className="py-32 text-center text-slate-400 font-semibold flex flex-col items-center justify-center gap-2">
                <RefreshCw className="animate-spin text-[#EF4444] w-8 h-8" />
                Loading your details...
              </div>
            ) : (
              <form onSubmit={handleSaveMyProfile} className="p-6 md:p-8 space-y-6 flex-1 flex flex-col justify-between">
                <div className="space-y-6">
                  {profileError && (
                    <div className="bg-red-955/20 border-l-4 border-red-500 p-4 rounded-xl text-xs font-bold text-red-400 flex items-center gap-2.5">
                      <AlertCircle size={16} className="shrink-0" />
                      {profileError}
                    </div>
                  )}
                  {profileSuccess && (
                    <div className="bg-emerald-955/20 border-l-4 border-emerald-500 p-4 rounded-xl text-xs font-bold text-emerald-400 flex items-center gap-2.5">
                      <CheckCircle2 size={16} className="shrink-0" />
                      {profileSuccess}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Official Full Name</label>
                      <input
                        type="text"
                        required
                        value={myProfileForm.name}
                        onChange={(e) => setMyProfileForm({ ...myProfileForm, name: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444] font-semibold bg-slate-950/45 text-slate-100 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Display / Nick Name</label>
                      <input
                        type="text"
                        value={myProfileForm.displayName}
                        onChange={(e) => setMyProfileForm({ ...myProfileForm, displayName: e.target.value })}
                        placeholder="e.g. Karan K."
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444] font-semibold bg-slate-950/45 text-slate-100 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
                      <input
                        type="email"
                        required
                        value={myProfileForm.email}
                        onChange={(e) => setMyProfileForm({ ...myProfileForm, email: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444] font-semibold bg-slate-950/45 text-slate-100 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Mobile Number</label>
                      <input
                        type="tel"
                        value={myProfileForm.mobile}
                        onChange={(e) => setMyProfileForm({ ...myProfileForm, mobile: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444] font-semibold bg-slate-950/45 text-slate-100 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Alternate Mobile</label>
                      <input
                        type="tel"
                        value={myProfileForm.alternateMobile}
                        onChange={(e) => setMyProfileForm({ ...myProfileForm, alternateMobile: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444] font-semibold bg-slate-950/45 text-slate-100 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Date of Birth (Optional)</label>
                      <input
                        type="date"
                        value={myProfileForm.dob}
                        onChange={(e) => setMyProfileForm({ ...myProfileForm, dob: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444] font-semibold bg-slate-950/45 text-slate-100 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">City</label>
                      <input
                        type="text"
                        value={myProfileForm.city}
                        onChange={(e) => setMyProfileForm({ ...myProfileForm, city: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444] font-semibold bg-slate-950/45 text-slate-100 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">State</label>
                      <input
                        type="text"
                        value={myProfileForm.state}
                        onChange={(e) => setMyProfileForm({ ...myProfileForm, state: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444] font-semibold bg-slate-950/45 text-slate-100 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Full Permanent Address</label>
                    <textarea
                      rows={2}
                      value={myProfileForm.address}
                      onChange={(e) => setMyProfileForm({ ...myProfileForm, address: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444] font-semibold bg-slate-950/45 text-slate-100 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Emergency Contact Details</label>
                    <input
                      type="text"
                      value={myProfileForm.emergencyContact}
                      onChange={(e) => setMyProfileForm({ ...myProfileForm, emergencyContact: e.target.value })}
                      placeholder="e.g. Ramesh Kumar (Father) - +91 99999 88888"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444] font-semibold bg-slate-950/45 text-slate-100 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Bio / About Me</label>
                    <textarea
                      rows={2}
                      value={myProfileForm.bio}
                      onChange={(e) => setMyProfileForm({ ...myProfileForm, bio: e.target.value })}
                      placeholder="A short note about yourself..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444] font-semibold bg-slate-950/45 text-slate-100 text-sm animate-pulse-none"
                    />
                  </div>

                  {/* Social Links Sub-grid */}
                  <div className="pt-4 border-t border-slate-900/60">
                    <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">Social Networks</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">LinkedIn Profile</label>
                        <input
                          type="text"
                          value={myProfileForm.socialLinks.linkedin}
                          onChange={(e) => setMyProfileForm({
                            ...myProfileForm,
                            socialLinks: { ...myProfileForm.socialLinks, linkedin: e.target.value }
                          })}
                          placeholder="linkedin.com/in/username"
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444] font-mono text-xs bg-slate-950/45 text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Twitter / X Profile</label>
                        <input
                          type="text"
                          value={myProfileForm.socialLinks.twitter}
                          onChange={(e) => setMyProfileForm({
                            ...myProfileForm,
                            socialLinks: { ...myProfileForm.socialLinks, twitter: e.target.value }
                          })}
                          placeholder="x.com/username"
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444] font-mono text-xs bg-slate-950/45 text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">GitHub Username</label>
                        <input
                          type="text"
                          value={myProfileForm.socialLinks.github}
                          onChange={(e) => setMyProfileForm({
                            ...myProfileForm,
                            socialLinks: { ...myProfileForm.socialLinks, github: e.target.value }
                          })}
                          placeholder="github.com/username"
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444] font-mono text-xs bg-slate-950/45 text-slate-100"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-900 text-right mt-6">
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="px-6 py-2.5 bg-[#EF4444] hover:bg-red-600 text-white font-bold rounded-xl shadow-md transition-all text-sm inline-flex items-center gap-1.5 hover:-translate-y-0.5"
                  >
                    <Save size={15} />
                    {profileSaving ? 'Saving Changes...' : 'Save Profile Details'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* --- APPEARANCE TAB (All Users) --- */}
      {activeTab === 'appearance' && (
        <div className="bg-slate-900/40 dark:bg-[#020617]/35 rounded-3xl shadow-xl border border-slate-900 overflow-hidden transition-all duration-300 animate-fade-in">
          <div className="p-6 border-b border-slate-900">
            <h2 className="text-lg font-bold text-slate-200 font-sans">Visual & Layout Preferences</h2>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">
              Customize the design density, system theme, and accent highlights. Changes are applied instantly.
            </p>
          </div>

          <div className="p-6 md:p-8 space-y-8">
            {/* Theme Selector */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-2">
                <Sun size={14} className="text-[#EF4444]" />
                Select System Theme Mode
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Light */}
                <div 
                  onClick={() => handleUpdateAppearance({ theme: 'light' })}
                  className={`cursor-pointer rounded-2xl border-2 p-4 flex flex-col justify-between transition-all duration-200 hover:scale-[1.01] ${
                    appearanceForm.theme === 'light' 
                      ? 'border-[#EF4444] bg-slate-950/20 shadow-md shadow-[#EF4444]/5' 
                      : 'border-slate-900 bg-slate-950/5 hover:border-slate-800'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="h-24 rounded-xl bg-slate-100 border border-slate-200 p-2 flex gap-2">
                      <div className="w-1/4 rounded-lg bg-zinc-950 flex flex-col gap-1 p-1">
                        <span className="h-1.5 w-full rounded bg-red-500 block"></span>
                      </div>
                      <div className="flex-1 flex flex-col gap-1.5 p-1">
                        <span className="h-1.5 w-3/4 rounded bg-slate-400 block"></span>
                        <div className="h-8 w-full rounded bg-white border border-slate-200"></div>
                      </div>
                    </div>
                    <div className="text-center font-bold text-xs text-slate-350">☀️ Light Theme</div>
                  </div>
                </div>

                {/* Dark */}
                <div 
                  onClick={() => handleUpdateAppearance({ theme: 'dark' })}
                  className={`cursor-pointer rounded-2xl border-2 p-4 flex flex-col justify-between transition-all duration-200 hover:scale-[1.01] ${
                    appearanceForm.theme === 'dark' 
                      ? 'border-[#EF4444] bg-slate-950/20 shadow-md shadow-[#EF4444]/5' 
                      : 'border-slate-900 bg-slate-950/5 hover:border-slate-800'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="h-24 rounded-xl bg-[#0F172A] border border-[#1E293B] p-2 flex gap-2">
                      <div className="w-1/4 rounded-lg bg-[#020617] flex flex-col gap-1 p-1">
                        <span className="h-1.5 w-full rounded bg-red-500 block"></span>
                      </div>
                      <div className="flex-1 flex flex-col gap-1.5 p-1">
                        <span className="h-1.5 w-3/4 rounded bg-slate-500 block"></span>
                        <div className="h-8 w-full rounded bg-[#1E293B] border border-[#334155]"></div>
                      </div>
                    </div>
                    <div className="text-center font-bold text-xs text-slate-350">🌙 Dark Theme</div>
                  </div>
                </div>

                {/* System */}
                <div 
                  onClick={() => handleUpdateAppearance({ theme: 'system' })}
                  className={`cursor-pointer rounded-2xl border-2 p-4 flex flex-col justify-between transition-all duration-200 hover:scale-[1.01] ${
                    appearanceForm.theme === 'system' 
                      ? 'border-[#EF4444] bg-slate-950/20 shadow-md shadow-[#EF4444]/5' 
                      : 'border-slate-900 bg-slate-950/5 hover:border-slate-800'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="h-24 rounded-xl bg-slate-100 dark:bg-[#0F172A] border border-slate-200 dark:border-[#1E293B] p-2 flex gap-2">
                      <div className="flex-1 bg-white rounded-lg flex items-center justify-center text-[10px] text-slate-700">Light</div>
                      <div className="flex-1 bg-[#1E293B] rounded-lg flex items-center justify-center text-[10px] text-slate-300">Dark</div>
                    </div>
                    <div className="text-center font-bold text-xs text-slate-350">🖥️ System Default</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Layout Density & Sizing Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-900">
              {/* Layout Sidebar Compactness */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Monitor size={13} className="text-[#EF4444]" />
                  Sidebar Style
                </h4>
                <p className="text-[11px] text-slate-500 font-semibold leading-normal">Choose between full navigation details or small workspace icon badges.</p>
                <div className="grid grid-cols-2 gap-2 bg-slate-950/45 p-1 rounded-xl border border-slate-900">
                  <button
                    type="button"
                    onClick={() => handleUpdateAppearance({ sidebar: 'expanded' })}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                      appearanceForm.sidebar === 'expanded' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Expanded
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateAppearance({ sidebar: 'compact' })}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                      appearanceForm.sidebar === 'compact' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Compact
                  </button>
                </div>
              </div>

              {/* Spacing Density */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={13} className="text-[#EF4444]" />
                  Dashboard Spacing Density
                </h4>
                <p className="text-[11px] text-slate-500 font-semibold leading-normal">Reduce paddings in rows and inventory tables for high data screen layout.</p>
                <div className="grid grid-cols-2 gap-2 bg-slate-950/45 p-1 rounded-xl border border-slate-900">
                  <button
                    type="button"
                    onClick={() => handleUpdateAppearance({ density: 'comfortable' })}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                      appearanceForm.density === 'comfortable' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Comfortable
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateAppearance({ density: 'compact' })}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                      appearanceForm.density === 'compact' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Compact
                  </button>
                </div>
              </div>

              {/* Font Size */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <HelpCircle size={13} className="text-[#EF4444]" />
                  System Font Scaling
                </h4>
                <p className="text-[11px] text-slate-500 font-semibold leading-normal">Modify the baseline scaling font size applied throughout all ERP pages.</p>
                <div className="grid grid-cols-3 gap-1.5 bg-slate-950/45 p-1 rounded-xl border border-slate-900">
                  <button
                    type="button"
                    onClick={() => handleUpdateAppearance({ fontSize: 'small' })}
                    className={`py-2 rounded-lg text-xs font-bold transition-all ${
                      appearanceForm.fontSize === 'small' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Small
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateAppearance({ fontSize: 'medium' })}
                    className={`py-2 rounded-lg text-xs font-bold transition-all ${
                      appearanceForm.fontSize === 'medium' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Medium
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateAppearance({ fontSize: 'large' })}
                    className={`py-2 rounded-lg text-xs font-bold transition-all ${
                      appearanceForm.fontSize === 'large' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Large
                  </button>
                </div>
              </div>
            </div>

            {/* Accent Theme Colors */}
            <div className="pt-6 border-t border-slate-900 space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Palette size={13} className="text-[#EF4444]" />
                Accent Highlights Color
              </h4>
              <p className="text-[11px] text-slate-500 font-semibold leading-normal">Shift color highlights (buttons, links, active pages) to match TEE brands.</p>
              
              <div className="flex gap-4">
                {/* Red */}
                <button
                  type="button"
                  onClick={() => handleUpdateAppearance({ accentColor: 'red' })}
                  className={`w-10 h-10 rounded-xl bg-red-600 relative transition-transform ${appearanceForm.accentColor === 'red' ? 'scale-110 shadow-lg ring-2 ring-red-400 ring-offset-2 ring-offset-slate-950' : 'opacity-70 hover:opacity-100'}`}
                  title="TEE Red"
                >
                  {appearanceForm.accentColor === 'red' && <CheckCircle2 size={16} className="text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />}
                </button>
                {/* Blue */}
                <button
                  type="button"
                  onClick={() => handleUpdateAppearance({ accentColor: 'blue' })}
                  className={`w-10 h-10 rounded-xl bg-blue-600 relative transition-transform ${appearanceForm.accentColor === 'blue' ? 'scale-110 shadow-lg ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-950' : 'opacity-70 hover:opacity-100'}`}
                  title="TEE Blue"
                >
                  {appearanceForm.accentColor === 'blue' && <CheckCircle2 size={16} className="text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />}
                </button>
                {/* Green */}
                <button
                  type="button"
                  onClick={() => handleUpdateAppearance({ accentColor: 'green' })}
                  className={`w-10 h-10 rounded-xl bg-emerald-600 relative transition-transform ${appearanceForm.accentColor === 'green' ? 'scale-110 shadow-lg ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-950' : 'opacity-70 hover:opacity-100'}`}
                  title="TEE Green"
                >
                  {appearanceForm.accentColor === 'green' && <CheckCircle2 size={16} className="text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />}
                </button>
                {/* Purple */}
                <button
                  type="button"
                  onClick={() => handleUpdateAppearance({ accentColor: 'purple' })}
                  className={`w-10 h-10 rounded-xl bg-purple-600 relative transition-transform ${appearanceForm.accentColor === 'purple' ? 'scale-110 shadow-lg ring-2 ring-purple-400 ring-offset-2 ring-offset-slate-950' : 'opacity-70 hover:opacity-100'}`}
                  title="TEE Purple"
                >
                  {appearanceForm.accentColor === 'purple' && <CheckCircle2 size={16} className="text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />}
                </button>
              </div>
            </div>

            {/* Sound Notification Preferences */}
            <div className="pt-6 border-t border-slate-900 space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone size={13} className="text-[#EF4444]" />
                Team Chat Audio Alerts
              </h4>
              <p className="text-[11px] text-slate-500 font-semibold leading-normal">
                Enable or disable sound alerts when new messages arrive.
              </p>
              <div className="grid grid-cols-2 gap-2 bg-slate-950/45 p-1 rounded-xl border border-slate-900 max-w-xs">
                <button
                  type="button"
                  onClick={() => handleUpdateAppearance({ soundNotification: true })}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                    appearanceForm.soundNotification === true ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Enabled
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateAppearance({ soundNotification: false })}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                    appearanceForm.soundNotification === false ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Disabled
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- ACCOUNT SECURITY TAB (All Users) --- */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Change Password Card */}
          <div className="bg-slate-900/40 dark:bg-[#020617]/35 rounded-3xl p-6 border border-slate-900/80 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 border-b border-slate-900 pb-3 mb-4">
                <KeyRound className="text-[#EF4444]" size={18} />
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                  {isAdmin ? 'Change Password' : 'Request Password Change'}
                </h3>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-4">
                {passwordError && (
                  <div className="bg-red-955/20 border-l-4 border-red-500 p-3 rounded-lg text-xs font-bold text-red-400 flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    {passwordError}
                  </div>
                )}
                {passwordSuccess && (
                  <div className="bg-emerald-955/20 border-l-4 border-emerald-500 p-3 rounded-lg text-xs font-bold text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 size={14} className="shrink-0" />
                    {passwordSuccess}
                  </div>
                )}

                {/* Employee specific pending/approved/rejected notification banner */}
                {!isAdmin && myPasswordRequests.length > 0 && (() => {
                  const latest = myPasswordRequests[0];
                  if (latest.status === 'pending') {
                    return (
                      <div className="bg-amber-955/20 border-l-4 border-amber-500 p-3 rounded-lg text-xs font-bold text-amber-400 flex items-start gap-2 mb-4">
                        <Clock size={14} className="shrink-0 mt-0.5" />
                        <div>Your password change request is awaiting administrator approval.</div>
                      </div>
                    );
                  } else if (latest.status === 'approved') {
                    return (
                      <div className="bg-emerald-955/20 border-l-4 border-emerald-500 p-3 rounded-lg text-xs font-bold text-emerald-400 flex items-start gap-2 mb-4">
                        <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                        <div>Your password change request has been approved.</div>
                      </div>
                    );
                  } else if (latest.status === 'rejected') {
                    return (
                      <div className="bg-rose-955/20 border-l-4 border-rose-500 p-3 rounded-lg text-xs font-bold text-rose-400 flex flex-col gap-1 mb-4">
                        <div className="flex items-start gap-2">
                          <XCircle size={14} className="shrink-0 mt-0.5" />
                          <div>Your password change request has been rejected.</div>
                        </div>
                        {latest.admin_note && (
                          <div className="text-[10px] text-rose-350 italic pl-6 mt-0.5 font-semibold">
                            Admin Note: {latest.admin_note}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                })()}

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Current Password</label>
                  <input
                    type="password"
                    required
                    value={passwordChange.currentPassword}
                    onChange={(e) => setPasswordChange({ ...passwordChange, currentPassword: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444] font-semibold bg-slate-950/45 text-slate-100 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    value={passwordChange.newPassword}
                    onChange={(e) => setPasswordChange({ ...passwordChange, newPassword: e.target.value })}
                    placeholder="Minimum 4 characters"
                    className="w-full px-3 py-2 rounded-xl border border-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444] font-semibold bg-slate-950/45 text-slate-100 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={passwordChange.confirmPassword}
                    onChange={(e) => setPasswordChange({ ...passwordChange, confirmPassword: e.target.value })}
                    placeholder="Retype password"
                    className="w-full px-3 py-2 rounded-xl border border-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444] font-semibold bg-slate-950/45 text-slate-100 text-xs"
                  />
                </div>

                <div className="pt-2 text-right">
                  <button
                    type="submit"
                    disabled={passwordSaving}
                    className="w-full bg-[#EF4444] hover:bg-red-600 text-white font-bold py-2 px-3 rounded-xl shadow transition-colors text-xs flex items-center justify-center gap-1.5"
                  >
                    <Save size={13} />
                    {passwordSaving ? 'Updating...' : (isAdmin ? 'Change Password' : 'Request Password Change')}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Security Questions & Active Sessions Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Security Questions Setup */}
            <div className="bg-slate-900/40 dark:bg-[#020617]/35 rounded-3xl p-6 border border-slate-900/80 shadow-xl">
              <div className="flex items-center gap-2 border-b border-slate-900 pb-3 mb-4">
                <ShieldCheck className="text-[#EF4444]" size={18} />
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Account Recovery Security Questions</h3>
              </div>

              <form onSubmit={handleSaveSecurityQuestions} className="space-y-4">
                {securityError && (
                  <div className="bg-red-955/20 border-l-4 border-red-500 p-3 rounded-lg text-xs font-bold text-red-400 flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    {securityError}
                  </div>
                )}
                {securitySuccess && (
                  <div className="bg-emerald-955/20 border-l-4 border-emerald-500 p-3 rounded-lg text-xs font-bold text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 size={14} className="shrink-0" />
                    {securitySuccess}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {securityQuestions.map((sq, idx) => (
                    <div key={idx} className="space-y-2">
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Security Question #{idx + 1}</label>
                      <select
                        value={sq.question}
                        onChange={(e) => {
                          const updated = [...securityQuestions];
                          updated[idx].question = e.target.value;
                          setSecurityQuestions(updated);
                        }}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-900 bg-slate-950/45 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444]"
                      >
                        <option value="What was the name of your first school?">What was the name of your first school?</option>
                        <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
                        <option value="What was the name of your first pet?">What was the name of your first pet?</option>
                        <option value="In what city/town did your parents meet?">In what city/town did your parents meet?</option>
                        <option value="What was the make and model of your first car?">What was the make and model of your first car?</option>
                      </select>
                      <input
                        type="text"
                        required
                        value={sq.answer}
                        onChange={(e) => {
                          const updated = [...securityQuestions];
                          updated[idx].answer = e.target.value;
                          setSecurityQuestions(updated);
                        }}
                        placeholder="Security question secret answer"
                        className="w-full px-3 py-2 rounded-xl border border-slate-900 bg-slate-950/45 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444] font-semibold"
                      />
                    </div>
                  ))}
                </div>

                <div className="pt-2 text-right">
                  <button
                    type="submit"
                    disabled={securitySaving}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition-all text-xs inline-flex items-center gap-1.5"
                  >
                    <Save size={13} />
                    {securitySaving ? 'Saving...' : 'Save Security Questions'}
                  </button>
                </div>
              </form>
            </div>

            {/* Password Change Requests History (Employee Only) */}
            {!isAdmin && (
              <div className="bg-slate-900/40 dark:bg-[#020617]/35 rounded-3xl p-6 border border-slate-900/80 shadow-xl space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-900 pb-3 mb-2">
                  <History className="text-[#EF4444]" size={18} />
                  <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Password Request History</h3>
                </div>

                {loadingPasswordRequests ? (
                  <div className="py-8 text-center text-slate-505 font-bold text-xs flex items-center justify-center gap-2">
                    <RefreshCw className="animate-spin text-red-500" size={14} />
                    Fetching request history...
                  </div>
                ) : myPasswordRequests.length === 0 ? (
                  <p className="text-xs text-slate-500 font-semibold">No password change requests submitted yet.</p>
                ) : (
                  <div className="border border-slate-900 rounded-2xl overflow-hidden overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-950/80 border-b border-slate-900 text-slate-400 uppercase font-extrabold text-[9px] tracking-wider">
                        <tr>
                          <th className="px-4 py-2.5">Requested Date</th>
                          <th className="px-4 py-2.5">Status</th>
                          <th className="px-4 py-2.5">Reviewed At</th>
                          <th className="px-4 py-2.5">Admin Note</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900/40 text-slate-350 bg-slate-950/20 font-medium">
                        {myPasswordRequests.map((req) => (
                          <tr key={req.id} className="hover:bg-slate-955/40">
                            <td className="px-4 py-3 whitespace-nowrap">
                              {new Date(req.requested_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                req.status === 'pending'
                                  ? 'bg-amber-955/10 text-amber-450 border-amber-900/30'
                                  : req.status === 'approved'
                                  ? 'bg-emerald-955/10 text-emerald-400 border-emerald-900/30'
                                  : 'bg-rose-955/10 text-rose-450 border-rose-900/30'
                              }`}>
                                {req.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {req.reviewed_at ? new Date(req.reviewed_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                            </td>
                            <td className="px-4 py-3 max-w-[150px] truncate" title={req.admin_note}>
                              {req.admin_note || <span className="text-slate-600">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Active Sessions Logs */}
            <div className="bg-slate-900/40 dark:bg-[#020617]/35 rounded-3xl p-6 border border-slate-900/80 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-900 pb-3 mb-2">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="text-[#EF4444]" size={18} />
                  <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Active Device Sessions</h3>
                </div>
                {activeSessions.length > 1 && (
                  <button
                    type="button"
                    onClick={handleTerminateOtherSessions}
                    className="bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-950 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                  >
                    Logout Other Devices
                  </button>
                )}
              </div>

              {sessionsLoading ? (
                <div className="py-8 text-center text-slate-500 font-bold text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="animate-spin text-red-500" size={14} />
                  Fetching sessions...
                </div>
              ) : activeSessions.length === 0 ? (
                <p className="text-xs text-slate-500 font-semibold">No active sessions found.</p>
              ) : (
                <div className="space-y-3">
                  {activeSessions.map((sess) => {
                    const isCurrent = sess.sessionId === getCurrentSessionId();
                    return (
                      <div key={sess.sessionId} className="p-3 bg-slate-950/30 rounded-2xl border border-slate-900 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-950/70 border border-slate-900 rounded-xl text-slate-400">
                            {/mobile|phone/i.test(sess.device) ? <Smartphone size={16} /> : <Laptop size={16} />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-200">{sess.device || 'Unknown Client'}</span>
                              {isCurrent && (
                                <span className="bg-emerald-950 text-emerald-400 border border-emerald-900/50 px-2 py-0.2 rounded-full text-[8px] font-black uppercase tracking-wider">
                                  Current Device
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono font-bold block mt-0.5">
                              IP: {sess.ip} • Last Active: {new Date(sess.lastLogin).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- ADD EMPLOYEE MODAL (Admin Only) --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 dark:bg-[#1E293B] rounded-3xl max-w-md w-full shadow-2xl border border-slate-800 overflow-hidden transform transition-all text-slate-100">
            <div className="px-6 py-4.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-200 flex items-center gap-2 text-sm uppercase tracking-wider">
                <UserPlus className="text-[#EF4444] w-5 h-5" />
                Add New Employee Account
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-250 p-1 rounded-lg hover:bg-slate-800 transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleAddEmployee} className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-955/25 border-l-4 border-red-500 p-3 rounded-lg text-xs font-bold text-red-400 flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="bg-emerald-955/25 border-l-4 border-emerald-500 p-3 rounded-lg text-xs font-bold text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 size={15} className="shrink-0" />
                  {formSuccess}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  placeholder="e.g. Karan Kumar"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444] font-semibold bg-slate-950 text-slate-100 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Username (Login ID)</label>
                <input
                  type="text"
                  required
                  value={addForm.username}
                  onChange={(e) => setAddForm({ ...addForm, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                  placeholder="e.g. karan"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444] font-mono font-bold bg-slate-950 text-slate-100 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Login Password</label>
                <input
                  type="password"
                  required
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  placeholder="Minimum 4 characters"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444] font-semibold bg-slate-950 text-slate-100 text-sm"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-800 transition-colors text-xs font-bold uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-4 py-2 bg-[#EF4444] hover:bg-red-600 text-white font-bold rounded-xl shadow transition-colors text-xs uppercase tracking-wider flex items-center gap-1.5"
                >
                  {modalSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT EMPLOYEE DETAILS MODAL (Admin Only) --- */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 dark:bg-[#1E293B] rounded-3xl max-w-md w-full shadow-2xl border border-slate-800 overflow-hidden transform transition-all text-slate-100">
            <div className="px-6 py-4.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-200 flex items-center gap-2 text-sm uppercase tracking-wider">
                <Edit2 className="text-[#EF4444] w-5 h-5" />
                Edit Employee credentials
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-250 p-1 rounded-lg hover:bg-slate-800 transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleEditEmployee} className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-955/25 border-l-4 border-red-500 p-3 rounded-lg text-xs font-bold text-red-400 flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="bg-emerald-955/25 border-l-4 border-emerald-500 p-3 rounded-lg text-xs font-bold text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 size={15} className="shrink-0" />
                  {formSuccess}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444] font-semibold bg-slate-950 text-slate-100 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Username (Login ID)</label>
                <input
                  type="text"
                  required
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444] font-mono font-bold bg-slate-950 text-slate-100 text-sm"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-800 transition-colors text-xs font-bold uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-4 py-2 bg-[#EF4444] hover:bg-red-600 text-white font-bold rounded-xl shadow transition-colors text-xs uppercase tracking-wider"
                >
                  {modalSubmitting ? 'Updating...' : 'Update credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- RESET PASSWORD MODAL (Admin Only) --- */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 dark:bg-[#1E293B] rounded-3xl max-w-md w-full shadow-2xl border border-slate-800 overflow-hidden transform transition-all text-slate-100">
            <div className="px-6 py-4.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-200 flex items-center gap-2 text-sm uppercase tracking-wider">
                <Key className="text-[#EF4444] w-5 h-5" />
                Reset Employee Password
              </h3>
              <button onClick={() => setShowPasswordModal(false)} className="text-slate-400 hover:text-slate-250 p-1 rounded-lg hover:bg-slate-800 transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 mb-2">
                <p className="text-[11px] font-semibold text-slate-400 leading-normal">
                  You are resetting credentials access password for <strong className="text-slate-200">{selectedEmp?.name}</strong> (username: <strong className="text-red-400 font-mono">@{selectedEmp?.username}</strong>).
                </p>
              </div>

              {formError && (
                <div className="bg-red-955/25 border-l-4 border-red-500 p-3 rounded-lg text-xs font-bold text-red-400 flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="bg-emerald-955/25 border-l-4 border-emerald-500 p-3 rounded-lg text-xs font-bold text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 size={15} className="shrink-0" />
                  {formSuccess}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">New Password</label>
                <input
                  type="password"
                  required
                  value={passwordForm.password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                  placeholder="Minimum 4 characters"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444] font-semibold bg-slate-950 text-slate-100 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  placeholder="Retype password to confirm"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444] font-semibold bg-slate-950 text-slate-100 text-sm"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-800 transition-colors text-xs font-bold uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-4 py-2 bg-[#EF4444] hover:bg-red-600 text-white font-bold rounded-xl shadow transition-colors text-xs uppercase tracking-wider"
                >
                  {modalSubmitting ? 'Saving...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- AUDIT TIMELINE HISTORY LOGS MODAL (Admin Only) --- */}
      {showLogsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 dark:bg-[#1E293B] rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-800 overflow-hidden transform transition-all flex flex-col max-h-[85vh] text-slate-100">
            <div className="px-6 py-4.5 bg-slate-955 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-extrabold text-slate-200 flex items-center gap-2 text-sm uppercase tracking-wider">
                  <History className="text-[#EF4444] w-5 h-5 animate-pulse" />
                  Audit Logs: {selectedEmp?.name}
                </h3>
                <span className="text-[10px] font-bold text-slate-400 block mt-0.5 font-mono">
                  Username: @{selectedEmp?.username}
                </span>
              </div>
              <button onClick={() => setShowLogsModal(false)} className="text-slate-400 hover:text-slate-250 p-1.5 rounded-lg hover:bg-slate-800 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-2 border-b border-slate-800 flex gap-4 bg-slate-955 shrink-0">
              <button
                onClick={() => setLogsTab('login')}
                className={`pb-1 text-xs font-bold border-b-2 transition-all ${
                  logsTab === 'login'
                    ? 'border-[#EF4444] text-[#EF4444]'
                    : 'border-transparent text-slate-400 hover:text-slate-250'
                }`}
              >
                Login History
              </button>
              <button
                onClick={() => setLogsTab('activity')}
                className={`pb-1 text-xs font-bold border-b-2 transition-all ${
                  logsTab === 'activity'
                    ? 'border-[#EF4444] text-[#EF4444]'
                    : 'border-transparent text-slate-400 hover:text-slate-250'
                }`}
              >
                Activity History
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loadingLogs ? (
                <div className="py-20 text-center text-slate-400 font-semibold flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="animate-spin text-[#EF4444] w-6 h-6" />
                  Loading logs...
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-slate-950 text-slate-400 flex items-center justify-center">
                    <HelpCircle size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-350 text-sm">No History Recorded</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      No logs found under "{logsTab === 'login' ? 'Login History' : 'Activity History'}"
                    </p>
                  </div>
                </div>
              ) : (
                <div className="relative border-l-2 border-slate-800 ml-3 pl-6 space-y-6">
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
                        <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 bg-[#EF4444] group-hover:scale-110 transition-transform duration-150"></div>
                        
                        <div className="bg-slate-950/40 border border-slate-800 hover:border-slate-800/80 p-3 rounded-2xl transition-all shadow-sm">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-[10px] font-bold text-[#EF4444] font-mono">
                              {formattedDate} at {formattedTime}
                            </span>
                            <span className="text-[9px] text-slate-550 font-semibold font-mono">
                              {log.id.slice(0, 8)}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-slate-300 mt-1.5 leading-normal">
                            {log.action}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-850 bg-slate-955 text-right shrink-0">
              <button
                type="button"
                onClick={() => setShowLogsModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs uppercase tracking-wider transition-colors"
              >
                Close Logs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- EMPLOYEE PROFILE DETAILS MODAL (Admin Only) --- */}
      {showEmpProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 dark:bg-[#1E293B] rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-800 overflow-hidden transform transition-all flex flex-col max-h-[90vh] text-slate-100 animate-fade-in">
            <div className="px-6 py-4.5 bg-slate-955 border-b border-slate-800 flex items-center justify-between shrink-0">
              <h3 className="font-extrabold text-slate-200 flex items-center gap-2 text-sm uppercase tracking-wider">
                <UserCog className="text-[#EF4444] w-5 h-5" />
                Employee Profile Management
              </h3>
              <button onClick={() => setShowEmpProfileModal(false)} className="text-slate-400 hover:text-slate-250 p-1 rounded-lg hover:bg-slate-800 transition-colors">
                <X size={18} />
              </button>
            </div>

            {empProfileLoading ? (
              <div className="py-32 text-center text-slate-400 font-semibold flex flex-col items-center justify-center gap-2 flex-1">
                <RefreshCw className="animate-spin text-[#EF4444] w-8 h-8" />
                Loading employee details...
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col lg:flex-row gap-6">
                {/* Left Side: Photo Control */}
                <div className="w-full lg:w-1/3 flex flex-col items-center space-y-4">
                  <div className="w-36 h-36 rounded-3xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden shadow-xl relative group shrink-0">
                    {empAvatar ? (
                      <img src={empAvatar} alt={selectedEmpProfile?.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-red-650 to-indigo-700 text-white font-black text-4xl flex items-center justify-center shadow-inner">
                        {selectedEmpProfile?.name?.[0]?.toUpperCase()}
                      </div>
                    )}
                    {/* Hover Select overlay */}
                    <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-1.5 cursor-pointer text-white text-[11px] font-bold rounded-3xl">
                      <Upload size={18} />
                      Upload Avatar
                      <input type="file" accept="image/*" className="hidden" onChange={handleEmpAvatarUpload} />
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-2 justify-center">
                    <label className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold px-3 py-1.5 rounded-xl cursor-pointer transition-colors flex items-center gap-1">
                      <Upload size={12} />
                      Upload
                      <input type="file" accept="image/*" className="hidden" onChange={handleEmpAvatarUpload} />
                    </label>
                    {empAvatar && (
                      <button
                        onClick={handleRemoveEmpAvatar}
                        className="bg-red-950/40 hover:bg-red-900/40 text-red-400 text-[11px] font-bold px-3 py-1.5 rounded-xl border border-red-900/40 transition-colors flex items-center gap-1"
                      >
                        <Trash2 size={12} />
                        Reset
                      </button>
                    )}
                  </div>

                  <div className="w-full bg-slate-950 p-4 rounded-xl border border-slate-800 text-left space-y-2">
                    <div>
                      <span className="text-[10px] text-slate-500 font-extrabold uppercase block tracking-wider">Account ID</span>
                      <span className="text-[11px] font-mono font-bold text-slate-300 block select-all">{selectedEmpProfile?.id}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-extrabold uppercase block tracking-wider">Role</span>
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-slate-900 text-slate-400 border border-slate-800">{selectedEmpProfile?.role}</span>
                    </div>
                  </div>
                </div>

                {/* Right Side: Form fields */}
                <form onSubmit={handleSaveEmpProfile} className="flex-1 space-y-6">
                  {empProfileError && (
                    <div className="bg-red-955/25 border-l-4 border-red-500 p-4 rounded-xl text-xs font-bold text-red-400 flex items-center gap-2.5">
                      <AlertCircle size={16} className="shrink-0" />
                      {empProfileError}
                    </div>
                  )}
                  {empProfileSuccess && (
                    <div className="bg-emerald-955/25 border-l-4 border-emerald-500 p-4 rounded-xl text-xs font-bold text-emerald-400 flex items-center gap-2.5">
                      <CheckCircle2 size={16} className="shrink-0" />
                      {empProfileSuccess}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Official Name</label>
                      <input
                        type="text"
                        required
                        value={empProfileForm.name}
                        onChange={(e) => setEmpProfileForm({ ...empProfileForm, name: e.target.value })}
                        className="w-full px-3.5 py-1.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Display Name</label>
                      <input
                        type="text"
                        value={empProfileForm.displayName}
                        onChange={(e) => setEmpProfileForm({ ...empProfileForm, displayName: e.target.value })}
                        className="w-full px-3.5 py-1.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
                      <input
                        type="email"
                        required
                        value={empProfileForm.email}
                        onChange={(e) => setEmpProfileForm({ ...empProfileForm, email: e.target.value })}
                        className="w-full px-3.5 py-1.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Mobile Number</label>
                      <input
                        type="tel"
                        value={empProfileForm.mobile}
                        onChange={(e) => setEmpProfileForm({ ...empProfileForm, mobile: e.target.value })}
                        className="w-full px-3.5 py-1.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Alternate Mobile</label>
                      <input
                        type="tel"
                        value={empProfileForm.alternateMobile}
                        onChange={(e) => setEmpProfileForm({ ...empProfileForm, alternateMobile: e.target.value })}
                        className="w-full px-3.5 py-1.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Date of Birth</label>
                      <input
                        type="date"
                        value={empProfileForm.dob}
                        onChange={(e) => setEmpProfileForm({ ...empProfileForm, dob: e.target.value })}
                        className="w-full px-3.5 py-1.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">City</label>
                      <input
                        type="text"
                        value={empProfileForm.city}
                        onChange={(e) => setEmpProfileForm({ ...empProfileForm, city: e.target.value })}
                        className="w-full px-3.5 py-1.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">State</label>
                      <input
                        type="text"
                        value={empProfileForm.state}
                        onChange={(e) => setEmpProfileForm({ ...empProfileForm, state: e.target.value })}
                        className="w-full px-3.5 py-1.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Emergency Contact Details</label>
                    <input
                      type="text"
                      value={empProfileForm.emergencyContact}
                      onChange={(e) => setEmpProfileForm({ ...empProfileForm, emergencyContact: e.target.value })}
                      className="w-full px-3.5 py-1.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Office/Permanent Address</label>
                    <textarea
                      rows={2}
                      value={empProfileForm.address}
                      onChange={(e) => setEmpProfileForm({ ...empProfileForm, address: e.target.value })}
                      className="w-full px-3.5 py-1.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Bio / Remarks</label>
                    <textarea
                      rows={2}
                      value={empProfileForm.bio}
                      onChange={(e) => setEmpProfileForm({ ...empProfileForm, bio: e.target.value })}
                      className="w-full px-3.5 py-1.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444]"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">LinkedIn</label>
                      <input
                        type="text"
                        value={empProfileForm.socialLinks.linkedin}
                        onChange={(e) => setEmpProfileForm({
                          ...empProfileForm,
                          socialLinks: { ...empProfileForm.socialLinks, linkedin: e.target.value }
                        })}
                        className="w-full px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-955 text-slate-100 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444]"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Twitter / X</label>
                      <input
                        type="text"
                        value={empProfileForm.socialLinks.twitter}
                        onChange={(e) => setEmpProfileForm({
                          ...empProfileForm,
                          socialLinks: { ...empProfileForm.socialLinks, twitter: e.target.value }
                        })}
                        className="w-full px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-955 text-slate-100 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444]"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">GitHub</label>
                      <input
                        type="text"
                        value={empProfileForm.socialLinks.github}
                        onChange={(e) => setEmpProfileForm({
                          ...empProfileForm,
                          socialLinks: { ...empProfileForm.socialLinks, github: e.target.value }
                        })}
                        className="w-full px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-955 text-slate-100 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#EF4444]/20 focus:border-[#EF4444]"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800 text-right flex justify-end gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowEmpProfileModal(false)}
                      className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-800 transition-colors text-xs font-bold uppercase tracking-wider"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      disabled={empProfileSaving}
                      className="px-4 py-2 bg-[#EF4444] hover:bg-red-600 text-white font-bold rounded-xl shadow transition-colors text-xs uppercase tracking-wider flex items-center gap-1"
                    >
                      <Save size={12} />
                      {empProfileSaving ? 'Saving...' : 'Save Profile'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
