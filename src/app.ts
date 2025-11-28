// backend/src/app.ts
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth-routes'; // ← MUST IMPORT

const app = express();

// CORS – allow frontend
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json());

// === CRITICAL: MOUNT AUTH ROUTES ===
app.use('/api/auth', authRoutes);
// =====================================

app.get('/', (_, res) => {
  res.json({ message: 'Creeper API Running 🛍️' });
});

export default app;