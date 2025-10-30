// routes/trade.js
const express = require("express");
const router = express.Router();
const tradeController = require("../controllers/tradeController");
const { isVerified, ensureAuthenticated } = require("../middleware/auth");

router.use(ensureAuthenticated);

// Advanced trading routes
router.get("/", tradeController.getTrades);
router.get("/place", tradeController.getPlaceTrade);
router.post("/start", isVerified, tradeController.startTrade);
router.get("/status", tradeController.getTradeStatus);

module.exports = router;
