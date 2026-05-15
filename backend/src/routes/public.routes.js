const express = require('express');
const router = express.Router();
const { createPublicLicenseApplication } = require('../controllers/publicLicenseApplication.controller');
const {
  getLicenseDueByNumber,
  getBatchDueByNumber,
  declarePublicPayment,
  prepareIpayCheckout,
  ipayCallback,
} = require('../controllers/publicPayment.controller');
const upload = require('../middlewares/upload.middleware');


router.post('/license-applications', createPublicLicenseApplication);


router.get('/payments/license/:licenseNumber', getLicenseDueByNumber);
router.get('/payments/batch/:batchNo', getBatchDueByNumber);
router.post('/payments/declare', upload.single('proofImage'), declarePublicPayment);
router.post('/payments/ipay/prepare', prepareIpayCheckout);
router.post('/payments/ipay/callback', ipayCallback);

module.exports = router;