import { z } from 'zod';

export const createLocationSchema = z.object({
  name: z.string().min(1, 'Location name is required').trim(),
  code: z
    .string()
    .min(2, 'Location code must be at least 2 characters')
    .max(20, 'Location code cannot exceed 20 characters')
    .trim()
    .toUpperCase(),
  address: z.string().optional(),
  description: z.string().optional()
});

export const updateLocationSchema = z.object({
  name: z.string().min(1, 'Location name is required').trim().optional(),
  code: z
    .string()
    .min(2, 'Location code must be at least 2 characters')
    .max(20, 'Location code cannot exceed 20 characters')
    .trim()
    .toUpperCase()
    .optional(),
  address: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional()
});

export const toggleLocationStatusSchema = z.object({
  isActive: z.boolean({ required_error: 'isActive status is required' })
});
