import mongoose, { Document, Schema, Types } from 'mongoose';

export type PurchaseStatus = 'draft' | 'posted';
export type PurchasePaymentStatus = 'paid' | 'partial' | 'unpaid';

export interface IPurchaseItem {
  productId: Types.ObjectId;
  variantId: string;
  quantity: number;
  unitCost: number;
  lineDiscount: number;
  lineTotal: number;
}

export interface IPurchase extends Document {
  _id: Types.ObjectId;
  invoiceNumber: string;
  supplierId: Types.ObjectId;
  receivingLocationId: Types.ObjectId;
  purchaseDate: Date;
  items: IPurchaseItem[];
  additionalCosts: number; // Landed costs (freight, duties)
  totalAmount: number;
  amountPaid: number;
  outstandingPayable: number;
  paymentStatus: PurchasePaymentStatus;
  paymentMethod?: string;
  status: PurchaseStatus;
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseItemSchema = new Schema<IPurchaseItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    variantId: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unitCost: {
      type: Number,
      required: true,
      min: 0
    },
    lineDiscount: {
      type: Number,
      default: 0,
      min: 0
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { _id: false }
);

const PurchaseSchema = new Schema<IPurchase>(
  {
    invoiceNumber: {
      type: String,
      required: [true, 'Supplier invoice number is required'],
      trim: true
    },
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
      index: true
    },
    receivingLocationId: {
      type: Schema.Types.ObjectId,
      ref: 'Location',
      required: true,
      index: true
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
      index: true
    },
    items: [PurchaseItemSchema],
    additionalCosts: {
      type: Number,
      default: 0,
      min: 0
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: 0
    },
    outstandingPayable: {
      type: Number,
      required: true,
      default: 0
    },
    paymentStatus: {
      type: String,
      enum: ['paid', 'partial', 'unpaid'],
      default: 'unpaid'
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank_transfer', 'cheque', 'credit']
    },
    status: {
      type: String,
      enum: ['draft', 'posted'],
      default: 'posted',
      index: true
    },
    notes: {
      type: String,
      trim: true
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret: any) => {
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Prevent accidental duplicate posting of the same dealer invoice number from the same supplier
PurchaseSchema.index({ supplierId: 1, invoiceNumber: 1 }, { unique: true });

export const Purchase = mongoose.model<IPurchase>('Purchase', PurchaseSchema);
