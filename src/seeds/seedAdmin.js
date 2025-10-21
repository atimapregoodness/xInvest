require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const Wallet = require("../models/Wallet");

// ===================== CONNECT TO DATABASE =====================
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  });

// ===================== SEED ADMIN FUNCTION =====================
async function seedAdmin() {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({
      email: process.env.ADMIN_EMAIL,
    });
    if (existingAdmin) {
      console.log("⚠️ Admin already exists:", existingAdmin.email);
      mongoose.connection.close();
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
      wallet = await Wallet.create({ userId: admin._id });
      admin.wallet = wallet._id;
      await admin.save();
    }

    console.log("✅ Admin user created successfully!");
    console.log("📧 Email:", process.env.ADMIN_EMAIL);
  } catch (error) {
    console.error("❌ Error seeding admin:", error);
  } finally {
    mongoose.connection.close();
  }
}

// ===================== RUN FUNCTION =====================
seedAdmin();
