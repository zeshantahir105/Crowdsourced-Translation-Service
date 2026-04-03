import { Router } from "express";
import rateLimit from "express-rate-limit";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { prisma } from "../db.js";
import { hashPassword, comparePassword, signToken } from "../auth.js";
import { requireAuth } from "../middleware/auth.js";
import { isBootstrapAdminEmail } from "../services/planService.js";
import { sendLoginOtp, sendPasswordResetOtp, sendVerificationOtp } from "../services/emailService.js";
import {
  generateOtpDigits,
  hashEmailOtp,
  hashLoginOtp,
  hashPasswordResetOtp,
  verifyLoginOtpHash,
  verifyOtpHash,
  verifyPasswordResetOtpHash,
} from "../services/otpService.js";

const router = Router();

const verifyEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

const resendVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many resend attempts; try again in an hour." },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many reset requests; try again in an hour." },
});

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
});

const SIGNUP_ROLES = ["CONSUMER", "TRANSLATOR", "REVIEWER"];

function normalizeSignupRole(role) {
  if (role && SIGNUP_ROLES.includes(String(role).toUpperCase())) {
    return String(role).toUpperCase();
  }
  return "CONSUMER";
}

function publicUser(u) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    planTier: u.planTier,
    subscriptionExpiresAt: u.subscriptionExpiresAt,
    emailVerified: u.emailVerified,
  };
}

function configureGoogle() {
  const id = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!id || !secret) return;

  passport.use(
    new GoogleStrategy(
      {
        clientID: id,
        clientSecret: secret,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:4000/auth/google/callback",
        passReqToCallback: true,
      },
      async (req, _accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error("No email from Google"));

          const stateRole = normalizeSignupRole(req.query.state);
          let user = await prisma.user.findFirst({
            where: { OR: [{ googleId: profile.id }, { email }] },
          });

          if (!user) {
            const role = isBootstrapAdminEmail(email) ? "ADMIN" : stateRole;
            user = await prisma.user.create({
              data: {
                email,
                name: profile.displayName || email.split("@")[0],
                googleId: profile.id,
                role,
                planTier: "FREE",
                emailVerified: true,
              },
            });
            await prisma.reputation.create({
              data: { userId: user.id, points: 0, badges: [] },
            });
          } else {
            if (!user.googleId) {
              user = await prisma.user.update({
                where: { id: user.id },
                data: { googleId: profile.id, emailVerified: true },
              });
            }
          }

          return done(null, user);
        } catch (e) {
          return done(e);
        }
      }
    )
  );
}

configureGoogle();

router.post("/signup", async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: "email, password, name required" });
    }
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ error: "Email already registered" });

    let finalRole = normalizeSignupRole(role);
    if (isBootstrapAdminEmail(email)) finalRole = "ADMIN";

    const passwordHash = await hashPassword(password);
    const code = generateOtpDigits();
    const codeHash = hashEmailOtp(email, code);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: finalRole,
        planTier: "FREE",
        emailVerified: false,
        emailVerificationCodeHash: codeHash,
        emailVerificationExpiresAt: expiresAt,
      },
    });
    await prisma.reputation.create({
      data: { userId: user.id, points: 0, badges: [] },
    });

    try {
      await sendVerificationOtp({ to: email, name, code });
    } catch (err) {
      console.error("Verification email failed:", err);
      await prisma.user.delete({ where: { id: user.id } });
      return res.status(503).json({
        error:
          "Could not send verification email. Check SMTP_HOST, SMTP_USER, SMTP_PASS, and EMAIL_FROM in backend/.env, or try again shortly.",
      });
    }

    res.status(201).json({
      needsVerification: true,
      message: "Check your email for a 6-digit code.",
      email,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Signup failed" });
  }
});

