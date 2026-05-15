import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import Table from '../../components/common/Table';
import Badge from '../../components/common/Badge';
import getStatusColor from '../../utils/getStatusColor';
import Button from '../../components/common/Button';
import SelectDropdown from '../../components/common/SelectDropdown';
import licenseApi from '../../services/licenseApi';

const OfficerLicenses = () => {
  const navigate = useNavigate();
  const [applicationsLoading, setApplicationsLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [applicationTypeFilter, setApplicationTypeFilter] = useState('ALL');
  const [applicationStatusFilter, setApplicationStatusFilter] = useState('ALL');

  const applicationStatuses = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'RETURNED', label: 'Returned' }];


  const applicationTypes = [
  { value: 'MANUFACTURING', label: 'Manufacturing' },
  { value: 'DISTRIBUTION', label: 'Distribution' },
  { value: 'RETAIL', label: 'Retail' }];


  const fetchApplications = useCallback(async () => {
    setApplicationsLoading(true);
    try {
      const params = applicationStatusFilter === 'ALL' ? {} : { status: applicationStatusFilter };

      const [manufacturingRes, distributionRes, retailRes] = await Promise.all([
      licenseApi.getManufacturingApplications(params),
      licenseApi.getDistributionApplications(params),
      licenseApi.getRetailApplications(params)]
      );

      const manufacturing = (manufacturingRes.data?.data || []).map((item) => ({
        id: item.id,
        applicationNo: item.applicationNo,
        businessName: item.companyName || item.applicantName || '-',
        requestedLicenseType: item.productType || 'MANUFACTURING',
        status: item.status,
        submittedAt: item.submittedAt || item.createdAt,
        applicationType: 'MANUFACTURING',
        submittedById: item.submittedBy?.id || null
      }));

      const distribution = (distributionRes.data?.data || []).map((item) => ({
        id: item.id,
        applicationNo: item.applicationNo,
        businessName: item.businessName || item.applicantName || '-',
        requestedLicenseType: 'DISTRIBUTION',
        status: item.status,
        submittedAt: item.submittedAt || item.createdAt,
        applicationType: 'DISTRIBUTION',
        submittedById: item.submittedBy?.id || null
      }));

      const retail = (retailRes.data?.data || []).map((item) => ({
        id: item.id,
        applicationNo: item.applicationNo,
        businessName: item.businessName || item.applicantName || '-',
        requestedLicenseType: item.outletType || 'RETAIL',
        status: item.status,
        submittedAt: item.submittedAt || item.createdAt,
        applicationType: 'RETAIL',
        submittedById: item.submittedBy?.id || null
      }));

      setApplications([...manufacturing, ...distribution, ...retail]);
    } catch (err) {
      console.error('Failed to fetch applications:', err);
      setApplications([]);
    } finally {
      setApplicationsLoading(false);
    }
  }, [applicationStatusFilter]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const resolveHolderPath = (type, holderId) => {
    if (!holderId) return null;
    if (type === 'MANUFACTURING') return `/officer/manufacturers/${holderId}`;
    if (type === 'DISTRIBUTION') return `/officer/distributors/${holderId}`;
    return `/officer/retailers/${holderId}`;
  };

  const filteredApplications = useMemo(() => {
    if (applicationTypeFilter === 'ALL') return applications;
    return applications.filter((item) => item.applicationType === applicationTypeFilter);
  }, [applications, applicationTypeFilter]);

  const applicationColumns = [
  { key: 'applicationNo', header: 'Application No' },
  { key: 'applicationType', header: 'Category' },
  { key: 'businessName', header: 'Business Name' },
  { key: 'requestedLicenseType', header: 'License Type' },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <Badge variant={getStatusColor(row.status)}>{row.status}</Badge>
  },
  {
    key: 'submittedAt',
    header: 'Submitted',
    render: (row) => row.submittedAt ? new Date(row.submittedAt).toLocaleDateString() : '-'
  },
  {
    key: 'actions',
    header: 'Actions',
    render: (row) =>
    <div className="flex gap-2">
          {row.submittedById ?
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          const targetPath = resolveHolderPath(row.applicationType, row.submittedById);
          if (targetPath) navigate(targetPath);
        }}>
        
              View
            </Button> :

      <span className="text-sm text-gray-400">-</span>
      }
        </div>

  }];


  return (
    <div className="space-y-6">
      <PageHeader
        title="Licenses"
        description="View all license applications" />
      

      <div className="border border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
          <SelectDropdown
            value={applicationTypeFilter}
            onChange={(e) => setApplicationTypeFilter(e.target.value)}
            options={[
            { value: 'ALL', label: 'All Categories' },
            ...applicationTypes]
            }
            className="sm:w-48" />
          
          <SelectDropdown
            value={applicationStatusFilter}
            onChange={(e) => setApplicationStatusFilter(e.target.value)}
            options={[
            { value: 'ALL', label: 'All Status' },
            ...applicationStatuses]
            }
            className="sm:w-48" />
          
        </div>
        <Table
          columns={applicationColumns}
          data={filteredApplications}
          loading={applicationsLoading}
          emptyMessage="No license applications found" />
        
      </div>
    </div>);

};

export default OfficerLicenses;