import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownToLine, Boxes, FileText, FilePlus2, SendHorizontal, Settings, ShieldCheck } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import Badge from '../../components/common/Badge';
import distributorApi from '../../services/distributorApi';
import licenseApi from '../../services/licenseApi';
import getStatusColor from '../../utils/getStatusColor';
import { formatDate } from '../../utils/formatDate';

const getDaysUntil = (dateValue) => {
  if (!dateValue) return null;
  const now = new Date();
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  return Math.ceil((date - now) / (1000 * 60 * 60 * 24));
};

const DistributorDashboard = () => {
  const [licenses, setLicenses] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const storedUser = localStorage.getItem('user');
      let userId = '';

      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          userId = user?.id || '';
        } catch (_) {
          userId = '';
        }
      }

      const [licensesRes, applicationsRes] = await Promise.allSettled([
      licenseApi.getMyLicenses(),
      userId ? distributorApi.getDistributorLicenseApplication(userId) : Promise.resolve(null)]
      );

      if (licensesRes.status === 'fulfilled') {
        setLicenses(licensesRes.value?.data?.data?.licenses || licensesRes.value?.data?.data || []);
      } else {
        setLicenses([]);
      }

      if (applicationsRes.status === 'fulfilled') {
        const payload = applicationsRes.value?.data?.data;
        setApplications(payload?.allApplications || (payload ? [payload] : []));
      } else {
        setApplications([]);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setLicenses([]);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const activeLicenses = licenses.filter((item) => item.status === 'ACTIVE');
    const expiringSoon = licenses.filter((item) => {
      const days = getDaysUntil(item.effectiveTo);
      return days !== null && days >= 0 && days <= 30;
    });
    const expired = licenses.filter((item) => {
      const days = getDaysUntil(item.effectiveTo);
      return item.status === 'EXPIRED' || days !== null && days < 0;
    });
    const pendingApplications = applications.filter((item) => ['SUBMITTED', 'UNDER_REVIEW'].includes(item.status));

    return {
      activeLicenses: activeLicenses.length,
      expiringSoon: expiringSoon.length,
      expired: expired.length,
      pendingApplications: pendingApplications.length
    };
  }, [licenses, applications]);

  const recentApplications = useMemo(() => applications.slice(0, 6), [applications]);

  const nearestExpiry = useMemo(() => {
    const activeWithExpiry = licenses.
    filter((item) => item.status === 'ACTIVE' && item.effectiveTo).
    sort((a, b) => new Date(a.effectiveTo) - new Date(b.effectiveTo));

    return activeWithExpiry[0] || null;
  }, [licenses]);

  const quickActions = [
  { label: 'My License', href: '/distributor/my-license', color: 'bg-info-50 text-info-700 border-info-100', icon: FileText },
  { label: 'Apply New License', href: '/distributor/apply-license', color: 'bg-success-50 text-success-700 border-success-100', icon: FilePlus2 },
  { label: 'Create Distribution', href: '/distributor/create-distribution', color: 'bg-primary-50 text-primary-700 border-primary-100', icon: SendHorizontal },
  { label: 'Incoming Orders', href: '/distributor/incoming-orders', color: 'bg-warning-50 text-warning-700 border-warning-100', icon: ArrowDownToLine },
  { label: 'Distribution History', href: '/distributor/distribution-history', color: 'bg-indigo-50 text-indigo-700 border-indigo-100', icon: FileText },
  { label: 'My Stock', href: '/distributor/stock', color: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: Boxes },
  { label: 'Settings', href: '/distributor/settings', color: 'bg-gray-50 text-gray-700 border-gray-200', icon: Settings }];


  const SkeletonCard = () =>
  <div className="border border-gray-200 bg-white p-5 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-100 rounded w-24" />
          <div className="h-8 bg-gray-100 rounded w-16" />
        </div>
        <div className="w-11 h-11 bg-gray-100 " />
      </div>
    </div>;


  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="License status, expiry tracking and application progress" />

      {}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading ?
        Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />) :

        <>
              <StatCard
            title="Active Licenses"
            value={stats.activeLicenses}
            color="primary"
            icon={<ShieldCheck className="w-5 h-5" />} />
          
              <StatCard
            title="Expiring (30 Days)"
            value={stats.expiringSoon}
            color="warning"
            icon={<ShieldCheck className="w-5 h-5" />} />
          
              <StatCard
            title="Expired Licenses"
            value={stats.expired}
            color="danger"
            icon={<ShieldCheck className="w-5 h-5" />} />
          
              <StatCard
            title="Pending Applications"
            value={stats.pendingApplications}
            color="info"
            icon={<FileText className="w-5 h-5" />} />
          
            </>

        }
      </div>

      {}
      <div className="border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {quickActions.map((action) =>
          <Link
            key={action.href}
            to={action.href}
            className={`flex flex-col items-center gap-2.5 p-4 border text-center transition-colors duration-150 hover:bg-gray-50 ${action.color}`}>
            
              <action.icon className="w-5 h-5" />
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
            <Link to="/distributor/my-license" className="text-xs font-medium text-primary-600 hover:text-primary-700">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {loading ?
            Array.from({ length: 4 }).map((_, i) =>
            <div key={i} className="flex items-center gap-3 px-5 py-3.5 animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-gray-100 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-gray-100 rounded w-36" />
                    <div className="h-3 bg-gray-100 rounded w-24" />
                  </div>
                  <div className="h-5 bg-gray-100 rounded-full w-16" />
                </div>
            ) :
            recentApplications.length > 0 ?
            recentApplications.map((item) =>
            <div key={item.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors group">
                  <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary-700">
                      {(item.applicationNo || 'A').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.applicationNo || 'N/A'}</p>
                    <p className="text-xs text-gray-500">{item.businessName || '-'} · Submitted {formatDate(item.submittedAt || item.createdAt)}</p>
                  </div>
                  <Badge variant={getStatusColor(item.status)} size="sm">
                    {item.status || 'DRAFT'}
                  </Badge>
                </div>
            ) :

            <div className="px-5 py-10 text-center text-sm text-gray-400">No license applications yet</div>
            }
          </div>
        </div>

        <div className="lg:col-span-2 border border-gray-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">License Notice</h3>
          {nearestExpiry ?
          <div className="space-y-3 text-sm text-gray-700">
              <p className="font-medium">Nearest expiry: {nearestExpiry.licenseNumber}</p>
              <p>Expiry date: {formatDate(nearestExpiry.effectiveTo)}</p>
              <p>
                Days remaining:{' '}
                <span className="font-semibold">
                  {Math.max(getDaysUntil(nearestExpiry.effectiveTo) ?? 0, 0)}
                </span>
              </p>
              <Link to="/distributor/apply-license" className="inline-flex text-xs font-medium text-primary-700 hover:text-primary-800">
                Apply renewal or new license
              </Link>
            </div> :

          <div className="space-y-3 text-sm text-gray-600">
              <p>No active distribution license was found for your account.</p>
              <Link to="/distributor/apply-license" className="inline-flex text-xs font-medium text-primary-700 hover:text-primary-800">
                Submit license application
              </Link>
            </div>
          }
        </div>
      </div>
    </div>);

};

export default DistributorDashboard;