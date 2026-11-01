import mongoose, { Document, Schema, Types } from 'mongoose';

export type SaleMode = 'quick' | 'product_wise';
export type PaymentMethod = 'cash' | 'upi' | 'bank_transfer' | 'credit' | 'mixed';
export type PaymentStatus = 'paid' | 'partial' | 'unpaid';

export interface ISaleItem {
  productId: Types.ObjectId;
  variantId: string;
  productName: string;
  size?: string;
  colour?: string;
  quantity: number;
  unitPrice: number;
  lineDiscount: number;
  lineTotal: number;
  unitCostSnapshot: number;
  cogsTotal: number;
}

export interface ISale extends Document {
  _id: Types.ObjectId;
  saleNumber: string;
  locationId: Types.ObjectId;
  customerId?: Types.ObjectId;
  customerName?: string;
  saleMode: SaleMode;
  saleDate: Date;
  items: ISaleItem[];
  grossAmount: number;
  discountAmount: number;
  netAmount: number;
  totalCogs: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  amountReceived: number;
  outstandingBalance: number;
  isReconciled: boolean;
  reconciledAt?: Date;
  reconciledBy?: Types.ObjectId;
  notes?: string;
  createdBy: Types.ObjectId;
  isVoided: boolean;
  voidReason?: string;
  idempotencyKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SaleItemSchema = new Schema<ISaleItem>(
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
    productName: {
      type: String,
      required: true
    },
    size: String,
    colour: String,
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unitPrice: {
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
      required: true
    },
    unitCostSnapshot: {
      type: Number,
      default: 0,
      min: 0
    },
    cogsTotal: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  { _id: false }
);

const SaleSchema = new Schema<ISale>(
  {
    saleNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true
    },
    locationId: {
      type: Schema.Types.ObjectId,
      ref: 'Location',
      required: true,
      index: true
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer'
    },
    customerName: {
      type: String,
      trim: true
    },
    saleMode: {
      type: String,
      enum: ['quick', 'product_wise'],
      required: true,
      index: true
    },
    saleDate: {
      type: Date,
      default: Date.now,
      index: true
    },
    items: [SaleItemSchema],
    grossAmount: {
      type: Number,
      required: true,
      min: 0
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    netAmount: {
      type: Number,
      required: true,
      min: 0
    },
    totalCogs: {
      type: Number,
      default: 0,
      min: 0
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'upi', 'bank_transfer', 'credit', 'mixed'],
      required: true
    },
    paymentStatus: {
      type: String,
      enum: ['paid', 'partial', 'unpaid'],
      default: 'paid'
    },
    amountReceived: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    outstandingBalance: {
      type: Number,
      default: 0
    },
    isReconciled: {
      type: Boolean,
      default: true,
      index: true
    },
    reconciledAt: Date,
    reconciledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: {
      type: String,
      trim: true
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    isVoided: {
      type: Boolean,
      default: false
    },
    voidReason: String,
    idempotencyKey: {
      type: String,
      sparse: true,
      unique: true
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

SaleSchema.index({ locationId: 1, saleDate: -1 });
SaleSchema.index({ customerId: 1 });

export const Sale = mongoose.model<ISale>('Sale', SaleSchema);
