import { Router } from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer
} from '../controllers/customerController';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import {
  createCustomerSchema,
  updateCustomerSchema
} from '../validators/customerValidators';

const router = Router();

router.use(authenticate);

// Staff and Admin can view and create customers
router.get('/', getCustomers);
router.get('/:id', getCustomerById);
router.post('/', validateRequest({ body: createCustomerSchema }), createCustomer);
router.put('/:id', validateRequest({ body: updateCustomerSchema }), updateCustomer);

export default router;
