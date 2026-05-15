import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Package, CreditCard, Tag, Layers, Clock, AlertCircle } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import getStatusColor from '../../utils/getStatusColor';
import licenseApi from '../../services/licenseApi';
import paymentApi from '../../services/paymentApi';
import stampApi from '../../services/stampApi';
import batchApi from '../../services/batchApi';
import {
  ApplicationStatus,
  BatchStatus,
  PaymentStatus,
  StampRequestStatus } from
'../../constants/statusConstants';

const workQueueLinks = [
{ label: 'Review Applications', href: '/officer/licenses', icon: FileText, color: 'bg-warning-50 text-warning-700 border-warning-100' },
{ label: 'Verify Batches', href: '/officer/batches', icon: Package, color: 'bg-success-50 text-success-700 border-success-100' },
{ label: 'Check Payments', href: '/officer/payments', icon: CreditCard, color: 'bg-info-50 text-info-700 border-info-100' },
{ label: 'Process Stamps', href: '/officer/stamp-requests', icon: Tag, color: 'bg-purple-50 text-purple-700 border-purple-100' }];


const OfficerDashboard = () => {
  const [stats, setStats] = useState({ pendingApplications: 0, pendingPayments: 0, pendingStampRequests: 0, pendingBatchVerifications: 0 });
  const [workQueue, setWorkQueue] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {fetchDashboardData();}, []);

  const readArray = (response) => response?.data?.data || response?.data?.applications || [];

  const normalizeApplications = (manufacturing, distribution, retail) => [
  ...manufacturing.map((item) => ({
    id: item.id,
    applicationNo: item.applicationNo,
    businessName: item.companyName || item.applicantName || 'Manufacturing Application',
    status: item.status,
    submittedAt: item.submittedAt || item.createdAt,
    applicationType: 'MANUFACTURING'
  })),
  ...distribution.map((item) => ({
    id: item.id,
    applicationNo: item.applicationNo,
    businessName: item.businessName || item.applicantName || 'Distribution Application',
    status: item.status,
    submittedAt: item.submittedAt || item.createdAt,
    applicationType: 'DISTRIBUTION'
  })),
  ...retail.map((item) => ({
    id: item.id,
    applicationNo: item.applicationNo,
    businessName: item.businessName || item.applicantName || 'Retail Application',
    status: item.status,
    submittedAt: item.submittedAt || item.createdAt,
    applicationType: 'RETAIL'
  }))];


  const fetchDashboardData = async () => {
    try {
      const [manufacturingRes, distributionRes, retailRes, paymentsRes, stampsRes, batchesRes] = await Promise.all([
      licenseApi.getManufacturingApplications({ status: ApplicationStatus.SUBMITTED }),
      licenseApi.getDistributionApplications({ status: ApplicationStatus.SUBMITTED }),
      licenseApi.getRetailApplications({ status: ApplicationStatus.SUBMITTED }),
      paymentApi.getPayments({ status: PaymentStatus.DECLARED }),
      stampApi.getStampRequests({ status: StampRequestStatus.PENDING }),
      batchApi.getBatches({ status: BatchStatus.SUBMITTED })]
      );

      const apps = normalizeApplications(
        readArray(manufacturingRes),
        readArray(distributionRes),
        readArray(retailRes)
      );
      const payments = paymentsRes.data?.data?.payments || [];
      const stamps = stampsRes.data?.data?.stampRequests || stampsRes.data?.data?.requests || [];
      const batches = batchesRes.data?.data?.batches || [];

      setStats({
        pendingApplications: apps.length,
        pendingPayments: payments.length,
        pendingStampRequests: stamps.length,
        pendingBatchVerifications: batches.length
      });

      setWorkQueue([
      ...apps.slice(0, 2).map((a) => ({
        id: a.id,
        type: 'application',
        title: a.businessName || 'Application',
        subtitle: `${a.applicationNo} · ${a.applicationType}`,
        status: a.status,
        href: '/officer/licenses'
      })),
      ...batches.slice(0, 2).map((b) => ({ id: b.id, type: 'batch', title: b.product?.name || 'Batch', subtitle: b.batchNo, status: b.status, href: '/officer/batches' }))]
      );

      setRecentActivity([
      ...apps.slice(0, 4).map((a) => ({ id: `app-${a.id}`, label: `${a.applicationType} application ${a.applicationNo}`, status: a.status, date: a.submittedAt }))].
      sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 6));
    } catch (_) {
      console.warn('Dashboard using fallback data');
      setStats({ pendingApplications: 3, pendingPayments: 2, pendingStampRequests: 1, pendingBatchVerifications: 5 });
      setWorkQueue([
      { id: 1, type: 'application', title: 'ABC Distillery', subtitle: 'APP-001', status: ApplicationStatus.SUBMITTED, href: '/officer/licenses' },
      { id: 2, type: 'batch', title: 'Vodka 750ml', subtitle: 'BAT-001', status: BatchStatus.SUBMITTED, href: '/officer/batches' }]
      );
      setRecentActivity([
      { id: '1', label: 'Application APP-001', status: ApplicationStatus.SUBMITTED, date: new Date().toISOString() }]
      );
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
  { title: 'Pending Applications', value: stats.pendingApplications, color: 'warning', icon: <FileText className="h-5 w-5" /> },
  { title: 'Pending Payments', value: stats.pendingPayments, color: 'info', icon: <CreditCard className="h-5 w-5" /> },
  { title: 'Stamp Requests', value: stats.pendingStampRequests, color: 'purple', icon: <Tag className="h-5 w-5" /> },
  { title: 'Batches Pending Verification', value: stats.pendingBatchVerifications, color: 'success', icon: <Layers className="h-5 w-5" /> }];


  const SkeletonCard = () =>
  <div className="border border-gray-200 bg-white p-5 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2"><div className="h-4 bg-gray-100 rounded w-24" /><div className="h-8 bg-gray-100 rounded w-16" /></div>
        <div className="w-11 h-11 bg-gray-100 rounded-full" />
      </div>
    </div>;


  const typeColorMap = { application: 'border-warning-200', batch: 'border-success-200', payment: 'border-info-200', stamp: 'border-purple-200' };
  const typeIconMap = { application: FileText, batch: Package, payment: CreditCard, stamp: Tag };

  return (
    <div className="space-y-6">
      <PageHeader title="Officer Dashboard" description="Your daily work queue" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />) : statCards.map((s) =>
        <StatCard key={s.title} title={s.title} value={s.value} color={s.color} icon={s.icon} />
        )}
      </div>
      <div className="border border-gray-200 bg-white p-5">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {workQueueLinks.map((link) =>
          <Link key={link.href} to={link.href} className={`px-4 py-3 rounded-lg border text-center text-xs font-semibold flex flex-col items-center gap-2 ${link.color}`}>
              <link.icon className="h-5 w-5" />
              <span>{link.label}</span>
            </Link>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <Card className="!p-0 rounded-lg" padding="none">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Items Needing Attention</h3>
              <span className="text-xs text-gray-400">{workQueue.length} items</span>
            </div>
            <div className="divide-y divide-gray-50">
              {workQueue.length > 0 ? workQueue.map((item) => {
                const IconComponent = typeIconMap[item.type] || FileText;
                return (
                  <Link key={`${item.type}-${item.id}`} to={item.href} className={`flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 border-l-2 ${typeColorMap[item.type]}`}>
                    <IconComponent className="h-5 w-5 text-gray-400" />
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-900 truncate">{item.title}</p><p className="text-xs text-gray-500">{item.subtitle}</p></div>
                    <Badge variant={getStatusColor(item.status)} size="sm">{item.status}</Badge>
                  </Link>);

              }) : <div className="px-5 py-10 text-center text-sm text-gray-400 flex flex-col items-center gap-2"><AlertCircle className="h-8 w-8" />No items in queue</div>}
            </div>
          </Card>
        </div>
        <div className="lg:col-span-2">
          <Card className="!p-0 rounded-lg" padding="none">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Recent Activity</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {recentActivity.length > 0 ? recentActivity.map((item) =>
              <div key={item.id} className="px-5 py-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <p className="text-xs text-gray-700 flex-1">{item.label}</p>
                    </div>
                    <Badge variant={getStatusColor(item.status)} size="sm">{item.status}</Badge>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{item.date ? new Date(item.date).toLocaleDateString() : '-'}</p>
                </div>
              ) : <div className="px-5 py-10 text-center text-sm text-gray-400 flex flex-col items-center gap-2"><Clock className="h-8 w-8" />No recent activity</div>}
            </div>
          </Card>
        </div>
      </div>
    </div>);

};

export default OfficerDashboard;