import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import PageHeader from '../../../components/common/PageHeader';
import Table from '../../../components/common/Table';
import Badge from '../../../components/common/Badge';
import getStatusColor from '../../../utils/getStatusColor';
import Button from '../../../components/common/Button';
import Modal from '../../../components/common/Modal';
import SearchBar from '../../../components/common/SearchBar';
import SelectDropdown from '../../../components/common/SelectDropdown';
import Textarea from '../../../components/common/Textarea';
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


const AdminBatches = () => {
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [reviewAction, setReviewAction] = useState(null);
  const [remarks, setRemarks] = useState('');

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;
      const res = await batchApi.getBatches(params);
      setBatches(res.data?.data?.batches || []);
    } catch (err) {
      console.error('Failed to load batches:', err);
      toast.error(err.response?.data?.message || 'Failed to load batches');
      setBatches([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const openReviewModal = (batch, action) => {
    setReviewAction({ id: batch.id, type: action, batchNo: batch.batchNo });
    setRemarks('');
  };

  const handleReview = async () => {
    if (!reviewAction) return;

    try {
      setActionLoading(true);
      if (reviewAction.type === 'verify') {
        await batchApi.verifyBatch(reviewAction.id, remarks);
      } else {
        await batchApi.rejectBatch(reviewAction.id, remarks);
      }
      toast.success(`Batch ${reviewAction.type === 'verify' ? 'verified' : 'flagged'} successfully`);
      setReviewAction(null);
      setRemarks('');
      await fetchBatches();
    } catch (err) {
      console.error('Failed to process batch review:', err);
      toast.error(err.response?.data?.message || 'Failed to process batch review');
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = useMemo(() => batches.filter((item) =>
  !search ||
  item.batchNo?.toLowerCase().includes(search.toLowerCase()) ||
  item.product?.name?.toLowerCase().includes(search.toLowerCase()) ||
  item.product?.code?.toLowerCase().includes(search.toLowerCase()) ||
  item.license?.companyName?.toLowerCase().includes(search.toLowerCase())
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
          <p className="font-medium text-gray-900">{row.product?.name || '-'}</p>
          <p className="text-xs text-gray-500">{row.product?.code || '-'}</p>
        </div>

  },
  { key: 'category', header: 'Category', render: (row) => row.product?.category || '-' },
  { key: 'manufacturer', header: 'Manufacturer', render: (row) => row.license?.companyName || '-' },
  { key: 'outputLiters', header: 'Output (L)', render: (row) => formatNumber(row.outputLiters) },
  { key: 'unitsProduced', header: 'Units', render: (row) => formatNumber(row.unitsProduced) },
  { key: 'status', header: 'Status', render: (row) => <Badge variant={getStatusColor(row.status)}>{row.status}</Badge> },
  { key: 'productionDate', header: 'Date', render: (row) => formatDate(row.productionDate) },
  {
    key: 'actions',
    header: 'Actions',
    render: (row) =>
    <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate(`/admin/batches/${row.id}`)}>
            View
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate(`/admin/batches/${row.id}/edit`)}>
            Edit
          </Button>
          {row.status === 'SUBMITTED' &&
      <>
              <Button size="sm" onClick={() => openReviewModal(row, 'verify')}>
                Verify
              </Button>
              <Button size="sm" variant="danger" onClick={() => openReviewModal(row, 'reject')}>
                Reject
              </Button>
            </>
      }
        </div>

  }];


  return (
    <div className="space-y-6">
      <PageHeader
        title="Production Batches"
        description="Manage daily production updates and verification actions" />
      

      <div className="border border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search batch, product, or manufacturer..."
            className="sm:w-72" />
          
          <SelectDropdown
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            options={CATEGORY_OPTIONS}
            className="sm:w-52" />
          
          <SelectDropdown
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
            { value: '', label: 'All Status' },
            { value: 'DRAFT', label: 'Draft' },
            { value: 'FLAGGED', label: 'Flagged' },
            { value: 'SUBMITTED', label: 'Submitted' },
            { value: 'VERIFIED', label: 'Verified' }]
            }
            className="sm:w-40" />
          
        </div>

        <Table
          columns={columns}
          data={filtered}
          loading={loading}
          emptyMessage="No batches found" />
        
      </div>

      <Modal
        isOpen={!!reviewAction}
        onClose={() => {
          setReviewAction(null);
          setRemarks('');
        }}
        title={reviewAction?.type === 'verify' ? 'Verify Batch' : 'Reject Batch'}
        size="md">
        
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Batch: <span className="font-medium text-gray-900">{reviewAction?.batchNo || '-'}</span>
          </p>
          <Textarea
            label="Remarks"
            rows={4}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder={reviewAction?.type === 'verify' ? 'Optional verification notes' : 'Reason for rejection'} />
          
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                setReviewAction(null);
                setRemarks('');
              }}>
              
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1"
              variant={reviewAction?.type === 'reject' ? 'danger' : 'primary'}
              loading={actionLoading}
              onClick={handleReview}>
              
              {reviewAction?.type === 'verify' ? 'Verify' : 'Reject'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>);

};

export default AdminBatches;