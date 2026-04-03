import crypto from "crypto";

export function generateOtpDigits() {
  return String(crypto.randomInt(100000, 1000000));
}

export function hashEmailOtp(email, code) {
  const pepper = process.env.OTP_PEPPER || "change-me-in-production";
  return crypto.createHash("sha256").update(`${email.toLowerCase().trim()}:${code}:${pepper}`).digest("hex");
}

export function verifyOtpHash(email, code, hash) {
  if (!hash || !code || hash.length !== 64) return false;
  try {
    const tryHash = hashEmailOtp(email, code);
    return crypto.timingSafeEqual(Buffer.from(tryHash, "hex"), Buffer.from(hash, "hex"));
  } catch {
    return false;
  }
}

export function hashLoginOtp(email, code) {
  const pepper = process.env.OTP_PEPPER || "change-me-in-production";
  return crypto
    .createHash("sha256")
    .update(`login:${email.toLowerCase().trim()}:${code}:${pepper}`)
    .digest("hex");
}

export function verifyLoginOtpHash(email, code, hash) {
  if (!hash || !code || hash.length !== 64) return false;
  try {
    const tryHash = hashLoginOtp(email, code);
    return crypto.timingSafeEqual(Buffer.from(tryHash, "hex"), Buffer.from(hash, "hex"));
  } catch {
    return false;
  }
}

export function hashPasswordResetOtp(email, code) {
  const pepper = process.env.OTP_PEPPER || "change-me-in-production";
  return crypto
    .createHash("sha256")
    .update(`pwdreset:${email.toLowerCase().trim()}:${code}:${pepper}`)
    .digest("hex");
}

export function verifyPasswordResetOtpHash(email, code, hash) {
  if (!hash || !code || hash.length !== 64) return false;
  try {
    const tryHash = hashPasswordResetOtp(email, code);
    return crypto.timingSafeEqual(Buffer.from(tryHash, "hex"), Buffer.from(hash, "hex"));
  } catch {
    return false;
  }
}
