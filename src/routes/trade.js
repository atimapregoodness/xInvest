// routes/trade.js
const express = require("express");
const router = express.Router();
const tradeController = require("../controllers/tradeController");
const { ensureAuthenticated } = require("../middleware/auth");

router.get("/", ensureAuthenticated, tradeController.getAutoTrade); // GET /dashboard/trade/
router.post("/start", ensureAuthenticated, tradeController.startTrade); // POST /dashboard/trade/start
router.get("/status", ensureAuthenticated, tradeController.getStatus); // GET /dashboard/trade/status (AJAX)

module.exports = router;
