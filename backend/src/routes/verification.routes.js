const express = require('express');
const router = express.Router();
const { verifyStamp } = require('../controllers/verification.controller');

router.post('/', verifyStamp);

module.exports = router;
