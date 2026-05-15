const express = require('express');
const router = express.Router();
const {
  createOfficer,
  getOfficers,
  getOfficerById,
  updateOfficer,
  updateOfficerStatus,
  resetOfficerPassword,
  uploadOfficerProfileImage,
  getOfficerActivitySummary
} = require('../controllers/officer.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/role.middleware');
const upload = require('../middlewares/upload.middleware');

router.post('/', authenticate, authorizeRoles('ADMIN'), createOfficer);
router.get('/', authenticate, authorizeRoles('ADMIN'), getOfficers);
router.get('/:id', authenticate, authorizeRoles('ADMIN'), getOfficerById);
router.patch('/:id/profile-image', authenticate, authorizeRoles('ADMIN'), upload.single('profileImage'), uploadOfficerProfileImage);
router.patch('/:id', authenticate, authorizeRoles('ADMIN'), updateOfficer);
router.patch('/:id/status', authenticate, authorizeRoles('ADMIN'), updateOfficerStatus);
router.patch('/:id/reset-password', authenticate, authorizeRoles('ADMIN'), resetOfficerPassword);
router.get('/:id/activity-summary', authenticate, authorizeRoles('ADMIN'), getOfficerActivitySummary);

module.exports = router;
