import { Router } from 'express';
import { AuthController } from '../controllers/auth-controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/signup', AuthController.signup);
router.post('/login', AuthController.login);

// PROTECT onboarding route
router.post('/onboarding', authMiddleware, AuthController.completeOnboarding);

// Protect /me as well
router.get('/me', authMiddleware, AuthController.me);

export default router;
