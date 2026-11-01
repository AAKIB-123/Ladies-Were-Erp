import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ILocation extends Document {
  _id: Types.ObjectId;
  name: string;
  code: string;
  address?: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LocationSchema = new Schema<ILocation>(
  {
    name: {
      type: String,
      required: [true, 'Location name is required'],
      trim: true
    },
    code: {
      type: String,
      required: [true, 'Location code is required'],
      unique: true,
      trim: true,
      uppercase: true
    },
    address: {
      type: String,
      trim: true
    },
    description: {
      type: String,
      trim: true
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

LocationSchema.index({ name: 'text', code: 'text' });

export const Location = mongoose.model<ILocation>('Location', LocationSchema);
