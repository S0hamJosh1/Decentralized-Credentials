import nodemailer from "nodemailer";

let cachedTransporter;

function readSmtpConfig() {
  const host = String(process.env.SMTP_HOST || "").trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = String(process.env.SMTP_USER || "").trim();
  const password = String(process.env.SMTP_PASSWORD || "").trim();
  const secure = String(process.env.SMTP_SECURE || "false").trim().toLowerCase() === "true";
  const from = String(process.env.EMAIL_FROM || "").trim();

  if (!host || !from) {
    return null;
  }

  return {
    host,
    port: Number.isFinite(port) ? port : 587,
    secure,
    from,
    auth: user && password ? { user, pass: password } : undefined,
  };
}

function getTransporter() {
  const config = readSmtpConfig();

  if (!config) {
    return null;
  }

  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });
  }

  return {
    transporter: cachedTransporter,
    from: config.from,
  };
}

export async function sendWorkspaceEmail({ to, subject, text, html }) {
  const config = getTransporter();

  if (!config) {
    return {
      delivered: false,
      skipped: true,
      reason: "smtp_not_configured",
    };
  }

  try {
    await config.transporter.sendMail({
      from: config.from,
      to,
      subject,
      text,
      html,
    });
  } catch (error) {
    return {
      delivered: false,
      skipped: false,
      reason: error.message || "delivery_failed",
    };
  }

  return {
    delivered: true,
    skipped: false,
    reason: "",
  };
}
