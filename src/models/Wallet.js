const mongoose = require("mongoose");
const Transaction = require("./Transaction");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const WalletSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ====== BALANCES ======
    totalBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    BTC: {
      type: Number,
      default: 0,
      min: 0,
    },
    ETH: {
      type: Number,
      default: 0,
      min: 0,
    },
    USDT: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ====== INVESTMENT STATS ======
    investmentStats: {
      totalDeposit: { type: Number, default: 0 },
      totalWithdrawal: { type: Number, default: 0 },
      depositBreakdown: {
        BTC: { type: Number, default: 0 },
        ETH: { type: Number, default: 0 },
        USDT: { type: Number, default: 0 },
      },
      withdrawalBreakdown: {
        BTC: { type: Number, default: 0 },
        ETH: { type: Number, default: 0 },
        USDT: { type: Number, default: 0 },
      },
    },

    // ====== EARNINGS ======
    profit: { type: Number, default: 0 },
    bonus: {
      BTC: { type: Number, default: 0 },
      ETH: { type: Number, default: 0 },
      totalBonus: { type: Number, default: 0 },
    },

    // ====== TRANSACTIONS ======
    transactions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Transaction",
      },
    ],

    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

//
// ====== PRE-SAVE MIDDLEWARE ======
//
WalletSchema.pre("save", async function (next) {
  try {
    // Fetch real-time prices (cached or live)
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether&vs_currencies=usd"
    );
    const data = await response.json();

    const btcPrice = data.bitcoin?.usd || 67850;
    const ethPrice = data.ethereum?.usd || 3450;
    const usdtPrice = data.tether?.usd || 1;

    // Calculate USD equivalent
    this.totalBalance =
      this.BTC * btcPrice + this.ETH * ethPrice + this.USDT * usdtPrice;

    // Calculate total bonus
    this.bonus.totalBonus = this.bonus.BTC + this.bonus.ETH;
    this.lastUpdated = Date.now();

    next();
  } catch (error) {
    console.error("Error updating wallet balance:", error);
    next();
  }
});

//
// ====== METHODS ======
//

// --- Add Transaction ---
WalletSchema.methods.addTransaction = async function (transactionData) {
  const {
    type,
    currency,
    amount,
    fee = 0,
    description,
    txHash,
    status = "pending",
  } = transactionData;

  const netAmount = amount - fee;

  if (!["BTC", "ETH", "USDT"].includes(currency)) {
    throw new Error(`Invalid currency: ${currency}`);
  }

  // Update balances and stats
  if (["deposit", "profit", "bonus"].includes(type)) {
    this[currency] += netAmount;
    if (type === "deposit") {
      this.investmentStats.totalDeposit += netAmount;
      this.investmentStats.depositBreakdown[currency] += netAmount;
    } else if (type === "profit") {
      this.profit += netAmount;
    } else if (type === "bonus") {
      this.bonus[currency] += netAmount;
      this.bonus.totalBonus += netAmount;
    }
  } else if (["withdrawal", "investment", "fee"].includes(type)) {
    if (this[currency] < netAmount)
      throw new Error(`Insufficient ${currency} balance`);
    this[currency] -= netAmount;
    if (type === "withdrawal") {
      this.investmentStats.totalWithdrawal += netAmount;
      this.investmentStats.withdrawalBreakdown[currency] += netAmount;
    }
  }

  // Create Transaction record
  const transaction = await Transaction.create({
    type,
    currency,
    amount,
    netAmount,
    fee,
    status,
    description,
    txHash,
    metadata: transactionData.metadata || {},
  });

  this.transactions.push(transaction._id);
  await this.save();

  return transaction;
};

// --- Calculate Total Balance in USD (manual refresh) ---
WalletSchema.methods.calculateTotalBalance = async function () {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether&vs_currencies=usd"
    );
    const data = await response.json();

    const btcPrice = data.bitcoin?.usd || 67850;
    const ethPrice = data.ethereum?.usd || 3450;
    const usdtPrice = data.tether?.usd || 1;

    const total =
      this.BTC * btcPrice + this.ETH * ethPrice + this.USDT * usdtPrice;

    this.totalBalance = total;
    await this.save();

    return total;
  } catch (error) {
    console.error("Balance calculation failed:", error);
    return this.totalBalance;
  }
};

module.exports = mongoose.model("Wallet", WalletSchema);
