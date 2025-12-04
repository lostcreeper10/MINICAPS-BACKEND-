// src/controllers/account-controller.ts
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';

export class AccountController {
  static async getProfile(req: Request, res: Response) {
    const userId = req.user!.id;  // ← FIXED
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    return res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        phone: user.phone,
        address: user.address,
        profileImage: user.profileImage,
        isOnboarded: user.isOnboarded,
      },
    });
  }

  static async updateProfile(req: Request, res: Response) {
    const userId = req.user!.id;  // ← FIXED
    const { firstName, middleName, lastName, phone, address, profileImage } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({ success: false, message: 'First and last name are required' });
    }

    try {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          firstName,
          middleName: middleName || null,
          lastName,
          name: [firstName, lastName].filter(Boolean).join(' '),
          phone,
          address,
          profileImage,
        },
      });

      res.json({ success: true, data: updated });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Failed to update profile' });
    }
  }

  static async changePassword(req: Request, res: Response) {
    const userId = req.user!.id;  // ← FIXED
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password required' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.password) {
      return res.status(400).json({ success: false, message: 'Password login not enabled' });
    }

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    res.json({ success: true, message: 'Password updated' });
  }
}
