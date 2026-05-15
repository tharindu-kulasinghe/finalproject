const express = require('express');
const router = express.Router();
const { 
  createBatch, 
  getBatches, 
  getBatchById, 
  updateBatch,
  submitBatch,
  verifyBatch,
  rejectBatch
} = require('../controllers/batch.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/role.middleware');

router.post('/', authenticate, createBatch);
router.get('/', authenticate, getBatches);
router.get('/:id', authenticate, getBatchById);
router.patch('/:id', authenticate, updateBatch);
router.patch('/:id/submit', authenticate, submitBatch);
router.patch('/:id/verify', authenticate, authorizeRoles('ADMIN', 'ED_OFFICER'), verifyBatch);
router.patch('/:id/reject', authenticate, authorizeRoles('ADMIN', 'ED_OFFICER'), rejectBatch);

module.exports = router;
