const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/AuthController");

// Login routes
router.get("/login", AuthController.getLogin);
router.post("/login", AuthController.postLogin);

// Register routes
router.get("/register", AuthController.getRegister);
router.post("/register", AuthController.postRegister);

// Logout route
router.get("/logout", AuthController.getLogout);

// Password reset routes
router.get("/forgot-password", AuthController.getForgotPassword);
router.post("/forgot-password", AuthController.postForgotPassword);

// Google OAuth routes
router.get("/google", AuthController.googleAuth);
router.get("/google/callback", AuthController.googleAuthCallback);

module.exports = router;
