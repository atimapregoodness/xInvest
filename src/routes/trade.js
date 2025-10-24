// routes/trade.js
const express = require("express");
const router = express.Router();
const tradeController = require("../controllers/tradeController");
const { ensureAuthenticated } = require("../middleware/auth");

router.get("/", ensureAuthenticated, tradeController.getAdvancedTrade);
router.post("/start", ensureAuthenticated, tradeController.startTrade);
router.get("/status", ensureAuthenticated, tradeController.getStatus);

module.exports = router;
