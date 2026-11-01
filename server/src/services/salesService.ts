import mongoose, { Types } from 'mongoose';
import { Sale, ISale, ISaleItem, SaleMode, PaymentMethod, PaymentStatus } from '../models/Sale';
import { Product } from '../models/Product';
import { Inventory } from '../models/Inventory';
import { StockMovement } from '../models/StockMovement';
import { Customer } from '../models/Customer';
import { Location } from '../models/Location';
import { AppError } from '../middleware/errorHandler';

export async function generateSaleNumber(): Promise<string> {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `SAL-${dateStr}`;

  // Find the highest sequence for today
  const lastSale = await Sale.findOne({ saleNumber: { $regex: `^${prefix}` } })
    .sort({ saleNumber: -1 })
    .select('saleNumber');

  let seq = 1;
  if (lastSale && lastSale.saleNumber) {
    const parts = lastSale.saleNumber.split('-');
    if (parts.length === 3) {
      seq = parseInt(parts[2], 10) + 1;
    }
  }

  return `${prefix}-${seq.toString().padStart(4, '0')}`;
}

export async function createQuickSale(data: {
  locationId: string;
  customerId?: string;
  customerName?: string;
  totalAmount: number;
  discount?: number;
  paymentMethod: PaymentMethod;
  amountReceived?: number;
  notes?: string;
  idempotencyKey?: string;
  userId: string;
}): Promise<ISale> {
  // Idempotency check: TEST-13
  if (data.idempotencyKey) {
    const existing = await Sale.findOne({ idempotencyKey: data.idempotencyKey });
    if (existing) {
      return existing;
    }
  }

  // Location validation
  const location = await Location.findById(data.locationId);
  if (!location || !location.isActive) {
    throw new AppError('Invalid or inactive location specified for sale.', 400);
  }

  const grossAmount = Math.round(data.totalAmount * 100) / 100;
  const discountAmount = Math.round((data.discount || 0) * 100) / 100;
  const netAmount = Math.max(0, Math.round((grossAmount - discountAmount) * 100) / 100);

  const received = data.amountReceived !== undefined ? Math.round(data.amountReceived * 100) / 100 : netAmount;
  let paymentStatus: PaymentStatus = 'paid';
  if (received >= netAmount) {
    paymentStatus = 'paid';
  } else if (received > 0) {
    paymentStatus = 'partial';
  } else {
    paymentStatus = 'unpaid';
  }

  const outstandingBalance = Math.max(0, Math.round((netAmount - received) * 100) / 100);

  // If customer provided, resolve customer name and update balance
  let customerName = data.customerName;
  if (data.customerId) {
    const cust = await Customer.findById(data.customerId);
    if (cust) {
      customerName = cust.name;
      if (outstandingBalance > 0) {
        cust.outstandingBalance = Math.round((cust.outstandingBalance + outstandingBalance) * 100) / 100;
        await cust.save();
      }
    }
  }

  const saleNumber = await generateSaleNumber();

  // Accounting Integrity: TEST-03 & TEST-04
  // - totalCogs = 0 (no invented costs)
  // - items = [] (no invented products)
  // - isReconciled = false (marked as provisional)
  const sale = await Sale.create({
    saleNumber,
    locationId: new Types.ObjectId(data.locationId),
    customerId: data.customerId ? new Types.ObjectId(data.customerId) : undefined,
    customerName: customerName || 'Walk-in Customer',
    saleMode: 'quick',
    saleDate: new Date(),
    items: [],
    grossAmount,
    discountAmount,
    netAmount,
    totalCogs: 0,
    paymentMethod: data.paymentMethod,
    paymentStatus,
    amountReceived: received,
    outstandingBalance,
    isReconciled: false,
    notes: data.notes,
    createdBy: new Types.ObjectId(data.userId),
    idempotencyKey: data.idempotencyKey
  });

  return sale;
}

