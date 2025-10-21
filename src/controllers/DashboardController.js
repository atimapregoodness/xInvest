const User = require("../models/User");
const Investment = require("../models/Investment");
const Transaction = require("../models/Transaction");

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

exports.getInvestments = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, page = 1 } = req.query;

    const filter = { user: userId };
    if (status && status !== "all") {
      filter.status = status;
    }

    const limit = 10;
    const skip = (page - 1) * limit;

    const investments = await Investment.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Investment.countDocuments(filter);

    res.render("user/investments", {
      title: "My Investments",
      investments,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      filter: status || "all",
    });
  } catch (error) {
    console.error("Investments error:", error);
    req.flash("error_msg", "Error loading investments");
    res.redirect("/dashboard");
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

exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone, country, bio } = req.body;

    await User.findByIdAndUpdate(req.user._id, {
      "profile.firstName": firstName,
      "profile.lastName": lastName,
      "profile.phone": phone,
      "profile.country": country,
      "profile.bio": bio,
    });

    req.flash("success_msg", "Profile updated successfully");
    res.redirect("/dashboard/profile");
  } catch (error) {
    console.error("Profile update error:", error);
    req.flash("error_msg", "Error updating profile");
    res.redirect("/dashboard/profile");
  }
};

const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "xinvest/botslips",
    allowed_formats: ["jpg", "jpeg", "png"],
    transformation: [{ width: 800, height: 600, crop: "limit" }],
  },
});

const upload = multer({ storage });

// ==========================================================================
// PURCHASE BOT
// ==========================================================================
exports.purchaseBot = [
  upload.single("slip"),
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

// ==========================================================================
// INVEST IN TRADING BOT
// ==========================================================================
exports.investInBot = [
  upload.single("receipt"),
  async (req, res) => {
    try {
      const { plan, amount, paymentMethod, cryptoType } = req.body;
      const user = await User.findById(req.user._id);

      // Create investment transaction
      const investment = {
        type: "investment",
        currency: cryptoType || "USD",
        amount: parseFloat(amount),
        netAmount: parseFloat(amount),
        status: "pending",
        description: `${plan} Trading Bot Investment`,
        metadata: {
          plan,
          paymentMethod,
          cryptoType,
          dailyReturn: PLANS[plan].dailyReturn,
          lockPeriod: PLANS[plan].lockPeriod,
          receiptUrl: req.file ? req.file.path : null,
          adminManaged: true,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      user.transactions.unshift(investment);

      // Update wallet
      if (cryptoType === "USDT") user.wallet.USDT -= parseFloat(amount);
      await user.save();

      res.json({
        success: true,
        message: `Your ${plan} bot investment has been activated!`,
        investmentId: investment._id,
        expectedDaily: (
          parseFloat(amount) * parseFloat(PLANS[plan].dailyReturn)
        ).toFixed(2),
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
];
