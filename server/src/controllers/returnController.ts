import { Request, Response, NextFunction } from 'express';
import { processSalesReturn } from '../services/financialLedgerService';
import { SalesReturn } from '../models/SalesReturn';
import { AppError } from '../middleware/errorHandler';

export async function createReturnHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const { id } = req.params; // saleId

    const salesReturn = await processSalesReturn(id, {
      ...req.body,
      userId: user.id
    });

    res.status(201).json({
      success: true,
      message: 'Sales return processed and stock reversed successfully',
      salesReturn
    });
  } catch (error) {
    next(error);
  }
}

export async function getReturnsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { locationId, startDate, endDate } = req.query;
    const filter: any = {};

    if (locationId) filter.locationId = locationId;

    if (startDate || endDate) {
      filter.returnDate = {};
      if (startDate) filter.returnDate.$gte = new Date(startDate as string);
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        filter.returnDate.$lte = end;
      }
    }

    const returns = await SalesReturn.find(filter)
      .populate('saleId', 'saleNumber saleDate')
      .populate('locationId', 'name code')
      .populate('customerId', 'name phone')
      .populate('items.productId', 'name sku')
      .populate('createdBy', 'name')
      .sort({ returnDate: -1 })
      .limit(100);

    res.status(200).json({
      success: true,
      count: returns.length,
      returns
    });
  } catch (error) {
    next(error);
  }
}