router.post("/verify-email", verifyEmailLimiter, async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: "email and code required" });
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash) {
      return res.status(400).json({ error: "Invalid request" });
    }
    if (user.emailVerified) {
      return res.status(400).json({ error: "Email already verified", code: "ALREADY_VERIFIED" });
    }
    if (!user.emailVerificationCodeHash || !user.emailVerificationExpiresAt) {
      return res.status(400).json({ error: "No pending code. Request a new one.", code: "NO_CODE" });
    }
    if (new Date() > user.emailVerificationExpiresAt) {
      return res.status(400).json({ error: "Code expired. Request a new code.", code: "EXPIRED" });
    }
    const normalized = String(code).replace(/\s/g, "");
    if (!/^\d{6}$/.test(normalized)) {
      return res.status(400).json({ error: "Enter the 6-digit code" });
    }
    if (!verifyOtpHash(email, normalized, user.emailVerificationCodeHash)) {
      return res.status(400).json({ error: "Incorrect code" });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationCodeHash: null,
        emailVerificationExpiresAt: null,
      },
    });

    const token = signToken({ sub: user.id });
    res.json({ token, user: publicUser(updated) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Verification failed" });
  }
});

router.post("/resend-verification", resendVerificationLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "email required" });
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash || user.emailVerified) {
      return res.json({ ok: true });
    }
    const code = generateOtpDigits();
    const codeHash = hashEmailOtp(email, code);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationCodeHash: codeHash,
        emailVerificationExpiresAt: expiresAt,
      },
    });
    try {
      await sendVerificationOtp({ to: email, name: user.name, code });
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Could not send email" });
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Resend failed" });
  }
});

router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "email and password required" });
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const ok = await comparePassword(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    if (!user.emailVerified) {
      return res.status(403).json({
        error: "Verify your email before signing in.",
        code: "EMAIL_NOT_VERIFIED",
      });
    }

    const code = generateOtpDigits();
    const codeHash = hashLoginOtp(email, code);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        loginOtpCodeHash: codeHash,
        loginOtpExpiresAt: expiresAt,
      },
    });

    try {
      await sendLoginOtp({ to: email, name: user.name, code });
    } catch (err) {
      console.error("Login OTP email failed:", err);
      await prisma.user.update({
        where: { id: user.id },
        data: { loginOtpCodeHash: null, loginOtpExpiresAt: null },
      });
      return res.status(503).json({
        error:
          "Could not send sign-in code. Check SMTP_HOST, SMTP_USER, SMTP_PASS, and EMAIL_FROM in backend/.env.",
      });
    }

    res.json({
      needsLoginOtp: true,
      message: "Check your email for a 6-digit sign-in code.",
      email,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Login failed" });
  }
});

router.post("/verify-login-otp", verifyEmailLimiter, async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: "email and code required" });
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash || !user.emailVerified) {
      return res.status(400).json({ error: "Invalid request" });
    }
    if (!user.loginOtpCodeHash || !user.loginOtpExpiresAt) {
      return res.status(400).json({
        error: "No pending sign-in code. Sign in with your password again.",
        code: "NO_LOGIN_OTP",
      });
    }
    if (new Date() > user.loginOtpExpiresAt) {
      return res.status(400).json({ error: "Code expired. Sign in again.", code: "EXPIRED" });
    }
    const normalized = String(code).replace(/\s/g, "");
    if (!/^\d{6}$/.test(normalized)) {
      return res.status(400).json({ error: "Enter the 6-digit code" });
    }
    if (!verifyLoginOtpHash(email, normalized, user.loginOtpCodeHash)) {
      return res.status(400).json({ error: "Incorrect code" });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { loginOtpCodeHash: null, loginOtpExpiresAt: null },
    });

    const token = signToken({ sub: user.id });
    res.json({ token, user: publicUser(updated) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Verification failed" });
  }
});

