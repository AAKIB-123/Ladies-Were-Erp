import { Router } from 'express';
import {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier
} from '../controllers/supplierController';
import { authenticate } from '../middleware/auth';
import { authorizeRole } from '../middleware/authorizeRole';
import { validateRequest } from '../middleware/validate';
import {
  createSupplierSchema,
  updateSupplierSchema
} from '../validators/supplierValidators';

const router = Router();

// Suppliers management is strictly restricted to Admin
router.use(authenticate, authorizeRole(['admin']));

router.get('/', getSuppliers);
router.get('/:id', getSupplierById);
router.post('/', validateRequest({ body: createSupplierSchema }), createSupplier);
router.put('/:id', validateRequest({ body: updateSupplierSchema }), updateSupplier);

export default router;
