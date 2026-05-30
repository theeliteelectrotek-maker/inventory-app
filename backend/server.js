// Trigger nodemon restart
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const xlsx = require('xlsx');
const PDFDocument = require('pdfkit');
const AdmZip = require('adm-zip');

const { User, Product, OnlineSale, OfflineSale, Shop, Return, Setting } = require('./models');

function getSystemLocalDate(d = new Date()) {
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - (offset * 60 * 1000));
  return local.toISOString().split('T')[0];
}

function parseLocalDate(dateStr) {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-');
  if (parts.length !== 3) return new Date(dateStr);
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return new Date(year, month, day);
}

function normalizeToLocalYYYYMMDD(dateVal) {
  if (!dateVal) return '';
  if (dateVal instanceof Date) {
    return getSystemLocalDate(dateVal);
  }
  if (typeof dateVal === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
      return dateVal;
    }
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
      return getSystemLocalDate(d);
    }
    return dateVal;
  }
  const d = new Date(dateVal);
  if (!isNaN(d.getTime())) {
    return getSystemLocalDate(d);
  }
  return '';
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Connect to MongoDB
async function runProductMigration() {
  try {
    const products = await Product.find({
      $or: [
        { amazonPrice: { $exists: false } },
        { flipkartPrice: { $exists: false } },
        { meeshoPrice: { $exists: false } }
      ]
    });
    if (products.length > 0) {
      console.log(`🔍 Found ${products.length} products to migrate...`);
      for (const p of products) {
        let updated = false;
        const sourcePrice = p.onlinePrice || p.unitPrice || 0;
        if (p._doc.amazonPrice === undefined) {
          p.amazonPrice = sourcePrice;
          updated = true;
        }
        if (p._doc.flipkartPrice === undefined) {
          p.flipkartPrice = sourcePrice;
          updated = true;
        }
        if (p._doc.meeshoPrice === undefined) {
          p.meeshoPrice = sourcePrice;
          updated = true;
        }
        // Also ensure costPrice defaults to offlinePrice or unitPrice
        if (p._doc.costPrice === undefined) {
          p.costPrice = p.offlinePrice || p.unitPrice || 0;
          updated = true;
        }
        if (updated) {
          await p.save();
        }
      }
      console.log(`✅ Migration completed for ${products.length} products.`);
    } else {
      console.log('✅ Database is up-to-date. No product migration needed.');
    }
  } catch (err) {
    console.error('❌ Error during product migration:', err);
  }
}

async function runShopMigration() {
  try {
    const requiredShops = [
      { name: 'Individual Customer', address: 'Individual retail buyer', mobile: '', notes: 'Retail customer channel', type: 'individual' },
      { name: 'Walk-in Customer', address: 'Walk-in store buyer', mobile: '', notes: 'Walk-in retail customer channel', type: 'walk-in' }
    ];

    for (const rs of requiredShops) {
      const exists = await Shop.findOne({ name: rs.name });
      if (!exists) {
        console.log(`🔍 Seeding missing CRM customer profile: ${rs.name}`);
        const shop = new Shop({
          id: uuidv4(),
          name: rs.name,
          address: rs.address,
          mobile: rs.mobile,
          notes: rs.notes,
          type: rs.type
        });
        await shop.save();
      }
    }
    // Also ensure all existing shops have type set to 'shop' if undefined
    const undefinedTypeShops = await Shop.find({ type: { $exists: false } });
    if (undefinedTypeShops.length > 0) {
      for (const s of undefinedTypeShops) {
        s.type = 'shop';
        await s.save();
      }
    }
    console.log('✅ Shop migration completed successfully.');
  } catch (err) {
    console.error('❌ Error during shop migration:', err);
  }
}

// Connect to MongoDB
if (process.env.MONGO_URI && !process.env.MONGO_URI.includes('<db_password>')) {
  mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds instead of 30s
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  })
    .then(async () => {
      console.log('✅ Connected to MongoDB Atlas');
      await runProductMigration();
      await runShopMigration();
    })
    .catch((err) => {
      console.error('❌ MongoDB Connection Error:', err.message);
      if (err.message.includes('timeout')) {
        console.error('TIP: This is usually because the Render IP address is not whitelisted in MongoDB Atlas Network Access.');
      }
    });
} else {
  console.error('\n⚠️  WARNING: MONGODB NOT CONNECTED');
  console.error('Please configure a valid MONGO_URI in your .env file and replace <db_password> with your actual password.\n');
}

// Helper to catch async errors
const catchAsync = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// AUTH
app.post('/api/auth/login', catchAsync(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ message: 'Username and password required' });
  const user = await User.findOne({ username, password });
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  
  const userObj = user.toObject();
  const { password: _, _id, __v, ...safe } = userObj;
  res.json({ user: safe, token: `token_${user.id}_${Date.now()}` });
}));

app.post('/api/auth/register', catchAsync(async (req, res) => {
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
}));

// PRODUCTS
app.get('/api/products', catchAsync(async (_req, res) => {
  const products = await Product.find({}, '-_id -__v');
  res.json(products);
}));

app.post('/api/products', catchAsync(async (req, res) => {
  const { name, sku, description, totalQty, costPrice, offlinePrice, amazonPrice, flipkartPrice, meeshoPrice, category } = req.body;
  if (!name || totalQty === undefined)
    return res.status(400).json({ message: 'Name and quantity required' });
  
  const product = new Product({
    id: uuidv4(), name, sku: sku || '', description: description || '',
    totalQty: Number(totalQty), availableQty: Number(totalQty),
    offlinePrice: Number(offlinePrice) || 0,
    amazonPrice: Number(amazonPrice) || 0,
    flipkartPrice: Number(flipkartPrice) || 0,
    meeshoPrice: Number(meeshoPrice) || 0,
    // Backwards compatibility mirrors
    unitPrice: Number(offlinePrice) || 0,
    costPrice: costPrice !== undefined ? Number(costPrice) : (Number(offlinePrice) || 0),
    onlinePrice: Number(amazonPrice) || 0,
    category: category || 'General'
  });
  await product.save();
  res.json(product);
}));

app.put('/api/products/:id', catchAsync(async (req, res) => {
  const updateData = { ...req.body };
  if (updateData.offlinePrice !== undefined) {
    updateData.unitPrice = Number(updateData.offlinePrice) || 0;
    if (updateData.costPrice === undefined) {
      updateData.costPrice = Number(updateData.offlinePrice) || 0;
    }
  }
  if (updateData.costPrice !== undefined) {
    updateData.costPrice = Number(updateData.costPrice) || 0;
  }
  if (updateData.amazonPrice !== undefined) {
    updateData.onlinePrice = Number(updateData.amazonPrice) || 0;
  }
  updateData.updatedAt = new Date().toISOString();

  const product = await Product.findOneAndUpdate(
    { id: req.params.id },
    updateData,
    { new: true }
  ).select('-_id -__v');
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json(product);
}));

app.delete('/api/products/:id', catchAsync(async (req, res) => {
  await Product.findOneAndDelete({ id: req.params.id });
  res.json({ message: 'Deleted' });
}));

// ONLINE SALES
const getOnlineSalesHandler = catchAsync(async (_req, res) => {
  const sales = await OnlineSale.find({}, '-_id -__v');
  res.json(sales);
});
app.get('/api/sales/online', getOnlineSalesHandler);
app.get('/api/online-sales', getOnlineSalesHandler);

const postOnlineSalesHandler = catchAsync(async (req, res) => {
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
  
  const plat = platform.toLowerCase();
  let platPrice = 0;
  if (plat === 'amazon') {
    platPrice = product.amazonPrice !== undefined ? product.amazonPrice : (product.onlinePrice || product.unitPrice || 0);
  } else if (plat === 'flipkart') {
    platPrice = product.flipkartPrice !== undefined ? product.flipkartPrice : (product.onlinePrice || product.unitPrice || 0);
  } else if (plat === 'meesho') {
    platPrice = product.meeshoPrice !== undefined ? product.meeshoPrice : (product.onlinePrice || product.unitPrice || 0);
  } else {
    platPrice = product.onlinePrice || product.unitPrice || 0;
  }
  const saleAmount = amount !== undefined && amount !== null && Number(amount) > 0 ? Number(amount) : platPrice * Number(qty);

  const sale = new OnlineSale({
    id: uuidv4(), productId, productName: product.name,
    platform, qty: Number(qty), amount: saleAmount,
    orderId: orderId || '', date: normalizeToLocalYYYYMMDD(date || new Date()),
    notes: notes || ''
  });
  await sale.save();
  
  const saleObj = sale.toObject();
  delete saleObj._id;
  delete saleObj.__v;
  res.json(saleObj);
});
app.post('/api/sales/online', postOnlineSalesHandler);
app.post('/api/online-sales', postOnlineSalesHandler);

