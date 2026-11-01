import { z } from 'zod';

const variantSchema = z.object({
  variantId: z.string().min(1, 'Variant ID is required').trim(),
  size: z.string().trim().optional(),
  colour: z.string().trim().optional(),
  skuSuffix: z.string().trim().optional(),
  defaultPrice: z.number().min(0).optional(),
  currentCost: z.number().min(0).default(0),
  isActive: z.boolean().default(true)
});

export const createProductSchema = z.object({
  sku: z.string().min(1, 'SKU is required').trim().toUpperCase(),
  name: z.string().min(1, 'Product name is required').trim(),
  category: z.string().min(1, 'Category is required').trim(),
  description: z.string().trim().optional(),
  unit: z.string().trim().default('pcs'),
  defaultPrice: z.number().min(0, 'Default selling price must be >= 0'),
  currentWeightedAverageCost: z.number().min(0).default(0),
  variants: z.array(variantSchema).default([])
});

export const updateProductSchema = z.object({
  name: z.string().min(1).trim().optional(),
  category: z.string().min(1).trim().optional(),
  description: z.string().trim().optional(),
  unit: z.string().trim().optional(),
  defaultPrice: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
  variants: z.array(variantSchema).optional()
});

export const toggleProductStatusSchema = z.object({
  isActive: z.boolean({ required_error: 'isActive is required' })
});
