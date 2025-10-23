// routes/invest.js
const express = require("express");
const router = express.Router();
const { ensureAuthenticated } = require("../middleware/auth");
const InvestController = require("../controllers/InvestController");
const Wallet = require("../models/Wallet");

// Main investment page
router.get("/", ensureAuthenticated, async (req, res) => {
  try {
    res.render("user/invest", {
      title: "xInvest - Automated Trading",
      user: req.user,
    });
  } catch (err) {
    console.error("Error loading investment page:", err);
    res.status(500).render("error", { error: "Server error" });
  }
});

// Get wallet balance
router.get("/wallet", ensureAuthenticated, async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ userId: req.user._id });
    if (!wallet) {
      return res.status(404).json({ msg: "Wallet not found" });
    }
    res.json(wallet);
  } catch (err) {
    console.error("Error fetching wallet:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Get user's purchased plans for trading
router.get("/plans", ensureAuthenticated, InvestController.getUserPlans);

// Investment routes
router.get(
  "/active",
  ensureAuthenticated,
  InvestController.getActiveInvestments
);
router.post("/", ensureAuthenticated, InvestController.createInvestment);
router.post(
  "/:id/withdraw",
  ensureAuthenticated,
  InvestController.withdrawProfit
);

module.exports = router;
