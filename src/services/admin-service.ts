// src/services/admin-service.ts
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { AuthPayload } from '../types';

export class AdminService {
  static async login(email: string, password: string) {
    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin || !admin.isActive) throw new Error('Invalid credentials');

    const match = await bcrypt.compare(password, admin.password);
    if (!match) throw new Error('Invalid credentials');

    const payload: AuthPayload = {
      id: admin.id,          // ← CHANGED from adminId
      email: admin.email,
      role: 'ADMIN',
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' });

    return {
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
      },
    };
  }
}