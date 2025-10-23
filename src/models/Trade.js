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
    tradingPair: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    roi: { type: Number, required: true }, // percentage e.g. 15 => 15%
    profit: { type: Number, default: 0 }, // stored final profit when completed
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
