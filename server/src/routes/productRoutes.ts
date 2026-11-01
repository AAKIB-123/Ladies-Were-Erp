import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  toggleProductStatus
} from '../controllers/productController';
import { authenticate } from '../middleware/auth';
import { authorizeRole } from '../middleware/authorizeRole';
import { validateRequest } from '../middleware/validate';
import {
  createProductSchema,
  updateProductSchema,
  toggleProductStatusSchema
} from '../validators/productValidators';

const router = Router();

router.use(authenticate);

// Staff and Admin can view products (Costs are redacted for Staff by controller)
router.get('/', getProducts);
router.get('/:id', getProductById);

// Admin-only management
router.post(
  '/',
  authorizeRole(['admin']),
  validateRequest({ body: createProductSchema }),
  createProduct
);

router.put(
  '/:id',
  authorizeRole(['admin']),
  validateRequest({ body: updateProductSchema }),
  updateProduct
);

router.put(
  '/:id/status',
  authorizeRole(['admin']),
  validateRequest({ body: toggleProductStatusSchema }),
  toggleProductStatus
);

export default router;
