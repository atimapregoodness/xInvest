const express = require("express");
const router = express.Router();
const PrivacyController = require("../controllers/PrivacyController");

router.get("/", PrivacyController.privacy);

module.exports = router;
