import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Package, CreditCard, Stamp, Box, ShieldCheck, Clock, FilePlus2 } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import getStatusColor from '../../utils/getStatusColor';
import { formatDate } from '../../utils/formatDate';
import licenseApi from '../../services/licenseApi';
import productApi from '../../services/productApi';
import batchApi from '../../services/batchApi';
import dutyApi from '../../services/dutyApi';
import stampApi from '../../services/stampApi';

const ManufacturerDashboard = () => {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    activeLicenses: 0,
    totalProducts: 0,
    submittedBatches: 0,
    pendingDuties: 0,
    pendingStampRequests: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (_) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }

    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [licensesRes, productsRes, batchesRes, dutiesRes, stampsRes] = await Promise.allSettled([
      licenseApi.getMyLicenses(),
      productApi.getProducts(),
      batchApi.getBatches(),
      dutyApi.getDuties(),
      stampApi.getStampRequests()]
      );

      const myLicenses = licensesRes.status === 'fulfilled' ? licensesRes.value.data?.data?.licenses || [] : [];
      const activeLicenses = myLicenses.filter((l) => l.status === 'ACTIVE').length;

      const allProducts = productsRes.status === 'fulfilled' ? productsRes.value.data?.data?.products || [] : [];
      const myProducts = allProducts;

      const allBatches = batchesRes.status === 'fulfilled' ? batchesRes.value.data?.data?.batches || [] : [];
      const submittedBatches = allBatches.filter((b) => b.status === 'SUBMITTED').length;

      const allDuties = dutiesRes.status === 'fulfilled' ? dutiesRes.value.data?.data?.assessments || [] : [];
      const pendingDuties = allDuties.filter((d) => ['CALCULATED', 'PART_PAID'].includes(d.status)).length;

      const allStamps = stampsRes.status === 'fulfilled' ? stampsRes.value.data?.data?.stampRequests || stampsRes.value.data?.data?.requests || [] : [];
      const pendingStampRequests = allStamps.filter((s) => s.status === 'PENDING').length;

      setStats({
        activeLicenses,
        totalProducts: myProducts.length,
        submittedBatches,
        pendingDuties,
        pendingStampRequests
      });

      const activities = [];
      allBatches.slice(0, 3).forEach((b) => {
        activities.push({ id: b.id, title: b.batchNo, type: 'batch', status: b.status, createdAt: b.submittedAt || b.createdAt });
      });
      allStamps.slice(0, 2).forEach((s) => {
        activities.push({ id: s.id, title: s.requestNo || 'Stamp Request', type: 'stamp', status: s.status, createdAt: s.createdAt });
      });
      setRecentActivity(activities.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 5));
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setStats({
        activeLicenses: 0,
        totalProducts: 0,
        submittedBatches: 0,
        pendingDuties: 0,
        pendingStampRequests: 0
      });
      setRecentActivity([]);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
  { label: 'Submit Batch', href: '/manufacturer/batches', color: 'bg-primary-50 text-primary-700 border-primary-100', icon: FileText },
  { label: 'Payments', href: '/manufacturer/payments', color: 'bg-success-50 text-success-700 border-success-100', icon: CreditCard },
  { label: 'Request Stamps', href: '/manufacturer/stamp-requests', color: 'bg-info-50 text-info-700 border-info-100', icon: Stamp },
  { label: 'My Products', href: '/manufacturer/products', color: 'bg-purple-50 text-purple-700 border-purple-100', icon: Package },
  { label: 'My Licenses', href: '/manufacturer/my-licenses', color: 'bg-warning-50 text-warning-700 border-warning-100', icon: ShieldCheck },
  { label: 'Apply New License', href: '/manufacturer/apply-license', color: 'bg-teal-50 text-teal-700 border-teal-100', icon: FilePlus2 },
  { label: 'Stamp History', href: '/manufacturer/tax-stamp-history', color: 'bg-gray-50 text-gray-700 border-gray-100', icon: Clock }];


  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${user?.fullName || 'Manufacturer'}. Here is an overview of your account.`} />
      

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard
          title="Active Licenses"
          value={stats.activeLicenses}
          color="success"
          icon={<ShieldCheck className="w-5 h-5" />} />
        
        <StatCard
          title="Total Products"
          value={stats.totalProducts}
          color="primary"
          icon={<Package className="w-5 h-5" />} />
        
        <StatCard
          title="Submitted Batches"
          value={stats.submittedBatches}
          color="info"
          icon={<FileText className="w-5 h-5" />} />
        
        <StatCard
          title="Pending Duties"
          value={stats.pendingDuties}
          color="warning"
          icon={<CreditCard className="w-5 h-5" />} />
        
        <StatCard
          title="Pending Stamp Requests"
          value={stats.pendingStampRequests}
          color="purple"
          icon={<Stamp className="w-5 h-5" />} />
        
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          {loading ?
          <div className="animate-pulse space-y-3">
              {Array.from({ length: 5 }).map((_, i) =>
            <div key={i} className="h-12 bg-gray-100 rounded" />
            )}
            </div> :
          recentActivity.length > 0 ?
          <div className="space-y-3">
              {recentActivity.map((item, idx) =>
            <div
              key={item.id || idx}
              className="flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
              
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.title || item.description}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {item.type && <span className="capitalize">{item.type}</span>}
                      {item.createdAt && ` -- ${formatDate(item.createdAt)}`}
                    </p>
                  </div>
                  {item.status &&
              <Badge variant={getStatusColor(item.status)} size="sm">
                      {item.status}
                    </Badge>
              }
                </div>
            )}
            </div> :

          <p className="text-sm text-gray-500 text-center py-8">No recent activity</p>
          }
        </div>

        <div className="border border-gray-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) =>
            <Link
              key={action.href}
              to={action.href}
              className={`flex flex-col items-center gap-2.5 p-4 border text-center transition-colors duration-150 hover:bg-gray-50 rounded ${action.color}`}>
              
                <action.icon className="w-5 h-5" />
                <span className="text-xs font-semibold">{action.label}</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>);

};

export default ManufacturerDashboard;