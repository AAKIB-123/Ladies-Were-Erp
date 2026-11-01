import { Request, Response, NextFunction } from 'express';
import { executeStockTransfer } from '../services/inventoryCostingService';
import { Inventory } from '../models/Inventory';
import { StockMovement } from '../models/StockMovement';
import { StockTransfer } from '../models/StockTransfer';
import { AppError } from '../middleware/errorHandler';

export async function getInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const { locationId, productId } = req.query;

    const filter: any = {};

    if (locationId) {
      if (user.role === 'staff' && !user.assignedLocations.includes(locationId as string)) {
        throw new AppError('Forbidden: Cannot view inventory for unassigned location.', 403);
      }
      filter.locationId = locationId;
    } else if (user.role === 'staff') {
      filter.locationId = { $in: user.assignedLocations };
    }

    if (productId) filter.productId = productId;

    const inventories = await Inventory.find(filter)
      .populate('productId', 'name sku category defaultPrice currentWeightedAverageCost variants')
      .populate('locationId', 'name code')
      .sort({ updatedAt: -1 });

    // Format output with variant details and live stock
    const formatted = inventories.map((inv) => {
      const prod: any = inv.productId;
      const variant = prod?.variants?.find((v: any) => v.variantId === inv.variantId);

      const item: any = {
        _id: inv._id,
        productId: prod?._id,
        productName: prod?.name,
        sku: prod?.sku,
        category: prod?.category,
        variantId: inv.variantId,
        size: variant?.size || 'Free Size',
        colour: variant?.colour || 'Standard',
        location: inv.locationId,
        quantityOnHand: inv.quantityOnHand,
        updatedAt: inv.updatedAt
      };

      if (user.role === 'admin') {
        item.unitCost = variant?.currentCost || prod?.currentWeightedAverageCost || 0;
        item.totalValue = Math.round(inv.quantityOnHand * item.unitCost * 100) / 100;
      }

      return item;
    });

    res.status(200).json({
      success: true,
      count: formatted.length,
      inventory: formatted
    });
  } catch (error) {
    next(error);
  }
}

export async function getStockMovements(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { locationId, productId, movementType } = req.query;
    const filter: any = {};

    if (locationId) filter.locationId = locationId;
    if (productId) filter.productId = productId;
    if (movementType) filter.movementType = movementType;

    const movements = await StockMovement.find(filter)
      .populate('productId', 'name sku category')
      .populate('locationId', 'name code')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .limit(200);

    res.status(200).json({
      success: true,
      count: movements.length,
      movements
    });
  } catch (error) {
    next(error);
  }
}

export async function createTransfer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const transfer = await executeStockTransfer({
      ...req.body,
      userId: user.id
    });

    res.status(201).json({
      success: true,
      message: 'Stock transferred successfully between locations',
      transfer
    });
  } catch (error) {
    next(error);
  }
}

export async function getTransfers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const filter: any = {};

    if (user.role === 'staff') {
      filter.$or = [
        { sourceLocationId: { $in: user.assignedLocations } },
        { destinationLocationId: { $in: user.assignedLocations } }
      ];
    }

    const transfers = await StockTransfer.find(filter)
      .populate('sourceLocationId', 'name code')
      .populate('destinationLocationId', 'name code')
      .populate('items.productId', 'name sku')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .limit(100);

    res.status(200).json({
      success: true,
      count: transfers.length,
      transfers
    });
  } catch (error) {
    next(error);
  }
}
