// Updated Investment model
const mongoose = require("mongoose");
const Transaction = require("./Transaction");

const investmentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tradingPair: {
      type: String,
      required: true,
    },
    botType: {
      type: String,
      enum: ["welbuilder", "premium", "elite"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [50, "Minimum investment is $50"],
    },
    period: {
      type: Number,
      required: true,
      min: [1, "Minimum period is 1 day"],
    },
    riskLevel: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    paymentMethod: {
      type: String,
      enum: ["btc", "eth"],
      required: true,
    },
    platformFee: {
      type: Number,
      default: 0,
    },
    minProfit: {
      type: Number,
      required: true,
    },
    maxProfit: {
      type: Number,
      required: true,
    },
    currentProfit: {
      type: Number,
      default: 0,
    },
    finalProfit: {
      type: Number,
      default: 0,
    },
    totalProfit: {
      type: Number,
      required: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
    },
    profitHistory: [
      {
        timestamp: Date,
        profit: Number,
      },
    ],
    profitWithdrawn: {
      type: Boolean,
      default: false,
    },
    withdrawnAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes
investmentSchema.index({ user: 1, status: 1 });
investmentSchema.index({ endDate: 1 });
investmentSchema.index({ createdAt: -1 });

// Virtual for remaining time
investmentSchema.virtual("remainingTime").get(function () {
  const now = new Date();
  const remaining = this.endDate - now;
  return Math.max(0, Math.ceil(remaining / (1000 * 60 * 60 * 24)));
});

// Virtual for isActive
investmentSchema.virtual("isActive").get(function () {
  return this.status === "active" && new Date() < this.endDate;
});

// Method to update profit
investmentSchema.methods.updateProfit = function (newProfit) {
  this.currentProfit = newProfit;
  this.profitHistory.push({
    timestamp: new Date(),
    profit: newProfit,
  });
  return this.save();
};

// Method to complete investment
investmentSchema.methods.complete = function () {
  this.status = "completed";
  this.finalProfit = this.currentProfit;
  return this.save();
};

// Method to calculate current profit (for real-time)
investmentSchema.methods.calculateCurrentProfit = function () {
  if (this.status !== "active") return this.currentProfit;

  const timePassed = Date.now() - this.startDate.getTime();
  const totalTime = this.endDate.getTime() - this.startDate.getTime();
  const fraction = Math.min(timePassed / totalTime, 1);
  return fraction * this.totalProfit;
};

module.exports = mongoose.model("Investment", investmentSchema);
