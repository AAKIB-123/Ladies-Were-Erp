import { Types } from 'mongoose';
import { Expense, IExpense, ExpenseCategory } from '../models/Expense';
import { Payment, IPayment, PaymentType } from '../models/Payment';
import { SalesReturn, ISalesReturn, ISalesReturnItem } from '../models/SalesReturn';
import { Sale } from '../models/Sale';
import { Customer } from '../models/Customer';
import { Supplier } from '../models/Supplier';
import { Inventory } from '../models/Inventory';
import { StockMovement } from '../models/StockMovement';
import { Location } from '../models/Location';
import { AppError } from '../middleware/errorHandler';

export async function generatePaymentNumber(): Promise<string> {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `PAY-${dateStr}`;

  const last = await Payment.findOne({ paymentNumber: { $regex: `^${prefix}` } })
    .sort({ paymentNumber: -1 })
    .select('paymentNumber');

  let seq = 1;
  if (last && last.paymentNumber) {
    const parts = last.paymentNumber.split('-');
    if (parts.length === 3) {
      seq = parseInt(parts[2], 10) + 1;
    }
  }

  return `${prefix}-${seq.toString().padStart(4, '0')}`;
}

export async function generateReturnNumber(): Promise<string> {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `RET-${dateStr}`;

  const last = await SalesReturn.findOne({ returnNumber: { $regex: `^${prefix}` } })
    .sort({ returnNumber: -1 })
    .select('returnNumber');

  let seq = 1;
  if (last && last.returnNumber) {
    const parts = last.returnNumber.split('-');
    if (parts.length === 3) {
      seq = parseInt(parts[2], 10) + 1;
    }
  }

  return `${prefix}-${seq.toString().padStart(4, '0')}`;
}

export async function recordExpense(data: {
  category: ExpenseCategory;
  amount: number;
  locationId?: string;
  paymentMethod: 'cash' | 'upi' | 'bank_transfer';
  description: string;
  receiptNumber?: string;
  expenseDate?: string;
  userId: string;
}): Promise<IExpense> {
  let locId: Types.ObjectId | undefined;
  if (data.locationId) {
    const loc = await Location.findById(data.locationId);
    if (!loc) throw new AppError('Invalid location for expense.', 400);
    locId = loc._id;
  }

  const roundedAmount = Math.round(data.amount * 100) / 100;

  const expense = await Expense.create({
    category: data.category,
    amount: roundedAmount,
    locationId: locId,
    paymentMethod: data.paymentMethod,
    description: data.description.trim(),
    receiptNumber: data.receiptNumber?.trim(),
    expenseDate: data.expenseDate ? new Date(data.expenseDate) : new Date(),
    createdBy: new Types.ObjectId(data.userId)
  });

  // Create unified payment record for cash audit
  const paymentNumber = await generatePaymentNumber();
  await Payment.create({
    paymentNumber,
    paymentType: 'expense',
    partyType: 'none',
    relatedEntityType: 'Expense',
    relatedEntityId: expense._id,
    locationId: locId,
    amount: roundedAmount,
    paymentMethod: data.paymentMethod,
    referenceNumber: data.receiptNumber,
    notes: `Expense: ${data.category} - ${data.description}`,
    createdBy: new Types.ObjectId(data.userId)
  });

  return expense;
}

export async function recordCustomerCollection(data: {
  customerId: string;
  amount: number;
  paymentMethod: 'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'other';
  locationId?: string;
  referenceNumber?: string;
  notes?: string;
  userId: string;
}): Promise<IPayment> {
  const customer = await Customer.findById(data.customerId);
  if (!customer) throw new AppError('Customer not found.', 404);

  const roundedAmount = Math.round(data.amount * 100) / 100;
  const paymentNumber = await generatePaymentNumber();

  const payment = await Payment.create({
    paymentNumber,
    paymentType: 'customer_collection',
    partyType: 'customer',
    partyId: customer._id,
    locationId: data.locationId ? new Types.ObjectId(data.locationId) : undefined,
    amount: roundedAmount,
    paymentMethod: data.paymentMethod,
    referenceNumber: data.referenceNumber?.trim(),
    notes: data.notes?.trim() || `Credit collection from ${customer.name}`,
    createdBy: new Types.ObjectId(data.userId)
  });

  // Reconcile customer outstanding balance: TEST-14
  customer.outstandingBalance = Math.round((customer.outstandingBalance - roundedAmount) * 100) / 100;
  await customer.save();

  return payment;
}

export async function recordSupplierPayment(data: {
  supplierId: string;
  amount: number;
  paymentMethod: 'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'other';
  referenceNumber?: string;
  notes?: string;
  userId: string;
}): Promise<IPayment> {
  const supplier = await Supplier.findById(data.supplierId);
  if (!supplier) throw new AppError('Supplier not found.', 404);

  const roundedAmount = Math.round(data.amount * 100) / 100;
  const paymentNumber = await generatePaymentNumber();

  const payment = await Payment.create({
    paymentNumber,
    paymentType: 'supplier_payment',
    partyType: 'supplier',
    partyId: supplier._id,
    amount: roundedAmount,
    paymentMethod: data.paymentMethod,
    referenceNumber: data.referenceNumber?.trim(),
    notes: data.notes?.trim() || `Payment to supplier ${supplier.name}`,
    createdBy: new Types.ObjectId(data.userId)
  });

  // Reconcile supplier payable balance: TEST-15
  supplier.outstandingPayable = Math.round((supplier.outstandingPayable - roundedAmount) * 100) / 100;
  await supplier.save();

  return payment;
}

