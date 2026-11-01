import mongoose, { Document, Schema, Types } from 'mongoose';

export type StockMovementType =
  | 'purchase_receipt'
  | 'sale'
  | 'sales_return'
  | 'transfer_out'
  | 'transfer_in'
  | 'damage_loss'
  | 'adjustment';

export interface IStockMovement extends Document {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  variantId: string;
  locationId: Types.ObjectId;
  movementType: StockMovementType;
  quantity: number; // Positive for inward, negative for outward
  unitCost: number;
  totalCost: number;
  referenceType?: 'Sale' | 'Purchase' | 'StockTransfer' | 'SalesReturn' | 'Adjustment';
  referenceId?: Types.ObjectId;
  reason?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
}

const StockMovementSchema = new Schema<IStockMovement>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true
    },
    variantId: {
      type: String,
      required: true,
      trim: true
    },
    locationId: {
      type: Schema.Types.ObjectId,
      ref: 'Location',
      required: true,
      index: true
    },
    movementType: {
      type: String,
      enum: [
        'purchase_receipt',
        'sale',
        'sales_return',
        'transfer_out',
        'transfer_in',
        'damage_loss',
        'adjustment'
      ],
      required: true,
      index: true
    },
    quantity: {
      type: Number,
      required: true
    },
    unitCost: {
      type: Number,
      default: 0
    },
    totalCost: {
      type: Number,
      default: 0
    },
    referenceType: {
      type: String,
      enum: ['Sale', 'Purchase', 'StockTransfer', 'SalesReturn', 'Adjustment']
    },
    referenceId: {
      type: Schema.Types.ObjectId
    },
    reason: {
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

StockMovementSchema.index({ locationId: 1, createdAt: -1 });
StockMovementSchema.index({ productId: 1, variantId: 1 });

export const StockMovement = mongoose.model<IStockMovement>('StockMovement', StockMovementSchema);
