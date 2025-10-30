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
      from: `"Crybiance" <${process.env.SMTP_USER}>`,
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
    subject: "Welcome to Crybiance!",
    title: `Welcome, ${name}!`,
    message: `
      We're excited to have you on Crybiance.<br>
      Start exploring secure trading tools, real-time data, and portfolio management with confidence.
    `,
    buttonText: "Go to Dashboard",
    buttonUrl: `${process.env.BASE_URL}/dashboard`,
  });
}

module.exports = { sendWelcomeEmail };

async function sendDepositEmail(
  email,
  name,
  amount,
  currency,
  status,
  receiptUrl
) {
  // Define message and styling by status
  let statusMessage = "";
  let extraNote = "";
  let color = "";

  switch (status) {
    case "approved":
      statusMessage = "Your deposit has been approved successfully!";
      extraNote = "The funds are now available in your wallet.";
      color = "#28a745"; // green
      break;

    case "failed":
      statusMessage = "Your deposit was declined.";
      extraNote =
        "Unfortunately, your deposit could not be processed at this time. Please verify your transaction details or contact support for help.";
      color = "#dc3545"; // red
      break;

    case "pending":
      statusMessage = "Your deposit request is pending review.";
      extraNote =
        "Our compliance team is currently reviewing your transaction. You’ll receive an update once it’s approved.";
      color = "#ffc107"; // yellow
      break;

    default:
      statusMessage = "Deposit update";
      color = "#6c757d"; // gray
  }

  const message = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <p>Hello ${name},</p>
      <p style="color: ${color}; font-weight: bold;">${statusMessage}</p>
      <ul>
        <li><strong>Amount:</strong> ${amount} ${currency}</li>
        <li><strong>Status:</strong> <span style="color: ${color};">${status}</span></li>
        ${
          receiptUrl
            ? `<li><strong>Receipt:</strong> <a href="${receiptUrl}" target="_blank" style="color: #007bff;">View Receipt</a></li>`
            : ""
        }
      </ul>
      <p>${extraNote}</p>
    </div>
  `;

  return sendMail({
    to: email,
    subject: `Deposit ${
      status.charAt(0).toUpperCase() + status.slice(1)
    } - Crybiance`,
    title: `Deposit ${status.charAt(0).toUpperCase() + status.slice(1)}`,
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
    subject: "Password Reset Request - Crybiance",
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
    subject: "Security Alert - Crybiance",
    title: "Security Alert",
    message,
  });
}

async function sendWithdrawalEmail(
  email,
  name,
  amount,
  currency,
  fee,
  totalDeducted,
  balance
) {
  const title = "Withdrawal Processed Successfully";
  const message = `
    <p>Hello ${name},</p>
    <p>Your withdrawal request has been processed and the funds have been sent to your designated address.</p>
    <div style="background: white; border-radius: 6px; padding: 1rem; margin: 1rem 0; border: 1px solid #e2e8f0;">
      <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #f1f5f9;">
        <span style="color: #64748b; font-weight: 500;">Amount Withdrawn:</span>
        <span style="color: #1e293b; font-weight: 600;">${amount} ${currency}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #f1f5f9;">
        <span style="color: #64748b; font-weight: 500;">Processing Fee:</span>
        <span style="color: #1e293b; font-weight: 600;">${fee} ${currency}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #f1f5f9;">
        <span style="color: #64748b; font-weight: 500;">Total Deducted:</span>
        <span style="color: #1e293b; font-weight: 600;">${totalDeducted} ${currency}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 0.5rem 0;">
        <span style="color: #64748b; font-weight: 500;">Remaining Balance:</span>
        <span style="color: #1e293b; font-weight: 600;">${balance} ${currency}</span>
      </div>
    </div>
    <p>The funds should reflect in your account within 1-3 business days, depending on your bank's processing time.</p>
  `;
  const button = `<a href="${process.env.BASE_URL}/dashboard/wallet" class="btn">View Wallet Balance</a>`;

  return sendMail({
    to: email,
    subject: "Withdrawal Successful - Crybiance",
    title: title,
    message: message,
    button: button,
    email: email,
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
