// src/routes/invest.js
const express = require("express");
const router = express.Router();
const { createInvestment } = require("../controllers/investController");

// Middleware to ensure authentication
function ensureAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  req.flash("error_msg", "You must be logged in to invest.");
  res.redirect("/auth/login");
}

// Show investment plans
router.get("/", ensureAuth, (req, res) => {
  res.render("invest", { title: "Investment Plans" });
});

// Handle new investment submission
router.post("/", ensureAuth, createInvestment);

module.exports = router;
