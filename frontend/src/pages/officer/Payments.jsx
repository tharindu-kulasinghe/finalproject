import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import Table from '../../components/common/Table';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import SearchBar from '../../components/common/SearchBar';
import SelectDropdown from '../../components/common/SelectDropdown';
import getStatusColor from '../../utils/getStatusColor';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import paymentApi from '../../services/paymentApi';
import { PaymentStatus, PAYMENT_PENDING_REVIEW_STATUSES, isPaymentVerified } from '../../constants/statusConstants';
import { getPaymentCategory, methodLabel } from './Payment/paymentUtils';

const OfficerPayments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const allPayments = [];
      const limit = 200;
      let page = 1;
      let totalPages = 1;

      do {
        const res = await paymentApi.getPayments({ page, limit });
        const data = res.data?.data || {};
        allPayments.push(...(data.payments || []));
        totalPages = Number(data.pagination?.pages || 1);
        page += 1;
      } while (page <= totalPages);

      setPayments(allPayments);
    } catch (err) {
      console.error('Failed to fetch payments:', err);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {fetchPayments();}, [fetchPayments]);

  const filtered = useMemo(() => {
    return payments.filter((payment) => {
      if (statusFilter && payment.status !== statusFilter) return false;

      const paymentMethod = payment.method || payment.paymentMethod;
      if (methodFilter && paymentMethod !== methodFilter) return false;

      const category = getPaymentCategory(payment);
      if (categoryFilter && category !== categoryFilter) return false;

      if (!search.trim()) return true;
      const lowerSearch = search.toLowerCase();
      return (
        payment.paymentRef?.toLowerCase().includes(lowerSearch) ||
        payment.paymentReference?.toLowerCase().includes(lowerSearch) ||
        payment.license?.licenseNumber?.toLowerCase().includes(lowerSearch) ||
        payment.license?.companyName?.toLowerCase().includes(lowerSearch) ||
        payment.user?.fullName?.toLowerCase().includes(lowerSearch) ||
        payment.declaredBy?.fullName?.toLowerCase().includes(lowerSearch) ||
        payment.bankReference?.toLowerCase().includes(lowerSearch));

    });
  }, [payments, statusFilter, methodFilter, categoryFilter, search]);

  const summary = useMemo(() => {
    const declared = payments.filter((item) => PAYMENT_PENDING_REVIEW_STATUSES.includes(item.status)).length;
    const verified = payments.filter((item) => isPaymentVerified(item.status)).length;
    const rejected = payments.filter((item) => item.status === PaymentStatus.REJECTED).length;

    return {
      total: payments.length,
      declared,
      verified,
      rejected
    };
  }, [payments]);

  const columns = [
  {
    key: 'reference',
    header: 'Reference',
    render: (row) =>
    <span className="font-medium font-mono text-xs text-gray-900">
          {row.paymentRef || row.paymentReference || '-'}
        </span>

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
    key: 'company',
    header: 'Company',
    render: (row) => row.license?.companyName || '-'
  },
  {
    key: 'declaredBy',
    header: 'Declared By',
    render: (row) => row.declaredBy?.fullName || row.user?.fullName || '-'
  },
  {
    key: 'amount',
    header: 'Declared Amount',
    render: (row) => <span className="font-semibold text-gray-900">{formatCurrency(row.declaredAmount || row.amount)}</span>
  },
  {
    key: 'method',
    header: 'Method',
    render: (row) =>
    <span className="text-sm text-gray-700">{methodLabel(row.method || row.paymentMethod)}</span>

  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <Badge variant={getStatusColor(row.status)}>{row.status}</Badge>
  },
  {
    key: 'date',
    header: 'Declared On',
    render: (row) => formatDate(row.declaredAt || row.paymentDate || row.createdAt)
  },
  {
    key: 'actions',
    header: 'Actions',
    render: (row) =>
    <Link to={`/officer/payments/${row.id}`}>
          <Button size="sm" variant="outline">View</Button>
        </Link>

  }];


  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="View all payments and navigate to a separate details page" />
      

      <div className="border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div className="border border-gray-200 p-3">
            <p className="text-gray-500">Total</p>
            <p className="text-xl font-semibold text-gray-900">{summary.total}</p>
          </div>
          <div className="border border-gray-200 p-3">
            <p className="text-gray-500">Pending Review</p>
            <p className="text-xl font-semibold text-amber-700">{summary.declared}</p>
          </div>
          <div className="border border-gray-200 p-3">
            <p className="text-gray-500">Verified</p>
            <p className="text-xl font-semibold text-emerald-700">{summary.verified}</p>
          </div>
          <div className="border border-gray-200 p-3">
            <p className="text-gray-500">Rejected</p>
            <p className="text-xl font-semibold text-red-700">{summary.rejected}</p>
          </div>
        </div>
      </div>

      <div className="border border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-100 flex flex-col lg:flex-row gap-3">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by reference, license, company, declarer..."
            className="lg:w-80" />
          
          <SelectDropdown
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
            { value: '', label: 'All Status' },
            { value: PaymentStatus.DECLARED, label: 'Declared' },
            { value: PaymentStatus.UNDER_VERIFICATION, label: 'Under Verification' },
            { value: PaymentStatus.VERIFIED, label: 'Verified' },
            { value: PaymentStatus.REJECTED, label: 'Rejected' }]
            }
            className="lg:w-48" />
          
          <SelectDropdown
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            options={[
            { value: '', label: 'All Methods' },
            { value: 'PAYMENT_GATEWAY', label: 'Payment Gateway (iPay)' },
            { value: 'BANK_TRANSFER', label: 'Bank Transfer' }]
            }
            className="lg:w-56" />
          
          <SelectDropdown
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            options={[
            { value: '', label: 'All Payment Types' },
            { value: 'DUTY', label: 'Duty Payments' },
            { value: 'LICENSE_RENEWAL', label: 'License Renewals' }]
            }
            className="lg:w-56" />
          
        </div>

        <Table
          columns={columns}
          data={filtered}
          loading={loading}
          emptyMessage="No payments found" />
        
      </div>
    </div>);

};

export default OfficerPayments;