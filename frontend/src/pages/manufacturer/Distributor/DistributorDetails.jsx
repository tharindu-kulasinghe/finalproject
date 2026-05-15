import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../../../components/common/PageHeader';
import Badge from '../../../components/common/Badge';
import Button from '../../../components/common/Button';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import getStatusColor from '../../../utils/getStatusColor';
import api from '../../../services/api';

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
};

const DistributorDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [distributor, setDistributor] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDistributor = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/manufacturers/available/distributors');
      const availableDistributors = response.data?.data || [];
      const matchedDistributor = availableDistributors.find((item) => item.id === id) || null;
      setDistributor(matchedDistributor);
    } catch (error) {
      console.error('Failed to load distributor details:', error);
      setDistributor(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDistributor();
  }, [fetchDistributor]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <LoadingSpinner text="Loading distributor details..." />
      </div>);

  }

  if (!distributor) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <p className="text-gray-500">Distributor not found or not available for distribution</p>
        <Link to="/manufacturer/distributors">
          <Button variant="outline">Back to Distributors</Button>
        </Link>
      </div>);

  }

  const activeLicense = distributor.license;

  return (
    <div className="space-y-6">
      <PageHeader
        title={distributor.companyName || distributor.fullName}
        description="Distributor profile and active license details"
        actions={
        <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => navigate(`/manufacturer/distributions/add?receiverId=${distributor.id}`)}>
              Add Distribution
            </Button>
            <Button variant="outline" onClick={() => navigate('/manufacturer/distributions')}>
              View Distribution Orders
            </Button>
            <Link to="/manufacturer/distributors">
              <Button variant="outline">Back</Button>
            </Link>
          </div>
        } />
      

      <div className="text-sm text-gray-500">
        <Link to="/manufacturer/distributors" className="hover:text-gray-700">Distributors</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">Details</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">1. Distributor Profile</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Company</p>
                <p className="font-medium text-gray-900">{distributor.companyName || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Full Name</p>
                <p className="font-medium text-gray-900">{distributor.fullName || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Email</p>
                <p className="font-medium text-gray-900">{distributor.email || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Mobile</p>
                <p className="font-medium text-gray-900">{distributor.mobile || '-'}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-gray-500">Address</p>
                <p className="font-medium text-gray-900">{distributor.address || '-'}</p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">2. Active Distribution License</h3>
            {activeLicense ?
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">License Number</p>
                  <p className="font-medium text-gray-900">{activeLicense.licenseNumber || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500">License Type</p>
                  <p className="font-medium text-gray-900">{activeLicense.type || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Status</p>
                  <Badge variant={getStatusColor(activeLicense.status)}>{activeLicense.status || '-'}</Badge>
                </div>
                <div>
                  <p className="text-gray-500">Issue Date</p>
                  <p className="font-medium text-gray-900">{formatDate(activeLicense.issueDate)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Effective From</p>
                  <p className="font-medium text-gray-900">{formatDate(activeLicense.effectiveFrom)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Effective To</p>
                  <p className="font-medium text-gray-900">{formatDate(activeLicense.effectiveTo)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Renewal Due</p>
                  <p className="font-medium text-gray-900">{formatDate(activeLicense.renewalDueDate)}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-gray-500">Licensed Address</p>
                  <p className="font-medium text-gray-900">{activeLicense.businessAddress || distributor.address || '-'}</p>
                </div>
              </div> :

            <p className="text-sm text-gray-500">No active distribution license found for this distributor.</p>
            }
          </div>
        </div>

        <div className="space-y-6">
          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Partner Type</span>
                <span className="font-medium text-gray-900">Distributor</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Availability</span>
                <Badge variant="success">AVAILABLE</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">License</span>
                <span className="font-medium text-gray-900">{activeLicense?.licenseNumber || '-'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>);

};

export default DistributorDetails;