const mongoose = require('mongoose');

function getSystemLocalDate(d = new Date()) {
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - (offset * 60 * 1000));
  return local.toISOString().split('T')[0];
}

// User Model
const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, default: 'EMPLOYEE' },
  disabled: { type: Boolean, default: false },
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
  costPrice: { type: Number, default: 0 },
  amazonPrice: { type: Number, default: 0 },
  flipkartPrice: { type: Number, default: 0 },
  meeshoPrice: { type: Number, default: 0 },
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
  date: { type: String, default: () => getSystemLocalDate() },
  notes: { type: String, default: '' },
  createdAt: { type: String, default: () => new Date().toISOString() }
});
const OnlineSale = mongoose.model('OnlineSale', onlineSaleSchema);

// Offline Sale Model
const transactionSchema = new mongoose.Schema({
  id: { type: String },
  amount: { type: Number, required: true },
  date: { type: String, default: () => getSystemLocalDate() },
  method: { type: String, default: 'cash' },
  referenceNumber: { type: String, default: '' },
  notes: { type: String, default: '' },
  
  // Cheque details
  chequeNumber: { type: String, default: '' },
  bankName: { type: String, default: '' },
  chequeDate: { type: String, default: '' },
  expectedClearingDate: { type: String, default: '' },
  isPDC: { type: Boolean, default: false },
  chequeStatus: { type: String, default: '' },
  
  // Audit log for cheque/payment
  createdBy: { type: String, default: '' },
  lastUpdatedBy: { type: String, default: '' },
  statusChangedBy: { type: String, default: '' },
  createdDateTime: { type: String, default: '' },
  updatedDateTime: { type: String, default: '' }
}, { _id: false });

const offlineItemSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  productName: { type: String, required: true },
  qty: { type: Number, required: true },
  amount: { type: Number, default: 0 },
  date: { type: String, default: () => getSystemLocalDate() }
}, { _id: false });

const offlineSaleSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  buyerName: { type: String, required: true },
  items: { type: [offlineItemSchema], default: [] },
  totalAmount: { type: Number, default: 0 },
  gst: { type: Boolean, default: false },
  isGSTInvoice: { type: Boolean, default: false },
  invoiceNumber: { type: String, default: '' },
  transactions: { type: [transactionSchema], default: [] },
  corrections: { type: [mongoose.Schema.Types.Mixed], default: [] },
  amountReceived: { type: Number, default: 0 },
  amountLeft: { type: Number, default: 0 },
  date: { type: String, default: () => getSystemLocalDate() },
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
  notes: { type: String, default: '' },
  type: { type: String, enum: ['shop', 'individual', 'walk-in'], default: 'shop' },
  ownerName: { type: String, default: '' },
  gstNumber: { type: String, default: '' },
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
  date: { type: String, default: () => getSystemLocalDate() },
  condition: { type: String, required: true },
  notes: { type: String, default: '' },
  createdAt: { type: String, default: () => new Date().toISOString() }
});
const Return = mongoose.model('Return', returnSchema);

// Setting Model
const settingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true }
}, { timestamps: true });
const Setting = mongoose.model('Setting', settingSchema);

// Audit Log Model
const auditLogSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  user: { type: String, required: true },
  time: { type: String, required: true },
  action: { type: String, required: true }
}, { timestamps: true });
const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = {
  User,
  Product,
  OnlineSale,
  OfflineSale,
  Shop,
  Return,
  Setting,
  AuditLog
};

