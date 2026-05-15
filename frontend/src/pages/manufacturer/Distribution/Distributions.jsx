import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Plus } from 'lucide-react';
import PageHeader from '../../../components/common/PageHeader';
import Table from '../../../components/common/Table';
import Badge from '../../../components/common/Badge';
import Button from '../../../components/common/Button';
import SearchBar from '../../../components/common/SearchBar';
import SelectDropdown from '../../../components/common/SelectDropdown';
import ConfirmDialog from '../../../components/common/ConfirmDialog';
import getStatusColor from '../../../utils/getStatusColor';
import { formatDate } from '../../../utils/formatters';
import api from '../../../services/api';
import { DistributionOrderStatus } from '../../../constants/statusConstants';

const STATUS_OPTIONS = [
{ value: '', label: 'All Status' },
{ value: DistributionOrderStatus.PENDING, label: 'Pending' },
{ value: DistributionOrderStatus.DISPATCHED, label: 'Dispatched' },
{ value: DistributionOrderStatus.RECEIVED, label: 'Received' },
{ value: DistributionOrderStatus.REJECTED, label: 'Rejected' },
{ value: DistributionOrderStatus.CANCELLED, label: 'Cancelled' }];


const Distributions = () => {
  const [distributions, setDistributions] = useState([]);
  const [receivers, setReceivers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dispatchConfirmId, setDispatchConfirmId] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    receiverId: '',
    productId: ''
  });

  const fetchPageData = useCallback(async () => {
    setLoading(true);
    try {
      const [distributionsRes, distributorsRes, retailersRes, productsRes] = await Promise.all([
      api.get('/distributions'),
      api.get('/manufacturers/available/distributors'),
      api.get('/manufacturers/available/retailers'),
      api.get('/products')]
      );

      setDistributions(distributionsRes.data?.data || []);

      const allReceivers = [
      ...(distributorsRes.data?.data || []).map((item) => ({ ...item, type: 'DISTRIBUTOR' })),
      ...(retailersRes.data?.data || []).map((item) => ({ ...item, type: 'RETAILER' }))];


      setReceivers(allReceivers);
      setProducts(productsRes.data?.data?.products || productsRes.data?.products || []);
    } catch (error) {
      console.error('Failed to fetch distribution page data:', error);
      setDistributions([]);
      setReceivers([]);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);

  const receiverTypeMap = useMemo(() => {
    const map = new Map();
    receivers.forEach((receiver) => {
      map.set(receiver.id, receiver.type);
    });
    return map;
  }, [receivers]);

  const receiverOptions = useMemo(
    () => [
    { value: '', label: 'All Receivers' },
    ...receivers.map((receiver) => ({
      value: receiver.id,
      label: `${receiver.companyName || receiver.fullName} (${receiver.type})`
    }))],

    [receivers]
  );

  const productOptions = useMemo(
    () => [
    { value: '', label: 'All Products' },
    ...products.map((product) => ({
      value: product.id,
      label: `${product.name || '-'} (${product.code || '-'})`
    }))],

    [products]
  );

  const filteredDistributions = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return distributions.filter((row) => {
      if (filters.status && row.status !== filters.status) return false;
      if (filters.receiverId && row.receiverId !== filters.receiverId) return false;
      if (filters.productId && row.productId !== filters.productId) return false;

      if (!keyword) return true;

      return `${row.orderNo || ''} ${row.receiver?.companyName || ''} ${row.receiver?.fullName || ''} ${row.receiver?.email || ''} ${row.product?.name || ''} ${row.product?.code || ''}`.
      toLowerCase().
      includes(keyword);
    });
  }, [distributions, search, filters]);

  const handleDispatch = async (id) => {
    try {
      await api.patch(`/distributions/${id}/dispatch`);
      toast.success('Order dispatched successfully');
      setDispatchConfirmId(null);
      fetchPageData();
    } catch (error) {
      console.error('Failed to dispatch order:', error);
      toast.error(error.response?.data?.message || 'Failed to dispatch order');
    }
  };

  const columns = [
  {
    key: 'orderNo',
    header: 'Order No',
    render: (row) =>
    <Link to={`/manufacturer/distributions/${row.id}`} className="font-medium text-primary-700 hover:text-primary-800 hover:underline">
          {row.orderNo}
        </Link>

  },
  {
    key: 'receiver',
    header: 'Receiver',
    render: (row) => {
      const receiverType = receiverTypeMap.get(row.receiver?.id) || 'RECEIVER';
      const receiverName = row.receiver?.companyName || row.receiver?.fullName || '-';

      return (
        <div className="space-y-0.5">
            {receiverType === 'DISTRIBUTOR' ?
          <Link to={`/manufacturer/distributors/${row.receiver?.id}`} className="font-medium text-primary-700 hover:text-primary-800 hover:underline">
                {receiverName}
              </Link> :

          <p className="font-medium text-gray-900">{receiverName}</p>
          }
            <p className="text-gray-500">{row.receiver?.email || '-'}</p>
            <Badge variant="info" size="sm">{receiverType}</Badge>
          </div>);

    }
  },
  {
    key: 'product',
    header: 'Product',
    render: (row) =>
    <div>
          <p className="font-medium text-gray-900">{row.product?.name || '-'}</p>
          <p className="text-gray-500">{row.product?.code || '-'}</p>
        </div>

  },
  {
    key: 'quantity',
    header: 'Quantity',
    render: (row) => `${row.quantity} ${row.unit}`
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <Badge variant={getStatusColor(row.status)}>{row.status}</Badge>
  },
  {
    key: 'createdAt',
    header: 'Created',
    render: (row) => formatDate(row.createdAt)
  },
  {
    key: 'actions',
    header: 'Actions',
    render: (row) =>
    <div className="flex gap-2">
          <Link to={`/manufacturer/distributions/${row.id}`}>
            <Button variant="outline" size="sm">View</Button>
          </Link>
          {row.status === DistributionOrderStatus.PENDING &&
      <Button size="sm" onClick={() => setDispatchConfirmId(row.id)}>
              Dispatch
            </Button>
      }
        </div>

  }];


  return (
    <div className="space-y-6">
      <PageHeader
        title="Distribution Orders"
        description="Manage your product distributions to distributors and retailers"
        actions={
        <div className="flex gap-2">
            <Link to="/manufacturer/distributions/add">
              <Button>
                <Plus size={16} className="mr-2" />
                Add Distribution
              </Button>
            </Link>
          </div>
        } />
      

      <div className="border border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-100 flex flex-col lg:flex-row gap-3">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search order number, receiver or product..."
            className="lg:w-80" />
          
          <SelectDropdown
            value={filters.status}
            onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
            options={STATUS_OPTIONS}
            className="lg:w-44" />
          
          <SelectDropdown
            value={filters.receiverId}
            onChange={(event) => setFilters((prev) => ({ ...prev, receiverId: event.target.value }))}
            options={receiverOptions}
            className="lg:w-72" />
          
          <SelectDropdown
            value={filters.productId}
            onChange={(event) => setFilters((prev) => ({ ...prev, productId: event.target.value }))}
            options={productOptions}
            className="lg:w-64" />
          
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSearch('');
              setFilters({ status: '', receiverId: '', productId: '' });
            }}>
            
            Clear
          </Button>
        </div>

        <Table
          columns={columns}
          data={filteredDistributions}
          loading={loading}
          emptyMessage="No distribution orders found" />
        
      </div>

      <ConfirmDialog
        isOpen={!!dispatchConfirmId}
        onClose={() => setDispatchConfirmId(null)}
        onConfirm={() => dispatchConfirmId && handleDispatch(dispatchConfirmId)}
        title="Dispatch Order"
        message="Are you sure you want to dispatch this order?"
        confirmText="Dispatch"
        variant="info" />
      
    </div>);

};

export default Distributions;