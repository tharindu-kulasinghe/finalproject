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
    CANCELLED: 'danger',
    REJECTED: 'danger'
  };

  return colors[status] || 'gray';
};

const RetailAllOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
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

  const allMyOrders = useMemo(
    () => orders.filter((item) => item.receiverId === userId || item.senderId === userId),
    [orders, userId]
  );

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return allMyOrders.filter((order) => {
      if (filter && order.status !== filter) return false;
      if (!keyword) return true;

      const counterparty =
        order.senderId === userId
          ? order.receiver?.companyName || order.receiver?.fullName || ''
          : order.sender?.companyName || order.sender?.fullName || '';

      return [
        order.orderNo,
        order.product?.name,
        counterparty
      ].some((value) => String(value || '').toLowerCase().includes(keyword));
    });
  }, [allMyOrders, filter, search, userId]);

  const columns = [
    {
      key: 'orderNo',
      header: 'Order No',
      render: (row) => (
        <span className="font-mono text-xs font-medium text-gray-900">{row.orderNo}</span>
      )
    },
    {
      key: 'direction',
      header: 'Direction',
      render: (row) =>
        row.senderId === userId
          ? <span className="text-xs font-medium text-blue-700">Outgoing</span>
          : <span className="text-xs font-medium text-emerald-700">Incoming</span>
    },
    {
      key: 'counterparty',
      header: 'Counterparty',
      render: (row) => {
        const isSender = row.senderId === userId;
        const party = isSender ? row.receiver : row.sender;
        return (
          <div>
            <div className="text-sm text-gray-900">
              {party?.companyName || party?.fullName || '-'}
            </div>
          </div>
        );
      }
    },
    {
      key: 'product',
      header: 'Product',
      render: (row) => (
        <div>
          <div className="text-sm text-gray-900">{row.product?.name || '-'}</div>
          <div className="text-xs text-gray-500">{row.product?.code || '-'}</div>
        </div>
      )
    },
    {
      key: 'quantity',
      header: 'Quantity',
      render: (row) => <span className="text-sm">{row.quantity} {row.unit}</span>
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={getStatusColor(row.status)}>
          {row.status}
        </Badge>
      )
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (row) => (row.createdAt ? formatDate(row.createdAt) : '-')
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="flex gap-2 justify-end">
          <Link to={`/retail/incoming-orders/${row.id}`}>
            <Button size="sm" variant="outline">
              View
            </Button>
          </Link>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="All Orders"
        description="View all your incoming and outgoing distribution orders"
      />

      <div className="border border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search orders..."
            className="sm:w-72"
          />

          <SelectDropdown
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            options={[
              { value: '', label: 'All Status' },
              { value: 'PENDING', label: 'Pending' },
              { value: 'DISPATCHED', label: 'Dispatched' },
              { value: 'RECEIVED', label: 'Received' },
              { value: 'REJECTED', label: 'Rejected' },
              { value: 'CANCELLED', label: 'Cancelled' }
            ]}
            className="sm:w-40"
          />
        </div>

        <Table
          columns={columns}
          data={filtered}
          loading={loading}
          emptyMessage="No orders found"
        />
      </div>
    </div>
  );
};

export default RetailAllOrders;

