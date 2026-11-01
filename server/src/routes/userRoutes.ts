import { Router } from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  toggleUserStatus
} from '../controllers/userController';
import { authenticate } from '../middleware/auth';
import { authorizeRole } from '../middleware/authorizeRole';
import { validateRequest } from '../middleware/validate';
import {
  createUserSchema,
  updateUserSchema,
  toggleUserStatusSchema
} from '../validators/userValidators';

const router = Router();

// All user management routes require admin role
router.use(authenticate, authorizeRole(['admin']));

router.get('/', getUsers);
router.get('/:id', getUserById);
router.post('/', validateRequest({ body: createUserSchema }), createUser);
router.put('/:id', validateRequest({ body: updateUserSchema }), updateUser);
router.put('/:id/status', validateRequest({ body: toggleUserStatusSchema }), toggleUserStatus);

export default router;
