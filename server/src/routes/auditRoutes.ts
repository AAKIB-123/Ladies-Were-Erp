import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorizeRole } from '../middleware/authorizeRole';
import { getAuditLogs } from '../controllers/auditController';

const router = Router();

// TEST-20: Audit logs are strictly restricted to Admin role.
// Staff role access is strictly rejected with 403 Forbidden.
router.use(authenticate);
router.use(authorizeRole(['admin']));

router.get('/', getAuditLogs);

export default router;
