import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IInventory extends Document {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  variantId: string;
  locationId: Types.ObjectId;
  quantityOnHand: number;
  createdAt: Date;
  updatedAt: Date;
}

const InventorySchema = new Schema<IInventory>(
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
    quantityOnHand: {
      type: Number,
      required: true,
      default: 0
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

// Compound Unique Index: One inventory document per product variant per location
InventorySchema.index({ productId: 1, variantId: 1, locationId: 1 }, { unique: true });

export const Inventory = mongoose.model<IInventory>('Inventory', InventorySchema);
