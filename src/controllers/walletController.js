const User = require("../models/User");
const Wallet = require("../models/Wallet");

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

    await user.wallet.calculateTotalBalance?.(); // optional balance update

    res.locals.wallet = user.wallet;
    res.locals.transactions = user.wallet.transactions || [];
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

// ===================== DEPOSIT =====================
exports.deposit = async (req, res) => {
  try {
    const { amount, currency, description } = req.body;

    if (!amount || amount <= 0) {
      req.flash("error_msg", "Invalid deposit amount.");
      return res.redirect("/wallet");
    }

    const user = await User.findById(req.user._id).populate("wallet");
    if (!user || !user.wallet) {
      req.flash("error_msg", "Wallet not found.");
      return res.redirect("/dashboard/wallet");
    }

    await user.wallet.addTransaction({
      type: "deposit",
      currency,
      amount,
      description: description || "Manual deposit",
      fee: 0,
      status: "completed",
    });

    req.flash("success_msg", "Deposit successful!");
    res.redirect("/wallet");
  } catch (error) {
    console.error("❌ Deposit error:", error);
    req.flash("error_msg", "Failed to process deposit.");
    res.redirect("/dashboard/wallet");
  }
};

// ===================== WITHDRAWAL =====================
exports.withdraw = async (req, res) => {
  try {
    const { amount, currency, description } = req.body;

    if (!amount || amount <= 0) {
      req.flash("error_msg", "Invalid withdrawal amount.");
      return res.redirect("/dashboard/wallet");
    }

    const user = await User.findById(req.user._id).populate("wallet");
    if (!user || !user.wallet) {
      req.flash("error_msg", "Wallet not found.");
      return res.redirect("/dashboard/wallet");
    }

    if (user.wallet[currency] < amount) {
      req.flash("error_msg", "Insufficient funds.");
      return res.redirect("/dashboard/wallet");
    }

    await user.wallet.addTransaction({
      type: "withdrawal",
      currency,
      amount,
      description: description || "User withdrawal",
      fee: 0.01 * amount, // optional 1% fee
      status: "pending",
    });

    req.flash("success_msg", "Withdrawal request submitted successfully.");
    res.redirect("/dashboard/wallet");
  } catch (error) {
    console.error("❌ Withdrawal error:", error);
    req.flash("error_msg", "Failed to process withdrawal.");
    res.redirect("/wallet");
  }
};

// ===================== TRANSFER =====================
exports.transfer = async (req, res) => {
  try {
    const { fromCurrency, toCurrency, amount } = req.body;

    const user = await User.findById(req.user._id).populate("wallet");
    if (!user || !user.wallet) {
      req.flash("error_msg", "Wallet not found.");
      return res.redirect("/dashboard/wallet");
    }

    if (user.wallet[fromCurrency] < amount) {
      req.flash("error_msg", "Insufficient balance for transfer.");
      return res.redirect("/dashboard/wallet");
    }

    await user.wallet.addTransaction({
      type: "transfer",
      currency: fromCurrency,
      amount,
      description: `Internal transfer from ${fromCurrency} to ${toCurrency}`,
      metadata: { fromCurrency, toCurrency },
    });

    user.wallet[toCurrency] += amount;
    await user.wallet.save();

    req.flash("success_msg", "Funds transferred successfully.");
    res.redirect("/dashboard/wallet");
  } catch (error) {
    console.error("❌ Transfer error:", error);
    req.flash("error_msg", "Transfer failed.");
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
