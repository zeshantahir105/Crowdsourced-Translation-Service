/**
 * Transactional email for OTP verification via SMTP (Nodemailer).
 * Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM (see backend/.env.example).
 * In development, if SMTP is not configured, the OTP is logged to the console.
 */

import nodemailer from "nodemailer";

const DEFAULT_FROM = "LingoHub <noreply@example.com>";

function buildMail({ to, name, code }) {
  const subject = `${code} is your LingoHub verification code`;
  const safeName = name ? String(name).slice(0, 120) : "there";
  const html = `
    <p>Hi ${safeName},</p>
    <p>Your verification code is:</p>
    <p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${code}</p>
    <p>It expires in 15 minutes. If you did not sign up, you can ignore this email.</p>
  `;
  const text = `Hi ${safeName}, Your verification code is: ${code}. It expires in 15 minutes.`;
  return { subject, html, text };
}

function resolveFrom() {
  return process.env.EMAIL_FROM?.trim() || process.env.SMTP_FROM?.trim() || DEFAULT_FROM;
}

function smtpUseImplicitTls(port) {
  if (port === 465) return true;
  if (port === 587 || port === 2525) {
    const wantImplicit =
      process.env.SMTP_SECURE === "true" || process.env.SMTP_SECURE === "1";
    if (wantImplicit) {
      console.warn(
        "[email] SMTP_SECURE=true with port %s is usually wrong (use STARTTLS with secure=false). Using secure=false.",
        port
      );
    }
    return false;
  }
  return process.env.SMTP_SECURE === "true" || process.env.SMTP_SECURE === "1";
}

async function sendViaSmtp({ to, subject, html, text, from }) {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) throw new Error("SMTP_HOST is empty");

  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = smtpUseImplicitTls(port);

  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS ?? "";

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    ...(user ? { auth: { user, pass } } : {}),
  });

  await transporter.sendMail({
    from,
    to,
    subject,
    html,
    text,
  });
}

async function deliverOtpMail({ subject, html, text, to, devCode }) {
  const from = resolveFrom();
  if (process.env.SMTP_HOST?.trim()) {
    await sendViaSmtp({ to, subject, html, text, from });
    return { ok: true, via: "smtp" };
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Email not configured: set SMTP_HOST (and SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM) in backend/.env"
    );
  }
  console.warn(`[email] SMTP_HOST not set — dev OTP for ${to}: ${devCode}`);
  return { ok: true, dev: true };
}

export async function sendVerificationOtp({ to, name, code }) {
  const { subject, html, text } = buildMail({ to, name, code });
  return deliverOtpMail({ subject, html, text, to, devCode: code });
}

export async function sendLoginOtp({ to, name, code }) {
  const safeName = name ? String(name).slice(0, 120) : "there";
  const subject = `${code} is your LingoHub sign-in code`;
  const html = `
    <p>Hi ${safeName},</p>
    <p>Your sign-in verification code is:</p>
    <p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${code}</p>
    <p>It expires in 15 minutes. If you did not try to sign in, change your password.</p>
  `;
  const text = `Hi ${safeName}, Your LingoHub sign-in code is: ${code}. It expires in 15 minutes.`;
  return deliverOtpMail({ subject, html, text, to, devCode: code });
}
