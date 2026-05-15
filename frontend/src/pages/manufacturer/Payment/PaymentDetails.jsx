import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import PageHeader from '../../../components/common/PageHeader';
import Badge from '../../../components/common/Badge';
import Button from '../../../components/common/Button';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import getStatusColor from '../../../utils/getStatusColor';
import { formatDate } from '../../../utils/formatDate';
import { formatCurrency } from '../../../utils/formatCurrency';
import paymentApi from '../../../services/paymentApi';

const PAYMENT_TAG_REGEX = /\[PAYMENT_CATEGORY:(DUTY|LICENSE_RENEWAL)\]/i;

const getPaymentCategory = (payment) => {
  const match = payment?.remarks?.match(PAYMENT_TAG_REGEX);
  if (match?.[1]) return match[1].toUpperCase();
  if ((payment?._count?.allocations || payment?.allocations?.length || 0) > 0) return 'DUTY';
  return 'LICENSE_RENEWAL';
};

const sanitizeRemarks = (remarks) => {
  if (!remarks) return '-';
  return remarks.replace(PAYMENT_TAG_REGEX, '').trim() || '-';
};

const methodLabel = (method) => {
  if (method === 'PAYMENT_GATEWAY') return 'Payment Gateway (iPay)';
  if (method === 'BANK_TRANSFER') return 'Bank Transfer';
  return method || '-';
};

const PaymentsDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchPayment = useCallback(async () => {
    setLoading(true);
    try {
      const response = await paymentApi.getPaymentById(id);
      setPayment(response.data?.data || null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load payment details');
      setPayment(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPayment();
  }, [fetchPayment]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <LoadingSpinner text="Loading payment details..." />
      </div>);

  }

  if (!payment) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <p className="text-gray-500">Payment not found</p>
        <Link to="/manufacturer/payments">
          <Button variant="outline">Back to Payments</Button>
        </Link>
      </div>);

  }

  const category = getPaymentCategory(payment);

  return (
    <div className="space-y-6">
      <PageHeader
        title={payment.paymentRef || 'Payment Details'}
        description="Payment profile, transfer details, and allocation status"
        actions={<Button variant="outline" onClick={() => navigate('/manufacturer/payments')}>Back to Payments</Button>} />
      

      <div className="text-sm text-gray-500">
        <Link to="/manufacturer/payments" className="hover:text-gray-700">Payments</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">Details</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">1. Payment Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Payment Reference</p>
                <p className="font-mono font-medium text-gray-900">{payment.paymentRef || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Status</p>
                <Badge variant={getStatusColor(payment.status)}>{payment.status}</Badge>
              </div>
              <div>
                <p className="text-gray-500">Payment For</p>
                <p className="font-medium text-gray-900">{category === 'DUTY' ? 'Duty Payment' : 'License Renewal'}</p>
              </div>
              <div>
                <p className="text-gray-500">Method</p>
                <p className="font-medium text-gray-900">{methodLabel(payment.method)}</p>
              </div>
              <div>
                <p className="text-gray-500">Declared Amount</p>
                <p className="text-lg font-semibold text-gray-900">{formatCurrency(payment.declaredAmount)}</p>
              </div>
              <div>
                <p className="text-gray-500">Verified Amount</p>
                <p className="text-lg font-semibold text-emerald-700">{payment.verifiedAmount ? formatCurrency(payment.verifiedAmount) : '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Declared On</p>
                <p className="font-medium text-gray-900">{formatDate(payment.declaredAt || payment.createdAt)}</p>
              </div>
              <div>
                <p className="text-gray-500">Verified On</p>
                <p className="font-medium text-gray-900">{formatDate(payment.verifiedAt)}</p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">2. License and Organization</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">License Number</p>
                <p className="font-medium text-gray-900">{payment.license?.licenseNumber || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Company</p>
                <p className="font-medium text-gray-900">{payment.license?.companyName || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">License Type</p>
                <p className="font-medium text-gray-900">{payment.license?.type || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Bank Reference</p>
                <p className="font-mono font-medium text-gray-900">{payment.bankReference || '-'}</p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">3. Transfer Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Bank Name</p>
                <p className="font-medium text-gray-900">{payment.bankName || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Bank Branch</p>
                <p className="font-medium text-gray-900">{payment.bankBranch || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Deposited At</p>
                <p className="font-medium text-gray-900">{formatDate(payment.depositedAt)}</p>
              </div>
              <div>
                <p className="text-gray-500">Proof</p>
                {payment.proofUrl ?
                <a
                  href={payment.proofUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-primary-700 hover:text-primary-800">
                  
                    Open Image
                  </a> :

                <p className="font-medium text-gray-900">-</p>
                }
              </div>
            </div>

            {payment.proofUrl &&
            <div className="mt-4 border border-gray-200 bg-gray-50 p-3">
                <img
                src={payment.proofUrl}
                alt="Payment proof"
                className="w-full max-h-72 object-contain bg-white" />
              
              </div>
            }
          </div>

          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">4. Remarks</h3>
            <p className="text-sm text-gray-900 whitespace-pre-wrap">{sanitizeRemarks(payment.remarks)}</p>
            {payment.rejectionReason &&
            <div className="mt-4 border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-semibold text-red-900 mb-1">Rejection Reason</p>
                <p className="text-sm text-red-800">{payment.rejectionReason}</p>
              </div>
            }
          </div>
        </div>

        <div className="space-y-6">
          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className="font-medium text-gray-900">{payment.status || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Category</span>
                <span className="font-medium text-gray-900">{category === 'DUTY' ? 'Duty' : 'Renewal'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Method</span>
                <span className="font-medium text-gray-900">{methodLabel(payment.method)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Declared</span>
                <span className="font-medium text-gray-900">{formatCurrency(payment.declaredAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Verified</span>
                <span className="font-medium text-gray-900">{payment.verifiedAmount ? formatCurrency(payment.verifiedAmount) : '-'}</span>
              </div>
            </div>
          </div>

          {Array.isArray(payment.allocations) && payment.allocations.length > 0 &&
          <div className="border border-emerald-200 bg-emerald-50 p-5">
              <h4 className="text-sm font-semibold text-emerald-900 mb-2">Duty Allocations</h4>
              <div className="space-y-2 text-sm text-emerald-800">
                {payment.allocations.map((allocation) =>
              <p key={allocation.id}>
                    {allocation.dutyAssessment?.assessmentNo || 'Assessment'}: {formatCurrency(allocation.allocatedAmount)}
                  </p>
              )}
              </div>
            </div>
          }
        </div>
      </div>
    </div>);

};

export default PaymentsDetails;