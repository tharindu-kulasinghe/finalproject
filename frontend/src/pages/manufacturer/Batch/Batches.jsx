import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
import batchApi from '../../../services/batchApi';

const CATEGORY_OPTIONS = [
{ value: '', label: 'All Categories' },
{ value: 'ARRACK', label: 'Arrack' },
{ value: 'WHISKY', label: 'Whisky' },
{ value: 'BRANDY', label: 'Brandy' },
{ value: 'VODKA', label: 'Vodka' },
{ value: 'GIN', label: 'Gin' },
{ value: 'RUM', label: 'Rum' },
{ value: 'BEER', label: 'Beer' },
{ value: 'WINE', label: 'Wine' },
{ value: 'TODDY', label: 'Toddy' },
{ value: 'LIQUOR_BASED_PRODUCT', label: 'Liquor Based Product' },
{ value: 'TOBACCO', label: 'Tobacco' },
{ value: 'OTHER', label: 'Other' }];


const STATUS_OPTIONS = [
{ value: '', label: 'All Status' },
{ value: 'DRAFT', label: 'Draft' },
{ value: 'FLAGGED', label: 'Flagged' },
{ value: 'SUBMITTED', label: 'Submitted' },
{ value: 'VERIFIED', label: 'Verified' }];


const isEditableStatus = (status) => status === 'DRAFT' || status === 'FLAGGED';

const Batches = () => {
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoadingId, setSubmitLoadingId] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;
      const res = await batchApi.getBatches(params);
      setBatches(res.data?.data?.batches || []);
    } catch (err) {
      console.error('Failed to fetch batches:', err);
      toast.error(err.response?.data?.message || 'Failed to load batches');
      setBatches([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const handleSubmitBatch = async (batchId) => {
    setSubmitLoadingId(batchId);
    try {
      await batchApi.submitBatch(batchId);
      toast.success('Batch submitted for verification');
      await fetchBatches();
    } catch (err) {
      console.error('Failed to submit batch:', err);
      toast.error(err.response?.data?.message || 'Failed to submit batch');
    } finally {
      setSubmitLoadingId('');
    }
  };

  const filtered = useMemo(() => batches.filter(
    (item) =>
    !search ||
    item.batchNo?.toLowerCase().includes(search.toLowerCase()) ||
    item.product?.name?.toLowerCase().includes(search.toLowerCase()) ||
    item.product?.code?.toLowerCase().includes(search.toLowerCase()) ||
    item.license?.licenseNumber?.toLowerCase().includes(search.toLowerCase())
  ), [batches, search]);

  const columns = [
  {
    key: 'batchNo',
    header: 'Batch No',
    render: (row) => <span className="font-mono text-xs font-medium text-gray-900">{row.batchNo}</span>
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
    key: 'category',
    header: 'Category',
    render: (row) => row.product?.category || '-'
  },
  {
    key: 'productionDate',
    header: 'Production Date',
    render: (row) => <span className="text-sm text-gray-700">{formatDate(row.productionDate)}</span>
  },
  {
    key: 'outputLiters',
    header: 'Output (L)',
    render: (row) => <span className="text-sm text-gray-700">{formatNumber(row.outputLiters)}</span>
  },
  {
    key: 'unitsProduced',
    header: 'Units',
    render: (row) => <span className="text-sm text-gray-700">{formatNumber(row.unitsProduced)}</span>
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <Badge variant={getStatusColor(row.status)} size="sm">{row.status}</Badge>
  },
  {
    key: 'actions',
    header: 'Actions',
    render: (row) =>
    <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate(`/manufacturer/batches/${row.id}`)}>
            View
          </Button>
          {isEditableStatus(row.status) &&
      <Button size="sm" variant="outline" onClick={() => navigate(`/manufacturer/batches/${row.id}/edit`)}>
              Edit
            </Button>
      }
          {isEditableStatus(row.status) &&
      <Button size="sm" loading={submitLoadingId === row.id} onClick={() => handleSubmitBatch(row.id)}>
              Submit
            </Button>
      }
        </div>

  }];


  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily Production Batches"
        description="View, add, edit and submit daily production batch records"
        actions={<Button onClick={() => navigate('/manufacturer/batches/add')}>Add Daily Batch</Button>} />
      

      <div className="border border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search batch, product, or license..."
            className="sm:w-72" />
          
          <SelectDropdown
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            options={CATEGORY_OPTIONS}
            className="sm:w-52" />
          
          <SelectDropdown
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={STATUS_OPTIONS}
            className="sm:w-40" />
          
        </div>
        <Table
          columns={columns}
          data={filtered}
          loading={loading}
          emptyMessage="No batches found. Add your first daily production entry." />
        
      </div>
    </div>);

};

export default Batches;