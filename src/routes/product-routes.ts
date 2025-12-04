import { Router } from 'express';
import { ProductController } from '../controllers/product-controller';

const router = Router();

router.get('/', ProductController.list);
router.get('/:id', ProductController.detail);

export default router;


