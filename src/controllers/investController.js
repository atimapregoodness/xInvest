const Investment = require("../models/Investment");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const User = require("../models/User");

exports.getActiveInvestments = async (req, res) => {
  try {
    const investments = await Investment.find({
      user: req.user._id,
      status: "active",
    });
    res.json(investments);
  } catch (err) {
    console.error("Error fetching active investments:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

exports.createInvestment = async (req, res) => {
  const { tradingPair, botType, amount, period, riskLevel, paymentMethod } =
    req.body;

  try {
    const wallet = await Wallet.findOne({ userId: req.user._id });
    if (!wallet) return res.status(404).json({ msg: "Wallet not found" });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    // Fetch current prices (use API in production)
    const prices = { BTC: 108380.01, ETH: 3874.6 }; // Updated from web search
    const upperPayment = paymentMethod.toUpperCase();
    if (!prices[upperPayment])
      return res.status(400).json({ msg: "Invalid payment method" });

    const cryptoAmount = amount / prices[upperPayment];

    if (wallet[upperPayment] < cryptoAmount) {
      return res
        .status(400)
        .json({ msg: `Insufficient ${upperPayment} balance` });
    }

    wallet[upperPayment] -= cryptoAmount;
    await wallet.calculateTotalBalance();
    await wallet.save();

    // Create transaction
    const transaction = new Transaction({
      type: "investment",
      currency: upperPayment,
      amount: cryptoAmount,
      netAmount: cryptoAmount,
      fee: 0,
      status: "completed",
      description: "Investment in " + botType,
    });
    await transaction.save();

    wallet.transactions.push(transaction._id);
    await wallet.save();

    const plan = user.tradingPlans.find((p) => p.planType === botType);
    if (!plan) return res.status(400).json({ msg: "Plan not found" });

    const riskFactor =
      riskLevel === "low" ? 0.7 : riskLevel === "high" ? 1.3 : 1;
    const minProfit = plan.profitMin * riskFactor;
    const maxProfit = plan.profitMax * riskFactor;
    const totalProfit =
      (amount * (Math.random() * (maxProfit - minProfit) + minProfit)) / 100;

    const endDate = new Date(Date.now() + period * 86400000);

    const investment = new Investment({
      user: req.user._id,
      tradingPair,
      botType,
      amount,
      period,
      riskLevel,
      paymentMethod,
      platformFee: amount * 0.02,
      minProfit,
      maxProfit,
      totalProfit,
      endDate,
    });

    await investment.save();

    user.activeInvestments.push(investment._id);
    await user.save();

    res.json(investment);
  } catch (err) {
    console.error("Error creating investment:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

exports.withdrawProfit = async (req, res) => {
  const id = req.params.id;

  try {
    const investment = await Investment.findById(id);
    if (
      !investment ||
      investment.user.toString() !== req.user._id.toString() ||
      investment.status !== "completed" ||
      investment.profitWithdrawn
    ) {
      return res.status(400).json({ msg: "Invalid investment" });
    }

    const wallet = await Wallet.findOne({ userId: req.user._id });
    // Fetch current prices (use API in production)
    const prices = { BTC: 108380.01, ETH: 3874.6, USDT: 1 }; // Updated from web search
    const creditCurrencies = ["BTC", "ETH", "USDT"];
    const creditTo =
      creditCurrencies[Math.floor(Math.random() * creditCurrencies.length)];
    const creditAmount = investment.finalProfit / prices[creditTo];

    wallet[creditTo] += creditAmount;
    await wallet.calculateTotalBalance();
    await wallet.save();

    // Create transaction
    const transaction = new Transaction({
      type: "profit",
      currency: creditTo,
      amount: creditAmount,
      netAmount: creditAmount,
      fee: 0,
      status: "completed",
      description: "Profit withdrawal from investment " + investment._id,
    });
    await transaction.save();

    wallet.transactions.push(transaction._id);
    await wallet.save();

    investment.profitWithdrawn = true;
    investment.withdrawnAt = new Date();
    await investment.save();

    const user = await User.findById(req.user._id);
    user.investmentHistory.push(investment._id);
    user.activeInvestments = user.activeInvestments.filter(
      (inv) => inv.toString() !== id
    );
    await user.save();

    res.json({ msg: "Profit withdrawn" });
  } catch (err) {
    console.error("Error withdrawing profit:", err);
    res.status(500).json({ msg: "Server error" });
  }
};
