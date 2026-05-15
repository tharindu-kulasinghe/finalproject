import { useState, useEffect } from 'react';
import PageHeader from '../../components/common/PageHeader';
import Table from '../../components/common/Table';
import Badge from '../../components/common/Badge';
import SearchBar from '../../components/common/SearchBar';
import distributionApi from '../../services/distributionApi';

const Stock = () => {
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchStock = async () => {
    setLoading(true);
    try {
      const res = await distributionApi.getMyStock();
      setStock(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch stock:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStock();
  }, []);

  const columns = [
  {
    key: 'product',
    header: 'Product',
    render: (row) =>
    <div>
          <p className="text-sm font-medium text-gray-900">{row.product?.name}</p>
          <p className="text-xs text-gray-500">{row.product?.code}</p>
        </div>

  },
  {
    key: 'category',
    header: 'Category',
    render: (row) => row.product?.category || '-'
  },
  {
    key: 'available',
    header: 'Available',
    render: (row) =>
    <span className="text-lg font-semibold text-gray-900">{row.availableQuantity}</span>

  },
  {
    key: 'reserved',
    header: 'Reserved',
    render: (row) =>
    <span className="text-sm text-gray-600">{row.reservedQuantity || 0}</span>

  },
  {
    key: 'status',
    header: 'Stock Status',
    render: (row) => {
      const available = Number(row.availableQuantity || 0);
      const reserved = Number(row.reservedQuantity || 0);

      if (available > 0) {
        return <Badge variant="success">AVAILABLE</Badge>;
      }

      if (reserved > 0) {
        return <Badge variant="warning">RESERVED</Badge>;
      }

      return <Badge variant="default">EMPTY</Badge>;
    }
  },
  {
    key: 'updatedAt',
    header: 'Last Updated',
    render: (row) =>
    <span className="text-sm text-gray-500">
          {row.updatedAt ? new Date(row.updatedAt).toLocaleDateString() : '-'}
        </span>

  }];


  const totalAvailable = stock.reduce((sum, item) => sum + (item.availableQuantity || 0), 0);
  const totalReserved = stock.reduce((sum, item) => sum + (item.reservedQuantity || 0), 0);
  const filteredStock = stock.filter((item) => {
    if (!search.trim()) return true;
    const keyword = search.trim().toLowerCase();
    return [item.product?.name, item.product?.code, item.product?.category].
    some((value) => String(value || '').toLowerCase().includes(keyword));
  });

  return (
    <div className="space-y-6">
      <PageHeader title="My Stock" description="View your current inventory" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border border-gray-200 bg-white p-5">
          <p className="text-sm font-medium text-gray-500">Total Products</p>
          <p className="text-2xl font-bold text-gray-900">{stock.length}</p>
        </div>
        <div className="border border-gray-200 bg-white p-5">
          <p className="text-sm font-medium text-gray-500">Total Available</p>
          <p className="text-2xl font-bold text-gray-900">{totalAvailable.toLocaleString()}</p>
        </div>
        <div className="border border-gray-200 bg-white p-5">
          <p className="text-sm font-medium text-gray-500">Total Reserved</p>
          <p className="text-2xl font-bold text-gray-900">{totalReserved.toLocaleString()}</p>
        </div>
      </div>

      <div className="border border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-100">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search stock by product name, code, or category"
            className="sm:w-80" />
          
        </div>
        <Table columns={columns} data={filteredStock} loading={loading} emptyMessage="No stock items found" />
      </div>
    </div>);

};

export default Stock;