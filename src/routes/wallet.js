const express = require("express");
const router = express.Router();
const walletController = require("../controllers/WalletController");
const { ensureAuthenticated } = require("../middleware/auth"); // JWT middleware

const { v2: cloudinary } = require("cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer storage with Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "wallet_receipts", // folder in Cloudinary
    allowed_formats: ["jpg", "jpeg", "png"],
  },
});

const upload = multer({ storage });

// Protect all wallet routes
router.use(ensureAuthenticated);

router.get("/", walletController.getWallet);
router.post("/deposit", upload.single("receipt"), walletController.deposit);
router.post("/withdraw", walletController.withdraw);
router.get("/transactions", walletController.getTransactions);

module.exports = router;
