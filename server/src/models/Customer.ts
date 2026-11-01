import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICustomer extends Document {
  _id: Types.ObjectId;
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
  outstandingBalance: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true
    },
    phone: {
      type: String,
      trim: true,
      index: true
    },
    address: {
      type: String,
      trim: true
    },
    notes: {
      type: String,
      trim: true
    },
    outstandingBalance: {
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

CustomerSchema.index({ name: 'text', phone: 'text' });

export const Customer = mongoose.model<ICustomer>('Customer', CustomerSchema);
