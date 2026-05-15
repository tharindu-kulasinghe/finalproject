import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import PageHeader from '../../../components/common/PageHeader';
import Badge from '../../../components/common/Badge';
import Button from '../../../components/common/Button';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import stampApi from '../../../services/stampApi';
import getStatusColor from '../../../utils/getStatusColor';
import { formatDate } from '../../../utils/formatDate';
import { formatNumber } from '../../../utils/formatCurrency';

const StampRequestDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [stampRequest, setStampRequest] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStampRequest = useCallback(async () => {
    setLoading(true);
    try {
      const response = await stampApi.getStampRequestById(id);
      const requestData = response.data?.data?.request || response.data?.data?.stampRequest || response.data?.data || null;
      setStampRequest(requestData);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load stamp request details');
      setStampRequest(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchStampRequest();
  }, [fetchStampRequest]);

  const statusTone = useMemo(() => getStatusColor(stampRequest?.status), [stampRequest?.status]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <LoadingSpinner text="Loading stamp request details..." />
      </div>);

  }

  if (!stampRequest) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <p className="text-gray-500">Stamp request not found</p>
        <Link to="/manufacturer/stamp-requests">
          <Button variant="outline">Back to Stamp Requests</Button>
        </Link>
      </div>);

  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={stampRequest.requestNo || 'Stamp Request Details'}
        description="Review request status, quantities and allocation context"
        actions={
        <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate('/manufacturer/stamp-requests')}>Back</Button>
          </div>
        } />
      

      <div className="text-sm text-gray-500">
        <Link to="/manufacturer/stamp-requests" className="hover:text-gray-700">Stamp Requests</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">Details</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">1. Request Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Request Number</p>
                <p className="font-medium text-gray-900 font-mono">{stampRequest.requestNo || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Status</p>
                <Badge variant={statusTone}>{stampRequest.status || '-'}</Badge>
              </div>
              <div>
                <p className="text-gray-500">Requested On</p>
                <p className="font-medium text-gray-900">{formatDate(stampRequest.requestedAt || stampRequest.createdAt)}</p>
              </div>
              <div>
                <p className="text-gray-500">Reviewed On</p>
                <p className="font-medium text-gray-900">{formatDate(stampRequest.reviewedAt)}</p>
              </div>
              <div>
                <p className="text-gray-500">Issued On</p>
                <p className="font-medium text-gray-900">{formatDate(stampRequest.issuedAt)}</p>
              </div>
              <div>
                <p className="text-gray-500">Last Updated</p>
                <p className="font-medium text-gray-900">{formatDate(stampRequest.updatedAt)}</p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">2. Product & Batch</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Product</p>
                <p className="font-medium text-gray-900">{stampRequest.product?.name || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Product Code</p>
                <p className="font-medium text-gray-900">{stampRequest.product?.code || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Batch No</p>
                <p className="font-medium text-gray-900 font-mono">{stampRequest.batch?.batchNo || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">License Number</p>
                <p className="font-medium text-gray-900">{stampRequest.license?.licenseNumber || '-'}</p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">3. Quantity Allocation</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Requested</p>
                <p className="font-semibold text-gray-900">{formatNumber(stampRequest.quantityRequested)}</p>
              </div>
              <div>
                <p className="text-gray-500">Approved</p>
                <p className="font-semibold text-gray-900">{stampRequest.quantityApproved != null ? formatNumber(stampRequest.quantityApproved) : '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Issued</p>
                <p className="font-semibold text-gray-900">{stampRequest.quantityIssued != null ? formatNumber(stampRequest.quantityIssued) : '-'}</p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">4. Remarks</h3>
            <p className="text-sm text-gray-900 whitespace-pre-wrap">{stampRequest.reason || stampRequest.remarks || '-'}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <Badge variant={statusTone}>{stampRequest.status || '-'}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Requested</span>
                <span className="font-medium text-gray-900">{formatNumber(stampRequest.quantityRequested)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Approved</span>
                <span className="font-medium text-gray-900">{stampRequest.quantityApproved != null ? formatNumber(stampRequest.quantityApproved) : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Issued</span>
                <span className="font-medium text-gray-900">{stampRequest.quantityIssued != null ? formatNumber(stampRequest.quantityIssued) : '-'}</span>
              </div>
            </div>
          </div>

          {stampRequest.status === 'REJECTED' &&
          <div className="border border-red-200 bg-red-50 p-5">
              <h4 className="text-sm font-semibold text-red-900 mb-2">Request Rejected</h4>
              <p className="text-sm text-red-800 whitespace-pre-wrap">{stampRequest.reason || stampRequest.remarks || 'No rejection reason provided.'}</p>
            </div>
          }
        </div>
      </div>
    </div>);

};

export default StampRequestDetails;