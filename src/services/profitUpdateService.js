/**
 * services/profitUpdateService.js
 * -------------------------------
 * Runs every 30 seconds to update trade progress and credit profits on completion.
 * Also provides a manual trigger function for testing or admin use.
 */

const cron = require("node-cron");
const Trade = require("../models/Trade");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction"); // 🧾 Import Transaction model

/**
 * 🔁 Core trade profit updater logic (can run manually or via cron)
 */
async function updateTradesManually() {
  try {
    const now = new Date();

    // 🔍 Fetch all active trades
    const activeTrades = await Trade.find({ status: "active" });

    if (activeTrades.length === 0) {
      console.log("[PROFIT-UPDATER] No active trades to process.");
      return;
    }

    console.log(
      `[PROFIT-UPDATER] Updating ${activeTrades.length} active trades...`
    );

    for (const trade of activeTrades) {
      try {
        const start = new Date(trade.startDate);
        const end = new Date(trade.endDate);
        const totalMs = end - start;

        if (totalMs <= 0) continue;

        const elapsedMs = now - start;
        const progress = Math.min(Math.max(elapsedMs / totalMs, 0), 1);

        // 🧮 Compute expected profit (in same currency as trade)
        const investment = parseFloat(trade.amount) || 0; // amount in coin (BTC/ETH/USDT)
        const roi = parseFloat(trade.roi) || 0;
        const expectedProfit = (investment * roi) / 100;

        // 💹 Simulate progressive profit
        const baseProfit = expectedProfit * progress;
        const fluctuation = baseProfit * ((Math.random() * 6 - 3) / 100);
        let simulatedProfit = baseProfit + fluctuation;

        if (!isFinite(simulatedProfit) || simulatedProfit < 0)
          simulatedProfit = 0;

        simulatedProfit = Math.min(simulatedProfit, expectedProfit);

        trade.simulatedProfit = parseFloat(simulatedProfit.toFixed(8));
        trade.progress = Math.round(progress * 100);

        // ✅ If trade completed, credit profit + investment
        if (now >= end || progress >= 1) {
          trade.status = "completed";
          trade.profit = parseFloat(expectedProfit.toFixed(8));
          trade.simulatedProfit = trade.profit;

          const wallet = await Wallet.findOne({ userId: trade.user });
          if (wallet) {
            const currency = trade.currency?.toUpperCase();
            const prevBalance = parseFloat(wallet[currency]) || 0;
            const totalPayout = investment + expectedProfit;

            wallet[currency] = parseFloat(
              (prevBalance + totalPayout).toFixed(8)
            );
            await wallet.save();

            console.log(
              `[PROFIT-UPDATER] ✅ Trade ${trade._id} completed — credited ${totalPayout} ${currency} to user ${trade.user}.`
            );

            // 🧾 Create transaction record for profit credit
            await Transaction.createRecord({
              userId: trade.user,
              type: "profit",
              currency,
              amount: expectedProfit,
              description: `Profit credited for completed trade ${trade._id}`,
              metadata: {
                tradeId: trade._id,
                roi,
                investment,
                totalPayout,
              },
            });

            // 🧾 Create transaction record for returning investment principal
            await Transaction.createRecord({
              userId: trade.user,
              type: "credit",
              currency,
              amount: investment,
              description: `Investment principal returned for trade ${trade._id}`,
              metadata: {
                tradeId: trade._id,
                roi,
                profit: expectedProfit,
              },
            });
          } else {
            console.warn(
              `[PROFIT-UPDATER] ⚠️ No wallet found for user ${trade.user}`
            );
          }
        }

        await trade.save();
      } catch (err) {
        console.error(`⚠️ Error updating trade ${trade._id}:`, err.message);
      }
    }

    console.log("[PROFIT-UPDATER] ✅ Update cycle complete.\n");
  } catch (err) {
    console.error("🚨 Critical profit update error:", err.message);
  }
}

/**
 * 🕒 Schedule automatic run every 30 seconds
 */
cron.schedule("*/30 * * * * *", updateTradesManually);

/**
 * 🧪 Export for manual trigger
 */
module.exports = { updateTradesManually };
