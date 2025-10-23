// controllers/InvestController.js
const Investment = require("../models/Investment");
const InvestmentPlan = require("../models/InvestmentPlan");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const User = require("../models/User");

// Get user's active investments
exports.getActiveInvestments = async (req, res) => {
  try {
    const investments = await Investment.find({
      user: req.user._id,
      status: "active",
    })
      .populate("plan")
      .sort({ createdAt: -1 })
      .lean();

    const investmentsWithProgress = investments.map((inv) => {
      const now = new Date();
      const start = new Date(inv.startDate);
      const end = new Date(inv.endDate);
      const total = end - start;
      const elapsed = now - start;

      const progress =
        elapsed <= 0
          ? 0
          : elapsed >= total
          ? 100
          : Math.min(100, (elapsed / total) * 100);

      const daysRemaining =
        progress >= 100 ? 0 : Math.ceil((end - now) / (1000 * 60 * 60 * 24));

      return {
        ...inv,
        progress: Math.round(progress),
        daysRemaining,
        isCompleted: progress >= 100,
        currentROI: ((inv.currentProfit / inv.amount) * 100).toFixed(2),
      };
    });

    res.json(investmentsWithProgress);
  } catch (err) {
    console.error("Error fetching active investments:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

// Create new investment based on purchased plan
exports.createInvestment = async (req, res) => {
  const { tradingPair, planId, amount, period, riskLevel, paymentMethod } =
    req.body;

  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    // Check if user owns the plan
    const userPlan = user.plans.find(
      (p) => p.planId && p.planId.toString() === planId
    );
    if (!userPlan) {
      return res
        .status(400)
        .json({ msg: "You don't own this investment plan" });
    }

    const plan = await InvestmentPlan.findById(planId);
    if (!plan) return res.status(404).json({ msg: "Plan not found" });

    const wallet = await Wallet.findOne({ userId: req.user._id });
    if (!wallet) return res.status(404).json({ msg: "Wallet not found" });

    // Get current prices
    const prices = {
      BTC: 108031.13,
      ETH: 3874.6,
      USDT: 1,
    };

    const upperPayment = paymentMethod.toUpperCase();
    if (!prices[upperPayment]) {
      return res.status(400).json({ msg: "Invalid payment method" });
    }

    const cryptoAmount = amount / prices[upperPayment];

    // Check balance
    if (wallet[upperPayment.toLowerCase()] < cryptoAmount) {
      return res.status(400).json({
        msg: `Insufficient ${upperPayment} balance`,
      });
    }

    // Check if amount is within plan limits
    if (amount < plan.minInvestment) {
      return res.status(400).json({
        msg: `Minimum investment for ${plan.name} is $${plan.minInvestment}`,
      });
    }

    if (amount > plan.maxInvestment) {
      return res.status(400).json({
        msg: `Maximum investment for ${plan.name} is $${plan.maxInvestment}`,
      });
    }

    // Deduct from wallet
    wallet[upperPayment.toLowerCase()] -= cryptoAmount;
    await wallet.calculateTotalBalance();
    await wallet.save();

    // Create transaction record
    await Transaction.createRecord({
      userId: req.user._id,
      type: "investment",
      currency: upperPayment,
      amount: cryptoAmount,
      netAmount: cryptoAmount,
      fee: 0,
      status: "completed",
      description: `Investment in ${plan.name} for ${tradingPair}`,
      metadata: {
        planName: plan.name,
        tradingPair,
        amountUSD: amount,
        riskLevel,
        period,
      },
    });

    // Calculate end date
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + period);

    // Create investment
    const investment = new Investment({
      user: req.user._id,
      plan: planId,
      tradingPair,
      amount: parseFloat(amount),
      period: parseInt(period),
      riskLevel,
      paymentMethod: upperPayment,
      initialCryptoAmount: cryptoAmount,
      cryptoType: upperPayment,
      platformFee: amount * 0.02,
      endDate,
      status: "active",
    });

    await investment.save();

    res.json({
      success: true,
      investment: {
        ...investment.toObject(),
        progress: 0,
        daysRemaining: period,
        isCompleted: false,
      },
    });
  } catch (err) {
    console.error("Error creating investment:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

// Withdraw profit from completed investment
exports.withdrawProfit = async (req, res) => {
  const { id } = req.params;

  try {
    const investment = await Investment.findById(id).populate("plan");
    if (!investment || investment.user.toString() !== req.user._id.toString()) {
      return res.status(404).json({ msg: "Investment not found" });
    }

    if (investment.status !== "completed") {
      return res.status(400).json({ msg: "Investment is not yet completed" });
    }

    if (investment.isProfitWithdrawn) {
      return res.status(400).json({ msg: "Profit already withdrawn" });
    }

    // Mark as withdrawn
    investment.isProfitWithdrawn = true;
    investment.withdrawnAt = new Date();
    await investment.save();

    res.json({
      success: true,
      msg: "Profit withdrawn successfully",
      amount: investment.totalProfit,
    });
  } catch (err) {
    console.error("Error withdrawing profit:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

// Get user's purchased plans for investment
exports.getUserPlans = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("plans.planId");

    const activePlans = user.plans
      .filter((p) => p.planId && p.planId.isActive !== false)
      .map((p) => ({
        id: p.planId._id,
        name: p.planId.name,
        description: p.planId.description,
        icon: p.planId.icon,
        category: p.planId.category,
        roi: p.planId.roi,
        minInvestment: p.planId.minInvestment || 50,
        maxInvestment: p.planId.maxInvestment || 100000,
        riskLevel: p.planId.riskLevel,
        features: p.planId.features || [],
        // Trading-specific properties
        strategy: getStrategyByCategory(p.planId.category),
        profitMin: Math.round(p.planId.roi * 0.7), // 70% of ROI as minimum
        profitMax: Math.round(p.planId.roi * 1.3), // 130% of ROI as maximum
        avgReturn: p.planId.roi,
        periodMin: getMinPeriodByCategory(p.planId.category),
        periodMax: getMaxPeriodByCategory(p.planId.category),
        winRate: getWinRateByCategory(p.planId.category),
        status: "active",
      }));

    res.json(activePlans);
  } catch (err) {
    console.error("Error fetching user plans:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

// Helper functions
function getStrategyByCategory(category) {
  const strategies = {
    Beginner: "Conservative Growth",
    Intermediate: "Balanced Portfolio",
    Professional: "Advanced Algorithmic",
    Elite: "Quantum AI Trading",
    Advanced: "Specialized Strategy",
    Exclusive: "VIP Managed",
  };
  return strategies[category] || "AI-Powered Trading";
}

function getMinPeriodByCategory(category) {
  const periods = {
    Beginner: 7,
    Intermediate: 14,
    Professional: 30,
    Elite: 60,
    Advanced: 45,
    Exclusive: 90,
  };
  return periods[category] || 30;
}

function getMaxPeriodByCategory(category) {
  const periods = {
    Beginner: 30,
    Intermediate: 90,
    Professional: 180,
    Elite: 365,
    Advanced: 270,
    Exclusive: 730,
  };
  return periods[category] || 180;
}

function getWinRateByCategory(category) {
  const winRates = {
    Beginner: 75,
    Intermediate: 80,
    Professional: 85,
    Elite: 90,
    Advanced: 82,
    Exclusive: 88,
  };
  return winRates[category] || 80;
}
