import crypto from "crypto";
import { prisma } from "../db.js";

export function generateApiKey() {
  const raw = `lh_${crypto.randomBytes(32).toString("hex")}`;
  const prefix = raw.slice(0, 12);
  return { raw, prefix, hash: crypto.createHash("sha256").update(raw).digest("hex") };
}

export async function validateApiKey(rawKey) {
  if (!rawKey?.startsWith("lh_")) return null;
  const hash = crypto.createHash("sha256").update(rawKey).digest("hex");
  const row = await prisma.apiKey.findUnique({ where: { keyHash: hash } });
  if (!row) return null;
  await prisma.apiKey.update({
    where: { id: row.id },
    data: { lastUsedAt: new Date() },
  });
  return row;
}
