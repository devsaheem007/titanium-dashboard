import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter = null;
if (env.smtp.host) {
  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
  });
}

export const emailConfigured = () => Boolean(transporter);

export async function sendEmail({ to, subject, text, html }) {
  if (!transporter) {
    if (env.isProd) throw new Error('SMTP is not configured, cannot send email');
    // Development convenience: print the email so you can click the reset link.
    console.log(`\n[DEV EMAIL — SMTP not configured]\nTo: ${to}\nSubject: ${subject}\n${text}\n`);
    return;
  }
  await transporter.sendMail({ from: env.smtp.from, to, subject, text, html });
}
