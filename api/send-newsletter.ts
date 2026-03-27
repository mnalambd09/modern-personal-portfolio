import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { subject, message, subscribers } = req.body;

  if (!subject || !message || !subscribers || !Array.isArray(subscribers)) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return res.status(500).json({ 
      error: "Email service not configured. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS in Vercel Environment Variables." 
    });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT || "587"),
      secure: SMTP_PORT === "465",
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    await transporter.verify();

    const sendPromises = subscribers.map(email => {
      return transporter.sendMail({
        from: `"MD NOORALAM" <${SMTP_USER}>`,
        to: email,
        subject: subject,
        text: message,
        html: `<div style="font-family: sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #2563eb;">${subject}</h2>
                <div style="line-height: 1.6; white-space: pre-wrap;">${message}</div>
                <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;" />
                <p style="font-size: 12px; color: #666;">You are receiving this because you subscribed to MD NOORALAM's newsletter.</p>
              </div>`
      });
    });

    await Promise.all(sendPromises);
    return res.json({ success: true, count: subscribers.length });
  } catch (error: any) {
    console.error("Email sending error:", error);
    return res.status(500).json({ error: `Failed to send emails: ${error.message}` });
  }
}
