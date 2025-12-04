// src/services/onboarding-service.ts
import { UserRepository } from '../repositories/user-repository';
import { OnboardingDto } from '../types';

export class OnboardingService {
  static async complete(userId: string, dto: OnboardingDto) {
    const user = await UserRepository.findById(userId);
    if (!user) throw new Error('User not found');
    if (user.isOnboarded) throw new Error('Already onboarded');

    return UserRepository.updateOnboarding(userId, dto);
  }
}