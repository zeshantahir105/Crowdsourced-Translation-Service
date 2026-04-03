/**
 * Transactional OTP email — SMTP only (Nodemailer).
 * Required env: SMTP_HOST, SMTP_PORT (optional, default 587), SMTP_USER / SMTP_PASS (if your relay requires auth),
 * EMAIL_FROM (or SMTP_FROM). See backend/.env.example.
 */

import nodemailer from "nodemailer";

const DEFAULT_FROM = "LingoHub <noreply@example.com>";

/** Single transporter — avoids opening a new TCP/TLS stack on every OTP (reduces failures and log noise on Render). */
let transporter = null;

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

function getTransporter() {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) {
    const e = new Error(
      "Email is not configured: set SMTP_HOST (and typically SMTP_USER, SMTP_PASS, EMAIL_FROM) in the server environment."
    );
    e.code = "EMAIL_SMTP_NOT_CONFIGURED";
    throw e;
  }

  if (transporter) return transporter;

  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = smtpUseImplicitTls(port);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS ?? "";

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 20_000,
    logger: false,
    debug: false,
    ...(user ? { auth: { user, pass } } : {}),
  });

  return transporter;
}

async function sendViaSmtp({ to, subject, html, text }) {
  const from = resolveFrom();
  try {
    const tx = getTransporter();
    await tx.sendMail({ from, to, subject, html, text });
  } catch (e) {
    transporter = null;
    throw e;
  }
}

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

export async function sendVerificationOtp({ to, name, code }) {
  const { subject, html, text } = buildMail({ to, name, code });
  await sendViaSmtp({ to, subject, html, text });
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
  await sendViaSmtp({ to, subject, html, text });
}

export async function sendPasswordResetOtp({ to, name, code }) {
  const safeName = name ? String(name).slice(0, 120) : "there";
  const subject = `${code} is your LingoHub password reset code`;
  const html = `
    <p>Hi ${safeName},</p>
    <p>We received a request to reset your LingoHub password. Use this code:</p>
    <p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${code}</p>
    <p>It expires in 15 minutes. If you did not ask for this, you can ignore this email.</p>
  `;
  const text = `Hi ${safeName}, Your LingoHub password reset code is: ${code}. It expires in 15 minutes.`;
  await sendViaSmtp({ to, subject, html, text });
}
