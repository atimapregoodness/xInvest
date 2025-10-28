const express = require("express");
const router = express.Router();
const IndexController = require("../controllers/IndexController");

router.get("/", IndexController.getHome);

router.get("/about", IndexController.getAbout);

router.get("/contact", IndexController.getContact);

router.get("/faqs", IndexController.getFAQs);

router.get("/terms", IndexController.getTerms);

router.get("/privacy", IndexController.getPrivacy);

module.exports = router;
