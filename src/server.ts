// src/server.ts
import app from './app';
import { prisma } from './lib/prisma';

const PORT = process.env.PORT || 8000; 

async function start() {
  await prisma.$connect();
  console.log('Neon DB connected via Prisma');
  app.listen(PORT, () => console.log(`Backend → http://localhost:${PORT}`));
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});