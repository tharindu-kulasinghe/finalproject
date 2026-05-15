import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import PageHeader from '../../../components/common/PageHeader';
import Table from '../../../components/common/Table';
import Badge from '../../../components/common/Badge';
import Button from '../../../components/common/Button';
import Modal from '../../../components/common/Modal';
import SearchBar from '../../../components/common/SearchBar';
import SelectDropdown from '../../../components/common/SelectDropdown';
import Input from '../../../components/common/Input';
import getStatusColor from '../../../utils/getStatusColor';
import { formatDate } from '../../../utils/formatDate';
import { formatCurrency } from '../../../utils/formatCurrency';
import paymentApi from '../../../services/paymentApi';
import api from '../../../services/api';
import dutyApi from '../../../services/dutyApi';
import licenseApi from '../../../services/licenseApi';
import { PaymentStatus, PAYABLE_DUTY_ASSESSMENT_STATUSES } from '../../../constants/statusConstants';

const PAYMENT_TAG_REGEX = /\[PAYMENT_CATEGORY:(DUTY|LICENSE_RENEWAL)\]/i;
const PAYABLE_DUTY_STATUSES = new Set(PAYABLE_DUTY_ASSESSMENT_STATUSES);

const PAYMENT_HISTORY_STATUSES = new Set([PaymentStatus.VERIFIED, PaymentStatus.REJECTED]);

function redirectToIpay(action, fields) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = action;
  form.acceptCharset = 'UTF-8';
  Object.entries(fields).forEach(([name, value]) => {
    if (value === undefined || value === null || value === '') return;
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = String(value);
    form.appendChild(input);
  });
  document.body.appendChild(form);
  form.submit();
}

const defaultPaymentForm = {
  method: 'BANK_TRANSFER',
  declaredAmount: '',
  bankName: '',
  bankBranch: '',
  bankReference: '',
  proofImage: null,
  payerName: '',
  payerContact: '',
  customerEmail: '',
  gatewayCardScheme: '',
  remarks: ''
};

const getPaymentCategory = (payment) => {
  const match = payment?.remarks?.match(PAYMENT_TAG_REGEX);
  if (match?.[1]) return match[1].toUpperCase();
  if ((payment?._count?.allocations || payment?.allocations?.length || 0) > 0) return 'DUTY';
  return 'LICENSE_RENEWAL';
};

const methodLabel = (method) => {
  if (method === 'PAYMENT_GATEWAY') return 'Payment Gateway (iPay)';
  if (method === 'BANK_TRANSFER') return 'Bank Transfer';
  return method || '-';
};

const parseDateOrNull = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getLicenseExpiryDate = (license) => {
  return parseDateOrNull(license?.renewalDueDate) || parseDateOrNull(license?.effectiveTo);
};

const isLicenseExpiredByCurrentDate = (license, now) => {
  const expiryDate = getLicenseExpiryDate(license);
  if (!expiryDate) return false;
  return expiryDate.getTime() <= now.getTime();
};

