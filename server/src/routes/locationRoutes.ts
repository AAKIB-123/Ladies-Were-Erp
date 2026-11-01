import { Router } from 'express';
import {
  getLocations,
  getLocationById,
  createLocation,
  updateLocation,
  toggleLocationStatus
} from '../controllers/locationController';
import { authenticate } from '../middleware/auth';
import { authorizeRole } from '../middleware/authorizeRole';
import { validateLocationAccess } from '../middleware/locationGuard';
import { validateRequest } from '../middleware/validate';
import {
  createLocationSchema,
  updateLocationSchema,
  toggleLocationStatusSchema
} from '../validators/locationValidators';

const router = Router();

router.use(authenticate);

router.get('/', getLocations);
router.get('/:id', validateLocationAccess(), getLocationById);

// Admin-only location management
router.post(
  '/',
  authorizeRole(['admin']),
  validateRequest({ body: createLocationSchema }),
  createLocation
);

router.put(
  '/:id',
  authorizeRole(['admin']),
  validateRequest({ body: updateLocationSchema }),
  updateLocation
);

router.put(
  '/:id/status',
  authorizeRole(['admin']),
  validateRequest({ body: toggleLocationStatusSchema }),
  toggleLocationStatus
);

export default router;
