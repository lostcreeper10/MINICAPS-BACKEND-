// src/controllers/auth-controller.ts
import { Request, Response } from 'express';
import { AuthService } from '../services/auth-service';           // USED
import { OnboardingService } from '../services/onboarding-service';
import { UserRepository } from '../repositories/user-repository';
import { addToBlacklist } from '../utils/tokenBlacklist';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';

// OTP utilities (in-memory)
import {
  generateOTP,
  verifyOTP as verifyStoredOTP,
  deleteOTP,
  createResetToken,
  verifyResetToken,
  deleteResetToken,
} from '../utils/otpStore';

// ---------- Email Transporter ----------
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export class AuthController {
  
  //  AuthService-based signup & login
  
  static async signup(req: Request, res: Response) {
    try {
      const result = await AuthService.signup(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (e: any) {
      res.status(400).json({ success: false, message: e.message });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const result = await AuthService.login(req.body);
      res.json({ success: true, data: result });
    } catch (e: any) {
      res.status(401).json({ success: false, message: e.message });
    }
  }

  
  // Onboarding, Me, Logout      
  
  static async completeOnboarding(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      await OnboardingService.complete(userId, req.body);
      res.json({ success: true, data: { isOnboarded: true } });
    } catch (e: any) {
      res.status(400).json({ success: false, message: e.message });
    }
  }

  static async me(req: Request, res: Response) {
    const userId = (req as any).user.userId;
    const user = await UserRepository.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        isOnboarded: user.isOnboarded,
        role: user.role,
      },
    });
  }

  static async logout(req: Request, res: Response) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(400).json({ success: false, message: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.decode(token) as { exp?: number } | null;
      const expiresIn = decoded?.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 0;
      addToBlacklist(token, Math.max(expiresIn, 1));
    } catch {
      // ignore
    }
    return res.json({ success: true, message: 'Logged out successfully' });
  }

  /*  OTP Password Reset (No DB) 
  
  // 1. Send OTP via email */
  static async sendOTP(req: Request, res: Response) {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await UserRepository.findByEmail(email);
    if (!user) {
      return res.json({ success: true, message: 'If the email exists, an OTP was sent.' });
    }

    const otp = generateOTP(email);

    const mailOptions = {
      from: process.env.SMTP_FROM || `"Creeper" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Your Password Reset Code',
      text: `Your 6-digit code: ${otp}\nExpires in 5 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center;">
          <h2>Password Reset</h2>
          <p>Your code is:</p>
          <h1 style="font-size: 2em; letter-spacing: 0.2em;">${otp}</h1>
          <p><strong>Expires in 5 minutes</strong></p>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      return res.json({ success: true, message: 'OTP sent to email' });
    } catch (err) {
      console.error('SMTP Error:', err);
      return res.status(500).json({ message: 'Failed to send email' });
    }
  }

  /** 2. Verify OTP → return resetToken */
  static async verifyOTP(req: Request, res: Response) {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ message: 'Email and code required' });

    const user = await UserRepository.findByEmail(email);
    if (!user) return res.status(404).json({ success: false, message: 'No account found' });

    if (!verifyStoredOTP(email, code)) {
      return res.status(400).json({ success: false, message: 'Invalid or expired code' });
    }

    deleteOTP(email);
    const resetToken = createResetToken(email); // 10 min

    return res.json({ success: true, message: 'OTP verified', resetToken });
  }

  /** 3. Reset password with resetToken */
  static async resetPassword(req: Request, res: Response) {
    const { email, password, resetToken } = req.body;
    if (!email || !password || !resetToken) {
      return res.status(400).json({ message: 'Email, password, and resetToken required' });
    }

    const user = await UserRepository.findByEmail(email);
    if (!user) return res.status(404).json({ success: false, message: 'No account found' });

    if (!verifyResetToken(email, resetToken)) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    const hashed = await bcrypt.hash(password, 10);
    await UserRepository.updateUserPass(email, { password: hashed });

    deleteResetToken(email);

    return res.json({ success: true, message: 'Password updated successfully' });
  }
}