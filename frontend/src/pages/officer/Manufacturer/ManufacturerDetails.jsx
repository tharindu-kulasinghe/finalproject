import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageHeader from '../../../components/common/PageHeader';
import Table from '../../../components/common/Table';
import Badge from '../../../components/common/Badge';
import Button from '../../../components/common/Button';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import getStatusColor from '../../../utils/getStatusColor';
import manufacturerApi from '../../../services/manufacturerApi';

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
};

const OfficerManufacturerDetails = () => {
  const { id } = useParams();
  const [manufacturer, setManufacturer] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchManufacturer = useCallback(async () => {
    setLoading(true);
    try {
      const response = await manufacturerApi.getManufacturerById(id);
      setManufacturer(response.data?.data || null);
    } catch (error) {
      console.error('Failed to fetch manufacturer details:', error);
      setManufacturer(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchManufacturer();
  }, [fetchManufacturer]);

  const applications = manufacturer?.submittedManufacturingApps || [];
  const licenses = manufacturer?.licenses || [];
  const products = manufacturer?.products || [];

  const latestApplication = useMemo(() => applications[0] || null, [applications]);
  const latestLicense = useMemo(() => licenses[0] || null, [licenses]);

  const applicationColumns = [
  { key: 'applicationNo', header: 'Application No' },
  { key: 'status', header: 'Status', render: (row) => <Badge variant={getStatusColor(row.status)}>{row.status}</Badge> },
  { key: 'submittedAt', header: 'Submitted', render: (row) => formatDate(row.submittedAt || row.createdAt) },
  { key: 'reviewedAt', header: 'Reviewed', render: (row) => formatDate(row.reviewedAt) }];


  const licenseColumns = [
  { key: 'licenseNumber', header: 'License No' },
  { key: 'status', header: 'Status', render: (row) => <Badge variant={getStatusColor(row.status)}>{row.status}</Badge> },
  { key: 'issueDate', header: 'Issued', render: (row) => formatDate(row.issueDate) },
  { key: 'effectiveTo', header: 'Expires', render: (row) => formatDate(row.effectiveTo) }];


  const productColumns = [
  { key: 'code', header: 'Code' },
  { key: 'name', header: 'Product Name' },
  { key: 'category', header: 'Category' },
  {
    key: 'isActive',
    header: 'Status',
    render: (row) => <Badge variant={row.isActive ? 'success' : 'default'}>{row.isActive ? 'ACTIVE' : 'INACTIVE'}</Badge>
  }];


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <LoadingSpinner />
      </div>);

  }

  if (!manufacturer) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <p className="text-gray-500">Manufacturer not found</p>
        <Link to="/officer/manufacturers">
          <Button variant="outline">Back to Manufacturers</Button>
        </Link>
      </div>);

  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={manufacturer.companyName || manufacturer.fullName || 'Manufacturer'}
        description="View manufacturer profile, applications, licenses and products"
        actions={
        <Link to="/officer/manufacturers">
            <Button variant="outline">Back</Button>
          </Link>
        } />
      

      <div className="border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div><p className="text-gray-500">Full Name</p><p className="font-medium text-gray-900">{manufacturer.fullName || '-'}</p></div>
          <div><p className="text-gray-500">Status</p><Badge variant={getStatusColor(manufacturer.status)}>{manufacturer.status}</Badge></div>
          <div><p className="text-gray-500">Company</p><p className="font-medium text-gray-900">{manufacturer.companyName || '-'}</p></div>
          <div><p className="text-gray-500">Email</p><p className="font-medium text-gray-900">{manufacturer.email || '-'}</p></div>
          <div><p className="text-gray-500">Mobile</p><p className="font-medium text-gray-900">{manufacturer.mobile || '-'}</p></div>
          <div><p className="text-gray-500">District / Province</p><p className="font-medium text-gray-900">{manufacturer.district || '-'} / {manufacturer.province || '-'}</p></div>
          <div className="md:col-span-2"><p className="text-gray-500">Address</p><p className="font-medium text-gray-900">{manufacturer.address || '-'}</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Latest Application</p>
          <p className="text-sm font-medium text-gray-900 mt-1">{latestApplication?.applicationNo || '-'}</p>
          {latestApplication?.status ? <div className="mt-2"><Badge variant={getStatusColor(latestApplication.status)}>{latestApplication.status}</Badge></div> : null}
        </div>
        <div className="border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Latest License</p>
          <p className="text-sm font-medium text-gray-900 mt-1">{latestLicense?.licenseNumber || '-'}</p>
          {latestLicense?.status ? <div className="mt-2"><Badge variant={getStatusColor(latestLicense.status)}>{latestLicense.status}</Badge></div> : null}
        </div>
      </div>

      <div className="border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Applications</h3>
        <Table columns={applicationColumns} data={applications} emptyMessage="No manufacturing applications" />
      </div>

      <div className="border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Licenses</h3>
        <Table columns={licenseColumns} data={licenses} emptyMessage="No licenses" />
      </div>

      <div className="border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Products</h3>
        <Table columns={productColumns} data={products} emptyMessage="No products" />
      </div>
    </div>);

};

export default OfficerManufacturerDetails;