import { z } from 'zod';

export const recordPaymentSchema = z.object({
  paymentType: z.enum([
    'customer_sale',
    'customer_collection',
    'supplier_payment',
    'customer_refund',
    'expense'
  ]),
  partyType: z.enum(['customer', 'supplier', 'none']).default('none'),
  partyId: z.string().optional(),
  relatedEntityType: z.enum(['Sale', 'Purchase', 'Expense', 'SalesReturn']).optional(),
  relatedEntityId: z.string().optional(),
  locationId: z.string().optional(),
  amount: z.number().min(0.01, 'Payment amount must be greater than zero'),
  paymentMethod: z.enum(['cash', 'upi', 'bank_transfer', 'cheque', 'other']),
  referenceNumber: z.string().trim().optional(),
  notes: z.string().trim().optional()
});
