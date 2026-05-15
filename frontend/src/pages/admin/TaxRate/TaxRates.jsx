import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../../components/common/PageHeader';
import Table from '../../../components/common/Table';
import Badge from '../../../components/common/Badge';
import Button from '../../../components/common/Button';
import SearchBar from '../../../components/common/SearchBar';
import SelectDropdown from '../../../components/common/SelectDropdown';
import taxRateApi from '../../../services/taxRateApi';
import { formatCurrency } from '../../../utils/formatCurrency';
import { formatDate } from '../../../utils/formatDate';
import { TAX_RATE_CATEGORY_OPTIONS, formatCategoryLabel } from './taxRateUtils';

const AdminTaxRates = () => {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const fetchRates = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (categoryFilter) params.category = categoryFilter;
      if (statusFilter === 'ACTIVE') params.isActive = true;
      if (statusFilter === 'INACTIVE') params.isActive = false;

      const response = await taxRateApi.getTaxRates(params);
      setRates(response.data?.data?.taxRates || []);
    } catch (error) {
      console.error('Failed to fetch tax rates', error);
      setRates([]);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, statusFilter]);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const filteredRates = useMemo(() => {
    if (!search.trim()) return rates;

    const keyword = search.trim().toLowerCase();
    return rates.filter((rate) => {
      const fields = [
      rate.category,
      rate.legalReference];

      return fields.some((field) => String(field || '').toLowerCase().includes(keyword));
    });
  }, [rates, search]);

  const summary = useMemo(() => {
    const activeCount = rates.filter((item) => item.isActive).length;
    const inactiveCount = rates.length - activeCount;

    return {
      total: rates.length,
      active: activeCount,
      inactive: inactiveCount
    };
  }, [rates]);

  const handleToggleStatus = async (id) => {
    try {
      await taxRateApi.toggleTaxRate(id);
      fetchRates();
    } catch (error) {
      console.error('Failed to toggle tax rate status', error);
    }
  };

  const columns = [
  {
    key: 'category',
    header: 'Category',
    render: (row) => <span className="font-medium text-gray-900">{formatCategoryLabel(row.category)}</span>
  },
  {
    key: 'ratePerLiter',
    header: 'Rate Per Liter',
    render: (row) => row.ratePerLiter != null ? formatCurrency(row.ratePerLiter) : '-'
  },
  {
    key: 'ratePerUnit',
    header: 'Rate Per Unit',
    render: (row) => row.ratePerUnit != null ? formatCurrency(row.ratePerUnit) : '-'
  },
  {
    key: 'effectiveFrom',
    header: 'Effective Window',
    render: (row) => {
      const start = formatDate(row.effectiveFrom);
      const end = row.effectiveTo ? formatDate(row.effectiveTo) : 'Open ended';
      return `${start} - ${end}`;
    }
  },
  {
    key: 'isActive',
    header: 'Status',
    render: (row) =>
    <Badge variant={row.isActive ? 'success' : 'default'}>
          {row.isActive ? 'ACTIVE' : 'INACTIVE'}
        </Badge>

  },
  {
    key: 'actions',
    header: 'Actions',
    render: (row) =>
    <div className="flex flex-wrap gap-2">
          <Link to={`/admin/tax-rates/${row.id}`}>
            <Button variant="outline" size="sm">View</Button>
          </Link>
          <Link to={`/admin/tax-rates/${row.id}/edit`}>
            <Button variant="outline" size="sm">Edit</Button>
          </Link>
          <Button
        variant="outline"
        size="sm"
        onClick={() => handleToggleStatus(row.id)}>
        
            {row.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        </div>

  }];


  return (
    <div className="space-y-6">
      <PageHeader
        title="Tax Rates"
        description="Manage duty and excise tax rates by product category"
        actions={
        <Link to="/admin/tax-rates/add">
            <Button>Add Tax Rate</Button>
          </Link>
        } />
      

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Total Rates</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{summary.total}</p>
        </div>
        <div className="border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Active Rates</p>
          <p className="text-2xl font-semibold text-green-700 mt-1">{summary.active}</p>
        </div>
        <div className="border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Inactive Rates</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{summary.inactive}</p>
        </div>
      </div>

      <div className="border border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-3">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by category or legal reference"
            className="md:w-80" />
          
          <SelectDropdown
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            options={[{ value: '', label: 'All Categories' }, ...TAX_RATE_CATEGORY_OPTIONS]}
            className="md:w-56" />
          
          <SelectDropdown
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            options={[
            { value: '', label: 'All Status' },
            { value: 'ACTIVE', label: 'Active' },
            { value: 'INACTIVE', label: 'Inactive' }]
            }
            className="md:w-44" />
          
        </div>

        <Table
          columns={columns}
          data={filteredRates}
          loading={loading}
          emptyMessage="No tax rates found" />
        
      </div>
    </div>);

};

export default AdminTaxRates;