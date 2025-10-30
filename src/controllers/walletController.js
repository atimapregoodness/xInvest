const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Deposit = require("../models/Deposit");
const Transaction = require("../models/Transaction");

// ===================== GET WALLET DETAILS =====================
exports.getWallet = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("wallet");

    if (!user || !user.wallet) {
      req.flash(
        "error_msg",
        "Wallet not found. Please create one to continue."
      );
      return res.redirect("/dashboard");
    }

    const transactions = await Transaction.find({ userId: req.user._id });

    await user.wallet.calculateTotalBalance?.(); // optional balance update

    res.locals.wallet = user.wallet;
    res.locals.transactions = transactions || [];
    res.locals.user = user;

    res.render("user/wallet", {
      title: "My Wallet",
      user,
      wallet: user.wallet,
      page: "wallet",
      success_msg: req.flash("success_msg"),
      error_msg: req.flash("error_msg"),
    });
  } catch (error) {
    console.error("❌ Wallet fetch error:", error);
    req.flash("error_msg", "Something went wrong while loading your wallet.");
    res.redirect("/dashboard");
  }
};

const {
  sendDepositEmail,
  sendWithdrawalEmail,
} = require("../utils/emailService");

// ===================== DEPOSIT =====================
exports.deposit = async (req, res) => {
  try {
    const { amount, currency, description } = req.body;

    // Validate input
    if (!amount || amount <= 0) {
      req.flash("error_msg", "Invalid deposit amount.");
      return res.redirect("/dashboard/wallet");
    }

    if (!req.file || !req.file.path) {
      req.flash("error_msg", "Please upload a payment receipt.");
      return res.redirect("/dashboard/wallet");
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      req.flash("error_msg", "User not found.");
      return res.redirect("/dashboard/wallet");
    }

    // Create pending deposit
    const newDeposit = new Deposit({
      user: user._id,
      amount,
      currency: currency.toUpperCase(),
      receiptUrl: req.file.path,
      description: description || "Deposit request",
      status: "pending",
    });

    await newDeposit.save();

    // Create transaction record
    await Transaction.createRecord({
      userId: user._id,
      type: "deposit",
      currency: currency.toUpperCase(),
      amount,
      netAmount: amount,
      fee: 0,
      status: "pending",
      description: description || "Deposit request",
    });

    // Send professional email
    await sendDepositEmail(
      user.email,
      user.fullname || "Investor",
      amount,
      currency.toUpperCase(),
      "pending",
      req.file.path
    );

    req.flash(
      "success_msg",
      "Deposit submitted successfully! Awaiting admin approval."
    );
    res.redirect("/dashboard/wallet");
  } catch (error) {
    console.error("❌ Deposit error:", error.stack || error);
    req.flash(
      "error_msg",
      "Something went wrong while processing your deposit. Please try again."
    );
    res.redirect("/dashboard/wallet");
  }
};

// ===================== WITHDRAWAL =====================
exports.withdraw = async (req, res) => {
  try {
    const { amount, currency, description } = req.body;

    const user = await User.findById(req.user._id).populate("wallet");
    if (!user || !user.wallet) {
      req.flash("error_msg", "Wallet not found.");
      return res.redirect("/dashboard/wallet");
    }

    const balance = user.wallet[currency] || 0;
    const fee = amount * 0.01; // 1% fee
    const total = amount + fee;

    if (balance < total) {
      req.flash("error_msg", "Insufficient funds to cover withdrawal + fee.");
      return res.redirect("/dashboard/wallet");
    }

    // Deduct total from wallet
    user.wallet[currency] -= total;
    await user.wallet.save();

    // Record transaction
    await user.wallet.addTransaction({
      type: "withdrawal",
      currency,
      amount,
      fee,
      total,
      status: "completed", // admin review can be pending instead
      description: description || "User withdrawal",
      date: new Date(),
    });

    // Send professional withdrawal email
    await sendWithdrawalEmail(
      user.email,
      user.fullname || "Investor",
      amount,
      currency.toUpperCase(),
      fee.toFixed(6),
      total.toFixed(6),
      user.wallet[currency].toFixed(6)
    );

    req.flash(
      "success_msg",
      `Withdrawal of ${amount} ${currency} processed successfully!`
    );
    res.redirect("/dashboard/wallet");
  } catch (error) {
    console.error("❌ Withdrawal error:", error);
    req.flash("error_msg", "Failed to process withdrawal.");
    res.redirect("/dashboard/wallet");
  }
};

// ===================== TRANSACTION HISTORY =====================
exports.getTransactions = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("wallet");

    if (!user || !user.wallet) {
      req.flash("error_msg", "Wallet not found.");
      return res.redirect("/dashboard/wallet");
    }

    res.render("wallet/transactions", {
      title: "Transaction History",
      user,
      transactions: user.wallet.transactions || [],
      page: "wallet-transactions",
      success_msg: req.flash("success_msg"),
      error_msg: req.flash("error_msg"),
    });
  } catch (error) {
    console.error("❌ Transaction history error:", error);
    req.flash("error_msg", "Unable to load transaction history.");
    res.redirect("/dashboard/wallet");
  }
};
