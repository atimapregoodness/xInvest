// src/routes/auth.js
const express = require("express");
const router = express.Router();
const passport = require("passport");
const {
  getLogin,
  postLogin,
  getRegister,
  postRegister,
  logout,
  getForgotPassword,
  postForgotPassword,
} = require("../controllers/AuthController");

// --------------------
// LOGIN ROUTES
// --------------------
router.get("/login", getLogin);
router.post("/login", postLogin);

// --------------------
// REGISTER ROUTES
// --------------------
router.get("/register", getRegister);
router.post("/register", postRegister);

// --------------------
// LOGOUT
// --------------------
router.get("/logout", logout);

// --------------------
// FORGOT PASSWORD
// --------------------
router.get("/forgot-password", getForgotPassword);
router.post("/forgot-password", postForgotPassword);

module.exports = router;
