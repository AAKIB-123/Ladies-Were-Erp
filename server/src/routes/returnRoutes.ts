import { Router } from 'express';
import {
  createReturnHandler,
  getReturnsHandler
} from '../controllers/returnController';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { createSalesReturnSchema } from '../validators/returnValidators';

const router = Router();

router.use(authenticate);

router.get('/', getReturnsHandler);
router.post(
  '/sales/:id/returns',
  validateRequest({ body: createSalesReturnSchema }),
  createReturnHandler
);

export default router;
