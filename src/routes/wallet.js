const express = require("express");
const router = express.Router();
const walletController = require("../controllers/walletController");
const { ensureAuthenticated } = require("../middleware/auth"); // JWT middleware

// Protect all wallet routes
router.use(ensureAuthenticated);

router.get("/", walletController.getWallet);
router.post("/deposit", walletController.deposit);
router.post("/withdraw", walletController.withdraw);
router.post("/transfer", walletController.transfer);
router.get("/transactions", walletController.getTransactions);

module.exports = router;
