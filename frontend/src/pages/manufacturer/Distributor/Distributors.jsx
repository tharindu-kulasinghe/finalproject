import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../../components/common/PageHeader';
import Table from '../../../components/common/Table';
import Badge from '../../../components/common/Badge';
import Button from '../../../components/common/Button';
import SearchBar from '../../../components/common/SearchBar';
import SelectDropdown from '../../../components/common/SelectDropdown';
import getStatusColor from '../../../utils/getStatusColor';
import api from '../../../services/api';

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
};

const Distributors = () => {
  const [distributors, setDistributors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [licenseTypeFilter, setLicenseTypeFilter] = useState('');

  const fetchDistributors = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/manufacturers/available/distributors');
      setDistributors(response.data?.data || []);
    } catch (error) {
      console.error('Failed to fetch available distributors:', error);
      setDistributors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDistributors();
  }, [fetchDistributors]);

  const licenseTypeOptions = useMemo(() => {
    const uniqueTypes = [...new Set(distributors.map((item) => item.license?.type).filter(Boolean))];
    return [
    { value: '', label: 'All License Types' },
    ...uniqueTypes.map((type) => ({ value: type, label: type }))];

  }, [distributors]);

  const filteredDistributors = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return distributors.filter((row) => {
      if (licenseTypeFilter && row.license?.type !== licenseTypeFilter) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      return `${row.fullName || ''} ${row.companyName || ''} ${row.email || ''} ${row.mobile || ''} ${row.address || ''} ${row.license?.licenseNumber || ''}`.
      toLowerCase().
      includes(keyword);
    });
  }, [distributors, search, licenseTypeFilter]);

  const columns = [
  { key: 'fullName', header: 'Name' },
  { key: 'companyName', header: 'Company', render: (row) => row.companyName || '-' },
  { key: 'email', header: 'Email' },
  { key: 'mobile', header: 'Mobile', render: (row) => row.mobile || '-' },
  {
    key: 'licenseNumber',
    header: 'License Number',
    render: (row) => row.license?.licenseNumber || '-'
  },
  {
    key: 'licenseType',
    header: 'License Type',
    render: (row) => row.license?.type ? <Badge variant="info">{row.license.type}</Badge> : '-'
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <Badge variant={getStatusColor(row.license?.status || 'ACTIVE')}>{row.license?.status || 'ACTIVE'}</Badge>
  },
  {
    key: 'effectiveTo',
    header: 'Valid To',
    render: (row) => formatDate(row.license?.effectiveTo)
  },
  {
    key: 'actions',
    header: 'Actions',
    render: (row) =>
    <div className="flex gap-2">
          <Link to={`/manufacturer/distributors/${row.id}`}>
            <Button variant="outline" size="sm">View</Button>
          </Link>
          <Link to={`/manufacturer/distributions/add?receiverId=${row.id}`}>
            <Button size="sm">Add Distribution</Button>
          </Link>
        </div>

  }];


  return (
    <div className="space-y-6">
      <PageHeader
        title="Available Distributors"
        description="View all active distributors available for product distribution" />
      

      <div className="border border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search distributors..."
            className="sm:w-72" />
          
          <SelectDropdown
            value={licenseTypeFilter}
            onChange={(e) => setLicenseTypeFilter(e.target.value)}
            options={licenseTypeOptions}
            className="sm:w-56" />
          
        </div>
        <Table
          columns={columns}
          data={filteredDistributors}
          loading={loading}
          emptyMessage="No available distributors found" />
        
      </div>
    </div>);

};

export default Distributors;