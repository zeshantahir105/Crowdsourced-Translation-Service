import { verifyToken } from "../auth.js";
import { prisma } from "../db.js";

export async function requireAuth(req, res, next) {
  const h = req.headers.authorization;
  const token = h?.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const decoded = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        planTier: true,
        subscriptionExpiresAt: true,
        emailVerified: true,
      },
    });
    if (!user) return res.status(401).json({ error: "Invalid token" });
    if (!user.emailVerified) {
      return res.status(403).json({
        error: "Verify your email to continue.",
        code: "EMAIL_NOT_VERIFIED",
      });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function optionalAuth(req, res, next) {
  const h = req.headers.authorization;
  const token = h?.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    const decoded = verifyToken(token);
    prisma.user
      .findUnique({
        where: { id: decoded.sub },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          planTier: true,
          subscriptionExpiresAt: true,
          emailVerified: true,
        },
      })
      .then((user) => {
        req.user = user;
        next();
      })
      .catch(() => {
        req.user = null;
        next();
      });
  } catch {
    req.user = null;
    next();
  }
}
