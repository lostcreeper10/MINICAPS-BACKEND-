// src/app.ts
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth-routes';
import productRoutes from './routes/product-routes';
import orderRoutes from './routes/order-routes';
import accountRoutes from './routes/account-routes';
import adminRoutes from './routes/admin-routes';
import cartRoutes from './routes/cart-routes';

const app = express();

app.use(
  cors({
    origin: 'http://localhost:3000',
    credentials: true,
  })
);

// FIX: INCREASE PAYLOAD LIMIT
app.use(
  express.json({
    limit: '10mb', // ← CRITICAL: allows large base64 images
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: '10mb', // ← also for form data
  })
);

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/cart', cartRoutes);

app.get('/', (_, res) => {
  res.json({ message: 'Creeper API Running' });
});

export default app;