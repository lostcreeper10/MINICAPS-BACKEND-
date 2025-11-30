// src/controllers/ForgotPassword.ts
import { Request, Response } from 'express';
import { UserRepository } from '@/repositories/user-repository';
import { generateOTP } from '@/utils/otpStore';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export default async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email required' });

  try {
    const user = await UserRepository.findByEmail(email);
    if (!user) {
      return res.json({ success: true, message: 'If email exists, OTP sent.' });
    }

    const otp = generateOTP(email);

    const mail = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: 'Your Creeper Password Reset Code',
      text: `Your OTP: ${otp} (expires in 5 minutes)`,
      html: `
        <h2>Password Reset</h2>
        <p>Your code is: <strong style="font-size: 1.5em;">${otp}</strong></p>
        <p>Valid for <strong>5 minutes</strong>.</p>
      `,
    };

    await transporter.sendMail(mail);
    return res.json({ success: true, message: 'OTP sent to email' });
  } catch (err) {
    console.error('Email error:', err);
    return res.status(500).json({ message: 'Failed to send email' });
  }
}