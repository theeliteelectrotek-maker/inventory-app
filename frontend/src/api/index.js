const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';
  
function getToken() {
  return localStorage.getItem('inv_token') || '';
}

async function request(method, url, body) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
  };
  if (body) opts.body = JSON.stringify(body);

  let res;
  try {
    res = await fetch(BASE + url, opts);
  } catch (err) {
    throw new Error('Network error. Please check if the server is running.');
  }

  let data = null;
  const contentType = res.headers.get('Content-Type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch (err) {
      // Body might be empty or invalid JSON
      data = null;
    }
  } else {
    try {
      const text = await res.text();
      data = { message: text };
    } catch (err) {
      data = null;
    }
  }

  if (!res.ok) {
    throw new Error((data && data.message) || `Request failed with status ${res.status}`);
  }

  return data;
}

export const api = {
  // Auth
  login: (creds) => request('POST', '/auth/login', creds),
  register: (payload) => request('POST', '/auth/register', payload),

  // Products
  getProducts: () => request('GET', '/products'),
  addProduct: (p) => request('POST', '/products', p),
  updateProduct: (id, p) => request('PUT', `/products/${id}`, p),
  deleteProduct: (id) => request('DELETE', `/products/${id}`),

  // Online Sales
  getOnlineSales: () => request('GET', '/online-sales'),
  addOnlineSale: (s) => request('POST', '/online-sales', s),
  deleteOnlineSale: (id) => request('DELETE', `/online-sales/${id}`),
  cancelOnlineSale: (id) => request('POST', `/online-sales/${id}/cancel`),

  // Offline Sales
  getOfflineSales: () => request('GET', '/offline-sales'),
  addOfflineSale: (s) => request('POST', '/offline-sales', s),
  updateOfflineSale: (id, s) => request('PUT', `/offline-sales/${id}`, s),
  deleteOfflineSale: (id) => request('DELETE', `/offline-sales/${id}`),

  // Shops
  getShops: () => request('GET', '/shops'),
  addShop: (s) => request('POST', '/shops', s),
  updateShop: (id, s) => request('PUT', `/shops/${id}`, s),
  deleteShop: (id) => request('DELETE', `/shops/${id}`),

  // Returns
  getReturns: () => request('GET', '/returns'),
  addReturn: (r) => request('POST', '/returns', r),
  deleteReturn: (id) => request('DELETE', `/returns/${id}`),

  // Replacements
  getReplacements: () => request('GET', '/replacements'),
  addReplacement: (r) => request('POST', '/replacements', r),
  updateReplacement: (id, r) => request('PUT', `/replacements/${id}`, r),
  deleteReplacement: (id) => request('DELETE', `/replacements/${id}`),

  // Stats
  getStats: (startDate, endDate) => {
    let url = '/stats';
    if (startDate && endDate) {
      url += `?startDate=${startDate}&endDate=${endDate}`;
    }
    return request('GET', url);
  },

  // Analytics
  getAnalytics: (startDate, endDate, customerType = 'all') => request('GET', `/analytics?startDate=${startDate}&endDate=${endDate}&customerType=${customerType}`),

  // Backup & Restore
  getBackupStatus: () => request('GET', '/backup/status'),
  restoreDatabase: (zipBase64) => request('POST', '/backup/restore', { zipBase64 }),

  // Import Center
  importPreview: (fileBase64, type) => request('POST', '/import/preview', { fileBase64, type }),
  importConfirm: (type, records) => request('POST', '/import/confirm', { type, records }),

  // Admin Logs
  logAdminAction: (action) => request('POST', '/admin/log-action', { action }),

  // Settings & Company Profile
  getCompanySettings: () => request('GET', '/settings/company'),
  updateCompanySettings: (profile) => request('PUT', '/settings/company', profile),

  // Employee Accounts & Management (Admin Only)
  getEmployees: () => request('GET', '/admin/employees'),
  addEmployee: (emp) => request('POST', '/admin/employees', emp),
  updateEmployee: (id, emp) => request('PUT', `/admin/employees/${id}`, emp),
  getAuditLogs: () => request('GET', '/admin/audit-logs'),

  // Team Communication Hub
  getChannels: () => request('GET', '/communication/channels'),
  createChannel: (c) => request('POST', '/communication/channels', c),
  getMessages: (channelId) => request('GET', `/communication/messages/${channelId}`),
  sendMessage: (msg) => request('POST', '/communication/messages', msg),
  editMessage: (id, content) => request('PUT', `/communication/messages/${id}`, { content }),
  deleteMessage: (id) => request('DELETE', `/communication/messages/${id}`),
  updateTaskStatus: (id, status) => request('PUT', `/communication/tasks/${id}`, { status }),
  getChatUsers: () => request('GET', '/communication/users'),
  getChatFiles: () => request('GET', '/communication/files'),
  getChatStats: () => request('GET', '/communication/stats'),
  getUnreadCount: () => request('GET', '/communication/unread-count'),
  markAsRead: (channelId) => request('POST', '/communication/read', { channelId }),

  // My Profile & Appearance Settings
  getProfile: () => request('GET', '/profile'),
  updateProfile: (data) => request('PUT', '/profile', data),
  updateAvatar: (avatar) => request('PUT', '/profile/avatar', { avatar }),
  changeMyPassword: (currentPassword, newPassword) => request('PUT', '/profile/password', { currentPassword, newPassword }),
  updateSecurityQuestions: (securityQuestions) => request('PUT', '/profile/security-questions', { securityQuestions }),
  getActiveSessions: () => request('GET', '/profile/sessions'),
  logoutAllSessions: () => request('POST', '/profile/logout-all'),
  updateAppearance: (appearance) => request('PUT', '/profile/appearance', appearance),
  getEmployeeProfile: (id) => request('GET', `/admin/employees/${id}/profile`),
  updateEmployeeProfile: (id, data) => request('PUT', `/admin/employees/${id}/profile`, data),
  updateEmployeeAvatar: (id, avatar) => request('PUT', `/admin/employees/${id}/avatar`, { avatar }),

  // Password Change Requests
  getPasswordChangeRequests: () => request('GET', '/admin/password-change-requests'),
  getMyPasswordChangeRequests: () => request('GET', '/profile/password-change-requests'),
  approvePasswordChangeRequest: (id, adminNote) => request('POST', `/admin/password-change-requests/${id}/approve`, { adminNote }),
  rejectPasswordChangeRequest: (id, adminNote) => request('POST', `/admin/password-change-requests/${id}/reject`, { adminNote }),

  // Purchases & Factory Management
  getSuppliers: () => request('GET', '/purchases/suppliers'),
  getArchivedSuppliers: () => request('GET', '/purchases/suppliers?archived=true'),
  addSupplier: (s) => request('POST', '/purchases/suppliers', s),
  updateSupplier: (id, s) => request('PUT', `/purchases/suppliers/${id}`, s),
  deleteSupplier: (id, reason) => request('DELETE', `/purchases/suppliers/${id}?reason=${encodeURIComponent(reason || '')}`),
  deleteSupplierPermanent: (id, reason) => request('DELETE', `/purchases/suppliers/${id}?permanent=true&reason=${encodeURIComponent(reason || '')}`),
  deleteSupplierForce: (id, reason) => request('DELETE', `/purchases/suppliers/${id}?force=true&reason=${encodeURIComponent(reason || '')}`),
  restoreSupplier: (id) => request('POST', `/purchases/suppliers/${id}/restore`),
  getPurchases: () => request('GET', '/purchases'),
  addPurchase: (p) => request('POST', '/purchases', p),
  updatePurchase: (id, p) => request('PUT', `/purchases/${id}`, p),
  deletePurchase: (id, reason) => request('DELETE', `/purchases/${id}?reason=${encodeURIComponent(reason || '')}`),
  getGRNs: () => request('GET', '/purchases/grns'),
  updateGRN: (id, g) => request('PUT', `/purchases/grns/${id}`, g),
  getSupplierPayments: () => request('GET', '/purchases/payments'),
  addSupplierPayment: (p) => request('POST', '/purchases/payments', p),
  updateSupplierPayment: (id, p) => request('PUT', `/purchases/payments/${id}`, p),
  deleteSupplierPayment: (id, reason) => request('DELETE', `/purchases/payments/${id}?reason=${encodeURIComponent(reason || '')}`),
  getSupplierLedger: (id) => request('GET', `/purchases/suppliers/${id}/ledger`),
  getPurchaseStats: () => request('GET', '/purchases/stats'),
  getPurchaseAuditLogs: () => request('GET', '/purchases/audit-logs'),
  
  // Notifications
  registerFCMToken: (token) => request('POST', '/profile/fcm-token', { token }),
  getNotifications: () => request('GET', '/notifications'),
  markNotificationRead: (id) => request('PUT', `/notifications/${id}/read`),
  markAllNotificationsRead: () => request('PUT', '/notifications/read-all'),
  deleteNotification: (id) => request('DELETE', `/notifications/${id}`),
  getNotificationSettings: () => request('GET', '/settings/notifications'),
  updateNotificationSettings: (settings) => request('PUT', '/settings/notifications', settings),
  sendTestPushNotification: (type) => request('POST', '/notifications/test', { type }),
};

