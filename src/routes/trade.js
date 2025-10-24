// routes/trade.js
const express = require("express");
const router = express.Router();
const tradeController = require("../controllers/tradeController");
const { ensureAuthenticated } = require("../middleware/auth");

// Advanced trading routes
router.get("/", ensureAuthenticated, tradeController.getTrades);
router.get("/place", ensureAuthenticated, tradeController.getPlaceTrade);
router.post("/start", ensureAuthenticated, tradeController.startTrade);
router.get("/status", ensureAuthenticated, tradeController.getTradeStatus);

module.exports = router;
