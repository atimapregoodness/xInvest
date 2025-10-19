const mongoose = require("mongoose");

const investmentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    plan: {
      name: {
        type: String,
        required: true,
        enum: ["Starter", "Professional", "Institutional", "VIP"],
      },
      type: {
        type: String,
        enum: ["fixed", "flexible"],
        required: true,
      },
      duration: {
        type: Number,
        required: true,
      },
      apy: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
      },
      minAmount: {
        type: Number,
        required: true,
        min: 0,
      },
      maxAmount: {
        type: Number,
        required: true,
        min: 0,
      },
      features: [String],
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: function (value) {
          return value >= this.plan.minAmount && value <= this.plan.maxAmount;
        },
        message: "Amount must be within plan limits",
      },
    },
    currency: {
      type: String,
      enum: ["USDT", "BTC", "ETH"],
      default: "USDT",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "completed", "cancelled", "paused"],
      default: "active",
    },
    currentValue: {
      type: Number,
      default: 0,
    },
    totalProfit: {
      type: Number,
      default: 0,
    },
    expectedProfit: {
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
    nextPayout: {
      type: Date,
      required: true,
    },
    payoutHistory: [
      {
        date: Date,
        amount: Number,
        type: {
          type: String,
          enum: ["profit", "principal"],
        },
        transactionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Transaction",
        },
      },
    ],
    autoReinvest: {
      type: Boolean,
      default: false,
    },
    riskLevel: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
investmentSchema.index({ user: 1, status: 1 });
investmentSchema.index({ status: 1, nextPayout: 1 });

// Virtual for days remaining
investmentSchema.virtual("daysRemaining").get(function () {
  const now = new Date();
  const end = new Date(this.endDate);
  const diffTime = Math.abs(end - now);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for progress percentage
investmentSchema.virtual("progress").get(function () {
  const totalDuration = Math.abs(
    new Date(this.endDate) - new Date(this.startDate)
  );
  const elapsed = Math.abs(Date.now() - new Date(this.startDate));
  return Math.min((elapsed / totalDuration) * 100, 100);
});

// Instance methods
investmentSchema.methods.calculateExpectedProfit = function () {
  const dailyRate = this.plan.apy / 365 / 100;
  const days = Math.min(
    Math.ceil((Date.now() - this.startDate) / (1000 * 60 * 60 * 24)),
    this.plan.duration
  );
  return this.amount * dailyRate * days;
};

investmentSchema.methods.isDueForPayout = function () {
  return this.nextPayout <= new Date() && this.status === "active";
};

investmentSchema.methods.addPayout = function (amount, type, transactionId) {
  this.payoutHistory.push({
    date: new Date(),
    amount,
    type,
    transactionId,
  });
  this.totalProfit += type === "profit" ? amount : 0;
  this.nextPayout = this.calculateNextPayout();
  return this.save();
};

investmentSchema.methods.calculateNextPayout = function () {
  const next = new Date(this.nextPayout);
  switch (this.plan.type) {
    case "fixed":
      next.setDate(next.getDate() + 30); // Monthly payouts
      break;
    case "flexible":
      next.setDate(next.getDate() + 7); // Weekly payouts
      break;
    default:
      next.setDate(next.getDate() + 1); // Daily (shouldn't happen)
  }
  return next;
};

// Pre-save middleware
investmentSchema.pre("save", function (next) {
  if (this.isNew) {
    this.expectedProfit =
      this.amount * (this.plan.apy / 100) * (this.plan.duration / 365);
    this.endDate = new Date(this.startDate);
    this.endDate.setDate(this.endDate.getDate() + this.plan.duration);
    this.nextPayout = this.calculateNextPayout();
  }

  if (this.isModified("amount") && !this.isNew) {
    this.expectedProfit =
      this.amount * (this.plan.apy / 100) * (this.plan.duration / 365);
  }

  next();
});

module.exports = mongoose.model("Investment", investmentSchema);
