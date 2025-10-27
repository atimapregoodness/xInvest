require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const Wallet = require("../models/Wallet");

// ===================== CONNECT TO DATABASE =====================
async function connectDB() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/xInvest",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 30000, // 30 seconds
      }
    );
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  }
}

// ===================== SEED ADMIN FUNCTION =====================
async function seedAdmin() {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({
      email: process.env.ADMIN_EMAIL,
    });
    if (existingAdmin) {
      console.log("⚠️ Admin already exists:", existingAdmin.email);
      return;
    }

    // Create new admin user
    const admin = new User({
      email: process.env.ADMIN_EMAIL,
      fullName: "System Administrator",
      country: "United States",
      phone: "+10000000000",
      isAdmin: true,
      isVerified: true,
    });

    // Register the admin with password
    await User.register(admin, process.env.ADMIN_PASSWORD);

    // Ensure wallet is created and linked
    let wallet = await Wallet.findOne({ userId: admin._id });
    if (!wallet) {
      wallet = await Wallet.create({ userId: admin._id, balance: 0 });
      admin.wallet = wallet._id;
      await admin.save();
    }

    console.log("✅ Admin user created successfully!");
    console.log("📧 Email:", process.env.ADMIN_EMAIL);
    console.log("🔑 Password:", process.env.ADMIN_PASSWORD);
  } catch (error) {
    console.error("❌ Error seeding admin:", error);
  } finally {
    // Close DB connection
    await mongoose.connection.close();
    console.log("🛑 MongoDB connection closed");
  }
}

// ===================== RUN SCRIPT =====================
(async () => {
  await connectDB();
  await seedAdmin();
})();
