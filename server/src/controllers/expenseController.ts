import { Request, Response, NextFunction } from 'express';
import { recordExpense } from '../services/financialLedgerService';
import { Expense } from '../models/Expense';
import { AppError } from '../middleware/errorHandler';

export async function createExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const { locationId } = req.body;

    if (locationId && user.role === 'staff' && !user.assignedLocations.includes(locationId)) {
      throw new AppError('Forbidden: Cannot record expense for an unassigned location.', 403);
    }

    const expense = await recordExpense({
      ...req.body,
      userId: user.id
    });

    res.status(201).json({
      success: true,
      message: 'Expense recorded successfully',
      expense
    });
  } catch (error) {
    next(error);
  }
}

export async function getExpenses(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const { locationId, category, startDate, endDate } = req.query;

    const filter: any = { isVoided: false };

    if (locationId) {
      if (user.role === 'staff' && !user.assignedLocations.includes(locationId as string)) {
        throw new AppError('Forbidden: Cannot view expenses for unassigned location.', 403);
      }
      filter.locationId = locationId;
    } else if (user.role === 'staff') {
      filter.$or = [
        { locationId: { $in: user.assignedLocations } },
        { locationId: null }
      ];
    }

    if (category) filter.category = category;

    if (startDate || endDate) {
      filter.expenseDate = {};
      if (startDate) filter.expenseDate.$gte = new Date(startDate as string);
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        filter.expenseDate.$lte = end;
      }
    }

    const expenses = await Expense.find(filter)
      .populate('locationId', 'name code')
      .populate('createdBy', 'name')
      .sort({ expenseDate: -1 })
      .limit(100);

    res.status(200).json({
      success: true,
      count: expenses.length,
      expenses
    });
  } catch (error) {
    next(error);
  }
}

export async function voidExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const expense = await Expense.findById(id);
    if (!expense) throw new AppError('Expense not found.', 404);

    expense.isVoided = true;
    expense.voidReason = reason;
    await expense.save();

    res.status(200).json({
      success: true,
      message: 'Expense voided successfully',
      expense
    });
  } catch (error) {
    next(error);
  }
}
