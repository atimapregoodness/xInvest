const express = require("express");
const router = express.Router();
const AdminController = require("../controllers/AdminController");
const { ensureAdmin } = require("../middleware/auth");

router.use(ensureAdmin);

router.get("/", AdminController.getDashboard);
router.get("/users", AdminController.getUsers);
router.get("/transactions", AdminController.getTransactions);
router.get("/settings", AdminController.getSettings);

router.post(
  "/user/update-balance/:id",

  AdminController.updateUserBalance
);
router.post("/user/restrict/:id", AdminController.restrictUser);
router.post(
  "/user/unrestrict/:id",

  AdminController.unrestrictUser
);
router.post("/user/delete/:id", AdminController.deleteUser);

router.post("/transactions/add", AdminController.addTransaction);
router.post("/settings", AdminController.updateSettings);

router.get("/request", AdminController.getRequests);

router.get(
  "/verify/approve/:id",

  AdminController.approveVerification
);

router.get(
  "/verify/reject/:id",

  AdminController.rejectVerification
);

router.get("/deposit/approve/:id", AdminController.approveDeposit);
router.get("/deposit/reject/:id", AdminController.rejectDeposit);

module.exports = router;
