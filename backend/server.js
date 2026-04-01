require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const { User, Product, OnlineSale, OfflineSale, Shop, Return } = require('./models');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
if (process.env.MONGO_URI && !process.env.MONGO_URI.includes('<db_password>')) {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));
} else {
  console.error('\n⚠️  WARNING: MONGODB NOT CONNECTED');
  console.error('Please configure a valid MONGO_URI in your .env file and replace <db_password> with your actual password.\n');
}

// AUTH
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ message: 'Username and password required' });
  const user = await User.findOne({ username, password });
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  
  const userObj = user.toObject();
  const { password: _, _id, __v, ...safe } = userObj;
  res.json({ user: safe, token: `token_${user.id}_${Date.now()}` });
});

app.post('/api/auth/register', async (req, res) => {
  const { username, password, name } = req.body;
  if (!username || !password || !name)
    return res.status(400).json({ message: 'All fields required' });
  
  const existingUser = await User.findOne({ username });
  if (existingUser)
    return res.status(409).json({ message: 'Username already exists' });
  
  const user = new User({ id: uuidv4(), username, password, name });
  await user.save();
  
  const userObj = user.toObject();
  const { password: _, _id, __v, ...safe } = userObj;
  res.json({ user: safe });
});

// PRODUCTS
app.get('/api/products', async (_req, res) => {
  const products = await Product.find({}, '-_id -__v');
  res.json(products);
});

app.post('/api/products', async (req, res) => {
  const { name, sku, description, totalQty, unitPrice, category } = req.body;
  if (!name || totalQty === undefined)
    return res.status(400).json({ message: 'Name and quantity required' });
  
  const product = new Product({
    id: uuidv4(), name, sku: sku || '', description: description || '',
    totalQty: Number(totalQty), availableQty: Number(totalQty),
    unitPrice: Number(unitPrice) || 0,
    offlinePrice: Number(req.body.offlinePrice) || Number(unitPrice) || 0,
    onlinePrice: Number(req.body.onlinePrice) || Number(unitPrice) || 0,
    category: category || 'General'
  });
  await product.save();
  res.json(product);
});

app.put('/api/products/:id', async (req, res) => {
  const product = await Product.findOneAndUpdate(
    { id: req.params.id },
    { ...req.body, updatedAt: new Date().toISOString() },
    { new: true }
  ).select('-_id -__v');
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json(product);
});

app.delete('/api/products/:id', async (req, res) => {
  await Product.findOneAndDelete({ id: req.params.id });
  res.json({ message: 'Deleted' });
});

// ONLINE SALES
app.get('/api/sales/online', async (_req, res) => {
  const sales = await OnlineSale.find({}, '-_id -__v');
  res.json(sales);
});

app.post('/api/sales/online', async (req, res) => {
  const { productId, qty, platform, amount, orderId, date, notes } = req.body;
  if (!productId || !qty || !platform)
    return res.status(400).json({ message: 'Product, quantity and platform required' });
  
  const product = await Product.findOne({ id: productId });
  if (!product) return res.status(404).json({ message: 'Product not found' });
  if (product.availableQty < Number(qty))
    return res.status(400).json({ message: 'Insufficient stock' });
  
  product.availableQty -= Number(qty);
  product.totalQty -= Number(qty);
  product.updatedAt = new Date().toISOString();
  await product.save();
  
  const sale = new OnlineSale({
    id: uuidv4(), productId, productName: product.name,
    platform, qty: Number(qty), amount: Number(amount) || 0,
    orderId: orderId || '', date: date || new Date().toISOString().split('T')[0],
    notes: notes || ''
  });
  await sale.save();
  
  const saleObj = sale.toObject();
  delete saleObj._id;
  delete saleObj.__v;
  res.json(saleObj);
});

app.delete('/api/sales/online/:id', async (req, res) => {
  const sale = await OnlineSale.findOneAndDelete({ id: req.params.id });
  if (!sale) return res.status(404).json({ message: 'Sale not found' });
  
  const product = await Product.findOne({ id: sale.productId });
  if (product) {
    product.availableQty += sale.qty;
    product.totalQty += sale.qty;
    product.updatedAt = new Date().toISOString();
    await product.save();
  }
  res.json({ message: 'Deleted and stock restored' });
});

