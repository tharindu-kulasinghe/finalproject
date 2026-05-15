import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import PageHeader from '../../../components/common/PageHeader';
import Badge from '../../../components/common/Badge';
import Button from '../../../components/common/Button';
import Modal from '../../../components/common/Modal';
import Textarea from '../../../components/common/Textarea';
import Table from '../../../components/common/Table';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import getStatusColor from '../../../utils/getStatusColor';
import { formatDate, formatDateTime } from '../../../utils/formatDate';
import { formatNumber } from '../../../utils/formatCurrency';
import batchApi from '../../../services/batchApi';

const OfficerBatchDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [reviewAction, setReviewAction] = useState(null);
  const [remarks, setRemarks] = useState('');

  const fetchBatch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await batchApi.getBatchById(id);
      setBatch(res.data?.data || null);
    } catch (err) {
      console.error('Failed to load batch details:', err);
      toast.error(err.response?.data?.message || 'Failed to load batch details');
      setBatch(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBatch();
  }, [fetchBatch]);

  const openReviewModal = (action) => {
    setReviewAction(action);
    setRemarks('');
  };

  const handleReview = async () => {
    if (!batch || !reviewAction) return;
    setActionLoading(true);
    try {
      if (reviewAction === 'verify') {
        await batchApi.verifyBatch(batch.id, remarks);
      } else {
        await batchApi.rejectBatch(batch.id, remarks);
      }
      toast.success(`Batch ${reviewAction === 'verify' ? 'verified' : 'flagged'} successfully`);
      setReviewAction(null);
      setRemarks('');
      fetchBatch();
    } catch (err) {
      console.error('Failed to process batch review:', err);
      toast.error(err.response?.data?.message || 'Failed to process batch review');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <LoadingSpinner />
      </div>);

  }

  if (!batch) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <p className="text-gray-500">Batch not found</p>
        <Link to="/officer/batches">
          <Button variant="outline">Back to Batches</Button>
        </Link>
      </div>);

  }

  const assessmentColumns = [
  { key: 'assessmentNo', header: 'Assessment No' },
  { key: 'status', header: 'Status', render: (row) => <Badge variant={getStatusColor(row.status)}>{row.status}</Badge> },
  { key: 'assessedAmount', header: 'Assessed Amount', render: (row) => formatNumber(row.assessedAmount) },
  { key: 'paidAmount', header: 'Paid Amount', render: (row) => formatNumber(row.paidAmount) }];


  const stampColumns = [
  { key: 'serialNo', header: 'Serial No' },
  { key: 'codeValue', header: 'Code Value' },
  {
    key: 'status',
    header: 'Stamp Status',
    render: (row) => row.status && row.status !== '-' ? <Badge variant={getStatusColor(row.status)}>{row.status}</Badge> : '-'
  },
  { key: 'requestNo', header: 'Request No', render: (row) => row.requestNo || '-' },
  {
    key: 'requestStatus',
    header: 'Request Status',
    render: (row) => row.requestStatus ? <Badge variant={getStatusColor(row.requestStatus)}>{row.requestStatus}</Badge> : '-'
  },
  { key: 'assignedAt', header: 'Assigned', render: (row) => formatDateTime(row.assignedAt) }];


  const stampRequestColumns = [
  { key: 'requestNo', header: 'Request No' },
  { key: 'status', header: 'Status', render: (row) => <Badge variant={getStatusColor(row.status)}>{row.status}</Badge> },
  { key: 'quantityIssued', header: 'Qty Issued', render: (row) => row.quantityIssued != null ? formatNumber(row.quantityIssued) : '-' },
  { key: 'stampCount', header: 'Generated Stamps', render: (row) => formatNumber((row.taxStamps || []).length) },
  {
    key: 'actions',
    header: 'Actions',
    render: (row) =>
    <Button size="sm" variant="outline" onClick={() => navigate(`/officer/stamp-requests/${row.id}`)}>
          View
        </Button>

  }];


  const requestLinkedStamps = (batch.stampRequests || []).flatMap((request) =>
  (request.taxStamps || []).map((stamp) => ({
    ...stamp,
    requestNo: request.requestNo,
    requestStatus: request.status
  }))
  );

  const requestStatusOnlyRows = (batch.stampRequests || []).
  filter((request) => (request.taxStamps || []).length === 0).
  map((request) => ({
    id: `request-status-${request.id}`,
    serialNo: '-',
    codeValue: '-',
    status: '-',
    requestNo: request.requestNo,
    requestStatus: request.status,
    assignedAt: null
  }));

  const mergedStampMap = new Map();
  [...(batch.taxStamps || []), ...requestLinkedStamps, ...requestStatusOnlyRows].forEach((stamp) => {
    const stampKey = stamp?.id || `${stamp?.requestNo || 'no-request'}-${stamp?.serialNo || 'no-serial'}-${stamp?.codeValue || 'no-code'}`;
    if (!mergedStampMap.has(stampKey)) {
      mergedStampMap.set(stampKey, stamp);
      return;
    }

    const existingStamp = mergedStampMap.get(stampKey);
    mergedStampMap.set(stampKey, {
      ...existingStamp,
      ...stamp,
      requestNo: existingStamp.requestNo || stamp.requestNo,
      requestStatus: existingStamp.requestStatus || stamp.requestStatus
    });
  });

  const displayStamps = Array.from(mergedStampMap.values());

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Batch ${batch.batchNo}`}
        description="View production batch details, review notes, duty and stamp records"
        actions={
        <div className="flex flex-wrap gap-2">
            {batch.status === 'SUBMITTED' &&
          <Button onClick={() => openReviewModal('verify')}>
                Verify
              </Button>
          }
            {batch.status === 'SUBMITTED' &&
          <Button variant="danger" onClick={() => openReviewModal('reject')}>
                Reject
              </Button>
          }
            <Link to="/officer/batches">
              <Button variant="outline">Back</Button>
            </Link>
          </div>
        } />
      

      <div className="text-sm text-gray-500">
        <Link to="/officer/batches" className="hover:text-gray-700">Batches</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">Details</span>
      </div>

      <div className="border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Batch Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Batch Number</p>
            <p className="font-medium text-gray-900 font-mono">{batch.batchNo}</p>
          </div>
          <div>
            <p className="text-gray-500">Status</p>
            <Badge variant={getStatusColor(batch.status)}>{batch.status}</Badge>
          </div>
          <div>
            <p className="text-gray-500">Product</p>
            <p className="font-medium text-gray-900">{batch.product?.name || '-'}</p>
          </div>
          <div>
            <p className="text-gray-500">Category</p>
            <p className="font-medium text-gray-900">{batch.product?.category || '-'}</p>
          </div>
          <div>
            <p className="text-gray-500">Manufacturer</p>
            <p className="font-medium text-gray-900">{batch.license?.companyName || '-'}</p>
          </div>
          <div>
            <p className="text-gray-500">License</p>
            <p className="font-medium text-gray-900">{batch.license?.licenseNumber || '-'}</p>
          </div>
          <div>
            <p className="text-gray-500">Production Date</p>
            <p className="font-medium text-gray-900">{formatDate(batch.productionDate)}</p>
          </div>
          <div>
            <p className="text-gray-500">Created At</p>
            <p className="font-medium text-gray-900">{formatDateTime(batch.createdAt)}</p>
          </div>
          <div>
            <p className="text-gray-500">Raw Spirit Input (L)</p>
            <p className="font-medium text-gray-900">{formatNumber(batch.rawSpiritInputLiters)}</p>
          </div>
          <div>
            <p className="text-gray-500">Output (L)</p>
            <p className="font-medium text-gray-900">{formatNumber(batch.outputLiters)}</p>
          </div>
          <div>
            <p className="text-gray-500">Units Produced</p>
            <p className="font-medium text-gray-900">{formatNumber(batch.unitsProduced)}</p>
          </div>
          <div>
            <p className="text-gray-500">Wastage (L)</p>
            <p className="font-medium text-gray-900">{formatNumber(batch.wastageLiters)}</p>
          </div>
          <div>
            <p className="text-gray-500">Submitted At</p>
            <p className="font-medium text-gray-900">{formatDateTime(batch.submittedAt)}</p>
          </div>
          <div>
            <p className="text-gray-500">Verified At</p>
            <p className="font-medium text-gray-900">{formatDateTime(batch.verifiedAt)}</p>
          </div>
          <div>
            <p className="text-gray-500">Submitted By</p>
            <p className="font-medium text-gray-900">{batch.submittedBy?.fullName || '-'}</p>
          </div>
          <div>
            <p className="text-gray-500">Verified By</p>
            <p className="font-medium text-gray-900">{batch.verifiedBy?.fullName || '-'}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-gray-500">Notes</p>
            <p className="font-medium text-gray-900 whitespace-pre-wrap">{batch.notes || '-'}</p>
          </div>
        </div>
      </div>

      <div className="border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Duty Assessments</h3>
        <Table
          columns={assessmentColumns}
          data={batch.dutyAssessments || []}
          emptyMessage="No duty assessments for this batch" />
        
      </div>

      <div className="border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Stamp Requests (Batch)</h3>
        <Table
          columns={stampRequestColumns}
          data={batch.stampRequests || []}
          emptyMessage="No stamp requests found for this batch" />
        
      </div>

      <div className="border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Tax Stamps (Latest)</h3>
        <Table
          columns={stampColumns}
          data={displayStamps}
          emptyMessage="No tax stamps assigned for this batch yet" />
        
      </div>

      <Modal
        isOpen={!!reviewAction}
        onClose={() => {
          setReviewAction(null);
          setRemarks('');
        }}
        title={reviewAction === 'verify' ? 'Verify Batch' : 'Reject Batch'}
        size="md">
        
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Batch: <span className="font-medium text-gray-900">{batch.batchNo}</span>
          </p>
          <Textarea
            label="Remarks"
            rows={4}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder={reviewAction === 'verify' ? 'Optional verification notes' : 'Reason for rejection'} />
          
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                setReviewAction(null);
                setRemarks('');
              }}>
              
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1"
              variant={reviewAction === 'reject' ? 'danger' : 'primary'}
              loading={actionLoading}
              onClick={handleReview}>
              
              {reviewAction === 'verify' ? 'Verify' : 'Reject'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>);

};

export default OfficerBatchDetails;