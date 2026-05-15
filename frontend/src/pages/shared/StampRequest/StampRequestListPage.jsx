import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../../components/common/PageHeader';
import Table from '../../../components/common/Table';
import Badge from '../../../components/common/Badge';
import Button from '../../../components/common/Button';
import SearchBar from '../../../components/common/SearchBar';
import SelectDropdown from '../../../components/common/SelectDropdown';
import getStatusColor from '../../../utils/getStatusColor';
import { formatDate } from '../../../utils/formatDate';
import { formatNumber } from '../../../utils/formatCurrency';
import stampApi from '../../../services/stampApi';
import { manufacturerLabel, reviewerLabel } from './stampRequestUtils';

const StampRequestListPage = ({ basePath, title, description, canEdit = true }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await stampApi.getStampRequests(params);
      setRequests(res.data?.data?.requests || []);
    } catch (err) {
      console.error('Failed to fetch stamp requests:', err);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const filtered = useMemo(() => {
    return requests.filter((request) => {
      if (!search) return true;
      const lower = search.toLowerCase();
      return (
        request.requestNo?.toLowerCase().includes(lower) ||
        request.product?.name?.toLowerCase().includes(lower) ||
        request.license?.licenseNumber?.toLowerCase().includes(lower) ||
        manufacturerLabel(request).toLowerCase().includes(lower) ||
        request.requestedBy?.fullName?.toLowerCase().includes(lower) ||
        request.reviewedBy?.fullName?.toLowerCase().includes(lower));

    });
  }, [requests, search]);

  const summary = useMemo(() => {
    return {
      total: requests.length,
      pending: requests.filter((request) => request.status === 'PENDING').length,
      approved: requests.filter((request) => request.status === 'APPROVED').length,
      issued: requests.filter((request) => request.status === 'ISSUED').length,
      rejected: requests.filter((request) => request.status === 'REJECTED' || request.status === 'RETURNED').length
    };
  }, [requests]);

  const columns = [
  {
    key: 'requestNo',
    header: 'Request No',
    render: (row) => <span className="font-medium font-mono text-xs text-gray-900">{row.requestNo || '-'}</span>
  },
  {
    key: 'manufacturer',
    header: 'Manufacturer',
    render: (row) => manufacturerLabel(row)
  },
  {
    key: 'product',
    header: 'Product',
    render: (row) => row.product?.name || '-'
  },
  {
    key: 'license',
    header: 'License',
    render: (row) => <span className="font-mono text-xs text-gray-800">{row.license?.licenseNumber || '-'}</span>
  },
  {
    key: 'requested',
    header: 'Qty Requested',
    render: (row) => <span className="font-semibold text-gray-900">{formatNumber(row.quantityRequested)}</span>
  },
  {
    key: 'reviewedBy',
    header: 'Verified By',
    render: (row) => reviewerLabel(row)
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <Badge variant={getStatusColor(row.status)}>{row.status}</Badge>
  },
  {
    key: 'createdAt',
    header: 'Requested On',
    render: (row) => formatDate(row.requestedAt || row.createdAt)
  },
  {
    key: 'actions',
    header: 'Actions',
    render: (row) =>
    <div className="flex gap-2">
          <Link to={`${basePath}/${row.id}`}>
            <Button variant="outline" size="sm">View</Button>
          </Link>
          {canEdit && (row.status === 'APPROVED' ?
      <Link to={`${basePath}/${row.id}/edit`}>
              <Button size="sm">Issue</Button>
            </Link> :

      <Link to={`${basePath}/${row.id}/edit`}>
              <Button variant="outline" size="sm">Edit</Button>
            </Link>)
      }
        </div>

  }];


  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />

      <div className="border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Stamp Request Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
          <div className="border border-gray-200 p-3">
            <p className="text-gray-500">Total</p>
            <p className="text-xl font-semibold text-gray-900">{summary.total}</p>
          </div>
          <div className="border border-gray-200 p-3">
            <p className="text-gray-500">Pending</p>
            <p className="text-xl font-semibold text-amber-700">{summary.pending}</p>
          </div>
          <div className="border border-gray-200 p-3">
            <p className="text-gray-500">Approved</p>
            <p className="text-xl font-semibold text-emerald-700">{summary.approved}</p>
          </div>
          <div className="border border-gray-200 p-3">
            <p className="text-gray-500">Issued</p>
            <p className="text-xl font-semibold text-blue-700">{summary.issued}</p>
          </div>
          <div className="border border-gray-200 p-3">
            <p className="text-gray-500">Rejected/Returned</p>
            <p className="text-xl font-semibold text-red-700">{summary.rejected}</p>
          </div>
        </div>
      </div>

      <div className="border border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-100 flex flex-col lg:flex-row gap-3">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by request, manufacturer, product, verifier..."
            className="lg:w-96" />
          
          <SelectDropdown
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
            { value: '', label: 'All Status' },
            { value: 'PENDING', label: 'Pending' },
            { value: 'APPROVED', label: 'Approved' },
            { value: 'ISSUED', label: 'Issued' },
            { value: 'REJECTED', label: 'Rejected' },
            { value: 'RETURNED', label: 'Returned' }]
            }
            className="lg:w-52" />
          
        </div>

        <Table columns={columns} data={filtered} loading={loading} emptyMessage="No stamp requests found" />
      </div>
    </div>);

};

export default StampRequestListPage;