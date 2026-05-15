import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader';
import Table from '../../components/common/Table';
import Badge from '../../components/common/Badge';
import SelectDropdown from '../../components/common/SelectDropdown';
import productApi from '../../services/productApi';
import licenseApi from '../../services/licenseApi';
import { formatDate } from '../../utils/formatDate';

const CATEGORY_OPTIONS = [
{ value: '', label: 'Select Category' },
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


const Products = () => {
  const [products, setProducts] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ category: '', isActive: '', licenseId: '' });

  const manufacturingLicenses = useMemo(() => {
    return licenses.filter((license) => license.type === 'MANUFACTURING');
  }, [licenses]);

  const licenseOptions = useMemo(() => [
  { value: '', label: 'All Licenses' },
  ...manufacturingLicenses.map((license) => ({
    value: license.id,
    label: `${license.licenseNumber}`
  }))],
  [manufacturingLicenses]);

  const licenseMetaById = useMemo(() => {
    const map = {};
    manufacturingLicenses.forEach((license) => {
      map[license.id] = license;
    });
    return map;
  }, [manufacturingLicenses]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 200 };
      if (filter.category) params.category = filter.category;
      if (filter.isActive === 'true' || filter.isActive === 'false') params.isActive = filter.isActive;
      if (filter.licenseId) params.licenseId = filter.licenseId;

      const [productsRes, licensesRes] = await Promise.all([
      productApi.getProducts(params),
      licenseApi.getMyLicenses()]
      );

      setProducts(productsRes.data?.data?.products || []);
      setLicenses(licensesRes.data?.data?.licenses || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load product data');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const licenseScopedProducts = useMemo(() => {
    return products.filter((product) => {
      if (!product.licenseId) return false;
      return !!licenseMetaById[product.licenseId];
    });
  }, [products, licenseMetaById]);

  const columns = [
  { key: 'code', header: 'Code' },
  { key: 'name', header: 'Name' },
  { key: 'category', header: 'Category' },
  { key: 'packType', header: 'Pack Type', render: (row) => row.packType || '-' },
  {
    key: 'licenseNumber',
    header: 'License',
    render: (row) => row.license?.licenseNumber || licenseMetaById[row.licenseId]?.licenseNumber || '-'
  },
  {
    key: 'licenseEffectiveTo',
    header: 'License Expiry',
    render: (row) => formatDate(licenseMetaById[row.licenseId]?.effectiveTo)
  },
  {
    key: 'isActive',
    header: 'Status',
    render: (row) => <Badge variant={row.isActive ? 'success' : 'danger'}>{row.isActive ? 'Active' : 'Inactive'}</Badge>
  },
  { key: 'createdAt', header: 'Created', render: (row) => row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '-' }];


  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="View products linked to your manufacturing licenses" />
      

      <div className="border border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
          <SelectDropdown
            value={filter.category}
            onChange={(e) => setFilter({ ...filter, category: e.target.value })}
            options={[
            { value: '', label: 'All Categories' },
            ...CATEGORY_OPTIONS.filter((opt) => opt.value)]
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
          
          <SelectDropdown
            value={filter.licenseId}
            onChange={(e) => setFilter({ ...filter, licenseId: e.target.value })}
            options={licenseOptions}
            className="sm:w-52" />
          
        </div>
        <Table columns={columns} data={licenseScopedProducts} loading={loading} emptyMessage="No products found" />
      </div>
    </div>);

};

export default Products;