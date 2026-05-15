import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Package, User } from 'lucide-react';
import PageHeader from '../../../components/common/PageHeader';
import Badge from '../../../components/common/Badge';
import Button from '../../../components/common/Button';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import getStatusColor from '../../../utils/getStatusColor';
import api from '../../../services/api';

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

const ManufacturerDistributionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [distribution, setDistribution] = useState(null);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [confirmAction, setConfirmAction] = useState({ open: false, type: null, nextStatus: null });

  const fetchDistribution = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/distributions/${id}`);
      setDistribution(response.data?.data || null);
      setError('');
    } catch (fetchError) {
      console.error('Failed to fetch distribution:', fetchError);
      setDistribution(null);
      setError('Failed to load distribution details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        setUser(null);
      }
    }

    fetchDistribution();
  }, [fetchDistribution]);

  const getBackUrl = () => {
    const path = location.pathname;
    if (path.includes('/manufacturer/distributions/')) return '/manufacturer/distributions';
    if (path.includes('/distributor/distribution-history/')) return '/distributor/distribution-history';
    if (path.includes('/distributor/incoming-orders/')) return '/distributor/incoming-orders';
    if (path.includes('/retail/incoming-orders/')) return '/retail/incoming-orders';
    return '/';
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/manufacturer/distributions/')) return 'Distribution Order Details';
    if (path.includes('/distributor/distribution-history/')) return 'Outgoing Distribution Details';
    if (path.includes('/distributor/incoming-orders/')) return 'Incoming Order Details';
    if (path.includes('/retail/incoming-orders/')) return 'Incoming Order Details';
    return 'Distribution Details';
  };

  const canDispatch = useMemo(() => {
    if (!distribution || !user) return false;
    return distribution.status === 'PENDING' && distribution.senderId === user.id && user.role === 'MANUFACTURER';
  }, [distribution, user]);

  const canReceive = useMemo(() => {
    if (!distribution || !user) return false;
    return distribution.status === 'DISPATCHED' && distribution.receiverId === user.id && ['DISTRIBUTOR', 'RETAILER'].includes(user.role);
  }, [distribution, user]);

  const canCancel = useMemo(() => {
    if (!distribution || !user) return false;
    const isSender = distribution.senderId === user.id;
    const isReceiver = distribution.receiverId === user.id;
    const isAdmin = ['ADMIN', 'ED_OFFICER'].includes(user.role);

    if (distribution.status === 'PENDING') return isSender || isAdmin;
    if (distribution.status === 'DISPATCHED') return isSender || isReceiver || isAdmin;
    return false;
  }, [distribution, user]);

  const handleDispatch = async () => {
    try {
      await api.patch(`/distributions/${id}/dispatch`);
      toast.success('Order dispatched successfully');
      setConfirmAction({ open: false, type: null, nextStatus: null });
      fetchDistribution();
    } catch (dispatchError) {
      console.error('Failed to dispatch order:', dispatchError);
      toast.error(dispatchError.response?.data?.message || 'Failed to dispatch order');
    }
  };

  const handleReceive = async () => {
    try {
      await api.patch(`/distributions/${id}/receive`);
      toast.success('Order marked as received successfully');
      setConfirmAction({ open: false, type: null, nextStatus: null });
      fetchDistribution();
    } catch (receiveError) {
      console.error('Failed to receive order:', receiveError);
      toast.error(receiveError.response?.data?.message || 'Failed to receive order');
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      await api.patch(`/distributions/${id}/status`, { status: newStatus });
      toast.success('Status updated successfully');
      setConfirmAction({ open: false, type: null, nextStatus: null });
      fetchDistribution();
    } catch (statusError) {
      console.error('Failed to update order status:', statusError);
      toast.error(statusError.response?.data?.message || 'Failed to update status');
    }
  };

  const openConfirmAction = (type, nextStatus = null) => {
    setConfirmAction({ open: true, type, nextStatus });
  };

  const executeConfirmedAction = () => {
    if (confirmAction.type === 'dispatch') return handleDispatch();
    if (confirmAction.type === 'receive') return handleReceive();
    if (confirmAction.type === 'status' && confirmAction.nextStatus) return handleUpdateStatus(confirmAction.nextStatus);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <LoadingSpinner />
      </div>);

  }

  if (error || !distribution) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <p className="text-gray-500">{error || 'Distribution order not found'}</p>
        <Button variant="outline" onClick={() => navigate(getBackUrl())}>Back</Button>
      </div>);

  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={getPageTitle()}
        description={`Order ${distribution.orderNo}`}
        actions={
        <div className="flex flex-wrap gap-2">
            {user?.role === 'MANUFACTURER' && distribution.receiver?.role === 'DISTRIBUTOR' &&
          <Button variant="outline" onClick={() => navigate(`/manufacturer/distributors/${distribution.receiver.id}`)}>
                <User size={16} className="mr-2" />
                View Distributor
              </Button>
          }
            {user?.role === 'MANUFACTURER' &&
          <Button variant="outline" onClick={() => navigate('/manufacturer/distributions/add')}>
                <Package size={16} className="mr-2" />
                Add Distribution
              </Button>
          }
            <Button variant="outline" onClick={() => navigate(getBackUrl())}>Back</Button>
          </div>
        } />
      

      <div className="text-sm text-gray-500">
        <Link to={getBackUrl()} className="hover:text-gray-700">Distribution Orders</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">Details</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">1. Order Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Order Number</p>
                <p className="font-medium text-gray-900">{distribution.orderNo}</p>
              </div>
              <div>
                <p className="text-gray-500">Status</p>
                <Badge variant={getStatusColor(distribution.status)}>{distribution.status}</Badge>
              </div>
              <div>
                <p className="text-gray-500">Created At</p>
                <p className="font-medium text-gray-900">{formatDateTime(distribution.createdAt)}</p>
              </div>
              <div>
                <p className="text-gray-500">Dispatched At</p>
                <p className="font-medium text-gray-900">{formatDateTime(distribution.dispatchedAt)}</p>
              </div>
              <div>
                <p className="text-gray-500">Received At</p>
                <p className="font-medium text-gray-900">{formatDateTime(distribution.receivedAt)}</p>
              </div>
              <div>
                <p className="text-gray-500">Quantity</p>
                <p className="font-medium text-gray-900">{distribution.quantity} {distribution.unit}</p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">2. Parties</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Sender</p>
                <p className="font-medium text-gray-900">{distribution.sender?.companyName || distribution.sender?.fullName || '-'}</p>
                <p className="text-gray-600">{distribution.sender?.email || '-'}</p>
                <p className="text-gray-600 mt-1">License: {distribution.senderLicense?.licenseNumber || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Receiver</p>
                <p className="font-medium text-gray-900">{distribution.receiver?.companyName || distribution.receiver?.fullName || '-'}</p>
                <p className="text-gray-600">{distribution.receiver?.email || '-'}</p>
                <p className="text-gray-600 mt-1">Role: {distribution.receiver?.role || '-'}</p>
                <p className="text-gray-600">License: {distribution.receiverLicense?.licenseNumber || '-'}</p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">3. Product and Batch</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Product Name</p>
                <p className="font-medium text-gray-900">{distribution.product?.name || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Product Code</p>
                <p className="font-medium text-gray-900">{distribution.product?.code || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Category</p>
                <p className="font-medium text-gray-900">{distribution.product?.category || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Batch Number</p>
                <p className="font-medium text-gray-900">{distribution.batch?.batchNo || '-'}</p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">4. Notes</h3>
            <p className="text-sm text-gray-900 whitespace-pre-wrap">{distribution.notes || '-'}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Order</span>
                <span className="font-medium text-gray-900">{distribution.orderNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <Badge variant={getStatusColor(distribution.status)}>{distribution.status}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Receiver Role</span>
                <span className="font-medium text-gray-900">{distribution.receiver?.role || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Batch</span>
                <span className="font-medium text-gray-900">{distribution.batch?.batchNo || '-'}</span>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
            <div className="space-y-3">
              {canDispatch &&
              <Button className="w-full" onClick={() => openConfirmAction('dispatch')}>
                  Dispatch Order
                </Button>
              }
              {canReceive &&
              <Button className="w-full" variant="success" onClick={() => openConfirmAction('receive')}>
                  Mark as Received
                </Button>
              }
              {canCancel &&
              <Button className="w-full" variant="danger" onClick={() => openConfirmAction('status', 'CANCELLED')}>
                  Cancel Order
                </Button>
              }
              {user?.role === 'DISTRIBUTOR' && distribution.receiverId === user.id && distribution.status === 'RECEIVED' &&
              <Button className="w-full" variant="outline" onClick={() => navigate(`/distributor/create-distribution?clone=${distribution.id}`)}>
                  Redistribute
                </Button>
              }
            </div>
          </div>

          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Status History</h3>
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-medium text-gray-900">Order Created</p>
                <p className="text-gray-600">{formatDateTime(distribution.createdAt)}</p>
              </div>
              {distribution.dispatchedAt &&
              <div>
                  <p className="font-medium text-gray-900">Order Dispatched</p>
                  <p className="text-gray-600">{formatDateTime(distribution.dispatchedAt)}</p>
                </div>
              }
              {distribution.receivedAt &&
              <div>
                  <p className="font-medium text-gray-900">Order Received</p>
                  <p className="text-gray-600">{formatDateTime(distribution.receivedAt)}</p>
                </div>
              }
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmAction.open}
        onClose={() => setConfirmAction({ open: false, type: null, nextStatus: null })}
        onConfirm={executeConfirmedAction}
        title={
        confirmAction.type === 'dispatch' ?
        'Dispatch Order' :
        confirmAction.type === 'receive' ?
        'Mark as Received' :
        'Update Status'
        }
        message={
        confirmAction.type === 'dispatch' ?
        'Are you sure you want to dispatch this order?' :
        confirmAction.type === 'receive' ?
        'Are you sure you want to mark this order as received?' :
        `Are you sure you want to update status to ${confirmAction.nextStatus || 'the selected value'}?`
        }
        confirmText={
        confirmAction.type === 'dispatch' ?
        'Dispatch' :
        confirmAction.type === 'receive' ?
        'Confirm' :
        'Update'
        }
        variant={confirmAction.type === 'status' ? 'warning' : 'info'} />
      
    </div>);

};

export default ManufacturerDistributionDetail;