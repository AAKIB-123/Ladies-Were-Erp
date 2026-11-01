import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAuditLog extends Document {
  _id: Types.ObjectId;
  timestamp: Date;
  userId: Types.ObjectId;
  userName: string;
  userRole: string;
  action: string;
  entityType: 'Sale' | 'Purchase' | 'Expense' | 'Payment' | 'Inventory' | 'Location' | 'User' | 'Product' | 'StockTransfer' | 'SalesReturn';
  entityId: Types.ObjectId;
  locationId?: Types.ObjectId;
  beforeState?: Record<string, any>;
  afterState?: Record<string, any>;
  reason?: string;
  ipAddress?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    userName: {
      type: String,
      required: true
    },
    userRole: {
      type: String,
      required: true
    },
    action: {
      type: String,
      required: true,
      index: true
    },
    entityType: {
      type: String,
      required: true,
      enum: [
        'Sale',
        'Purchase',
        'Expense',
        'Payment',
        'Inventory',
        'Location',
        'User',
        'Product',
        'StockTransfer',
        'SalesReturn'
      ],
      index: true
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true
    },
    locationId: {
      type: Schema.Types.ObjectId,
      ref: 'Location',
      index: true
    },
    beforeState: {
      type: Schema.Types.Mixed
    },
    afterState: {
      type: Schema.Types.Mixed
    },
    reason: {
      type: String
    },
    ipAddress: {
      type: String
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

AuditLogSchema.pre('save', function (next) {
  if (!this.isNew) {
    return next(new Error('Audit logs are immutable and cannot be modified after creation.'));
  }
  return next();
});

const IMMUTABLE_QUERY_HOOKS: Array<'findOneAndUpdate' | 'updateOne' | 'updateMany' | 'replaceOne'> = [
  'findOneAndUpdate',
  'updateOne',
  'updateMany',
  'replaceOne'
];
for (const hook of IMMUTABLE_QUERY_HOOKS) {
  AuditLogSchema.pre(hook, function (next) {
    return next(new Error('Audit logs are immutable and cannot be modified after creation.'));
  });
}

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
