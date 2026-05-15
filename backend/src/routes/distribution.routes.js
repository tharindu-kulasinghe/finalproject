const express = require('express');
const router = express.Router();
const {
  createDistribution,
  getDistributions,
  getDistributionById,
  updateDistributionStatus,
  dispatchDistribution,
  receiveDistribution
} = require('../controllers/distribution.controller');
const authenticate = require('../middlewares/auth.middleware');

router.post('/', authenticate, createDistribution);
router.get('/', authenticate, getDistributions);
router.get('/:id', authenticate, getDistributionById);
router.patch('/:id/status', authenticate, updateDistributionStatus);
router.patch('/:id/dispatch', authenticate, dispatchDistribution);
router.patch('/:id/receive', authenticate, receiveDistribution);

module.exports = router;