import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ISalesReturnItem {
  productId: Types.ObjectId;
  variantId: string;
  quantityReturned: number;
  unitPrice: number;
  refundAmount: number;
  unitCostSnapshot: number;
  isRestocked: boolean;
}

export interface ISalesReturn extends Document {
  _id: Types.ObjectId;
  returnNumber: string;
  saleId: Types.ObjectId;
  locationId: Types.ObjectId;
  customerId?: Types.ObjectId;
  returnDate: Date;
  items: ISalesReturnItem[];
  totalRefundAmount: number;
  refundMethod: 'cash' | 'upi' | 'store_credit';
  reason: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
}

const SalesReturnItemSchema = new Schema<ISalesReturnItem>(
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
    quantityReturned: {
      type: Number,
      required: true,
      min: 1
    },
    unitPrice: {
      type: Number,
      required: true
    },
    refundAmount: {
      type: Number,
      required: true
    },
    unitCostSnapshot: {
      type: Number,
      default: 0
    },
    isRestocked: {
      type: Boolean,
      default: true
    }
  },
  { _id: false }
);

const SalesReturnSchema = new Schema<ISalesReturn>(
  {
    returnNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true
    },
    saleId: {
      type: Schema.Types.ObjectId,
      ref: 'Sale',
      required: true,
      index: true
    },
    locationId: {
      type: Schema.Types.ObjectId,
      ref: 'Location',
      required: true
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer'
    },
    returnDate: {
      type: Date,
      default: Date.now,
      index: true
    },
    items: [SalesReturnItemSchema],
    totalRefundAmount: {
      type: Number,
      required: true,
      min: 0
    },
    refundMethod: {
      type: String,
      enum: ['cash', 'upi', 'store_credit'],
      required: true
    },
    reason: {
      type: String,
      required: [true, 'Return reason is required'],
      trim: true
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      virtuals: true,
      transform: (_, ret: any) => {
        delete ret.__v;
        return ret;
      }
    }
  }
);

SalesReturnSchema.index({ saleId: 1, returnDate: -1 });

export const SalesReturn = mongoose.model<ISalesReturn>('SalesReturn', SalesReturnSchema);