const deleteOnlineSalesHandler = catchAsync(async (req, res) => {
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
app.delete('/api/sales/online/:id', deleteOnlineSalesHandler);
app.delete('/api/online-sales/:id', deleteOnlineSalesHandler);

// OFFLINE SALES
const getOfflineSalesHandler = catchAsync(async (_req, res) => {
  const sales = await OfflineSale.find({}, '-_id -__v');
  res.json(sales);
});
app.get('/api/sales/offline', getOfflineSalesHandler);
app.get('/api/offline-sales', getOfflineSalesHandler);

const postOfflineSalesHandler = catchAsync(async (req, res) => {
  const { buyerName, items, totalAmount, transactions, date, notes, gst } = req.body;
  if (!buyerName || !items || !items.length)
    return res.status(400).json({ message: 'Buyer name and at least one product required' });
  
  const products = await Product.find({ id: { $in: items.map(i => i.productId) } });
  
  for (const item of items) {
    const product = products.find(p => p.id === item.productId);
    if (!product) return res.status(404).json({ message: `Product ${item.productId} not found` });
    if (product.availableQty < Number(item.qty))
      return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
  }

  for (const item of items) {
    const product = products.find(p => p.id === item.productId);
    item.productName = product.name; // Add product name for the OfflineSale schema validation
    product.availableQty -= Number(item.qty);
    product.totalQty -= Number(item.qty);
    product.updatedAt = new Date().toISOString();
    await product.save();
  }

  const calculatedReceived = (transactions || []).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const calculatedLeft = totalAmount - calculatedReceived;

  const sale = new OfflineSale({
    id: uuidv4(),
    buyerName,
    items: items.map(item => ({
      ...item,
      date: normalizeToLocalYYYYMMDD(item.date || date || new Date())
    })),
    totalAmount,
    transactions: (transactions || []).map(t => ({
      id: t.id || uuidv4(),
      ...t,
      amount: Number(t.amount) || 0,
      date: normalizeToLocalYYYYMMDD(t.date || date || new Date())
    })),
    amountReceived: calculatedReceived,
    amountLeft: calculatedLeft,
    date: normalizeToLocalYYYYMMDD(date || new Date()),
    notes,
    gst: gst || false
  });
  await sale.save();
  
  const saleObj = sale.toObject();
  delete saleObj._id;
  delete saleObj.__v;
  res.json(saleObj);
});
app.post('/api/sales/offline', postOfflineSalesHandler);
app.post('/api/offline-sales', postOfflineSalesHandler);

const deleteOfflineSalesHandler = catchAsync(async (req, res) => {
  const sale = await OfflineSale.findOneAndDelete({ id: req.params.id });
  if (!sale) return res.status(404).json({ message: 'Sale not found' });
  
  for (const item of sale.items) {
    const product = await Product.findOne({ id: item.productId });
    if (product) {
      product.availableQty += item.qty;
      product.totalQty += item.qty;
      product.updatedAt = new Date().toISOString();
      await product.save();
    }
  }
  res.json({ message: 'Deleted and stock restored' });
});
app.delete('/api/sales/offline/:id', deleteOfflineSalesHandler);
app.delete('/api/offline-sales/:id', deleteOfflineSalesHandler);

const putOfflineSalesHandler = catchAsync(async (req, res) => {
  const { newTransactions, newItems, newItemsDate, items, totalAmount, gst, transactions, corrections } = req.body;
  const sale = await OfflineSale.findOne({ id: req.params.id });
  if (!sale) return res.status(404).json({ message: 'Sale not found' });

  // Update existing items/total if passed (e.g. when toggling GST on/off)
  if (items) {
    sale.items = items.map(item => ({
      ...item,
      date: normalizeToLocalYYYYMMDD(item.date || sale.date || new Date())
    }));
    sale.markModified('items');
  }
  if (totalAmount !== undefined) {
    sale.totalAmount = totalAmount;
  }
  if (gst !== undefined) {
    sale.gst = gst;
  }

  if (newItems && newItems.length > 0) {
    const products = await Product.find({ id: { $in: newItems.map(i => i.productId) } });
    for (const item of newItems) {
      const product = products.find(p => p.id === item.productId);
      if (!product) return res.status(404).json({ message: `Product ${item.productId} not found` });
      if (product.availableQty < Number(item.qty))
        return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
    }
    for (const item of newItems) {
      const product = products.find(p => p.id === item.productId);
      item.productName = product.name;
      item.date = normalizeToLocalYYYYMMDD(item.date || newItemsDate || new Date());
      product.availableQty -= Number(item.qty);
      product.totalQty -= Number(item.qty);
      product.updatedAt = new Date().toISOString();
      await product.save();
      sale.items.push(item);
      sale.totalAmount += Number(item.amount) || 0;
    }
  }

  if (transactions) {
    sale.transactions = transactions.map(t => ({
      id: t.id || uuidv4(),
      amount: Number(t.amount) || 0,
      date: normalizeToLocalYYYYMMDD(t.date || new Date()),
      method: t.method || 'cash',
      referenceNumber: t.referenceNumber || '',
      notes: t.notes || ''
    }));
    sale.amountReceived = sale.transactions.reduce((sum, t) => sum + t.amount, 0);
    sale.markModified('transactions');
  } else if (newTransactions && newTransactions.length > 0) {
    for (const txn of newTransactions) {
      sale.transactions.push({
        id: txn.id || uuidv4(),
        ...txn,
        amount: Number(txn.amount) || 0,
        date: normalizeToLocalYYYYMMDD(txn.date || new Date())
      });
      sale.amountReceived += (Number(txn.amount) || 0);
    }
    sale.markModified('transactions');
  }

  if (corrections) {
    sale.corrections = corrections;
    sale.markModified('corrections');
  }

  sale.amountLeft = sale.totalAmount - sale.amountReceived;
  sale.updatedAt = new Date().toISOString();
  await sale.save();

  const saleObj = sale.toObject();
  delete saleObj._id;
  delete saleObj.__v;
  res.json(saleObj);
});
app.put('/api/sales/offline/:id', putOfflineSalesHandler);
app.put('/api/offline-sales/:id', putOfflineSalesHandler);

// SHOPS
app.get('/api/shops', catchAsync(async (_req, res) => {
  const shops = await Shop.find({}, '-_id -__v');
  res.json(shops);
}));

app.post('/api/shops', catchAsync(async (req, res) => {
  const { name, address, mobile, notes } = req.body;
  if (!name) return res.status(400).json({ message: 'Shop name required' });
  const shop = new Shop({ id: uuidv4(), name, address: address || '', mobile: mobile || '', notes: notes || '' });
  await shop.save();
  res.json(shop);
}));

app.put('/api/shops/:id', catchAsync(async (req, res) => {
  const shop = await Shop.findOneAndUpdate(
    { id: req.params.id },
    { ...req.body, updatedAt: new Date().toISOString() },
    { new: true }
  ).select('-_id -__v');
  if (!shop) return res.status(404).json({ message: 'Shop not found' });
  res.json(shop);
}));

app.delete('/api/shops/:id', catchAsync(async (req, res) => {
  await Shop.findOneAndDelete({ id: req.params.id });
  res.json({ message: 'Deleted' });
}));

// RETURNS
app.get('/api/returns', catchAsync(async (_req, res) => {
  const returns = await Return.find({}, '-_id -__v');
  res.json(returns);
}));

app.post('/api/returns', catchAsync(async (req, res) => {
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
    platform, shopId, shopName, action: action || 'return', qty: returnQty, date: normalizeToLocalYYYYMMDD(date || new Date()),
    condition, notes: notes || ''
  });
  await ret.save();
  
  const retObj = ret.toObject();
  delete retObj._id;
  delete retObj.__v;
  res.json(retObj);
}));

app.delete('/api/returns/:id', catchAsync(async (req, res) => {
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
}));

