// services/profitUpdateService.js
const Investment = require("../models/Investment");
const cron = require("node-cron");

const startProfitUpdateService = () => {
  console.log("🚀 Starting profit update service...");

  // Update every 30 seconds for demo
  cron.schedule("*/30 * * * * *", async () => {
    try {
      const updatedCount = await Investment.updateActiveInvestments();

      // Complete investments that have ended
      const completedInvestments = await Investment.find({
        status: "active",
        endDate: { $lte: new Date() },
      }).populate("plan");

      for (const investment of completedInvestments) {
        await investment.completeInvestment();
        console.log(
          `✅ Completed investment ${investment._id} for user ${investment.user}`
        );
      }

      if (updatedCount > 0 || completedInvestments.length > 0) {
        console.log(
          `📈 Updated ${updatedCount} investments, completed ${completedInvestments.length}`
        );
      }
    } catch (error) {
      console.error("Error in profit update service:", error);
    }
  });
};

module.exports = { startProfitUpdateService };
