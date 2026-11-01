import { Router } from 'express';
import {
  login,
  getMe,
  updateProfile,
  changePassword,
  logout
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import {
  loginSchema,
  changePasswordSchema,
  updateProfileSchema
} from '../validators/authValidators';

const router = Router();

router.post('/login', validateRequest({ body: loginSchema }), login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, validateRequest({ body: updateProfileSchema }), updateProfile);
router.put('/change-password', authenticate, validateRequest({ body: changePasswordSchema }), changePassword);

export default router;
