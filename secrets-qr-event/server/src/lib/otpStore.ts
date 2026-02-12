type OtpEntry = {
  code: string;
  expiresAt: number;
};

const otpStore = new Map<string, OtpEntry>();
const DEFAULT_TTL_MS = 5 * 60 * 1000;

export function createOtp(phone: string, ttlMs = DEFAULT_TTL_MS) {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + ttlMs;
  otpStore.set(phone, { code, expiresAt });
  return code;
}

export function verifyOtp(phone: string, code: string) {
  const entry = otpStore.get(phone);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(phone);
    return false;
  }
  const ok = entry.code === code;
  if (ok) otpStore.delete(phone);
  return ok;
}

export function peekOtp(phone: string) {
  return otpStore.get(phone)?.code;
}
