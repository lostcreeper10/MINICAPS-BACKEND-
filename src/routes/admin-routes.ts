// src/routes/admin-routes.ts
import { Router } from 'express';
import AdminController from '../controllers/admin-controller';
import { requireAdmin } from '../middleware/admin';

const router = Router();

// PUBLIC
router.post('/login', AdminController.login);

// PROTECTED
router.use(requireAdmin);

router.get('/me', AdminController.me);
router.get('/overview', AdminController.overview);
router.get('/admins', AdminController.listAdmins);
router.get('/products', AdminController.listProducts);
router.post('/products', AdminController.createProduct);
router.put('/products/:productId', AdminController.updateProduct);
router.delete('/products/:productId', AdminController.deleteProduct);
router.get('/orders', AdminController.listOrders);
router.patch('/orders/:orderId/status', AdminController.updateOrderStatus);
router.get('/users', AdminController.listBuyers);
router.patch('/users/:userId/block', AdminController.toggleBlock);

export default router;