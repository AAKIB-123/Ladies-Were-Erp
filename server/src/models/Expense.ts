import mongoose, { Document, Schema, Types } from 'mongoose';

export type ExpenseCategory =
  | 'Rent'
  | 'Transport'
  | 'Packaging'
  | 'Electricity'
  | 'Staff Salary'
  | 'Shop Supplies'
  | 'Repairs'
  | 'Marketing'
  | 'Other';

export interface IExpense extends Document {
  _id: Types.ObjectId;
  expenseDate: Date;
  category: ExpenseCategory;
  amount: number;
  locationId?: Types.ObjectId; // Nullable for shared/consolidated business expenses
  paymentMethod: 'cash' | 'upi' | 'bank_transfer';
  description: string;
  receiptNumber?: string;
  createdBy: Types.ObjectId;
  isVoided: boolean;
  voidReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    expenseDate: {
      type: Date,
      default: Date.now,
      index: true
    },
    category: {
      type: String,
      enum: [
        'Rent',
        'Transport',
        'Packaging',
        'Electricity',
        'Staff Salary',
        'Shop Supplies',
        'Repairs',
        'Marketing',
        'Other'
      ],
      required: true,
      index: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01
    },
    locationId: {
      type: Schema.Types.ObjectId,
      ref: 'Location',
      index: true
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'upi', 'bank_transfer'],
      required: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    receiptNumber: {
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
    voidReason: String
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

ExpenseSchema.index({ locationId: 1, expenseDate: -1 });

export const Expense = mongoose.model<IExpense>('Expense', ExpenseSchema);
