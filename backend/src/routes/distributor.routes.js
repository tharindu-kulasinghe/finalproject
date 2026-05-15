const express = require('express');
const router = express.Router();
const {
  createDistributor,
  createDistributorApplication,
  getDistributors,
  getDistributorById,
  updateDistributor,
  updateDistributorStatus,
  resetDistributorPassword,
  updateDistributorApplication,
  getDistributorLicenseApplication,
  issueDistributorLicense,
  getActiveDistributors,
  getAvailableRetailersForDistributor,
  getDistributorStock,
  getAvailableDistributorsForRetailer
} = require('../controllers/distributor.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/role.middleware');
const { UserRole } = require('@prisma/client');

router.get('/active', getActiveDistributors);

router.post('/', authenticate, authorizeRoles([UserRole.ADMIN, UserRole.ED_OFFICER]), createDistributor);
router.get('/', authenticate, authorizeRoles([UserRole.ADMIN, UserRole.ED_OFFICER]), getDistributors);
router.get('/:id', authenticate, authorizeRoles([UserRole.ADMIN, UserRole.ED_OFFICER]), getDistributorById);
router.patch('/:id', authenticate, authorizeRoles([UserRole.ADMIN, UserRole.ED_OFFICER]), updateDistributor);
router.patch('/:id/status', authenticate, authorizeRoles([UserRole.ADMIN, UserRole.ED_OFFICER]), updateDistributorStatus);
router.patch('/:id/reset-password', authenticate, authorizeRoles([UserRole.ADMIN, UserRole.ED_OFFICER]), resetDistributorPassword);
router.post('/:id/application', authenticate, authorizeRoles([UserRole.ADMIN, UserRole.ED_OFFICER, UserRole.DISTRIBUTOR]), createDistributorApplication);
router.patch('/:id/application', authenticate, authorizeRoles([UserRole.ADMIN, UserRole.ED_OFFICER]), updateDistributorApplication);
router.get('/:id/license-application', authenticate, authorizeRoles([UserRole.ADMIN, UserRole.ED_OFFICER, UserRole.DISTRIBUTOR]), getDistributorLicenseApplication);
router.post('/:id/issue-license', authenticate, authorizeRoles([UserRole.ADMIN, UserRole.ED_OFFICER]), issueDistributorLicense);


router.get('/available/retailers', authenticate, authorizeRoles([UserRole.DISTRIBUTOR, UserRole.ADMIN, UserRole.ED_OFFICER]), getAvailableRetailersForDistributor);
router.get('/stock/my', authenticate, authorizeRoles([UserRole.DISTRIBUTOR, UserRole.ADMIN, UserRole.ED_OFFICER]), getDistributorStock);


router.get('/available/for-retailer', authenticate, authorizeRoles([UserRole.RETAILER, UserRole.ADMIN, UserRole.ED_OFFICER]), getAvailableDistributorsForRetailer);

module.exports = router;