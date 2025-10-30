const nodemailer = require("nodemailer");
const EmailTemplate = require("../models/EmailTemplate");
const { validationResult } = require("express-validator");

class EmailController {
  constructor() {
    this.getTransporter = this.getTransporter.bind(this);
    this.showComposer = this.showComposer.bind(this);
    this.sendEmail = this.sendEmail.bind(this);
    this.testSMTPConnection = this.testSMTPConnection.bind(this);
  }

  // ✅ FIXED: Correct nodemailer transport method
  getTransporter() {
    if (
      process.env.NODE_ENV === "development" ||
      !process.env.SMTP_SUPPORT_USER
    ) {
      return {
        sendMail: (mailOptions) => {
          console.log("📧 DEVELOPMENT MODE - Email would be sent:");
          console.log("To:", mailOptions.to);
          console.log("Subject:", mailOptions.subject);
          console.log("Content length:", mailOptions.html?.length);
          console.log("---");

          return Promise.resolve({
            messageId: "dev-" + Date.now(),
            response: "Development mode - email logged to console",
          });
        },
      };
    }

    // ✅ Correct method + clear default values
    return nodemailer.createTransport({
      host: process.env.SMTP_SUPPORT_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_SUPPORT_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_SUPPORT_USER,
        pass: process.env.SMTP_SUPPORT_PASS,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  async showComposer(req, res) {
    try {
      res.render("admin/email/composer", {
        title: "Email Composer",
      });
    } catch (error) {
      console.error("Error loading email composer:", error);
      res.render("admin/email/composer", {
        title: "Email Composer",
        error: "Failed to load email composer",
      });
    }
  }

  async sendEmail(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { to, subject, htmlContent, cc, bcc } = req.body;
      const transporter = this.getTransporter();

      const mailOptions = {
        from: `"Crybiance" <${
          process.env.SMTP_SUPPORT_USER || "noreply@crybiance.com"
        }>`,
        to: to.split(",").map((email) => email.trim()),
        subject: subject,
        html: htmlContent,
        cc: cc ? cc.split(",").map((email) => email.trim()) : undefined,
        bcc: bcc ? bcc.split(",").map((email) => email.trim()) : undefined,
      };

      console.log("Attempting to send email...");

      // ✅ Development mode mock send
      if (
        process.env.NODE_ENV === "development" ||
        !process.env.SMTP_SUPPORT_USER
      ) {
        console.log("📧 Email would be sent:");
        console.log("To:", mailOptions.to);
        console.log("Subject:", mailOptions.subject);
        console.log("Content Preview:", htmlContent.substring(0, 200) + "...");
        await new Promise((resolve) => setTimeout(resolve, 1000));

        return res.json({
          success: true,
          message: "Email sent successfully! (Development Mode)",
          messageId: "dev-" + Date.now(),
        });
      }

      // ✅ Real send in production
      const result = await transporter.sendMail(mailOptions);

      // Log in DB
      await EmailTemplate.create({
        name: `Sent: ${subject}`,
        subject,
        content: htmlContent,
        recipients: to,
        sentAt: new Date(),
        messageId: result.messageId,
      });

      res.json({
        success: true,
        message: "Email sent successfully!",
        messageId: result.messageId,
      });
    } catch (error) {
      console.error("Error sending email:", error);

      let userMessage = "Failed to send email";
      if (error.code === "ETIMEDOUT")
        userMessage =
          "Email server timeout. Please check your SMTP configuration.";
      else if (error.code === "ECONNREFUSED")
        userMessage =
          "Cannot connect to email server. Please check your SMTP settings.";
      else if (error.code === "EAUTH")
        userMessage =
          "Email authentication failed. Please check your username and password.";
      else if (error.command === "CONN")
        userMessage =
          "Cannot establish connection with email server. Please check your SMTP host and port.";

      res.status(500).json({
        success: false,
        message: userMessage,
        error: error.message,
      });
    }
  }

  async testSMTPConnection(req, res) {
    try {
      if (!process.env.SMTP_SUPPORT_USER) {
        return res.json({
          success: false,
          message: "SMTP not configured - running in development mode",
          mode: "development",
        });
      }

      // ✅ FIXED here too
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_SUPPORT_HOST || "smtp.gmail.com",
        port: Number(process.env.SMTP_SUPPORT_PORT) || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_SUPPORT_USER,
          pass: process.env.SMTP_SUPPORT_PASS,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
      });

      await transporter.verify();

      res.json({
        success: true,
        message: "SMTP connection successful!",
        host: process.env.SMTP_SUPPORT_HOST,
        port: process.env.SMTP_SUPPORT_PORT,
      });
    } catch (error) {
      console.error("SMTP connection test failed:", error);
      res.status(500).json({
        success: false,
        message: "SMTP connection failed",
        error: error.message,
        suggestion: "Check your SMTP settings in .env file",
      });
    }
  }

  async saveTemplate(req, res) {
    try {
      const { name, subject, content } = req.body;

      const template = await EmailTemplate.create({
        name,
        subject,
        content,
        isTemplate: true,
      });

      res.json({
        success: true,
        message: "Template saved successfully!",
        template,
      });
    } catch (error) {
      console.error("Error saving template:", error);
      res.status(500).json({
        success: false,
        message: "Failed to save template",
        error: error.message,
      });
    }
  }

  async loadTemplate(req, res) {
    try {
      const { id } = req.params;
      const template = await EmailTemplate.findById(id);

      if (!template) {
        return res.status(404).json({
          success: false,
          message: "Template not found",
        });
      }

      res.json({
        success: true,
        template,
      });
    } catch (error) {
      console.error("Error loading template:", error);
      res.status(500).json({
        success: false,
        message: "Failed to load template",
        error: error.message,
      });
    }
  }
}

module.exports = new EmailController();
