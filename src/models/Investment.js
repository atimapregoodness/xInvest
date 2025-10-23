// models/Investment.js
const mongoose = require("mongoose");

const investmentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InvestmentPlan",
      required: true,
    },
    tradingPair: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 50,
    },
    period: {
      type: Number, // in days
      required: true,
    },
    riskLevel: {
      type: String,
      enum: ["low", "medium", "high"],
      required: true,
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    initialCryptoAmount: {
      type: Number,
      required: true,
    },
    cryptoType: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
    },
    currentProfit: {
      type: Number,
      default: 0,
    },
    totalProfit: {
      type: Number,
      default: 0,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    platformFee: {
      type: Number,
      default: 0,
    },
    profitHistory: [
      {
        timestamp: Date,
        profit: Number,
        percentage: Number,
      },
    ],
    lastProfitUpdate: {
      type: Date,
      default: Date.now,
    },
    isProfitWithdrawn: {
      type: Boolean,
      default: false,
    },
    withdrawnAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for progress percentage
investmentSchema.virtual("progress").get(function () {
  const now = new Date();
  const start = new Date(this.startDate);
  const end = new Date(this.endDate);
  const total = end - start;
  const elapsed = now - start;

  if (elapsed <= 0) return 0;
  if (elapsed >= total) return 100;

  return Math.min(100, (elapsed / total) * 100);
});

// Virtual for days remaining
investmentSchema.virtual("daysRemaining").get(function () {
  const now = new Date();
  const end = new Date(this.endDate);
  const diff = end - now;

  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Virtual for isCompleted
investmentSchema.virtual("isCompleted").get(function () {
  return new Date() >= new Date(this.endDate);
});

// Static method to update profits for all active investments
investmentSchema.statics.updateActiveInvestments = async function () {
  try {
    const activeInvestments = await this.find({
      status: "active",
      endDate: { $gt: new Date() },
    }).populate("user plan");

    const updatePromises = activeInvestments.map(async (investment) => {
      await investment.calculateProfit();
    });

    await Promise.all(updatePromises);
    return activeInvestments.length;
  } catch (error) {
    console.error("Error updating active investments:", error);
    throw error;
  }
};

// Instance method to calculate profit
investmentSchema.methods.calculateProfit = async function () {
  const now = new Date();
  const timeSinceLastUpdate = now - new Date(this.lastProfitUpdate);

  // Only update if at least 30 seconds have passed
  if (timeSinceLastUpdate < 30000) return;

  const progress = this.progress / 100;
  const plan = this.plan;

  // Base profit calculation based on risk level and plan ROI
  let baseProfitRate;
  switch (this.riskLevel) {
    case "low":
      baseProfitRate = (plan.roi / 100) * 0.0003;
      break;
    case "medium":
      baseProfitRate = (plan.roi / 100) * 0.0006;
      break;
    case "high":
      baseProfitRate = (plan.roi / 100) * 0.001;
      break;
  }

  // Add randomness based on plan category
  const randomFactor = 0.7 + Math.random() * 0.6;
  const winProbability = 0.7 + Math.random() * 0.25; // 70-95% win rate

  const isProfit = Math.random() < winProbability;
  const profitChange = this.amount * baseProfitRate * randomFactor * progress;
  const profit = isProfit ? profitChange : -profitChange * 0.5;

  this.currentProfit += profit;
  this.totalProfit += profit;

  // Record profit history
  this.profitHistory.push({
    timestamp: now,
    profit: profit,
    percentage: (profit / this.amount) * 100,
  });

  // Keep only last 100 records
  if (this.profitHistory.length > 100) {
    this.profitHistory = this.profitHistory.slice(-100);
  }

  this.lastProfitUpdate = now;
  await this.save();

  return profit;
};

// Instance method to complete investment
investmentSchema.methods.completeInvestment = async function () {
  if (this.status !== "active") return;

  this.status = "completed";

  // Final profit calculation with completion bonus
  const completionBonus = this.amount * 0.01;
  this.totalProfit += completionBonus;
  this.currentProfit = this.totalProfit;

  await this.save();

  // Add transaction for the profit
  const Transaction = mongoose.model("Transaction");
  await Transaction.createRecord({
    userId: this.user._id ? this.user._id : this.user,
    type: "profit",
    currency: this.cryptoType,
    amount: this.totalProfit / (await getCurrentPrice(this.cryptoType)),
    netAmount: this.totalProfit / (await getCurrentPrice(this.cryptoType)),
    fee: 0,
    status: "completed",
    description: `Trading profit from ${this.tradingPair} investment (${this.plan.name})`,
    metadata: {
      investmentId: this._id,
      tradingPair: this.tradingPair,
      planName: this.plan.name,
      initialAmount: this.amount,
      totalProfit: this.totalProfit,
    },
  });

  // Update user's wallet
  const Wallet = mongoose.model("Wallet");
  const wallet = await Wallet.findOne({
    userId: this.user._id ? this.user._id : this.user,
  });
  if (wallet) {
    const cryptoAmount =
      this.totalProfit / (await getCurrentPrice(this.cryptoType));
    wallet[this.cryptoType.toLowerCase()] += cryptoAmount;
    await wallet.calculateTotalBalance();
    await wallet.save();
  }

  return this;
};

// Helper function to get current price
async function getCurrentPrice(cryptoType) {
  const prices = {
    BTC: 108031.13,
    ETH: 3874.6,
    USDT: 1,
  };
  return prices[cryptoType] || 1;
}

module.exports = mongoose.model("Investment", investmentSchema);
