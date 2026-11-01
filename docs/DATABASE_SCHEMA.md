# Database Schema & Data Models Specification

## 1. Overview
The database layer uses MongoDB with Mongoose. All entity relationships use immutable `ObjectId` references. Financial amounts are formatted and stored with exact 2-decimal precision. Soft deactivation is enforced via `isActive: Boolean` flags to maintain historical referential integrity.

---

## 2. Entity Schemas

### 2.1 User
Represents system operators (Admins, Store Owners, Sales Staff).
```typescript
{
  _id: ObjectId,
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'staff'], default: 'staff', required: true },
  assignedLocations: [{ type: ObjectId, ref: 'Location' }], // Admins bypass; Staff strictly limited to these
  phone: { type: String, trim: true },
  isActive: { type: Boolean, default: true, index: true },
  createdAt: Date,
  updatedAt: Date
}
// Indexes: { email: 1 } (unique), { role: 1 }, { isActive: 1 }
```

### 2.2 Location
Represents dynamic retail outlets (Main Shop, Home Shop, Pop-up Stalls, etc.).
```typescript
{
  _id: ObjectId,
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true }, // e.g., 'LOC-MAIN', 'LOC-HOME'
  address: { type: String, trim: true },
  description: { type: String, trim: true },
  isActive: { type: Boolean, default: true, index: true },
  createdAt: Date,
  updatedAt: Date
}
// Indexes: { code: 1 } (unique), { isActive: 1 }
```

### 2.3 Product & Variants
Represents apparel lines (Sarees, Kurtis, Tops, Lehengas) with sizes and colours.
```typescript
// Product Schema
{
  _id: ObjectId,
  sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true, index: true }, // e.g. Sarees, Kurtis, Suits
  description: { type: String, trim: true },
  unit: { type: String, default: 'pcs' },
  defaultPrice: { type: Number, required: true, min: 0 }, // Base default selling price
  currentWeightedAverageCost: { type: Number, default: 0, min: 0 }, // Calculated across all purchases
  isActive: { type: Boolean, default: true, index: true },
  variants: [
    {
      variantId: { type: String, required: true }, // Unique within product: e.g. 'VAR-M-RED'
      size: { type: String, trim: true },         // e.g. 'S', 'M', 'L', 'XL', 'Free Size'
      colour: { type: String, trim: true },       // e.g. 'Red', 'Maroon', 'Navy Blue'
      skuSuffix: { type: String, trim: true },    // e.g. '-M-RED'
      defaultPrice: { type: Number, min: 0 },     // Overrides product defaultPrice if set
      currentCost: { type: Number, default: 0 },  // Variant specific WAC
      isActive: { type: Boolean, default: true }
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
// Indexes: { sku: 1 } (unique), { category: 1 }, { name: 'text', sku: 'text' }
```

### 2.4 Inventory
Tracks current quantity on hand per product variant at each specific location.
```typescript
{
  _id: ObjectId,
  productId: { type: ObjectId, ref: 'Product', required: true, index: true },
  variantId: { type: String, required: true }, // 'default' if no variants
  locationId: { type: ObjectId, ref: 'Location', required: true, index: true },
  quantityOnHand: { type: Number, required: true, default: 0 },
  createdAt: Date,
  updatedAt: Date
}
// Compound Unique Index: { productId: 1, variantId: 1, locationId: 1 } (unique)
```

### 2.5 StockMovement
Immutable ledger recording every single stock increment or decrement.
```typescript
{
  _id: ObjectId,
  productId: { type: ObjectId, ref: 'Product', required: true, index: true },
  variantId: { type: String, required: true },
  locationId: { type: ObjectId, ref: 'Location', required: true, index: true },
  movementType: {
    type: String,
    enum: ['purchase_receipt', 'sale', 'sales_return', 'transfer_out', 'transfer_in', 'damage_loss', 'adjustment'],
    required: true
  },
  quantity: { type: Number, required: true }, // Positive for inwards, negative for outwards
  unitCost: { type: Number, default: 0 },      // Cost valuation at time of movement
  totalCost: { type: Number, default: 0 },
  referenceType: { type: String, enum: ['Sale', 'Purchase', 'StockTransfer', 'SalesReturn', 'Adjustment'] },
  referenceId: { type: ObjectId },
  reason: { type: String, trim: true },
  createdBy: { type: ObjectId, ref: 'User', required: true },
  createdAt: Date
}
// Indexes: { locationId: 1, createdAt: -1 }, { productId: 1, variantId: 1 }
```

