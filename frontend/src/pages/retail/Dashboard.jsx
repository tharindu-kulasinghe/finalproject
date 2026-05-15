import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, Truck, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import api from '../../services/api';
import { formatDate } from '../../utils/formatters';
import getStatusColor from '../../utils/getStatusColor';
import { LicenseStatus } from '../../constants/statusConstants';

const Dashboard = () => {
  const [stats, setStats] = useState({
    pendingOrders: 0,
    receivedOrders: 0,
    totalOrders: 0,
    activeLicense: null
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmReceiveOpen, setConfirmReceiveOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [ordersRes, licensesRes] = await Promise.all([
      api.get('/distributions'),
      api.get('/licenses/my')]
      );

      const orders = ordersRes.data?.data?.data || ordersRes.data?.data || [];
      const licenses = licensesRes.data?.data?.licenses || licensesRes.data?.licenses || [];

      const pendingOrders = orders.filter((o) => o.status === 'PENDING' || o.status === 'DISPATCHED');
      const receivedOrders = orders.filter((o) => o.status === 'RECEIVED');
      const activeLicense = Array.isArray(licenses) ? licenses.find((l) => l.status === LicenseStatus.ACTIVE) : null;

      setStats({
        pendingOrders: pendingOrders.length,
        receivedOrders: receivedOrders.length,
        totalOrders: orders.length,
        activeLicense
      });

      setRecentOrders(orders.slice(0, 5));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReceiveOrder = async (orderId) => {
    try {
      await api.patch(`/distributions/${orderId}/receive`);
      toast.success('Order marked as received successfully');
      fetchDashboardData();
      setConfirmReceiveOpen(false);
      setSelectedOrderId(null);
    } catch (error) {
      console.error('Error receiving order:', error);
      toast.error(error.response?.data?.message || 'Failed to receive order');
    }
  };

  const openReceiveConfirm = (orderId) => {
    setSelectedOrderId(orderId);
    setConfirmReceiveOpen(true);
  };



  const quickActions = [
  { label: 'View All Orders', href: '/retail/incoming-orders', color: 'bg-primary-50 text-primary-700 border-primary-100', icon: Package },
  { label: 'My License', href: '/retail/my-license', color: 'bg-success-50 text-success-700 border-success-100', icon: FileText },
  { label: 'Apply New License', href: '/retail/apply-license', color: 'bg-indigo-50 text-indigo-700 border-indigo-100', icon: FileText }];


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
      <PageHeader
        title="Dashboard"
        description="Welcome to your retail management dashboard"
        actions={
        <Button variant="outline" onClick={fetchDashboardData}>
            Refresh
          </Button>
        } />
      

       <div className="border border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Overview</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {loading ?
            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />) :

            <>
                  <StatCard
                title="Pending Orders"
                value={stats.pendingOrders}
                color="warning"
                icon={<Package className="w-5 h-5" />} />
              
                  <StatCard
                title="Received Orders"
                value={stats.receivedOrders}
                color="success"
                icon={<CheckCircle className="w-5 h-5" />} />
              
                  <StatCard
                title="Total Orders"
                value={stats.totalOrders}
                color="info"
                icon={<Truck className="w-5 h-5" />} />
              
                  <StatCard
                title="Active License"
                value={stats.activeLicense ? 'Active' : 'None'}
                color={stats.activeLicense ? 'success' : 'danger'}
                icon={<FileText className="w-5 h-5" />} />
              
                </>

            }
          </div>
        </div>
      </div>

       <div className="border border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Quick Actions</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 border border-gray-200 bg-white">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Recent Orders</h3>
            <Link to="/retail/incoming-orders" className="text-xs font-medium text-primary-600 hover:text-primary-700">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {loading ?
            Array.from({ length: 4 }).map((_, i) =>
            <div key={i} className="flex items-center gap-3 p-4 animate-pulse">
                  <div className="w-9 h-9 bg-gray-100 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-gray-100 w-36" />
                    <div className="h-3 bg-gray-100 w-24" />
                  </div>
                  <div className="h-5 bg-gray-100 w-16" />
                </div>
            ) :
            recentOrders.length > 0 ?
            recentOrders.map((order) =>
            <div key={order.id} className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors group">
                  <div className="w-9 h-9 border border-primary-200 bg-primary-50 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary-700">
                      {order.orderNo?.charAt(0)?.toUpperCase() || 'O'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{order.orderNo || 'Unknown'}</p>
                    <p className="text-xs text-gray-500">{order.product?.name || '-'} · {formatDate(order.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={getStatusColor(order.status)} size="sm">{order.status}</Badge>
                    {(order.status === 'PENDING' || order.status === 'DISPATCHED') &&
                <Button size="sm" variant="success" onClick={() => openReceiveConfirm(order.id)}>
                        Accept
                      </Button>
                }
                  </div>
                </div>
            ) :

            <div className="p-6 text-center text-sm text-gray-400">No orders yet</div>
            }
          </div>
        </div>

        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="border border-gray-200 bg-white flex-1">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">License Status</h3>
              <Link to="/retail/my-license" className="text-xs font-medium text-primary-600 hover:text-primary-700">
                Details →
              </Link>
            </div>
            <div className="p-6">
                {stats.activeLicense ?
              <div className="space-y-3">
                    <div className="p-4 bg-success-50 border border-success-100">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="text-success-600" size={20} />
                        <span className="font-medium text-success-900">Active License</span>
                      </div>
                      <p className="text-sm text-success-800">{stats.activeLicense.licenseNumber}</p>
                      <p className="text-sm text-success-700 mt-1">Type: {stats.activeLicense.type}</p>
                      {stats.activeLicense.effectiveTo &&
                  <p className="text-sm text-success-700 mt-1">
                          Valid until: {formatDate(stats.activeLicense.effectiveTo)}
                        </p>
                  }
                    </div>
                  </div> :

              <div className="p-4 bg-warning-50 border border-warning-100">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="text-warning-600" size={20} />
                      <span className="font-medium text-warning-900">No Active License</span>
                    </div>
                    <p className="text-sm text-warning-800">
                      You need an active license to receive products. Contact administrator.
                    </p>
                  </div>
              }
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={confirmReceiveOpen}
        onClose={() => {
          setConfirmReceiveOpen(false);
          setSelectedOrderId(null);
        }}
        title="Confirm Order Receipt"
        size="md">
        
        <p className="text-sm text-gray-600 mb-4">Are you sure you want to mark this order as received?</p>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => {
              setConfirmReceiveOpen(false);
              setSelectedOrderId(null);
            }}>
            
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1"
            onClick={() => {
              if (selectedOrderId) handleReceiveOrder(selectedOrderId);
            }}>
            
            Confirm
          </Button>
        </div>
      </Modal>
    </div>);

};

export default Dashboard;