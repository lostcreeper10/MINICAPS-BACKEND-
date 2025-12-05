// prisma/seed-admin.ts   ← REPLACE ENTIRE FILE WITH THIS
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@creeper.com';
  const password = 'admin123';
  const hashed = await bcrypt.hash(password, 12);

  await prisma.admin.upsert({
    where: { email },
    update: { password: hashed },
    create: {
      email,
      password: hashed,
      firstName: 'Lost',
      lastName: 'Creeper',
      isActive: true,
      permissions: ['PRODUCTS', 'ORDERS', 'USERS', 'ADMINS', 'SETTINGS'],
    },
  });

  console.log('ADMIN (table: Admin) CREATED SUCCESSFULLY');
  console.log('Login → http://localhost:3000/admin/login');
  console.log('Email    : admin@creeper.com');
  console.log('Password : admin123');
}

main()
  .finally(async () => await prisma.$disconnect());