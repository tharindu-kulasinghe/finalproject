const express = require('express');
const router = express.Router();
const { getAuditLogs, getAuditLogById } = require('../controllers/audit.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/role.middleware');

router.get('/', authenticate, authorizeRoles('ADMIN', 'ED_OFFICER'), getAuditLogs);
router.get('/:id', authenticate, authorizeRoles('ADMIN', 'ED_OFFICER'), getAuditLogById);

module.exports = router;
