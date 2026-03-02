import { Router } from 'express';
import { authController } from '../controllers/authController';
import { validate } from '../middleware/validator';
import { requireAuth, requireAuthenticated } from '../middleware/auth';
import { loginLimiter, registerLimiter, refreshLimiter } from '../middleware/rateLimit';
import { RegisterSchema, LoginSchema } from '../utils/validation';

const router = Router();

// POST /api/auth/register
router.post('/register', registerLimiter, validate(RegisterSchema), authController.register);

// POST /api/auth/login
router.post('/login', loginLimiter, validate(LoginSchema), authController.login);

// POST /api/auth/refresh  — reads httpOnly cookie, no body validation needed
router.post('/refresh', refreshLimiter, authController.refresh);

// POST /api/auth/logout
router.post('/logout', authController.logout);

// GET /api/auth/me  — requires valid access token
router.get('/me', requireAuth, requireAuthenticated, authController.me);

export default router;
