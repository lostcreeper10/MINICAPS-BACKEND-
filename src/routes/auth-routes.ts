// src/routes/auth-routes.ts
import { Router } from 'express';
import { AuthController } from '../controllers/auth-controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/signup', AuthController.signup);
router.post('/login', AuthController.login);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/verify-otp', AuthController.verifyOtp);           // ← matches verifyOtp
router.post('/reset-password', AuthController.resetPassword);

router.post('/onboarding', authMiddleware, AuthController.completeOnboarding);
router.get('/me', authMiddleware, AuthController.me);
router.post('/logout', authMiddleware, AuthController.logout);

export default router;