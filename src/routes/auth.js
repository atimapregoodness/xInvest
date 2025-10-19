const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/AuthController");

// Apply CSRF protection to all routes that need it
router.use((req, res, next) => {
  if (
    req.method === "GET" &&
    (req.path === "/login" ||
      req.path === "/register" ||
      req.path === "/forgot-password")
  ) {
    // CSRF token will be generated in the controller
    next();
  } else {
    // For POST routes, use the specific middleware from controller
    next();
  }
});

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

// API routes (if needed)
router.get("/csrf-token", AuthController.getCsrfToken);
router.get("/status", AuthController.getAuthStatus);

module.exports = router;
