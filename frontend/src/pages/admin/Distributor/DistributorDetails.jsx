import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import PageHeader from '../../../components/common/PageHeader';
import Badge from '../../../components/common/Badge';
import Button from '../../../components/common/Button';
import Modal from '../../../components/common/Modal';
import Input from '../../../components/common/Input';
import SelectDropdown from '../../../components/common/SelectDropdown';
import Textarea from '../../../components/common/Textarea';
import Table from '../../../components/common/Table';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import distributorApi from '../../../services/distributorApi';
import api from '../../../services/api';
import getStatusColor from '../../../utils/getStatusColor';

const STATUS_OPTIONS = [
{ value: 'PENDING', label: 'Pending' },
{ value: 'ACTIVE', label: 'Active' },
{ value: 'INACTIVE', label: 'Inactive' },
{ value: 'SUSPENDED', label: 'Suspended' }];


const APPLICATION_STATUS_OPTIONS = [
{ value: 'DRAFT', label: 'Draft' },
{ value: 'SUBMITTED', label: 'Submitted' },
{ value: 'UNDER_REVIEW', label: 'Under Review' },
{ value: 'APPROVED', label: 'Approved' },
{ value: 'REJECTED', label: 'Rejected' },
{ value: 'RETURNED', label: 'Returned' }];


