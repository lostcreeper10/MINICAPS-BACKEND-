// src/services/token-service.ts
import { prisma } from '../lib/prisma';
import { v4 as uuidv4 } from 'uuid';

export class TokenService {
  static async create(userId: string, type: 'REFRESH' | 'EMAIL_VERIFY' | 'PASSWORD_RESET') {
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    return prisma.token.create({
      data: {
        token,
        type,
        expiresAt,
        userId,
      },
    });
  }

  static async findByToken(token: string) {
    return prisma.token.findUnique({
      where: { token },
      include: { user: true },
    });
  }

  static async consume(tokenId: string) {
    return prisma.token.update({
      where: { id: tokenId },
      data: { consumedAt: new Date() },
    });
  }
}