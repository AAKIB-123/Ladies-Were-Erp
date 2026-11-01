import { Router } from 'express';
import {
  createExpense,
  getExpenses,
  voidExpense
} from '../controllers/expenseController';
import { authenticate } from '../middleware/auth';
import { authorizeRole } from '../middleware/authorizeRole';
import { validateRequest } from '../middleware/validate';
import { createExpenseSchema } from '../validators/expenseValidators';

const router = Router();

router.use(authenticate);

router.get('/', getExpenses);
router.post('/', validateRequest({ body: createExpenseSchema }), createExpense);
router.post('/:id/void', authorizeRole(['admin']), voidExpense);

export default router;
