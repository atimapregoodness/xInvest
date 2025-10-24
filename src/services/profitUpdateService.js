const cron = require("node-cron");
const Trade = require("../models/Trade");
const Wallet = require("../models/Wallet");

// ⏱ Update profits every 30 seconds
cron.schedule("*/30 * * * * *", async () => {
  try {
    const activeTrades = await Trade.find({
      status: "active",
      endDate: { $gt: new Date() },
    });

    if (activeTrades.length === 0) return;

    console.log(`[CRON] Updating ${activeTrades.length} active trades...`);

    for (const trade of activeTrades) {
      try {
        const now = new Date();
        const start = new Date(trade.startDate);
        const end = new Date(trade.endDate);
        const totalMs = end - start;

        if (totalMs <= 0) continue;

        // ✅ Calculate progress (0–1)
        const elapsedMs = now - start;
        const progress = Math.min(Math.max(elapsedMs / totalMs, 0), 1);

        // ✅ Expected profit in USDT (fixed ROI)
        const investment = parseFloat(trade.amountUSDT) || 0;
        const roi = parseFloat(trade.roi) || 0;
        const expectedProfit = (investment * roi) / 100;

        // ✅ Simulated live profit with minor fluctuation
        const baseProfit = expectedProfit * progress;
        const fluctuation = baseProfit * ((Math.random() * 6 - 3) / 100); // ±3%
        let simulatedProfit = baseProfit + fluctuation;

        // ✅ Ensure valid profit (no NaN, no negatives)
        if (!isFinite(simulatedProfit) || simulatedProfit < 0) {
          simulatedProfit = 0;
        }

        // ✅ Cap simulated profit to expected profit
        simulatedProfit = Math.min(simulatedProfit, expectedProfit);

        // ✅ Update trade progress + profit
        trade.simulatedProfit = parseFloat(simulatedProfit.toFixed(8));
        trade.progress = Math.round(progress * 100);

        // ✅ If trade reached end time, complete and credit wallet
        if (now >= end || progress >= 1) {
          trade.status = "completed";
          trade.profit = parseFloat(expectedProfit.toFixed(8));
          trade.simulatedProfit = trade.profit;

          const wallet = await Wallet.findOne({ userId: trade.user });
          if (wallet) {
            const currency = trade.currency?.toUpperCase();
            const balance = parseFloat(wallet[currency]) || 0;
            const totalPayout = investment + expectedProfit;

            wallet[currency] = parseFloat((balance + totalPayout).toFixed(8));
            await wallet.save();

            console.log(
              `[CRON] ✅ Trade ${trade._id} completed. Credited ${totalPayout} ${currency}.`
            );
          }
        }

        await trade.save();
      } catch (err) {
        console.error(`⚠️ Error updating trade ${trade._id}:`, err.message);
      }
    }

    console.log("[CRON] ✅ Profit update cycle complete.\n");
  } catch (err) {
    console.error("🚨 Critical profit update error:", err.message);
  }
});

module.exports = { cron };
