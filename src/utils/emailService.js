const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");

// SMTP transporter setup
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Load base HTML template
const templatePath = path.join(__dirname, "../views/emailTemplate.html");
const baseTemplate = fs.readFileSync(templatePath, "utf-8");

/**
 * Send an email using the base template
 * @param {Object} options
 * @param {string} options.to - recipient email
 * @param {string} options.subject - email subject
 * @param {string} options.title - header in email
 * @param {string} options.message - main HTML message
 * @param {string} [options.buttonText] - CTA text
 * @param {string} [options.buttonUrl] - CTA link
 */
async function sendMail({
  to,
  subject,
  title,
  message,
  buttonText,
  buttonUrl,
}) {
  try {
    const html = baseTemplate
      .replace(/{{title}}/g, title)
      .replace(/{{message}}/g, message)
      .replace(
        /{{button}}/g,
        buttonText && buttonUrl
          ? `<a href="${buttonUrl}" class="btn">${buttonText}</a>`
          : ""
      );

    await transporter.sendMail({
      from: `"MeziumFx" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });

    console.log(`📨 Email sent to ${to} (${subject})`);
  } catch (err) {
    console.error("❌ Failed to send email:", err);
  }
}

// ===================== Prebuilt Email Functions =====================

// Welcome Email
async function sendWelcomeEmail(email, name) {
  return sendMail({
    to: email,
    subject: "Welcome to MeziumFx!",
    title: `Welcome, ${name}!`,
    message: `We're excited to have you on MeziumFx. Start exploring trading tools, real-time data, and secure portfolio management.`,
    buttonText: "Go to Dashboard",
    buttonUrl: `${process.env.BASE_URL}/dashboard`,
  });
}

// Deposit Email
async function sendDepositEmail(
  email,
  name,
  amount,
  currency,
  status,
  receiptUrl
) {
  const message = `
    Hello ${name},<br>
    Your deposit of <b>${amount} ${currency}</b> has been <b>${status}</b>.<br>
    ${
      status === "approved" ? "The funds are now available in your wallet." : ""
    }
    <ul>
      <li>Amount: ${amount} ${currency}</li>
      <li>Status: ${status}</li>
      ${
        receiptUrl
          ? `<li>Receipt: <a href="${receiptUrl}" target="_blank">View Receipt</a></li>`
          : ""
      }
    </ul>
  `;
  return sendMail({
    to: email,
    subject: `Deposit ${status} - MeziumFx`,
    title: `Deposit ${status}`,
    message,
    buttonText: "View Wallet",
    buttonUrl: `${process.env.BASE_URL}/dashboard/wallet`,
  });
}

// Withdrawal Email
async function sendWithdrawalEmail(
  email,
  name,
  amount,
  currency,
  fee,
  totalDeducted,
  balance
) {
  const message = `
    Hello ${name},<br>
    Your withdrawal has been processed successfully.<br>
    <ul>
      <li>Amount Withdrawn: ${amount} ${currency}</li>
      <li>Fee Applied: ${fee} ${currency}</li>
      <li>Total Deducted: ${totalDeducted} ${currency}</li>
      <li>Remaining Balance: ${balance} ${currency}</li>
    </ul>
  `;
  return sendMail({
    to: email,
    subject: "Withdrawal Successful - MeziumFx",
    title: "Withdrawal Processed",
    message,
    buttonText: "View Wallet",
    buttonUrl: `${process.env.BASE_URL}/dashboard/wallet`,
  });
}

// Password Reset Email
async function sendPasswordResetEmail(email, resetToken) {
  const resetUrl = `${process.env.BASE_URL}/auth/reset-password?token=${resetToken}`;
  const message = `
    You requested a password reset. Click the button below to reset your password.<br>
    If you didn't request this, please ignore this email.<br>
    <p style="word-break: break-all;">${resetUrl}</p>
  `;
  return sendMail({
    to: email,
    subject: "Password Reset Request - MeziumFx",
    title: "Password Reset Request",
    message,
    buttonText: "Reset Password",
    buttonUrl: resetUrl,
  });
}

// Security Alert Email
async function sendSecurityAlertEmail(email, activity) {
  const message = `
    Suspicious activity detected on your account:<br>
    <strong>Activity:</strong> ${activity}<br>
    <strong>Time:</strong> ${new Date().toLocaleString()}<br>
    If this was not you, please contact support immediately.
  `;
  return sendMail({
    to: email,
    subject: "Security Alert - MeziumFx",
    title: "Security Alert",
    message,
  });
}

module.exports = {
  sendMail,
  sendWelcomeEmail,
  sendDepositEmail,
  sendWithdrawalEmail,
  sendPasswordResetEmail,
  sendSecurityAlertEmail,
  transporter,
};
