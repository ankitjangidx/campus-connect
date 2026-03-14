const nodemailer = require("nodemailer");
require("dotenv").config();

let transport;

function getTransport() {
  if (transport) {
    return transport;
  }

  if (process.env.SMTP_HOST) {
    console.log(`Using SMTP transport: ${process.env.SMTP_HOST}`);
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: process.env.SMTP_SECURE === "true",
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS ?
          {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
    });

    return transport;
  }

  console.warn("WARNING: No SMTP_HOST provided. Falling back to jsonTransport for development.");
  transport = nodemailer.createTransport({
    jsonTransport: true,
  });

  return transport;
}

async function sendOtpEmail({ email, otpCode }) {
  const mailer = getTransport();
  const from =
    process.env.MAIL_FROM || "Campus Connect <no-reply@campusconnect.local>";

  try {
    const info = await mailer.sendMail({
      from,
      to: email,
      subject: "Your Campus Connect OTP",
      text: `Your Campus Connect OTP is ${otpCode}. It expires in 10 minutes.`,
      html: `
        <div style="font-family:Segoe UI,Arial,sans-serif;padding:24px;color:#111827">
          <h2 style="margin:0 0 12px">Campus Connect verification</h2>
          <p style="margin:0 0 16px;color:#4b5563">
            Use the OTP below to complete your registration. It expires in 10 minutes.
          </p>
          <div style="font-size:32px;font-weight:700;letter-spacing:8px;color:#5f4dee;margin:16px 0">
            ${otpCode}
          </div>
        </div>
      `,
    });

    if (!process.env.SMTP_HOST) {
      console.log("OTP mail generated successfully (MOCK):", JSON.stringify(info.message, null, 2));
    } else {
      console.log(`Email sent successfully to ${email}. Message ID: ${info.messageId}`);
    }

    return info;
  } catch (error) {
    console.error(`Failed to send email to ${email}:`, error);
    throw error;
  }
}

module.exports = {
  sendOtpEmail,
};
