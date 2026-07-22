/**
 * Gmail SMTP mailer for the morning digest. The operator keeps the mailing
 * list (Upstash set) and pushes "발송" on /admin/newsletter — no third-party
 * newsletter service involved.
 *
 * Env: GMAIL_USER (full address), GMAIL_APP_PASSWORD (Google App Password —
 * requires 2FA on the account; regular passwords do not work with SMTP).
 * Gmail sending caps apply (~500 recipients/day for a personal account).
 */
import nodemailer from "nodemailer";

function cleanEnv(value: string | undefined): string {
  if (!value) return "";
  let out = "";
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 0x21 && code <= 0x7e) out += ch;
  }
  return out;
}

export function gmailConfigured(): boolean {
  return Boolean(
    cleanEnv(process.env.GMAIL_USER) && cleanEnv(process.env.GMAIL_APP_PASSWORD)
  );
}

export interface OutgoingMail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Send mails sequentially over one pooled connection. Returns per-recipient
 * failures instead of throwing so a bad address can't abort the run.
 */
export async function sendViaGmail(
  mails: OutgoingMail[]
): Promise<{ sent: number; failed: string[] }> {
  const user = cleanEnv(process.env.GMAIL_USER);
  const pass = cleanEnv(process.env.GMAIL_APP_PASSWORD);
  if (!user || !pass) throw new Error("GMAIL_USER / GMAIL_APP_PASSWORD not set");

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
    pool: true,
    maxConnections: 3,
  });

  let sent = 0;
  const failed: string[] = [];
  try {
    for (const mail of mails) {
      try {
        await transporter.sendMail({
          from: `GitNewStars <${user}>`,
          to: mail.to,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
        });
        sent++;
      } catch (e) {
        failed.push(mail.to);
        console.error("gmail send failed", mail.to, e);
      }
    }
  } finally {
    transporter.close();
  }
  return { sent, failed };
}
