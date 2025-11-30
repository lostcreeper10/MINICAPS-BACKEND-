// src/controllers/ForgotPassword.ts
import { Request, Response } from 'express';
import { UserRepository } from '@/repositories/user-repository';
import { generateOTP } from '@/utils/otpStore';

export default async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  const user = await UserRepository.findByEmail(email);

  // Security: always return success
  if (!user) {
    return res.json({ success: true, message: 'If email exists, OTP sent.' });
  }

  const otp = generateOTP(email);

  // TODO: use real email provider (Nodemailer / Resend)
  console.log(`OTP for ${email}: ${otp}`);

  return res.json({
    success: true,
    message: 'OTP sent to your email.',
  });
}