### 2.6 StockTransfer
Tracks stock transfers between locations ensuring conservation of stock.
```typescript
{
  _id: ObjectId,
  transferNumber: { type: String, required: true, unique: true }, // e.g. 'TRF-20261015-001'
  sourceLocationId: { type: ObjectId, ref: 'Location', required: true, index: true },
  destinationLocationId: { type: ObjectId, ref: 'Location', required: true, index: true },
  items: [
    {
      productId: { type: ObjectId, ref: 'Product', required: true },
      variantId: { type: String, required: true },
      quantity: { type: Number, required: true, min: 1 },
      unitCost: { type: Number, default: 0 }
    }
  ],
  status: { type: String, enum: ['completed', 'cancelled'], default: 'completed' },
  notes: { type: String, trim: true },
  createdBy: { type: ObjectId, ref: 'User', required: true },
  createdAt: Date,
  updatedAt: Date
}
```

### 2.7 Customer
Represents buyers (walk-in, regular retail, VIP).
```typescript
{
  _id: ObjectId,
  name: { type: String, required: true, trim: true },
  phone: { type: String, trim: true, index: true },
  address: { type: String, trim: true },
  notes: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
  createdAt: Date,
  updatedAt: Date
}
// Text Index: { name: 'text', phone: 'text' }
```

### 2.8 Supplier
Represents fabric manufacturers, wholesalers, and dealers.
```typescript
{
  _id: ObjectId,
  name: { type: String, required: true, trim: true },
  contactPerson: { type: String, trim: true },
  phone: { type: String, trim: true },
  address: { type: String, trim: true },
  notes: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
  createdAt: Date,
  updatedAt: Date
}
```

### 2.9 Sale
Core sales record supporting both Quick Sale and Product-Wise Sale.
```typescript
{
  _id: ObjectId,
  saleNumber: { type: String, required: true, unique: true }, // e.g. 'SAL-20261015-0001'
  locationId: { type: ObjectId, ref: 'Location', required: true, index: true },
  customerId: { type: ObjectId, ref: 'Customer' }, // Optional for walk-in
  customerName: { type: String, trim: true },      // Denormalized for rapid receipt generation
  saleMode: { type: String, enum: ['quick', 'product_wise'], required: true, index: true },
  saleDate: { type: Date, default: Date.now, index: true },
  
  // Product lines (empty for Quick Sale until reconciled)
  items: [
    {
      productId: { type: ObjectId, ref: 'Product', required: true },
      variantId: { type: String, required: true },
      productName: { type: String, required: true },
      size: { type: String },
      colour: { type: String },
      quantity: { type: Number, required: true, min: 1 },
      unitPrice: { type: Number, required: true, min: 0 },
      lineDiscount: { type: Number, default: 0, min: 0 },
      lineTotal: { type: Number, required: true },
      unitCostSnapshot: { type: Number, default: 0 }, // Weighted average cost at sale time
      cogsTotal: { type: Number, default: 0 }
    }
  ],
  
  grossAmount: { type: Number, required: true, min: 0 },
  discountAmount: { type: Number, default: 0, min: 0 },
  netAmount: { type: Number, required: true, min: 0 },
  
  totalCogs: { type: Number, default: 0 }, // 0 for quick sale before reconciliation
  
  // Payment tracking
  paymentMethod: { type: String, enum: ['cash', 'upi', 'bank_transfer', 'credit', 'split'], required: true },
  paymentStatus: { type: String, enum: ['paid', 'partial', 'unpaid'], default: 'paid' },
  amountReceived: { type: Number, required: true, default: 0 },
  outstandingBalance: { type: Number, default: 0 }, // Customer receivable for credit sales
  
  // Quick Sale reconciliation
  isReconciled: { type: Boolean, default: true }, // false for Quick Sale until reconciled
  reconciledAt: Date,
  reconciledBy: { type: ObjectId, ref: 'User' },
  
  notes: { type: String, trim: true },
  createdBy: { type: ObjectId, ref: 'User', required: true },
  isVoided: { type: Boolean, default: false },
  voidReason: { type: String },
  createdAt: Date,
  updatedAt: Date
}
// Indexes: { locationId: 1, saleDate: -1 }, { isReconciled: 1 }, { customerId: 1 }
```

### 2.10 SalesReturn
Controlled return of items against a previously completed sale.
```typescript
{
  _id: ObjectId,
  returnNumber: { type: String, required: true, unique: true },
  saleId: { type: ObjectId, ref: 'Sale', required: true, index: true },
  locationId: { type: ObjectId, ref: 'Location', required: true },
  customerId: { type: ObjectId, ref: 'Customer' },
  returnDate: { type: Date, default: Date.now },
  items: [
    {
      productId: { type: ObjectId, ref: 'Product', required: true },
      variantId: { type: String, required: true },
      quantityReturned: { type: Number, required: true, min: 1 },
      unitPrice: { type: Number, required: true },
      refundAmount: { type: Number, required: true },
      unitCostSnapshot: { type: Number, default: 0 },
      isRestocked: { type: Boolean, default: true } // true = added back to inventory, false = written off as damaged
    }
  ],
  totalRefundAmount: { type: Number, required: true, min: 0 },
  refundMethod: { type: String, enum: ['cash', 'upi', 'store_credit'], required: true },
  reason: { type: String, required: true, trim: true },
  createdBy: { type: ObjectId, ref: 'User', required: true },
  createdAt: Date
}
```

