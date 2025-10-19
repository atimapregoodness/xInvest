const express = require("express");
const router = express.Router();
const IndexController = require("../controllers/IndexController");

router.get("/", IndexController.getHome);
router.get("/about", IndexController.getAbout);
router.get("/contact", IndexController.getContact);
router.get("/faq", IndexController.getFaq);

router.get("/support", IndexController.getSupport);

module.exports = router;
