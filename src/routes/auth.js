const express = require("express");
const router = express.Router();
const authController = require("../controllers/AuthController"); // lowercase

// Login
router.get("/login", authController.getLogin);
router.post("/login", authController.postLogin);

// Register
router.get("/register", authController.getRegister);
router.post("/register", authController.postRegister);

// Logout
router.get("/logout", authController.getLogout);

// Forgot Password
router.get("/forgot-password", authController.getForgotPassword);
router.post("/forgot-password", authController.postForgotPassword);

module.exports = router;
