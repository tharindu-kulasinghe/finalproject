const express = require('express');
const router = express.Router();
const { 
  createProduct, 
  getProducts, 
  getProductById, 
  updateProduct, 
  deleteProduct 
} = require('../controllers/product.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/role.middleware');
const { UserRole } = require('@prisma/client');

router.post('/', authenticate, authorizeRoles([UserRole.ADMIN, UserRole.ED_OFFICER, UserRole.MANUFACTURER]), createProduct);
router.get('/', authenticate, authorizeRoles([UserRole.ADMIN, UserRole.ED_OFFICER, UserRole.MANUFACTURER]), getProducts);
router.get('/:id', authenticate, authorizeRoles([UserRole.ADMIN, UserRole.ED_OFFICER, UserRole.MANUFACTURER]), getProductById);
router.patch('/:id', authenticate, authorizeRoles([UserRole.ADMIN, UserRole.ED_OFFICER, UserRole.MANUFACTURER]), updateProduct);
router.delete('/:id', authenticate, authorizeRoles([UserRole.ADMIN, UserRole.ED_OFFICER, UserRole.MANUFACTURER]), deleteProduct);

module.exports = router;
