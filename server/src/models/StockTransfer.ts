import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IStockTransferItem {
  productId: Types.ObjectId;
  variantId: string;
  quantity: number;
  unitCost: number;
}

export interface IStockTransfer extends Document {
  _id: Types.ObjectId;
  transferNumber: string;
  sourceLocationId: Types.ObjectId;
  destinationLocationId: Types.ObjectId;
  items: IStockTransferItem[];
  status: 'completed' | 'cancelled';
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StockTransferItemSchema = new Schema<IStockTransferItem>(
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
      default: 0
    }
  },
  { _id: false }
);

const StockTransferSchema = new Schema<IStockTransfer>(
  {
    transferNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true
    },
    sourceLocationId: {
      type: Schema.Types.ObjectId,
      ref: 'Location',
      required: true,
      index: true
    },
    destinationLocationId: {
      type: Schema.Types.ObjectId,
      ref: 'Location',
      required: true,
      index: true
    },
    items: [StockTransferItemSchema],
    status: {
      type: String,
      enum: ['completed', 'cancelled'],
      default: 'completed'
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

StockTransferSchema.index({ sourceLocationId: 1, createdAt: -1 });
StockTransferSchema.index({ destinationLocationId: 1, createdAt: -1 });

export const StockTransfer = mongoose.model<IStockTransfer>('StockTransfer', StockTransferSchema);
