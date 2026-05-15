import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import Table from '../../components/common/Table';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import SearchBar from '../../components/common/SearchBar';
import SelectDropdown from '../../components/common/SelectDropdown';
import distributionApi from '../../services/distributionApi';
import { formatDate } from '../../utils/formatDate';

const getStatusColor = (status) => {
  const colors = {
    PENDING: 'warning',
    DISPATCHED: 'info',
    RECEIVED: 'success',
    CANCELLED: 'danger'
  };
  return colors[status] || 'gray';
};

const IncomingOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('PENDING');
  const [receivingId, setReceivingId] = useState('');
  const [userId, setUserId] = useState('');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUserId(parsedUser?.id || '');
      } catch (_) {
        setUserId('');
      }
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter) params.status = filter;
      const res = await distributionApi.getOrders(params);
      setOrders(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleReceive = async (id) => {
    setReceivingId(id);
    try {
      await distributionApi.receiveOrder(id);
      await fetchOrders();
    } catch (err) {
      console.error('Failed to receive order:', err);
    } finally {
      setReceivingId('');
    }
  };

  const incomingOrders = useMemo(
    () => orders.filter((item) => item.receiverId === userId),
    [orders, userId]
  );

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return incomingOrders.filter((order) => {
      if (filter && order.status !== filter) return false;
      if (!keyword) return true;

      const sourceName = order.sender?.companyName || order.sender?.fullName || '';
      return [order.orderNo, order.product?.name, sourceName].
      some((value) => String(value || '').toLowerCase().includes(keyword));
    });
  }, [incomingOrders, filter, search]);

  const columns = [
  {
    key: 'orderNo',
    header: 'Order No',
    render: (row) => <span className="font-mono text-xs font-medium text-gray-900">{row.orderNo}</span>
  },
  {
    key: 'product',
    header: 'Product',
    render: (row) => row.product?.name || '-'
  },
  {
    key: 'sender',
    header: 'From',
    render: (row) => row.sender?.companyName || row.sender?.fullName || '-'
  },
  {
    key: 'quantity',
    header: 'Quantity',
    render: (row) => <span className="text-sm">{row.quantity} {row.unit}</span>
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <Badge variant={getStatusColor(row.status)}>{row.status}</Badge>
  },
  {
    key: 'dispatchedAt',
    header: 'Dispatched',
    render: (row) => row.dispatchedAt ? formatDate(row.dispatchedAt) : '-'
  },
  {
    key: 'actions',
    header: '',
    render: (row) =>
    <div className="flex gap-2">
          <Link to={`/distributor/incoming-orders/${row.id}`}>
            <Button size="sm" variant="outline">View</Button>
          </Link>
          {(row.status === 'PENDING' || row.status === 'DISPATCHED') &&
      <Button size="sm" onClick={() => handleReceive(row.id)} loading={receivingId === row.id}>
              Accept
            </Button>
      }
        </div>

  }];


  return (
    <div className="space-y-6">
      <PageHeader title="Incoming Orders" description="Accept pending or dispatched distribution orders" />

      <div className="border border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search orders..."
            className="sm:w-72" />
          
          <SelectDropdown
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            options={[
            { value: '', label: 'All Status' },
            { value: 'PENDING', label: 'Pending' },
            { value: 'DISPATCHED', label: 'Dispatched' },
            { value: 'RECEIVED', label: 'Received' },
            { value: 'CANCELLED', label: 'Cancelled' }]
            }
            className="sm:w-40" />
          
        </div>

        <Table columns={columns} data={filtered} loading={loading} emptyMessage="No orders found" />
      </div>

    </div>);

};

export default IncomingOrders;