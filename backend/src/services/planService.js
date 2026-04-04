/** @typedef {{ planTier: string, subscriptionExpiresAt?: Date | null }} PlanUser */

export function isPremiumUser(user) {
  if (!user || user.planTier !== "PREMIUM") return false;
  if (user.subscriptionExpiresAt) {
    return new Date(user.subscriptionExpiresAt) > new Date();
  }
  return true;
}

export function maxTextChars(user) {
  return isPremiumUser(user)
    ? Number(process.env.PREMIUM_MAX_TEXT_CHARS || 100000)
    : Number(process.env.FREE_MAX_TEXT_CHARS || 5000);
}

export function freeDocMaxBytes() {
  return Number(process.env.FREE_DOC_MAX_BYTES || 256 * 1024);
}

export function premiumDocMaxBytes() {
  return Number(process.env.PREMIUM_DOC_MAX_BYTES || 10 * 1024 * 1024);
}

/** Public snapshot for UI (defaults match env fallbacks in this module). */
export function getPlanLimitsSnapshot() {
  return {
    free: {
      maxTextChars: Number(process.env.FREE_MAX_TEXT_CHARS || 5000),
      maxDocBytes: freeDocMaxBytes(),
      allowedDocExtensions: ["txt"],
    },
    premium: {
      maxTextChars: Number(process.env.PREMIUM_MAX_TEXT_CHARS || 100000),
      maxDocBytes: premiumDocMaxBytes(),
      allowedDocExtensions: ["txt", "docx", "pdf"],
    },
  };
}

/** Free: .txt only. Premium: .txt, .docx, .pdf */
export function allowedDocMimes(user) {
  const base = ["text/plain"];
  if (isPremiumUser(user)) {
    return [...base, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/pdf"];
  }
  return base;
}

export function adminEmailSet() {
  const raw = process.env.LINGOHUB_ADMIN_EMAILS || "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isBootstrapAdminEmail(email) {
  return adminEmailSet().has((email || "").toLowerCase());
}
