const express = require('express');
const router = express.Router();
const {
  createManufacturer,
  createManufacturerApplication,
  getManufacturers,
  getManufacturerById,
  updateManufacturer,
  updateManufacturerStatus,
  resetManufacturerPassword,
  getManufacturerLicenseApplication,
  updateManufacturerApplication,
  issueManufacturerLicense,
  getActiveManufacturers,
  getAvailableDistributors,
  getAvailableRetailers,
  getAvailableManufacturersForRetailer
} = require('../controllers/manufacturer.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/role.middleware');
const { UserRole } = require('@prisma/client');

router.get('/active', getActiveManufacturers);

router.post('/', authenticate, authorizeRoles(UserRole.ADMIN), createManufacturer);
router.get('/', authenticate, authorizeRoles([UserRole.ADMIN, UserRole.ED_OFFICER]), getManufacturers);
router.get('/:id', authenticate, authorizeRoles([UserRole.ADMIN, UserRole.ED_OFFICER]), getManufacturerById);
router.patch('/:id', authenticate, authorizeRoles(UserRole.ADMIN), updateManufacturer);
router.patch('/:id/status', authenticate, authorizeRoles(UserRole.ADMIN), updateManufacturerStatus);
router.patch('/:id/reset-password', authenticate, authorizeRoles(UserRole.ADMIN), resetManufacturerPassword);
router.get('/:id/license-application', authenticate, authorizeRoles(UserRole.ADMIN, UserRole.MANUFACTURER), getManufacturerLicenseApplication);
router.post('/:id/application', authenticate, authorizeRoles(UserRole.ADMIN, UserRole.MANUFACTURER), createManufacturerApplication);
router.patch('/:id/application', authenticate, authorizeRoles(UserRole.ADMIN), updateManufacturerApplication);
router.post('/:id/issue-license', authenticate, authorizeRoles(UserRole.ADMIN), issueManufacturerLicense);


router.get('/available/distributors', authenticate, authorizeRoles([UserRole.MANUFACTURER, UserRole.ADMIN, UserRole.ED_OFFICER]), getAvailableDistributors);
router.get('/available/retailers', authenticate, authorizeRoles([UserRole.MANUFACTURER, UserRole.ADMIN, UserRole.ED_OFFICER]), getAvailableRetailers);


router.get('/available/for-retailer', authenticate, authorizeRoles([UserRole.RETAILER, UserRole.ADMIN, UserRole.ED_OFFICER]), getAvailableManufacturersForRetailer);

module.exports = router;