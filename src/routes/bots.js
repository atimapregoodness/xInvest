const express = require("express");
const router = express.Router();
const { ensureAuthenticated } = require("../middleware/auth");

const BotController = require("../controllers/BotsController");

router.get("/", ensureAuthenticated, (req, res) => {
  res.render("user/bots", {
    title: "xInvest - Trading Plans",
    user: req.user,
  });
});

router.get("/available", ensureAuthenticated, BotController.getPlans);

router.post("/purchase", ensureAuthenticated, BotController.purchasePlan);

router.get("/user", ensureAuthenticated, BotController.getUserPlans);

module.exports = router;
