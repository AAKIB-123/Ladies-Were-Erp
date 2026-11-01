import { z } from 'zod';

export const postPurchaseSchema = z.object({
  invoiceNumber: z.string().min(1, 'Invoice number is required').trim(),
  supplierId: z.string().min(1, 'Supplier is required'),
  receivingLocationId: z.string().min(1, 'Receiving location is required'),
  purchaseDate: z.string().optional().transform((val) => (val ? new Date(val) : new Date())),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, 'Product is required'),
        variantId: z.string().min(1, 'Variant is required'),
        quantity: z.number().int().min(1, 'Quantity must be at least 1'),
        unitCost: z.number().min(0, 'Unit cost cannot be negative'),
        lineDiscount: z.number().min(0).default(0)
      })
    )
    .min(1, 'Purchase must have at least one product line item'),
  additionalCosts: z.number().min(0).default(0),
  amountPaid: z.number().min(0).default(0),
  paymentMethod: z.enum(['cash', 'bank_transfer', 'cheque', 'credit']).optional(),
  notes: z.string().optional()
});
