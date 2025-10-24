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
      enum: ["USD", "EUR", "GBP", "BTC", "ETH", "USDT"], // add more if needed
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ["bank", "crypto", "card", "wallet"],
    },
    receipt: {
      type: String, // URL to uploaded image (Cloudinary, etc.)
      required: false,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Admin user who approved
      required: false,
    },
    approvedAt: {
      type: Date,
    },
    note: {
      type: String, // optional admin note
      trim: true,
    },
  },
  { timestamps: true }
);

// Optional: Auto-set approvedAt when status becomes "approved"
depositSchema.pre("save", function (next) {
  if (this.isModified("status") && this.status === "approved") {
    this.approvedAt = new Date();
  }
  next();
});

module.exports = mongoose.model("Deposit", depositSchema);
