const express = require("express");
const router = express.Router();
const AdminController = require("../controllers/AdminController");
const { ensureAuthenticated } = require("../middleware/auth");

// All admin routes require authentication and admin role
router.use(ensureAuthenticated);
router.use(AdminController.requireAdmin);

// Admin dashboard
router.get("/", AdminController.getAdminDashboard);

// User management
router.get("/users", AdminController.getUsers);
router.post("/users/:userId/status", AdminController.updateUserStatus);

// Transaction management
router.get("/transactions", AdminController.getTransactions);

module.exports = router;
