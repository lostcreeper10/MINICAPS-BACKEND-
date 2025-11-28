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
  name: string;
  phone: string;
  address: string;
}

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
}