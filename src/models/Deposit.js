const mongoose = require("mongoose");

const depositSchema = new mongoose.Schema(
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
      default: "USD",
      enum: ["USD", "EUR", "GBP", "BTC", "ETH", "USDT"],
    },
    receiptUrl: {
      type: String, // path or Cloudinary URL
      required: true,
    },
    description: {
      type: String,
      default: "User deposit request",
    },
    status: {
      type: String,
      enum: ["pending", "successful", "failed"],
      default: "pending",
    },
    approvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Add approvedAt timestamp when approved
depositSchema.pre("save", function (next) {
  if (this.isModified("status") && this.status === "approved") {
    this.approvedAt = new Date();
  }
  next();
});

module.exports = mongoose.model("Deposit", depositSchema);
