const mongoose = require('mongoose');

// User Model
const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, default: 'user' },
  createdAt: { type: String, default: () => new Date().toISOString() }
});
const User = mongoose.model('User', userSchema);

// Product Model
const productSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  sku: { type: String, default: '' },
  description: { type: String, default: '' },
  totalQty: { type: Number, required: true },
  availableQty: { type: Number, required: true },
  unitPrice: { type: Number, default: 0 },
  offlinePrice: { type: Number, default: 0 },
  onlinePrice: { type: Number, default: 0 },
  category: { type: String, default: 'General' },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() }
});
const Product = mongoose.model('Product', productSchema);

// Online Sale Model
const onlineSaleSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  productId: { type: String, required: true },
  productName: { type: String, required: true },
  platform: { type: String, required: true },
  qty: { type: Number, required: true },
  amount: { type: Number, default: 0 },
  orderId: { type: String, default: '' },
  date: { type: String, default: () => new Date().toISOString().split('T')[0] },
  notes: { type: String, default: '' },
  createdAt: { type: String, default: () => new Date().toISOString() }
});
const OnlineSale = mongoose.model('OnlineSale', onlineSaleSchema);

// Offline Sale Model
const transactionSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  date: { type: String, default: () => new Date().toISOString().split('T')[0] },
  method: { type: String, default: 'cash' },
  notes: { type: String, default: '' }
}, { _id: false });

const offlineItemSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  productName: { type: String, required: true },
  qty: { type: Number, required: true },
  amount: { type: Number, default: 0 },
  date: { type: String, default: () => new Date().toISOString().split('T')[0] }
}, { _id: false });

const offlineSaleSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  buyerName: { type: String, required: true },
  items: { type: [offlineItemSchema], default: [] },
  totalAmount: { type: Number, default: 0 },
  transactions: { type: [transactionSchema], default: [] },
  amountReceived: { type: Number, default: 0 },
  amountLeft: { type: Number, default: 0 },
  date: { type: String, default: () => new Date().toISOString().split('T')[0] },
  notes: { type: String, default: '' },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() }
});
// Handle legacy single-item offline sales transparently via the backend logic rather than the schema
const OfflineSale = mongoose.model('OfflineSale', offlineSaleSchema);

// Shop Model
const shopSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  address: { type: String, default: '' },
  mobile: { type: String, default: '' },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() }
});
const Shop = mongoose.model('Shop', shopSchema);

// Return Model
const returnSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  productId: { type: String, required: true },
  productName: { type: String, required: true },
  platform: { type: String, required: true },
  shopId: { type: String },
  shopName: { type: String },
  action: { type: String, default: 'return' },
  qty: { type: Number, default: 1 },
  date: { type: String, default: () => new Date().toISOString().split('T')[0] },
  condition: { type: String, required: true },
  notes: { type: String, default: '' },
  createdAt: { type: String, default: () => new Date().toISOString() }
});
const Return = mongoose.model('Return', returnSchema);

module.exports = {
  User,
  Product,
  OnlineSale,
  OfflineSale,
  Shop,
  Return
};
