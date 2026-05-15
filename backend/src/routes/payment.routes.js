const express = require('express');
const router = express.Router();
const { 
  declarePayment, 
  getPayments, 
  getPaymentById, 
  verifyPayment, 
  allocatePayment 
} = require('../controllers/payment.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/role.middleware');
const upload = require('../middlewares/upload.middleware');

router.post('/', authenticate, upload.single('proofImage'), declarePayment);
router.get('/', authenticate, getPayments);
router.get('/:id', authenticate, getPaymentById);
router.patch('/:id/verify', authenticate, authorizeRoles('ADMIN', 'ED_OFFICER'), verifyPayment);
router.post('/:id/allocate', authenticate, authorizeRoles('ADMIN', 'ED_OFFICER'), allocatePayment);

module.exports = router;
