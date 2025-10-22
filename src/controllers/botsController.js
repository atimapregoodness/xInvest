const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");

const BotController = {
  // Get all available plans
  getPlans: async (req, res) => {
    try {
      const plans = [
        {
          id: "welbuilder",
          name: "WelBuilder Plan",
          strategy: "Quick Scalper",
          price: 299,
          profitMin: 150,
          profitMax: 200,
          periodMin: 3,
          periodMax: 7,
          avgReturn: 175,
          winRate: 82,
          features: ["Fast Execution", "Low Risk", "Auto Stop-Loss"],
          description:
            "Perfect for short-term gains with rapid entry/exit strategies. Ideal for volatile markets.",
        },
        {
          id: "premium",
          name: "Premium Growth",
          strategy: "Trend Rider",
          price: 599,
          profitMin: 200,
          profitMax: 350,
          periodMin: 7,
          periodMax: 10,
          avgReturn: 275,
          winRate: 75,
          features: ["Trend Analysis", "Medium Risk", "Smart Take-Profit"],
          description:
            "Advanced algorithm that identifies and rides market trends for optimal medium-term profits.",
        },
        {
          id: "elite",
          name: "Elite Plan",
          strategy: "Long-Term Investor",
          price: 999,
          profitMin: 300,
          profitMax: 700,
          periodMin: 10,
          periodMax: 30,
          avgReturn: 500,
          winRate: 68,
          features: [
            "AI Analysis",
            "High Risk/Reward",
            "Portfolio Diversification",
          ],
          description:
            "Sophisticated AI that analyzes fundamental data for sustainable long-term growth strategies.",
        },
      ];

      res.json({
        success: true,
        plans: plans,
      });
    } catch (error) {
      console.error("Error fetching plans:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching trading plans",
      });
    }
  },

  // ================= PURCHASE A PLAN =================
  purchasePlan: async (req, res) => {
    // CRITICAL: Prevent view rendering by setting headers immediately
    res.setHeader("Content-Type", "application/json");
    res.setHeader("X-Content-Type-Options", "nosniff");

    console.log("=== PURCHASE ENDPOINT HIT ===");
    console.log("Method:", req.method);
    console.log("URL:", req.originalUrl);
    console.log("Headers:", req.headers);
    console.log("Body:", req.body);

    // Validate request method
    if (req.method !== "POST") {
      console.log("❌ Wrong method:", req.method);
      return res.status(405).json({
        success: false,
        message: `Method ${req.method} not allowed. Use POST.`,
      });
    }

    try {
      const { planId, paymentMethod } = req.body;

      // Validate JSON parsing
      if (!req.body) {
        console.log("❌ No body received");
        return res.status(400).json({
          success: false,
          message: "No JSON data received.",
        });
      }

      console.log("📦 Purchase request:", {
        planId,
        paymentMethod,
        user: req.user?.id,
      });

      // Validate input
      if (!planId || !paymentMethod) {
        console.log("❌ Missing parameters");
        return res.status(400).json({
          success: false,
          message: "Missing plan ID or payment method.",
        });
      }

      if (!req.user || !req.user.id) {
        console.log("❌ User not authenticated");
        return res.status(401).json({
          success: false,
          message: "User not authenticated. Please log in again.",
        });
      }

      const userId = req.user.id;
      console.log("✅ User authenticated:", userId);

      // ================= PLAN DATA =================
      const plans = {
        welbuilder: {
          id: "welbuilder",
          name: "WelBuilder Plan",
          price: 299,
          profitMin: 150,
          profitMax: 200,
          periodMin: 3,
          periodMax: 7,
          avgReturn: 175,
          winRate: 82,
          strategy: "Quick Scalper",
          features: ["Fast Execution", "Low Risk", "Auto Stop-Loss"],
          description:
            "Perfect for short-term gains with rapid entry/exit strategies. Ideal for volatile markets.",
        },
        premium: {
          id: "premium",
          name: "Premium Growth",
          price: 599,
          profitMin: 200,
          profitMax: 350,
          periodMin: 7,
          periodMax: 10,
          avgReturn: 275,
          winRate: 75,
          strategy: "Trend Rider",
          features: ["Trend Analysis", "Medium Risk", "Smart Take-Profit"],
          description:
            "Advanced algorithm that identifies and rides market trends for optimal medium-term profits.",
        },
        elite: {
          id: "elite",
          name: "Elite Plan",
          price: 999,
          profitMin: 300,
          profitMax: 700,
          periodMin: 10,
          periodMax: 30,
          avgReturn: 500,
          winRate: 68,
          strategy: "Long-Term Investor",
          features: [
            "AI Analysis",
            "High Risk/Reward",
            "Portfolio Diversification",
          ],
          description:
            "Sophisticated AI that analyzes fundamental data for sustainable long-term growth strategies.",
        },
      };

      const plan = plans[planId];
      if (!plan) {
        console.log("❌ Invalid plan ID:", planId);
        return res.status(400).json({
          success: false,
          message: "Invalid plan selected.",
        });
      }

      console.log("✅ Plan found:", plan.name);

      // ================= FIND USER + WALLET =================
      const user = await User.findById(userId);
      if (!user) {
        console.log("❌ User not found in database:", userId);
        return res.status(404).json({
          success: false,
          message: "User not found.",
        });
      }

      const wallet = await Wallet.findOne({ userId });
      if (!wallet) {
        console.log("❌ Wallet not found for user:", userId);
        return res.status(404).json({
          success: false,
          message: "Wallet not found.",
        });
      }

      console.log("✅ User and wallet found");

      // ================= CHECK EXISTING PLAN =================
      const alreadyHasPlan = user.tradingPlans?.some(
        (p) => p.planType === planId && p.status === "active"
      );

      if (alreadyHasPlan) {
        console.log("❌ User already has active plan:", planId);
        return res.status(400).json({
          success: false,
          message: "You already own this plan.",
        });
      }

      console.log("✅ User does not own this plan yet");

      // ================= PAYMENT PROCESS =================
      const currency = paymentMethod.toUpperCase();
      const priceRates = { BTC: 108380.01, ETH: 3874.6, USDT: 1 };
      const cryptoAmount = plan.price / priceRates[currency];

      console.log("💰 Payment details:", {
        currency,
        cryptoAmount,
        planPrice: plan.price,
        rate: priceRates[currency],
      });

      // Check wallet balance
      if (!wallet[currency] || wallet[currency] < cryptoAmount) {
        console.log("❌ Insufficient balance:", {
          currency,
          available: wallet[currency],
          required: cryptoAmount,
        });
        return res.status(400).json({
          success: false,
          message: `Insufficient ${currency} balance. Required: ${cryptoAmount.toFixed(
            8
          )} ${currency}, Available: ${wallet[currency] || 0} ${currency}`,
        });
      }

      console.log("✅ Sufficient balance available");

      // Deduct from wallet
      const previousBalance = wallet[currency];
      wallet[currency] -= cryptoAmount;

      // Recalculate total balance if method exists
      if (typeof wallet.calculateTotalBalance === "function") {
        await wallet.calculateTotalBalance();
      }

      await wallet.save();
      console.log("✅ Wallet updated:", {
        currency,
        previousBalance,
        newBalance: wallet[currency],
      });

      // ================= CREATE TRANSACTION =================
      const transaction = new Transaction({
        userId,
        type: "purchase",
        currency,
        amount: -cryptoAmount,
        netAmount: -cryptoAmount,
        fee: 0,
        status: "completed",
        description: `Purchase of ${plan.name} trading plan`,
        metadata: {
          planId: plan.id,
          planName: plan.name,
          planPrice: plan.price,
          cryptoAmount: cryptoAmount,
        },
        createdAt: new Date(),
      });

      await transaction.save();
      wallet.transactions.push(transaction._id);
      await wallet.save();

      console.log("✅ Transaction created:", transaction._id);

      // ================= ADD PLAN TO USER =================
      const purchasedPlan = {
        planId: `plan_${Date.now()}`,
        planType: plan.id,
        name: plan.name,
        purchaseDate: new Date(),
        expiryDate: null,
        status: "active",
        price: plan.price,
        profitMin: plan.profitMin,
        profitMax: plan.profitMax,
        periodMin: plan.periodMin,
        periodMax: plan.periodMax,
        avgReturn: plan.avgReturn,
        winRate: plan.winRate,
        strategy: plan.strategy,
        features: plan.features,
        description: plan.description,
        transactionId: transaction._id,
      };

      // Initialize tradingPlans array if it doesn't exist
      if (!user.tradingPlans) {
        user.tradingPlans = [];
      }

      user.tradingPlans.push(purchasedPlan);
      await user.save();

      console.log("✅ Plan added to user:", purchasedPlan.planId);

      // ================= SUCCESS RESPONSE =================
      const responseData = {
        success: true,
        message: `Successfully purchased ${plan.name}. You can now start trading with this plan.`,
        plan: purchasedPlan,
        transaction: {
          id: transaction._id,
          amount: cryptoAmount,
          currency: currency,
        },
      };

      console.log("🎉 Purchase completed successfully for user:", userId);
      console.log("=== PURCHASE REQUEST END ===");

      // FINAL RESPONSE - Ensure JSON
      return res.json(responseData);
    } catch (error) {
      console.error("💥 UNEXPECTED ERROR in purchasePlan:", error);
      console.error("Error stack:", error.stack);

      // CRITICAL: Return JSON even for unexpected errors
      return res.status(500).json({
        success: false,
        message: "Internal server error during purchase.",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  // Get user's purchased plans
  getUserPlans: async (req, res) => {
    try {
      const userId = req.user.id;
      const user = await User.findById(userId).select("tradingPlans");

      res.json({
        success: true,
        plans: user.tradingPlans || [],
      });
    } catch (error) {
      console.error("Error fetching user plans:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching your plans",
      });
    }
  },
};

module.exports = BotController;
