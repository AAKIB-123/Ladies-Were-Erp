import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  email: z.string().email('Please enter a valid email address').trim().toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  role: z.enum(['admin', 'staff'], {
    errorMap: () => ({ message: 'Role must be either admin or staff' })
  }),
  assignedLocations: z.array(z.string()).default([]),
  phone: z.string().optional()
});

export const updateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').trim().optional(),
  email: z.string().email('Please enter a valid email address').trim().toLowerCase().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters long').optional(),
  role: z.enum(['admin', 'staff']).optional(),
  assignedLocations: z.array(z.string()).optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional()
});

export const toggleUserStatusSchema = z.object({
  isActive: z.boolean({ required_error: 'isActive status is required' })
});
