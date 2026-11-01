import { Router } from 'express';
import {
  createPurchase,
  getPurchases,
  getPurchaseById
} from '../controllers/purchaseController';
import { authenticate } from '../middleware/auth';
import { authorizeRole } from '../middleware/authorizeRole';
import { validateRequest } from '../middleware/validate';
import { postPurchaseSchema } from '../validators/purchaseValidators';

const router = Router();

// Purchase operations are strictly restricted to Admin / Owner
router.use(authenticate, authorizeRole(['admin']));

router.get('/', getPurchases);
router.get('/:id', getPurchaseById);
router.post('/', validateRequest({ body: postPurchaseSchema }), createPurchase);

export default router;
