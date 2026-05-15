const express = require('express');
const router = express.Router();
const { 
  createStampRequest, 
  getStampRequests, 
  getStampRequestById, 
  reviewStampRequest,
  issueStamps,
  downloadStampBundleZip
} = require('../controllers/stampRequest.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/role.middleware');

router.post('/', authenticate, authorizeRoles('MANUFACTURER', 'LICENSE_HOLDER'), createStampRequest);
router.get('/', authenticate, getStampRequests);
router.get('/download/zip', authenticate, downloadStampBundleZip);
router.get('/:id/download/zip', authenticate, downloadStampBundleZip);
router.get('/:id', authenticate, getStampRequestById);
router.patch('/:id/review', authenticate, authorizeRoles('ADMIN', 'ED_OFFICER'), reviewStampRequest);
router.patch('/:id/issue', authenticate, authorizeRoles('ADMIN', 'ED_OFFICER'), issueStamps);

module.exports = router;
