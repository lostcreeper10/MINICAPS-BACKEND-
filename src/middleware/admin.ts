// src/middleware/admin.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { AuthPayload } from '../types';

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token' });
  }

  const token = auth.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;

    if (payload.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Admin access only' });
    }

    const admin = await prisma.admin.findUnique({ where: { id: payload.adminId || payload.id } });
    if (!admin || !admin.isActive) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    req.user = {
      id: admin.id,
      email: admin.email,
      role: 'ADMIN',
    };

    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};