export async function createProductWiseSale(data: {
  locationId: string;
  customerId?: string;
  customerName?: string;
  items: Array<{
    productId: string;
    variantId: string;
    quantity: number;
    unitPrice: number;
    lineDiscount?: number;
  }>;
  overallDiscount?: number;
  paymentMethod: PaymentMethod;
  amountReceived: number;
  notes?: string;
  idempotencyKey?: string;
  userId: string;
}): Promise<ISale> {
  // Idempotency check: TEST-13
  if (data.idempotencyKey) {
    const existing = await Sale.findOne({ idempotencyKey: data.idempotencyKey });
    if (existing) {
      return existing;
    }
  }

  // Location validation
  const location = await Location.findById(data.locationId);
  if (!location || !location.isActive) {
    throw new AppError('Invalid or inactive location specified for sale.', 400);
  }

  const processedItems: ISaleItem[] = [];
  let calculatedGross = 0;
  let calculatedCogs = 0;

  // 1. Validate all products, variants, and stock before committing
  for (const item of data.items) {
    const product = await Product.findById(item.productId);
    if (!product || !product.isActive) {
      throw new AppError(`Product not found or inactive: ID ${item.productId}`, 400);
    }

    const variant = product.variants.find((v) => v.variantId === item.variantId);
    if (!variant && item.variantId !== 'default') {
      throw new AppError(`Variant '${item.variantId}' not found on product '${product.name}'`, 400);
    }

    // Check available stock at this specific location: TEST-06 & TEST-07
    const inv = await Inventory.findOne({
      productId: product._id,
      variantId: item.variantId,
      locationId: new Types.ObjectId(data.locationId)
    });

    const currentQty = inv ? inv.quantityOnHand : 0;
    if (currentQty < item.quantity) {
      throw new AppError(
        `Insufficient stock for "${product.name} (${variant?.size || ''} ${variant?.colour || ''})" at ${location.name}. Available: ${currentQty}, Requested: ${item.quantity}`,
        400
      );
    }

    // Line totals calculated strictly server-side: TEST-05
    const lineDiscount = Math.round((item.lineDiscount || 0) * 100) / 100;
    const lineTotal = Math.max(0, Math.round((item.quantity * item.unitPrice - lineDiscount) * 100) / 100);

    // Snapshot current weighted-average cost: TEST-11
    const unitCostSnapshot = variant?.currentCost || product.currentWeightedAverageCost || 0;
    const cogsTotal = Math.round(item.quantity * unitCostSnapshot * 100) / 100;

    calculatedGross += lineTotal;
    calculatedCogs += cogsTotal;

    processedItems.push({
      productId: product._id,
      variantId: item.variantId,
      productName: product.name,
      size: variant?.size,
      colour: variant?.colour,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineDiscount,
      lineTotal,
      unitCostSnapshot,
      cogsTotal
    });
  }

  const overallDiscount = Math.round((data.overallDiscount || 0) * 100) / 100;
  const netAmount = Math.max(0, Math.round((calculatedGross - overallDiscount) * 100) / 100);
  const received = Math.round(data.amountReceived * 100) / 100;

  let paymentStatus: PaymentStatus = 'paid';
  if (received >= netAmount) {
    paymentStatus = 'paid';
  } else if (received > 0) {
    paymentStatus = 'partial';
  } else {
    paymentStatus = 'unpaid';
  }

  const outstandingBalance = Math.max(0, Math.round((netAmount - received) * 100) / 100);

  // Customer resolution
  let customerName = data.customerName;
  if (data.customerId) {
    const cust = await Customer.findById(data.customerId);
    if (cust) {
      customerName = cust.name;
      if (outstandingBalance > 0) {
        cust.outstandingBalance = Math.round((cust.outstandingBalance + outstandingBalance) * 100) / 100;
        await cust.save();
      }
    }
  }

  const saleNumber = await generateSaleNumber();

  // Create Sale record
  const sale = await Sale.create({
    saleNumber,
    locationId: new Types.ObjectId(data.locationId),
    customerId: data.customerId ? new Types.ObjectId(data.customerId) : undefined,
    customerName: customerName || 'Walk-in Customer',
    saleMode: 'product_wise',
    saleDate: new Date(),
    items: processedItems,
    grossAmount: Math.round(calculatedGross * 100) / 100,
    discountAmount: overallDiscount,
    netAmount,
    totalCogs: Math.round(calculatedCogs * 100) / 100,
    paymentMethod: data.paymentMethod,
    paymentStatus,
    amountReceived: received,
    outstandingBalance,
    isReconciled: true,
    notes: data.notes,
    createdBy: new Types.ObjectId(data.userId),
    idempotencyKey: data.idempotencyKey
  });

  // 2. Deduct Inventory & Record Stock Movements: TEST-06
  for (const item of processedItems) {
    await Inventory.findOneAndUpdate(
      {
        productId: item.productId,
        variantId: item.variantId,
        locationId: new Types.ObjectId(data.locationId)
      },
      {
        $inc: { quantityOnHand: -item.quantity }
      },
      { upsert: true, new: true }
    );

    await StockMovement.create({
      productId: item.productId,
      variantId: item.variantId,
      locationId: new Types.ObjectId(data.locationId),
      movementType: 'sale',
      quantity: -item.quantity,
      unitCost: item.unitCostSnapshot,
      totalCost: item.cogsTotal,
      referenceType: 'Sale',
      referenceId: sale._id,
      reason: `Sold on invoice ${sale.saleNumber}`,
      createdBy: new Types.ObjectId(data.userId)
    });
  }

  return sale;
}

