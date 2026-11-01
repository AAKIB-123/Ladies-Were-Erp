import { Router } from 'express';
import {
  createSale,
  getSales,
  getSaleById,
  reconcileSale,
  voidSale
} from '../controllers/salesController';
import { authenticate } from '../middleware/auth';
import { authorizeRole } from '../middleware/authorizeRole';
import { validateLocationAccess } from '../middleware/locationGuard';
import { validateRequest } from '../middleware/validate';
import {
  createQuickSaleSchema,
  createProductWiseSaleSchema,
  reconcileSaleSchema,
  voidSaleSchema
} from '../validators/saleValidators';

const router = Router();

router.use(authenticate);

// List and view sales (staff filtered to assigned locations)
router.get('/', getSales);
router.get('/:id', getSaleById);

// Record sale (Quick Sale or Product-Wise Sale)
router.post('/', validateLocationAccess(), createSale);

// Quick Sale reconciliation (Admin only)
router.post(
  '/:id/reconcile',
  authorizeRole(['admin']),
  validateRequest({ body: reconcileSaleSchema }),
  reconcileSale
);

// Void sale (Admin only with mandatory reason)
router.post(
  '/:id/void',
  authorizeRole(['admin']),
  validateRequest({ body: voidSaleSchema }),
  voidSale
);

export default router;
