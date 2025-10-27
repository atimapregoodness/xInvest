const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");

exports.getDashboard = async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    const txCount = await Transaction.countDocuments();
    const recentTx = await Transaction.find()
      .populate("userId", "fullName email")
      .sort({ createdAt: -1 })
      .limit(5);

    res.render("admin/admin_dashboard", {
      title: "Admin Dashboard",
      stats: { userCount, txCount },
      recentTx,
    });
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Failed to load admin dashboard.");
    res.redirect("/dashboard");
  }
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