// OFFLINE SALES
app.get('/api/sales/offline', async (_req, res) => {
  const sales = await OfflineSale.find({}, '-_id -__v');
  res.json(sales);
});

app.post('/api/sales/offline', async (req, res) => {
  const { buyerName, items, totalAmount, transactions, date, notes } = req.body;
  if (!buyerName || !items || !items.length)
    return res.status(400).json({ message: 'Buyer name and at least one product required' });
  
  const enrichedItems = [];
  
  for (const item of items) {
    const product = await Product.findOne({ id: item.productId });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (product.availableQty < Number(item.qty))
      return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
    
    product.availableQty -= Number(item.qty);
    product.totalQty -= Number(item.qty);
    product.updatedAt = new Date().toISOString();
    await product.save();
    
    enrichedItems.push({
      productId: item.productId,
      productName: product.name,
      qty: Number(item.qty),
      amount: Number(item.amount) || 0,
      date: item.date || date || new Date().toISOString().split('T')[0]
    });
  }
  
  const total = Number(totalAmount) || enrichedItems.reduce((s, i) => s + i.amount, 0);
  const txns = Array.isArray(transactions) ? transactions : [];
  const received = txns.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  
  const sale = new OfflineSale({
    id: uuidv4(), buyerName, items: enrichedItems,
    totalAmount: total, transactions: txns, amountReceived: received, amountLeft: total - received,
    date: date || new Date().toISOString().split('T')[0],
    notes: notes || ''
  });
  await sale.save();
  
  const saleObj = sale.toObject();
  delete saleObj._id;
  delete saleObj.__v;
  res.json(saleObj);
});

app.put('/api/sales/offline/:id', async (req, res) => {
  const sale = await OfflineSale.findOne({ id: req.params.id });
  if (!sale) return res.status(404).json({ message: 'Sale not found' });
  
  const { newItems, newItemsDate, newTransactions } = req.body;
  let additionalAmount = 0;
  
  if (newItems && newItems.length > 0) {
    const enrichedNew = [];
    for (const item of newItems) {
      const product = await Product.findOne({ id: item.productId });
      if (!product) return res.status(404).json({ message: 'Product not found' });
      if (product.availableQty < Number(item.qty))
        return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
      
      product.availableQty -= Number(item.qty);
      product.totalQty -= Number(item.qty);
      product.updatedAt = new Date().toISOString();
      await product.save();
      
      enrichedNew.push({
        productId: item.productId,
        productName: product.name,
        qty: Number(item.qty),
        amount: Number(item.amount) || 0,
        date: newItemsDate || new Date().toISOString().split('T')[0],
      });
      additionalAmount += Number(item.amount) || 0;
    }
    sale.items.push(...enrichedNew);
  }
  
  const appendedTxns = Array.isArray(newTransactions) ? newTransactions : [];
  for (const t of appendedTxns) sale.transactions.push(t);
  
  const newTotal = sale.totalAmount + additionalAmount;
  const received = sale.transactions.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  
  sale.totalAmount = newTotal;
  sale.amountReceived = received;
  sale.amountLeft = newTotal - received;
  sale.updatedAt = new Date().toISOString();
  await sale.save();
  
  const saleObj = sale.toObject();
  delete saleObj._id;
  delete saleObj.__v;
  res.json(saleObj);
});

app.delete('/api/sales/offline/:id', async (req, res) => {
  const sale = await OfflineSale.findOneAndDelete({ id: req.params.id });
  if (!sale) return res.status(404).json({ message: 'Sale not found' });
  
  const items = sale.items || [{ productId: sale.productId, qty: sale.qty }];
  for (const item of items) {
    if(!item.productId) continue;
    const product = await Product.findOne({ id: item.productId });
    if (product) {
      product.availableQty += Number(item.qty);
      product.totalQty += Number(item.qty);
      product.updatedAt = new Date().toISOString();
      await product.save();
    }
  }
  res.json({ message: 'Deleted and stock restored' });
});

