import { Request, Response, NextFunction } from 'express';
import {
  parsePeriodDates,
  calculateProfitAndLoss,
  getDashboardOverview,
  getInventoryValuationReport
} from '../services/accountingReportService';

export async function getDashboardSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const { period, startDate, endDate, locationId } = req.query;

    const { start, end } = parsePeriodDates(
      period as string | undefined,
      startDate as string | undefined,
      endDate as string | undefined
    );

    const data = await getDashboardOverview({
      locationId: locationId as string | undefined,
      startDate: start,
      endDate: end
    });

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
}

export async function getProfitAndLoss(req: Request, res: Response, next: NextFunction) {
  try {
    const { period, startDate, endDate, locationId } = req.query;

    const { start, end } = parsePeriodDates(
      period as string | undefined,
      startDate as string | undefined,
      endDate as string | undefined
    );

    const data = await calculateProfitAndLoss({
      locationId: locationId as string | undefined,
      startDate: start,
      endDate: end
    });

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
}

export async function getInventoryValuation(req: Request, res: Response, next: NextFunction) {
  try {
    const { locationId } = req.query;

    const data = await getInventoryValuationReport(locationId as string | undefined);

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
}
