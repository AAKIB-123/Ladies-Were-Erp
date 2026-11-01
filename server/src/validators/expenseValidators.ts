import { z } from 'zod';

export const createExpenseSchema = z.object({
  category: z.enum([
    'Rent',
    'Transport',
    'Packaging',
    'Electricity',
    'Staff Salary',
    'Shop Supplies',
    'Repairs',
    'Marketing',
    'Other'
  ]),
  amount: z.number().min(0.01, 'Expense amount must be greater than zero'),
  locationId: z.string().optional(),
  paymentMethod: z.enum(['cash', 'upi', 'bank_transfer']),
  description: z.string().min(1, 'Description is required').trim(),
  receiptNumber: z.string().trim().optional(),
  expenseDate: z.string().optional()
});
