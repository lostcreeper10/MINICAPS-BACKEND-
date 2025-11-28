import app from './app';
import { PrismaClient } from '@prisma/client';

const PORT = process.env.PORT || 5000;
const prisma = new PrismaClient();

async function start() {
  await prisma.$connect();
  console.log('Neon DB connected via Prisma');
  app.listen(PORT, () => console.log(`Backend → http://localhost:${PORT}`));
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});