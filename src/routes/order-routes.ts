import { Router } from 'express';
import { OrderController } from '../controllers/order-controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', OrderController.list);
router.get('/:orderId', OrderController.detail);
router.post('/', OrderController.create);

export default router;


