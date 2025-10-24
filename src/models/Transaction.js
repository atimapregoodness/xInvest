const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
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
      "purchase",
      "credit",
    ],
    required: true,
  },
  currency: {
    type: String,
    enum: ["BTC", "ETH", "USDT", "USD"],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  netAmount: {
    type: Number,

    min: 0,
  },
  fee: {
    type: Number,
    default: 0,
    min: 0,
  },
  status: {
    type: String,
    enum: ["pending", "completed", "failed"],
    default: "pending",
  },
  description: {
    type: String,
    trim: true,
  },
  txHash: {
    type: String,
    trim: true,
    default: null,
    sparse: true,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update updatedAt timestamp automatically
TransactionSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// ======================================================================
// STATIC HELPER: CREATE TRANSACTION RECORD EASILY
// ======================================================================
TransactionSchema.statics.createRecord = async function (data) {
  try {
    const tx = new this({
      userId: data.userId,
      type: data.type,
      currency: data.currency,
      amount: data.amount,
      netAmount: data.netAmount ?? data.amount,
      fee: data.fee ?? 0,
      status: data.status ?? "completed",
      description: data.description ?? "",
      metadata: data.metadata ?? {},
      txHash:
        data.txHash ??
        `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
    });

    await tx.save();
    return tx;
  } catch (err) {
    console.error("Error creating transaction record:", err);
    throw err;
  }
};

module.exports = mongoose.model("Transaction", TransactionSchema);