router.post("/forgot-password", forgotPasswordLimiter, async (req, res) => {
  try {
    const emailRaw = req.body?.email;
    const input = typeof emailRaw === "string" ? emailRaw.trim() : "";
    if (!input) {
      return res.status(400).json({ error: "email required" });
    }
    const user = await prisma.user.findFirst({
      where: { email: { equals: input, mode: "insensitive" } },
    });
    if (!user?.passwordHash) {
      return res.json({
        ok: true,
        message: "If an account exists for that email, we sent a reset code.",
      });
    }

    const code = generateOtpDigits();
    const codeHash = hashPasswordResetOtp(user.email, code);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetCodeHash: codeHash,
        passwordResetExpiresAt: expiresAt,
        loginOtpCodeHash: null,
        loginOtpExpiresAt: null,
      },
    });

    try {
      await sendPasswordResetOtp({ to: user.email, name: user.name, code });
    } catch (err) {
      console.error("Password reset email failed:", err);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetCodeHash: null,
          passwordResetExpiresAt: null,
        },
      });
      return res.status(503).json({
        error:
          "Could not send email. Check SMTP_HOST, SMTP_USER, SMTP_PASS, and EMAIL_FROM in backend/.env.",
      });
    }

    res.json({
      ok: true,
      message: "If an account exists for that email, we sent a reset code.",
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Request failed" });
  }
});

router.post("/reset-password", resetPasswordLimiter, async (req, res) => {
  try {
    const emailRaw = req.body?.email;
    const input = typeof emailRaw === "string" ? emailRaw.trim() : "";
    const code = req.body?.code;
    const newPassword = req.body?.newPassword;
    if (!input || !code || !newPassword) {
      return res.status(400).json({ error: "email, code, and newPassword required" });
    }
    if (String(newPassword).length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const user = await prisma.user.findFirst({
      where: { email: { equals: input, mode: "insensitive" } },
    });
    if (!user?.passwordHash) {
      return res.status(400).json({ error: "Invalid or expired code" });
    }
    if (!user.passwordResetCodeHash || !user.passwordResetExpiresAt) {
      return res.status(400).json({
        error: "No reset in progress. Request a new code from Forgot password.",
        code: "NO_RESET",
      });
    }
    if (new Date() > user.passwordResetExpiresAt) {
      return res.status(400).json({ error: "Code expired. Request a new one.", code: "EXPIRED" });
    }
    const normalized = String(code).replace(/\s/g, "");
    if (!/^\d{6}$/.test(normalized)) {
      return res.status(400).json({ error: "Enter the 6-digit code" });
    }
    if (!verifyPasswordResetOtpHash(user.email, normalized, user.passwordResetCodeHash)) {
      return res.status(400).json({ error: "Incorrect code" });
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetCodeHash: null,
        passwordResetExpiresAt: null,
        loginOtpCodeHash: null,
        loginOtpExpiresAt: null,
      },
    });

    res.json({ ok: true, message: "Password updated. You can sign in now." });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Reset failed" });
  }
});

router.post("/resend-login-otp", resendVerificationLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "email and password required" });
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash || !user.emailVerified) {
      return res.json({ ok: true });
    }
    const pwOk = await comparePassword(password, user.passwordHash);
    if (!pwOk) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const code = generateOtpDigits();
    const codeHash = hashLoginOtp(email, code);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        loginOtpCodeHash: codeHash,
        loginOtpExpiresAt: expiresAt,
      },
    });
    try {
      await sendLoginOtp({ to: email, name: user.name, code });
    } catch (err) {
      console.error(err);
      return res.status(503).json({ error: "Could not send email" });
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Resend failed" });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  const full = await prisma.user.findUnique({
    where: { id: req.user.id },
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
  const rep = await prisma.reputation.findUnique({
    where: { userId: req.user.id },
  });
  res.json({ user: full ? publicUser(full) : publicUser(req.user), reputation: rep });
});

router.get("/google", (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({ error: "Google OAuth is not configured" });
  }
  const role = normalizeSignupRole(req.query.role);
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
    state: role,
  })(req, res, next);
});

router.get("/google/callback", (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({ error: "Google OAuth is not configured" });
  }
  passport.authenticate("google", { session: false, failureRedirect: false })(
    req,
    res,
    next
  );
}, (req, res) => {
  const user = req.user;
  if (!user) {
    const front = process.env.FRONTEND_URL || "http://localhost:5173";
    return res.redirect(`${front}/login?error=google`);
  }
  const token = signToken({ sub: user.id });
  const front = process.env.FRONTEND_URL || "http://localhost:5173";
  res.redirect(`${front}/oauth/callback?token=${encodeURIComponent(token)}`);
});

export default router;
