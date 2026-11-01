import { z } from 'zod';

export const createQuickSaleSchema = z.object({
  locationId: z.string().min(1, 'Location is required'),
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  totalAmount: z.number().min(0.01, 'Total amount must be greater than zero'),
  discount: z.number().min(0).default(0),
  paymentMethod: z.enum(['cash', 'upi', 'bank_transfer', 'credit']),
  amountReceived: z.number().min(0).optional(),
  notes: z.string().optional(),
  idempotencyKey: z.string().optional()
});

const saleLineItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  variantId: z.string().min(1, 'Variant is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  unitPrice: z.number().min(0, 'Unit price cannot be negative'),
  lineDiscount: z.number().min(0).default(0)
});

export const createProductWiseSaleSchema = z.object({
  locationId: z.string().min(1, 'Location is required'),
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  items: z.array(saleLineItemSchema).min(1, 'Sale must contain at least one product line item'),
  overallDiscount: z.number().min(0).default(0),
  paymentMethod: z.enum(['cash', 'upi', 'bank_transfer', 'credit']),
  amountReceived: z.number().min(0),
  notes: z.string().optional(),
  idempotencyKey: z.string().optional()
});

export const reconcileSaleSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().min(1, 'Product is required'),
      variantId: z.string().min(1, 'Variant is required'),
      quantity: z.number().int().min(1, 'Quantity must be at least 1')
    })
  ).min(1, 'Must provide at least one product line item to reconcile'),
  notes: z.string().optional()
});

export const voidSaleSchema = z.object({
  reason: z.string().min(3, 'A valid reason (minimum 3 characters) is required to void a sale')
});