### 2.11 Purchase
Dealer purchase invoice entry for inventory replenishment.
```typescript
{
  _id: ObjectId,
  invoiceNumber: { type: String, required: true, trim: true },
  supplierId: { type: ObjectId, ref: 'Supplier', required: true, index: true },
  receivingLocationId: { type: ObjectId, ref: 'Location', required: true, index: true },
  purchaseDate: { type: Date, default: Date.now, index: true },
  items: [
    {
      productId: { type: ObjectId, ref: 'Product', required: true },
      variantId: { type: String, required: true },
      quantity: { type: Number, required: true, min: 1 },
      unitCost: { type: Number, required: true, min: 0 },
      lineTotal: { type: Number, required: true }
    }
  ],
  additionalCosts: { type: Number, default: 0 }, // Freight, handling, landed fees
  totalAmount: { type: Number, required: true, min: 0 },
  amountPaid: { type: Number, default: 0, min: 0 },
  outstandingPayable: { type: Number, required: true, min: 0 },
  paymentStatus: { type: String, enum: ['paid', 'partial', 'unpaid'], default: 'unpaid' },
  paymentMethod: { type: String, enum: ['cash', 'bank_transfer', 'cheque', 'credit'] },
  status: { type: String, enum: ['draft', 'posted'], default: 'posted' },
  notes: { type: String, trim: true },
  createdBy: { type: ObjectId, ref: 'User', required: true },
  createdAt: Date,
  updatedAt: Date
}
// Unique compound index: { supplierId: 1, invoiceNumber: 1 } (prevents duplicate dealer invoices)
```

### 2.12 Expense
Operating expenses (rent, electricity, salaries, supplies).
```typescript
{
  _id: ObjectId,
  expenseDate: { type: Date, default: Date.now, index: true },
  category: {
    type: String,
    enum: ['Rent', 'Transport', 'Packaging', 'Electricity', 'Staff Salary', 'Shop Supplies', 'Repairs', 'Marketing', 'Other'],
    required: true,
    index: true
  },
  amount: { type: Number, required: true, min: 0.01 },
  locationId: { type: ObjectId, ref: 'Location' }, // Nullable for business-wide shared expenses
  paymentMethod: { type: String, enum: ['cash', 'upi', 'bank_transfer'], required: true },
  description: { type: String, required: true, trim: true },
  receiptNumber: { type: String, trim: true },
  createdBy: { type: ObjectId, ref: 'User', required: true },
  createdAt: Date,
  updatedAt: Date
}
```

### 2.13 Payment
Unified transaction record for cash receipts, customer collections, and supplier payouts.
```typescript
{
  _id: ObjectId,
  paymentNumber: { type: String, required: true, unique: true },
  paymentType: {
    type: String,
    enum: ['customer_sale', 'customer_collection', 'supplier_payment', 'customer_refund', 'expense'],
    required: true,
    index: true
  },
  partyType: { type: String, enum: ['customer', 'supplier', 'none'], default: 'none' },
  partyId: { type: ObjectId },
  relatedEntityType: { type: String, enum: ['Sale', 'Purchase', 'Expense', 'SalesReturn'] },
  relatedEntityId: { type: ObjectId },
  locationId: { type: ObjectId, ref: 'Location' },
  amount: { type: Number, required: true, min: 0.01 },
  paymentMethod: { type: String, enum: ['cash', 'upi', 'bank_transfer', 'cheque', 'other'], required: true },
  referenceNumber: { type: String, trim: true },
  paymentDate: { type: Date, default: Date.now, index: true },
  notes: { type: String, trim: true },
  createdBy: { type: ObjectId, ref: 'User', required: true },
  createdAt: Date
}
```

### 2.14 AuditLog
Tamper-evident record of critical operations.
```typescript
{
  _id: ObjectId,
  userId: { type: ObjectId, ref: 'User', required: true, index: true },
  userName: { type: String, required: true },
  userRole: { type: String, required: true },
  action: { type: String, required: true, index: true },
  entityType: { type: String, required: true, index: true },
  entityId: { type: ObjectId, required: true },
  locationId: { type: ObjectId, ref: 'Location' },
  beforeValues: { type: Object },
  afterValues: { type: Object },
  reason: { type: String },
  ipAddress: { type: String },
  createdAt: { type: Date, default: Date.now, index: true }
}
```