export async function reconcileQuickSale(
  saleId: string,
  items: Array<{ productId: string; variantId: string; quantity: number }>,
  userId: string,
  notes?: string
): Promise<ISale> {
  const sale = await Sale.findById(saleId);
  if (!sale) {
    throw new AppError('Sale record not found', 404);
  }

  if (sale.isVoided) {
    throw new AppError('Cannot reconcile a voided sale.', 400);
  }

  if (sale.saleMode !== 'quick') {
    throw new AppError('Only Quick Sales require reconciliation.', 400);
  }

  if (sale.isReconciled) {
    throw new AppError('This Quick Sale has already been reconciled.', 400);
  }

  const processedItems: ISaleItem[] = [];
  let calculatedCogs = 0;

  // Validate products and deduct stock
  for (const item of items) {
    const product = await Product.findById(item.productId);
    if (!product) {
      throw new AppError(`Product not found: ${item.productId}`, 404);
    }

    const variant = product.variants.find((v) => v.variantId === item.variantId);
    const inv = await Inventory.findOne({
      productId: product._id,
      variantId: item.variantId,
      locationId: sale.locationId
    });

    const currentQty = inv ? inv.quantityOnHand : 0;
    if (currentQty < item.quantity) {
      throw new AppError(
        `Insufficient stock for "${product.name}" during reconciliation. Available: ${currentQty}, Requested: ${item.quantity}`,
        400
      );
    }

    const unitCostSnapshot = variant?.currentCost || product.currentWeightedAverageCost || 0;
    const cogsTotal = Math.round(item.quantity * unitCostSnapshot * 100) / 100;
    calculatedCogs += cogsTotal;

    processedItems.push({
      productId: product._id,
      variantId: item.variantId,
      productName: product.name,
      size: variant?.size,
      colour: variant?.colour,
      quantity: item.quantity,
      unitPrice: variant?.defaultPrice || product.defaultPrice,
      lineDiscount: 0,
      lineTotal: Math.round(item.quantity * (variant?.defaultPrice || product.defaultPrice) * 100) / 100,
      unitCostSnapshot,
      cogsTotal
    });
  }

  // Deduct inventory & record stock movements
  for (const item of processedItems) {
    await Inventory.findOneAndUpdate(
      {
        productId: item.productId,
        variantId: item.variantId,
        locationId: sale.locationId
      },
      {
        $inc: { quantityOnHand: -item.quantity }
      }
    );

    await StockMovement.create({
      productId: item.productId,
      variantId: item.variantId,
      locationId: sale.locationId,
      movementType: 'sale',
      quantity: -item.quantity,
      unitCost: item.unitCostSnapshot,
      totalCost: item.cogsTotal,
      referenceType: 'Sale',
      referenceId: sale._id,
      reason: `Reconciled for Quick Sale ${sale.saleNumber}`,
      createdBy: new Types.ObjectId(userId)
    });
  }

  // Update sale without rewriting revenue or double-counting
  sale.items = processedItems;
  sale.totalCogs = Math.round(calculatedCogs * 100) / 100;
  sale.isReconciled = true;
  sale.reconciledAt = new Date();
  sale.reconciledBy = new Types.ObjectId(userId);
  if (notes) {
    sale.notes = sale.notes ? `${sale.notes} | ${notes}` : notes;
  }

  await sale.save();
  return sale;
}
