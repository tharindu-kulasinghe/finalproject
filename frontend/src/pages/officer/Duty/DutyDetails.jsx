import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import PageHeader from '../../../components/common/PageHeader';
import Badge from '../../../components/common/Badge';
import Button from '../../../components/common/Button';
import Modal from '../../../components/common/Modal';
import Textarea from '../../../components/common/Textarea';
import Table from '../../../components/common/Table';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import getStatusColor from '../../../utils/getStatusColor';
import { formatCurrency, formatNumber } from '../../../utils/formatCurrency';
import { formatDate, formatDateTime } from '../../../utils/formatDate';
import dutyApi from '../../../services/dutyApi';

const isOverdueDuty = (duty) => {
  if (!duty?.dueDate) return false;
  if (['PAID', 'WAIVED', 'CANCELLED'].includes(duty.status)) return false;

  const dueDate = new Date(duty.dueDate);
  if (Number.isNaN(dueDate.getTime())) return false;

  return dueDate < new Date();
};

const getDisplayStatus = (duty) => isOverdueDuty(duty) ? 'OVERDUE' : duty.status;

const OfficerDutyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [duty, setDuty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusAction, setStatusAction] = useState(null);
  const [remarks, setRemarks] = useState('');

  const fetchDuty = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dutyApi.getDutyById(id);
      setDuty(res.data?.data || null);
    } catch (err) {
      console.error('Failed to load duty details:', err);
      toast.error(err.response?.data?.message || 'Failed to load duty details');
      setDuty(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDuty();
  }, [fetchDuty]);

  const canUpdateStatus = duty && !['PAID', 'WAIVED', 'CANCELLED'].includes(duty.status);

  const openStatusModal = (action) => {
    setStatusAction(action);
    setRemarks('');
  };

  const handleStatusUpdate = async () => {
    if (!duty || !statusAction) return;

    setActionLoading(true);
    try {
      const nextStatus = statusAction === 'waive' ? 'WAIVED' : 'CANCELLED';
      await dutyApi.updateDutyStatus(duty.id, nextStatus, remarks);
      toast.success(`Duty marked as ${nextStatus}`);
      setStatusAction(null);
      setRemarks('');
      fetchDuty();
    } catch (err) {
      console.error('Failed to update duty status:', err);
      toast.error(err.response?.data?.message || 'Failed to update duty status');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <LoadingSpinner text="Loading duty details..." />
      </div>);

  }

  if (!duty) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <p className="text-gray-500">Duty assessment not found</p>
        <Link to="/officer/duties">
          <Button variant="outline">Back to Duties</Button>
        </Link>
      </div>);

  }

  const paymentColumns = [
  { key: 'paymentRef', header: 'Payment Ref', render: (row) => row.payment?.paymentRef || '-' },
  { key: 'status', header: 'Status', render: (row) => <Badge variant={getStatusColor(row.payment?.status || '')}>{row.payment?.status || '-'}</Badge> },
  { key: 'amount', header: 'Allocated Amount', render: (row) => formatCurrency(row.amountAllocated) },
  { key: 'verifiedAmount', header: 'Verified Amount', render: (row) => formatCurrency(row.payment?.verifiedAmount) },
  { key: 'verifiedAt', header: 'Verified At', render: (row) => formatDateTime(row.payment?.verifiedAt) }];


  return (
    <div className="space-y-6">
      <PageHeader
        title={`Duty ${duty.assessmentNo}`}
        description="Duty assessment details for daily production and payment processing"
        actions={
        <div className="flex flex-wrap gap-2">
            {canUpdateStatus &&
          <Button variant="outline" onClick={() => openStatusModal('waive')}>
                Waive Duty
              </Button>
          }
            {canUpdateStatus &&
          <Button variant="danger" onClick={() => openStatusModal('cancel')}>
                Cancel Duty
              </Button>
          }
            <Button variant="outline" onClick={() => navigate('/officer/duties')}>
              Back
            </Button>
          </div>
        } />
      

      <div className="text-sm text-gray-500">
        <Link to="/officer/duties" className="hover:text-gray-700">Duties</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">Details</span>
      </div>

      <div className="border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">1. Duty Assessment</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Assessment No</p>
            <p className="font-medium text-gray-900 font-mono">{duty.assessmentNo}</p>
          </div>
          <div>
            <p className="text-gray-500">Status</p>
            <Badge variant={getStatusColor(getDisplayStatus(duty))}>{getDisplayStatus(duty)}</Badge>
          </div>
          <div>
            <p className="text-gray-500">Assessed Amount</p>
            <p className="font-medium text-gray-900">{formatCurrency(duty.assessedAmount)}</p>
          </div>
          <div>
            <p className="text-gray-500">Paid Amount</p>
            <p className="font-medium text-gray-900">{formatCurrency(duty.paidAmount || 0)}</p>
          </div>
          <div>
            <p className="text-gray-500">Balance</p>
            <p className="font-medium text-gray-900">{formatCurrency(duty.balanceAmount)}</p>
          </div>
          <div>
            <p className="text-gray-500">Due Date</p>
            <p className={isOverdueDuty(duty) ? 'font-medium text-red-600' : 'font-medium text-gray-900'}>{formatDate(duty.dueDate)}</p>
          </div>
          <div>
            <p className="text-gray-500">Calculated At</p>
            <p className="font-medium text-gray-900">{formatDateTime(duty.calculatedAt)}</p>
          </div>
          <div>
            <p className="text-gray-500">Calculated By</p>
            <p className="font-medium text-gray-900">{duty.calculatedBy?.fullName || '-'}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-gray-500">Remarks</p>
            <p className="font-medium text-gray-900 whitespace-pre-wrap">{duty.remarks || '-'}</p>
          </div>
        </div>
      </div>

      <div className="border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">2. Linked Production Batch</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Batch No</p>
            <p className="font-medium text-gray-900">{duty.batch?.batchNo || '-'}</p>
          </div>
          <div>
            <p className="text-gray-500">Production Date</p>
            <p className="font-medium text-gray-900">{formatDate(duty.batch?.productionDate)}</p>
          </div>
          <div>
            <p className="text-gray-500">Product</p>
            <p className="font-medium text-gray-900">{duty.batch?.product?.name || '-'}</p>
          </div>
          <div>
            <p className="text-gray-500">Category</p>
            <p className="font-medium text-gray-900">{duty.batch?.product?.category || '-'}</p>
          </div>
          <div>
            <p className="text-gray-500">Output (L)</p>
            <p className="font-medium text-gray-900">{formatNumber(duty.batch?.outputLiters)}</p>
          </div>
          <div>
            <p className="text-gray-500">License</p>
            <p className="font-medium text-gray-900">{duty.license?.licenseNumber || '-'}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-gray-500">Manufacturer</p>
            <p className="font-medium text-gray-900">{duty.license?.companyName || '-'}</p>
          </div>
        </div>
      </div>

      <div className="border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">3. Payment Allocations</h3>
        <Table
          columns={paymentColumns}
          data={duty.paymentAllocations || []}
          emptyMessage="No payments allocated to this duty yet" />
        
      </div>

      <Modal
        isOpen={!!statusAction}
        onClose={() => {
          setStatusAction(null);
          setRemarks('');
        }}
        title={statusAction === 'waive' ? 'Waive Duty' : 'Cancel Duty'}
        size="md">
        
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Assessment: <span className="font-medium text-gray-900">{duty.assessmentNo}</span>
          </p>
          <Textarea
            label="Remarks"
            rows={4}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder={statusAction === 'waive' ? 'Reason for waiver' : 'Reason for cancellation'} />
          
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                setStatusAction(null);
                setRemarks('');
              }}>
              
              Close
            </Button>
            <Button
              type="button"
              className="flex-1"
              variant={statusAction === 'cancel' ? 'danger' : 'primary'}
              loading={actionLoading}
              onClick={handleStatusUpdate}>
              
              {statusAction === 'waive' ? 'Waive' : 'Cancel'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>);

};

export default OfficerDutyDetails;