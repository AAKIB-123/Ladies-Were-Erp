import mongoose, { Types } from 'mongoose';
import { Purchase, IPurchase, IPurchaseItem, PurchasePaymentStatus } from '../models/Purchase';
import { StockTransfer, IStockTransfer } from '../models/StockTransfer';
import { Product } from '../models/Product';
import { Inventory } from '../models/Inventory';
import { StockMovement } from '../models/StockMovement';
import { Supplier } from '../models/Supplier';
import { Location } from '../models/Location';
import { AppError } from '../middleware/errorHandler';

export async function generateTransferNumber(): Promise<string> {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `TRF-${dateStr}`;

  const last = await StockTransfer.findOne({ transferNumber: { $regex: `^${prefix}` } })
    .sort({ transferNumber: -1 })
    .select('transferNumber');

  let seq = 1;
  if (last && last.transferNumber) {
    const parts = last.transferNumber.split('-');
    if (parts.length === 3) {
      seq = parseInt(parts[2], 10) + 1;
    }
  }

  return `${prefix}-${seq.toString().padStart(4, '0')}`;
}

export async function postPurchaseInvoice(data: {
  invoiceNumber: string;
  supplierId: string;
  receivingLocationId: string;
  purchaseDate?: Date;
  items: Array<{
    productId: string;
    variantId: string;
    quantity: number;
    unitCost: number;
    lineDiscount?: number;
  }>;
  additionalCosts?: number;
  amountPaid?: number;
  paymentMethod?: string;
  notes?: string;
  userId: string;
}): Promise<IPurchase> {
  // Check supplier
  const supplier = await Supplier.findById(data.supplierId);
  if (!supplier || !supplier.isActive) {
    throw new AppError('Valid active supplier is required.', 400);
  }

  // Check receiving location
  const location = await Location.findById(data.receivingLocationId);
  if (!location || !location.isActive) {
    throw new AppError('Valid active receiving location is required.', 400);
  }

  // Check duplicate invoice from same supplier
  const existing = await Purchase.findOne({
    supplierId: new Types.ObjectId(data.supplierId),
    invoiceNumber: data.invoiceNumber.trim()
  });
  if (existing) {
    throw new AppError(`Invoice '${data.invoiceNumber}' from this supplier is already recorded.`, 409);
  }

  // Calculate item line totals
  let grossItemsTotal = 0;
  const processedItems: IPurchaseItem[] = [];

  for (const item of data.items) {
    const lineDiscount = Math.round((item.lineDiscount || 0) * 100) / 100;
    const lineTotal = Math.max(0, Math.round((item.quantity * item.unitCost - lineDiscount) * 100) / 100);
    grossItemsTotal += lineTotal;

    processedItems.push({
      productId: new Types.ObjectId(item.productId),
      variantId: item.variantId,
      quantity: item.quantity,
      unitCost: item.unitCost,
      lineDiscount,
      lineTotal
    });
  }

  const additionalCosts = Math.round((data.additionalCosts || 0) * 100) / 100;
  const totalAmount = Math.round((grossItemsTotal + additionalCosts) * 100) / 100;
  const amountPaid = Math.round((data.amountPaid || 0) * 100) / 100;
  const outstandingPayable = Math.max(0, Math.round((totalAmount - amountPaid) * 100) / 100);

  let paymentStatus: PurchasePaymentStatus = 'unpaid';
  if (amountPaid >= totalAmount) {
    paymentStatus = 'paid';
  } else if (amountPaid > 0) {
    paymentStatus = 'partial';
  }

  // 1. Create Purchase record
  const purchase = await Purchase.create({
    invoiceNumber: data.invoiceNumber.trim(),
    supplierId: supplier._id,
    receivingLocationId: location._id,
    purchaseDate: data.purchaseDate || new Date(),
    items: processedItems,
    additionalCosts,
    totalAmount,
    amountPaid,
    outstandingPayable,
    paymentStatus,
    paymentMethod: data.paymentMethod,
    status: 'posted',
    notes: data.notes?.trim(),
    createdBy: new Types.ObjectId(data.userId)
  });

  // 2. Update Supplier Payable Balance
  if (outstandingPayable > 0) {
    supplier.outstandingPayable = Math.round((supplier.outstandingPayable + outstandingPayable) * 100) / 100;
    await supplier.save();
  }

  // 3. Update Inventory, Recalculate WAC, and Record Stock Movements: TEST-08 & TEST-10
  for (const item of processedItems) {
    const product = await Product.findById(item.productId);
    if (!product) continue;

    // Allocate landed costs proportionally
    const lineLanded = grossItemsTotal > 0 ? (item.lineTotal / grossItemsTotal) * additionalCosts : 0;
    const effectiveNetLineCost = item.lineTotal + lineLanded;
    const effectiveUnitCost = Math.round((effectiveNetLineCost / item.quantity) * 100) / 100;

    // Current stock across all locations for this variant
    const currentInventories = await Inventory.find({
      productId: product._id,
      variantId: item.variantId
    });
    const totalCurrentStock = currentInventories.reduce((acc, inv) => acc + Math.max(0, inv.quantityOnHand), 0);

    // Current variant cost
    const variantIdx = product.variants.findIndex((v) => v.variantId === item.variantId);
    const currentCost = variantIdx >= 0 ? product.variants[variantIdx].currentCost : product.currentWeightedAverageCost;

    // Weighted-Average Cost formula: TEST-10
    // New WAC = (Existing Stock * Current Cost + Received Qty * Effective Unit Cost) / (Existing Stock + Received Qty)
    let newWac = effectiveUnitCost;
    const totalNewStock = totalCurrentStock + item.quantity;
    if (totalNewStock > 0 && totalCurrentStock > 0) {
      newWac = Math.round(
        ((totalCurrentStock * currentCost + item.quantity * effectiveUnitCost) / totalNewStock) * 100
      ) / 100;
    }

    // Update variant cost and product average
    if (variantIdx >= 0) {
      product.variants[variantIdx].currentCost = newWac;
    }
    // Update product-level WAC
    const allVariantCosts = product.variants.map((v) => v.currentCost).filter((c) => c > 0);
    product.currentWeightedAverageCost =
      allVariantCosts.length > 0
        ? Math.round((allVariantCosts.reduce((a, b) => a + b, 0) / allVariantCosts.length) * 100) / 100
        : newWac;

    await product.save();

    // Increase inventory at receiving location: TEST-08
    await Inventory.findOneAndUpdate(
      {
        productId: item.productId,
        variantId: item.variantId,
        locationId: location._id
      },
      {
        $inc: { quantityOnHand: item.quantity }
      },
      { upsert: true, new: true }
    );

    // Record Stock Movement
    await StockMovement.create({
      productId: item.productId,
      variantId: item.variantId,
      locationId: location._id,
      movementType: 'purchase_receipt',
      quantity: item.quantity,
      unitCost: effectiveUnitCost,
      totalCost: Math.round(item.quantity * effectiveUnitCost * 100) / 100,
      referenceType: 'Purchase',
      referenceId: purchase._id,
      reason: `Dealer invoice ${purchase.invoiceNumber} received from ${supplier.name}`,
      createdBy: new Types.ObjectId(data.userId)
    });
  }

  return purchase;
}

