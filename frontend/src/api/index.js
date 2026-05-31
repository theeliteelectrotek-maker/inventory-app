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
  const res = await fetch(BASE + url, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
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

  // Stats
  getStats: () => request('GET', '/stats'),

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
};

