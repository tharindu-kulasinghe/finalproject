import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import PublicLayout from './components/layout/PublicLayout';
import DashboardLayout from './components/layout/DashboardLayout';

import Login from './pages/auth/Login';
import ForgotPassword from './pages/auth/ForgotPassword';
import VerifyStamp from './pages/public/VerifyStamp';
import HomePage from './pages/public/Home';
import NotFound from './pages/public/NotFound';
import HelpSupport from './pages/public/HelpSupport';
import ContactLocations from './pages/public/ContactLocations';
import NoticesAnnouncements from './pages/public/NoticesAnnouncements';
import TaxPayments from './pages/public/TaxPayments';

import AdminDashboard from './pages/admin/Dashboard';
import AdminLicenses from './pages/admin/Licenses';
import AdminProducts from './pages/admin/Products';
import AdminBatches from './pages/admin/Batch/Batches';
import AdminBatchDetails from './pages/admin/Batch/BatchDetails';
import AdminBatchEdit from './pages/admin/Batch/BatchEdit';
import AdminDuties from './pages/admin/Duty/Duties';
import AdminDutyDetails from './pages/admin/Duty/DutyDetails';
import AdminPayments from './pages/admin/Payment/Payments';
import AdminPaymentDetails from './pages/admin/Payment/PaymentDetails';
import AdminPaymentEdit from './pages/admin/Payment/EditPayment';
import AdminStampRequests from './pages/admin/StampRequest/StampRequests';
import AdminStampRequestDetails from './pages/admin/StampRequest/StampRequestDetails';
import AdminEditStampRequest from './pages/admin/StampRequest/EditStampRequest';
import AdminTaxStamps from './pages/admin/TaxStamp/TaxStamps';
import AdminTaxStampDetails from './pages/admin/TaxStamp/TaxStampDetails';
import AdminTaxRates from './pages/admin/TaxRate/TaxRates';
import AdminAddTaxRate from './pages/admin/TaxRate/AddTaxRate';
import AdminTaxRateDetails from './pages/admin/TaxRate/TaxRateDetails';
import AdminEditTaxRate from './pages/admin/TaxRate/EditTaxRate';
import AdminAuditLogs from './pages/admin/AuditLogs';
import AdminSettings from './pages/admin/Settings';
import AdminDistributors from './pages/admin/Distributor/Distributors';
import AdminDistributorDetails from './pages/admin/Distributor/DistributorDetails';
import AdminAddDistributor from './pages/admin/Distributor/AddDistributor';
import AdminEditDistributor from './pages/admin/Distributor/EditDistributor';
import AdminOfficers from './pages/admin/Officer/Officers';
import AdminOfficerDetails from './pages/admin/Officer/OfficerDetails';
import AdminOfficerEdit from './pages/admin/Officer/OfficerEdit';
import AdminAddOfficer from './pages/admin/Officer/AddOfficer';
import AdminManufacturers from './pages/admin/Manufacturer/Manufacturers';
import AdminManufacturerDetails from './pages/admin/Manufacturer/ManufacturerDetails';
import AdminEditManufacturer from './pages/admin/Manufacturer/EditManufacturer';
import AdminAddManufacturer from './pages/admin/Manufacturer/AddManufacturer';
import AdminRetailers from './pages/admin/Retailer/Retailers';
import AdminRetailerDetails from './pages/admin/Retailer/RetailerDetails';
import AdminAddRetailer from './pages/admin/Retailer/AddRetailer';
import AdminEditRetailer from './pages/admin/Retailer/EditRetailer';

import ApplyManufacturingLicense from './pages/public/ApplyManufacturingLicense';
import ApplyDistributionLicense from './pages/public/ApplyDistributionLicense';
import ApplyRetailLicense from './pages/public/ApplyRetailLicense';

import OfficerDashboard from './pages/officer/Dashboard';
import OfficerLicenses from './pages/officer/Licenses';
import OfficerManufacturers from './pages/officer/Manufacturer/Manufacturers';
import OfficerManufacturerDetails from './pages/officer/Manufacturer/ManufacturerDetails';
import OfficerDistributors from './pages/officer/Distributor/Distributors';
import OfficerDistributorDetails from './pages/officer/Distributor/DistributorDetails';
import OfficerRetailers from './pages/officer/Retailer/Retailers';
import OfficerRetailerDetails from './pages/officer/Retailer/RetailerDetails';
import OfficerBatches from './pages/officer/Batch/Batches';
import OfficerBatchDetails from './pages/officer/Batch/BatchDetails';
import OfficerDuties from './pages/officer/Duties';
import OfficerDutyDetails from './pages/officer/Duty/DutyDetails';
import OfficerPayments from './pages/officer/Payments';
import OfficerPaymentDetails from './pages/officer/Payment/PaymentDetails';
import OfficerStampRequests from './pages/officer/StampRequests';
import OfficerStampRequestDetails from './pages/officer/StampRequestDetails';
import OfficerEditStampRequest from './pages/officer/StampRequest/EditStampRequest';
import OfficerStampScanner from './pages/officer/StampScanner';
import OfficerTaxStamps from './pages/officer/TaxStamps';
import OfficerTaxStampDetails from './pages/officer/TaxStamp/TaxStampDetails';
import OfficerTaxRates from './pages/officer/TaxRates';
import OfficerTaxRateDetails from './pages/officer/TaxRate/TaxRateDetails';
import OfficerSettings from './pages/officer/Settings';

