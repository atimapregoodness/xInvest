const express = require("express");
const router = express.Router();
const BlogController = require("../controllers/BlogController");

router.get("/", BlogController.blog);

module.exports = router;
