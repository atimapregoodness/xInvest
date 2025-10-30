const express = require("express");
const router = express.Router();
const emailController = require("../controllers/emailController");
const { body } = require("express-validator");

// Validation rules
const emailValidation = [
  body("to")
    .isEmail()
    .withMessage("Must provide valid email address")
    .normalizeEmail(),
  body("subject")
    .trim()
    .isLength({ min: 1 })
    .withMessage("Subject is required")
    .isLength({ max: 200 })
    .withMessage("Subject must be less than 200 characters"),
  body("htmlContent")
    .trim()
    .isLength({ min: 1 })
    .withMessage("Email content is required"),
];

// Routes
router.get("/composer", emailController.showComposer);
router.post("/send", emailValidation, emailController.sendEmail);
router.post("/test-smtp", emailController.testSMTPConnection);

module.exports = router;
