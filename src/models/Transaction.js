const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
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
    walletAddress: {
      type: String,
      required: function () {
        return this.type === "withdrawal" || this.type === "deposit";
      },
    },
    txHash: {
      type: String,
      unique: true,
      sparse: true,
    },
    description: String,
    metadata: {
      investmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Investment",
      },
      planName: String,
      exchangeRate: Number,
      network: {
        type: String,
        enum: ["ERC20", "TRC20", "BEP20", "BTC", "ETH"],
      },
      confirmations: {
        type: Number,
        default: 0,
      },
    },
    completedAt: Date,
    failureReason: String,
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ type: 1, status: 1 });
transactionSchema.index({ txHash: 1 });
transactionSchema.index({ createdAt: 1 });

// Virtual for isConfirmed
transactionSchema.virtual("isConfirmed").get(function () {
  if (!this.metadata.confirmations) return false;
  const minConfirmations =
    this.currency === "BTC" ? 3 : this.currency === "ETH" ? 12 : 1;
  return this.metadata.confirmations >= minConfirmations;
});

// Pre-save middleware
transactionSchema.pre("save", function (next) {
  if (
    this.isModified("status") &&
    this.status === "completed" &&
    !this.completedAt
  ) {
    this.completedAt = new Date();
  }

  if (this.isModified("amount") || this.isModified("fee")) {
    this.netAmount = this.amount - this.fee;
  }

  next();
});

// Static methods
transactionSchema.statics.getUserBalance = async function (userId, currency) {
  const result = await this.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
        currency: currency,
        status: "completed",
      },
    },
    {
      $group: {
        _id: "$type",
        total: { $sum: "$netAmount" },
      },
    },
  ]);

  let balance = 0;
  result.forEach((item) => {
    if (["deposit", "profit", "bonus"].includes(item._id)) {
      balance += item.total;
    } else if (["withdrawal", "investment", "fee"].includes(item._id)) {
      balance -= item.total;
    }
  });

  return Math.max(0, balance);
};

transactionSchema.statics.getRecentTransactions = function (
  userId,
  limit = 10
) {
  return this.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("metadata.investmentId", "plan.name");
};

// Instance methods
transactionSchema.methods.markAsCompleted = function (
  txHash,
  confirmations = 0
) {
  this.status = "completed";
  this.txHash = txHash;
  this.metadata.confirmations = confirmations;
  this.completedAt = new Date();
  return this.save();
};

transactionSchema.methods.markAsFailed = function (reason) {
  this.status = "failed";
  this.failureReason = reason;
  return this.save();
};

module.exports = mongoose.model("Transaction", transactionSchema);
