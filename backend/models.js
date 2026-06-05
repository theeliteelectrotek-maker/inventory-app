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
  status: { type: String, default: 'Offline' },
  lastSeen: { type: String, default: () => new Date().toISOString() },
  createdAt: { type: String, default: () => new Date().toISOString() },
  
  // Custom Profile Fields
  avatar: { type: String, default: '' },
  displayName: { type: String, default: '' },
  mobile: { type: String, default: '' },
  alternateMobile: { type: String, default: '' },
  email: { type: String, default: '' },
  dob: { type: String, default: '' },
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  address: { type: String, default: '' },
  bio: { type: String, default: '' },
  emergencyContact: { type: String, default: '' },
  socialLinks: {
    type: {
      linkedin: { type: String, default: '' },
      twitter: { type: String, default: '' },
      github: { type: String, default: '' }
    },
    default: {}
  },
  securityQuestions: {
    type: [{
      question: { type: String },
      answer: { type: String }
    }],
    default: []
  },
  appearance: {
    type: {
      theme: { type: String, default: 'dark' }, // 'dark' | 'light' | 'system'
      sidebar: { type: String, default: 'expanded' }, // 'expanded' | 'compact'
      density: { type: String, default: 'comfortable' }, // 'comfortable' | 'compact'
      accentColor: { type: String, default: 'red' }, // 'red' | 'blue' | 'green' | 'purple'
      fontSize: { type: String, default: 'medium' } // 'small' | 'medium' | 'large'
    },
    default: {
      theme: 'dark',
      sidebar: 'expanded',
      density: 'comfortable',
      accentColor: 'red',
      fontSize: 'medium'
    }
  },
  activeSessions: {
    type: [{
      sessionId: { type: String },
      device: { type: String },
      ip: { type: String },
      lastLogin: { type: String }
    }],
    default: []
  }
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

const returnItemSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  productName: { type: String, required: true },
  sku: { type: String, default: '' },
  category: { type: String, default: 'General' },
  qty: { type: Number, required: true, default: 1 },
  condition: { type: String, required: true },
  reason: { type: String, default: '' },
  notes: { type: String, default: '' }
}, { _id: false });

// Return Model
const returnSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  platform: { type: String, required: true },
  shopId: { type: String },
  shopName: { type: String },
  action: { type: String, default: 'return' },
  date: { type: String, default: () => getSystemLocalDate() },
  notes: { type: String, default: '' },
  items: { type: [returnItemSchema], default: [] },
  
  // Legacy support
  productId: { type: String },
  productName: { type: String },
  qty: { type: Number },
  condition: { type: String },
  
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() }
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

// Replacement Model
const replacementSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  
  // Shop details
  shopId: { type: String, default: '' },
  shopName: { type: String, required: true },
  contactPerson: { type: String, default: '' },
  mobile: { type: String, default: '' },
  cityState: { type: String, default: '' },
  dealerCode: { type: String, default: '' },
  
  // Product details
  productId: { type: String, required: true },
  productName: { type: String, required: true },
  productCategory: { type: String, default: 'General' },
  sku: { type: String, default: '' },
  batchNumber: { type: String, default: '' },
  qty: { type: Number, required: true, default: 1 },
  invoiceNumber: { type: String, default: '' },
  invoiceDate: { type: String, default: '' },
  
  // Reason & Condition
  reason: { type: String, required: true },
  condition: { type: String, required: true },
  
  // Evidence
  productImages: { type: [String], default: [] },
  invoiceCopy: { type: [String], default: [] },
  damageProof: { type: [String], default: [] },
  additionalDocs: { type: [String], default: [] },
  
  // Approval & Processing
  status: { type: String, enum: ['Pending', 'Under Review', 'Approved', 'Rejected', 'Dispatched', 'Completed'], default: 'Pending' },
  approvalRemarks: { type: String, default: '' },
  approvedBy: { type: String, default: '' },
  dispatchDate: { type: String, default: '' },
  trackingNumber: { type: String, default: '' },
  courierPartner: { type: String, default: '' },
  
  // Financial Details
  productValue: { type: Number, default: 0 },
  replacementCost: { type: Number, default: 0 },
  recoveryAmount: { type: Number, default: 0 },
  netLoss: { type: Number, default: 0 },
  
  // Stock Tracking
  stockAdjusted: { type: Boolean, default: false },
  
  // Metadata
  date: { type: String, default: () => getSystemLocalDate() },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() }
});
const Replacement = mongoose.model('Replacement', replacementSchema);

// ChatChannel Schema
const chatChannelSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['group', 'announcement', 'department'], default: 'group' },
  description: { type: String, default: '' },
  members: { type: [String], default: [] },
  createdBy: { type: String, default: 'system' },
  createdAt: { type: String, default: () => new Date().toISOString() }
});
const ChatChannel = mongoose.model('ChatChannel', chatChannelSchema);

// ChatMessage Schema
const chatMessageSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  channelId: { type: String, required: true },
  senderId: { type: String, required: true },
  senderName: { type: String, required: true },
  senderRole: { type: String, required: true },
  content: { type: String, default: '' },
  attachments: {
    type: [{
      name: { type: String },
      type: { type: String },
      data: { type: String }
    }],
    default: []
  },
  replyTo: { type: String, default: '' },
  edited: { type: Boolean, default: false },
  deleted: { type: Boolean, default: false },
  pinned: { type: Boolean, default: false },
  urgent: { type: Boolean, default: false },
  mentions: { type: [String], default: [] },
  readers: { type: [String], default: [] },
  task: {
    id: { type: String },
    title: { type: String },
    assignedTo: { type: String },
    assignedToName: { type: String },
    status: { type: String, enum: ['Pending', 'In Progress', 'Completed'] },
    history: {
      type: [{
        status: { type: String },
        updatedBy: { type: String },
        time: { type: String }
      }],
      default: []
    }
  },
  createdAt: { type: String, default: () => new Date().toISOString() }
});
const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

