import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Table from '../../components/common/Table';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import distributorApi from '../../services/distributorApi';
import licenseApi from '../../services/licenseApi';
import getStatusColor from '../../utils/getStatusColor';
import { formatDate } from '../../utils/formatDate';
import { APPLICATION_IN_REVIEW_STATUSES, LicenseStatus } from '../../constants/statusConstants';

const getLicenseNumber = (license) => license.licenseNumber || license.licenseNo || 'N/A';
const getLicenseType = (license) => license.type || license.licenseType || 'Distribution';
const getExpiryDate = (license) => license.effectiveTo || license.expiryDate || null;
const getDaysUntil = (dateValue) => {
  if (!dateValue) return null;
  const target = new Date(dateValue);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
};

const DistributorMyLicense = () => {
  const [licenses, setLicenses] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    try {
      const storedUser = localStorage.getItem('user');
      let userId = '';

      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          userId = parsed?.id || '';
        } catch (_) {
          userId = '';
        }
      }

      const [licenseRes, appRes] = await Promise.allSettled([
      licenseApi.getMyLicenses(),
      userId ? distributorApi.getDistributorLicenseApplication(userId) : Promise.resolve(null)]
      );

      if (licenseRes.status === 'fulfilled') {
        setLicenses(licenseRes.value?.data?.data?.licenses || licenseRes.value?.data?.data || []);
      } else {
        setLicenses([]);
      }

      if (appRes.status === 'fulfilled') {
        const payload = appRes.value?.data?.data;
        setApplications(payload?.allApplications || (payload ? [payload] : []));
      } else {
        setApplications([]);
      }
    } catch (error) {
      console.error('Failed to load distributor license information:', error);
      setLicenses([]);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const activeLicenses = useMemo(
    () => licenses.filter((item) => item.status === LicenseStatus.ACTIVE),
    [licenses]
  );

  const expiringSoonCount = useMemo(
    () => activeLicenses.filter((item) => {
      const days = getDaysUntil(getExpiryDate(item));
      return days !== null && days >= 0 && days <= 30;
    }).length,
    [activeLicenses]
  );

  const expiredCount = useMemo(
    () => licenses.filter((item) => {
      const days = getDaysUntil(getExpiryDate(item));
      return item.status === LicenseStatus.EXPIRED || days !== null && days < 0;
    }).length,
    [licenses]
  );

  const pendingApplicationsCount = useMemo(
    () => applications.filter((item) => APPLICATION_IN_REVIEW_STATUSES.includes(item.status)).length,
    [applications]
  );

  const currentLicense = useMemo(() => {
    if (!activeLicenses.length) return null;

    const sorted = [...activeLicenses].sort((a, b) => {
      const aTime = getExpiryDate(a) ? new Date(getExpiryDate(a)).getTime() : Number.POSITIVE_INFINITY;
      const bTime = getExpiryDate(b) ? new Date(getExpiryDate(b)).getTime() : Number.POSITIVE_INFINITY;
      return aTime - bTime;
    });

    return sorted[0];
  }, [activeLicenses]);

  const licenseColumns = [
  {
    key: 'licenseNumber',
    header: 'License Number',
    render: (row) => getLicenseNumber(row)
  },
  {
    key: 'type',
    header: 'Type',
    render: (row) => getLicenseType(row)
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <Badge variant={getStatusColor(row.status)}>{row.status || '-'}</Badge>
  },
  {
    key: 'issueDate',
    header: 'Issue Date',
    render: (row) => formatDate(row.issueDate)
  },
  {
    key: 'effectiveFrom',
    header: 'Effective From',
    render: (row) => formatDate(row.effectiveFrom)
  },
  {
    key: 'effectiveTo',
    header: 'Expiry Date',
    render: (row) => formatDate(getExpiryDate(row))
  }];


  const applicationColumns = [
  {
    key: 'applicationNo',
    header: 'Application No',
    render: (row) => row.applicationNo || '-'
  },
  {
    key: 'businessName',
    header: 'Business',
    render: (row) => row.businessName || '-'
  },
  {
    key: 'distributionScope',
    header: 'Scope',
    render: (row) => row.distributionScope || '-'
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <Badge variant={getStatusColor(row.status)}>{row.status || '-'}</Badge>
  },
  {
    key: 'submittedAt',
    header: 'Submitted',
    render: (row) => formatDate(row.submittedAt || row.createdAt)
  }];


  return (
    <div className="space-y-6">
      <PageHeader
        title="My Licenses"
        description="View your licenses and expiry dates."
        actions={
        <div className="flex gap-2">
            <Link to="/distributor/apply-license">
              <Button>Apply New License</Button>
            </Link>
          </div>
        } />
      

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="border border-gray-200 bg-white p-5">
          <p className="text-xs uppercase text-gray-500 tracking-wide">Active Licenses</p>
          <p className="text-2xl font-semibold text-gray-900 mt-2">{activeLicenses.length}</p>
        </div>
        <div className="border border-gray-200 bg-white p-5">
          <p className="text-xs uppercase text-gray-500 tracking-wide">Expiring In 30 Days</p>
          <p className="text-2xl font-semibold text-warning-700 mt-2">{expiringSoonCount}</p>
        </div>
        <div className="border border-gray-200 bg-white p-5">
          <p className="text-xs uppercase text-gray-500 tracking-wide">Expired</p>
          <p className="text-2xl font-semibold text-red-700 mt-2">{expiredCount}</p>
        </div>
        <div className="border border-gray-200 bg-white p-5">
          <p className="text-xs uppercase text-gray-500 tracking-wide">Pending Applications</p>
          <p className="text-2xl font-semibold text-info-700 mt-2">{pendingApplicationsCount}</p>
        </div>
      </div>

      <div className="border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Current License</h3>
        {loading ?
        <div className="flex justify-start py-2">
            <LoadingSpinner size="sm" text="Loading current license..." />
          </div> :
        currentLicense ?
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">License Number</p>
              <p className="font-medium text-gray-900">{getLicenseNumber(currentLicense)}</p>
            </div>
            <div>
              <p className="text-gray-500">Status</p>
              <Badge variant={getStatusColor(currentLicense.status)}>{currentLicense.status}</Badge>
            </div>
            <div>
              <p className="text-gray-500">Issue Date</p>
              <p className="font-medium text-gray-900">{formatDate(currentLicense.issueDate)}</p>
            </div>
            <div>
              <p className="text-gray-500">Expiry Date</p>
              <p className="font-medium text-gray-900">{formatDate(getExpiryDate(currentLicense))}</p>
            </div>
            <div>
              <p className="text-gray-500">Days Remaining</p>
              <p className="font-medium text-gray-900">{Math.max(getDaysUntil(getExpiryDate(currentLicense)) ?? 0, 0)}</p>
            </div>
          </div> :

        <div className="space-y-3">
            <p className="text-sm text-gray-600">No active distribution license found.</p>
            <Link to="/distributor/apply-license">
              <Button size="sm">Apply New License</Button>
            </Link>
          </div>
        }
      </div>

      <div className="border border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Application History</h3>
        </div>
        <Table columns={applicationColumns} data={applications} loading={loading} emptyMessage="No license applications found" />
      </div>

      <div className="border border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">License History</h3>
        </div>
        <Table columns={licenseColumns} data={licenses} loading={loading} emptyMessage="No licenses found" />
      </div>
    </div>);

};

export default DistributorMyLicense;