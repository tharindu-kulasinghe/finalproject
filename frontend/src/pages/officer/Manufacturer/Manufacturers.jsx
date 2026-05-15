import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../../components/common/PageHeader';
import Table from '../../../components/common/Table';
import Badge from '../../../components/common/Badge';
import Button from '../../../components/common/Button';
import SearchBar from '../../../components/common/SearchBar';
import SelectDropdown from '../../../components/common/SelectDropdown';
import getStatusColor from '../../../utils/getStatusColor';
import manufacturerApi from '../../../services/manufacturerApi';

const OfficerManufacturers = () => {
  const [manufacturers, setManufacturers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');

  const fetchManufacturers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (filter) params.status = filter;

      const response = await manufacturerApi.getManufacturers(params);
      setManufacturers(response.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch manufacturers:', err);
      setManufacturers([]);
    } finally {
      setLoading(false);
    }
  }, [search, filter]);

  useEffect(() => {
    fetchManufacturers();
  }, [fetchManufacturers]);

  const columns = [
  { key: 'fullName', header: 'Name' },
  { key: 'companyName', header: 'Company' },
  { key: 'email', header: 'Email' },
  { key: 'mobile', header: 'Mobile' },
  {
    key: 'submittedManufacturingApps',
    header: 'License App',
    render: (row) => {
      const latestApp = row.submittedManufacturingApps?.[0];
      return latestApp ?
      <Badge variant={getStatusColor(latestApp.status)}>{latestApp.status}</Badge> :

      <span className="text-gray-500">No app</span>;

    }
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <Badge variant={getStatusColor(row.status)}>{row.status}</Badge>
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
          <Link to={`/officer/manufacturers/${row.id}`}>
            <Button variant="outline" size="sm">View</Button>
          </Link>
        </div>

  }];


  return (
    <div className="space-y-6">
      <PageHeader
        title="Manufacturers"
        description="View manufacturer accounts and manufacturing license applications" />
      

      <div className="border border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search manufacturers..."
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
        <Table
          columns={columns}
          data={manufacturers}
          loading={loading}
          emptyMessage="No manufacturers found" />
        
      </div>
    </div>);

};

export default OfficerManufacturers;