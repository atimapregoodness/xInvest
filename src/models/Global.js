// models/Global.js (New Model for Global Settings)
const mongoose = require("mongoose");

const GlobalSchema = new mongoose.Schema(
  {
    wallets: {
      ETH: { type: String, default: "" },
      BTC: { type: String, default: "" },
      USDT: { type: String, default: "" },
    },
    company: {
      phone: { type: String, default: "" },
      email: { type: String, default: "" },
      address: { type: String, default: "" }, // Optional additional field
      website: { type: String, default: "" }, // Optional additional field
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Global", GlobalSchema);
