// controllers/tradeController.js
const Trade = require("../models/Trade");
const InvestmentPlan = require("../models/InvestmentPlan");
const User = require("../models/User");

/**
 * parseDurationDays
 * Accepts numbers or strings like "7", "7d", "24h", "1w".
 * Returns number of days (float ok). Defaults to 1.
 */
function parseDurationDays(duration) {
  if (duration == null) return 1;
  if (typeof duration === "number" && !isNaN(duration)) return duration;
  const s = String(duration).trim().toLowerCase();

  // number only: "7"
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s);

  // hours: "24h"
  const hMatch = s.match(/^(\d+(\.\d+)?)h$/);
  if (hMatch) return Number(hMatch[1]) / 24;

  // days: "7d"
  const dMatch = s.match(/^(\d+(\.\d+)?)d$/);
  if (dMatch) return Number(dMatch[1]);

  // weeks: "1w"
  const wMatch = s.match(/^(\d+(\.\d+)?)w$/);
  if (wMatch) return Number(wMatch[1]) * 7;

  // fallback numeric parse
  const n = parseFloat(s);
  return !isNaN(n) ? n : 1;
}

/** GET /dashboard/trade/ */
exports.getAutoTrade = async (req, res) => {
  try {
    const plans = await InvestmentPlan.find({ isActive: true }).lean();
    const trades = await Trade.find({ user: req.user._id })
      .populate("plan")
      .sort({ createdAt: -1 })
      .lean();

    // Ensure dates are plain Date objects in template
    trades.forEach((t) => {
      t.startDateISO = new Date(t.startDate).toISOString();
      t.endDateISO = new Date(t.endDate).toISOString();
    });

    res.render("user/trade", {
      csrfToken: req.csrfToken(),
      user: req.user,
      plans,
      trades,
      title: "Automated Trading",
    });
  } catch (err) {
    console.error("getAutoTrade error:", err);
    req.flash("error_msg", "Error loading trading dashboard");
    res.redirect("/dashboard");
  }
};

/** POST /dashboard/trade/start */
exports.startTrade = async (req, res) => {
  try {
    const { tradingPair, planId } = req.body;
    let amount = Number(req.body.amount);
    if (!tradingPair || !planId || !amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, msg: "Invalid input." });
    }

    const plan = await InvestmentPlan.findById(planId);
    if (!plan)
      return res
        .status(400)
        .json({ success: false, msg: "Invalid plan selected." });

    // validate amount against plan bounds
    const minInv =
      typeof plan.minInvestment === "number"
        ? plan.minInvestment
        : plan.price || 0;
    if (
      amount < minInv ||
      (plan.maxInvestment && amount > plan.maxInvestment)
    ) {
      return res.status(400).json({
        success: false,
        msg: `Amount must be between $${minInv} and $${
          plan.maxInvestment || "∞"
        }`,
      });
    }

    const user = await User.findById(req.user._id);
    if (!user || !user.wallet || user.wallet.balance < amount) {
      return res
        .status(400)
        .json({ success: false, msg: "Insufficient wallet balance." });
    }

    // debit user wallet
    user.wallet.balance -= amount;
    await user.save();

    // build trade dates
    const durationDays = parseDurationDays(plan.duration);
    const startDate = new Date();
    const endDate = new Date(
      startDate.getTime() + durationDays * 24 * 60 * 60 * 1000
    );

    const trade = await Trade.create({
      user: user._id,
      plan: plan._id,
      tradingPair,
      amount,
      roi: typeof plan.roi === "number" ? plan.roi : plan.profitRate || 0,
      profit: 0,
      status: "active",
      startDate,
      endDate,
    });

    return res.json({
      success: true,
      msg: "Trade started successfully.",
      trade,
    });
  } catch (err) {
    console.error("startTrade error:", err);
    return res
      .status(500)
      .json({ success: false, msg: "Server error starting trade." });
  }
};

/**
 * GET /dashboard/trade/status
 * Returns current trades (active/completed) for the logged-in user,
 * including a server-calculated currentProfit for active trades.
 */
exports.getStatus = async (req, res) => {
  try {
    const trades = await Trade.find({ user: req.user._id })
      .populate("plan")
      .lean();
    const now = new Date();

    const response = trades.map((t) => {
      const start = new Date(t.startDate);
      const end = new Date(t.endDate);
      const totalMs = Math.max(1, end - start);
      const elapsedMs = Math.max(0, Math.min(now - start, totalMs));
      const progress = Math.min(1, elapsedMs / totalMs);

      // final profit based on ROI (server-authoritative)
      const finalProfit = (t.amount * t.roi) / 100;

      // server-side current profit (progress * final)
      const serverProfit =
        t.status === "completed"
          ? t.profit || finalProfit
          : finalProfit * progress;

      return {
        _id: t._id.toString(),
        tradingPair: t.tradingPair,
        amount: t.amount,
        roi: t.roi,
        status: t.status,
        startDateISO: start.toISOString(),
        endDateISO: end.toISOString(),
        serverProfit: Number(serverProfit.toFixed(8)), // precise number for client
        finalProfit: Number(finalProfit.toFixed(8)),
      };
    });

    res.json({ success: true, trades: response });
  } catch (err) {
    console.error("getStatus error:", err);
    res
      .status(500)
      .json({ success: false, msg: "Error fetching trade status." });
  }
};
