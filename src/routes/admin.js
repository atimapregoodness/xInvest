const express = require("express");
const router = express.Router();
const AdminController = require("../controllers/AdminController");
const { ensureAdmin } = require("../middleware/auth");

router.get("/", ensureAdmin, AdminController.getDashboard);
router.get("/users", ensureAdmin, AdminController.getUsers);
router.get("/transactions", ensureAdmin, AdminController.getTransactions);
router.get("/settings", ensureAdmin, AdminController.getSettings);

router.post(
  "/user/update-balance/:id",
  ensureAdmin,
  AdminController.updateUserBalance
);
router.post("/user/restrict/:id", ensureAdmin, AdminController.restrictUser);
router.post(
  "/user/unrestrict/:id",
  ensureAdmin,
  AdminController.unrestrictUser
);
router.post("/user/delete/:id", ensureAdmin, AdminController.deleteUser);

router.post("/transactions/add", ensureAdmin, AdminController.addTransaction);
router.post("/settings", ensureAdmin, AdminController.updateSettings);

router.get("/request", ensureAdmin, AdminController.getRequests);

module.exports = router;
