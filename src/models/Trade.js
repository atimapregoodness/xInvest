// models/Trade.js
const mongoose = require("mongoose");

const tradeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InvestmentPlan",
      required: true,
    },
    tradingPair: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, enum: ["USDT", "BTC", "ETH"], required: true },
    roi: { type: Number, required: true },
    profit: { type: Number, default: 0 },
    simulatedProfit: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
    },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, required: true },
    durationDays: {
      type: Number,
      default: 7, // Add default value
    },
  },
  { timestamps: true }
);

// Add pre-save middleware to calculate durationDays if missing
tradeSchema.pre("save", function (next) {
  if (!this.durationDays && this.startDate && this.endDate) {
    const diffTime = Math.abs(this.endDate - this.startDate);
    this.durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  next();
});

tradeSchema.index({ user: 1, status: 1, endDate: 1 });

module.exports = mongoose.model("Trade", tradeSchema);