// PasswordChangeRequest Model
const passwordChangeRequestSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  employee_id: { type: String, required: true },
  employee_name: { type: String, required: true },
  current_password_hash: { type: String, required: true },
  new_password_hash: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  requested_at: { type: String, default: () => new Date().toISOString() },
  reviewed_at: { type: String, default: '' },
  reviewed_by_admin_id: { type: String, default: '' },
  admin_note: { type: String, default: '' }
}, { collection: 'password_change_requests' });
const PasswordChangeRequest = mongoose.model('PasswordChangeRequest', passwordChangeRequestSchema);

// Supplier Model
const supplierSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  factoryName: { type: String, required: true },
  ownerName: { type: String, required: true },
  mobile: { type: String, required: true },
  gstNumber: { type: String, default: '' },
  address: { type: String, required: true },
  openingGstBalance: { type: Number, default: 0 },
  openingNonGstBalance: { type: Number, default: 0 },
  gstBalance: { type: Number, default: 0 },
  nonGstBalance: { type: Number, default: 0 },
  gstAdvance: { type: Number, default: 0 },
  nonGstAdvance: { type: Number, default: 0 },
  archived: { type: Boolean, default: false },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() }
});
const Supplier = mongoose.model('Supplier', supplierSchema);

// Purchase Model
const purchaseSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  invoiceNumber: { type: String, required: true },
  purchaseDate: { type: String, default: () => getSystemLocalDate() },
  supplierId: { type: String, required: true },
  supplierName: { type: String, required: true },
  gstType: { type: String, enum: ['GST', 'Non-GST'], default: 'GST' },
  paymentType: { type: String, enum: ['Cash', 'Bank Transfer', 'UPI', 'Credit'], default: 'Credit' },
  dueDate: { type: String, default: '' },
  transportCharges: { type: Number, default: 0 },
  loadingCharges: { type: Number, default: 0 },
  otherExpenses: { type: Number, default: 0 },
  items: {
    type: [{
      productId: { type: String, required: true },
      productName: { type: String, required: true },
      qty: { type: Number, required: true },
      rate: { type: Number, required: true },
      gstPercent: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      amount: { type: Number, required: true }
    }],
    default: []
  },
  subtotal: { type: Number, default: 0 },
  gstAmount: { type: Number, default: 0 },
  expenses: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0 },
  remainingAmount: { type: Number, default: 0 },
  invoiceFile: { type: String, default: '' }, // base64
  invoiceFileName: { type: String, default: '' },
  invoiceFileType: { type: String, default: '' },
  grnStatus: { type: String, enum: ['Pending', 'Partially Received', 'Completed'], default: 'Pending' },
  createdBy: { type: String, default: '' },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() }
});
const Purchase = mongoose.model('Purchase', purchaseSchema);

// GRN Model
const grnSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  purchaseId: { type: String, required: true },
  invoiceNumber: { type: String, required: true },
  arrivalDate: { type: String, default: () => getSystemLocalDate() },
  factoryId: { type: String, required: true },
  factoryName: { type: String, required: true },
  vehicleNumber: { type: String, default: '' },
  driverName: { type: String, default: '' },
  itemsReceived: {
    type: [{
      productId: { type: String, required: true },
      productName: { type: String, required: true },
      qtyOrdered: { type: Number, required: true },
      qtyReceived: { type: Number, default: 0 },
      shortage: { type: Number, default: 0 },
      excess: { type: Number, default: 0 },
      damage: { type: Number, default: 0 }
    }],
    default: []
  },
  status: { type: String, enum: ['Pending', 'Partially Received', 'Completed'], default: 'Pending' },
  notes: { type: String, default: '' },
  createdBy: { type: String, default: '' },
  createdAt: { type: String, default: () => new Date().toISOString() }
});
const GRN = mongoose.model('GRN', grnSchema);

// SupplierPayment Model
const supplierPaymentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  supplierId: { type: String, required: true },
  supplierName: { type: String, required: true },
  date: { type: String, default: () => getSystemLocalDate() },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, default: 'Cash' },
  referenceNumber: { type: String, default: '' },
  category: { type: String, enum: ['GST', 'Non-GST'], default: 'GST', required: true },
  paymentType: { type: String, enum: ['Payment', 'Advance Payment'], default: 'Payment' },
  balanceAfterPayment: { type: Number, default: 0 },
  notes: { type: String, default: '' },
  receiptFile: { type: String, default: '' }, // base64
  receiptFileName: { type: String, default: '' },
  createdBy: { type: String, default: '' },
  createdAt: { type: String, default: () => new Date().toISOString() }
});
const SupplierPayment = mongoose.model('SupplierPayment', supplierPaymentSchema);

// PurchaseAuditLog Model
const purchaseAuditLogSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  action: { type: String, required: true },
  timestamp: { type: String, default: () => new Date().toISOString() },
  details: { type: String, default: '' }
});
const PurchaseAuditLog = mongoose.model('PurchaseAuditLog', purchaseAuditLogSchema);

module.exports = {
  User,
  Product,
  OnlineSale,
  OfflineSale,
  Shop,
  Return,
  Setting,
  AuditLog,
  Replacement,
  ChatChannel,
  ChatMessage,
  PasswordChangeRequest,
  Supplier,
  Purchase,
  GRN,
  SupplierPayment,
  PurchaseAuditLog
};



