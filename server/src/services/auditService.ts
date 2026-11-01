import { Types } from 'mongoose';
import { AuditLog } from '../models/AuditLog';

export interface AuditEventParams {
  userId: string | Types.ObjectId;
  userName: string;
  userRole: string;
  action: string;
  entityType: 'Sale' | 'Purchase' | 'Expense' | 'Payment' | 'Inventory' | 'Location' | 'User' | 'Product' | 'StockTransfer' | 'SalesReturn';
  entityId: string | Types.ObjectId;
  locationId?: string | Types.ObjectId;
  beforeState?: Record<string, any>;
  afterState?: Record<string, any>;
  reason?: string;
  ipAddress?: string;
}

export async function logAuditEvent(params: AuditEventParams) {
  try {
    const log = new AuditLog({
      timestamp: new Date(),
      userId: typeof params.userId === 'string' ? new Types.ObjectId(params.userId) : params.userId,
      userName: params.userName,
      userRole: params.userRole,
      action: params.action,
      entityType: params.entityType,
      entityId: typeof params.entityId === 'string' ? new Types.ObjectId(params.entityId) : params.entityId,
      locationId: params.locationId
        ? typeof params.locationId === 'string'
          ? new Types.ObjectId(params.locationId)
          : params.locationId
        : undefined,
      beforeState: params.beforeState,
      afterState: params.afterState,
      reason: params.reason,
      ipAddress: params.ipAddress
    });

    await log.save();
    return log;
  } catch (err) {
    // Audit failure should be logged but never crash the main operation
    console.error('[AUDIT_LOG_ERROR]', err);
    return null;
  }
}

export async function queryAuditLogs(filter: {
  entityType?: string;
  entityId?: string;
  locationId?: string;
  action?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  skip?: number;
}) {
  const query: any = {};

  if (filter.entityType) query.entityType = filter.entityType;
  if (filter.entityId) query.entityId = new Types.ObjectId(filter.entityId);
  if (filter.locationId) query.locationId = new Types.ObjectId(filter.locationId);
  if (filter.action) query.action = filter.action;
  if (filter.userId) query.userId = new Types.ObjectId(filter.userId);

  if (filter.startDate || filter.endDate) {
    query.timestamp = {};
    if (filter.startDate) query.timestamp.$gte = filter.startDate;
    if (filter.endDate) query.timestamp.$lte = filter.endDate;
  }

  const limit = filter.limit || 50;
  const skip = filter.skip || 0;

  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name email role')
      .populate('locationId', 'name code'),
    AuditLog.countDocuments(query)
  ]);

  return {
    total,
    page: Math.floor(skip / limit) + 1,
    limit,
    logs
  };
}
