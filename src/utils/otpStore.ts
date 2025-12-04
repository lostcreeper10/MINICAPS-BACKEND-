// src/utils/otpStore.ts
type OtpEntry = { code: string; expiresAt: number };
type ResetEntry = { token: string; expiresAt: number };

const otpMap = new Map<string, OtpEntry>();
const resetMap = new Map<string, ResetEntry>();

export function generateOTP(email: string, scope?: string): string {
  const key = scope ? `${email}:${scope}` : email.toLowerCase();
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 min
  otpMap.set(key, { code, expiresAt });

  setTimeout(() => otpMap.delete(key), 5 * 60 * 1000 + 1000);
  return code;
}

export function verifyOTP(email: string, code: string, scope?: string): boolean {
  const key = scope ? `${email}:${scope}` : email.toLowerCase();
  const entry = otpMap.get(key);
  if (!entry) return false;
  if (entry.expiresAt < Date.now()) {
    otpMap.delete(key);
    return false;
  }
  return entry.code === code;
}

export function deleteOTP(email: string, scope?: string) {
  const key = scope ? `${email}:${scope}` : email.toLowerCase();
  otpMap.delete(key);
}

export function createResetToken(email: string): string {
  const crypto = require('crypto');
  const token = crypto.randomBytes(20).toString('hex');
  const key = email.toLowerCase();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 min
  resetMap.set(key, { token, expiresAt });
  setTimeout(() => resetMap.delete(key), 10 * 60 * 1000 + 1000);
  return token;
}

export function verifyResetToken(email: string, token: string): boolean {
  const key = email.toLowerCase();
  const entry = resetMap.get(key);
  if (!entry) return false;
  if (entry.expiresAt < Date.now()) {
    resetMap.delete(key);
    return false;
  }
  return entry.token === token;
}

export function deleteResetToken(email: string) {
  const key = email.toLowerCase();
  resetMap.delete(key);
}