const express = require("express");
const router = express.Router();
const investmentPlansController = require("../controllers/investmentPlansController");
const { ensureAuthenticated } = require("../middleware/auth");

router.get("/", ensureAuthenticated, investmentPlansController.getPlans);
router.post(
  "/purchase/:id",
  ensureAuthenticated,
  investmentPlansController.purchasePlan
);

module.exports = router;
