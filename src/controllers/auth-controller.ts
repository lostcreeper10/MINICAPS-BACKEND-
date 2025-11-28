import { Request, Response } from 'express';
import { AuthService } from '../services/auth-service';
import { OnboardingService } from '../services/onboarding-service';
import { UserRepository } from '../repositories/user-repository';

export class AuthController {
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

  static async completeOnboarding(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const updated = await OnboardingService.complete(userId, req.body);
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
}