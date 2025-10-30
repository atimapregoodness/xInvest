const express = require("express");
const router = express.Router();
const investmentPlansController = require("../controllers/InvestmentPlansController");
const { isVerified, ensureAuthenticated } = require("../middleware/auth");
router.use(ensureAuthenticated);

router.get("/", investmentPlansController.getPlans);
router.post(
  "/purchase/:id",
  isVerified,
  investmentPlansController.purchasePlan
);

module.exports = router;
