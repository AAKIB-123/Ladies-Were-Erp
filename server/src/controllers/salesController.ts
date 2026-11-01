import { Request, Response, NextFunction } from 'express';
import {
  createQuickSale,
  createProductWiseSale,
  reconcileQuickSale
} from '../services/salesService';
import { Sale } from '../models/Sale';
import { AppError } from '../middleware/errorHandler';
import { logAuditEvent } from '../services/auditService';

export async function createSale(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const { saleMode, locationId } = req.body;

    // Staff location authorization check
    if (user.role === 'staff' && !user.assignedLocations.includes(locationId)) {
      throw new AppError('Forbidden: You are not authorized to create sales at this location.', 403);
    }

    let sale;
    if (saleMode === 'quick') {
      sale = await createQuickSale({
        ...req.body,
        userId: user.id
      });
    } else {
      sale = await createProductWiseSale({
        ...req.body,
        userId: user.id
      });
    }

    res.status(201).json({
      success: true,
      message: 'Sale recorded successfully',
      sale
    });
  } catch (error) {
    next(error);
  }
}

export async function getSales(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const {
      locationId,
      saleMode,
      isReconciled,
      startDate,
      endDate,
      customerId,
      search
    } = req.query;

    const filter: any = { isVoided: false };

    // Location filtering
    if (locationId) {
      if (user.role === 'staff' && !user.assignedLocations.includes(locationId as string)) {
        throw new AppError('Forbidden: Cannot view sales for an unassigned location.', 403);
      }
      filter.locationId = locationId;
    } else if (user.role === 'staff') {
      filter.locationId = { $in: user.assignedLocations };
    }

    if (saleMode) filter.saleMode = saleMode;
    if (isReconciled !== undefined) filter.isReconciled = isReconciled === 'true';
    if (customerId) filter.customerId = customerId;

    if (startDate || endDate) {
      filter.saleDate = {};
      if (startDate) filter.saleDate.$gte = new Date(startDate as string);
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        filter.saleDate.$lte = end;
      }
    }

    if (search) {
      filter.$or = [
        { saleNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } }
      ];
    }

    const sales = await Sale.find(filter)
      .populate('locationId', 'name code')
      .populate('createdBy', 'name')
      .sort({ saleDate: -1 })
      .limit(200);

    // If staff, redact totalCogs & unitCostSnapshot from items
    const sanitized =
      user.role === 'staff'
        ? sales.map((s) => {
            const doc: any = s.toObject();
            delete doc.totalCogs;
            if (Array.isArray(doc.items)) {
              doc.items = doc.items.map((item: any) => {
                delete item.unitCostSnapshot;
                delete item.cogsTotal;
                return item;
              });
            }
            return doc;
          })
        : sales;

    res.status(200).json({
      success: true,
      count: sanitized.length,
      sales: sanitized
    });
  } catch (error) {
    next(error);
  }
}

export async function getSaleById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const { id } = req.params;

    const sale = await Sale.findById(id)
      .populate('locationId', 'name code')
      .populate('customerId', 'name phone address')
      .populate('createdBy', 'name');

    if (!sale) {
      throw new AppError('Sale record not found', 404);
    }

    if (user.role === 'staff' && !user.assignedLocations.includes(sale.locationId._id.toString())) {
      throw new AppError('Forbidden: Cannot view sale from unassigned location.', 403);
    }

    const result: any = sale.toObject();
    if (user.role === 'staff') {
      delete result.totalCogs;
      if (Array.isArray(result.items)) {
        result.items = result.items.map((item: any) => {
          delete item.unitCostSnapshot;
          delete item.cogsTotal;
          return item;
        });
      }
    }

    res.status(200).json({
      success: true,
      sale: result
    });
  } catch (error) {
    next(error);
  }
}

export async function reconcileSale(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { items, notes } = req.body;

    const sale = await reconcileQuickSale(id, items, user.id, notes);

    await logAuditEvent({
      userId: user.id,
      userName: user.name || 'Admin',
      userRole: user.role,
      action: 'sale_reconciled',
      entityType: 'Sale',
      entityId: sale._id,
      locationId: sale.locationId,
      afterState: { isReconciled: true, totalCogs: sale.totalCogs, itemsCount: sale.items.length },
      reason: notes || 'Quick Sale reconciled with inventory products'
    });

    res.status(200).json({
      success: true,
      message: 'Quick Sale reconciled successfully with product inventory',
      sale
    });
  } catch (error) {
    next(error);
  }
}

export async function voidSale(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { reason } = req.body;

    const sale = await Sale.findById(id);
    if (!sale) {
      throw new AppError('Sale record not found', 404);
    }

    if (sale.isVoided) {
      throw new AppError('Sale is already voided.', 400);
    }

    sale.isVoided = true;
    sale.voidReason = reason;
    await sale.save();

    await logAuditEvent({
      userId: user.id,
      userName: user.name || 'Admin',
      userRole: user.role,
      action: 'sale_voided',
      entityType: 'Sale',
      entityId: sale._id,
      locationId: sale.locationId,
      beforeState: { isVoided: false, netAmount: sale.netAmount },
      afterState: { isVoided: true, voidReason: reason },
      reason
    });

    res.status(200).json({
      success: true,
      message: 'Sale voided successfully with audit reason recorded',
      sale
    });
  } catch (error) {
    next(error);
  }
}