import ManufacturerDashboard from './pages/manufacturer/Dashboard';
import ManufacturerLicenses from './pages/manufacturer/MyLicenses';
import ManufacturerProducts from './pages/manufacturer/Products';
import ManufacturerBatches from './pages/manufacturer/Batch/Batches';
import ManufacturerAddBatch from './pages/manufacturer/Batch/AddBatch';
import ManufacturerBatchDetails from './pages/manufacturer/Batch/BatchDetails';
import ManufacturerBatchEdit from './pages/manufacturer/Batch/BatchEdit';
import ManufacturerPayments from './pages/manufacturer/Payment/Payments';
import ManufacturerPaymentDetails from './pages/manufacturer/Payment/PaymentDetails';
import ManufacturerStampRequests from './pages/manufacturer/StampRequest/StampRequests';
import ManufacturerStampRequestCreate from './pages/manufacturer/StampRequest/CreateStampRequest';
import ManufacturerStampRequestDetails from './pages/manufacturer/StampRequest/StampRequestDetails';
import ManufacturerTaxStamps from './pages/manufacturer/TaxStampHistory';
import ManufacturerTaxStampDetails from './pages/manufacturer/TaxStampDetails';
import ManufacturerSettings from './pages/manufacturer/Settings';
import ManufacturerApplyLicense from './pages/manufacturer/ApplyLicense';
import ManufacturerDistributions from './pages/manufacturer/Distribution/Distributions';
import ManufacturerAddDistribution from './pages/manufacturer/Distribution/AddDistribution';
import ManufacturerDistributors from './pages/manufacturer/Distributor/Distributors';
import ManufacturerDistributorDetails from './pages/manufacturer/Distributor/DistributorDetails';
import ManufacturerDistributionDetail from './pages/manufacturer/Distribution/DistributionDetail';

import DistributorDashboard from './pages/distributor/Dashboard';
import DistributorMyLicense from './pages/distributor/MyLicense';
import DistributorApplyLicense from './pages/distributor/ApplyLicense';
import DistributorCreateDistribution from './pages/distributor/CreateDistribution';
import DistributorIncomingOrders from './pages/distributor/IncomingOrders';
import DistributorDistributionHistory from './pages/distributor/DistributionHistory';
import DistributorStock from './pages/distributor/Stock';
import DistributorSettings from './pages/distributor/Settings';

import RetailDashboard from './pages/retail/Dashboard';
import RetailMyLicense from './pages/retail/MyLicense';
import RetailApplyLicense from './pages/retail/ApplyLicense';
import RetailIncomingOrders from './pages/retail/IncomingOrders';
import RetailAllOrders from './pages/retail/AllOrders';
import RetailSettings from './pages/retail/Settings';

const defaultRouteByRole = {
  ADMIN: '/admin/dashboard',
  ED_OFFICER: '/officer/dashboard',
  MANUFACTURER: '/manufacturer/dashboard',
  LICENSE_HOLDER: '/manufacturer/dashboard',
  RETAILER: '/retail/dashboard',
  DISTRIBUTOR: '/distributor/dashboard'
};

const clearAuth = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('token');
};

const getStoredAuth = () => {
  const token = localStorage.getItem('token');
  const storedUser = localStorage.getItem('user');

  if (!token || !storedUser) {
    return { user: null, token: null };
  }

  try {
    return { user: JSON.parse(storedUser), token };
  } catch (_) {
    clearAuth();
    return { user: null, token: null };
  }
};

