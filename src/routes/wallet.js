const express = require("express");
const router = express.Router();
const walletController = require("../controllers/WalletController");
const { ensureAuthenticated } = require("../middleware/auth"); // JWT middleware

const multer = require("multer");
const path = require("path");

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Images only (JPG, PNG, JPEG)"));
  },
});

// Protect all wallet routes
router.use(ensureAuthenticated);

router.get("/", walletController.getWallet);
router.post("/deposit", upload.single("receipt"), walletController.deposit);
router.post("/withdraw", walletController.withdraw);
// router.post("/transfer", walletController.transfer);
router.get("/transactions", walletController.getTransactions);

module.exports = router;
