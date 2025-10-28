// utils/mailer.js
const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Load base email template
const templatePath = path.join(__dirname, "../views/emailTemplate.html");
let baseTemplate = fs.readFileSync(templatePath, "utf-8");

/**
 * Send styled email with dynamic content.
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.title - Header title in email
 * @param {string} options.message - Main HTML message content
 * @param {string} [options.buttonText] - CTA button text
 * @param {string} [options.buttonUrl] - CTA button URL
 */
exports.sendMail = async ({
  to,
  subject,
  title,
  message,
  buttonText,
  buttonUrl,
}) => {
  try {
    let html = baseTemplate
      .replace(/{{title}}/g, title)
      .replace(/{{message}}/g, message)
      .replace(
        /{{button}}/g,
        buttonText && buttonUrl
          ? `<a href="${buttonUrl}" class="btn">${buttonText}</a>`
          : ""
      );

    await transporter.sendMail({
      from: `"MediumFx" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });

    console.log(`📨 Email sent to ${to}`);
  } catch (err) {
    console.error("❌ Email sending failed:", err);
  }
};
