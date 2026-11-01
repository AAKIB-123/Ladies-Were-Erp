import { Router } from 'express';
import {
  getInventory,
  getStockMovements,
  createTransfer,
  getTransfers
} from '../controllers/inventoryController';
import { authenticate } from '../middleware/auth';
import { authorizeRole } from '../middleware/authorizeRole';
import { validateRequest } from '../middleware/validate';
import { createStockTransferSchema } from '../validators/transferValidators';

const router = Router();

router.use(authenticate);

// Stock on hand (Staff filtered to assigned locations; Admin sees all)
router.get('/', getInventory);

// Stock movements audit ledger (Admin only)
router.get('/movements', authorizeRole(['admin']), getStockMovements);

// Inter-location stock transfers
router.get('/transfers', getTransfers);
router.post(
  '/transfers',
  validateRequest({ body: createStockTransferSchema }),
  createTransfer
);

export default router;
