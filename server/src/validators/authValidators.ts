import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address').trim().toLowerCase(),
  password: z.string().min(1, 'Password is required')
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters long')
});

export const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  phone: z.string().optional()
});
