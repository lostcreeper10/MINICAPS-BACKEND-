import { Router } from 'express';
import { CartController } from '../controllers/cart-controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// All cart routes require authentication
router.use(authMiddleware);

router.get('/', CartController.get);
router.post('/items', CartController.addItem);
router.put('/items/:itemId', CartController.updateItem);
router.delete('/items/:itemId', CartController.removeItem);
router.delete('/', CartController.clear);

export default router;

