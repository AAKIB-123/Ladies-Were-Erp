import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorizeRole } from '../middleware/authorizeRole';
import {
  getDashboardSummary,
  getProfitAndLoss,
  getInventoryValuation
} from '../controllers/reportController';

const router = Router();

// TEST-02: All accounting and profit reports require Admin authentication.
// Staff role access is strictly rejected with 403 Forbidden.
router.use(authenticate);
router.use(authorizeRole(['admin']));

router.get('/dashboard', getDashboardSummary);
router.get('/profit-loss', getProfitAndLoss);
router.get('/valuation', getInventoryValuation);

export default router;
