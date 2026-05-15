const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const errorHandler = require('./middlewares/error.middleware');
const notFound = require('./middlewares/notFound.middleware');
const httpActivityMiddleware = require('./middlewares/httpActivity.middleware');

const authRoutes = require('./routes/auth.routes');
const licenseApplicationRoutes = require('./routes/licenseApplication.routes');
const manufacturingApplicationRoutes = require('./routes/manufacturingApplication.routes');
const distributionApplicationRoutes = require('./routes/distributionApplication.routes');
const retailApplicationRoutes = require('./routes/retailApplication.routes');
const licenseRoutes = require('./routes/license.routes');
const productRoutes = require('./routes/product.routes');
const batchRoutes = require('./routes/batch.routes');
const dutyRoutes = require('./routes/duty.routes');
const paymentRoutes = require('./routes/payment.routes');
const stampRequestRoutes = require('./routes/stampRequest.routes');
const taxStampRoutes = require('./routes/taxStamp.routes');
const verificationRoutes = require('./routes/verification.routes');
const auditRoutes = require('./routes/audit.routes');
const distributionRoutes = require('./routes/distribution.routes');
const officerRoutes = require('./routes/officer.routes');
const distributorRoutes = require('./routes/distributor.routes');
const manufacturerRoutes = require('./routes/manufacturer.routes');
const retailerRoutes = require('./routes/retailer.routes');
const notificationRoutes = require('./routes/notification.routes');
const publicRoutes = require('./routes/public.routes');

const { getTaxRates, getTaxRateById, createTaxRate, updateTaxRate, toggleTaxRate } = require('./controllers/duty.controller');
const authenticate = require('./middlewares/auth.middleware');
const authorizeRoles = require('./middlewares/role.middleware');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(httpActivityMiddleware);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const uploadsDir = path.resolve(__dirname, './uploads');
const fallbackUploadsDir = path.resolve(__dirname, '../uploads');
console.log('Uploads directory:', uploadsDir);
console.log('Uploads exists:', fs.existsSync(uploadsDir));
console.log('Fallback uploads exists:', fs.existsSync(fallbackUploadsDir));
console.log('Current __dirname:', __dirname);

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory');
}

app.use("/uploads", express.static(uploadsDir));
app.use("/uploads", express.static(fallbackUploadsDir));

app.use('/api/auth', authRoutes);
app.use('/api/license-applications', licenseApplicationRoutes);
app.use('/api/manufacturing-applications', manufacturingApplicationRoutes);
app.use('/api/distribution-applications', distributionApplicationRoutes);
app.use('/api/retail-applications', retailApplicationRoutes);
app.use('/api/licenses', licenseRoutes);
app.use('/api/products', productRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/duties', dutyRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/stamp-requests', stampRequestRoutes);
app.use('/api/tax-stamps', taxStampRoutes);
app.use('/api/verify', verificationRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/distributions', distributionRoutes);
app.use('/api/officers', officerRoutes);
app.use('/api/distributors', distributorRoutes);
app.use('/api/manufacturers', manufacturerRoutes);
app.use('/api/retailers', retailerRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/public', publicRoutes);

app.get('/api/tax-rates', authenticate, getTaxRates);
app.get('/api/tax-rates/:id', authenticate, getTaxRateById);
app.post('/api/tax-rates', authenticate, authorizeRoles('ADMIN'), createTaxRate);
app.put('/api/tax-rates/:id', authenticate, authorizeRoles('ADMIN'), updateTaxRate);
app.patch('/api/tax-rates/:id/toggle', authenticate, authorizeRoles('ADMIN'), toggleTaxRate);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