// BUSINESS ANALYTICS & PROFIT
app.get('/api/analytics', catchAsync(async (req, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    return res.status(400).json({ message: 'startDate and endDate are required' });
  }

  // 1. Fetch Products for Cost and Platform Pricing mapping
  const products = await Product.find({}, 'id name costPrice amazonPrice flipkartPrice meeshoPrice offlinePrice onlinePrice unitPrice availableQty category');
  const prodMap = {};
  products.forEach(p => {
    prodMap[p.id] = {
      costPrice: p.costPrice || 0,
      amazonPrice: p.amazonPrice !== undefined ? p.amazonPrice : (p.onlinePrice || p.unitPrice || 0),
      flipkartPrice: p.flipkartPrice !== undefined ? p.flipkartPrice : (p.onlinePrice || p.unitPrice || 0),
      meeshoPrice: p.meeshoPrice !== undefined ? p.meeshoPrice : (p.onlinePrice || p.unitPrice || 0),
      offlinePrice: p.offlinePrice || p.unitPrice || 0,
      name: p.name
    };
  });

  const getProductCost = (productId) => prodMap[productId]?.costPrice || 0;
  
  const getReturnPrice = (productId, platform) => {
    const pm = prodMap[productId];
    if (!pm) return 0;
    const plat = platform ? platform.toLowerCase() : '';
    if (plat === 'amazon') return pm.amazonPrice;
    if (plat === 'flipkart') return pm.flipkartPrice;
    if (plat === 'meesho') return pm.meeshoPrice;
    return pm.offlinePrice; // shop or other
  };

  // 2. Fetch Sales and Returns in the range
  const onlineSalesRaw = await OnlineSale.find({ date: { $gte: startDate, $lte: endDate } });
  const onlineSales = onlineSalesRaw.map(s => {
    const sObj = s.toObject();
    if (!sObj.amount || sObj.amount <= 0) {
      const pm = prodMap[sObj.productId];
      if (pm) {
        const plat = sObj.platform ? sObj.platform.toLowerCase() : '';
        let price = 0;
        if (plat === 'amazon') price = pm.amazonPrice;
        else if (plat === 'flipkart') price = pm.flipkartPrice;
        else if (plat === 'meesho') price = pm.meeshoPrice;
        else price = pm.offlinePrice;
        sObj.amount = price * sObj.qty;
      } else {
        sObj.amount = 0;
      }
    }
    return sObj;
  });
  const offlineSales = await OfflineSale.find({ date: { $gte: startDate, $lte: endDate } });
  const returns = await Return.find({ date: { $gte: startDate, $lte: endDate } });

  // 3. Initialize Accumulators
  let totalRevenue = 0;
  let totalProductCost = 0;
  let totalReturnsValue = 0;
  let totalUnitsSold = 0;
  let totalUnitsReturned = 0;

  const platformStats = {
    amazon: { revenue: 0, productCost: 0, returnsValue: 0, unitsSold: 0, unitsReturned: 0 },
    flipkart: { revenue: 0, productCost: 0, returnsValue: 0, unitsSold: 0, unitsReturned: 0 },
    meesho: { revenue: 0, productCost: 0, returnsValue: 0, unitsSold: 0, unitsReturned: 0 },
    offline: { revenue: 0, productCost: 0, returnsValue: 0, unitsSold: 0, unitsReturned: 0 },
  };

  const productStats = {};

  const getProductAccumulator = (productId, productName) => {
    if (!productStats[productId]) {
      productStats[productId] = {
        id: productId,
        name: productName || prodMap[productId]?.name || 'Unknown Product',
        soldQty: 0,
        revenue: 0,
        productCost: 0,
        returnsValue: 0,
      };
    }
    return productStats[productId];
  };

  // 4. Process Online Sales
  onlineSales.forEach(s => {
    const cost = getProductCost(s.productId) * s.qty;
    const rev = s.amount || 0;
    
    totalRevenue += rev;
    totalProductCost += cost;
    totalUnitsSold += s.qty;

    const plat = s.platform ? s.platform.toLowerCase() : 'amazon';
    if (platformStats[plat]) {
      platformStats[plat].revenue += rev;
      platformStats[plat].productCost += cost;
      platformStats[plat].unitsSold += s.qty;
    }

    const pStat = getProductAccumulator(s.productId, s.productName);
    pStat.soldQty += s.qty;
    pStat.revenue += rev;
    pStat.productCost += cost;
  });

  // 5. Process Offline Sales
  offlineSales.forEach(s => {
    const items = s.items || [];
    items.forEach(item => {
      const cost = getProductCost(item.productId) * item.qty;
      const rev = item.amount || 0;

      totalRevenue += rev;
      totalProductCost += cost;
      totalUnitsSold += item.qty;

      platformStats.offline.revenue += rev;
      platformStats.offline.productCost += cost;
      platformStats.offline.unitsSold += item.qty;

      const pStat = getProductAccumulator(item.productId, item.productName);
      pStat.soldQty += item.qty;
      pStat.revenue += rev;
      pStat.productCost += cost;
    });
  });

  // 6. Process Returns
  returns.forEach(r => {
    const val = getReturnPrice(r.productId, r.platform) * r.qty;
    totalReturnsValue += val;
    totalUnitsReturned += r.qty;

    const plat = r.platform ? r.platform.toLowerCase() : 'offline';
    const platKey = plat === 'shop' ? 'offline' : plat;
    if (platformStats[platKey]) {
      platformStats[platKey].returnsValue += val;
      platformStats[platKey].unitsReturned += r.qty;
    }

    const pStat = getProductAccumulator(r.productId, r.productName);
    pStat.returnsValue += val;
  });

  // 7. Calculate final gross / net profits
  const grossProfit = totalRevenue - totalProductCost;
  const netProfit = grossProfit - totalReturnsValue;

  const platformFinal = {};
  Object.keys(platformStats).forEach(key => {
    const p = platformStats[key];
    const gp = p.revenue - p.productCost;
    platformFinal[key] = {
      revenue: p.revenue,
      productCost: p.productCost,
      grossProfit: gp,
      returnsValue: p.returnsValue,
      netProfit: gp - p.returnsValue,
      unitsSold: p.unitsSold,
      unitsReturned: p.unitsReturned
    };
  });

  // 8. Product performance lists
  const productArray = Object.values(productStats).map(p => {
    const gp = p.revenue - p.productCost;
    const np = gp - p.returnsValue;
    return {
      ...p,
      grossProfit: gp,
      netProfit: np
    };
  });

  const sortedProducts = [...productArray].sort((a, b) => b.netProfit - a.netProfit);
  const top10 = sortedProducts.slice(0, 10);
  const least10 = [...productArray].sort((a, b) => a.netProfit - b.netProfit).slice(0, 10);

  // 9. Trend calculations (Daily, Weekly, Monthly)
  const dailyData = {};
  const weeklyData = {};
  const monthlyData = {};

  // Initialize dates in the range to show zeros (for cleaner charts)
  const dateList = [];
  let curr = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  
  if (curr <= end && (end - curr) / (1000 * 60 * 60 * 24) < 366) {
    while (curr <= end) {
      const dStr = getSystemLocalDate(curr);
      dateList.push(dStr);
      curr.setDate(curr.getDate() + 1);
    }
  }

  dateList.forEach(d => {
    dailyData[d] = { date: d, revenue: 0, cost: 0, returns: 0, profit: 0 };
  });

  const addToTrends = (date, revenue, cost, returnsVal) => {
    if (!date) return;
    const normalized = normalizeToLocalYYYYMMDD(date);
    
    // Daily
    if (dailyData[normalized]) {
      dailyData[normalized].revenue += revenue;
      dailyData[normalized].cost += cost;
      dailyData[normalized].returns += returnsVal;
      dailyData[normalized].profit += (revenue - cost - returnsVal);
    } else {
      dailyData[normalized] = { date: normalized, revenue, cost, returns: returnsVal, profit: (revenue - cost - returnsVal) };
    }

    // Monthly
    const mKey = normalized.substring(0, 7);
    if (!monthlyData[mKey]) {
      monthlyData[mKey] = { month: mKey, revenue: 0, cost: 0, returns: 0, profit: 0 };
    }
    monthlyData[mKey].revenue += revenue;
    monthlyData[mKey].cost += cost;
    monthlyData[mKey].returns += returnsVal;
    monthlyData[mKey].profit += (revenue - cost - returnsVal);

    // Weekly
    const d = parseLocalDate(normalized);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const wStart = getSystemLocalDate(new Date(d.setDate(diff)));
    if (!weeklyData[wStart]) {
      weeklyData[wStart] = { week: wStart, revenue: 0, cost: 0, returns: 0, profit: 0 };
    }
    weeklyData[wStart].revenue += revenue;
    weeklyData[wStart].cost += cost;
    weeklyData[wStart].returns += returnsVal;
    weeklyData[wStart].profit += (revenue - cost - returnsVal);
  };

  onlineSales.forEach(s => {
    const cost = getProductCost(s.productId) * s.qty;
    addToTrends(s.date, s.amount || 0, cost, 0);
  });

  offlineSales.forEach(s => {
    const items = s.items || [];
    items.forEach(item => {
      const cost = getProductCost(item.productId) * item.qty;
      addToTrends(item.date || s.date, item.amount || 0, cost, 0);
    });
  });

  returns.forEach(r => {
    const val = getReturnPrice(r.productId, r.platform) * r.qty;
    addToTrends(r.date, 0, 0, val);
  });

  const dailyTrend = Object.values(dailyData).sort((a,b) => a.date.localeCompare(b.date));
  const weeklyTrend = Object.values(weeklyData).sort((a,b) => a.week.localeCompare(b.week));
  const monthlyTrend = Object.values(monthlyData).sort((a,b) => a.month.localeCompare(b.month));

  // Calculate inventory statistics (Current stock value, low stock alerts, category share)
  let totalInventoryValue = 0;
  let totalUnitsInStock = 0;
  const categoryValues = {};
  const productValues = [];

  products.forEach(p => {
    const qty = p.availableQty || 0;
    const cost = p.costPrice || 0;
    const val = qty * cost;
    totalInventoryValue += val;
    totalUnitsInStock += qty;

    const cat = p.category || 'General';
    categoryValues[cat] = (categoryValues[cat] || 0) + val;

    productValues.push({
      id: p.id,
      name: p.name,
      qty,
      costPrice: cost,
      value: val
    });
  });

  const lowStockProducts = products
    .filter(p => p.availableQty > 0 && p.availableQty <= 10)
    .map(p => ({ id: p.id, name: p.name, availableQty: p.availableQty }))
    .sort((a, b) => a.availableQty - b.availableQty);

  const outOfStockProducts = products
    .filter(p => p.availableQty === 0)
    .map(p => ({ id: p.id, name: p.name }));

  const highestValueProducts = [...productValues]
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const lowestValueProducts = [...productValues]
    .filter(p => p.qty > 0)
    .sort((a, b) => a.value - b.value)
    .slice(0, 10);

  const byCategory = Object.entries(categoryValues).map(([category, value]) => ({
    category,
    value
  })).sort((a, b) => b.value - a.value);

  const byProduct = highestValueProducts.map(p => ({
    name: p.name,
    value: p.value
  }));

  const inventoryStats = {
    summary: {
      totalProducts: products.length,
      totalUnits: totalUnitsInStock,
      totalValue: totalInventoryValue
    },
    lowStock: lowStockProducts,
    outOfStock: outOfStockProducts,
    rankings: {
      highest: highestValueProducts,
      lowest: lowestValueProducts
    },
    distribution: {
      byCategory,
      byProduct
    }
  };

  res.json({
    overview: {
      revenue: totalRevenue,
      productCost: totalProductCost,
      grossProfit,
      returnsValue: totalReturnsValue,
      netProfit,
      unitsSold: totalUnitsSold,
      unitsReturned: totalUnitsReturned,
      returnPercentage: totalUnitsSold > 0 ? ((totalUnitsReturned / totalUnitsSold) * 100) : 0
    },
    platforms: platformFinal,
    products: {
      top10,
      least10
    },
    trends: {
      daily: dailyTrend,
      weekly: weeklyTrend,
      monthly: monthlyTrend
    },
    inventory: inventoryStats
  });
}));