// SHOPS
app.get('/api/shops', async (_req, res) => {
  const shops = await Shop.find({}, '-_id -__v');
  res.json(shops);
});

app.post('/api/shops', async (req, res) => {
  const { name, address, mobile } = req.body;
  if (!name) return res.status(400).json({ message: 'Shop name required' });
  
  const shop = new Shop({ id: uuidv4(), name, address: address || '', mobile: mobile || '' });
  await shop.save();
  
  const shopObj = shop.toObject();
  delete shopObj._id;
  delete shopObj.__v;
  res.json(shopObj);
});

app.put('/api/shops/:id', async (req, res) => {
  const shop = await Shop.findOneAndUpdate(
    { id: req.params.id },
    { ...req.body, updatedAt: new Date().toISOString() },
    { new: true }
  ).select('-_id -__v');
  if (!shop) return res.status(404).json({ message: 'Shop not found' });
  res.json(shop);
});

app.delete('/api/shops/:id', async (req, res) => {
  await Shop.findOneAndDelete({ id: req.params.id });
  res.json({ message: 'Deleted' });
});

// RETURNS
app.get('/api/returns', async (_req, res) => {
  const returnsList = await Return.find({}, '-_id -__v');
  res.json(returnsList);
});

app.post('/api/returns', async (req, res) => {
  const { productId, platform, date, condition, qty, notes, shopId, shopName, action } = req.body;
  if (!productId || !platform || !condition)
    return res.status(400).json({ message: 'Product, platform and condition required' });
  
  const product = await Product.findOne({ id: productId });
  if (!product) return res.status(404).json({ message: 'Product not found' });
  
  const returnQty = Number(qty) || 1;
  if (condition === 'good' && action !== 'replace') {
    product.availableQty += returnQty;
    product.totalQty += returnQty;
    product.updatedAt = new Date().toISOString();
    await product.save();
  }
  
  const ret = new Return({
    id: uuidv4(), productId, productName: product.name,
    platform, shopId, shopName, action: action || 'return', qty: returnQty, date: date || new Date().toISOString().split('T')[0],
    condition, notes: notes || ''
  });
  await ret.save();
  
  const retObj = ret.toObject();
  delete retObj._id;
  delete retObj.__v;
  res.json(retObj);
});

app.delete('/api/returns/:id', async (req, res) => {
  const ret = await Return.findOneAndDelete({ id: req.params.id });
  if (!ret) return res.status(404).json({ message: 'Return not found' });
  
  if (ret.condition === 'good' && ret.action !== 'replace') {
    const product = await Product.findOne({ id: ret.productId });
    if (product) {
      const returnQty = Number(ret.qty) || 1;
      product.availableQty -= returnQty;
      product.totalQty -= returnQty;
      product.updatedAt = new Date().toISOString();
      await product.save();
    }
  }
  res.json({ message: 'Deleted' });
});

// DASHBOARD STATS
app.get('/api/stats', async (_req, res) => {
  const today = new Date().toISOString().split('T')[0];
  
  const products = await Product.find({});
  const onlineSales = await OnlineSale.find({});
  const offlineSales = await OfflineSale.find({});
  
  res.json({
    totalProducts: products.length,
    lowStock: products.filter((p) => p.availableQty > 0 && p.availableQty < 20).length,
    outOfStock: products.filter((p) => p.availableQty === 0).length,
    onlineSalesToday: onlineSales.filter((s) => s.date === today).length,
    offlineSalesToday: offlineSales.filter((s) => s.date === today).length,
    onlineRevenueTotal: onlineSales.reduce((s, x) => s + (x.amount || 0), 0),
    offlineRevenueTotal: offlineSales.reduce((s, x) => s + (x.totalAmount || 0), 0),
    pendingPayments: offlineSales.reduce((s, x) => s + (x.amountLeft || 0), 0),
    recentOnline: onlineSales.sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    recentOffline: offlineSales.sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Inventory API running at http://localhost:${PORT}`));
