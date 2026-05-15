import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, CreditCard, FileText, Tag, Clock3 } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import Badge from '../../components/common/Badge';
import getStatusColor from '../../utils/getStatusColor';
import { formatRelativeTime } from '../../utils/formatDate';
import { formatCurrency } from '../../utils/formatCurrency';
import licenseApi from '../../services/licenseApi';
import paymentApi from '../../services/paymentApi';
import stampApi from '../../services/stampApi';
import {
  ApplicationStatus,
  LicenseStatus,
  PaymentStatus,
  StampRequestStatus } from
'../../constants/statusConstants';

const quickActions = [
{ label: 'Review Applications', href: '/admin/manufacturers', color: 'bg-primary-50 text-primary-700 border-primary-200', icon: FileText },
{ label: 'Manage Licenses', href: '/admin/licenses', color: 'bg-success-50 text-success-700 border-success-200', icon: BadgeCheck },
{ label: 'Verify Payments', href: '/admin/payments', color: 'bg-info-50 text-info-700 border-info-200', icon: CreditCard },
{ label: 'Issue Tax Stamps', href: '/admin/stamp-requests', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: Tag }];


const APP_PENDING_STATUSES = new Set([
ApplicationStatus.SUBMITTED,
ApplicationStatus.UNDER_REVIEW]
);

