// src/app.ts
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth-routes';

const app = express();

app.use(
  cors({
    origin: 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json());

app.use('/api/auth', authRoutes);

app.get('/', (_, res) => {
  res.json({ message: 'Creeper API Running' });
});

export default app;