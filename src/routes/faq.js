const express = require('express');
const router = express.Router();
const FaqController = require('../controllers/FaqController');

router.get('/', FaqController.faq);

module.exports = router;
