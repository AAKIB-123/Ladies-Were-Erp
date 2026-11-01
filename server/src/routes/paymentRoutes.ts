import { Router } from 'express';
import {
  recordPaymentHandler,
  getPayments
} from '../controllers/paymentController';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { recordPaymentSchema } from '../validators/paymentValidators';

const router = Router();

router.use(authenticate);

router.get('/', getPayments);
router.post('/', validateRequest({ body: recordPaymentSchema }), recordPaymentHandler);

export default router;
