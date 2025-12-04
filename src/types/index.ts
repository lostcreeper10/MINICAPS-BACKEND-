// src/types/index.ts
export interface SignupDto {
  email: string;
  password: string;
  name?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface OnboardingDto {
  firstName: string;
  middleName?: string;
  lastName: string;
  phone?: string;
  address?: string;
  profileImage?: string;
}

// UNIFIED FOR USER & ADMIN
export interface AuthPayload {
  id: string;        // ← This is userId OR adminId
  email: string;
  role: 'USER' | 'ADMIN';
}