const express = require('express');
const router = express.Router();
const {
  createRetailer,
  createRetailerApplication,
  getRetailers,
  getRetailerById,
  updateRetailer,
  updateRetailerStatus,
  resetRetailerPassword,
  getRetailerLicenseApplication,
  updateRetailerApplication,
  issueRetailerLicense
} = require('../controllers/retailer.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/role.middleware');
const { UserRole } = require('@prisma/client');

router.post('/', authenticate, authorizeRoles(UserRole.ADMIN), createRetailer);
router.get('/', authenticate, authorizeRoles([UserRole.ADMIN, UserRole.ED_OFFICER]), getRetailers);
router.get('/:id', authenticate, authorizeRoles([UserRole.ADMIN, UserRole.ED_OFFICER]), getRetailerById);
router.patch('/:id', authenticate, authorizeRoles(UserRole.ADMIN), updateRetailer);
router.patch('/:id/status', authenticate, authorizeRoles(UserRole.ADMIN), updateRetailerStatus);
router.patch('/:id/reset-password', authenticate, authorizeRoles(UserRole.ADMIN), resetRetailerPassword);
router.get('/:id/license-application', authenticate, authorizeRoles([UserRole.ADMIN, UserRole.ED_OFFICER, UserRole.RETAILER]), getRetailerLicenseApplication);
router.post('/:id/application', authenticate, authorizeRoles([UserRole.ADMIN, UserRole.ED_OFFICER, UserRole.RETAILER]), createRetailerApplication);
router.patch('/:id/application', authenticate, authorizeRoles(UserRole.ADMIN), updateRetailerApplication);
router.post('/:id/issue-license', authenticate, authorizeRoles(UserRole.ADMIN), issueRetailerLicense);

module.exports = router;