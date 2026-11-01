import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ISupplier extends Document {
  _id: Types.ObjectId;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  outstandingPayable: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SupplierSchema = new Schema<ISupplier>(
  {
    name: {
      type: String,
      required: [true, 'Supplier name is required'],
      trim: true
    },
    contactPerson: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    address: {
      type: String,
      trim: true
    },
    notes: {
      type: String,
      trim: true
    },
    outstandingPayable: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
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

SupplierSchema.index({ name: 'text', phone: 'text' });

export const Supplier = mongoose.model<ISupplier>('Supplier', SupplierSchema);
