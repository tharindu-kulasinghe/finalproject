import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import PageHeader from '../../../components/common/PageHeader';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import SelectDropdown from '../../../components/common/SelectDropdown';
import Textarea from '../../../components/common/Textarea';
import Badge from '../../../components/common/Badge';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import stampApi from '../../../services/stampApi';
import getStatusColor from '../../../utils/getStatusColor';
import { formatNumber } from '../../../utils/formatCurrency';
import { canIssueRequest, canReviewRequest, manufacturerLabel, reviewerLabel } from './stampRequestUtils';

const StampRequestEditPage = ({ basePath, title }) => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const [reviewData, setReviewData] = useState({
    status: 'APPROVED',
    quantityApproved: '',
    reason: ''
  });

  const [issueData, setIssueData] = useState({
    quantityIssued: ''
  });

  const fetchRequest = useCallback(async () => {
    setLoading(true);
    try {
      const response = await stampApi.getStampRequestById(id);
      const data = response.data?.data || null;
      setRequest(data);
      setReviewData({
        status: 'APPROVED',
        quantityApproved: data?.quantityApproved ? String(data.quantityApproved) : String(data?.quantityRequested || ''),
        reason: ''
      });
      setIssueData({
        quantityIssued: data?.quantityApproved ? String(data.quantityApproved) : String(data?.quantityRequested || '')
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load stamp request');
      setRequest(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);

  const validateReview = () => {
    const nextErrors = {};

    if (!reviewData.status) {
      nextErrors.status = 'Please select a status';
    }

    if (reviewData.status === 'APPROVED') {
      const qty = Number(reviewData.quantityApproved);
      if (!Number.isInteger(qty) || qty <= 0) {
        nextErrors.quantityApproved = 'Approved quantity must be a positive integer';
      }
      if (request && qty > request.quantityRequested) {
        nextErrors.quantityApproved = 'Approved quantity cannot exceed requested quantity';
      }
    }

    if ((reviewData.status === 'REJECTED' || reviewData.status === 'RETURNED') && !reviewData.reason.trim()) {
      nextErrors.reason = `${reviewData.status === 'REJECTED' ? 'Rejection' : 'Return'} reason is required`;
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateIssue = () => {
    const nextErrors = {};
    const qty = Number(issueData.quantityIssued);
    const max = Number(request?.quantityApproved || 0);

    if (!Number.isInteger(qty) || qty <= 0) {
      nextErrors.quantityIssued = 'Issued quantity must be a positive integer';
    }

    if (qty > max) {
      nextErrors.quantityIssued = 'Issued quantity cannot exceed approved quantity';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmitReview = async () => {
    if (!request || !canReviewRequest(request.status)) return;
    if (!validateReview()) return;

    setSaving(true);
    try {
      const payload = {
        status: reviewData.status
      };

      if (reviewData.status === 'APPROVED') {
        payload.quantityApproved = Number(reviewData.quantityApproved);
      }

      if (reviewData.status === 'REJECTED' || reviewData.status === 'RETURNED') {
        payload.reason = reviewData.reason.trim();
      }

      await stampApi.reviewStampRequest(request.id, payload);
      toast.success('Stamp request updated successfully');
      navigate(`${basePath}/${request.id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update stamp request');
    } finally {
      setSaving(false);
    }
  };

  const handleIssueStamps = async () => {
    if (!request || !canIssueRequest(request.status)) return;
    if (!validateIssue()) return;

    setSaving(true);
    try {
      await stampApi.issueStamps(request.id, Number(issueData.quantityIssued));
      toast.success('Stamps issued successfully');
      navigate(`${basePath}/${request.id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to issue stamps');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <LoadingSpinner />
      </div>);

  }

  if (!request) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <p className="text-gray-500">Stamp request not found</p>
        <Link to={basePath}>
          <Button variant="outline">Back to Stamp Requests</Button>
        </Link>
      </div>);

  }

  const reviewable = canReviewRequest(request.status);
  const issuable = canIssueRequest(request.status);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${title} ${request.requestNo || ''}`}
        description="Verify stamp request by admin or excise officer"
        actions={
        <Link to={`${basePath}/${request.id}`}>
            <Button variant="outline">Back to Details</Button>
          </Link>
        } />
      

      <div className="border border-gray-200 bg-white p-6 space-y-5">
        <h3 className="text-lg font-semibold text-gray-900">Stamp Request Snapshot</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Request No</p>
            <p className="font-medium font-mono text-gray-900">{request.requestNo || '-'}</p>
          </div>
          <div>
            <p className="text-gray-500">Status</p>
            <Badge variant={getStatusColor(request.status)}>{request.status}</Badge>
          </div>
          <div>
            <p className="text-gray-500">Manufacturer</p>
            <p className="font-medium text-gray-900">{manufacturerLabel(request)}</p>
          </div>
          <div>
            <p className="text-gray-500">Verified By</p>
            <p className="font-medium text-gray-900">{reviewerLabel(request)}</p>
          </div>
          <div>
            <p className="text-gray-500">Requested Qty</p>
            <p className="font-medium text-gray-900">{formatNumber(request.quantityRequested || 0)}</p>
          </div>
          <div>
            <p className="text-gray-500">Approved Qty</p>
            <p className="font-medium text-gray-900">{request.quantityApproved ? formatNumber(request.quantityApproved) : '-'}</p>
          </div>
        </div>
      </div>

      {reviewable &&
      <div className="border border-gray-200 bg-white p-6 space-y-5">
          <h3 className="text-lg font-semibold text-gray-900">Verification Decision</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectDropdown
            label="Review Status"
            value={reviewData.status}
            onChange={(e) => setReviewData((prev) => ({ ...prev, status: e.target.value }))}
            options={[
            { value: 'APPROVED', label: 'Approve' },
            { value: 'REJECTED', label: 'Reject' },
            { value: 'RETURNED', label: 'Return' }]
            }
            error={errors.status} />
          

            <Input
            label="Approved Quantity"
            type="number"
            min="1"
            value={reviewData.quantityApproved}
            onChange={(e) => setReviewData((prev) => ({ ...prev, quantityApproved: e.target.value }))}
            error={errors.quantityApproved}
            disabled={reviewData.status !== 'APPROVED'} />
          
          </div>

          <Textarea
          label="Reason"
          value={reviewData.reason}
          onChange={(e) => setReviewData((prev) => ({ ...prev, reason: e.target.value }))}
          rows={4}
          error={errors.reason}
          placeholder="Required for Reject and Return decisions" />
        

          <div className="flex justify-end">
            <Button loading={saving} onClick={handleSubmitReview}>Save Verification Decision</Button>
          </div>
        </div>
      }

      {issuable &&
      <div className="border border-gray-200 bg-white p-6 space-y-5">
          <h3 className="text-lg font-semibold text-gray-900">Issue Stamps</h3>
          <Input
          label="Quantity To Issue"
          type="number"
          min="1"
          value={issueData.quantityIssued}
          onChange={(e) => setIssueData({ quantityIssued: e.target.value })}
          error={errors.quantityIssued} />
        
          <div className="flex justify-end">
            <Button loading={saving} onClick={handleIssueStamps}>Issue Stamps</Button>
          </div>
        </div>
      }

      {!reviewable && !issuable &&
      <div className="border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-700">This request is finalized and cannot be edited further.</p>
        </div>
      }
    </div>);

};

export default StampRequestEditPage;