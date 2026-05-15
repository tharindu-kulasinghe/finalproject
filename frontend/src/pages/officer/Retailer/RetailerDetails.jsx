import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageHeader from '../../../components/common/PageHeader';
import Table from '../../../components/common/Table';
import Badge from '../../../components/common/Badge';
import Button from '../../../components/common/Button';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import getStatusColor from '../../../utils/getStatusColor';
import retailerApi from '../../../services/retailerApi';

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
};

const OfficerRetailerDetails = () => {
  const { id } = useParams();
  const [retailer, setRetailer] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchRetailer = useCallback(async () => {
    setLoading(true);
    try {
      const response = await retailerApi.getRetailerById(id);
      setRetailer(response.data?.data || null);
    } catch (error) {
      console.error('Failed to fetch retailer details:', error);
      setRetailer(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRetailer();
  }, [fetchRetailer]);

  const licenseColumns = [
  { key: 'licenseNumber', header: 'License No' },
  { key: 'type', header: 'Type' },
  { key: 'status', header: 'Status', render: (row) => <Badge variant={getStatusColor(row.status)}>{row.status}</Badge> },
  { key: 'issueDate', header: 'Issued', render: (row) => formatDate(row.issueDate) },
  { key: 'effectiveTo', header: 'Expires', render: (row) => formatDate(row.effectiveTo) }];


  const applicationColumns = [
  { key: 'applicationNo', header: 'Application No' },
  { key: 'outletType', header: 'Outlet Type' },
  { key: 'status', header: 'Status', render: (row) => <Badge variant={getStatusColor(row.status)}>{row.status}</Badge> },
  { key: 'submittedAt', header: 'Submitted', render: (row) => formatDate(row.submittedAt || row.createdAt) },
  { key: 'reviewedAt', header: 'Reviewed', render: (row) => formatDate(row.reviewedAt) }];


  const incomingOrderColumns = [
  { key: 'orderNo', header: 'Order No' },
  {
    key: 'sender',
    header: 'Sender',
    render: (row) => row.sender?.companyName || row.sender?.fullName || '-'
  },
  {
    key: 'product',
    header: 'Product',
    render: (row) => row.product?.name || '-'
  },
  {
    key: 'quantity',
    header: 'Quantity',
    render: (row) => `${row.quantity ?? 0} ${row.unit || ''}`.trim()
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <Badge variant={getStatusColor(row.status)}>{row.status}</Badge>
  }];


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <LoadingSpinner />
      </div>);

  }

  if (!retailer) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <p className="text-gray-500">Retailer not found</p>
        <Link to="/officer/retailers">
          <Button variant="outline">Back to Retailers</Button>
        </Link>
      </div>);

  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={retailer.companyName || retailer.fullName || 'Retailer'}
        description="View retailer profile, applications, licenses and incoming orders"
        actions={
        <Link to="/officer/retailers">
            <Button variant="outline">Back</Button>
          </Link>
        } />
      

      <div className="border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div><p className="text-gray-500">Full Name</p><p className="font-medium text-gray-900">{retailer.fullName || '-'}</p></div>
          <div><p className="text-gray-500">Status</p><Badge variant={getStatusColor(retailer.status)}>{retailer.status}</Badge></div>
          <div><p className="text-gray-500">Company</p><p className="font-medium text-gray-900">{retailer.companyName || '-'}</p></div>
          <div><p className="text-gray-500">Email</p><p className="font-medium text-gray-900">{retailer.email || '-'}</p></div>
          <div><p className="text-gray-500">Mobile</p><p className="font-medium text-gray-900">{retailer.mobile || '-'}</p></div>
          <div><p className="text-gray-500">District / Province</p><p className="font-medium text-gray-900">{retailer.district || '-'} / {retailer.province || '-'}</p></div>
          <div className="md:col-span-2"><p className="text-gray-500">Address</p><p className="font-medium text-gray-900">{retailer.address || '-'}</p></div>
        </div>
      </div>

      <div className="border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Applications</h3>
        <Table columns={applicationColumns} data={retailer.submittedRetailApps || []} emptyMessage="No retail applications" />
      </div>

      <div className="border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Licenses</h3>
        <Table columns={licenseColumns} data={retailer.licenses || []} emptyMessage="No licenses" />
      </div>

      <div className="border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Incoming Orders</h3>
        <Table columns={incomingOrderColumns} data={retailer.receivedDistributions || []} emptyMessage="No incoming orders" />
      </div>
    </div>);

};

export default OfficerRetailerDetails;