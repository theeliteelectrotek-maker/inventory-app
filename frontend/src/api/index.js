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
  getOnlineSales: () => request('GET', '/sales/online'),
  addOnlineSale: (s) => request('POST', '/sales/online', s),
  deleteOnlineSale: (id) => request('DELETE', `/sales/online/${id}`),

  // Offline Sales
  getOfflineSales: () => request('GET', '/sales/offline'),
  addOfflineSale: (s) => request('POST', '/sales/offline', s),
  updateOfflineSale: (id, s) => request('PUT', `/sales/offline/${id}`, s),
  deleteOfflineSale: (id) => request('DELETE', `/sales/offline/${id}`),

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
};
