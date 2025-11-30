// src/utils/otpStore.ts
type OtpEntry = { code: string; expiresAt: number };
type ResetEntry = { token: string; expiresAt: number };

const otpMap = new Map<string, OtpEntry>();
const resetMap = new Map<string, ResetEntry>();

export function generateOTP(email: string): string {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 min
  otpMap.set(email, { code, expiresAt });

  setTimeout(() => otpMap.delete(email), 5 * 60 * 1000 + 1000);
  return code;
}

export function verifyOTP(email: string, code: string): boolean {
  const entry = otpMap.get(email);
  if (!entry) return false;
  if (entry.expiresAt < Date.now()) {
    otpMap.delete(email);
    return false;
  }
  return entry.code === code;
}

export function deleteOTP(email: string) {
  otpMap.delete(email);
}

export function createResetToken(email: string): string {
  const token = require('crypto').randomBytes(20).toString('hex');
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 min
  resetMap.set(email, { token, expiresAt });
  setTimeout(() => resetMap.delete(email), 10 * 60 * 1000 + 1000);
  return token;
}

export function verifyResetToken(email: string, token: string): boolean {
  const entry = resetMap.get(email);
  if (!entry) return false;
  if (entry.expiresAt < Date.now()) {
    resetMap.delete(email);
    return false;
  }
  return entry.token === token;
}

export function deleteResetToken(email: string) {
  resetMap.delete(email);
}