const getDefaultRoute = (user) => defaultRouteByRole[user?.role] || '/login';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, token } = getStoredAuth();

  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles?.length && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const AppContent = () => {
  const { user, token } = getStoredAuth();
  const isAuthenticated = Boolean(user && token);
  const defaultRoute = getDefaultRoute(user);

  return (
    <>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={isAuthenticated ? <Navigate to={defaultRoute} replace /> : <Login />} />
          <Route path="/forgot-password" element={isAuthenticated ? <Navigate to={defaultRoute} replace /> : <ForgotPassword />} />
          <Route path="/verify" element={<VerifyStamp />} />
          <Route path="/apply-license" element={<Navigate to="/apply/manufacturing" replace />} />
          <Route path="/apply/manufacturing" element={<ApplyManufacturingLicense />} />
          <Route path="/apply/distribution" element={<ApplyDistributionLicense />} />
          <Route path="/apply/retail" element={<ApplyRetailLicense />} />
          <Route path="/help" element={<HelpSupport />} />
          <Route path="/contact" element={<ContactLocations />} />
          <Route path="/notices" element={<NoticesAnnouncements />} />
          <Route path="/payments" element={<TaxPayments />} />

          <Route path="/ed_officer/*" element={<Navigate to="/officer/dashboard" replace />} />
        </Route>

        <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="license-applications" element={<Navigate to="/admin/licenses" replace />} />
          <Route path="licenses" element={<AdminLicenses />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="batches" element={<AdminBatches />} />
          <Route path="batches/:id" element={<AdminBatchDetails />} />
          <Route path="batches/:id/edit" element={<AdminBatchEdit />} />
          <Route path="duties" element={<AdminDuties />} />
          <Route path="duties/:id" element={<AdminDutyDetails />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="payments/:id" element={<AdminPaymentDetails />} />
          <Route path="payments/:id/edit" element={<AdminPaymentEdit />} />
          <Route path="stamp-requests" element={<AdminStampRequests />} />
          <Route path="stamp-requests/:id" element={<AdminStampRequestDetails />} />
          <Route path="stamp-requests/:id/edit" element={<AdminEditStampRequest />} />
          <Route path="tax-stamps" element={<AdminTaxStamps />} />
          <Route path="tax-stamps/:id" element={<AdminTaxStampDetails />} />
          <Route path="tax-rates" element={<AdminTaxRates />} />
          <Route path="tax-rates/add" element={<AdminAddTaxRate />} />
          <Route path="tax-rates/:id" element={<AdminTaxRateDetails />} />
          <Route path="tax-rates/:id/edit" element={<AdminEditTaxRate />} />
          <Route path="audit-logs" element={<AdminAuditLogs />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="distributors" element={<AdminDistributors />} />
          <Route path="distributors/add" element={<AdminAddDistributor />} />
          <Route path="distributors/:id" element={<AdminDistributorDetails />} />
          <Route path="distributors/:id/edit" element={<AdminEditDistributor />} />
          <Route path="distribution-orders" element={<Navigate to="/admin/distributors" replace />} />
          <Route path="officers" element={<AdminOfficers />} />
          <Route path="officers/add" element={<AdminAddOfficer />} />
          <Route path="officers/:id" element={<AdminOfficerDetails />} />
          <Route path="officers/:id/edit" element={<AdminOfficerEdit />} />
          <Route path="manufacturers" element={<AdminManufacturers />} />
          <Route path="manufacturers/add" element={<AdminAddManufacturer />} />
          <Route path="manufacturers/:id" element={<AdminManufacturerDetails />} />
          <Route path="manufacturers/:id/products" element={<AdminManufacturerProductsRedirect />} />
          <Route path="manufacturers/:id/edit" element={<AdminEditManufacturer />} />
          <Route path="retailers" element={<AdminRetailers />} />
          <Route path="retailers/add" element={<AdminAddRetailer />} />
          <Route path="retailers/:id" element={<AdminRetailerDetails />} />
          <Route path="retailers/:id/edit" element={<AdminEditRetailer />} />
          <Route path="manufacturing-applications" element={<Navigate to="/admin/manufacturers" replace />} />
          <Route path="distribution-applications" element={<Navigate to="/admin/distributors" replace />} />
          <Route path="distribution-applications/:id" element={<Navigate to="/admin/distributors" replace />} />
          <Route path="retail-applications" element={<Navigate to="/admin/retailers" replace />} />
          <Route path="retail-applications/:id" element={<Navigate to="/admin/retailers" replace />} />
        </Route>

        <Route path="/officer" element={
        <ProtectedRoute allowedRoles={['ED_OFFICER']}>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<OfficerDashboard />} />
          <Route path="license-applications" element={<Navigate to="/officer/licenses" replace />} />
          <Route path="license-applications/:applicationType/:id" element={<Navigate to="/officer/licenses" replace />} />
          <Route path="licenses" element={<OfficerLicenses />} />
          <Route path="manufacturers" element={<OfficerManufacturers />} />
          <Route path="manufacturers/:id" element={<OfficerManufacturerDetails />} />
          <Route path="distributors" element={<OfficerDistributors />} />
          <Route path="distributors/:id" element={<OfficerDistributorDetails />} />
          <Route path="retailers" element={<OfficerRetailers />} />
          <Route path="retailers/:id" element={<OfficerRetailerDetails />} />
          <Route path="batches" element={<OfficerBatches />} />
          <Route path="batches/:id" element={<OfficerBatchDetails />} />
          <Route path="duties" element={<OfficerDuties />} />
          <Route path="duties/:id" element={<OfficerDutyDetails />} />
          <Route path="payments" element={<OfficerPayments />} />
          <Route path="payments/:id" element={<OfficerPaymentDetails />} />
          <Route path="stamp-requests" element={<OfficerStampRequests />} />
          <Route path="stamp-requests/:id" element={<OfficerStampRequestDetails />} />
          <Route path="stamp-requests/:id/edit" element={<OfficerEditStampRequest />} />
          <Route path="stamp-scanner" element={<OfficerStampScanner />} />
          <Route path="tax-stamps" element={<OfficerTaxStamps />} />
          <Route path="tax-stamps/:id" element={<OfficerTaxStampDetails />} />
          <Route path="tax-rates" element={<OfficerTaxRates />} />
          <Route path="tax-rates/:id" element={<OfficerTaxRateDetails />} />
          <Route path="settings" element={<OfficerSettings />} />
        </Route>

        <Route path="/manufacturer" element={
        <ProtectedRoute allowedRoles={['MANUFACTURER', 'LICENSE_HOLDER']}>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<ManufacturerDashboard />} />
          <Route path="my-licenses" element={<ManufacturerLicenses />} />
          <Route path="apply-license" element={<ManufacturerApplyLicense />} />
          <Route path="products" element={<ManufacturerProducts />} />
          <Route path="batches" element={<ManufacturerBatches />} />
          <Route path="batches/add" element={<ManufacturerAddBatch />} />
          <Route path="batches/:id" element={<ManufacturerBatchDetails />} />
          <Route path="batches/:id/edit" element={<ManufacturerBatchEdit />} />
          <Route path="payments" element={<ManufacturerPayments />} />
          <Route path="payments/:id" element={<ManufacturerPaymentDetails />} />
          <Route path="stamp-requests" element={<ManufacturerStampRequests />} />
          <Route path="stamp-requests/new" element={<ManufacturerStampRequestCreate />} />
          <Route path="stamp-requests/:id" element={<ManufacturerStampRequestDetails />} />
          <Route path="tax-stamp-history" element={<ManufacturerTaxStamps />} />
          <Route path="tax-stamp-history/:id" element={<ManufacturerTaxStampDetails />} />
          <Route path="settings" element={<ManufacturerSettings />} />
          <Route path="distributors" element={<ManufacturerDistributors />} />
          <Route path="distributors/:id" element={<ManufacturerDistributorDetails />} />
          <Route path="distributions" element={<ManufacturerDistributions />} />
          <Route path="distributions/add" element={<ManufacturerAddDistribution />} />
          <Route path="distributions/create" element={<Navigate to="/manufacturer/distributions/add" replace />} />
          <Route path="distributions/:id" element={<ManufacturerDistributionDetail />} />
        </Route>

        <Route path="/distributor" element={
        <ProtectedRoute allowedRoles={['DISTRIBUTOR']}>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DistributorDashboard />} />
          <Route path="my-license" element={<DistributorMyLicense />} />
          <Route path="apply-license" element={<DistributorApplyLicense />} />
          <Route path="incoming-orders" element={<DistributorIncomingOrders />} />
          <Route path="incoming-orders/:id" element={<ManufacturerDistributionDetail />} />
          <Route path="distribution-history" element={<DistributorDistributionHistory />} />
          <Route path="distribution-history/:id" element={<ManufacturerDistributionDetail />} />
          <Route path="create-distribution" element={<DistributorCreateDistribution />} />
          <Route path="stock" element={<DistributorStock />} />
          <Route path="settings" element={<DistributorSettings />} />
        </Route>

        <Route path="/retail" element={
        <ProtectedRoute allowedRoles={['RETAILER']}>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<RetailDashboard />} />
          <Route path="my-license" element={<RetailMyLicense />} />
          <Route path="apply-license" element={<RetailApplyLicense />} />
          <Route path="incoming-orders" element={<RetailIncomingOrders />} />
          <Route path="incoming-orders/:id" element={<ManufacturerDistributionDetail />} />
          <Route path="orders" element={<RetailAllOrders />} />
          <Route path="settings" element={<RetailSettings />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { background: '#333', color: '#fff' },
          success: { style: { background: '#22c55e' } },
          error: { style: { background: '#ef4444' } }
        }} />
      
    </>);

};

const AdminManufacturerProductsRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/admin/products?manufacturerId=${id}`} replace />;
};

export default AppContent;