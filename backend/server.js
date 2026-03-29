const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, 'data');

function readJSON(filename) {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJSON(filename, data) {
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// AUTH
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ message: 'Username and password required' });
  const data = readJSON('users.json');
  const user = data.users.find((u) => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  const { password: _, ...safe } = user;
  res.json({ user: safe, token: `token_${user.id}_${Date.now()}` });
});

app.post('/api/auth/register', (req, res) => {
  const { username, password, name } = req.body;
  if (!username || !password || !name)
    return res.status(400).json({ message: 'All fields required' });
  const data = readJSON('users.json');
  if (data.users.find((u) => u.username === username))
    return res.status(409).json({ message: 'Username already exists' });
  const user = { id: uuidv4(), username, password, name, role: 'user', createdAt: new Date().toISOString() };
  data.users.push(user);
  writeJSON('users.json', data);
  const { password: _, ...safe } = user;
  res.json({ user: safe });
});

// PRODUCTS
app.get('/api/products', (_req, res) => {
  const data = readJSON('products.json');
  res.json(data.products || []);
});

app.post('/api/products', (req, res) => {
  const { name, sku, description, totalQty, unitPrice, category } = req.body;
  if (!name || totalQty === undefined)
    return res.status(400).json({ message: 'Name and quantity required' });
  const data = readJSON('products.json');
  const product = {
    id: uuidv4(), name, sku: sku || '', description: description || '',
    totalQty: Number(totalQty), availableQty: Number(totalQty),
    unitPrice: Number(unitPrice) || 0,
    offlinePrice: Number(req.body.offlinePrice) || Number(unitPrice) || 0,
    onlinePrice: Number(req.body.onlinePrice) || Number(unitPrice) || 0,
    category: category || 'General',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  data.products.push(product);
  writeJSON('products.json', data);
  res.json(product);
});

app.put('/api/products/:id', (req, res) => {
  const data = readJSON('products.json');
  const idx = data.products.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Product not found' });
  data.products[idx] = { ...data.products[idx], ...req.body, updatedAt: new Date().toISOString() };
  writeJSON('products.json', data);
  res.json(data.products[idx]);
});

app.delete('/api/products/:id', (req, res) => {
  const data = readJSON('products.json');
  data.products = data.products.filter((p) => p.id !== req.params.id);
  writeJSON('products.json', data);
  res.json({ message: 'Deleted' });
});

// ONLINE SALES
app.get('/api/sales/online', (_req, res) => {
  const data = readJSON('online-sales.json');
  res.json(data.sales || []);
});

app.post('/api/sales/online', (req, res) => {
  const { productId, qty, platform, amount, orderId, date, notes } = req.body;
  if (!productId || !qty || !platform)
    return res.status(400).json({ message: 'Product, quantity and platform required' });
  const productsData = readJSON('products.json');
  const pIdx = productsData.products.findIndex((p) => p.id === productId);
  if (pIdx === -1) return res.status(404).json({ message: 'Product not found' });
  if (productsData.products[pIdx].availableQty < Number(qty))
    return res.status(400).json({ message: 'Insufficient stock' });
  productsData.products[pIdx].availableQty -= Number(qty);
  productsData.products[pIdx].totalQty -= Number(qty);
  productsData.products[pIdx].updatedAt = new Date().toISOString();
  writeJSON('products.json', productsData);
  const salesData = readJSON('online-sales.json');
  const sale = {
    id: uuidv4(), productId, productName: productsData.products[pIdx].name,
    platform, qty: Number(qty), amount: Number(amount) || 0,
    orderId: orderId || '', date: date || new Date().toISOString().split('T')[0],
    notes: notes || '', createdAt: new Date().toISOString(),
  };
  salesData.sales.push(sale);
  writeJSON('online-sales.json', salesData);
  res.json(sale);
});

app.delete('/api/sales/online/:id', (req, res) => {
  const salesData = readJSON('online-sales.json');
  const sale = salesData.sales.find((s) => s.id === req.params.id);
  if (!sale) return res.status(404).json({ message: 'Sale not found' });
  const productsData = readJSON('products.json');
  const pIdx = productsData.products.findIndex((p) => p.id === sale.productId);
  if (pIdx !== -1) {
    productsData.products[pIdx].availableQty += sale.qty;
    productsData.products[pIdx].totalQty += sale.qty;
    productsData.products[pIdx].updatedAt = new Date().toISOString();
    writeJSON('products.json', productsData);
  }
  salesData.sales = salesData.sales.filter((s) => s.id !== req.params.id);
  writeJSON('online-sales.json', salesData);
  res.json({ message: 'Deleted and stock restored' });
});

// OFFLINE SALES
app.get('/api/sales/offline', (_req, res) => {
  const data = readJSON('offline-sales.json');
  res.json(data.sales || []);
});

app.post('/api/sales/offline', (req, res) => {
  const { buyerName, items, totalAmount, transactions, date, notes } = req.body;
  if (!buyerName || !items || !items.length)
    return res.status(400).json({ message: 'Buyer name and at least one product required' });
  const productsData = readJSON('products.json');
  // Validate stock for all items first
  for (const item of items) {
    const pIdx = productsData.products.findIndex((p) => p.id === item.productId);
    if (pIdx === -1) return res.status(404).json({ message: 'Product not found' });
    if (productsData.products[pIdx].availableQty < Number(item.qty))
      return res.status(400).json({ message: `Insufficient stock for ${productsData.products[pIdx].name}` });
  }
  // Decrement stock and build enriched items
  const enrichedItems = [];
  for (const item of items) {
    const pIdx = productsData.products.findIndex((p) => p.id === item.productId);
    productsData.products[pIdx].availableQty -= Number(item.qty);
    productsData.products[pIdx].totalQty -= Number(item.qty);
    productsData.products[pIdx].updatedAt = new Date().toISOString();
    enrichedItems.push({
      productId: item.productId,
      productName: productsData.products[pIdx].name,
      qty: Number(item.qty),
      amount: Number(item.amount) || 0,
      date: item.date || date || new Date().toISOString().split('T')[0],
    });
  }
  writeJSON('products.json', productsData);
  const salesData = readJSON('offline-sales.json');
  const total = Number(totalAmount) || enrichedItems.reduce((s, i) => s + i.amount, 0);
  const txns = Array.isArray(transactions) ? transactions : [];
  const received = txns.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const sale = {
    id: uuidv4(), buyerName, items: enrichedItems,
    totalAmount: total, transactions: txns, amountReceived: received, amountLeft: total - received,
    date: date || new Date().toISOString().split('T')[0],
    notes: notes || '', createdAt: new Date().toISOString(),
  };
  salesData.sales.push(sale);
  writeJSON('offline-sales.json', salesData);
  res.json(sale);
});

app.put('/api/sales/offline/:id', (req, res) => {
  const salesData = readJSON('offline-sales.json');
  const idx = salesData.sales.findIndex((s) => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Sale not found' });
  const { newItems, newItemsDate, newTransactions } = req.body;
  let sale = salesData.sales[idx];
  let additionalAmount = 0;

  if (newItems && newItems.length > 0) {
    const productsData = readJSON('products.json');
    // Validate stock for all new items first
    for (const item of newItems) {
      const pIdx = productsData.products.findIndex((p) => p.id === item.productId);
      if (pIdx === -1) return res.status(404).json({ message: 'Product not found' });
      if (productsData.products[pIdx].availableQty < Number(item.qty))
        return res.status(400).json({ message: `Insufficient stock for ${productsData.products[pIdx].name}` });
    }
    // Decrement stock and build enriched items
    const enrichedNew = [];
    for (const item of newItems) {
      const pIdx = productsData.products.findIndex((p) => p.id === item.productId);
      productsData.products[pIdx].availableQty -= Number(item.qty);
      productsData.products[pIdx].totalQty -= Number(item.qty);
      productsData.products[pIdx].updatedAt = new Date().toISOString();
      enrichedNew.push({
        productId: item.productId,
        productName: productsData.products[pIdx].name,
        qty: Number(item.qty),
        amount: Number(item.amount) || 0,
        date: newItemsDate || new Date().toISOString().split('T')[0],
      });
      additionalAmount += Number(item.amount) || 0;
    }
    writeJSON('products.json', productsData);
    sale = { ...sale, items: [...(sale.items || []), ...enrichedNew] };
  }

  const appendedTxns = Array.isArray(newTransactions) ? newTransactions : [];
  const allTxns = [...(sale.transactions || []), ...appendedTxns];
  const newTotal = sale.totalAmount + additionalAmount;
  const received = allTxns.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  salesData.sales[idx] = { ...sale, totalAmount: newTotal, transactions: allTxns, amountReceived: received, amountLeft: newTotal - received, updatedAt: new Date().toISOString() };
  writeJSON('offline-sales.json', salesData);
  res.json(salesData.sales[idx]);
});

app.delete('/api/sales/offline/:id', (req, res) => {
  const salesData = readJSON('offline-sales.json');
  const sale = salesData.sales.find((s) => s.id === req.params.id);
  if (!sale) return res.status(404).json({ message: 'Sale not found' });
  const productsData = readJSON('products.json');
  // Support both new items[] format and legacy single-product format
  const items = sale.items || [{ productId: sale.productId, qty: sale.qty }];
  for (const item of items) {
    const pIdx = productsData.products.findIndex((p) => p.id === item.productId);
    if (pIdx !== -1) {
      productsData.products[pIdx].availableQty += Number(item.qty);
      productsData.products[pIdx].totalQty += Number(item.qty);
      productsData.products[pIdx].updatedAt = new Date().toISOString();
    }
  }
  writeJSON('products.json', productsData);
  salesData.sales = salesData.sales.filter((s) => s.id !== req.params.id);
  writeJSON('offline-sales.json', salesData);
  res.json({ message: 'Deleted and stock restored' });
});

// SHOPS
app.get('/api/shops', (_req, res) => {
  const data = readJSON('shops.json');
  res.json(data.shops || []);
});

app.post('/api/shops', (req, res) => {
  const { name, address, mobile } = req.body;
  if (!name) return res.status(400).json({ message: 'Shop name required' });
  const data = readJSON('shops.json');
  const shop = { id: uuidv4(), name, address: address || '', mobile: mobile || '', createdAt: new Date().toISOString() };
  data.shops.push(shop);
  writeJSON('shops.json', data);
  res.json(shop);
});

app.put('/api/shops/:id', (req, res) => {
  const data = readJSON('shops.json');
  const idx = data.shops.findIndex((s) => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Shop not found' });
  data.shops[idx] = { ...data.shops[idx], ...req.body, updatedAt: new Date().toISOString() };
  writeJSON('shops.json', data);
  res.json(data.shops[idx]);
});

app.delete('/api/shops/:id', (req, res) => {
  const data = readJSON('shops.json');
  data.shops = data.shops.filter((s) => s.id !== req.params.id);
  writeJSON('shops.json', data);
  res.json({ message: 'Deleted' });
});

// RETURNS
app.get('/api/returns', (_req, res) => {
  const data = readJSON('returns.json');
  res.json(data.returns || []);
});

app.post('/api/returns', (req, res) => {
  const { productId, platform, date, condition, qty, notes, shopId, shopName, action } = req.body;
  if (!productId || !platform || !condition)
    return res.status(400).json({ message: 'Product, platform and condition required' });
  const productsData = readJSON('products.json');
  const pIdx = productsData.products.findIndex((p) => p.id === productId);
  if (pIdx === -1) return res.status(404).json({ message: 'Product not found' });
  const returnQty = Number(qty) || 1;
  if (condition === 'good' && action !== 'replace') {
    productsData.products[pIdx].availableQty += returnQty;
    productsData.products[pIdx].totalQty += returnQty;
    productsData.products[pIdx].updatedAt = new Date().toISOString();
    writeJSON('products.json', productsData);
  }
  const data = readJSON('returns.json');
  const ret = {
    id: uuidv4(), productId, productName: productsData.products[pIdx].name,
    platform, shopId, shopName, action: action || 'return', qty: returnQty, date: date || new Date().toISOString().split('T')[0],
    condition, notes: notes || '', createdAt: new Date().toISOString(),
  };
  data.returns.push(ret);
  writeJSON('returns.json', data);
  res.json(ret);
});

app.delete('/api/returns/:id', (req, res) => {
  const data = readJSON('returns.json');
  const ret = data.returns.find((r) => r.id === req.params.id);
  if (!ret) return res.status(404).json({ message: 'Return not found' });
  if (ret.condition === 'good' && ret.action !== 'replace') {
    const productsData = readJSON('products.json');
    const pIdx = productsData.products.findIndex((p) => p.id === ret.productId);
    if (pIdx !== -1) {
      const returnQty = Number(ret.qty) || 1;
      productsData.products[pIdx].availableQty -= returnQty;
      productsData.products[pIdx].totalQty -= returnQty;
      productsData.products[pIdx].updatedAt = new Date().toISOString();
      writeJSON('products.json', productsData);
    }
  }
  data.returns = data.returns.filter((r) => r.id !== req.params.id);
  writeJSON('returns.json', data);
  res.json({ message: 'Deleted' });
});

// DASHBOARD STATS
app.get('/api/stats', (_req, res) => {
  const products = readJSON('products.json').products || [];
  const onlineSales = readJSON('online-sales.json').sales || [];
  const offlineSales = readJSON('offline-sales.json').sales || [];
  const today = new Date().toISOString().split('T')[0];
  res.json({
    totalProducts: products.length,
    lowStock: products.filter((p) => p.availableQty > 0 && p.availableQty < 20).length,
    outOfStock: products.filter((p) => p.availableQty === 0).length,
    onlineSalesToday: onlineSales.filter((s) => s.date === today).length,
    offlineSalesToday: offlineSales.filter((s) => s.date === today).length,
    onlineRevenueTotal: onlineSales.reduce((s, x) => s + (x.amount || 0), 0),
    offlineRevenueTotal: offlineSales.reduce((s, x) => s + (x.totalAmount || 0), 0),
    pendingPayments: offlineSales.reduce((s, x) => s + (x.amountLeft || 0), 0),
    recentOnline: [...onlineSales].reverse().slice(0, 5),
    recentOffline: [...offlineSales].reverse().slice(0, 5),
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Inventory API running at http://localhost:${PORT}`));
