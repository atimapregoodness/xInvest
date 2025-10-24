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
    tradingPair: { type: String, required: true }, // e.g. BTC/USDT
    amount: { type: Number, required: true }, // amount in chosen currency units
    currency: { type: String, enum: ["USDT", "BTC", "ETH"], required: true },
    roi: { type: Number, required: true }, // percent
    profit: { type: Number, default: 0 }, // settled profit
    simulatedProfit: { type: Number, default: 0 }, // server-side live value
    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
    },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, required: true },
  },
  { timestamps: true }
);

tradeSchema.index({ user: 1, status: 1, endDate: 1 });

module.exports = mongoose.model("Trade", tradeSchema);
