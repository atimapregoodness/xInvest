// controllers/tradeController.js
const Trade = require("../models/Trade");
const Plan = require("../models/InvestmentPlan");
const Wallet = require("../models/Wallet");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

function parseDurationDays(duration) {
  if (duration == null) return 1;
  if (typeof duration === "number" && !isNaN(duration)) return duration;
  const s = String(duration).trim().toLowerCase();
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s);
  const h = s.match(/^(\d+(\.\d+)?)h$/);
  if (h) return Number(h[1]) / 24;
  const d = s.match(/^(\d+(\.\d+)?)d$/);
  if (d) return Number(d[1]);
  const w = s.match(/^(\d+(\.\d+)?)w$/);
  if (w) return Number(w[1]) * 7;
  return 1;
}

// GET /dashboard/trade
exports.getAdvancedTrade = async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true }).lean();
    const trades = await Trade.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    res.render("user/trade", {
      title: "Trade",
      user: req.user,
      plans,
      trades,
      csrfToken: req.csrfToken(),
      success_msg: req.flash("success_msg"),
      error_msg: req.flash("error_msg"),
    });
  } catch (err) {
    console.error("Error loading trade page:", err);
    req.flash("error_msg", "Unable to load trade page.");
    res.redirect("/dashboard");
  }
};

// POST /dashboard/trade/start
exports.startTrade = async (req, res) => {
  try {
    const { tradingPair, amount, planId, currency } = req.body;
    const numericUSDTAmount = Number(amount);

    if (!tradingPair || !numericUSDTAmount || !planId) {
      req.flash("error_msg", "Trading pair, amount, and plan are required.");
      return res.redirect("/dashboard/trade");
    }

    // Determine payment currency
    const payCurrency =
      (currency || "").toString().trim().toUpperCase() ||
      tradingPair.split("/")[1] ||
      "USDT";

    if (!["USDT", "BTC", "ETH"].includes(payCurrency)) {
      req.flash(
        "error_msg",
        "Unsupported payment currency. Use USDT, BTC, or ETH."
      );
      return res.redirect("/dashboard/trade");
    }

    const plan = await Plan.findById(planId);
    if (!plan) {
      req.flash("error_msg", "Selected plan not found.");
      return res.redirect("/dashboard/trade");
    }

    const wallet = await Wallet.findOne({ userId: req.user._id });
    if (!wallet) {
      req.flash("error_msg", "Wallet not found.");
      return res.redirect("/dashboard/trade");
    }

    // Fetch live prices
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether&vs_currencies=usd"
    );
    const priceData = await response.json();
    const BTC_USD = priceData.bitcoin?.usd || 0;
    const ETH_USD = priceData.ethereum?.usd || 0;
    const USDT_USD = priceData.tether?.usd || 1;

    // Convert USDT amount to crypto if necessary
    let walletCurrency = payCurrency;
    let walletAmountNeeded;

    if (payCurrency === "USDT") {
      walletAmountNeeded = numericUSDTAmount;
    } else if (payCurrency === "BTC") {
      walletAmountNeeded = numericUSDTAmount / BTC_USD;
    } else if (payCurrency === "ETH") {
      walletAmountNeeded = numericUSDTAmount / ETH_USD;
    }

    if ((wallet[walletCurrency] || 0) < walletAmountNeeded) {
      req.flash(
        "error_msg",
        `Insufficient ${walletCurrency} balance. You need ${walletAmountNeeded.toFixed(
          8
        )} ${walletCurrency}.`
      );
      return res.redirect("/dashboard/trade");
    }

    // Deduct funds
    await wallet.addTransaction({
      userId: req.user._id,
      type: "investment",
      currency: walletCurrency,
      amount: walletAmountNeeded,
      description: `Start trade ${tradingPair} (entered ${numericUSDTAmount} USDT)`,
      metadata: {
        planId,
        tradingPair,
        originalAmountUSDT: numericUSDTAmount,
        paymentCurrency: walletCurrency,
        exchangeRateUSD:
          payCurrency === "USDT"
            ? 1
            : payCurrency === "BTC"
            ? BTC_USD
            : ETH_USD,
      },
      status: "completed",
    });

    // Calculate trade end date
    const days = parseDurationDays(plan.duration || plan.durationDays);
    const now = new Date();
    const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    // Create trade record
    await Trade.create({
      user: req.user._id,
      plan: plan._id,
      tradingPair,
      amount: numericUSDTAmount,
      currency: payCurrency,
      roi: plan.roi || 0,
      startDate: now,
      endDate,
      status: "active",
      simulatedProfit: 0,
      profit: 0,
    });

    req.flash(
      "success_msg",
      `Trade started successfully using ${walletCurrency}.`
    );
    return res.redirect("/dashboard/trade");
  } catch (err) {
    console.error("startTrade error:", err);
    req.flash("error_msg", "Server error starting trade.");
    return res.redirect("/dashboard/trade");
  }
};

// GET /dashboard/trade/status
exports.getStatus = async (req, res) => {
  try {
    const trades = await Trade.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    const now = new Date();

    const payload = trades.map((t) => {
      const start = new Date(t.startDate);
      const end = new Date(t.endDate);
      const totalMs = Math.max(1, end - start);
      const elapsedMs = Math.max(0, Math.min(now - start, totalMs));
      const progress = Math.min(1, elapsedMs / totalMs);

      const finalProfit = (t.amount * t.roi) / 100;
      const serverProfit =
        t.status === "completed"
          ? t.profit || finalProfit
          : t.simulatedProfit || finalProfit * progress;

      return {
        _id: t._id.toString(),
        tradingPair: t.tradingPair,
        amount: t.amount,
        currency: t.currency,
        roi: t.roi,
        status: t.status,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        progress: Math.round(progress * 100),
        simulatedProfit: Number(serverProfit.toFixed(8)),
        profit: Number((t.profit || 0).toFixed(8)),
      };
    });

    return res.json({ success: true, trades: payload });
  } catch (err) {
    console.error("getStatus error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Server error fetching trades" });
  }
};
