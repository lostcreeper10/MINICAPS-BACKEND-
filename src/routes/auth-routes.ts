// src/routes/auth-routes.ts
import { Router } from 'express';
import { AuthController } from '../controllers/auth-controller';
import forgotPassword from '../controllers/ForgotPassword';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/signup', AuthController.signup);
router.post('/login', AuthController.login);
router.post('/forgot-password', forgotPassword);
router.post('/onboarding', authMiddleware, AuthController.completeOnboarding);
router.get('/me', authMiddleware, AuthController.me);
router.post('/logout', authMiddleware, AuthController.logout);
router.post('/verify-otp', AuthController.verifyOTP);
router.post('/reset-password', AuthController.resetPassword);

export default router;