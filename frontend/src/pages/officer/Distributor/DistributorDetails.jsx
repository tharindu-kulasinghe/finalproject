import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageHeader from '../../../components/common/PageHeader';
import Table from '../../../components/common/Table';
import Badge from '../../../components/common/Badge';
import Button from '../../../components/common/Button';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import getStatusColor from '../../../utils/getStatusColor';
import distributorApi from '../../../services/distributorApi';

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
};

const OfficerDistributorDetails = () => {
  const { id } = useParams();
  const [distributor, setDistributor] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDistributor = useCallback(async () => {
    setLoading(true);
    try {
      const response = await distributorApi.getDistributorById(id);
      setDistributor(response.data?.data || null);
    } catch (error) {
      console.error('Failed to fetch distributor details:', error);
      setDistributor(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDistributor();
  }, [fetchDistributor]);

  const licenseColumns = [
  { key: 'licenseNumber', header: 'License No' },
  { key: 'status', header: 'Status', render: (row) => <Badge variant={getStatusColor(row.status)}>{row.status}</Badge> },
  { key: 'issueDate', header: 'Issued', render: (row) => formatDate(row.issueDate) },
  { key: 'effectiveTo', header: 'Expires', render: (row) => formatDate(row.effectiveTo) }];


  const applicationColumns = [
  { key: 'applicationNo', header: 'Application No' },
  { key: 'status', header: 'Status', render: (row) => <Badge variant={getStatusColor(row.status)}>{row.status}</Badge> },
  { key: 'submittedAt', header: 'Submitted', render: (row) => formatDate(row.submittedAt) },
  { key: 'reviewedAt', header: 'Reviewed', render: (row) => formatDate(row.reviewedAt) }];


  const stockColumns = [
  { key: 'product', header: 'Product', render: (row) => row.product?.name || '-' },
  { key: 'availableQuantity', header: 'Available', render: (row) => row.availableQuantity || 0 },
  { key: 'reservedQuantity', header: 'Reserved', render: (row) => row.reservedQuantity || 0 },
  { key: 'updatedAt', header: 'Last Updated', render: (row) => formatDate(row.updatedAt) }];


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <LoadingSpinner />
      </div>);

  }

  if (!distributor) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <p className="text-gray-500">Distributor not found</p>
        <Link to="/officer/distributors">
          <Button variant="outline">Back to Distributors</Button>
        </Link>
      </div>);

  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={distributor.companyName || distributor.fullName || 'Distributor'}
        description="View distributor profile, applications, licenses and stock"
        actions={
        <Link to="/officer/distributors">
            <Button variant="outline">Back</Button>
          </Link>
        } />
      

      <div className="border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div><p className="text-gray-500">Full Name</p><p className="font-medium text-gray-900">{distributor.fullName || '-'}</p></div>
          <div><p className="text-gray-500">Status</p><Badge variant={getStatusColor(distributor.status)}>{distributor.status}</Badge></div>
          <div><p className="text-gray-500">Company</p><p className="font-medium text-gray-900">{distributor.companyName || '-'}</p></div>
          <div><p className="text-gray-500">Email</p><p className="font-medium text-gray-900">{distributor.email || '-'}</p></div>
          <div><p className="text-gray-500">Mobile</p><p className="font-medium text-gray-900">{distributor.mobile || '-'}</p></div>
          <div><p className="text-gray-500">District / Province</p><p className="font-medium text-gray-900">{distributor.district || '-'} / {distributor.province || '-'}</p></div>
          <div className="md:col-span-2"><p className="text-gray-500">Address</p><p className="font-medium text-gray-900">{distributor.address || '-'}</p></div>
        </div>
      </div>

      <div className="border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Applications</h3>
        <Table columns={applicationColumns} data={distributor.submittedDistributionApps || []} emptyMessage="No distribution applications" />
      </div>

      <div className="border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Licenses</h3>
        <Table columns={licenseColumns} data={distributor.licenses || []} emptyMessage="No licenses" />
      </div>

      <div className="border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Stock</h3>
        <Table columns={stockColumns} data={distributor.distributorStocks || []} emptyMessage="No stock records" />
      </div>
    </div>);

};

export default OfficerDistributorDetails;