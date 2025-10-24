const Trade = require("../models/Trade");
const Plan = require("../models/InvestmentPlan");
const Wallet = require("../models/Wallet");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const parseDurationDays = require("../utils/parseDurationDays");

// Map symbols to CoinGecko IDs
const COINGECKO_IDS = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  USDT: "tether",
  ADA: "cardano",
  XRP: "ripple",
};

// Get current coin price in USDT
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

// GET /dashboard/trade
exports.getTrades = async (req, res) => {
  try {
    const trades = await Trade.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate("plan")
      .lean();

    const activeTrades = trades.filter((t) => t.status === "active");
    const totalInvestment = activeTrades.reduce(
      (sum, t) => sum + (t.amountUSDT || 0),
      0
    );
    const totalProfit = trades.reduce(
      (sum, t) =>
        sum + ((t.status === "completed" ? t.profit : t.simulatedProfit) || 0),
      0
    );

    res.render("user/trade", {
      title: "Finovex - My Trades",
      user: req.user,
      activeTrades: activeTrades.length,
      totalInvestment,
      totalProfit,
      success_msg: req.flash("success_msg"),
      error_msg: req.flash("error_msg"),
    });
  } catch (err) {
    console.error("Trades page error:", err);
    req.flash("error_msg", "Unable to load trades.");
    res.redirect("/dashboard");
  }
};

// GET /dashboard/trade/status
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
      const progress = totalMs > 0 ? (elapsedMs / totalMs) * 100 : 0;

      const expectedProfit = (trade.amountUSDT * trade.roi) / 100;

      let currentProfit;
      if (trade.status === "completed") {
        currentProfit = trade.profit || expectedProfit;
      } else {
        // Use simulatedProfit if updated by cron, fallback to linear growth
        currentProfit =
          trade.simulatedProfit ?? expectedProfit * (progress / 100);
      }

      return {
        ...trade,
        progress: Math.round(progress),
        currentProfit: parseFloat(currentProfit.toFixed(2)),
        expectedProfit: parseFloat(expectedProfit.toFixed(2)),
        daysRemaining: Math.max(
          0,
          Math.ceil((end - now) / (24 * 60 * 60 * 1000))
        ),
      };
    });

    res.json({ success: true, trades: updatedTrades });
  } catch (err) {
    console.error("Get trade status error:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch trade status" });
  }
};

// GET /dashboard/trade/place
exports.getPlaceTrade = async (req, res) => {
  try {
    // Fetch only the plans the user purchased
    const user = await req.user.populate("plans.planId");
    const plans = user.plans.map((p) => p.planId).filter(Boolean); // filter out nulls

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

// POST /dashboard/trade/start
exports.startTrade = async (req, res) => {
  try {
    const { tradingPair, amount, planId, currency, durationDays } = req.body;
    const numericUSDT = parseFloat(amount); // amount entered in USDT
    const tradeDuration = parseDurationDays(durationDays || 1);

    if (!tradingPair || !numericUSDT || !planId || !currency) {
      return res.json({ success: false, error: "All fields are required." });
    }
    if (numericUSDT <= 0)
      return res.json({ success: false, error: "Amount must be positive." });
    if (tradeDuration <= 0)
      return res.json({ success: false, error: "Duration must be positive." });

    const plan = await Plan.findById(planId);
    if (!plan)
      return res.json({ success: false, error: "Selected plan not found." });

    const wallet = await Wallet.findOne({ userId: req.user._id });
    if (!wallet)
      return res.json({ success: false, error: "Wallet not found." });

    // Convert USDT to coin amount
    const coinPriceUSDT = await getUSDTPrice(currency.toUpperCase());
    const coinAmount = numericUSDT / coinPriceUSDT;

    // Check balance
    if ((wallet[currency.toUpperCase()] || 0) < coinAmount) {
      return res.json({
        success: false,
        error: `Insufficient ${currency.toUpperCase()} balance. Available: ${(
          wallet[currency.toUpperCase()] || 0
        ).toFixed(6)}`,
      });
    }

    // Deduct coin from wallet
    wallet[currency.toUpperCase()] -= coinAmount;
    await wallet.save();

    const startDate = new Date();
    const endDate = new Date(
      startDate.getTime() + tradeDuration * 24 * 60 * 60 * 1000
    );

    await Trade.create({
      user: req.user._id,
      plan: plan._id,
      tradingPair,
      amount: coinAmount,
      currency: currency.toUpperCase(),
      amountUSDT: numericUSDT,
      roi: plan.roi,
      startDate,
      endDate,
      status: "active",
      simulatedProfit: 0,
      profit: 0,
      durationDays: tradeDuration,
    });

    req.flash(
      "success_msg",
      `Trade started! $${numericUSDT} (${coinAmount.toFixed(
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
