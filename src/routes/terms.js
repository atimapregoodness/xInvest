const express = require('express');
const router = express.Router();
const TermsController = require('../controllers/TermsController');

router.get('/', TermsController.terms);

module.exports = router;
