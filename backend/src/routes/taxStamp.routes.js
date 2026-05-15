const express = require('express');
const router = express.Router();
const { 
  generateTaxStamps,
  getTaxStamps, 
  getTaxStampById, 
  getTaxStampByCode,
  updateTaxStampStatus
} = require('../controllers/taxStamp.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/role.middleware');

router.post('/generate/:stampRequestId', authenticate, authorizeRoles('ADMIN', 'ED_OFFICER'), generateTaxStamps);
router.get('/', authenticate, getTaxStamps);
router.get('/code/:codeValue', authenticate, getTaxStampByCode);
router.get('/:id', authenticate, getTaxStampById);
router.patch('/:id/status', authenticate, authorizeRoles('ADMIN', 'ED_OFFICER'), updateTaxStampStatus);

module.exports = router;
