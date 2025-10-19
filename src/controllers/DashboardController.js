const User = require("../models/User");
const Investment = require("../models/Investment");
const Transaction = require("../models/Transaction");

exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get user with populated data
    const user = await User.findById(userId).select(
      "-password -security.activityLog"
    );

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