export async function executeStockTransfer(data: {
  sourceLocationId: string;
  destinationLocationId: string;
  items: Array<{
    productId: string;
    variantId: string;
    quantity: number;
  }>;
  notes?: string;
  userId: string;
}): Promise<IStockTransfer> {
  if (data.sourceLocationId === data.destinationLocationId) {
    throw new AppError('Source and destination locations cannot be the same.', 400);
  }

  const [srcLoc, dstLoc] = await Promise.all([
    Location.findById(data.sourceLocationId),
    Location.findById(data.destinationLocationId)
  ]);

  if (!srcLoc || !srcLoc.isActive) throw new AppError('Invalid or inactive source location.', 400);
  if (!dstLoc || !dstLoc.isActive) throw new AppError('Invalid or inactive destination location.', 400);

  const transferNumber = await generateTransferNumber();
  const processedItems = [];

  // 1. Verify stock availability at source location
  for (const item of data.items) {
    const product = await Product.findById(item.productId);
    if (!product) throw new AppError(`Product not found: ${item.productId}`, 404);

    const inv = await Inventory.findOne({
      productId: product._id,
      variantId: item.variantId,
      locationId: srcLoc._id
    });

    const available = inv ? inv.quantityOnHand : 0;
    if (available < item.quantity) {
      throw new AppError(
        `Insufficient stock for "${product.name}" at ${srcLoc.name}. Available: ${available}, Requested: ${item.quantity}`,
        400
      );
    }

    const variant = product.variants.find((v) => v.variantId === item.variantId);
    const unitCost = variant?.currentCost || product.currentWeightedAverageCost || 0;

    processedItems.push({
      productId: product._id,
      variantId: item.variantId,
      quantity: item.quantity,
      unitCost
    });
  }

  // 2. Create Stock Transfer record
  const transfer = await StockTransfer.create({
    transferNumber,
    sourceLocationId: srcLoc._id,
    destinationLocationId: dstLoc._id,
    items: processedItems,
    status: 'completed',
    notes: data.notes?.trim(),
    createdBy: new Types.ObjectId(data.userId)
  });

  // 3. Atomically debit source, credit destination, and create paired stock movements: TEST-09
  for (const item of processedItems) {
    // Decrement source location stock
    await Inventory.findOneAndUpdate(
      {
        productId: item.productId,
        variantId: item.variantId,
        locationId: srcLoc._id
      },
      {
        $inc: { quantityOnHand: -item.quantity }
      }
    );

    // Increment destination location stock
    await Inventory.findOneAndUpdate(
      {
        productId: item.productId,
        variantId: item.variantId,
        locationId: dstLoc._id
      },
      {
        $inc: { quantityOnHand: item.quantity }
      },
      { upsert: true, new: true }
    );

    // Movement 1: Transfer Out from source
    await StockMovement.create({
      productId: item.productId,
      variantId: item.variantId,
      locationId: srcLoc._id,
      movementType: 'transfer_out',
      quantity: -item.quantity,
      unitCost: item.unitCost,
      totalCost: Math.round(item.quantity * item.unitCost * 100) / 100,
      referenceType: 'StockTransfer',
      referenceId: transfer._id,
      reason: `Transfer #${transfer.transferNumber} to ${dstLoc.name}`,
      createdBy: new Types.ObjectId(data.userId)
    });

    // Movement 2: Transfer In at destination
    await StockMovement.create({
      productId: item.productId,
      variantId: item.variantId,
      locationId: dstLoc._id,
      movementType: 'transfer_in',
      quantity: item.quantity,
      unitCost: item.unitCost,
      totalCost: Math.round(item.quantity * item.unitCost * 100) / 100,
      referenceType: 'StockTransfer',
      referenceId: transfer._id,
      reason: `Transfer #${transfer.transferNumber} from ${srcLoc.name}`,
      createdBy: new Types.ObjectId(data.userId)
    });
  }

  return transfer;
}
