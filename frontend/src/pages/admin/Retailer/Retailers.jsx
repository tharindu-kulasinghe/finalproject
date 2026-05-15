import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../../components/common/PageHeader';
import Table from '../../../components/common/Table';
import Badge from '../../../components/common/Badge';
import Button from '../../../components/common/Button';
import SearchBar from '../../../components/common/SearchBar';
import SelectDropdown from '../../../components/common/SelectDropdown';
import getStatusColor from '../../../utils/getStatusColor';
import retailerApi from '../../../services/retailerApi';

const statusOptions = [
{ value: '', label: 'All Status' },
{ value: 'PENDING', label: 'Pending' },
{ value: 'ACTIVE', label: 'Active' },
{ value: 'INACTIVE', label: 'Inactive' },
{ value: 'SUSPENDED', label: 'Suspended' }];


const applicationStatusOptions = [
{ value: '', label: 'All App Status' },
{ value: 'DRAFT', label: 'Draft' },
{ value: 'SUBMITTED', label: 'Submitted' },
{ value: 'UNDER_REVIEW', label: 'Under Review' },
{ value: 'APPROVED', label: 'Approved' },
{ value: 'REJECTED', label: 'Rejected' },
{ value: 'RETURNED', label: 'Returned' }];


const licenseTypeOptions = [
{ value: '', label: 'All License Types' },
{ value: 'RETAIL', label: 'Retail Shop' },
{ value: 'BAR', label: 'Bar' },
{ value: 'RESTAURANT', label: 'Restaurant' },
{ value: 'HOTEL', label: 'Hotel' },
{ value: 'CLUB', label: 'Club' }];


const Retailers = () => {
  const [retailers, setRetailers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [applicationStatusFilter, setApplicationStatusFilter] = useState('');
  const [licenseTypeFilter, setLicenseTypeFilter] = useState('');

  const fetchRetailers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (applicationStatusFilter) params.applicationStatus = applicationStatusFilter;
      if (licenseTypeFilter) params.licenseType = licenseTypeFilter;

      const response = await retailerApi.getRetailers(params);
      setRetailers(response.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch retailers:', err);
      setRetailers([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, applicationStatusFilter, licenseTypeFilter]);

  useEffect(() => {
    fetchRetailers();
  }, [fetchRetailers]);

  const columns = [
  { key: 'fullName', header: 'Name' },
  { key: 'companyName', header: 'Business' },
  { key: 'email', header: 'Email' },
  { key: 'mobile', header: 'Mobile' },
  { key: 'district', header: 'District' },
  {
    key: 'application',
    header: 'Latest Application',
    render: (row) => {
      const latestApp = row.submittedRetailApps?.[0];
      if (!latestApp) return <span className="text-gray-500">No app</span>;

      return (
        <div className="flex flex-col">
            <span className="text-xs text-gray-500">{latestApp.applicationNo}</span>
            <Badge variant={getStatusColor(latestApp.status)} size="sm">{latestApp.status}</Badge>
          </div>);

    }
  },
  {
    key: 'license',
    header: 'Latest License',
    render: (row) => {
      const latestLicense = row.licenses?.[0];
      if (!latestLicense) return <span className="text-gray-500">No license</span>;

      return (
        <div className="flex flex-col">
            <span className="text-xs text-gray-500">{latestLicense.licenseNumber}</span>
            <Badge variant={getStatusColor(latestLicense.status)} size="sm">{latestLicense.status}</Badge>
          </div>);

    }
  },
  {
    key: 'status',
    header: 'Account',
    render: (row) => <Badge variant={getStatusColor(row.status)}>{row.status}</Badge>
  },
  {
    key: 'actions',
    header: 'Actions',
    render: (row) =>
    <div className="flex gap-2">
          <Link to={`/admin/retailers/${row.id}`}>
            <Button variant="outline" size="sm">View</Button>
          </Link>
          <Link to={`/admin/retailers/${row.id}/edit`}>
            <Button variant="outline" size="sm">Edit</Button>
          </Link>
        </div>

  }];


  return (
    <div className="space-y-6">
      <PageHeader
        title="Retailers"
        description="Manage retailer accounts and retail license applications"
        actions={
        <Link to="/admin/retailers/add">
            <Button>Add Retailer</Button>
          </Link>
        } />
      

      <div className="border border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-100 grid grid-cols-1 lg:grid-cols-4 gap-3">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search retailers..." />
          
          <SelectDropdown
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={statusOptions} />
          
          <SelectDropdown
            value={applicationStatusFilter}
            onChange={(e) => setApplicationStatusFilter(e.target.value)}
            options={applicationStatusOptions} />
          
          <SelectDropdown
            value={licenseTypeFilter}
            onChange={(e) => setLicenseTypeFilter(e.target.value)}
            options={licenseTypeOptions} />
          
        </div>

        <Table
          columns={columns}
          data={retailers}
          loading={loading}
          emptyMessage="No retailers found" />
        
      </div>
    </div>);

};

export default Retailers;