// DASHBOARD STATS
app.get('/api/stats', catchAsync(async (_req, res) => {
  const today = normalizeToLocalYYYYMMDD(new Date());
  const systemDateStr = new Date().toISOString();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown';
  const offset = new Date().getTimezoneOffset();
  
  const products = await Product.find({});
  const onlineSalesRaw = await OnlineSale.find({});
  const offlineSales = await OfflineSale.find({});
  const returns = await Return.find({});

  // Product cache map
  const prodMap = {};
  products.forEach(p => {
    prodMap[p.id] = {
      costPrice: p.costPrice || 0,
      name: p.name,
      availableQty: p.availableQty || 0,
      amazonPrice: p.amazonPrice !== undefined ? p.amazonPrice : (p.onlinePrice || p.unitPrice || 0),
      flipkartPrice: p.flipkartPrice !== undefined ? p.flipkartPrice : (p.onlinePrice || p.unitPrice || 0),
      meeshoPrice: p.meeshoPrice !== undefined ? p.meeshoPrice : (p.onlinePrice || p.unitPrice || 0),
      offlinePrice: p.offlinePrice || p.unitPrice || 0
    };
  });

  const getCost = (productId) => prodMap[productId]?.costPrice || 0;

  // Inventory value
  let inventoryValue = 0;
  let totalUnitsInStock = 0;
  products.forEach(p => {
    inventoryValue += (p.availableQty || 0) * (p.costPrice || 0);
    totalUnitsInStock += (p.availableQty || 0);
  });

  // Map onlineSales to handle fallback pricing
  const onlineSales = onlineSalesRaw.map(s => {
    const sObj = s.toObject();
    if (!sObj.amount || sObj.amount <= 0) {
      const pm = prodMap[sObj.productId];
      if (pm) {
        const plat = sObj.platform ? sObj.platform.toLowerCase() : '';
        let price = 0;
        if (plat === 'amazon') price = pm.amazonPrice;
        else if (plat === 'flipkart') price = pm.flipkartPrice;
        else if (plat === 'meesho') price = pm.meeshoPrice;
        else price = pm.offlinePrice;
        sObj.amount = price * sObj.qty;
      } else {
        sObj.amount = 0;
      }
    }
    return sObj;
  });

  // Today's Sales and Profit
  let todayOnlineSales = 0;
  let todayOnlineCost = 0;
  onlineSales.forEach(s => {
    const saleDateNormalized = normalizeToLocalYYYYMMDD(s.date);
    const match = saleDateNormalized === today;
    console.log(`[DEBUG ONLINE] System Date: ${systemDateStr}, Timezone: ${tz} (Offset: ${offset}m), Sale Date: ${s.date}, Normalized: ${saleDateNormalized}, Today: ${today}, Match: ${match}`);
    if (match) {
      todayOnlineSales += s.amount || 0;
      todayOnlineCost += getCost(s.productId) * s.qty;
    }
  });

  let todayOfflineSales = 0;
  let todayOfflineCost = 0;
  offlineSales.forEach(s => {
    const items = s.items || [];
    if (items.length > 0) {
      items.forEach(item => {
        const itemDateNormalized = normalizeToLocalYYYYMMDD(item.date || s.date);
        const match = itemDateNormalized === today;
        console.log(`[DEBUG OFFLINE ITEM] System Date: ${systemDateStr}, Timezone: ${tz} (Offset: ${offset}m), Item Date: ${item.date || s.date}, Normalized: ${itemDateNormalized}, Today: ${today}, Match: ${match}`);
        if (match) {
          todayOfflineSales += item.amount || 0;
          todayOfflineCost += getCost(item.productId) * item.qty;
        }
      });
    } else {
      const saleDateNormalized = normalizeToLocalYYYYMMDD(s.date);
      const match = saleDateNormalized === today;
      console.log(`[DEBUG OFFLINE LEGACY] System Date: ${systemDateStr}, Timezone: ${tz} (Offset: ${offset}m), Sale Date: ${s.date}, Normalized: ${saleDateNormalized}, Today: ${today}, Match: ${match}`);
      if (match) {
        todayOfflineSales += s.totalAmount || 0;
        todayOfflineCost += getCost(s.productId) * s.qty;
      }
    }
  });

  const todaySales = todayOnlineSales + todayOfflineSales;
  const todayCost = todayOnlineCost + todayOfflineCost;
  const todayProfit = todaySales - todayCost;

  // Totals
  const onlineRevenueTotal = onlineSales.reduce((s, x) => s + (x.amount || 0), 0);
  const offlineRevenueTotal = offlineSales.reduce((s, x) => s + (x.totalAmount || 0), 0);
  const pendingPayments = offlineSales.reduce((s, x) => s + (x.amountLeft || 0), 0);

  // Best Selling Product & Top 5 Products
  const productQuantities = {};
  const updateProductQty = (name, qty) => {
    if (!name) return;
    productQuantities[name] = (productQuantities[name] || 0) + qty;
  };

  onlineSales.forEach(s => updateProductQty(s.productName, s.qty));
  offlineSales.forEach(s => (s.items || []).forEach(item => updateProductQty(item.productName, item.qty)));

  const productQtyList = Object.entries(productQuantities).map(([name, qty]) => ({ name, qty }));
  const sortedProductQty = [...productQtyList].sort((a, b) => b.qty - a.qty);
  
  const bestSellingProduct = sortedProductQty[0]?.name || 'No Sales Yet';
  const top5SellingProducts = sortedProductQty.slice(0, 5);

  // Biggest Pending Customer
  const customerPending = {};
  offlineSales.forEach(s => {
    if (s.amountLeft > 0 && s.buyerName) {
      customerPending[s.buyerName] = (customerPending[s.buyerName] || 0) + s.amountLeft;
    }
  });
  const customerPendingList = Object.entries(customerPending).map(([name, amount]) => ({ name, amount }));
  const sortedCustomerPending = [...customerPendingList].sort((a, b) => b.amount - a.amount);
  const biggestPendingCustomer = sortedCustomerPending[0] || { name: 'None', amount: 0 };

  // Returns Cost (Loss)
  const getReturnPrice = (productId, platform) => {
    const p = products.find(x => x.id === productId);
    if (!p) return 0;
    if (platform === 'amazon') return p.amazonPrice || p.onlinePrice || p.unitPrice || 0;
    if (platform === 'flipkart') return p.flipkartPrice || p.onlinePrice || p.unitPrice || 0;
    if (platform === 'meesho') return p.meeshoPrice || p.onlinePrice || p.unitPrice || 0;
    return p.offlinePrice || p.unitPrice || 0;
  };
  const returnsValue = returns.reduce((sum, r) => sum + (getReturnPrice(r.productId, r.platform) * r.qty), 0);

  // Net Profit
  // Net Profit = (Online Sales + Offline Sales) - Product Cost of Sold Items - Returns Value
  let totalProductCostOfSoldItems = 0;
  onlineSales.forEach(s => {
    totalProductCostOfSoldItems += getCost(s.productId) * s.qty;
  });
  offlineSales.forEach(s => {
    (s.items || []).forEach(item => {
      totalProductCostOfSoldItems += getCost(item.productId) * item.qty;
    });
  });
  const netProfit = (onlineRevenueTotal + offlineRevenueTotal) - totalProductCostOfSoldItems - returnsValue;

  // Sales Trends (Last 30 Days)
  const trendData = {};
  const dateList = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    const dStr = getSystemLocalDate(d);
    dateList.push(dStr);
    trendData[dStr] = { date: dStr, online: 0, offline: 0, combined: 0 };
  }

  onlineSales.forEach(s => {
    const sDate = normalizeToLocalYYYYMMDD(s.date);
    if (trendData[sDate]) {
      trendData[sDate].online += s.amount || 0;
      trendData[sDate].combined += s.amount || 0;
    }
  });

  offlineSales.forEach(s => {
    const items = s.items || [];
    items.forEach(item => {
      const itemDate = normalizeToLocalYYYYMMDD(item.date || s.date);
      if (trendData[itemDate]) {
        trendData[itemDate].offline += item.amount || 0;
        trendData[itemDate].combined += item.amount || 0;
      }
    });
  });

  const dailyTrend = Object.values(trendData).sort((a,b) => a.date.localeCompare(b.date));

  // Business Health Score
  // Base score 100
  let healthScore = 100;
  
  // 1. Stock Levels deduction
  const lowStockCount = products.filter((p) => p.availableQty > 0 && p.availableQty < 20).length;
  const outOfStockCount = products.filter((p) => p.availableQty === 0).length;
  healthScore -= (lowStockCount * 1.5) + (outOfStockCount * 4);

  // 2. Pending Payments deduction
  const totalRevenue = onlineRevenueTotal + offlineRevenueTotal;
  if (totalRevenue > 0) {
    const pendingRatio = pendingPayments / totalRevenue;
    if (pendingRatio > 0.20) healthScore -= 15;
    else if (pendingRatio > 0.10) healthScore -= 10;
    else if (pendingRatio > 0.05) healthScore -= 5;
  }

  // 3. Returns Rate deduction
  const totalSoldUnits = onlineSales.reduce((s, x) => s + x.qty, 0) + offlineSales.reduce((s, x) => s + (x.items || []).reduce((a, i) => a + i.qty, 0), 0);
  const totalReturnedUnits = returns.reduce((s, x) => s + x.qty, 0);
  if (totalSoldUnits > 0) {
    const returnRatio = totalReturnedUnits / totalSoldUnits;
    if (returnRatio > 0.10) healthScore -= 15;
    else if (returnRatio > 0.05) healthScore -= 10;
    else if (returnRatio > 0.02) healthScore -= 5;
  }

  // Bound to [10, 100]
  healthScore = Math.max(10, Math.min(100, Math.round(healthScore)));

  res.json({
    totalProducts: products.length,
    lowStock: lowStockCount,
    outOfStock: outOfStockCount,
    onlineSalesToday: onlineSales.filter((s) => normalizeToLocalYYYYMMDD(s.date) === today).length,
    offlineSalesToday: offlineSales.filter((s) => normalizeToLocalYYYYMMDD(s.date) === today).length,
    onlineRevenueTotal,
    offlineRevenueTotal,
    pendingPayments,
    recentOnline: onlineSales.sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    recentOffline: offlineSales.sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    
    // Redesign properties
    todaySales,
    todayProfit,
    inventoryValue,
    bestSellingProduct,
    biggestPendingCustomer,
    top5SellingProducts,
    returnsValue,
    netProfit,
    healthScore,
    dailyTrend
  });
}));

