require("dotenv").config();
const mongoose = require("mongoose");
const Plan = require("../models/InvestmentPlan");

// Advanced icon assignment function
const getPlanIcon = (planName, index) => {
  const name = planName.toLowerCase();

  // Map specific plan names to icons
  const iconMap = {
    starter: "fas fa-seedling",
    growth: "fas fa-chart-line",
    pro: "fas fa-rocket",
    trader: "fas fa-chart-candlestick",
    elite: "fas fa-crown",
    quantum: "fas fa-atom",
    premium: "fas fa-gem",
    basic: "fas fa-layer-group",
    advanced: "fas fa-microchip",
    vip: "fas fa-star",
    gold: "fas fa-award",
    platinum: "fas fa-medal",
    diamond: "fas fa-gem",
    crypto: "fas fa-coins",
    defi: "fas fa-code-branch",
    nft: "fas fa-palette",
    ai: "fas fa-robot",
    tech: "fas fa-laptop-code",
    finance: "fas fa-landmark",
    "real estate": "fas fa-building",
    commodities: "fas fa-chart-bar",
  };

  // Check for exact matches first
  for (const [key, icon] of Object.entries(iconMap)) {
    if (name.includes(key)) {
      return icon;
    }
  }

  // Fallback to category-based icons
  const categoryIcons = {
    beginner: "fas fa-seedling",
    intermediate: "fas fa-chart-line",
    professional: "fas fa-rocket",
    elite: "fas fa-crown",
    exclusive: "fas fa-gem",
    advanced: "fas fa-microchip",
  };

  // Index-based fallback for variety
  const fallbackIcons = [
    "fas fa-chart-line", // Analytics
    "fas fa-gem", // Premium
    "fas fa-rocket", // Growth
    "fas fa-crown", // Elite
    "fas fa-shield-alt", // Secure
    "fas fa-bolt", // Fast
    "fas fa-trophy", // Winner
    "fas fa-star", // Star
    "fas fa-coins", // Crypto
    "fas fa-landmark", // Finance
    "fas fa-building", // Real Estate
    "fas fa-robot", // AI
    "fas fa-microchip", // Technology
    "fas fa-code-branch", // DeFi
    "fas fa-globe", // Global
    "fas fa-trend-up", // Trending
    "fas fa-piggy-bank", // Savings
    "fas fa-briefcase", // Portfolio
    "fas fa-chart-pie", // Analytics
    "fas fa-hand-holding-usd", // Investment
  ];

  return fallbackIcons[index % fallbackIcons.length];
};

const seedPlans = async () => {
  try {
    // make sure this variable is loaded from your .env file
    const uri = process.env.MONGODB_URI;

    if (!uri) {
      throw new Error("MONGO_URI not found in environment variables");
    }

    // connect to MongoDB
    await mongoose.connect(uri);
    console.log("✅ Connected to MongoDB");

    // delete existing plans before seeding new ones
    await Plan.deleteMany({});
    console.log("🗑️ Cleared old plans");

    const plans = [
      {
        name: "Starter Plan",
        description:
          "Perfect for beginners looking to start investing safely with guided portfolio management.",
        icon: getPlanIcon("Starter Plan", 0),
        price: 100,
        roi: 10,
        category: "Beginner",
        features: [
          "Basic Portfolio",
          "24/7 Support",
          "Risk Management",
          "Monthly Reports",
        ],
        duration: "3 months",
        riskLevel: "Low",
      },
      {
        name: "Growth Plan",
        description:
          "Designed for consistent profits with balanced risk and diversified investment strategies.",
        icon: getPlanIcon("Growth Plan", 1),
        price: 250,
        roi: 25,
        category: "Intermediate",
        features: [
          "Diversified Portfolio",
          "Advanced Analytics",
          "Priority Support",
          "Weekly Reports",
        ],
        duration: "6 months",
        riskLevel: "Medium",
      },
      {
        name: "Pro Trader Plan",
        description:
          "High-return plan for experienced investors with advanced trading algorithms and market insights.",
        icon: getPlanIcon("Pro Trader Plan", 2),
        price: 500,
        roi: 50,
        category: "Professional",
        features: [
          "AI-Powered Trading",
          "Real-time Analytics",
          "Dedicated Manager",
          "Daily Reports",
        ],
        duration: "12 months",
        riskLevel: "High",
      },
      {
        name: "Elite Quantum Plan",
        description:
          "Exclusive AI-managed portfolio with premium returns, personalized strategies, and VIP treatment.",
        icon: getPlanIcon("Elite Quantum Plan", 3),
        price: 1000,
        roi: 80,
        category: "Elite",
        features: [
          "Quantum AI Management",
          "Personalized Strategies",
          "24/7 VIP Support",
          "Real-time Dashboard",
        ],
        duration: "24 months",
        riskLevel: "Very High",
      },
      {
        name: "Crypto Pioneer",
        description:
          "Specialized cryptocurrency investment plan focusing on emerging blockchain technologies.",
        icon: getPlanIcon("Crypto Pioneer", 4),
        price: 750,
        roi: 65,
        category: "Advanced",
        features: [
          "Crypto Portfolio",
          "DeFi Integration",
          "NFT Opportunities",
          "Blockchain Research",
        ],
        duration: "18 months",
        riskLevel: "High",
      },
      {
        name: "Real Estate Empire",
        description:
          "Property and real estate focused investment plan with stable long-term returns.",
        icon: getPlanIcon("Real Estate Empire", 5),
        price: 2000,
        roi: 45,
        category: "Intermediate",
        features: [
          "Property Portfolio",
          "Rental Income",
          "Market Analysis",
          "Asset Appreciation",
        ],
        duration: "36 months",
        riskLevel: "Medium",
      },
    ];

    await Plan.insertMany(plans);
    console.log("🌱 Plans seeded successfully");

    // Display seeded plans with their icons
    console.log("\n📊 Seeded Plans:");
    plans.forEach((plan, index) => {
      console.log(`${index + 1}. ${plan.name} - ${plan.icon} - $${plan.price}`);
    });

    mongoose.connection.close();
    console.log("🔒 Database connection closed");
  } catch (err) {
    console.error("❌ Error seeding plans:", err);
    mongoose.connection.close();
  }
};

// Export the getPlanIcon function for use in other files
module.exports = { getPlanIcon };

seedPlans();
