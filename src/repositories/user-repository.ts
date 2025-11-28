// src/repositories/user-repository.ts
import { PrismaClient } from '@prisma/client';
import { SignupDto } from '../types';

const prisma = new PrismaClient();

export class UserRepository {
  static async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }

  static async create(data: SignupDto & { password: string }) {
    return prisma.user.create({ data });
  }

  static async updateOnboarding(userId: string, data: any) {
    return prisma.user.update({
      where: { id: userId },
      data: { ...data, isOnboarded: true },
    });
  }

  static async findById(userId: string) {
    return prisma.user.findUnique({ where: { id: userId } });
  }
}
