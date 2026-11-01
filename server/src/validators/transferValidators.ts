import { z } from 'zod';

export const createStockTransferSchema = z.object({
  sourceLocationId: z.string().min(1, 'Source location is required'),
  destinationLocationId: z.string().min(1, 'Destination location is required'),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, 'Product is required'),
        variantId: z.string().min(1, 'Variant is required'),
        quantity: z.number().int().min(1, 'Quantity must be at least 1')
      })
    )
    .min(1, 'Transfer must contain at least one item'),
  notes: z.string().optional()
});