export async function processSalesReturn(
  saleId: string,
  data: {
    items: Array<{
      productId: string;
      variantId: string;
      quantityReturned: number;
      isRestocked?: boolean;
    }>;
    refundMethod: 'cash' | 'upi' | 'store_credit';
    reason: string;
    userId: string;
  }
): Promise<ISalesReturn> {
  const sale = await Sale.findById(saleId);
  if (!sale) throw new AppError('Sale record not found.', 404);
  if (sale.isVoided) throw new AppError('Cannot process returns on a voided sale.', 400);

  // Fetch previous returns on this sale to enforce TEST-12
  const priorReturns = await SalesReturn.find({ saleId: sale._id });

  let totalRefund = 0;
  const processedItems: ISalesReturnItem[] = [];

  for (const retItem of data.items) {
    // Locate original line item on sale
    const saleItem = sale.items.find(
      (i) => i.productId.toString() === retItem.productId && i.variantId === retItem.variantId
    );

    if (!saleItem) {
      throw new AppError(`Item '${retItem.productId}' was not part of original sale #${sale.saleNumber}.`, 400);
    }

    // Sum already returned quantity for this line item
    const previouslyReturnedQty = priorReturns.reduce((sum, pr) => {
      const match = pr.items.find(
        (pi) => pi.productId.toString() === retItem.productId && pi.variantId === retItem.variantId
      );
      return sum + (match ? match.quantityReturned : 0);
    }, 0);

    const eligibleQty = saleItem.quantity - previouslyReturnedQty;

    // Enforce TEST-12: Return cannot exceed eligible sold quantity
    if (retItem.quantityReturned > eligibleQty) {
      throw new AppError(
        `Returned quantity (${retItem.quantityReturned}) exceeds eligible unreturned quantity (${eligibleQty}) for ${saleItem.productName}.`,
        400
      );
    }

    const unitPrice = saleItem.unitPrice;
    const lineRefund = Math.round(retItem.quantityReturned * unitPrice * 100) / 100;
    totalRefund += lineRefund;

    const isRestocked = retItem.isRestocked !== false;

    processedItems.push({
      productId: saleItem.productId,
      variantId: saleItem.variantId,
      quantityReturned: retItem.quantityReturned,
      unitPrice,
      refundAmount: lineRefund,
      unitCostSnapshot: saleItem.unitCostSnapshot,
      isRestocked
    });
  }

  const returnNumber = await generateReturnNumber();

  // Create SalesReturn record
  const salesReturn = await SalesReturn.create({
    returnNumber,
    saleId: sale._id,
    locationId: sale.locationId,
    customerId: sale.customerId,
    items: processedItems,
    totalRefundAmount: Math.round(totalRefund * 100) / 100,
    refundMethod: data.refundMethod,
    reason: data.reason.trim(),
    createdBy: new Types.ObjectId(data.userId)
  });

  // Reverse inventory and stock movements for restocked items
  for (const item of processedItems) {
    if (item.isRestocked) {
      // Add back to inventory at sale location
      await Inventory.findOneAndUpdate(
        {
          productId: item.productId,
          variantId: item.variantId,
          locationId: sale.locationId
        },
        {
          $inc: { quantityOnHand: item.quantityReturned }
        },
        { upsert: true }
      );

      // Record positive stock movement
      await StockMovement.create({
        productId: item.productId,
        variantId: item.variantId,
        locationId: sale.locationId,
        movementType: 'sales_return',
        quantity: item.quantityReturned,
        unitCost: item.unitCostSnapshot,
        totalCost: Math.round(item.quantityReturned * item.unitCostSnapshot * 100) / 100,
        referenceType: 'SalesReturn',
        referenceId: salesReturn._id,
        reason: `Restocked on Return #${salesReturn.returnNumber}: ${data.reason}`,
        createdBy: new Types.ObjectId(data.userId)
      });
    } else {
      // Damaged item written off
      await StockMovement.create({
        productId: item.productId,
        variantId: item.variantId,
        locationId: sale.locationId,
        movementType: 'damage_loss',
        quantity: -item.quantityReturned,
        unitCost: item.unitCostSnapshot,
        totalCost: Math.round(item.quantityReturned * item.unitCostSnapshot * 100) / 100,
        referenceType: 'SalesReturn',
        referenceId: salesReturn._id,
        reason: `Damaged item written off on Return #${salesReturn.returnNumber}`,
        createdBy: new Types.ObjectId(data.userId)
      });
    }
  }

  // Handle refund payment or credit adjustment
  if (data.refundMethod === 'store_credit' && sale.customerId) {
    const customer = await Customer.findById(sale.customerId);
    if (customer) {
      customer.outstandingBalance = Math.round((customer.outstandingBalance - totalRefund) * 100) / 100;
      await customer.save();
    }
  }

  // Create payment record for refund
  const paymentNumber = await generatePaymentNumber();
  await Payment.create({
    paymentNumber,
    paymentType: 'customer_refund',
    partyType: sale.customerId ? 'customer' : 'none',
    partyId: sale.customerId,
    relatedEntityType: 'SalesReturn',
    relatedEntityId: salesReturn._id,
    locationId: sale.locationId,
    amount: Math.round(totalRefund * 100) / 100,
    paymentMethod: data.refundMethod === 'store_credit' ? 'other' : (data.refundMethod as any),
    notes: `Refund for return #${salesReturn.returnNumber}: ${data.reason}`,
    createdBy: new Types.ObjectId(data.userId)
  });

  return salesReturn;
}
