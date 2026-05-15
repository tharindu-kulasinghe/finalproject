const express = require('express');
const router = express.Router();
const { register, login, getMe, getAllUsers, updateProfile, changePassword, forgotPassword } = require('../controllers/auth.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/role.middleware');

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.get('/me', authenticate, getMe);
router.get('/users', authenticate, authorizeRoles('ADMIN'), getAllUsers);
router.put('/profile', authenticate, updateProfile);
router.put('/change-password', authenticate, changePassword);

module.exports = router;
