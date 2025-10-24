// controllers/tradeController.js
const Trade = require("../models/Trade");
const Plan = require("../models/InvestmentPlan");
const Wallet = require("../models/Wallet");

/**
 * Parse duration into days. Accepts numbers or strings like "7", "7d", "24h", "1w".
 */
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
    });
  } catch (err) {
    console.error("Error loading trade page:", err);
    res.status(500).send("Internal Server Error");
  }
};

// POST /dashboard/trade/start
exports.startTrade = async (req, res) => {
  try {
    const { tradingPair, amount, planId, currency } = req.body;
    const numericAmount = Number(amount);

    if (!tradingPair || !numericAmount || !planId) {
      return res.status(400).json({
        success: false,
        error: "tradingPair, amount and planId are required",
      });
    }

    const derivedCurrency =
      (currency || "").toString().trim().toUpperCase() ||
      (tradingPair.split("/")[1] || "").toUpperCase();

    if (!["USDT", "BTC", "ETH"].includes(derivedCurrency)) {
      return res.status(400).json({
        success: false,
        error: "Unsupported currency. Use USDT, BTC or ETH.",
      });
    }

    const plan = await Plan.findById(planId);
    if (!plan)
      return res.status(404).json({ success: false, error: "Plan not found" });

    const wallet = await Wallet.findOne({ userId: req.user._id });
    if (!wallet)
      return res
        .status(404)
        .json({ success: false, error: "Wallet not found" });

    if ((wallet[derivedCurrency] || 0) < numericAmount) {
      return res.status(400).json({
        success: false,
        error: `Insufficient ${derivedCurrency} balance`,
      });
    }

    // Deduct funds via wallet helper (include userId for transaction validation)
    await wallet.addTransaction({
      userId: req.user._id,
      type: "investment",
      currency: derivedCurrency,
      amount: numericAmount,
      description: `Start trade ${tradingPair}`,
      metadata: { planId, tradingPair },
      status: "completed",
    });

    const days = parseDurationDays(plan.duration || plan.durationDays);
    const now = new Date();
    const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const trade = await Trade.create({
      user: req.user._id, // ✅ matches Trade schema
      plan: plan._id,
      tradingPair,
      amount: numericAmount,
      currency: derivedCurrency,
      roi: plan.roi || 0,
      startDate: now,
      endDate,
      status: "active",
      simulatedProfit: 0,
      profit: 0,
    });

    return res.json({ success: true, message: "Trade started", trade });
  } catch (err) {
    console.error("startTrade error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Server error starting trade" });
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