const Payments = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [licenses, setLicenses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [outstandingAssessments, setOutstandingAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [selectedPaymentContext, setSelectedPaymentContext] = useState(null);
  const [paymentForm, setPaymentForm] = useState(defaultPaymentForm);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [licensesRes, paymentsRes, dutiesRes] = await Promise.all([
      licenseApi.getMyLicenses(),
      paymentApi.getPayments({ limit: 1000 }),
      dutyApi.getDuties({ limit: 1000 })]
      );

      const allAssessments = dutiesRes.data?.data?.assessments || [];
      const unpaidAssessments = allAssessments.
      filter((assessment) => PAYABLE_DUTY_STATUSES.has(assessment.status)).
      filter((assessment) => Number(assessment.assessedAmount || 0) > Number(assessment.paidAmount || 0)).
      map((assessment) => {
        const assessed = Number(assessment.assessedAmount || 0);
        const paid = Number(assessment.paidAmount || 0);
        const rawBalance = Number(assessment.balanceAmount);
        const balanceDue = Number.isFinite(rawBalance) ? rawBalance : Math.max(assessed - paid, 0);

        return {
          ...assessment,
          balanceDue
        };
      });

      setPayments(paymentsRes.data?.data?.payments || []);
      setLicenses(licensesRes.data?.data?.licenses || []);
      setOutstandingAssessments(unpaidAssessments);
    } catch (err) {
      console.error('Failed to fetch payment data:', err);
      setLicenses([]);
      setPayments([]);
      setOutstandingAssessments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const ipay = searchParams.get('ipay');
    if (!ipay) return;
    if (ipay === 'ok') {
      toast.success('You returned from iPay. If payment succeeded, it will show as verified in the system.');
    } else if (ipay === 'cancel') {
      toast('Payment was cancelled or timed out on iPay.');
    }
    const next = new URLSearchParams(searchParams);
    next.delete('ipay');
    next.delete('orderId');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const payableLicenses = useMemo(() => {
    const now = new Date();
    return licenses.filter((license) => isLicenseExpiredByCurrentDate(license, now));
  }, [licenses]);

  const openPaymentModal = (context) => {
    setSelectedPaymentContext(context);
    setPaymentForm({
      ...defaultPaymentForm,
      declaredAmount: context?.suggestedAmount ? String(context.suggestedAmount) : ''
    });
    setPaymentError('');
    setShowPaymentModal(true);
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setSubmitting(false);
    setPaymentError('');
    setSelectedPaymentContext(null);
    setPaymentForm(defaultPaymentForm);
  };

  const openLicensePayment = (license) => {
    openPaymentModal({
      type: 'LICENSE',
      category: 'LICENSE_RENEWAL',
      licenseId: license.id,
      licenseNumber: license.licenseNumber || '',
      title: `License ${license.licenseNumber || '-'}`,
      subtitle: license.companyName || '-'
    });
  };

  const openBatchPayment = (assessment) => {
    openPaymentModal({
      type: 'BATCH',
      category: 'DUTY',
      licenseId: assessment.license?.id || assessment.licenseId || '',
      licenseNumber: assessment.license?.licenseNumber || '',
      batchNo: assessment.batch?.batchNo || '',
      title: `Batch ${assessment.batch?.batchNo || '-'}`,
      subtitle: `Assessment ${assessment.assessmentNo || '-'}`,
      suggestedAmount: assessment.balanceDue,
      assessmentNo: assessment.assessmentNo || ''
    });
  };

  const handlePaymentFormChange = (name, value) => {
    setPaymentForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleDeclarePayment = async (event) => {
    event.preventDefault();

    if (!selectedPaymentContext?.licenseId) {
      setPaymentError('Payment target is not selected.');
      return;
    }

    const amount = Number(paymentForm.declaredAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError('Please enter a valid declared amount.');
      return;
    }

    setSubmitting(true);
    setPaymentError('');

    try {
      if (paymentForm.method === 'PAYMENT_GATEWAY') {
        const payFor = selectedPaymentContext.type === 'BATCH' ? 'BATCH' : 'LICENSE';
        const res = await api.post('/public/payments/ipay/prepare', {
          payFor,
          licenseNumber: selectedPaymentContext.licenseNumber || undefined,
          batchNo: selectedPaymentContext.batchNo || undefined,
          declaredAmount: String(amount),
          payerName: paymentForm.payerName?.trim() || undefined,
          payerContact: paymentForm.payerContact?.trim() || undefined,
          customerEmail: paymentForm.customerEmail?.trim() || undefined,
          paymentMethod: paymentForm.gatewayCardScheme || undefined,
          remarks: paymentForm.remarks?.trim() || undefined
        });
        const data = res.data?.data;
        if (!data?.action || !data?.fields) {
          const message = 'Could not start payment. Is iPay configured on the server?';
          setPaymentError(message);
          toast.error(message);
          return;
        }
        toast.success('Redirecting to iPay…');
        redirectToIpay(data.action, data.fields);
        return;
      }

      if (!paymentForm.bankReference || !paymentForm.proofImage) {
        setPaymentError('Bank reference and slip screenshot are required for bank transfer.');
        return;
      }

      const payload = new FormData();
      payload.append('paymentCategory', selectedPaymentContext.category);
      payload.append('licenseId', selectedPaymentContext.licenseId);
      payload.append('method', paymentForm.method);
      payload.append('declaredAmount', String(amount));
      payload.append('bankName', paymentForm.bankName);
      payload.append('bankBranch', paymentForm.bankBranch);
      payload.append('bankReference', paymentForm.bankReference);
      payload.append('proofImage', paymentForm.proofImage);

      const extraRemarks = [];
      if (selectedPaymentContext.assessmentNo) {
        extraRemarks.push(`Assessment: ${selectedPaymentContext.assessmentNo}`);
      }
      if (paymentForm.remarks) {
        extraRemarks.push(paymentForm.remarks);
      }
      if (extraRemarks.length > 0) {
        payload.append('remarks', extraRemarks.join(' | '));
      }

      await paymentApi.declarePayment(payload);
      toast.success('Payment declared successfully');
      closePaymentModal();
      await fetchData();
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to declare payment';
      setPaymentError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const paidHistory = useMemo(() => {
    let items = payments.filter((payment) => PAYMENT_HISTORY_STATUSES.has(payment.status));

    if (statusFilter) {
      items = items.filter((payment) => payment.status === statusFilter);
    }

    if (methodFilter) {
      items = items.filter((payment) => payment.method === methodFilter);
    }

    if (search) {
      const lowerSearch = search.toLowerCase();
      items = items.filter((payment) =>
      payment.paymentRef?.toLowerCase().includes(lowerSearch) ||
      payment.license?.licenseNumber?.toLowerCase().includes(lowerSearch) ||
      payment.license?.companyName?.toLowerCase().includes(lowerSearch) ||
      payment.bankReference?.toLowerCase().includes(lowerSearch)
      );
    }

    return items;
  }, [payments, search, statusFilter, methodFilter]);

  const summary = useMemo(() => {
    return {
      totalDueLicense: payableLicenses.length,
      totalBatchForPayment: outstandingAssessments.length,
      verified: payments.filter((payment) => payment.status === PaymentStatus.VERIFIED).length,
      rejected: payments.filter((payment) => payment.status === PaymentStatus.REJECTED).length
    };
  }, [payments, payableLicenses, outstandingAssessments]);

  const outstandingSummary = useMemo(() => {
    const totalBalance = outstandingAssessments.reduce((sum, assessment) => {
      return sum + Number(assessment.balanceDue || 0);
    }, 0);

    return {
      totalOutstandingBatches: outstandingAssessments.length,
      totalBalance
    };
  }, [outstandingAssessments]);

  const columns = [
  {
    key: 'paymentRef',
    header: 'Reference',
    render: (row) => <span className="font-mono text-xs font-medium text-gray-900">{row.paymentRef || '-'}</span>
  },
  {
    key: 'category',
    header: 'Payment For',
    render: (row) => {
      const category = getPaymentCategory(row);
      return <span className="text-sm font-medium text-gray-800">{category === 'DUTY' ? 'Duty Payment' : 'License Renewal'}</span>;
    }
  },
  {
    key: 'license',
    header: 'License',
    render: (row) => <span className="text-sm text-gray-700">{row.license?.licenseNumber || '-'}</span>
  },
  {
    key: 'amount',
    header: 'Declared Amount',
    render: (row) => <span className="text-sm font-semibold text-gray-900">{formatCurrency(row.declaredAmount)}</span>
  },
  {
    key: 'method',
    header: 'Method',
    render: (row) => <span className="text-sm text-gray-700">{methodLabel(row.method)}</span>
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <Badge variant={getStatusColor(row.status)}>{row.status}</Badge>
  },
  {
    key: 'declaredAt',
    header: 'Declared On',
    render: (row) => <span className="text-sm text-gray-700">{formatDate(row.declaredAt || row.createdAt)}</span>
  },
  {
    key: 'actions',
    header: 'Actions',
    render: (row) =>
    <Link to={`/manufacturer/payments/${row.id}`}>
          <Button variant="outline" size="sm">View</Button>
        </Link>

  }];


  const licenseColumns = [
  {
    key: 'licenseNumber',
    header: 'License No',
    render: (row) => <span className="font-mono text-xs font-medium text-gray-900">{row.licenseNumber || '-'}</span>
  },
  {
    key: 'companyName',
    header: 'Company',
    render: (row) => <span className="text-sm text-gray-700">{row.companyName || '-'}</span>
  },
  {
    key: 'type',
    header: 'Type',
    render: (row) => <span className="text-sm text-gray-700">{row.type || '-'}</span>
  },
  {
    key: 'renewalDueDate',
    header: 'Renewal Due',
    render: (row) => <span className="text-sm text-gray-700">{formatDate(row.renewalDueDate)}</span>
  },
  {
    key: 'effectiveTo',
    header: 'Valid Until',
    render: (row) => <span className="text-sm text-gray-700">{formatDate(row.effectiveTo)}</span>
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <Badge variant={getStatusColor(row.status)}>{row.status}</Badge>
  },
  {
    key: 'actions',
    header: 'Actions',
    render: (row) =>
    <Button size="sm" onClick={() => openLicensePayment(row)}>
          Pay
        </Button>

  }];


  const outstandingColumns = [
  {
    key: 'batchNo',
    header: 'Batch',
    render: (row) => <span className="font-mono text-xs font-medium text-gray-900">{row.batch?.batchNo || '-'}</span>
  },
  {
    key: 'product',
    header: 'Product',
    render: (row) => <span className="text-sm text-gray-700">{row.batch?.product?.name || '-'}</span>
  },
  {
    key: 'assessmentNo',
    header: 'Assessment No',
    render: (row) => <span className="font-mono text-xs font-medium text-gray-900">{row.assessmentNo || '-'}</span>
  },
  {
    key: 'assessedAmount',
    header: 'Assessed Amount',
    render: (row) => <span className="text-sm text-gray-700">{formatCurrency(row.assessedAmount)}</span>
  },
  {
    key: 'paidAmount',
    header: 'Paid Amount',
    render: (row) => <span className="text-sm text-gray-700">{formatCurrency(row.paidAmount)}</span>
  },
  {
    key: 'balanceDue',
    header: 'Balance Due',
    render: (row) => <span className="text-sm font-semibold text-red-700">{formatCurrency(row.balanceDue)}</span>
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <Badge variant={getStatusColor(row.status)}>{row.status}</Badge>
  },
  {
    key: 'dueDate',
    header: 'Due Date',
    render: (row) => <span className="text-sm text-gray-700">{formatDate(row.dueDate)}</span>
  },
  {
    key: 'actions',
    header: 'Actions',
    render: (row) =>
    <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => openBatchPayment(row)}>
            Pay
          </Button>
          {row.batch?.id ?
      <Link to={`/manufacturer/batches/${row.batch.id}`}>
              <Button variant="outline" size="sm">Batch Details</Button>
            </Link> :
      null}
        </div>

  }];


  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="License payments, batch payments, and full payment history" />

      

      <div className="border border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">Payment Summary</h3>
        </div>
        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="border border-gray-200 bg-gray-50 p-3">
            <p className="text-gray-500">Total Due License</p>
            <p className="text-lg font-semibold text-gray-900">{summary.totalDueLicense}</p>
          </div>
          <div className="border border-gray-200 bg-gray-50 p-3">
            <p className="text-gray-500">Total Batch for Payment</p>
            <p className="text-lg font-semibold text-blue-700">{summary.totalBatchForPayment}</p>
          </div>
          <div className="border border-gray-200 bg-gray-50 p-3">
            <p className="text-gray-500">Verified payments</p>
            <p className="text-lg font-semibold text-emerald-700">{summary.verified}</p>
          </div>
          <div className="border border-gray-200 bg-gray-50 p-3">
            <p className="text-gray-500">Rejected</p>
            <p className="text-lg font-semibold text-red-700">{summary.rejected}</p>
          </div>
        </div>
      </div>

      <div className="border border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="text-base font-semibold text-gray-900">Expired License for Payment</h3>
          <span className="text-sm text-gray-500">{payableLicenses.length} available</span>
        </div>

        <Table
          columns={licenseColumns}
          data={payableLicenses}
          loading={loading}
          emptyMessage="No expired licenses found as of current date." />
        
      </div>

      <div className="border border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="text-base font-semibold text-gray-900">Batch for Payment</h3>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="border border-gray-200 px-3 py-1.5 text-gray-700">
              Batches: <span className="font-semibold text-gray-900">{outstandingSummary.totalOutstandingBatches}</span>
            </span>
            <span className="border border-red-200 bg-red-50 px-3 py-1.5 text-red-800">
              Total Balance: <span className="font-semibold">{formatCurrency(outstandingSummary.totalBalance)}</span>
            </span>
          </div>
        </div>

        <Table
          columns={outstandingColumns}
          data={outstandingAssessments}
          loading={loading}
          emptyMessage="No batches with outstanding duty (Assessed Amount > Paid Amount)." />
        
      </div>

      <div className="border border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">Payment history</h3>
        </div>
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by payment reference, license, company..."
            className="sm:w-72" />
          
          <SelectDropdown
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
            { value: '', label: 'All statuses' },
            { value: PaymentStatus.VERIFIED, label: 'Verified' },
            { value: PaymentStatus.REJECTED, label: 'Rejected' }]
            }
            className="sm:w-44" />
          
          <SelectDropdown
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            options={[
            { value: '', label: 'All Methods' },
            { value: 'PAYMENT_GATEWAY', label: 'Payment Gateway (iPay)' },
            { value: 'BANK_TRANSFER', label: 'Bank Transfer' }]
            }
            className="sm:w-52" />
          
        </div>

        <Table
          columns={columns}
          data={paidHistory}
          loading={loading}
          emptyMessage="No paid payments found." />
        
      </div>

      <Modal isOpen={showPaymentModal} onClose={closePaymentModal} title="Make Payment" size="lg">
        <form onSubmit={handleDeclarePayment} className="space-y-4">
          {selectedPaymentContext &&
          <div className="border border-gray-200 bg-gray-50 p-4 text-sm">
              <p className="text-gray-500">Payment Target</p>
              <p className="font-medium text-gray-900">{selectedPaymentContext.title}</p>
              <p className="text-gray-600">{selectedPaymentContext.subtitle}</p>
              <p className="text-gray-600 mt-1">Category: {selectedPaymentContext.category === 'DUTY' ? 'Duty Payment' : 'License Renewal'}</p>
            </div>
          }

          {paymentError &&
          <div className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {paymentError}
            </div>
          }

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectDropdown
              label="Payment Method"
              value={paymentForm.method}
              onChange={(e) => handlePaymentFormChange('method', e.target.value)}
              options={[
              { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
              { value: 'PAYMENT_GATEWAY', label: 'Card / online (iPay)' }]
              }
              required />
            
            <Input
              label="Declared Amount"
              type="number"
              min="0"
              step="0.01"
              value={paymentForm.declaredAmount}
              onChange={(e) => handlePaymentFormChange('declaredAmount', e.target.value)}
              placeholder="Enter amount"
              required />
            
          </div>

          {paymentForm.method === 'PAYMENT_GATEWAY' &&
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
              label="Payer name (optional)"
              value={paymentForm.payerName}
              onChange={(e) => handlePaymentFormChange('payerName', e.target.value)}
              placeholder="Shown on iPay checkout" />
            
              <Input
              label="Mobile (optional)"
              value={paymentForm.payerContact}
              onChange={(e) => handlePaymentFormChange('payerContact', e.target.value)}
              placeholder="Digits only preferred" />
            
              <Input
              label="Email for receipt (optional)"
              type="email"
              value={paymentForm.customerEmail}
              onChange={(e) => handlePaymentFormChange('customerEmail', e.target.value)}
              placeholder="you@example.com" />
            
              <SelectDropdown
              label="Card / scheme filter (optional)"
              value={paymentForm.gatewayCardScheme}
              onChange={(e) => handlePaymentFormChange('gatewayCardScheme', e.target.value)}
              options={[
              { value: '', label: 'All methods iPay offers' },
              { value: 'VISA', label: 'Visa only' },
              { value: 'MC', label: 'Mastercard only' }]
              } />
            
            </div>
          }

          {paymentForm.method === 'BANK_TRANSFER' &&
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
              label="Bank Name"
              value={paymentForm.bankName}
              onChange={(e) => handlePaymentFormChange('bankName', e.target.value)}
              placeholder="e.g. Bank of Ceylon" />
            
              <Input
              label="Bank Branch"
              value={paymentForm.bankBranch}
              onChange={(e) => handlePaymentFormChange('bankBranch', e.target.value)}
              placeholder="e.g. Maharagama" />
            
              <Input
              label="Bank Reference"
              value={paymentForm.bankReference}
              onChange={(e) => handlePaymentFormChange('bankReference', e.target.value)}
              placeholder="e.g. TXN-12345"
              required />
            
              <div className="md:col-span-2">
                <p className="mb-2 text-xs text-gray-500">Deposited time will be saved automatically using current time.</p>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Slip / Screenshot</label>
                <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={(e) => handlePaymentFormChange('proofImage', e.target.files?.[0] || null)}
                required
                className="w-full border border-gray-300 bg-white px-3 py-2.5 text-sm" />
              
              </div>
            </div>
          }

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Remarks (Optional)</label>
            <textarea
              value={paymentForm.remarks}
              onChange={(e) => handlePaymentFormChange('remarks', e.target.value)}
              rows={3}
              className="w-full border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-none"
              placeholder="Add note for payment verification" />
            
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={closePaymentModal}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" loading={submitting} disabled={submitting}>
              Submit Payment
            </Button>
          </div>
        </form>
      </Modal>
    </div>);

};

export default Payments;