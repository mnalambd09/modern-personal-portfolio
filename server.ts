import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import nodemailer from "nodemailer";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Newsletter sending endpoint
  app.post("/api/send-newsletter", async (req, res) => {
    const { subject, message, subscribers } = req.body;

    if (!subject || !message || !subscribers || !Array.isArray(subscribers)) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check for SMTP credentials
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      console.warn("SMTP credentials not configured. Newsletter will not be sent.");
      return res.status(500).json({ 
        error: "Email service not configured. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS in environment variables." 
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

      // Verify connection configuration
      try {
        await transporter.verify();
      } catch (verifyError: any) {
        console.error("SMTP Verification Error:", verifyError);
        return res.status(500).json({ 
          error: `Email authentication failed: ${verifyError.message}. Please ensure you are using a Gmail App Password and have 2-Step Verification enabled.` 
        });
      }

      // Send emails to all subscribers
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
      res.json({ success: true, count: subscribers.length });
    } catch (error) {
      console.error("Email sending error:", error);
      res.status(500).json({ error: "Failed to send emails" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    // In production, this file is bundled into dist/server.cjs
    // So __dirname will be the dist folder itself.
    const distPath = path.resolve(process.cwd(), "dist");
      
    console.log(`Production mode: serving static files from ${distPath}`);
    app.use(express.static(distPath));
    
    // Fallback for SPA routing
    app.get("*", (req, res) => {
      const indexPath = path.resolve(distPath, "index.html");
      console.log(`Serving index.html from ${indexPath}`);
      res.sendFile(indexPath);
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
