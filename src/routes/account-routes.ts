import { Router } from 'express';
import { AccountController } from '../controllers/account-controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/profile', AccountController.getProfile);
router.patch('/profile', AccountController.updateProfile);
router.patch('/password', AccountController.changePassword);

export default router;


