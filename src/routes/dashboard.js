// routes/dashboard.js
const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const DashboardController = require("../controllers/DashboardController");
const { ensureAuthenticated } = require("../middleware/auth");
const User = require("../models/User");

// ----------------------
// MIDDLEWARE
// ----------------------

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, "../public/uploads/verifications");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = file.originalname.split(".").pop();
    cb(null, file.fieldname + "-" + uniqueSuffix + "." + ext);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/jpg"];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error("Only image files (JPG, PNG) are allowed!"));
  }
  cb(null, true);
};

const upload = multer({ storage, fileFilter });

// ----------------------
// AUTH GUARD
// ----------------------
router.use(ensureAuthenticated);

// ----------------------
// DASHBOARD ROUTES
// ----------------------

// Main dashboard
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
  ensureAuthenticated,

  upload.single("idUpload"),
  DashboardController.submitVerification
);

// ----------------------
// API: Transaction Stats
// ----------------------
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

      switch (txn.type) {
        case "profit":
          profitReturn += amount;
          break;
        case "bonus":
          bonus += amount;
          if (txn.currency === "BTC") bonusBTC += amount;
          if (txn.currency === "ETH") bonusETH += amount;
          break;
        case "deposit":
          if (txn.status === "completed") {
            totalDeposit += amount;
            if (txn.currency === "BTC") depositBTC += amount;
            if (txn.currency === "ETH") depositETH += amount;
          }
          break;
        case "withdrawal":
          if (txn.status === "completed") {
            totalWithdrawal += amount;
            if (txn.currency === "BTC") withdrawalBTC += amount;
            if (txn.currency === "ETH") withdrawalETH += amount;
          }
          break;
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
    console.error("Stats error:", error);
    res.status(500).json({ success: false, message: "Error fetching stats" });
  }
});

module.exports = router;