// ================= DATA IMPORT & EXPORT, BACKUP & RESTORE SYSTEM =================

// Helper synonyms matcher
function getImportRowValue(row, synonyms) {
  const keys = Object.keys(row);
  for (const syn of synonyms) {
    const matchedKey = keys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === syn.toLowerCase().replace(/[^a-z0-9]/g, ''));
    if (matchedKey !== undefined) {
      return row[matchedKey];
    }
  }
  return undefined;
}

// Helper sheet data standardizer
function buildSheetData(type, items) {
  if (type === 'products') {
    return items.map(p => ({
      'Product ID': p.id,
      'Name': p.name,
      'SKU': p.sku || '',
      'Description': p.description || '',
      'Category': p.category || 'General',
      'Total Qty': p.totalQty || 0,
      'Available Qty': p.availableQty || 0,
      'Cost Price': p.costPrice || 0,
      'Unit Price': p.unitPrice || 0,
      'Offline Price': p.offlinePrice || 0,
      'Online Price': p.onlinePrice || 0,
      'Amazon Price': p.amazonPrice || 0,
      'Flipkart Price': p.flipkartPrice || 0,
      'Meesho Price': p.meeshoPrice || 0,
      'Created At': p.createdAt
    }));
  }
  if (type === 'shops') {
    return items.map(s => ({
      'Shop ID': s.id,
      'Shop Name': s.name,
      'Type': s.type || 'shop',
      'Mobile': s.mobile || '',
      'Address': s.address || '',
      'Notes': s.notes || '',
      'Created At': s.createdAt
    }));
  }
  if (type === 'online-sales') {
    return items.map(s => ({
      'Sale ID': s.id,
      'Order ID': s.orderId || '',
      'Product ID': s.productId,
      'Product Name': s.productName,
      'Platform': s.platform,
      'Qty': s.qty,
      'Amount': s.amount,
      'Date': s.date,
      'Notes': s.notes || '',
      'Created At': s.createdAt
    }));
  }
  if (type === 'offline-sales') {
    return items.map(s => ({
      'Sale ID': s.id,
      'Buyer Name': s.buyerName,
      'Items': s.items.map(it => `${it.productName} (x${it.qty}) = ₹${it.amount}`).join('; '),
      'Total Amount': s.totalAmount,
      'GST Invoice': s.gst ? 'Yes' : 'No',
      'Amount Received': s.amountReceived,
      'Outstanding Dues': s.amountLeft,
      'Date': s.date,
      'Notes': s.notes || '',
      'Transactions Log': s.transactions.map(t => `${t.method.toUpperCase()} (₹${t.amount}) on ${t.date}`).join('; '),
      'Created At': s.createdAt
    }));
  }
  if (type === 'returns') {
    return items.map(r => ({
      'Return ID': r.id,
      'Product ID': r.productId,
      'Product Name': r.productName,
      'Qty': r.qty,
      'Platform': r.platform || '',
      'Shop ID': r.shopId || '',
      'Shop Name': r.shopName || '',
      'Action': r.action || 'return',
      'Condition': r.condition,
      'Notes': r.notes || '',
      'Date': r.date,
      'Created At': r.createdAt
    }));
  }
  return [];
}

// PDF Page setup helper
function setupPDFPageDecorations(doc, reportTitle, subtitle) {
  const pageCount = doc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    
    // Header top bar
    doc.rect(0, 0, doc.page.width, 35).fill('#1e293b');
    doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold')
       .text("THE ELITE ELECTROTEK", 30, 12);
    doc.fontSize(8).font('Helvetica')
       .text("INVENTORY MANAGEMENT & BUSINESS DATA EXPORT", 280, 14, { align: 'right' });
       
    // Page Title
    doc.fillColor('#334155').fontSize(14).font('Helvetica-Bold')
       .text(reportTitle.toUpperCase(), 30, 50);
    doc.fontSize(9).font('Helvetica').fillColor('#64748b')
       .text(subtitle, 30, 68);
    doc.moveTo(30, 82).lineTo(doc.page.width - 30, 82).strokeColor('#cbd5e1').stroke();
    
    // Footer
    doc.moveTo(30, doc.page.height - 40).lineTo(doc.page.width - 30, doc.page.height - 40).strokeColor('#e2e8f0').stroke();
    doc.fillColor('#94a3b8').fontSize(8)
       .text("© The Elite Electrotek - Confidential Internal Report", 30, doc.page.height - 32);
    doc.text(`Page ${i + 1} of ${pageCount}`, doc.page.width - 100, doc.page.height - 32, { align: 'right' });
  }
}

