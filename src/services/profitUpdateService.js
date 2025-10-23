// services/profitUpdateService.js
// Run this at app startup: require('./services/profitUpdateService');
const cron = require("node-cron");
const Trade = require("../models/Trade");
const User = require("../models/User");

// schedule: every 30 seconds for dev, change to '*/1 * * * *' (every minute) or longer for production
cron.schedule("*/30 * * * * *", async () => {
  try {
    const now = new Date();
    // find active trades that have reached endDate
    const dueTrades = await Trade.find({
      status: "active",
      endDate: { $lte: now },
    });

    for (const t of dueTrades) {
      const finalProfit = (t.amount * t.roi) / 100;
      t.profit = finalProfit;
      t.status = "completed";
      await t.save();

      // credit user
      const u = await User.findById(t.user);
      if (u && u.wallet) {
        u.wallet.balance += t.amount + finalProfit;
        await u.save();
      }

      console.log(
        `ProfitUpdateService: Trade ${t._id} completed. Credited user ${t.user}`
      );
    }
  } catch (err) {
    console.error("ProfitUpdateService error:", err);
  }
});
