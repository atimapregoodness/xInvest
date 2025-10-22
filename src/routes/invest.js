const express = require("express");
const router = express.Router();
const { ensureAuthenticated } = require("../middleware/auth");

const investmentController = require("../controllers/InvestController");

router.get("/", ensureAuthenticated, (req, res) =>
  res.render("user/invest", {
    title: "xInvest - Investments",
    user: req.user,
  })
);

router.get("/wallet", ensureAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("wallet");
    if (!user.wallet) return res.status(404).json({ msg: "Wallet not found" });
    res.json(user.wallet);
  } catch (err) {
    console.error("Error fetching wallet:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

router.get("/plans", ensureAuthenticated, (req, res) =>
  res.json(req.user.tradingPlans)
);

router.get(
  "/active",
  ensureAuthenticated,
  investmentController.getActiveInvestments
);

router.post("/", ensureAuthenticated, investmentController.createInvestment);

router.post(
  "/:id/withdraw",
  ensureAuthenticated,
  investmentController.withdrawProfit
);

module.exports = router;
