import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import Table from '../../components/common/Table';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import SearchBar from '../../components/common/SearchBar';
import SelectDropdown from '../../components/common/SelectDropdown';
import getStatusColor from '../../utils/getStatusColor';
import { formatDate } from '../../utils/formatDate';
import stampApi from '../../services/stampApi';
import {
  isTaxStampExpiredByDate,
  isTaxStampInCirculation,
  TaxStampStatus } from
'../../constants/statusConstants';

const OfficerTaxStamps = () => {
  const [stamps, setStamps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchStamps = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await stampApi.getTaxStamps(params);
      setStamps(res.data?.data?.stamps || res.data?.data?.taxStamps || []);
    } catch (err) {
      console.error('Failed to fetch tax stamps:', err);
      setStamps([]);
    } finally
    {setLoading(false);}
  }, [statusFilter]);

  useEffect(() => {fetchStamps();}, [fetchStamps]);

  const filtered = useMemo(() => {
    return stamps.filter((stamp) => {
      if (!search) return true;
      const lowerSearch = search.toLowerCase();
      return (
        stamp.codeValue?.toLowerCase().includes(lowerSearch) ||
        stamp.serialNo?.toLowerCase().includes(lowerSearch) ||
        stamp.product?.name?.toLowerCase().includes(lowerSearch) ||
        stamp.batch?.batchNo?.toLowerCase().includes(lowerSearch) ||
        stamp.stampRequest?.requestNo?.toLowerCase().includes(lowerSearch));

    });
  }, [stamps, search]);

  const summary = useMemo(() => {
    return {
      total: stamps.length,
      generated: stamps.filter((stamp) => stamp.status === TaxStampStatus.GENERATED).length,
      active: stamps.filter((stamp) => isTaxStampInCirculation(stamp)).length,
      flagged: stamps.filter((stamp) => stamp.status === TaxStampStatus.FLAGGED).length,
      expired: stamps.filter((stamp) => isTaxStampExpiredByDate(stamp)).length
    };
  }, [stamps]);

  const columns = [
  {
    key: 'codeValue',
    header: 'Stamp Code',
    render: (row) => <span className="font-mono text-xs font-medium text-gray-900">{row.codeValue || '-'}</span>
  },
  {
    key: 'product',
    header: 'Product',
    render: (row) =>
    <div>
          <p className="text-sm font-medium text-gray-900">{row.product?.name || '-'}</p>
          <p className="text-xs text-gray-500">{row.product?.category || '-'}</p>
        </div>

  },
  {
    key: 'batch',
    header: 'Batch',
    render: (row) => <span className="text-sm font-mono text-gray-700">{row.batch?.batchNo || '-'}</span>
  },
  {
    key: 'request',
    header: 'Request No',
    render: (row) => <span className="text-sm font-mono text-gray-700">{row.stampRequest?.requestNo || '-'}</span>
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <Badge variant={getStatusColor(row.status)}>{row.status}</Badge>
  },
  {
    key: 'generatedAt',
    header: 'Generated',
    render: (row) => formatDate(row.generatedAt || row.createdAt)
  },
  {
    key: 'actions',
    header: 'Actions',
    render: (row) =>
    <Link to={`/officer/tax-stamps/${row.id}`}>
          <Button variant="outline" size="sm">View</Button>
        </Link>

  }];


  return (
    <div className="space-y-6">
      <PageHeader
        title="Tax Stamps"
        description="View all generated tax stamps and open separate detail pages." />
      

      <div className="border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tax Stamp Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
          <div className="border border-gray-200 p-3">
            <p className="text-gray-500">Total</p>
            <p className="text-xl font-semibold text-gray-900">{summary.total}</p>
          </div>
          <div className="border border-gray-200 p-3">
            <p className="text-gray-500">Generated</p>
            <p className="text-xl font-semibold text-blue-700">{summary.generated}</p>
          </div>
          <div className="border border-gray-200 p-3">
            <p className="text-gray-500">Active / assigned</p>
            <p className="text-xl font-semibold text-emerald-700">{summary.active}</p>
          </div>
          <div className="border border-gray-200 p-3">
            <p className="text-gray-500">Flagged</p>
            <p className="text-xl font-semibold text-red-700">{summary.flagged}</p>
          </div>
          <div className="border border-gray-200 p-3">
            <p className="text-gray-500">Past expiry date</p>
            <p className="text-xl font-semibold text-gray-700">{summary.expired}</p>
          </div>
        </div>
      </div>

      <div className="border border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
           <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by code, serial, product, batch, request..."
            className="sm:w-96" />
          
           <SelectDropdown
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
            { value: '', label: 'All Status' },
            { value: TaxStampStatus.GENERATED, label: 'Generated' },
            { value: TaxStampStatus.ASSIGNED, label: 'Assigned' },
            { value: TaxStampStatus.ACTIVE, label: 'Active' },
            { value: TaxStampStatus.VOID, label: 'Void' },
            { value: TaxStampStatus.FLAGGED, label: 'Flagged' }]
            }
            className="sm:w-44" />
          
        </div>

        <Table
          columns={columns}
          data={filtered}
          loading={loading}
          emptyMessage="No tax stamps found" />
        
      </div>
    </div>);

};

export default OfficerTaxStamps;