const express = require('express');
const router = express.Router();
const ExplorerController = require('../controllers/ExplorerController');

router.get('/', ExplorerController.explorer);

module.exports = router;
