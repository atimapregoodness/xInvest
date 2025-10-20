const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "deposit",
        "withdrawal",
        "investment",
        "profit",
        "transfer",
        "fee",
        "bonus",
      ],
      required: true,
    },
    currency: {
      type: String,
      enum: ["USDT", "BTC", "ETH"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    fee: {
      type: Number,
      default: 0,
      min: 0,
    },
    netAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "cancelled"],
      default: "pending",
    },
    walletAddress: String,
    txHash: String,
    description: String,
    metadata: {
      investmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Investment" },
      planName: String,
      exchangeRate: Number,
      network: {
        type: String,
        enum: ["ERC20", "TRC20", "BEP20", "BTC", "ETH"],
      },
      confirmations: { type: Number, default: 0 },
    },
    completedAt: Date,
    failureReason: String,
  },
  {
    _id: false, // No separate _id for embedded docs
    timestamps: true,
  }
);

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    wallet: {
      BTC: { type: Number, default: 0 },
      ETH: { type: Number, default: 0 },
      USDT: { type: Number, default: 0 },
      totalBalance: { type: Number, default: 0 },
    },
    // EMBEDDED TRANSACTIONS (MAX 1000 transactions per user)
    transactions: [transactionSchema],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
