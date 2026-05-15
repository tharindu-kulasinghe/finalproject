import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
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

const StampRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [downloadRequestId, setDownloadRequestId] = useState('');

  const getDownloadErrorMessage = async (error) => {
    const fallback = 'Failed to download stamp ZIP';
    const data = error?.response?.data;

    if (data instanceof Blob) {
      try {
        const text = await data.text();
        const parsed = JSON.parse(text);
        return parsed?.message || fallback;
      } catch (_) {
        return fallback;
      }
    }

    return data?.message || error?.message || fallback;
  };

  const getDownloadFileName = (contentDisposition) => {
    if (!contentDisposition) return null;
    const match = contentDisposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
    if (!match) return null;
    return decodeURIComponent(match[1] || match[2] || '').trim() || null;
  };

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;

      const response = await stampApi.getStampRequests(params);
      const data = response.data?.data?.requests || response.data?.data?.items || response.data?.data?.stampRequests || [];
      setRequests(data);
    } catch (error) {
      console.error('Failed to fetch stamp requests:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleDownloadRequestZip = async (request) => {
    if (request.status !== 'ISSUED') {
      toast.error('Only issued requests can be downloaded');
      return;
    }

    setDownloadRequestId(request.id);
    try {
      const response = await stampApi.downloadStampRequestZip(request.id);
      const contentType = response.headers?.['content-type'] || 'application/zip';
      const fallbackName = `iecms-stamps-${request.requestNo || request.id}.zip`;
      const fileName = getDownloadFileName(response.headers?.['content-disposition']) || fallbackName;
      const blob = new Blob([response.data], { type: contentType });
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
      toast.success(`Downloaded ${request.requestNo || 'request'} ZIP`);
    } catch (error) {
      console.error('Failed to download request ZIP:', error);
      const message = await getDownloadErrorMessage(error);
      toast.error(message);
    } finally {
      setDownloadRequestId('');
    }
  };

  const filteredRequests = useMemo(() => {
    if (!search) return requests;

    const searchLower = search.toLowerCase();
    return requests.filter((item) =>
    item.requestNo?.toLowerCase().includes(searchLower) ||
    item.product?.name?.toLowerCase().includes(searchLower) ||
    item.batch?.batchNo?.toLowerCase().includes(searchLower) ||
    item.license?.licenseNumber?.toLowerCase().includes(searchLower)
    );
  }, [requests, search]);

  const summary = useMemo(() => ({
    total: requests.length,
    pending: requests.filter((item) => item.status === 'PENDING').length,
    approved: requests.filter((item) => item.status === 'APPROVED').length,
    issued: requests.filter((item) => item.status === 'ISSUED').length,
    rejected: requests.filter((item) => item.status === 'REJECTED' || item.status === 'RETURNED').length
  }), [requests]);

  const columns = [
  {
    key: 'requestNo',
    header: 'Request No',
    render: (row) =>
    <span className="font-mono text-xs font-medium text-gray-900">
          {row.requestNo || row.id?.slice(0, 8) || '-'}
        </span>

  },
  {
    key: 'product',
    header: 'Product',
    render: (row) =>
    <div>
          <p className="text-sm font-medium text-gray-900">{row.product?.name || '-'}</p>
          <p className="text-xs text-gray-500">{row.product?.code || '-'}</p>
        </div>

  },
  {
    key: 'license',
    header: 'License',
    render: (row) =>
    <span className="font-mono text-xs text-gray-800">{row.license?.licenseNumber || '-'}</span>

  },
  {
    key: 'batch',
    header: 'Batch',
    render: (row) =>
    <span className="font-mono text-xs text-gray-800">{row.batch?.batchNo || '-'}</span>

  },
  {
    key: 'quantityRequested',
    header: 'Qty Requested',
    render: (row) => <span className="font-semibold text-gray-900">{formatNumber(row.quantityRequested || 0)}</span>
  },
  {
    key: 'quantityApproved',
    header: 'Qty Approved',
    render: (row) => <span className="text-gray-700">{row.quantityApproved ? formatNumber(row.quantityApproved) : '-'}</span>
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
    <div className="flex flex-wrap gap-2">
          <Link to={`/manufacturer/stamp-requests/${row.id}`}>
            <Button variant="outline" size="sm">View</Button>
          </Link>
          {row.status === 'ISSUED' &&
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleDownloadRequestZip(row)}
        loading={downloadRequestId === row.id}>
        
              Download QR ZIP
            </Button>
      }
        </div>

  }];


  return (
    <div className="space-y-6">
      <PageHeader
        title="Stamp Requests"
        description="Track your requests and open each request in a dedicated details page"
        actions={
        <div className="flex flex-wrap gap-2">
            <Link to="/manufacturer/stamp-requests/new">
              <Button>Request Stamps</Button>
            </Link>
          </div>
        } />
      

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
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by request no, product, batch, or license..."
            className="sm:w-80" />
          
          <SelectDropdown
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            options={[
            { value: '', label: 'All Status' },
            { value: 'PENDING', label: 'Pending' },
            { value: 'APPROVED', label: 'Approved' },
            { value: 'ISSUED', label: 'Issued' },
            { value: 'REJECTED', label: 'Rejected' },
            { value: 'RETURNED', label: 'Returned' }]
            }
            className="sm:w-44" />
          
        </div>

        <Table
          columns={columns}
          data={filteredRequests}
          loading={loading}
          emptyMessage="No stamp requests found. Start by creating a request." />
        
      </div>
    </div>);

};

export default StampRequests;