const nodemailer = require("nodemailer");

// Create transporter (configure based on your email service)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Test transporter connection
transporter.verify((error, success) => {
  if (error) {
    console.error("Email transporter error:", error);
  } else {
    console.log("Email server is ready to send messages");
  }
});

// Send welcome email (optional)
const sendWelcomeEmail = async (email, name) => {
  try {
    const mailOptions = {
      from: `"xInvest" <${process.env.SMTP_FROM}>`,
      to: email,
      subject: "Welcome to xInvest - Start Your Trading Journey",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0066FF;">Welcome to xInvest, ${name}!</h2>
          <p>We're excited to have you join our professional trading platform.</p>
          <p>With xInvest, you get access to:</p>
          <ul>
            <li>Institutional-grade trading tools</li>
            <li>Real-time market data</li>
            <li>Professional portfolio management</li>
            <li>Secure and fast execution</li>
          </ul>
          <p>Start exploring your dashboard and get ready to trade like a professional!</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.BASE_URL}/dashboard" style="background: #00D4AA; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Go to Dashboard
            </a>
          </div>
          <p>Happy trading!<br>The xInvest Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to: ${email}`);
  } catch (error) {
    console.error("Error sending welcome email:", error);
    throw error;
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetToken) => {
  try {
    const resetUrl = `${process.env.BASE_URL}/auth/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: `"xInvest" <${process.env.SMTP_FROM}>`,
      to: email,
      subject: "Password Reset Request - xInvest",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0066FF;">Password Reset Request</h2>
          <p>You requested to reset your password for your xInvest account.</p>
          <p>Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: #0066FF; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all;">${resetUrl}</p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request a password reset, please ignore this email.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to: ${email}`);
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw error;
  }
};

// Send security alert email
const sendSecurityAlertEmail = async (email, activity) => {
  try {
    const mailOptions = {
      from: `"xInvest Security" <${process.env.SMTP_FROM}>`,
      to: email,
      subject: "Security Alert - xInvest",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #FF375F;">Security Alert</h2>
          <p>We detected suspicious activity on your xInvest account:</p>
          <p><strong>Activity:</strong> ${activity}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          <p>If this was you, you can safely ignore this email.</p>
          <p>If this wasn't you, please contact our support team immediately and change your password.</p>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; color: #666; font-size: 14px;">
              For your security, we recommend:<br>
              • Using a strong, unique password<br>
              • Enabling two-factor authentication<br>
              • Regularly monitoring your account activity
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Security alert email sent to: ${email}`);
  } catch (error) {
    console.error("Error sending security alert email:", error);
    throw error;
  }
};

module.exports = {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendSecurityAlertEmail,
  transporter,
};
