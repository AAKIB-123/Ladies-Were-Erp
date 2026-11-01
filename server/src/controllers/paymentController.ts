import { Request, Response, NextFunction } from 'express';
import {
  recordCustomerCollection,
  recordSupplierPayment
} from '../services/financialLedgerService';
import { Payment } from '../models/Payment';
import { AppError } from '../middleware/errorHandler';

export async function recordPaymentHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const { paymentType, partyId, amount, paymentMethod, referenceNumber, notes, locationId } = req.body;

    let payment;
    if (paymentType === 'customer_collection') {
      if (!partyId) throw new AppError('Customer ID is required for collection.', 400);
      payment = await recordCustomerCollection({
        customerId: partyId,
        amount,
        paymentMethod,
        locationId,
        referenceNumber,
        notes,
        userId: user.id
      });
    } else if (paymentType === 'supplier_payment') {
      if (user.role !== 'admin') {
        throw new AppError('Only administrators can record supplier payments.', 403);
      }
      if (!partyId) throw new AppError('Supplier ID is required for supplier payment.', 400);
      payment = await recordSupplierPayment({
        supplierId: partyId,
        amount,
        paymentMethod,
        referenceNumber,
        notes,
        userId: user.id
      });
    } else {
      throw new AppError(`Direct payment recording for type '${paymentType}' is not supported via this endpoint.`, 400);
    }

    res.status(201).json({
      success: true,
      message: 'Payment recorded and balance reconciled successfully',
      payment
    });
  } catch (error) {
    next(error);
  }
}

export async function getPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { paymentType, partyType, startDate, endDate } = req.query;
    const filter: any = {};

    if (paymentType) filter.paymentType = paymentType;
    if (partyType) filter.partyType = partyType;

    if (startDate || endDate) {
      filter.paymentDate = {};
      if (startDate) filter.paymentDate.$gte = new Date(startDate as string);
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        filter.paymentDate.$lte = end;
      }
    }

    const payments = await Payment.find(filter)
      .populate('locationId', 'name code')
      .populate('createdBy', 'name')
      .sort({ paymentDate: -1 })
      .limit(100);

    res.status(200).json({
      success: true,
      count: payments.length,
      payments
    });
  } catch (error) {
    next(error);
  }
}
