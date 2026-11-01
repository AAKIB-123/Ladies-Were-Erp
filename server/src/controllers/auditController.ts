import { Request, Response, NextFunction } from 'express';
import { queryAuditLogs } from '../services/auditService';

export async function getAuditLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      entityType,
      entityId,
      locationId,
      action,
      userId,
      startDate,
      endDate,
      limit,
      page
    } = req.query;

    const limitNum = limit ? parseInt(limit as string, 10) : 50;
    const pageNum = page ? parseInt(page as string, 10) : 1;
    const skip = (pageNum - 1) * limitNum;

    const data = await queryAuditLogs({
      entityType: entityType as string | undefined,
      entityId: entityId as string | undefined,
      locationId: locationId as string | undefined,
      action: action as string | undefined,
      userId: userId as string | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: limitNum,
      skip
    });

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
}
