import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import PageHeader from '../../../components/common/PageHeader';
import Badge from '../../../components/common/Badge';
import Button from '../../../components/common/Button';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import paymentApi from '../../../services/paymentApi';
import getStatusColor from '../../../utils/getStatusColor';
import { formatCurrency } from '../../../utils/formatCurrency';
import { formatDate } from '../../../utils/formatDate';
import { getPaymentCategory, methodLabel, sanitizeRemarks } from './paymentUtils';

const OfficerPaymentDetails = () => {
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
        <Link to="/officer/payments">
          <Button variant="outline">Back to Payments</Button>
        </Link>
      </div>);

  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Payment ${payment.paymentRef || ''}`}
        description="View declared payment information and verification history"
        actions={
        <Button variant="outline" onClick={() => navigate('/officer/payments')}>
            Back to Payments
          </Button>
        } />
      

      <div className="text-sm text-gray-500">
        <Link to="/officer/payments" className="hover:text-gray-700">Payments</Link>
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
                <p className="font-medium font-mono text-gray-900">{payment.paymentRef || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Status</p>
                <Badge variant={getStatusColor(payment.status)}>{payment.status}</Badge>
              </div>
              <div>
                <p className="text-gray-500">Payment For</p>
                <p className="font-medium text-gray-900">{getPaymentCategory(payment) === 'DUTY' ? 'Duty Payment' : 'License Renewal'}</p>
              </div>
              <div>
                <p className="text-gray-500">Payment Method</p>
                <p className="font-medium text-gray-900">{methodLabel(payment.method)}</p>
              </div>
              <div>
                <p className="text-gray-500">Declared Amount</p>
                <p className="font-medium text-gray-900">{formatCurrency(payment.declaredAmount)}</p>
              </div>
              <div>
                <p className="text-gray-500">Verified Amount</p>
                <p className="font-medium text-gray-900">{payment.verifiedAmount ? formatCurrency(payment.verifiedAmount) : '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">License Number</p>
                <p className="font-medium text-gray-900">{payment.license?.licenseNumber || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">License Type</p>
                <p className="font-medium text-gray-900">{payment.license?.type || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Company</p>
                <p className="font-medium text-gray-900">{payment.license?.companyName || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Declared On</p>
                <p className="font-medium text-gray-900">{formatDate(payment.declaredAt)}</p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">2. Declaration and Verification</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Declared By</p>
                <p className="font-medium text-gray-900">{payment.declaredBy?.fullName || '-'}</p>
                <p className="text-gray-500">{payment.declaredBy?.email || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Verified By</p>
                <p className="font-medium text-gray-900">{payment.verifiedBy?.fullName || '-'}</p>
                <p className="text-gray-500">{payment.verifiedBy?.email || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Verified At</p>
                <p className="font-medium text-gray-900">{formatDate(payment.verifiedAt)}</p>
              </div>
              <div>
                <p className="text-gray-500">Deposited At</p>
                <p className="font-medium text-gray-900">{formatDate(payment.depositedAt)}</p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">3. Bank Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Bank Name</p>
                <p className="font-medium text-gray-900">{payment.bankName || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Bank Branch</p>
                <p className="font-medium text-gray-900">{payment.bankBranch || '-'}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-gray-500">Bank Reference</p>
                <p className="font-medium font-mono text-gray-900">{payment.bankReference || '-'}</p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">4. Duty Allocations</h3>
            {Array.isArray(payment.allocations) && payment.allocations.length > 0 ?
            <div className="overflow-x-auto border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="text-left px-3 py-2">Duty Assessment No</th>
                      <th className="text-left px-3 py-2">Assessed Amount</th>
                      <th className="text-left px-3 py-2">Balance Amount</th>
                      <th className="text-left px-3 py-2">Allocated Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payment.allocations.map((allocation) =>
                  <tr key={allocation.id} className="border-t border-gray-100">
                        <td className="px-3 py-2 font-mono text-xs text-gray-900">{allocation.dutyAssessment?.assessmentNo || '-'}</td>
                        <td className="px-3 py-2">{formatCurrency(allocation.dutyAssessment?.assessedAmount || 0)}</td>
                        <td className="px-3 py-2">{formatCurrency(allocation.dutyAssessment?.balanceAmount || 0)}</td>
                        <td className="px-3 py-2 font-medium">{formatCurrency(allocation.allocatedAmount || 0)}</td>
                      </tr>
                  )}
                  </tbody>
                </table>
              </div> :

            <p className="text-sm text-gray-500">No duty allocations linked to this payment.</p>
            }
          </div>

          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">5. Remarks and Decision</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-500">Remarks</p>
                <p className="font-medium text-gray-900 whitespace-pre-wrap">{sanitizeRemarks(payment.remarks)}</p>
              </div>
              <div>
                <p className="text-gray-500">Rejection Reason</p>
                <p className="font-medium text-gray-900 whitespace-pre-wrap">{payment.rejectionReason || '-'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Method</span>
                <span className="font-medium text-gray-900">{methodLabel(payment.method)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Category</span>
                <span className="font-medium text-gray-900">{getPaymentCategory(payment) === 'DUTY' ? 'Duty' : 'Renewal'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className="font-medium text-gray-900">{payment.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Declared</span>
                <span className="font-medium text-gray-900">{formatCurrency(payment.declaredAmount || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Verified</span>
                <span className="font-medium text-gray-900">{payment.verifiedAmount ? formatCurrency(payment.verifiedAmount) : '-'}</span>
              </div>
            </div>
          </div>

          {payment.proofUrl &&
          <div className="border border-gray-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Proof Image</h3>
              <img src={payment.proofUrl} alt="Payment proof" className="w-full max-h-72 object-contain border border-gray-200 bg-white p-2" />
              <a href={payment.proofUrl} target="_blank" rel="noreferrer" className="inline-block mt-2 text-sm text-primary-700 hover:text-primary-800">
                Open full image
              </a>
            </div>
          }
        </div>
      </div>
    </div>);

};

export default OfficerPaymentDetails;