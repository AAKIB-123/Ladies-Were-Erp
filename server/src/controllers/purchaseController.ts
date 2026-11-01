import { Request, Response, NextFunction } from 'express';
import { postPurchaseInvoice } from '../services/inventoryCostingService';
import { Purchase } from '../models/Purchase';
import { AppError } from '../middleware/errorHandler';

export async function createPurchase(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const purchase = await postPurchaseInvoice({
      ...req.body,
      userId: user.id
    });

    res.status(201).json({
      success: true,
      message: 'Purchase invoice posted, stock received and WAC recalculated successfully',
      purchase
    });
  } catch (error) {
    next(error);
  }
}

export async function getPurchases(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { supplierId, locationId, startDate, endDate } = req.query;
    const filter: any = {};

    if (supplierId) filter.supplierId = supplierId;
    if (locationId) filter.receivingLocationId = locationId;

    if (startDate || endDate) {
      filter.purchaseDate = {};
      if (startDate) filter.purchaseDate.$gte = new Date(startDate as string);
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        filter.purchaseDate.$lte = end;
      }
    }

    const purchases = await Purchase.find(filter)
      .populate('supplierId', 'name contactPerson phone')
      .populate('receivingLocationId', 'name code')
      .populate('createdBy', 'name')
      .sort({ purchaseDate: -1 })
      .limit(100);

    res.status(200).json({
      success: true,
      count: purchases.length,
      purchases
    });
  } catch (error) {
    next(error);
  }
}

export async function getPurchaseById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const purchase = await Purchase.findById(id)
      .populate('supplierId', 'name contactPerson phone address email')
      .populate('receivingLocationId', 'name code')
      .populate('items.productId', 'name sku category')
      .populate('createdBy', 'name');

    if (!purchase) {
      throw new AppError('Purchase record not found', 404);
    }

    res.status(200).json({
      success: true,
      purchase
    });
  } catch (error) {
    next(error);
  }
}
