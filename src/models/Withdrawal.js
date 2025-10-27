const mongoose = require("mongoose");

const withdrawalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      enum: ["BTC", "ETH", "USDT"],
    },
    walletAddress: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    approvedAt: {
      type: Date,
    },
    note: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

withdrawalSchema.pre("save", function (next) {
  if (this.isModified("status") && this.status === "approved") {
    this.approvedAt = new Date();
  }
  next();
});

module.exports = mongoose.model("Withdrawal", withdrawalSchema);
