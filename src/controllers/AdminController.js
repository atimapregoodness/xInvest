const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const { sendDepositEmail } = require("../utils/emailService");
const Trade = require("../models/Trade");

// routes/admin.js
exports.getDashboard = async (req, res) => {
  // Example: pull real data from MongoDB
  const totalRevenue = await Transaction.aggregate([
    { $match: { status: "approved" } },
    { $group: { _id: null, sum: { $sum: "$amount" } } },
  ]).then((r) => (r[0] ? r[0].sum : 0));

  const totalUsers = await User.countDocuments();
  const totalOrders = await Trade.countDocuments({ status: "completed" });

  res.render("admin/admin_dashboard", {
    totalRevenue,
    totalUsers,
    totalOrders,
  });
};

exports.getUsers = async (req, res) => {
  const users = await User.find().populate("wallet");
  res.render("admin/users", {
    title: "Manage Users",
    users,
  });
};

exports.restrictUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  user.isRestricted = true;
  await user.save();
  req.flash("success_msg", "User restricted successfully.");
  res.redirect("/admin/users");
};

exports.unrestrictUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  user.isRestricted = false;
  await user.save();
  req.flash("success_msg", "User unrestricted successfully.");
  res.redirect("/admin/users");
};

exports.deleteUser = async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  req.flash("success_msg", "User deleted successfully.");
  res.redirect("/admin/users");
};

exports.updateUserBalance = async (req, res) => {
  const { id } = req.params;
  const { currency, amount } = req.body;

  const wallet = await Wallet.findOne({ userId: id });
  if (!wallet) {
    req.flash("error_msg", "Wallet not found for this user.");
    return res.redirect("/admin/users");
  }

  const amt = parseFloat(amount);
  if (isNaN(amt)) {
    req.flash("error_msg", "Invalid amount entered.");
    return res.redirect("/admin/users");
  }

  wallet[currency] = (wallet[currency] || 0) + amt;

  await wallet.save();

  await Transaction.create({
    netAmount: amt,
    userId: id,
    type: "credit",
    currency,
    amount: amt,
    status: "completed",
    description: `Admin credited ${amt} ${currency}`,
  });

  req.flash("success_msg", `Added ${amt} ${currency} to user's balance.`);
  res.redirect("/admin/users");
};

exports.getTransactions = async (req, res) => {
  const transactions = await Transaction.find()
    .populate("userId", "fullName email")
    .sort({ createdAt: -1 });
  res.render("admin/transactions", {
    layout: "layout/adminBoilerplate",
    title: "Transactions",
    transactions,
  });
};

exports.addTransaction = async (req, res) => {
  const { userId, currency, amount, type } = req.body;
  const wallet = await Wallet.findOne({ userId });

  if (!wallet) {
    req.flash("error_msg", "User wallet not found.");
    return res.redirect("/admin/transactions");
  }

  const amt = parseFloat(amount);
  if (isNaN(amt)) {
    req.flash("error_msg", "Invalid amount entered.");
    return res.redirect("/admin/transactions");
  }

  wallet.balances[currency] =
    (wallet.balances[currency] || 0) + (type === "credit" ? amt : -amt);
  await wallet.save();

  await Transaction.create({
    userId,
    type,
    currency,
    amount: amt,
    status: "completed",
    description: `Admin ${type}ed ${amt} ${currency}`,
  });

  req.flash("success_msg", "Transaction added successfully!");
  res.redirect("/admin/transactions");
};

// Add to your admin controller (adminController.js)
const Global = require("../models/Global");

// ... existing exports ...

exports.getSettings = async (req, res) => {
  try {
    let global = await Global.findOne();
    if (!global) {
      global = new Global();
      await global.save();
    }
    res.render("admin/settings", {
      layout: "layout/adminBoilerplate",
      title: "Admin Settings",
      global,
    });
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Failed to load settings.");
    res.redirect("/admin");
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const { eth, btc, usdt, phone, email, address, website } = req.body;
    await Global.findOneAndUpdate(
      {},
      {
        "wallets.ETH": eth,
        "wallets.BTC": btc,
        "wallets.USDT": usdt,
        "company.phone": phone,
        "company.email": email,
        "company.address": address,
        "company.website": website,
      },
      { upsert: true }
    );
    req.flash("success_msg", "Settings updated successfully.");
    res.redirect("/admin/settings");
  } catch (err) {
    +console.error(err);
    req.flash("error_msg", "Failed to update settings.");
    res.redirect("/admin/settings");
  }
};

const Verification = require("../models/Verification");
const Deposit = require("../models/Deposit");

exports.getRequests = async (req, res) => {
  try {
    // Fetch pending verifications and populate user info
    const verifications = await Verification.find({ status: "pending" })
      .populate("user", "fullName email") // make sure this matches your schema
      .sort({ createdAt: -1 });

    // Fetch pending deposits and populate user info
    const deposits = await Deposit.find({ status: "pending" })
      .populate("user", "fullName email") // make sure this matches your schema
      .sort({ createdAt: -1 });

    // Render admin request page
    res.render("admin/request", {
      title: "Admin Requests",
      verifications,
      deposits,
    });
  } catch (err) {
    console.error("Admin request page error:", err.message);
    req.flash(
      "error_msg",
      "Unable to load pending requests. Please try again."
    );
    res.redirect("/admin");
  }
};

