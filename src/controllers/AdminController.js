const User = require("../models/User");
const Investment = require("../models/Investment");
const Transaction = require("../models/Transaction");

// Middleware to check if user is admin
exports.requireAdmin = (req, res, next) => {
  if (!req.isAuthenticated() || !req.user.isAdmin) {
    req.flash("error_msg", "Administrator access required");
    return res.redirect("/dashboard");
  }
  next();
};

exports.getAdminDashboard = async (req, res) => {
  try {
    // Get platform statistics
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: "active" });
    const totalInvestments = await Investment.countDocuments();
    const activeInvestments = await Investment.countDocuments({
      status: "active",
    });

    // Get financial stats
    const investmentStats = await Investment.aggregate([
      {
        $group: {
          _id: null,
          totalInvested: { $sum: "$amount" },
          totalProfit: { $sum: "$totalProfit" },
          averageInvestment: { $avg: "$amount" },
        },
      },
    ]);

    const transactionStats = await Transaction.aggregate([
      {
        $match: { status: "completed" },
      },
      {
        $group: {
          _id: "$type",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Get recent activities
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select(
        "username email profile.firstName profile.lastName createdAt status"
      );

    const recentInvestments = await Investment.find()
      .populate("user", "username email")
      .sort({ createdAt: -1 })
      .limit(5);

    const recentTransactions = await Transaction.find()
      .populate("user", "username email")
      .sort({ createdAt: -1 })
      .limit(10);

    res.render("admin/admin_dashboard", {
      title: "Admin Dashboard",
      stats: {
        totalUsers,
        activeUsers,
        totalInvestments,
        activeInvestments,
        ...(investmentStats[0] || {
          totalInvested: 0,
          totalProfit: 0,
          averageInvestment: 0,
        }),
        transactionStats,
      },
      recentUsers,
      recentInvestments,
      recentTransactions,
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    req.flash("error_msg", "Error loading admin dashboard");
    res.redirect("/dashboard");
  }
};

exports.getUsers = async (req, res) => {
  try {
    const { page = 1, status, search } = req.query;
    const limit = 20;
    const skip = (page - 1) * limit;

    let filter = {};
    if (status && status !== "all") {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { "profile.firstName": { $regex: search, $options: "i" } },
        { "profile.lastName": { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(filter)
      .select("-password -security.activityLog")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(filter);

    res.render("admin/users", {
      title: "User Management",
      users,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      filter: { status: status || "all", search: search || "" },
    });
  } catch (error) {
    console.error("Users management error:", error);
    req.flash("error_msg", "Error loading users");
    res.redirect("/admin");
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { status },
      { new: true }
    );

    if (!user) {
      req.flash("error_msg", "User not found");
      return res.redirect("/admin/users");
    }

    req.flash("success_msg", `User status updated to ${status}`);
    res.redirect("/admin/users");
  } catch (error) {
    console.error("Update user status error:", error);
    req.flash("error_msg", "Error updating user status");
    res.redirect("/admin/users");
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const { page = 1, type, status, search } = req.query;
    const limit = 25;
    const skip = (page - 1) * limit;

    let filter = {};
    if (type && type !== "all") {
      filter.type = type;
    }

    if (status && status !== "all") {
      filter.status = status;
    }

    if (search) {
      const users = await User.find({
        $or: [
          { username: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      }).select("_id");

      filter.user = { $in: users.map((u) => u._id) };
    }

    const transactions = await Transaction.find(filter)
      .populate("user", "username email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Transaction.countDocuments(filter);

    res.render("admin/transactions", {
      title: "Transaction Management",
      transactions,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      filter: {
        type: type || "all",
        status: status || "all",
        search: search || "",
      },
    });
  } catch (error) {
    console.error("Transactions management error:", error);
    req.flash("error_msg", "Error loading transactions");
    res.redirect("/admin");
  }
};
