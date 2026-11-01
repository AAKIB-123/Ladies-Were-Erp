import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IProductVariant {
  variantId: string;
  size?: string;
  colour?: string;
  skuSuffix?: string;
  defaultPrice?: number;
  currentCost: number;
  isActive: boolean;
}

export interface IProduct extends Document {
  _id: Types.ObjectId;
  sku: string;
  name: string;
  category: string;
  description?: string;
  unit: string;
  defaultPrice: number;
  currentWeightedAverageCost: number;
  isActive: boolean;
  variants: IProductVariant[];
  createdAt: Date;
  updatedAt: Date;
}

const ProductVariantSchema = new Schema<IProductVariant>(
  {
    variantId: {
      type: String,
      required: true,
      trim: true
    },
    size: {
      type: String,
      trim: true
    },
    colour: {
      type: String,
      trim: true
    },
    skuSuffix: {
      type: String,
      trim: true
    },
    defaultPrice: {
      type: Number,
      min: 0
    },
    currentCost: {
      type: Number,
      default: 0,
      min: 0
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { _id: false }
);

const ProductSchema = new Schema<IProduct>(
  {
    sku: {
      type: String,
      required: [true, 'Product SKU is required'],
      unique: true,
      uppercase: true,
      trim: true
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      index: true
    },
    description: {
      type: String,
      trim: true
    },
    unit: {
      type: String,
      default: 'pcs',
      trim: true
    },
    defaultPrice: {
      type: Number,
      required: [true, 'Default selling price is required'],
      min: 0
    },
    currentWeightedAverageCost: {
      type: Number,
      default: 0,
      min: 0
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    variants: [ProductVariantSchema]
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

ProductSchema.index({ name: 'text', sku: 'text', category: 'text' });

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
