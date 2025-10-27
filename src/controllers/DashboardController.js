const User = require("../models/User");
const Investment = require("../models/Trade");
const Transaction = require("../models/Transaction");

const path = require("path");
const Verification = require("../models/Verification");

exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get user with populated data
    const user = await User.findById(userId)
      .select("-password -security.activityLog")
      .populate("wallet");

    // Get investments
    const investments = await Investment.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5);

    // Get recent transactions
    const transactions = await Transaction.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(10);

    // Calculate portfolio stats
    const totalInvested = await Investment.aggregate([
      { $match: { user: userId, status: "active" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const totalProfit = await Investment.aggregate([
      { $match: { user: userId } },
      { $group: { _id: null, total: { $sum: "$totalProfit" } } },
    ]);

    // Get active investment count
    const activeInvestments = await Investment.countDocuments({
      user: userId,
      status: "active",
    });

    res.locals.wallet = user.wallet;
    res.locals.transactions = user.wallet.transactions || [];

    res.render("user/user_dashboard", {
      title: "Dashboard",
      user,
      investments,
      transactions,
      stats: {
        totalInvested: totalInvested[0]?.total || 0,
        totalProfit: totalProfit[0]?.total || 0,
        activeInvestments,
        portfolioValue:
          (totalInvested[0]?.total || 0) + (totalProfit[0]?.total || 0),
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    req.flash("error_msg", "Error loading dashboard");
    res.redirect("/");
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "-password -security.activityLog"
    );

    res.render("user/profile", {
      title: "Profile Settings",
      user,
    });
  } catch (error) {
    console.error("Profile error:", error);
    req.flash("error_msg", "Error loading profile");
    res.redirect("/dashboard");
  }
};

// ==========================================================================
// PURCHASE BOT
// ==========================================================================
exports.purchaseBot = [
  async (req, res) => {
    try {
      const { plan, price, paymentMethod, cryptoType } = req.body;
      const user = await User.findById(req.user._id);

      // Add bot purchase to transactions
      const transaction = {
        type: "bot_purchase",
        currency: "USD",
        amount: parseFloat(price),
        netAmount: -parseFloat(price),
        status: "pending",
        description: `Bot Purchase: ${plan}`,
        metadata: {
          plan,
          paymentMethod,
          cryptoType,
          slipUrl: req.file ? req.file.path : null,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      user.transactions.unshift(transaction);
      await user.save();

      res.json({
        success: true,
        message: "Bot purchase submitted successfully!",
        transactionId: transaction._id,
        slipUrl: req.file ? req.file.path : null,
      });
    } catch (error) {
      console.error("Bot purchase error:", error);
      res.status(500).json({
        success: false,
        message: "Purchase failed. Please try again.",
      });
    }
  },
];

// ==========================================================================
// GET USER BOTS
// ==========================================================================
exports.getUserBots = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const bots = user.transactions
      .filter((t) => t.type === "bot_purchase" && t.status === "completed")
      .map((t) => ({
        plan: t.metadata.plan,
        purchasedAt: t.createdAt,
        price: t.amount,
      }));

    res.json({ success: true, bots });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching bots" });
  }
};

exports.getVerificationPage = (req, res) => {
  res.cookie("XSRF-TOKEN", req.csrfToken());
  res.render("user/verification", {
    title: "User Verification",
    csrfToken: req.csrfToken(),
    messages: {
      error: req.flash("error"),
      success: req.flash("success"),
    },
  });
};

exports.submitVerification = async (req, res) => {
  try {
    if (!req.file) {
      req.flash("error", "ID image is required.");
      return res.redirect("/dashboard/personal/verification");
    }

    const verification = new Verification({
      user: req.user._id,
      documentType: "ID",
      documentUrl: `/uploads/verifications/${req.file.filename}`,
    });

    await verification.save();

    req.flash("success", "Verification submitted successfully!");
    res.redirect("/dashboard/personal/verification");
  } catch (err) {
    console.error(err);
    req.flash("error", "Server error, please try again.");
    res.redirect("/dashboard/personal/verification");
  }
};
