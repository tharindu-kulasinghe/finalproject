const express = require('express');
const router = express.Router();
const { 
  createLicense, 
  getLicenses, 
  getLicenseById, 
  updateLicense, 
  updateLicenseStatus,
  getMyLicenses 
} = require('../controllers/license.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/role.middleware');

router.post('/', authenticate, authorizeRoles('ADMIN', 'ED_OFFICER'), createLicense);
router.get('/', authenticate, getLicenses);
router.get('/my', authenticate, getMyLicenses);
router.get('/:id', authenticate, getLicenseById);
router.patch('/:id', authenticate, authorizeRoles('ADMIN', 'ED_OFFICER'), updateLicense);
router.patch('/:id/status', authenticate, authorizeRoles('ADMIN', 'ED_OFFICER'), updateLicenseStatus);

module.exports = router;
