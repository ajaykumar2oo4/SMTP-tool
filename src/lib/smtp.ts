import nodemailer from 'nodemailer'
import { db } from './db'

export interface SmtpConfig {
  host: string
  port: number
  user: string
  pass: string
  fromName: string
  fromEmail: string
  replyTo?: string
}

export async function getSmtpConfig(): Promise<SmtpConfig | null> {
  const s = await db.settings.findUnique({ where: { id: 'singleton' } })
  if (!s || !s.smtpUser || !s.smtpPass || !s.fromEmail) return null
  return {
    host: s.smtpHost,
    port: s.smtpPort,
    user: s.smtpUser,
    pass: s.smtpPass,
    fromName: s.fromName,
    fromEmail: s.fromEmail,
    replyTo: s.replyTo || undefined,
  }
}

function makeTransporter(cfg: SmtpConfig) {
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
  })
}

export interface SendArgs {
  to: string
  toName: string
  subject: string
  body: string
}

export async function sendMail(args: SendArgs): Promise<{ ok: boolean; error?: string }> {
  const cfg = await getSmtpConfig()
  if (!cfg) {
    return { ok: false, error: 'SMTP not configured. Set host/user/pass/from email in Settings.' }
  }
  try {
    const transporter = makeTransporter(cfg)
    const from = cfg.fromName ? `"${cfg.fromName}" <${cfg.fromEmail}>` : cfg.fromEmail
    const to = args.toName ? `"${args.toName}" <${args.to}>` : args.to
    await transporter.sendMail({
      from,
      to,
      replyTo: cfg.replyTo || cfg.fromEmail,
      subject: args.subject,
      text: args.body,
    })
    return { ok: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown SMTP error'
    return { ok: false, error: msg }
  }
}
