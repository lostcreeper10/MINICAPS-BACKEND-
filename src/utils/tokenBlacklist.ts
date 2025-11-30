// src/utils/tokenBlacklist.ts
const blacklist = new Set<string>();

export const addToBlacklist = (token: string, expiresIn: number) => {
  blacklist.add(token);
  // Auto-remove after expiry
  setTimeout(() => blacklist.delete(token), expiresIn * 1000);
};

export const isBlacklisted = (token: string): boolean => {
  return blacklist.has(token);
};