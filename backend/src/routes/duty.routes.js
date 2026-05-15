const express = require('express');
const router = express.Router();
const {
  calculateDutyForBatch,
  getDutyAssessments,
  getDutyAssessmentById,
  getOverdueDuties,
  updateDutyAssessmentStatus,
  getTaxRates,
  getTaxRateById,
  createTaxRate,
  updateTaxRate,
  toggleTaxRate
} = require('../controllers/duty.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/role.middleware');

router.post('/calculate/:batchId', authenticate, authorizeRoles('ADMIN', 'ED_OFFICER'), calculateDutyForBatch);
router.get('/', authenticate, getDutyAssessments);
router.get('/overdue/list', authenticate, authorizeRoles('ADMIN', 'ED_OFFICER'), getOverdueDuties);
router.get('/:id', authenticate, getDutyAssessmentById);
router.patch('/:id/status', authenticate, authorizeRoles('ADMIN', 'ED_OFFICER'), updateDutyAssessmentStatus);

router.get('/tax-rates', authenticate, getTaxRates);
router.get('/tax-rates/:id', authenticate, getTaxRateById);
router.post('/tax-rates', authenticate, authorizeRoles('ADMIN'), createTaxRate);
router.put('/tax-rates/:id', authenticate, authorizeRoles('ADMIN'), updateTaxRate);
router.patch('/tax-rates/:id/toggle', authenticate, authorizeRoles('ADMIN'), toggleTaxRate);

module.exports = router;
