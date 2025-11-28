// src/services/auth-service.ts
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/user-repository';
import { LoginDto, SignupDto, AuthPayload } from '../types';

export class AuthService {
  static async signup(dto: SignupDto) {
    const existing = await UserRepository.findByEmail(dto.email);
    if (existing) throw new Error('Email already exists');

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await UserRepository.create({ ...dto, password: hashed });

    const payload: AuthPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        isOnboarded: user.isOnboarded,
      },
    };
  }

  static async login(dto: LoginDto) {
    const user = await UserRepository.findByEmail(dto.email);
    if (!user) throw new Error('Invalid credentials');

    // 🔥 FIX: password can be null in Prisma schema
    if (!user.password) throw new Error('Invalid credentials');

    const match = await bcrypt.compare(dto.password, user.password);
    if (!match) throw new Error('Invalid credentials');

    const payload: AuthPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        isOnboarded: user.isOnboarded,
      },
    };
  }
}
