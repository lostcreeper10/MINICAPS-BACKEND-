// src/repositories/user-repository.ts
import { PrismaClient } from '@prisma/client';
import { SignupDto, LoginDto } from '../types';

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

  static async updateUserPass(email: string, data: Partial<LoginDto>) {
    return prisma.user.update({ where: { email }, data });
  }

  static async findById(userId: string) {
    return prisma.user.findUnique({ where: { id: userId } });
  }

  // ADD THIS METHOD
  static async update(
    email: string,
    data: { password?: string; otp?: string | null; otpExpires?: Date | null }
  ) {
    return prisma.user.update({
      where: { email },
      data,
    });
  }
}