// src/services/admin-service.ts
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { AuthPayload } from '../types';

export class AdminService {
  static async login(email: string, password: string) {
    console.log(`[AdminService] Login attempt for email: ${email}`);
    const admin = await prisma.admin.findUnique({ where: { email } });
    
    if (!admin) {
      console.log(`[AdminService] Admin not found for email: ${email}`);
      throw new Error('Invalid credentials');
    }
    
    if (!admin.isActive) {
      console.log(`[AdminService] Admin account is inactive for email: ${email}`);
      throw new Error('Invalid credentials');
    }

    console.log(`[AdminService] Admin found, comparing password...`);
    const match = await bcrypt.compare(password, admin.password);
    if (!match) {
      console.log(`[AdminService] Password mismatch for email: ${email}`);
      throw new Error('Invalid credentials');
    }
    
    console.log(`[AdminService] Password match successful for email: ${email}`);

    const payload: AuthPayload = {
      id: admin.id,          // ← CHANGED from adminId
      email: admin.email,
      role: 'ADMIN',
    };

    if (!process.env.JWT_SECRET) {
      console.error('[AdminService] JWT_SECRET is not set!');
      throw new Error('Server configuration error');
    }
    
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

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