exports.approveVerification = async (req, res) => {
  await Verification.findByIdAndUpdate(req.params.id, { status: "approved" });
  const verifications = await Verification.find({ status: "pending" }).populate(
    "user"
  );
  const deposits = await Deposit.find({ status: "pending" }).populate("user");
  req.io.emit("updateRequests", { verifications, deposits });
  res.redirect("/admin/request");
};

exports.approveVerification = async (req, res) => {
  try {
    const verify = await Verification.findById(req.params.id).populate("user");
    const user = verify.user;

    console.log(user, verify);

    user.isVerified = true;
    verify.status = "approved";

    await verify.save();
    await user.save();

    req.flash("success_msg", "User successfully verified.");
    res.redirect("/admin/request");
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Failed to verify user.");
    res.redirect("/admin/request");
  }
};

exports.rejectVerification = async (req, res) => {
  try {
    const verify = await Verification.findById(req.params.id);
    // const user = await User.findById(req.params.id);

    // user.isVerified = false;

    verify.status = "rejected";

    await verify.save();
    await user.save();

    req.flash("success_msg", "User verification rejected.");
    res.redirect("/admin/request");
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Failed to reject user verification.");
    res.redirect("/admin/request");
  }
};

exports.approveDeposit = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the deposit
    const deposit = await Deposit.findById(id);
    if (!deposit) {
      req.flash("error_msg", "Deposit not found.");
      return res.redirect("/admin/request");
    }

    // Find the user
    const user = await User.findById(deposit.user);
    if (!user) {
      req.flash("error_msg", "User not found.");
      return res.redirect("/admin/request");
    }

    // Find or create user wallet
    let wallet = await Wallet.findOne({ userId: user._id });
    if (!wallet) {
      wallet = new Wallet({ userId: user._id });
    }

    // Normalize currency name
    const currency = deposit.currency.toUpperCase();
    if (!["BTC", "ETH", "USDT"].includes(currency)) {
      req.flash("error_msg", `Invalid currency type: ${currency}`);
      return res.redirect("/admin/request");
    }

    // Update wallet currency balance
    wallet[currency] += deposit.amount;

    // Update investment stats
    wallet.investmentStats.totalDeposit += deposit.amount;
    wallet.investmentStats.depositBreakdown[currency] += deposit.amount;

    // Recalculate total wallet value in USD (via schema pre-save hook)
    await wallet.save();

    // Mark deposit as successful
    deposit.status = "successful";
    deposit.processedAt = new Date();
    await deposit.save();

    // Update or create transaction
    await Transaction.findOneAndUpdate(
      {
        userId: user._id,
        type: "deposit",
        amount: deposit.amount,
        currency: deposit.currency,
        status: "pending",
      },
      {
        status: "completed",
        netAmount: deposit.amount,
        fee: 0,
        processedAt: new Date(),
        walletBalance: wallet.totalBalance,
      },
      { new: true }
    );

    // Send deposit confirmation email
    await sendDepositEmail(
      user.email,
      user.fullName || "Investor",
      deposit.amount,
      deposit.currency,
      "successful",
      deposit.receiptUrl,
      wallet.totalBalance
    );

    req.flash("success_msg", "Deposit approved successfully!");
    res.redirect("/admin/request");
  } catch (error) {
    console.error("❌ Deposit approval error:", error);
    req.flash("error_msg", "Failed to approve deposit. Please try again.");
    res.redirect("/admin/request");
  }
};

exports.rejectDeposit = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the deposit
    const deposit = await Deposit.findById(id);
    if (!deposit) {
      req.flash("error_msg", "Deposit not found.");
      return res.redirect("/admin/request");
    }

    // Check if already processed
    if (deposit.status === "successful") {
      req.flash("error_msg", "Deposit already approved.");
      return res.redirect("/admin/request");
    } else if (deposit.status === "failed") {
      req.flash("error_msg", "Deposit already rejected.");
      return res.redirect("/admin/request");
    }

    // Find the user
    const user = await User.findById(deposit.user);
    if (!user) {
      req.flash("error_msg", "User not found.");
      return res.redirect("/admin/request");
    }

    // Update deposit status
    deposit.status = "failed";
    deposit.processedAt = new Date();
    await deposit.save();

    // Update corresponding transaction if exists
    await Transaction.findOneAndUpdate(
      {
        userId: user._id,
        type: "deposit",
        amount: deposit.amount,
        currency: deposit.currency,
        status: "pending",
      },
      {
        status: "failed",
        processedAt: new Date(),
        failureReason: "Deposit request was rejected.",
      },
      { new: true }
    );

    // Send rejection email
    await sendDepositEmail(
      user.email,
      user.fullName || "Investor",
      deposit.amount,
      deposit.currency,
      "failed",
      deposit.receiptUrl,
      null // No wallet balance for failed deposits
    );

    req.flash("success_msg", "Deposit rejected successfully!");
    res.redirect("/admin/request");
  } catch (error) {
    console.error("❌ Deposit rejection error:", error);
    req.flash("error_msg", "Failed to reject deposit. Please try again.");
    res.redirect("/admin/request");
  }
};
