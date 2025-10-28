// routes/dashboard.js
const express = require("express");
const router = express.Router();
const DashboardController = require("../controllers/DashboardController");
const { ensureAuthenticated } = require("../middleware/auth");
const multer = require("multer");

const User = require("../models/User");

// ----------------------
// MIDDLEWARE
// ----------------------

const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, // from .env
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "verifications", // folder in your Cloudinary account
    allowed_formats: ["jpg", "jpeg", "png"],
    transformation: [{ width: 800, crop: "limit" }],
  },
});

const upload = multer({ storage });

// All dashboard routes require authentication
router.use(ensureAuthenticated);

// ----------------------
// DASHBOARD ROUTES
// ----------------------

// Dashboard main page
router.get("/", DashboardController.getDashboard);

// Profile page
router.get("/personal", DashboardController.getProfile);

// Verification page (GET)
router.get(
  "/personal/verification",

  DashboardController.getVerificationPage
);

// Verification submit (POST)
router.post(
  "/personal/verification",
  upload.single("idUpload"),
  DashboardController.submitVerification
);

// API route for user transaction stats
router.get("/api/transactions/stats", async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const transactions = user.transactions || [];

    let profitReturn = 0,
      bonus = 0,
      totalDeposit = 0,
      totalWithdrawal = 0;
    let depositBTC = 0,
      depositETH = 0,
      withdrawalBTC = 0,
      withdrawalETH = 0;
    let bonusBTC = 0,
      bonusETH = 0;

    transactions.forEach((txn) => {
      const amount = txn.netAmount || 0;

      if (txn.type === "profit") profitReturn += amount;

      if (txn.type === "bonus") {
        bonus += amount;
        if (txn.currency === "BTC") bonusBTC += amount;
        if (txn.currency === "ETH") bonusETH += amount;
      }

      if (txn.type === "deposit" && txn.status === "completed") {
        totalDeposit += amount;
        if (txn.currency === "BTC") depositBTC += amount;
        if (txn.currency === "ETH") depositETH += amount;
      }

      if (txn.type === "withdrawal" && txn.status === "completed") {
        totalWithdrawal += amount;
        if (txn.currency === "BTC") withdrawalBTC += amount;
        if (txn.currency === "ETH") withdrawalETH += amount;
      }
    });

    res.json({
      success: true,
      profitReturn,
      bonus,
      totalDeposit,
      totalWithdrawal,
      bonusBTC,
      bonusETH,
      depositBTC,
      depositETH,
      withdrawalBTC,
      withdrawalETH,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Stats error" });
  }
});

module.exports = router;