// 1. DATA EXPORT API
app.get('/api/export', catchAsync(async (req, res) => {
  const { type, format, rangeType, selectedMonth, startDate, endDate } = req.query;
  
  // Date filtering helper
  const dateFilter = {};
  if (rangeType === 'month' && selectedMonth) {
    dateFilter.date = { $regex: new RegExp('^' + selectedMonth) };
  } else if (rangeType === 'custom' && startDate && endDate) {
    dateFilter.date = { $gte: startDate, $lte: endDate };
  }

  let products = [];
  let shops = [];
  let onlineSales = [];
  let offlineSales = [];
  let returns = [];
  let pendingDues = [];

  if (type === 'products' || type === 'all') {
    products = await Product.find({});
  }
  if (type === 'shops' || type === 'all' || type === 'pending-dues') {
    shops = await Shop.find({});
  }
  if (type === 'online-sales' || type === 'all') {
    onlineSales = await OnlineSale.find(dateFilter);
  }
  if (type === 'offline-sales' || type === 'all' || type === 'pending-dues') {
    offlineSales = await OfflineSale.find(dateFilter);
  }
  if (type === 'returns' || type === 'all') {
    returns = await Return.find(dateFilter);
  }

  // Calculate Pending Dues
  if (type === 'pending-dues' || type === 'all') {
    const salesWithDues = await OfflineSale.find({ amountLeft: { $gt: 0 } });
    const filteredDuesSales = salesWithDues.filter(sale => {
      if (rangeType === 'month' && selectedMonth) {
        return sale.date && sale.date.startsWith(selectedMonth);
      } else if (rangeType === 'custom' && startDate && endDate) {
        return sale.date && sale.date >= startDate && sale.date <= endDate;
      }
      return true;
    });

    const duesMap = {};
    for (const sale of filteredDuesSales) {
      const buyer = sale.buyerName;
      if (!duesMap[buyer]) {
        duesMap[buyer] = { buyerName: buyer, outstandingAmount: 0, salesCount: 0 };
      }
      duesMap[buyer].outstandingAmount += sale.amountLeft;
      duesMap[buyer].salesCount += 1;
    }

    const shopsMap = {};
    shops.forEach(s => { shopsMap[s.name.toLowerCase()] = s; });

    pendingDues = Object.values(duesMap).map(d => {
      const shopObj = shopsMap[d.buyerName.toLowerCase()];
      return {
        'Shop/Customer Name': d.buyerName,
        'Mobile': shopObj ? shopObj.mobile : 'N/A',
        'Address': shopObj ? shopObj.address : 'N/A',
        'Sales Count': d.salesCount,
        'Outstanding Dues': d.outstandingAmount
      };
    });
  }

  const filenameDate = rangeType === 'month' ? selectedMonth : (rangeType === 'custom' ? `${startDate}_to_${endDate}` : 'All_Time');
  const baseFilename = `TEE_${type}_${filenameDate}`.replace(/-/g, '_');

  // EXCEL FORMAT
  if (format === 'xlsx') {
    const wb = xlsx.utils.book_new();
    
    if (type === 'products' || type === 'all') {
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(buildSheetData('products', products)), 'Products');
    }
    if (type === 'shops' || type === 'all') {
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(buildSheetData('shops', shops)), 'Shops');
    }
    if (type === 'online-sales' || type === 'all') {
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(buildSheetData('online-sales', onlineSales)), 'Online Sales');
    }
    if (type === 'offline-sales' || type === 'all') {
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(buildSheetData('offline-sales', offlineSales)), 'Offline Sales');
    }
    if (type === 'returns' || type === 'all') {
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(buildSheetData('returns', returns)), 'Returns');
    }
    if (type === 'pending-dues' || type === 'all') {
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(pendingDues), 'Pending Dues');
    }

    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${baseFilename}.xlsx`);
    return res.send(buffer);
  }

  // CSV FORMAT
  if (format === 'csv') {
    if (type !== 'all') {
      let sheetData = [];
      if (type === 'products') sheetData = buildSheetData('products', products);
      if (type === 'shops') sheetData = buildSheetData('shops', shops);
      if (type === 'online-sales') sheetData = buildSheetData('online-sales', onlineSales);
      if (type === 'offline-sales') sheetData = buildSheetData('offline-sales', offlineSales);
      if (type === 'returns') sheetData = buildSheetData('returns', returns);
      if (type === 'pending-dues') sheetData = pendingDues;

      const ws = xlsx.utils.json_to_sheet(sheetData);
      const csv = xlsx.utils.sheet_to_csv(ws);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${baseFilename}.csv`);
      return res.send(csv);
    } else {
      // Full Backup in CSV: Return a ZIP containing all files
      const zip = new AdmZip();
      
      const collections = [
        { name: 'products.csv', data: buildSheetData('products', products) },
        { name: 'shops.csv', data: buildSheetData('shops', shops) },
        { name: 'online_sales.csv', data: buildSheetData('online-sales', onlineSales) },
        { name: 'offline_sales.csv', data: buildSheetData('offline-sales', offlineSales) },
        { name: 'returns.csv', data: buildSheetData('returns', returns) },
        { name: 'pending_dues.csv', data: pendingDues }
      ];

      for (const col of collections) {
        const ws = xlsx.utils.json_to_sheet(col.data);
        const csv = xlsx.utils.sheet_to_csv(ws);
        zip.addFile(col.name, Buffer.from(csv));
      }

      const buffer = zip.toBuffer();
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename=${baseFilename}_CSVs.zip`);
      return res.send(buffer);
    }
  }

  // PDF REPORT FORMAT
  if (format === 'pdf') {
    const doc = new PDFDocument({ margin: 50, bufferPages: true });
    
    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${baseFilename}.pdf`);
      res.send(pdfData);
    });

    const dateRangeStr = rangeType === 'month' ? `Month: ${selectedMonth}` : (rangeType === 'custom' ? `Range: ${startDate} to ${endDate}` : 'All Time');
    const subtitleText = `Scope: ${dateRangeStr} | Generated: ${new Date().toISOString().split('T')[0]}`;

    // PDF Table Drawer Helper
    const drawTable = (title, headers, colWeights, rows) => {
      doc.fontSize(12).fillColor('#1e293b').font('Helvetica-Bold').text(title).moveDown(0.2);
      
      const startX = 30; // wider width
      let startY = doc.y;
      const printableWidth = doc.page.width - 60;
      const totalWeight = colWeights.reduce((a, b) => a + b, 0);

      // Render Header Row
      doc.rect(startX, startY, printableWidth, 20).fill('#dc2626');
      doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
      
      headers.forEach((h, idx) => {
        let colX = startX;
        for (let k = 0; k < idx; k++) {
          colX += (colWeights[k] / totalWeight) * printableWidth;
        }
        const colW = (colWeights[idx] / totalWeight) * printableWidth;
        doc.text(h, colX + 4, startY + 6, { width: colW - 8, align: 'left', lineBreak: false });
      });

      startY += 20;
      doc.font('Helvetica').fontSize(8).fillColor('#334155');

      rows.forEach((row, rowIndex) => {
        if (startY + 20 > doc.page.height - 60) {
          doc.addPage();
          startY = 95; // leave space for page header
          
          doc.rect(startX, startY, printableWidth, 20).fill('#dc2626');
          doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
          headers.forEach((h, idx) => {
            let colX = startX;
            for (let k = 0; k < idx; k++) {
              colX += (colWeights[k] / totalWeight) * printableWidth;
            }
            const colW = (colWeights[idx] / totalWeight) * printableWidth;
            doc.text(h, colX + 4, startY + 6, { width: colW - 8, align: 'left', lineBreak: false });
          });
          startY += 20;
          doc.font('Helvetica').fontSize(8).fillColor('#334155');
        }

        if (rowIndex % 2 === 1) {
          doc.rect(startX, startY, printableWidth, 16).fill('#f8fafc');
          doc.fillColor('#334155');
        }

        row.forEach((cell, idx) => {
          let colX = startX;
          for (let k = 0; k < idx; k++) {
            colX += (colWeights[k] / totalWeight) * printableWidth;
          }
          const colW = (colWeights[idx] / totalWeight) * printableWidth;
          doc.text(String(cell !== undefined && cell !== null ? cell : ''), colX + 4, startY + 4, { width: colW - 8, align: 'left', lineBreak: false });
        });

        startY += 16;
      });

      doc.moveDown(1.2);
    };

    // Draw PDF Sections
    if (type === 'products' || type === 'all') {
      const rows = products.map(p => [p.sku || 'N/A', p.name.slice(0, 40), p.category, String(p.availableQty), String(p.totalQty), `₹${p.unitPrice}`, `₹${p.costPrice}`]);
      drawTable('Products List', ['SKU', 'Product Name', 'Category', 'Avail', 'Total', 'S.Price', 'Cost'], [1.5, 3, 2, 0.8, 0.8, 1, 1], rows);
    }
    
    if (type === 'shops' || type === 'all') {
      if (type === 'all') doc.addPage();
      const rows = shops.map(s => [s.name, s.type, s.mobile || 'N/A', (s.address || 'N/A').slice(0, 50)]);
      drawTable('Shops Ledger', ['Shop Name', 'Type', 'Mobile', 'Address'], [2.5, 1.2, 1.8, 3.5], rows);
    }

    if (type === 'online-sales' || type === 'all') {
      if (type === 'all') doc.addPage();
      const rows = onlineSales.map(s => [s.date, (s.orderId || 'N/A').slice(0, 18), s.productName.slice(0, 30), s.platform, String(s.qty), `₹${s.amount}`]);
      drawTable('Online Sales History', ['Date', 'Order ID', 'Product Name', 'Platform', 'Qty', 'Amount'], [1.2, 1.8, 2.5, 1.2, 0.8, 1.2], rows);
    }

    if (type === 'offline-sales' || type === 'all') {
      if (type === 'all') doc.addPage();
      const rows = offlineSales.map(s => [
        s.date,
        s.buyerName.slice(0, 25),
        s.items.map(it => `${it.productName} (x${it.qty})`).join(', ').slice(0, 45) + (s.items.length > 2 ? '...' : ''),
        `₹${s.totalAmount}`,
        `₹${s.amountLeft}`
      ]);
      drawTable('Offline Sales Invoices', ['Date', 'Buyer Name', 'Items Summary', 'Total Amount', 'Outstanding Dues'], [1.2, 2.2, 3.5, 1.2, 1.2], rows);
    }

    if (type === 'returns' || type === 'all') {
      if (type === 'all') doc.addPage();
      const rows = returns.map(r => [r.date, r.productName.slice(0, 40), r.condition, r.shopName || r.platform || 'N/A', String(r.qty)]);
      drawTable('Product Returns Log', ['Date', 'Product Name', 'Condition', 'Source', 'Qty'], [1.2, 3, 1.5, 2, 0.8], rows);
    }

    if (type === 'pending-dues' || type === 'all') {
      if (type === 'all') doc.addPage();
      const rows = pendingDues.map(d => [d['Shop/Customer Name'], d['Mobile'], d['Address'].slice(0, 45), String(d['Sales Count']), `₹${d['Outstanding Dues']}`]);
      drawTable('Outstanding Payments Ledger', ['Shop Name', 'Mobile', 'Address', 'Invoices', 'Dues Amount'], [2.5, 1.5, 3.5, 1, 1.5], rows);
    }

    setupPDFPageDecorations(doc, type === 'all' ? 'Full Business Ledger' : `${type.replace('-', ' ')} Report`, subtitleText);
    
    doc.end();
  }
}));

