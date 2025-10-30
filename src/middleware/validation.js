const { body } = require("express-validator");

exports.validateRegistration = [
  body("username")
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3 and 30 characters")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Username can only contain letters, numbers, and underscores"),

  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),

  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one lowercase letter, one uppercase letter, and one number"
    ),

  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error("Passwords do not match");
    }
    return true;
  }),
];

exports.validateLogin = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),

  body("password").notEmpty().withMessage("Password is required"),
];

exports.validateInvestment = [
  body("amount")
    .isFloat({ min: 0 })
    .withMessage("Amount must be a positive number"),

  body("plan")
    .isIn(["Starter", "Professional", "Institutional", "VIP"])
    .withMessage("Please select a valid investment plan"),

  body("currency")
    .isIn(["USDT", "BTC", "ETH"])
    .withMessage("Please select a valid currency"),
];

const { body } = require("express-validator");

exports.emailValidation = [
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
