const express = require("express");
const router = express.Router();
const DashboardController = require("../controllers/DashboardController");
const { ensureAuthenticated } = require("../middleware/auth");

// All dashboard routes require authentication
router.use(ensureAuthenticated);

// Dashboard main page
router.get("/", DashboardController.getDashboard);

// Profile routes
router.get("/profile", DashboardController.getProfile);
router.post("/profile", DashboardController.updateProfile);

router.get("/api/transactions/stats", async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const transactions = user.transactions || [];

    // Calculate stats
    let profitReturn = 0,
      bonus = 0,
      totalDeposit = 0,
      totalWithdrawal = 0;
    let depositBTC = 0,
      depositETH = 0,
      withdrawalBTC = 0,
      withdrawalETH = 0;
    let bonusBTC = 0,
      bonusETH = 0;

    transactions.forEach((txn) => {
      const amount = txn.netAmount || 0;

      // PROFIT RETURN
      if (txn.type === "profit") profitReturn += amount;

      // BONUS
      if (txn.type === "bonus") {
        bonus += amount;
        if (txn.currency === "BTC") bonusBTC += amount;
        if (txn.currency === "ETH") bonusETH += amount;
      }

      // DEPOSITS
      if (txn.type === "deposit" && txn.status === "completed") {
        totalDeposit += amount;
        if (txn.currency === "BTC") depositBTC += amount;
        if (txn.currency === "ETH") depositETH += amount;
      }

      // WITHDRAWALS
      if (txn.type === "withdrawal" && txn.status === "completed") {
        totalWithdrawal += amount;
        if (txn.currency === "BTC") withdrawalBTC += amount;
        if (txn.currency === "ETH") withdrawalETH += amount;
      }
    });

    res.json({
      success: true,
      profitReturn,
      bonus,
      totalDeposit,
      totalWithdrawal,
      bonusBTC,
      bonusETH,
      depositBTC,
      depositETH,
      withdrawalBTC,
      withdrawalETH,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Stats error" });
  }
});

module.exports = router;
