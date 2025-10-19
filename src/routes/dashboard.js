const express = require("express");
const router = express.Router();
const DashboardController = require("../controllers/DashboardController");
const { ensureAuthenticated } = require("../middleware/auth");

// All dashboard routes require authentication
router.use(ensureAuthenticated);

// Dashboard main page
router.get("/", DashboardController.getDashboard);

// Investment routes
router.get("/investments", DashboardController.getInvestments);

// Profile routes
router.get("/profile", DashboardController.getProfile);
router.post("/profile", DashboardController.updateProfile);

module.exports = router;