const normalizeApplication = (application, type) => ({
  id: `${type}-${application.id}`,
  businessName: application.businessName || application.companyName || application.applicantName || 'Unknown',
  applicationNo: application.applicationNo || '-',
  status: application.status || ApplicationStatus.DRAFT,
  submittedAt: application.submittedAt || application.createdAt || null,
  type
});

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentApplications, setRecentApplications] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [pendingStamps, setPendingStamps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [manufacturingAppsRes, distributionAppsRes, retailAppsRes, licensesRes, paymentsRes, stampsRes] = await Promise.allSettled([
      licenseApi.getManufacturingApplications(),
      licenseApi.getDistributionApplications(),
      licenseApi.getRetailApplications(),
      licenseApi.getLicenses({ status: LicenseStatus.ACTIVE, limit: 1 }),
      paymentApi.getPayments({ status: PaymentStatus.DECLARED }),
      stampApi.getStampRequests({ status: StampRequestStatus.PENDING })]
      );

      const manufacturingApps = manufacturingAppsRes.status === 'fulfilled' ? manufacturingAppsRes.value.data?.data || [] : [];
      const distributionApps = distributionAppsRes.status === 'fulfilled' ? distributionAppsRes.value.data?.data || [] : [];
      const retailApps = retailAppsRes.status === 'fulfilled' ? retailAppsRes.value.data?.data || [] : [];

      const apps = [
      ...manufacturingApps.map((app) => normalizeApplication(app, 'Manufacturing')),
      ...distributionApps.map((app) => normalizeApplication(app, 'Distribution')),
      ...retailApps.map((app) => normalizeApplication(app, 'Retail'))].
      sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));

      const pendingApps = apps.filter((app) => APP_PENDING_STATUSES.has(app.status));
      const activeLicenses = licensesRes.status === 'fulfilled' ? licensesRes.value.data?.data?.pagination?.total || 0 : 0;
      const payments = paymentsRes.status === 'fulfilled' ? paymentsRes.value.data?.data?.payments || [] : [];
      const stamps = stampsRes.status === 'fulfilled' ? stampsRes.value.data?.data?.requests || stampsRes.value.data?.data?.stampRequests || [] : [];

      setStats({
        totalApplications: apps.length,
        pendingApplications: pendingApps.length,
        activeLicenses,
        pendingPayments: payments.length,
        pendingStampRequests: stamps.length
      });
      setRecentApplications(apps.slice(0, 5));
      setPendingPayments(payments.slice(0, 4));
      setPendingStamps(stamps.slice(0, 4));
    } catch (err) {
      console.error('Dashboard data error:', err);
      setStats({ totalApplications: 0, pendingApplications: 0, activeLicenses: 0, pendingPayments: 0, pendingStampRequests: 0 });
    } finally {
      setLoading(false);
    }
  };

  const statCards = stats ? [
  { title: 'Total Applications', value: stats.totalApplications, color: 'primary', icon: <FileText className="h-5 w-5" /> },
  { title: 'Pending Review', value: stats.pendingApplications, color: 'warning', icon: <Clock3 className="h-5 w-5" /> },
  { title: 'Active Licenses', value: stats.activeLicenses, color: 'success', icon: <BadgeCheck className="h-5 w-5" /> },
  { title: 'Pending Payments', value: stats.pendingPayments, color: 'info', icon: <CreditCard className="h-5 w-5" /> },
  { title: 'Pending Stamp Requests', value: stats.pendingStampRequests, color: 'purple', icon: <Tag className="h-5 w-5" /> }] :
  [];

  const SkeletonCard = () =>
  <div className="border border-gray-200 bg-white p-5 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <div className="h-4 w-24 bg-gray-100" />
          <div className="h-8 w-16 bg-gray-100" />
        </div>
        <div className="w-11 h-11 bg-gray-100 " />
      </div>
    </div>;


  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="System overview and recent activity" />
      

      {}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {loading ?
        Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />) :
        statCards.map((s) =>
        <StatCard key={s.title} title={s.title} value={s.value} icon={s.icon} color={s.color} />
        )
        }
      </div>

      {}
      <div className="border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickActions.map((action) =>
          <Link
            key={action.href}
            to={action.href}
            className={`flex flex-col items-center gap-2.5 border p-4 text-center transition-colors duration-150 hover:bg-gray-50 ${action.color}`}>
            
              <action.icon className="h-5 w-5" />
              <span className="text-xs font-semibold">{action.label}</span>
            </Link>
          )}
        </div>
      </div>

      {}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {}
        <div className="lg:col-span-3 border border-gray-200 bg-white">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Recent License Applications</h3>
            <Link to="/admin/licenses" className="text-xs font-medium text-primary-600 hover:text-primary-700">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {loading ?
            Array.from({ length: 4 }).map((_, i) =>
            <div key={i} className="flex items-center gap-3 px-5 py-3.5 animate-pulse">
                  <div className="h-9 w-9 bg-gray-100 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-36 bg-gray-100" />
                    <div className="h-3 w-24 bg-gray-100" />
                  </div>
                  <div className="h-5 w-16 bg-gray-100" />
                </div>
            ) :
            recentApplications.length > 0 ?
            recentApplications.map((app) =>
            <div key={app.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors group">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-primary-200 bg-primary-50">
                    <span className="text-sm font-bold text-primary-700">
                      {app.businessName?.charAt(0)?.toUpperCase() || 'A'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{app.businessName || 'Unknown'}</p>
                    <p className="text-xs text-gray-500">{app.applicationNo} · {app.type} · {formatRelativeTime(app.submittedAt)}</p>
                  </div>
                  <Badge variant={getStatusColor(app.status)} size="sm">{app.status}</Badge>
                </div>
            ) :

            <div className="px-5 py-10 text-center text-sm text-gray-400">No applications yet</div>
            }
          </div>
        </div>

        {}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {}
          <div className="flex-1 border border-gray-200 bg-white">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Pending Payments</h3>
              <Link to="/admin/payments" className="text-xs font-medium text-primary-600 hover:text-primary-700">
                View all →
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {loading ?
              Array.from({ length: 3 }).map((_, i) =>
              <div key={i} className="flex items-center justify-between px-5 py-3 animate-pulse">
                    <div className="h-3.5 w-28 bg-gray-100" />
                    <div className="h-3.5 w-20 bg-gray-100" />
                  </div>
              ) :
              pendingPayments.length > 0 ?
              pendingPayments.map((p) =>
              <div key={p.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                    <div>
                      <p className="text-xs font-mono font-medium text-gray-800">{p.paymentRef || p.paymentReference || '-'}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{p.license?.companyName || p.user?.fullName || '-'}</p>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(p.declaredAmount || p.amount)}</span>
                  </div>
              ) :

              <div className="px-5 py-8 text-center text-sm text-gray-400">No pending payments</div>
              }
            </div>
          </div>

          {}
          <div className="flex-1 border border-gray-200 bg-white">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Stamp Requests</h3>
              <Link to="/admin/stamp-requests" className="text-xs font-medium text-primary-600 hover:text-primary-700">
                View all →
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {loading ?
              Array.from({ length: 3 }).map((_, i) =>
              <div key={i} className="flex items-center justify-between px-5 py-3 animate-pulse">
                    <div className="h-3.5 w-28 bg-gray-100" />
                    <div className="h-3.5 w-16 bg-gray-100" />
                  </div>
              ) :
              pendingStamps.length > 0 ?
              pendingStamps.map((s) =>
              <div key={s.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                    <div>
                      <p className="text-xs font-medium text-gray-800">{s.product?.name || '-'}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Qty: {s.quantityRequested?.toLocaleString()}</p>
                    </div>
                    <Badge variant="warning" size="sm">Pending</Badge>
                  </div>
              ) :

              <div className="px-5 py-8 text-center text-sm text-gray-400">No pending requests</div>
              }
            </div>
          </div>

        </div>
      </div>
    </div>);

};

export default AdminDashboard;