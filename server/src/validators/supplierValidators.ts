import { z } from 'zod';

export const createSupplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required').trim(),
  contactPerson: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.string().email('Invalid email address').trim().toLowerCase().optional().or(z.literal('')),
  address: z.string().trim().optional(),
  notes: z.string().trim().optional()
});

export const updateSupplierSchema = z.object({
  name: z.string().min(1).trim().optional(),
  contactPerson: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.string().email('Invalid email address').trim().toLowerCase().optional().or(z.literal('')),
  address: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  isActive: z.boolean().optional()
});
