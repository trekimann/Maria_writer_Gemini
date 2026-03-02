import { Router } from 'express';
import { adminController } from '../controllers/adminController';
import { validate } from '../middleware/validator';
import { requireAuth, requireRole } from '../middleware/auth';
import { adminResetLimiter } from '../middleware/rateLimit';
import { ResetPasswordSchema } from '../utils/validation';
import { UserRole } from '@prisma/client';

const router = Router();

// All admin routes require authentication + ADMIN role
router.use(requireAuth, requireRole(UserRole.ADMIN));

// GET /api/admin/users?page=1&limit=20&search=email
router.get('/users', adminController.listUsers);

// GET /api/admin/users/:id
router.get('/users/:id', adminController.getUser);

// PUT /api/admin/users/:id/password
router.put(
  '/users/:id/password',
  adminResetLimiter,
  validate(ResetPasswordSchema),
  adminController.resetPassword,
);

export default router;