// 2. DATA IMPORT PREVIEW API
app.post('/api/import/preview', catchAsync(async (req, res) => {
  const { fileBase64, type } = req.body;
  if (!fileBase64 || !type) {
    return res.status(400).json({ message: 'Missing file data or import type' });
  }

  const buffer = Buffer.from(fileBase64, 'base64');
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawData = xlsx.utils.sheet_to_json(sheet);

  if (rawData.length === 0) {
    return res.status(400).json({ message: 'Spreadsheet has no data records.' });
  }

  const dbProducts = await Product.find({});
  const dbShops = await Shop.find({});
  
  const parsedRows = [];
  const headers = Object.keys(rawData[0]);
  let isValid = true;

  for (let idx = 0; idx < rawData.length; idx++) {
    const rawRow = rawData[idx];
    const errors = [];
    const warnings = [];
    let isDuplicate = false;
    let mappedData = {};

    if (type === 'products') {
      const name = getImportRowValue(rawRow, ['name', 'productname', 'title']);
      const sku = getImportRowValue(rawRow, ['sku', 'productsku', 'itemcode', 'code']) || '';
      const category = getImportRowValue(rawRow, ['category', 'cat', 'group']) || 'General';
      const description = getImportRowValue(rawRow, ['description', 'desc', 'details']) || '';
      const totalQty = Number(getImportRowValue(rawRow, ['totalqty', 'qty', 'quantity', 'stock']) || 0);
      const availableQty = Number(getImportRowValue(rawRow, ['availableqty', 'qty', 'quantity', 'availstock']) || totalQty);
      
      const costPrice = Number(getImportRowValue(rawRow, ['costprice', 'cost', 'purchaseprice']) || 0);
      const unitPrice = Number(getImportRowValue(rawRow, ['unitprice', 'price', 'rate', 'sellingprice']) || 0);
      const offlinePrice = Number(getImportRowValue(rawRow, ['offlineprice', 'wholesaleprice']) || unitPrice);
      const onlinePrice = Number(getImportRowValue(rawRow, ['onlineprice', 'retailprice']) || unitPrice);

      if (!name) {
        errors.push('Product Name is required.');
      }
      if (isNaN(totalQty) || totalQty < 0) {
        errors.push('Quantity must be a positive number.');
      }
      if (unitPrice < 0 || costPrice < 0) {
        errors.push('Prices cannot be negative.');
      }

      // Check Duplicates in database
      const existsInDb = dbProducts.find(p => p.name.toLowerCase() === String(name).toLowerCase() || (sku && p.sku && p.sku.toLowerCase() === String(sku).toLowerCase()));
      if (existsInDb) {
        isDuplicate = true;
        warnings.push(`Matches existing product "${existsInDb.name}" (SKU: ${existsInDb.sku || 'N/A'}) - it will be overwritten.`);
      }

      // Check Duplicates in uploaded file itself
      const existsInFile = parsedRows.find(r => r.data.name?.toLowerCase() === String(name).toLowerCase() || (sku && r.data.sku && r.data.sku?.toLowerCase() === String(sku).toLowerCase()));
      if (existsInFile) {
        isDuplicate = true;
        errors.push('Duplicate entry inside the same spreadsheet.');
      }

      mappedData = { name, sku, category, description, totalQty, availableQty, costPrice, unitPrice, offlinePrice, onlinePrice };
    }

    else if (type === 'shops') {
      const name = getImportRowValue(rawRow, ['name', 'shopname', 'customername']);
      const mobile = getImportRowValue(rawRow, ['mobile', 'phone', 'contact']) || '';
      const address = getImportRowValue(rawRow, ['address', 'location']) || '';
      const shopType = getImportRowValue(rawRow, ['type', 'customertype', 'shoptype']) || 'shop';
      const notes = getImportRowValue(rawRow, ['notes', 'note', 'remarks']) || '';

      if (!name) {
        errors.push('Shop/Customer Name is required.');
      }

      // Check Duplicates in DB
      const existsInDb = dbShops.find(s => s.name.toLowerCase() === String(name).toLowerCase());
      if (existsInDb) {
        isDuplicate = true;
        warnings.push(`Matches existing shop ledger "${existsInDb.name}" - it will be updated.`);
      }

      // Check Duplicates in file
      const existsInFile = parsedRows.find(r => r.data.name?.toLowerCase() === String(name).toLowerCase());
      if (existsInFile) {
        isDuplicate = true;
        errors.push('Duplicate customer name inside this spreadsheet.');
      }

      mappedData = { name, mobile, address, type: shopType, notes };
    }

    else if (type === 'price-lists') {
      const sku = getImportRowValue(rawRow, ['sku', 'productsku', 'itemcode', 'code']);
      const name = getImportRowValue(rawRow, ['name', 'productname', 'title']);
      
      const costPrice = getImportRowValue(rawRow, ['costprice', 'cost']);
      const unitPrice = getImportRowValue(rawRow, ['unitprice', 'price']);
      const offlinePrice = getImportRowValue(rawRow, ['offlineprice', 'wholesaleprice']);
      const onlinePrice = getImportRowValue(rawRow, ['onlineprice', 'retailprice']);

      if (!sku && !name) {
        errors.push('Must provide either Product SKU or Product Name to match.');
      }
      
      // Match database item
      const dbProduct = dbProducts.find(p => (sku && p.sku && p.sku.toLowerCase() === String(sku).toLowerCase()) || (name && p.name.toLowerCase() === String(name).toLowerCase()));
      
      if (!dbProduct) {
        errors.push(`Reference Error: No matching product found in system database.`);
      } else {
        mappedData = {
          id: dbProduct.id,
          name: dbProduct.name,
          sku: dbProduct.sku,
          costPrice: costPrice !== undefined ? Number(costPrice) : dbProduct.costPrice,
          unitPrice: unitPrice !== undefined ? Number(unitPrice) : dbProduct.unitPrice,
          offlinePrice: offlinePrice !== undefined ? Number(offlinePrice) : dbProduct.offlinePrice,
          onlinePrice: onlinePrice !== undefined ? Number(onlinePrice) : dbProduct.onlinePrice
        };
      }
    }

    else if (type === 'inventory-stock') {
      const sku = getImportRowValue(rawRow, ['sku', 'productsku', 'code']);
      const name = getImportRowValue(rawRow, ['name', 'productname']);
      const quantity = getImportRowValue(rawRow, ['qty', 'quantity', 'stock', 'availableqty']);

      if (!sku && !name) {
        errors.push('Must provide either SKU or Product Name to match.');
      }
      if (quantity === undefined || isNaN(Number(quantity))) {
        errors.push('A valid numeric stock quantity is required.');
      }

      const dbProduct = dbProducts.find(p => (sku && p.sku && p.sku.toLowerCase() === String(sku).toLowerCase()) || (name && p.name.toLowerCase() === String(name).toLowerCase()));
      
      if (!dbProduct) {
        errors.push(`Reference Error: No matching product found in database.`);
      } else {
        mappedData = {
          id: dbProduct.id,
          name: dbProduct.name,
          sku: dbProduct.sku,
          newQty: Number(quantity)
        };
      }
    }

    if (errors.length > 0) {
      isValid = false;
    }

    parsedRows.push({
      index: idx + 1,
      data: mappedData,
      raw: rawRow,
      errors,
      warnings,
      isDuplicate
    });
  }

  res.json({ headers, rows: parsedRows, isValid });
}));

