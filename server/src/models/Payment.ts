import mongoose, { Document, Schema, Types } from 'mongoose';

export type PaymentType =
  | 'customer_sale'
  | 'customer_collection'
  | 'supplier_payment'
  | 'customer_refund'
  | 'expense';

export interface IPayment extends Document {
  _id: Types.ObjectId;
  paymentNumber: string;
  paymentType: PaymentType;
  partyType: 'customer' | 'supplier' | 'none';
  partyId?: Types.ObjectId;
  relatedEntityType?: 'Sale' | 'Purchase' | 'Expense' | 'SalesReturn';
  relatedEntityId?: Types.ObjectId;
  locationId?: Types.ObjectId;
  amount: number;
  paymentMethod: 'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'other';
  referenceNumber?: string;
  paymentDate: Date;
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    paymentNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true
    },
    paymentType: {
      type: String,
      enum: [
        'customer_sale',
        'customer_collection',
        'supplier_payment',
        'customer_refund',
        'expense'
      ],
      required: true,
      index: true
    },
    partyType: {
      type: String,
      enum: ['customer', 'supplier', 'none'],
      default: 'none'
    },
    partyId: {
      type: Schema.Types.ObjectId
    },
    relatedEntityType: {
      type: String,
      enum: ['Sale', 'Purchase', 'Expense', 'SalesReturn']
    },
    relatedEntityId: {
      type: Schema.Types.ObjectId
    },
    locationId: {
      type: Schema.Types.ObjectId,
      ref: 'Location'
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'upi', 'bank_transfer', 'cheque', 'other'],
      required: true
    },
    referenceNumber: {
      type: String,
      trim: true
    },
    paymentDate: {
      type: Date,
      default: Date.now,
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

PaymentSchema.index({ partyType: 1, partyId: 1, paymentDate: -1 });

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);
