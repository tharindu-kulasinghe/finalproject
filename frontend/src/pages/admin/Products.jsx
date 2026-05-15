import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader';
import Table from '../../components/common/Table';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import SelectDropdown from '../../components/common/SelectDropdown';
import productApi from '../../services/productApi';

const AdminProducts = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const manufacturerId = searchParams.get('manufacturerId') || '';

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ category: '', isActive: '' });

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (manufacturerId) params.manufacturerId = manufacturerId;
      if (filter.category) params.category = filter.category;
      if (filter.isActive === 'true' || filter.isActive === 'false') params.isActive = filter.isActive;

      const res = await productApi.getProducts(params);
      setProducts(res.data?.data?.products || []);
    } catch (err) {
      console.error(err);
      setProducts([]);
      toast.error(err.response?.data?.message || 'Failed to load products');
    } finally
    {setLoading(false);}
  }, [filter, manufacturerId]);

  useEffect(() => {fetchProducts();}, [fetchProducts]);

  const columns = [
  { key: 'code', header: 'Code' },
  { key: 'name', header: 'Name' },
  {
    key: 'manufacturer',
    header: 'Manufacturer',
    render: (row) => row.manufacturer?.companyName || row.manufacturer?.fullName || '-'
  },
  { key: 'category', header: 'Category' },
  { key: 'packType', header: 'Pack Type' },
  { key: 'isActive', header: 'Status', render: (row) => <Badge variant={row.isActive ? 'success' : 'danger'}>{row.isActive ? 'Active' : 'Inactive'}</Badge> },
  { key: 'createdAt', header: 'Created', render: (row) => new Date(row.createdAt).toLocaleDateString() },
  {
    key: 'actions', header: 'Actions', render: (row) =>
    <div className="flex gap-2">
          <Button
        size="sm"
        variant="outline"
        onClick={() => {
          const ownerId = row.manufacturer?.id || row.manufacturerId;
          if (!ownerId) {
            toast.error('Manufacturer details not available for this product');
            return;
          }
          navigate(`/admin/manufacturers/${ownerId}`);
        }}>
        
            View
          </Button>
        </div>

  }];


  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description={manufacturerId ? 'Manage products for selected manufacturer' : 'Manage products'}
        actions={
        <div>
            {manufacturerId &&
          <Button variant="outline" onClick={() => navigate('/admin/products')}>Show All Products</Button>
          }
          </div>
        } />
      
      <div className="border border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
          <SelectDropdown
            value={filter.category}
            onChange={(e) => setFilter({ ...filter, category: e.target.value })}
            options={[
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
            { value: 'OTHER', label: 'Other' }]
            }
            className="sm:w-40" />
          
          <SelectDropdown
            value={filter.isActive}
            onChange={(e) => setFilter({ ...filter, isActive: e.target.value })}
            options={[
            { value: '', label: 'All Status' },
            { value: 'true', label: 'Active' },
            { value: 'false', label: 'Inactive' }]
            }
            className="sm:w-40" />
          
        </div>
        <Table columns={columns} data={products} loading={loading} emptyMessage="No products found" />
      </div>
    </div>);

};

export default AdminProducts;