// 3. DATA IMPORT CONFIRM API
app.post('/api/import/confirm', catchAsync(async (req, res) => {
  const { type, records } = req.body;
  if (!type || !records || !Array.isArray(records)) {
    return res.status(400).json({ message: 'Invalid confirm parameters' });
  }

  let successCount = 0;

  if (type === 'products') {
    for (const r of records) {
      // Find matching item in DB
      let existing = null;
      if (r.sku) {
        existing = await Product.findOne({
          $or: [
            { name: { $regex: new RegExp('^' + r.name + '$', 'i') } },
            { sku: { $regex: new RegExp('^' + r.sku + '$', 'i') } }
          ]
        });
      } else {
        existing = await Product.findOne({ name: { $regex: new RegExp('^' + r.name + '$', 'i') } });
      }

      if (existing) {
        existing.category = r.category || existing.category;
        existing.description = r.description || existing.description;
        existing.totalQty = r.totalQty !== undefined ? r.totalQty : existing.totalQty;
        existing.availableQty = r.availableQty !== undefined ? r.availableQty : existing.availableQty;
        existing.costPrice = r.costPrice !== undefined ? r.costPrice : existing.costPrice;
        existing.unitPrice = r.unitPrice !== undefined ? r.unitPrice : existing.unitPrice;
        existing.offlinePrice = r.offlinePrice !== undefined ? r.offlinePrice : existing.offlinePrice;
        existing.onlinePrice = r.onlinePrice !== undefined ? r.onlinePrice : existing.onlinePrice;
        existing.updatedAt = new Date().toISOString();
        await existing.save();
      } else {
        const newProduct = new Product({
          id: uuidv4(),
          name: r.name,
          sku: r.sku || '',
          category: r.category || 'General',
          description: r.description || '',
          totalQty: r.totalQty || 0,
          availableQty: r.availableQty !== undefined ? r.availableQty : (r.totalQty || 0),
          costPrice: r.costPrice || 0,
          unitPrice: r.unitPrice || 0,
          offlinePrice: r.offlinePrice || r.unitPrice || 0,
          onlinePrice: r.onlinePrice || r.unitPrice || 0
        });
        await newProduct.save();
      }
      successCount++;
    }
  }

  else if (type === 'shops') {
    for (const r of records) {
      const existing = await Shop.findOne({ name: { $regex: new RegExp('^' + r.name + '$', 'i') } });
      if (existing) {
        existing.mobile = r.mobile || existing.mobile;
        existing.address = r.address || existing.address;
        existing.type = r.type || existing.type;
        existing.notes = r.notes || existing.notes;
        existing.updatedAt = new Date().toISOString();
        await existing.save();
      } else {
        const newShop = new Shop({
          id: uuidv4(),
          name: r.name,
          mobile: r.mobile || '',
          address: r.address || '',
          type: r.type || 'shop',
          notes: r.notes || ''
        });
        await newShop.save();
      }
      successCount++;
    }
  }

  else if (type === 'price-lists') {
    for (const r of records) {
      const match = await Product.findOne({ id: r.id });
      if (match) {
        match.costPrice = r.costPrice !== undefined ? r.costPrice : match.costPrice;
        match.unitPrice = r.unitPrice !== undefined ? r.unitPrice : match.unitPrice;
        match.offlinePrice = r.offlinePrice !== undefined ? r.offlinePrice : match.offlinePrice;
        match.onlinePrice = r.onlinePrice !== undefined ? r.onlinePrice : match.onlinePrice;
        match.updatedAt = new Date().toISOString();
        await match.save();
        successCount++;
      }
    }
  }

  else if (type === 'inventory-stock') {
    for (const r of records) {
      const match = await Product.findOne({ id: r.id });
      if (match) {
        const qtyDiff = r.newQty - match.totalQty;
        match.totalQty = r.newQty;
        match.availableQty = Math.max(0, match.availableQty + qtyDiff);
        match.updatedAt = new Date().toISOString();
        await match.save();
        successCount++;
      }
    }
  }

  res.json({ success: true, count: successCount });
}));

// 4. DOWNLOAD FULL BACKUP ZIP API
app.get('/api/backup/download', catchAsync(async (req, res) => {
  const products = await Product.find({});
  const onlineSales = await OnlineSale.find({});
  const offlineSales = await OfflineSale.find({});
  const shops = await Shop.find({});
  const returns = await Return.find({});
  const settings = await Setting.find({});

  const zip = new AdmZip();
  zip.addFile('products.json', Buffer.from(JSON.stringify(products, null, 2)));
  zip.addFile('online_sales.json', Buffer.from(JSON.stringify(onlineSales, null, 2)));
  zip.addFile('offline_sales.json', Buffer.from(JSON.stringify(offlineSales, null, 2)));
  zip.addFile('shops.json', Buffer.from(JSON.stringify(shops, null, 2)));
  zip.addFile('returns.json', Buffer.from(JSON.stringify(returns, null, 2)));
  zip.addFile('settings.json', Buffer.from(JSON.stringify(settings, null, 2)));

  const systemDateStr = new Date().toISOString().split('T')[0].replace(/-/g, '_');
  const filename = `TEE_Backup_${systemDateStr}.zip`;
  const buffer = zip.toBuffer();

  // Save metadata log
  await Setting.findOneAndUpdate(
    { key: 'last_backup' },
    { value: { date: new Date().toISOString(), size: buffer.length } },
    { upsert: true, new: true }
  );

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  res.send(buffer);
}));

// 5. GET LAST BACKUP STATUS API
app.get('/api/backup/status', catchAsync(async (req, res) => {
  const log = await Setting.findOne({ key: 'last_backup' });
  if (log) {
    return res.json({
      lastBackupDate: log.value.date,
      backupSize: log.value.size
    });
  }
  res.json({ lastBackupDate: null, backupSize: null });
}));

// 6. RESTORE COMPLETE DATABASE FROM ZIP
app.post('/api/backup/restore', catchAsync(async (req, res) => {
  const { zipBase64 } = req.body;
  if (!zipBase64) {
    return res.status(400).json({ message: 'No backup zip file data provided' });
  }

  const buffer = Buffer.from(zipBase64, 'base64');
  const zip = new AdmZip(buffer);
  const files = zip.getEntries().map(e => e.entryName);
  
  const requiredFiles = ['products.json', 'online_sales.json', 'offline_sales.json', 'shops.json', 'returns.json'];
  const missing = requiredFiles.filter(f => !files.includes(f));
  if (missing.length > 0) {
    return res.status(400).json({ message: `Invalid backup ZIP structure. Missing files: ${missing.join(', ')}` });
  }

  try {
    const products = JSON.parse(zip.readAsText('products.json'));
    const onlineSales = JSON.parse(zip.readAsText('online_sales.json'));
    const offlineSales = JSON.parse(zip.readAsText('offline_sales.json'));
    const shops = JSON.parse(zip.readAsText('shops.json'));
    const returns = JSON.parse(zip.readAsText('returns.json'));
    
    let settings = [];
    if (files.includes('settings.json')) {
      settings = JSON.parse(zip.readAsText('settings.json'));
    }

    // Overwrite database collections safely
    await Product.deleteMany({});
    if (products.length > 0) await Product.insertMany(products);

    await OnlineSale.deleteMany({});
    if (onlineSales.length > 0) await OnlineSale.insertMany(onlineSales);

    await OfflineSale.deleteMany({});
    if (offlineSales.length > 0) await OfflineSale.insertMany(offlineSales);

    await Shop.deleteMany({});
    if (shops.length > 0) await Shop.insertMany(shops);

    await Return.deleteMany({});
    if (returns.length > 0) await Return.insertMany(returns);

    if (settings.length > 0) {
      await Setting.deleteMany({});
      await Setting.insertMany(settings);
    }

    res.json({ success: true, message: 'Database successfully restored from backup file.' });
  } catch (err) {
    console.error('RESTORE ERROR:', err);
    res.status(500).json({ message: `Restore failed: ${err.message}` });
  }
}));

app.get("/", (req, res) => {
  res.json({
    status: "Backend Running",
    port: 3001
  });
});

const PORT = process.env.PORT || 3001;

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('SERVER ERROR:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

app.listen(PORT, () => console.log(`Inventory API running at http://localhost:${PORT}`));
