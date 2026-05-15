import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../../components/common/PageHeader';
import Table from '../../../components/common/Table';
import Badge from '../../../components/common/Badge';
import Button from '../../../components/common/Button';
import SearchBar from '../../../components/common/SearchBar';
import SelectDropdown from '../../../components/common/SelectDropdown';
import getStatusColor from '../../../utils/getStatusColor';
import distributorApi from '../../../services/distributorApi';

const Distributors = () => {
  const [distributors, setDistributors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');

  const fetchDistributors = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter) params.status = filter;

      const response = await distributorApi.getDistributors(params);
      setDistributors(response.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch distributors:', err);
      setDistributors([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchDistributors();
  }, [fetchDistributors]);

  const filteredDistributors = useMemo(() => {
    if (!search.trim()) return distributors;

    const keyword = search.trim().toLowerCase();
    return distributors.filter((row) =>
    `${row.fullName || ''} ${row.companyName || ''} ${row.email || ''} ${row.mobile || ''}`.
    toLowerCase().
    includes(keyword)
    );
  }, [distributors, search]);

  const columns = [
  { key: 'fullName', header: 'Name' },
  { key: 'companyName', header: 'Company' },
  { key: 'email', header: 'Email' },
  { key: 'mobile', header: 'Mobile' },
  {
    key: 'submittedDistributionApps',
    header: 'License App',
    render: (row) => {
      const latestApp = row.submittedDistributionApps?.[0];
      return latestApp ?
      <Badge variant={getStatusColor(latestApp.status)}>{latestApp.status}</Badge> :

      <span className="text-gray-500">No app</span>;

    }
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <Badge variant={getStatusColor(row.status)}>{row.status || 'PENDING'}</Badge>
  },
  {
    key: 'createdAt',
    header: 'Created',
    render: (row) => row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '-'
  },
  {
    key: 'actions',
    header: 'Actions',
    render: (row) =>
    <div className="flex gap-2">
          <Link to={`/admin/distributors/${row.id}`}>
            <Button variant="outline" size="sm">View</Button>
          </Link>
          <Link to={`/admin/distributors/${row.id}/edit`}>
            <Button variant="outline" size="sm">Edit</Button>
          </Link>
        </div>

  }];


  return (
    <div className="space-y-6">
      <PageHeader
        title="Distributors"
        description="Manage distributor accounts"
        actions={
        <Link to="/admin/distributors/add">
            <Button>Add Distributor</Button>
          </Link>
        } />
      

      <div className="border border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search distributors..."
            className="sm:w-72" />
          
          <SelectDropdown
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            options={[
            { value: '', label: 'All Status' },
            { value: 'PENDING', label: 'Pending' },
            { value: 'ACTIVE', label: 'Active' },
            { value: 'INACTIVE', label: 'Inactive' },
            { value: 'SUSPENDED', label: 'Suspended' }]
            }
            className="sm:w-40" />
          
        </div>
        <Table columns={columns} data={filteredDistributors} loading={loading} emptyMessage="No distributors found" />
      </div>
    </div>);

};

export default Distributors;