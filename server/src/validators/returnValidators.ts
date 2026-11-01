import { z } from 'zod';

export const createSalesReturnSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1, 'Product is required'),
        variantId: z.string().min(1, 'Variant is required'),
        quantityReturned: z.number().int().min(1, 'Quantity must be at least 1'),
        isRestocked: z.boolean().default(true)
      })
    )
    .min(1, 'Return must contain at least one returned item'),
  refundMethod: z.enum(['cash', 'upi', 'store_credit']),
  reason: z.string().min(3, 'A clear reason for return is required')
});
