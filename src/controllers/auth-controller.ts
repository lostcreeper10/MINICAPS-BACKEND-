// src/controllers/auth-controller.ts
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { generateOTP } from '../utils/otpStore';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD,
  },
});

async function sendOTP(email: string, otp: string) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM || `"Creeper" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Your Password Reset Code',
    html: `
      <div style="font-family: Arial; text-align: center; padding: 30px;">
        <h2>Password Reset</h2>
        <h1 style="font-size: 48px; letter-spacing: 10px;">${otp}</h1>
        <p>Expires in 10 minutes</p>
      </div>
    `,
  });
}

export interface AuthenticatedRequest extends Request {
  user?: { id: string; email: string; role: 'USER' | 'ADMIN' };
}

export class AuthController {
  static async signup(req: Request, res: Response) {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Required' });

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(400).json({ success: false, message: 'Email taken' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email: email.toLowerCase(), password: hashed, role: 'USER' },
    });

    const token = jwt.sign({ id: user.id, email: user.email, role: 'USER' }, process.env.JWT_SECRET!, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      data: { token, user: { id: user.id, email: user.email, isOnboarded: false } },
    });
  }

  static async login(req: Request, res: Response) {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    if (user.isBlocked) return res.status(403).json({ success: false, message: 'Blocked' });

    const token = jwt.sign({ id: user.id, email: user.email, role: 'USER' }, process.env.JWT_SECRET!, { expiresIn: '7d' });

    res.json({
      success: true,
      data: { token, user: { id: user.id, email: user.email, isOnboarded: user.isOnboarded } },
    });
  }

  static async forgotPassword(req: Request, res: Response) {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email required' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.json({ success: true, message: 'If exists, code sent' });

    const otp = generateOTP(email.toLowerCase());
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.passwordReset.upsert({
      where: { userId: user.id },
      update: { otp, expires },
      create: { userId: user.id, otp, expires },
    });

    await sendOTP(email, otp);
    res.json({ success: true, message: 'Code sent' });
  }

  static async verifyOtp(req: Request, res: Response) {
    const { email, code } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ success: false, message: 'Invalid email' });

    const record = await prisma.passwordReset.findUnique({ where: { userId: user.id } });
    if (!record || record.expires < new Date() || record.otp !== code) {
      return res.status(400).json({ success: false, message: 'Invalid/expired code' });
    }

    const resetToken = jwt.sign({ id: user.id, email: user.email, role: 'USER' }, process.env.JWT_SECRET!, { expiresIn: '15m' });
    await prisma.passwordReset.delete({ where: { userId: user.id } });

    res.json({ success: true, data: { resetToken } });
  }

  static async resetPassword(req: Request, res: Response) {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Token and password required' });
    }

    // Verify the reset token (short-lived JWT from verifyOtp)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };

    const hashed = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: decoded.id },
      data: { password: hashed },
    });

    return res.json({ success: true, message: 'Password reset successful' });
  } catch (error: any) {
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return res.status(400).json({ success: false, message: 'Invalid or expired token' });
    }
    console.error('Reset password error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

  // REAL ONBOARDING — THIS FIXES YOUR 501 ERROR
  static async completeOnboarding(req: AuthenticatedRequest, res: Response) {
    const userId = req.user!.id;
    const { firstName, middleName, lastName, phone, address, profileImage } = req.body;

    if (!firstName?.trim() || !lastName?.trim()) {
      return res.status(400).json({ success: false, message: 'First and last name required' });
    }

    try {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          firstName,
          middleName: middleName || null,
          lastName,
          name: [firstName, middleName, lastName].filter(Boolean).join(' ').trim(),
          phone: phone || null,
          address: address || null,
          profileImage: profileImage || null,
          isOnboarded: true,
        },
        select: {
          id: true,
          email: true,
          name: true,
          firstName: true,
          lastName: true,
          phone: true,
          address: true,
          profileImage: true,
          isOnboarded: true,
        },
      });

      return res.json({ success: true, data: updatedUser });
    } catch (error) {
      console.error('Onboarding error:', error);
      return res.status(500).json({ success: false, message: 'Failed to save profile' });
    }
  }

  // FIXED /me ENDPOINT
  static async me(req: AuthenticatedRequest, res: Response) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: {
          id: true,
          email: true,
          name: true,
          firstName: true,
          lastName: true,
          phone: true,
          address: true,
          profileImage: true,
          isOnboarded: true,
        },
      });

      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      res.json({ success: true, data: user });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  static async logout(_req: Request, res: Response) {
    res.json({ success: true, message: 'Logged out successfully' });
  }
}