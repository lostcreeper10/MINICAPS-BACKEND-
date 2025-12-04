// src/controllers/ForgotPassword.ts
import { Request, Response } from 'express';
import { UserRepository } from '../repositories/user-repository';
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

export default async function forgotPassword(req: Request, res: Response) {
  const email = (req.body.email as string)?.toLowerCase();
  if (!email) return res.status(400).json({ success: false, message: 'Email required' });

  try {
    const user = await UserRepository.findByEmail(email);
    if (!user) {
      return res.json({ success: true, message: 'If the email exists, an OTP was sent.' });
    }

    const otp = generateOTP(email);

    const mail = {
      from: process.env.SMTP_FROM || `"Creeper" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Your Creeper Password Reset Code',
      text: `Your OTP: ${otp} (expires in 5 minutes)`,
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center;">
          <h2>Password Reset</h2>
          <p>Your code is:</p>
          <h1 style="font-size: 2em; letter-spacing: 0.2em;">${otp}</h1>
          <p>Valid for <strong>5 minutes</strong>.</p>
        </div>
      `,
    };

    await transporter.sendMail(mail);
    return res.json({ success: true, message: 'OTP sent to email' });
  } catch (err) {
    console.error('Email error:', err);
    return res.status(500).json({ success: false, message: 'Failed to send email' });
  }
}