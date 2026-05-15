import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import PageHeader from '../../../components/common/PageHeader';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Textarea from '../../../components/common/Textarea';
import Badge from '../../../components/common/Badge';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import paymentApi from '../../../services/paymentApi';
import getStatusColor from '../../../utils/getStatusColor';
import { formatCurrency } from '../../../utils/formatCurrency';
import { PaymentStatus } from '../../../constants/statusConstants';
import { canReviewPayment, getPaymentCategory, methodLabel, sanitizeRemarks } from './paymentUtils';

const EditPayment = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    verifiedAmount: '',
    remarks: '',
    rejectionReason: ''
  });

  const fetchPayment = useCallback(async () => {
    setLoading(true);
    try {
      const response = await paymentApi.getPaymentById(id);
      const data = response.data?.data || null;
      setPayment(data);
      setFormData({
        verifiedAmount: data?.declaredAmount ? String(data.declaredAmount) : '',
        remarks: data?.remarks ? sanitizeRemarks(data.remarks) : '',
        rejectionReason: data?.rejectionReason || ''
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load payment');
      setPayment(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPayment();
  }, [fetchPayment]);

  const validateForVerify = () => {
    const nextErrors = {};
    if (!formData.verifiedAmount || Number(formData.verifiedAmount) < 0) {
      nextErrors.verifiedAmount = 'Verified amount must be a valid number';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateForReject = () => {
    const nextErrors = {};
    if (!formData.rejectionReason.trim()) {
      nextErrors.rejectionReason = 'Rejection reason is required';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleVerify = async () => {
    if (!payment || !canReviewPayment(payment.status)) return;
    if (!validateForVerify()) return;

    setSaving(true);
    try {
      await paymentApi.verifyPayment(payment.id, {
        status: PaymentStatus.VERIFIED,
        verifiedAmount: Number(formData.verifiedAmount),
        remarks: formData.remarks || undefined
      });
      toast.success('Payment verified successfully');
      navigate(`/admin/payments/${payment.id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to verify payment');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!payment || !canReviewPayment(payment.status)) return;
    if (!validateForReject()) return;

    setSaving(true);
    try {
      await paymentApi.rejectPayment(payment.id, formData.rejectionReason.trim(), formData.remarks || undefined);
      toast.success('Payment rejected successfully');
      navigate(`/admin/payments/${payment.id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject payment');
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

  if (!payment) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <p className="text-gray-500">Payment not found</p>
        <Link to="/admin/payments">
          <Button variant="outline">Back to Payments</Button>
        </Link>
      </div>);

  }

  const reviewable = canReviewPayment(payment.status);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit Payment ${payment.paymentRef || ''}`}
        description="Review and finalize payment verification status"
        actions={
        <Link to={`/admin/payments/${payment.id}`}>
            <Button variant="outline">Back to Details</Button>
          </Link>
        } />
      

      {!reviewable &&
      <div className="border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm font-medium">
          This payment is already finalized and cannot be edited.
        </div>
      }

      <div className="border border-gray-200 bg-white p-6 space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">Payment Snapshot</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Reference</p>
            <p className="font-medium font-mono text-gray-900">{payment.paymentRef || '-'}</p>
          </div>
          <div>
            <p className="text-gray-500">Status</p>
            <Badge variant={getStatusColor(payment.status)}>{payment.status}</Badge>
          </div>
          <div>
            <p className="text-gray-500">Category</p>
            <p className="font-medium text-gray-900">{getPaymentCategory(payment) === 'DUTY' ? 'Duty Payment' : 'License Renewal'}</p>
          </div>
          <div>
            <p className="text-gray-500">Method</p>
            <p className="font-medium text-gray-900">{methodLabel(payment.method)}</p>
          </div>
          <div>
            <p className="text-gray-500">Declared Amount</p>
            <p className="font-medium text-gray-900">{formatCurrency(payment.declaredAmount || 0)}</p>
          </div>
          <div>
            <p className="text-gray-500">Current Verified Amount</p>
            <p className="font-medium text-gray-900">{payment.verifiedAmount ? formatCurrency(payment.verifiedAmount) : '-'}</p>
          </div>
        </div>
      </div>

      <div className="border border-gray-200 bg-white">
        <form className="p-6 space-y-5" onSubmit={(e) => e.preventDefault()}>
          <h3 className="text-lg font-semibold text-gray-900">Verification Form</h3>

          <Input
            label="Verified Amount"
            type="number"
            min="0"
            step="0.01"
            value={formData.verifiedAmount}
            onChange={(e) => setFormData((prev) => ({ ...prev, verifiedAmount: e.target.value }))}
            error={errors.verifiedAmount}
            disabled={!reviewable} />
          

          <Textarea
            label="Admin Remarks"
            value={formData.remarks}
            onChange={(e) => setFormData((prev) => ({ ...prev, remarks: e.target.value }))}
            rows={4}
            disabled={!reviewable} />
          

          <Textarea
            label="Rejection Reason (required for reject)"
            value={formData.rejectionReason}
            onChange={(e) => setFormData((prev) => ({ ...prev, rejectionReason: e.target.value }))}
            rows={4}
            error={errors.rejectionReason}
            disabled={!reviewable} />
          

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              <span className="font-medium">Verify or reject after completing review inputs.</span>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                className="flex-1 sm:flex-none"
                onClick={() => navigate(`/admin/payments/${payment.id}`)}>
                
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                className="flex-1 sm:flex-none"
                loading={saving}
                onClick={handleReject}
                disabled={!reviewable || saving}>
                
                Reject Payment
              </Button>
              <Button
                type="button"
                className="flex-1 sm:flex-none"
                loading={saving}
                onClick={handleVerify}
                disabled={!reviewable || saving}>
                
                Verify Payment
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>);

};

export default EditPayment;