const InvestmentPlan = require("../models/InvestmentPlan");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const axios = require("axios");

// ============================================================
// GET ALL ACTIVE INVESTMENT PLANS
// ============================================================
exports.getPlans = async (req, res) => {
  try {
    const plans = await InvestmentPlan.find({ isActive: true }).sort({
      price: 1,
    });
    const userPlans = req.user.plans
      ? req.user.plans.map((p) => p.planId.toString())
      : [];

    res.render("user/plans", {
      user: req.user,
      plans,
      userPlans,
      csrfToken: req.csrfToken(),
      title: "Investment Plans Marketplace",
    });
  } catch (err) {
    console.error("Error loading investment plans:", err);
    res.status(500).send("Server Error");
  }
};

// ============================================================
// PURCHASE INVESTMENT PLAN
// ============================================================
exports.purchasePlan = async (req, res) => {
  try {
    const planId = req.params.id;
    const plan = await InvestmentPlan.findById(planId);

    if (!plan) {
      req.flash("error_msg", "Investment plan not found");
      return res.redirect("/dashboard/plans");
    }

    const paymentMethod = (req.body.paymentMethod || "USDT").toUpperCase();
    const wallet = await Wallet.findOne({ userId: req.user._id });

    if (!wallet) {
      req.flash(
        "error_msg",
        "Wallet not found. Please set up your wallet first."
      );
      return res.redirect("/dashboard/plans");
    }

    if (!Array.isArray(req.user.plans)) req.user.plans = [];

    // Prevent duplicate purchase
    const alreadyOwned = req.user.plans.some(
      (p) => p.planId && p.planId.toString() === planId
    );
    if (alreadyOwned) {
      req.flash("error_msg", "You already own this investment plan");
      return res.redirect("/dashboard/plans");
    }

    // Fetch live crypto prices from CoinGecko
    const { data } = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price",
      {
        params: {
          ids: "bitcoin,ethereum,tether",
          vs_currencies: "usd",
        },
      }
    );

    const rates = {
      BTC: data.bitcoin.usd,
      ETH: data.ethereum.usd,
      USDT: data.tether.usd,
    };

    const rate = rates[paymentMethod];
    if (!rate) {
      req.flash("error_msg", "Unable to fetch crypto price rates.");
      return res.redirect("/dashboard/plans");
    }

    // Convert USD plan price to chosen crypto
    const cryptoEquivalent = plan.price / rate;
    const balance = wallet[paymentMethod];

    if (balance < cryptoEquivalent) {
      req.flash("error_msg", `Insufficient ${paymentMethod} balance`);
      return res.redirect("/dashboard/plans");
    }

    // Deduct crypto from wallet
    wallet[paymentMethod] -= cryptoEquivalent;

    // Record plan ownership
    req.user.plans.push({
      planId,
      purchasedAt: new Date(),
    });

    // ===============================
    // CREATE TRANSACTION RECORD
    // ===============================
    const transaction = await Transaction.createRecord({
      userId: req.user._id,
      type: "investment",
      currency: paymentMethod,
      amount: plan.price, // USD price
      netAmount: cryptoEquivalent, // crypto spent
      fee: 0,
      status: "completed",
      description: `Purchased ${plan.name} using ${paymentMethod}`,
      metadata: {
        planName: plan.name,
        usdValue: plan.price,
        rateUsed: rate,
        previousBalance: balance,
        newBalance: balance - cryptoEquivalent,
      },
    });

    // Optional: store transaction reference in wallet if needed
    if (wallet.transactions) {
      wallet.transactions.push(transaction._id);
    }

    // Save wallet + user
    await Promise.all([wallet.save(), req.user.save()]);

    req.flash(
      "success_msg",
      `You successfully purchased ${plan.name} for ${cryptoEquivalent.toFixed(
        8
      )} ${paymentMethod}`
    );
    res.redirect("/dashboard/plans");
  } catch (err) {
    console.error("Error purchasing plan:", err);
    req.flash(
      "error_msg",
      "Something went wrong while processing your purchase."
    );
    res.redirect("/dashboard/plans");
  }
};