const LICENSE_STATUS_OPTIONS = [
{ value: 'ACTIVE', label: 'Active' },
{ value: 'SUSPENDED', label: 'Suspended' },
{ value: 'REVOKED', label: 'Banned' },
{ value: 'CANCELLED', label: 'Cancelled' },
{ value: 'EXPIRED', label: 'Expired' }];


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
  const [applications, setApplications] = useState([]);
  const [selectedApplicationId, setSelectedApplicationId] = useState('');
  const [loading, setLoading] = useState(true);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showApplicationStatusModal, setShowApplicationStatusModal] = useState(false);
  const [showLicenseStatusModal, setShowLicenseStatusModal] = useState(false);
  const [status, setStatus] = useState('');
  const [selectedLicense, setSelectedLicense] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [applicationStatusLoading, setApplicationStatusLoading] = useState(false);
  const [licenseStatusLoading, setLicenseStatusLoading] = useState(false);
  const [applicationStatusData, setApplicationStatusData] = useState({ status: '', remarks: '' });
  const [licenseStatusData, setLicenseStatusData] = useState({ status: '', remarks: '' });

  const fetchDistributor = useCallback(async () => {
    setLoading(true);
    try {
      const distributorResponse = await distributorApi.getDistributorById(id);
      const distributorData = distributorResponse.data?.data || null;
      setDistributor(distributorData);

      if (!distributorData?.submittedDistributionApps?.length) {
        setApplications([]);
        return;
      }

      try {
        const applicationsResponse = await distributorApi.getDistributorLicenseApplication(id);
        const allApplications = applicationsResponse.data?.data?.allApplications || [];
        setApplications(allApplications);
      } catch (applicationsError) {
        if (applicationsError.response?.status === 404) {
          setApplications([]);
        } else {
          throw applicationsError;
        }
      }
    } catch (err) {
      console.error('Failed to fetch distributor:', err);
      toast.error(err.response?.data?.message || 'Failed to load distributor details');
      setDistributor(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDistributor();
  }, [fetchDistributor]);

  useEffect(() => {
    if (!applications.length) {
      setSelectedApplicationId('');
      return;
    }

    const hasSelected = applications.some((item) => item.id === selectedApplicationId);
    if (!selectedApplicationId || !hasSelected) {
      setSelectedApplicationId(applications[0].id);
    }
  }, [applications, selectedApplicationId]);

  const selectedApplication = useMemo(() => {
    if (!applications.length) return null;
    return applications.find((item) => item.id === selectedApplicationId) || applications[0];
  }, [applications, selectedApplicationId]);

  const distributionLicenses = distributor?.licenses || [];
  const distributorStocks = distributor?.distributorStocks || [];

  const handleOpenStatusModal = () => {
    setStatus(distributor?.status || '');
    setShowStatusModal(true);
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!status) return;

    setStatusLoading(true);
    try {
      await distributorApi.updateDistributorStatus(id, status);
      toast.success('Distributor status updated');
      setShowStatusModal(false);
      fetchDistributor();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleOpenApplicationStatusModal = () => {
    if (!selectedApplication) {
      toast.error('No application selected');
      return;
    }

    setApplicationStatusData({
      status: selectedApplication.status || '',
      remarks: selectedApplication.remarks || ''
    });
    setShowApplicationStatusModal(true);
  };

  const handleUpdateApplicationStatus = async () => {
    if (!selectedApplication) {
      toast.error('No application selected');
      return;
    }

    if (!applicationStatusData.status) {
      toast.error('Please select an application status');
      return;
    }

    setApplicationStatusLoading(true);
    try {
      await distributorApi.updateDistributorApplication(id, {
        applicationId: selectedApplication.id,
        status: applicationStatusData.status,
        remarks: applicationStatusData.remarks
      });
      toast.success('Application status updated');
      setShowApplicationStatusModal(false);
      fetchDistributor();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update application status');
    } finally {
      setApplicationStatusLoading(false);
    }
  };

  const handleIssueLicense = async () => {
    if (!selectedApplication) {
      toast.error('No application selected');
      return;
    }

    try {
      await distributorApi.issueDistributorLicense(id, { applicationId: selectedApplication.id });
      toast.success('Distribution license issued successfully');
      fetchDistributor();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to issue distribution license');
    }
  };

  const handleOpenLicenseStatusModal = (license) => {
    setSelectedLicense(license);
    setLicenseStatusData({ status: license?.status || '', remarks: license?.remarks || '' });
    setShowLicenseStatusModal(true);
  };

  const handleUpdateLicenseStatus = async () => {
    if (!selectedLicense) {
      toast.error('No license selected');
      return;
    }

    if (!licenseStatusData.status) {
      toast.error('Please select a license status');
      return;
    }

    setLicenseStatusLoading(true);
    try {
      await api.patch(`/licenses/${selectedLicense.id}/status`, licenseStatusData);
      toast.success('License status updated');
      setShowLicenseStatusModal(false);
      setSelectedLicense(null);
      fetchDistributor();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update license status');
    } finally {
      setLicenseStatusLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <LoadingSpinner text="Loading distributor details..." />
      </div>);

  }

  if (!distributor) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-gray-500">Distributor not found</p>
        <Link to="/admin/distributors">
          <Button variant="outline">Back to Distributors</Button>
        </Link>
      </div>);

  }

  const stockColumns = [
  {
    key: 'product',
    header: 'Product',
    render: (row) => row.product?.name || '-'
  },
  {
    key: 'availableQuantity',
    header: 'Available',
    render: (row) => row.availableQuantity || 0
  },
  {
    key: 'reservedQuantity',
    header: 'Reserved',
    render: (row) => row.reservedQuantity || 0
  },
  {
    key: 'productPackType',
    header: 'Pack Type',
    render: (row) => row.product?.packType || '-'
  },
  {
    key: 'updatedAt',
    header: 'Last Updated',
    render: (row) => row.updatedAt ? new Date(row.updatedAt).toLocaleDateString() : '-'
  }];


  return (
    <div className="space-y-6">
      <PageHeader
        title={distributor.companyName || distributor.fullName}
        description="Distributor profile, application, license and stock"
        actions={
        <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate(`/admin/distributors/${id}/edit`)}>Edit Distributor</Button>
            <Button variant="outline" onClick={handleOpenStatusModal}>Update Status</Button>
            <Link to="/admin/distributors">
              <Button variant="outline">Back</Button>
            </Link>
          </div>
        } />
      

      <div className="text-sm text-gray-500">
        <Link to="/admin/distributors" className="hover:text-gray-700">Distributors</Link>
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
                <p className="font-medium text-gray-900">{distributor.fullName}</p>
              </div>
              <div>
                <p className="text-gray-500">Email</p>
                <p className="font-medium text-gray-900">{distributor.email}</p>
              </div>
              <div>
                <p className="text-gray-500">Mobile</p>
                <p className="font-medium text-gray-900">{distributor.mobile || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">NIC</p>
                <p className="font-medium text-gray-900">{distributor.nic || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Status</p>
                <Badge variant={getStatusColor(distributor.status)}>{distributor.status}</Badge>
              </div>
              <div className="md:col-span-2">
                <p className="text-gray-500">Address</p>
                <p className="font-medium text-gray-900">{distributor.address || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">District</p>
                <p className="font-medium text-gray-900">{distributor.district || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Province</p>
                <p className="font-medium text-gray-900">{distributor.province || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Created</p>
                <p className="font-medium text-gray-900">{formatDate(distributor.createdAt)}</p>
              </div>
              <div>
                <p className="text-gray-500">Last Updated</p>
                <p className="font-medium text-gray-900">{formatDate(distributor.updatedAt)}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-gray-500">Notes</p>
                <p className="font-medium text-gray-900 whitespace-pre-wrap">{distributor.notes || '-'}</p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">2. Distribution Applications</h3>
            {applications.length ?
            <div className="overflow-x-auto border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="text-left px-3 py-2">Application No</th>
                      <th className="text-left px-3 py-2">Business</th>
                      <th className="text-left px-3 py-2">Scope</th>
                      <th className="text-left px-3 py-2">Status</th>
                      <th className="text-left px-3 py-2">Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((item) =>
                  <tr
                    key={item.id}
                    className={`border-t border-gray-100 cursor-pointer ${selectedApplication?.id === item.id ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
                    onClick={() => setSelectedApplicationId(item.id)}>
                    
                        <td className="px-3 py-2 font-medium text-gray-900">{item.applicationNo}</td>
                        <td className="px-3 py-2">{item.businessName || '-'}</td>
                        <td className="px-3 py-2">{item.distributionScope || '-'}</td>
                        <td className="px-3 py-2">
                          <Badge variant={getStatusColor(item.status)}>{item.status}</Badge>
                        </td>
                        <td className="px-3 py-2">{formatDate(item.submittedAt || item.createdAt)}</td>
                      </tr>
                  )}
                  </tbody>
                </table>
              </div> :

            <p className="text-sm text-gray-500">No distribution application found.</p>
            }
          </div>

          {selectedApplication &&
          <div className="border border-gray-200 bg-white p-6 space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">3. Selected Application Details</h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 text-sm border-b border-gray-100 pb-6">
                <div>
                  <p><span className="text-gray-500">Application No:</span> <span className="font-medium text-gray-900">{selectedApplication.applicationNo || '-'}</span></p>
                  <p><span className="text-gray-500">Status:</span> <Badge variant={getStatusColor(selectedApplication.status)}>{selectedApplication.status || '-'}</Badge></p>
                  <p><span className="text-gray-500">Submitted:</span> <span className="font-medium text-gray-900">{formatDate(selectedApplication.submittedAt || selectedApplication.createdAt)}</span></p>
                  <p><span className="text-gray-500">Reviewed:</span> <span className="font-medium text-gray-900">{formatDate(selectedApplication.reviewedAt)}</span></p>
                </div>
                <div>
                  <p><span className="text-gray-500">Submitted By:</span> <span className="font-medium text-gray-900">{selectedApplication.submittedBy?.fullName || '-'}</span></p>
                  <p><span className="text-gray-500">Submitter Email:</span> <span className="font-medium text-gray-900">{selectedApplication.submittedBy?.email || '-'}</span></p>
                  <p><span className="text-gray-500">Reviewed By:</span> <span className="font-medium text-gray-900">{selectedApplication.reviewedBy?.fullName || '-'}</span></p>
                  <p><span className="text-gray-500">Reviewer Email:</span> <span className="font-medium text-gray-900">{selectedApplication.reviewedBy?.email || '-'}</span></p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 text-sm">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Applicant Information</h4>
                  <p><span className="text-gray-500">Name:</span> <span className="font-medium text-gray-900">{selectedApplication.applicantName || '-'}</span></p>
                  <p><span className="text-gray-500">Email:</span> <span className="font-medium text-gray-900">{selectedApplication.applicantEmail || '-'}</span></p>
                  <p><span className="text-gray-500">Phone:</span> <span className="font-medium text-gray-900">{selectedApplication.applicantPhone || '-'}</span></p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Business Information</h4>
                  <p><span className="text-gray-500">Business:</span> <span className="font-medium text-gray-900">{selectedApplication.businessName || '-'}</span></p>
                  <p><span className="text-gray-500">Registration No:</span> <span className="font-medium text-gray-900">{selectedApplication.businessRegistrationNo || '-'}</span></p>
                  <p><span className="text-gray-500">Tax ID:</span> <span className="font-medium text-gray-900">{selectedApplication.taxIdentificationNo || '-'}</span></p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Warehouse & Premises</h4>
                  <p><span className="text-gray-500">Address:</span> <span className="font-medium text-gray-900">{selectedApplication.warehouseAddress || '-'}</span></p>
                  <p><span className="text-gray-500">District:</span> <span className="font-medium text-gray-900">{selectedApplication.district || '-'}</span></p>
                  <p><span className="text-gray-500">Province:</span> <span className="font-medium text-gray-900">{selectedApplication.province || '-'}</span></p>
                  <p><span className="text-gray-500">Ownership:</span> <span className="font-medium text-gray-900">{selectedApplication.premisesOwnershipType || '-'}</span></p>
                  <p><span className="text-gray-500">Deed/Lease Ref:</span> <span className="font-medium text-gray-900">{selectedApplication.deedOrLeaseReference || '-'}</span></p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Distribution Details</h4>
                  <p><span className="text-gray-500">Warehouse Capacity:</span> <span className="font-medium text-gray-900">{selectedApplication.warehouseCapacity || '-'}</span></p>
                  <p><span className="text-gray-500">OIC Certification:</span> <span className="font-medium text-gray-900">{selectedApplication.oicCertificationRef || '-'}</span></p>
                  <p><span className="text-gray-500">Scope:</span> <span className="font-medium text-gray-900">{selectedApplication.distributionScope || '-'}</span></p>
                  <p><span className="text-gray-500">Transport Details:</span> <span className="font-medium text-gray-900">{selectedApplication.transportDetails || '-'}</span></p>
                  <p><span className="text-gray-500">Building Plan Ref:</span> <span className="font-medium text-gray-900">{selectedApplication.buildingPlanReference || '-'}</span></p>
                  <p><span className="text-gray-500">Packing List:</span> <span className="font-medium text-gray-900">{selectedApplication.packingListDetails || '-'}</span></p>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-6">
                <h4 className="font-semibold text-gray-900 mb-3">Linked Manufacturers</h4>
                {selectedApplication.selectedManufacturers?.length ?
              <div className="overflow-x-auto border border-gray-200">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-700">
                        <tr>
                          <th className="text-left px-3 py-2">Company</th>
                          <th className="text-left px-3 py-2">Contact</th>
                          <th className="text-left px-3 py-2">Email</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedApplication.selectedManufacturers.map((item) =>
                    <tr key={item.id || item.manufacturerId} className="border-t border-gray-100">
                            <td className="px-3 py-2">{item.manufacturer?.companyName || item.manufacturer?.fullName || '-'}</td>
                            <td className="px-3 py-2">{item.manufacturer?.fullName || '-'}</td>
                            <td className="px-3 py-2">{item.manufacturer?.email || '-'}</td>
                          </tr>
                    )}
                      </tbody>
                    </table>
                  </div> :

              <p className="text-sm text-gray-500">No linked manufacturers for this application.</p>
              }
              </div>

              <div className="border-t border-gray-100 pt-6">
                <h4 className="font-semibold text-gray-900 mb-3">Linked Retailers</h4>
                {selectedApplication.selectedRetailers?.length ?
              <div className="overflow-x-auto border border-gray-200">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-700">
                        <tr>
                          <th className="text-left px-3 py-2">Company</th>
                          <th className="text-left px-3 py-2">Contact</th>
                          <th className="text-left px-3 py-2">Email</th>
                          <th className="text-left px-3 py-2">Mobile</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedApplication.selectedRetailers.map((item) =>
                    <tr key={item.id || item.retailerId} className="border-t border-gray-100">
                            <td className="px-3 py-2">{item.retailer?.companyName || item.retailer?.fullName || '-'}</td>
                            <td className="px-3 py-2">{item.retailer?.fullName || '-'}</td>
                            <td className="px-3 py-2">{item.retailer?.email || '-'}</td>
                            <td className="px-3 py-2">{item.retailer?.mobile || '-'}</td>
                          </tr>
                    )}
                      </tbody>
                    </table>
                  </div> :

              <p className="text-sm text-gray-500">No linked retailers for this application.</p>
              }
              </div>

              <div className="border-t border-gray-100 pt-6">
                <h4 className="font-semibold text-gray-900 mb-3">Uploaded Documents</h4>
                {selectedApplication.files?.length ?
              <div className="overflow-x-auto border border-gray-200">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-700">
                        <tr>
                          <th className="text-left px-3 py-2">Category</th>
                          <th className="text-left px-3 py-2">File Name</th>
                          <th className="text-left px-3 py-2">Uploaded</th>
                          <th className="text-left px-3 py-2">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedApplication.files.map((file) =>
                    <tr key={file.id} className="border-t border-gray-100">
                            <td className="px-3 py-2">{file.category || 'GENERAL'}</td>
                            <td className="px-3 py-2">{file.fileName || '-'}</td>
                            <td className="px-3 py-2">{formatDate(file.createdAt)}</td>
                            <td className="px-3 py-2">
                              <a href={file.fileUrl} target="_blank" rel="noreferrer" className="text-primary-700 hover:text-primary-800">
                                View
                              </a>
                            </td>
                          </tr>
                    )}
                      </tbody>
                    </table>
                  </div> :

              <p className="text-sm text-gray-500">No documents uploaded for this application.</p>
              }
              </div>

              <div className="border-t border-gray-100 pt-6">
                <h4 className="font-semibold text-gray-900 mb-3">Issued License for Selected Application</h4>
                {selectedApplication.issuedLicense ?
              <div className="space-y-2 text-sm">
                    <p><span className="text-gray-500">License Number:</span> <span className="font-medium text-gray-900">{selectedApplication.issuedLicense.licenseNumber || '-'}</span></p>
                    <p><span className="text-gray-500">Status:</span> <Badge variant={getStatusColor(selectedApplication.issuedLicense.status)}>{selectedApplication.issuedLicense.status || '-'}</Badge></p>
                    <p><span className="text-gray-500">Issue Date:</span> <span className="font-medium text-gray-900">{formatDate(selectedApplication.issuedLicense.issueDate)}</span></p>
                    <p><span className="text-gray-500">Effective From:</span> <span className="font-medium text-gray-900">{formatDate(selectedApplication.issuedLicense.effectiveFrom)}</span></p>
                    <p><span className="text-gray-500">Effective To:</span> <span className="font-medium text-gray-900">{formatDate(selectedApplication.issuedLicense.effectiveTo)}</span></p>
                  </div> :

              <p className="text-sm text-gray-500">No license issued for this application yet.</p>
              }
              </div>

              <div className="border-t border-gray-100 pt-6">
                <h4 className="font-semibold text-gray-900 mb-3">Application Remarks</h4>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedApplication.remarks || '-'}</p>
              </div>

              <div className="border-t border-gray-100 pt-6 flex flex-wrap gap-2">
                <Button variant="outline" onClick={handleOpenApplicationStatusModal}>Update Application Status</Button>
                {selectedApplication.status === 'APPROVED' && !selectedApplication.issuedLicense &&
              <Button onClick={handleIssueLicense}>Issue License for Selected Application</Button>
              }
              </div>
            </div>
          }

          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">4. Issued Distribution Licenses</h3>
            {distributionLicenses.length ?
            <div className="overflow-x-auto border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="text-left px-3 py-2">License Number</th>
                      <th className="text-left px-3 py-2">Type</th>
                      <th className="text-left px-3 py-2">Status</th>
                      <th className="text-left px-3 py-2">Effective From</th>
                      <th className="text-left px-3 py-2">Effective To</th>
                      <th className="text-left px-3 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {distributionLicenses.map((license) =>
                  <tr key={license.id} className="border-t border-gray-100">
                        <td className="px-3 py-2 font-medium text-gray-900">{license.licenseNumber}</td>
                        <td className="px-3 py-2">{license.type}</td>
                        <td className="px-3 py-2">
                          <Badge variant={getStatusColor(license.status)}>{license.status}</Badge>
                        </td>
                        <td className="px-3 py-2">{license.effectiveFrom ? new Date(license.effectiveFrom).toLocaleDateString() : '-'}</td>
                        <td className="px-3 py-2">{license.effectiveTo ? new Date(license.effectiveTo).toLocaleDateString() : '-'}</td>
                        <td className="px-3 py-2">
                          <Button size="sm" variant="outline" onClick={() => handleOpenLicenseStatusModal(license)}>
                            Update Status
                          </Button>
                        </td>
                      </tr>
                  )}
                  </tbody>
                </table>
              </div> :

            <p className="text-sm text-gray-500">No distribution licenses issued yet.</p>
            }
          </div>

          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">5. Current Stock</h3>
            <Table columns={stockColumns} data={distributorStocks} emptyMessage="No stock available" />
          </div>
        </div>

        <div className="space-y-6">
          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Application</span>
                <span className="font-medium text-gray-900">{applications.length ? `${applications.length} total` : 'Missing'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">License</span>
                <span className="font-medium text-gray-900">{distributionLicenses.length ? `${distributionLicenses.length} issued` : 'Not issued'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Stock Items</span>
                <span className="font-medium text-gray-900">{distributorStocks.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={showStatusModal} onClose={() => setShowStatusModal(false)} title="Update Distributor Status" size="sm">
        <form onSubmit={handleUpdateStatus} className="space-y-4">
          <Input label="Distributor" value={distributor.companyName || distributor.fullName} disabled />
          <SelectDropdown
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={STATUS_OPTIONS}
            required />
          
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowStatusModal(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" loading={statusLoading}>
              Update
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showApplicationStatusModal} onClose={() => setShowApplicationStatusModal(false)} title="Update Application Status" size="md">
        <div className="space-y-4">
          <Input label="Application" value={selectedApplication?.applicationNo || ''} disabled />
          <SelectDropdown
            label="Status"
            value={applicationStatusData.status}
            onChange={(e) => setApplicationStatusData((prev) => ({ ...prev, status: e.target.value }))}
            options={APPLICATION_STATUS_OPTIONS}
            required />
          
          <Textarea
            label="Remarks"
            value={applicationStatusData.remarks}
            onChange={(e) => setApplicationStatusData((prev) => ({ ...prev, remarks: e.target.value }))}
            rows={4} />
          
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowApplicationStatusModal(false)}>
              Cancel
            </Button>
            <Button type="button" className="flex-1" loading={applicationStatusLoading} onClick={handleUpdateApplicationStatus}>
              Update
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showLicenseStatusModal} onClose={() => setShowLicenseStatusModal(false)} title="Update License Status" size="md">
        <div className="space-y-4">
          <Input label="License" value={selectedLicense?.licenseNumber || ''} disabled />
          <SelectDropdown
            label="Status"
            value={licenseStatusData.status}
            onChange={(e) => setLicenseStatusData((prev) => ({ ...prev, status: e.target.value }))}
            options={LICENSE_STATUS_OPTIONS}
            required />
          
          <Textarea
            label="Remarks"
            value={licenseStatusData.remarks}
            onChange={(e) => setLicenseStatusData((prev) => ({ ...prev, remarks: e.target.value }))}
            rows={4} />
          
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowLicenseStatusModal(false)}>
              Cancel
            </Button>
            <Button type="button" className="flex-1" loading={licenseStatusLoading} onClick={handleUpdateLicenseStatus}>
              Update
            </Button>
          </div>
        </div>
      </Modal>
    </div>);

};

export default DistributorDetails;