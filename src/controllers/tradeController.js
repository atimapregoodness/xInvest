const Trade = require("../models/Trade");
const Plan = require("../models/InvestmentPlan");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const parseDurationDays = require("../utils/parseDurationDays");

/**
 * Map symbols to CoinGecko IDs
 */
const COINGECKO_IDS = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  USDT: "tether",
  ADA: "cardano",
  XRP: "ripple",
};

/**
 * Fetch real-time price of a coin in USDT
 * @param {string} currency - BTC, ETH, etc.
 * @returns {number} price in USDT
 */
async function getUSDTPrice(currency) {
  if (currency.toUpperCase() === "USDT") return 1;

  const coinId = COINGECKO_IDS[currency.toUpperCase()];
  if (!coinId) throw new Error(`Unsupported currency: ${currency}`);

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`
    );
    const data = await res.json();
    if (!data[coinId]?.usd) throw new Error("Price not found");
    return parseFloat(data[coinId].usd);
  } catch (err) {
    console.error("Error fetching crypto price:", err);
    throw new Error(`Failed to fetch ${currency} price`);
  }
}

/**
 * GET /dashboard/trade
 */
exports.getTrades = async (req, res) => {
  try {
    const trades = await Trade.find({ user: req.user._id })
      .populate("plan")
      .lean();

    const now = new Date();

    // Compute totals for header
    const updatedTrades = trades.map((trade) => {
      const start = new Date(trade.startDate);
      const end = new Date(trade.endDate);
      const totalMs = end - start;
      const elapsedMs = Math.max(0, Math.min(now - start, totalMs));
      const progress = totalMs > 0 ? elapsedMs / totalMs : 0;

      const expectedProfit = (trade.amount * trade.roi) / 100;
      let currentProfit = 0;

      if (trade.status === "completed") {
        currentProfit = trade.profit || expectedProfit;
      } else {
        const baseProfit = expectedProfit * progress;
        const fluctuationPercent = (Math.random() * 6 - 3) / 100;
        currentProfit = Math.min(
          Math.max(baseProfit * (1 + fluctuationPercent), 0),
          expectedProfit
        );
      }

      return {
        ...trade,
        currentProfit: parseFloat(currentProfit.toFixed(2)),
      };
    });

    const activeTrades = updatedTrades.filter(
      (t) => t.status === "active"
    ).length;
    const totalInvestment = updatedTrades.reduce(
      (sum, t) => sum + (t.amount || 0),
      0
    );
    const totalProfit = updatedTrades.reduce(
      (sum, t) => sum + (t.currentProfit || 0),
      0
    );

    res.render("user/trade", {
      title: "Finovex - My Trades",
      user: req.user,
      trades: updatedTrades,
      activeTrades,
      totalInvestment: parseFloat(totalInvestment.toFixed(2)),
      totalProfit: parseFloat(totalProfit.toFixed(2)),
    });
  } catch (err) {
    console.error("Render My Trades page error:", err);
    req.flash("error_msg", "Failed to load trades");
    res.redirect("/dashboard");
  }
};

/**
 * GET /dashboard/trade/place
 */
exports.getPlaceTrade = async (req, res) => {
  try {
    // ✅ Fetch the user with their purchased plans populated
    const user = await User.findById(req.user._id)
      .populate({
        path: "plans.planId",
        model: "InvestmentPlan",
      })
      .lean();

    // Extract purchased plans safely
    const plans = (user.plans || []).map((p) => p.planId).filter(Boolean); // remove nulls if any

    const trades = await Trade.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate("plan")
      .lean();

    const activeTrades = trades.filter((t) => t.status === "active");
    const totalInvestment = activeTrades.reduce(
      (sum, t) => sum + (t.amountUSDT || 0),
      0
    );
    const totalProfit = trades.reduce((sum, t) => sum + (t.profit || 0), 0);

    res.render("user/place-trade", {
      title: "Finovex - Place Trade",
      user: req.user,
      plans,
      activeTrades: activeTrades.length,
      totalInvestment,
      totalProfit,
      csrfToken: req.csrfToken(),
      success_msg: req.flash("success_msg"),
      error_msg: req.flash("error_msg"),
    });
  } catch (err) {
    console.error("Place trade page error:", err);
    req.flash("error_msg", "Unable to load place trade page.");
    res.redirect("/dashboard/trade");
  }
};

/**
 * POST /dashboard/trade/start
 */
exports.startTrade = async (req, res) => {
  try {
    const { tradingPair, amount, planId, currency, durationDays } = req.body;
    const numericUSDT = parseFloat(amount); // Amount entered in USDT
    const tradeDuration = parseDurationDays(durationDays || 1);

    if (!tradingPair || !numericUSDT || !planId || !currency) {
      return res.json({ success: false, error: "All fields are required." });
    }
    if (numericUSDT <= 0) {
      return res.json({ success: false, error: "Amount must be positive." });
    }
    if (tradeDuration <= 0) {
      return res.json({ success: false, error: "Duration must be positive." });
    }

    const plan = await Plan.findById(planId);
    if (!plan)
      return res.json({ success: false, error: "Selected plan not found." });

    const wallet = await Wallet.findOne({ userId: req.user._id });
    if (!wallet)
      return res.json({ success: false, error: "Wallet not found." });

    // Convert USDT to coin amount for the selected currency
    const coinPriceUSDT = await getUSDTPrice(currency.toUpperCase());
    const coinAmount = numericUSDT / coinPriceUSDT;

    // Check actual coin balance in wallet
    if ((wallet[currency.toUpperCase()] || 0) < coinAmount) {
      return res.json({
        success: false,
        error: `Insufficient ${currency.toUpperCase()} balance. Available: ${
          wallet[currency.toUpperCase()] || 0
        }`,
      });
    }

    // Deduct coins from wallet
    wallet[currency.toUpperCase()] -= coinAmount;
    await wallet.save();

    const startDate = new Date();
    const endDate = new Date(
      startDate.getTime() + tradeDuration * 24 * 60 * 60 * 1000
    );

    const trade = await Trade.create({
      user: req.user._id,
      plan: plan._id,
      tradingPair,
      amount: coinAmount, // coin amount
      currency: currency.toUpperCase(),
      amountUSDT: numericUSDT, // USDT amount
      roi: plan.roi,
      startDate,
      endDate,
      status: "active",
      simulatedProfit: 0,
      profit: 0,
      durationDays: tradeDuration,
    });

    // ✅ Sanitize and validate amount
    const cleanAmount = String(req.body.amount || "")
      .replace(/[^\d.]/g, "") // remove $, commas, or text
      .trim();

    const amountUSDT = parseFloat(cleanAmount);

    if (isNaN(amountUSDT) || amountUSDT <= 0) {
      req.flash(
        "error_msg",
        "Invalid amount entered. Please use a number like 50 or 100.00"
      );
      return res.redirect("/dashboard/trade");
    }

    // (Trade creation happens here)

    // ✅ Create transaction record safely
    await Transaction.createRecord({
      userId: req.user._id,
      type: "investment", // valid enum
      currency: currency.toUpperCase(), // BTC / ETH / USDT / USD
      amount: amountUSDT, // correct numeric value
      netAmount: amountUSDT, // required field
      fee: 0,
      status: "completed",
      description: `Started a new ${trade.tradingPair} trade (${trade.roi}% ROI for ${trade.durationDays} days)`,
      metadata: {
        tradeId: trade._id,
        planId: trade.plan,
        tradingPair: trade.tradingPair,
        startDate: trade.startDate,
        endDate: trade.endDate,
      },
    });

    req.flash(
      "success_msg",
      `Trade started successfully! $${numericUSDT} (${coinAmount.toFixed(
        6
      )} ${currency.toUpperCase()}) invested for ${tradeDuration} days.`
    );
    res.json({ success: true, redirect: "/dashboard/trade" });
  } catch (err) {
    console.error("Start trade error:", err);
    res
      .status(500)
      .json({ success: false, error: "Server error starting trade." });
  }
};

/**
 * GET /dashboard/trade/status
 * Return trades with simulated live profit and progress
 */
exports.getTradeStatus = async (req, res) => {
  try {
    const trades = await Trade.find({ user: req.user._id })
      .populate("plan")
      .sort({ createdAt: -1 })
      .lean();

    const now = new Date();

    const updatedTrades = trades.map((trade) => {
      const start = new Date(trade.startDate);
      const end = new Date(trade.endDate);
      const totalMs = end - start;
      const elapsedMs = Math.max(0, Math.min(now - start, totalMs));
      const progress = totalMs > 0 ? elapsedMs / totalMs : 0;

      const expectedProfit = (trade.amount * trade.roi) / 100;
      let currentProfit = 0;

      if (trade.status === "completed") {
        currentProfit = trade.profit || expectedProfit;
      } else {
        const baseProfit = expectedProfit * progress;
        const fluctuationPercent = (Math.random() * 6 - 3) / 100;
        currentProfit = Math.min(
          Math.max(baseProfit * (1 + fluctuationPercent), 0),
          expectedProfit
        );
      }

      return {
        ...trade,
        progress: Math.round(progress * 100),
        currentProfit: parseFloat(currentProfit.toFixed(2)),
        daysRemaining: Math.max(
          0,
          Math.ceil((end - now) / (24 * 60 * 60 * 1000))
        ),
        expectedProfit: parseFloat(expectedProfit.toFixed(2)),
      };
    });

    const activeTrades = updatedTrades.filter(
      (t) => t.status === "active"
    ).length;
    const totalInvestment = updatedTrades.reduce(
      (sum, t) => sum + (t.amount || 0),
      0
    );
    const totalProfit = updatedTrades.reduce(
      (sum, t) => sum + (t.currentProfit || 0),
      0
    );

    res.json({
      success: true,
      trades: updatedTrades,
      activeTrades,
      totalInvestment: parseFloat(totalInvestment.toFixed(2)),
      totalProfit: parseFloat(totalProfit.toFixed(2)),
    });
  } catch (err) {
    console.error("Get trade status error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch trade status",
    });
  }
};
