const express = require('express');
const router = express.Router();
const { 
  createApplication, 
  getApplications, 
  getApplicationById, 
  reviewApplication, 
  updateApplicationStatus,
  getMyApplications 
} = require('../controllers/licenseApplication.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/role.middleware');

router.post('/', authenticate, createApplication);
router.get('/', authenticate, getApplications);
router.get('/my', authenticate, getMyApplications);
router.get('/:id', authenticate, getApplicationById);
router.patch('/:id/review', authenticate, authorizeRoles('ADMIN', 'ED_OFFICER'), reviewApplication);
router.patch('/:id/status', authenticate, authorizeRoles('ADMIN', 'ED_OFFICER'), updateApplicationStatus);

module.exports = router;
