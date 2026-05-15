import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import PageHeader from '../../../components/common/PageHeader';
import Badge from '../../../components/common/Badge';
import Button from '../../../components/common/Button';
import Table from '../../../components/common/Table';
import Modal from '../../../components/common/Modal';
import Input from '../../../components/common/Input';
import SelectDropdown from '../../../components/common/SelectDropdown';
import Textarea from '../../../components/common/Textarea';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import manufacturerApi from '../../../services/manufacturerApi';
import getStatusColor from '../../../utils/getStatusColor';
import api from '../../../services/api';

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

const parseProposedProducts = (rawValue) => {
  if (!rawValue) return [];
  if (Array.isArray(rawValue)) return rawValue;

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const ManufacturerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [manufacturer, setManufacturer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showApplicationStatusModal, setShowApplicationStatusModal] = useState(false);
  const [showLicenseStatusModal, setShowLicenseStatusModal] = useState(false);
  const [status, setStatus] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  const [applicationStatusLoading, setApplicationStatusLoading] = useState(false);
  const [licenseStatusLoading, setLicenseStatusLoading] = useState(false);
  const [selectedApplicationId, setSelectedApplicationId] = useState('');
  const [selectedLicense, setSelectedLicense] = useState(null);
  const [applicationStatusData, setApplicationStatusData] = useState({ status: '', remarks: '' });
  const [licenseStatusData, setLicenseStatusData] = useState({ status: '', remarks: '' });

  const fetchManufacturer = useCallback(async () => {
    setLoading(true);
    try {
      const response = await manufacturerApi.getManufacturerById(id);
      setManufacturer(response.data?.data || null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load manufacturer details');
      setManufacturer(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchManufacturer();
  }, [fetchManufacturer]);

  const manufacturingLicenses = manufacturer?.licenses || [];
  const manufacturingApplications = manufacturer?.submittedManufacturingApps || [];

  const products = useMemo(() => {
    if (!manufacturer?.products?.length) return [];
    return manufacturer.products;
  }, [manufacturer]);

  useEffect(() => {
    if (!manufacturingApplications.length) {
      setSelectedApplicationId('');
      return;
    }

    const hasSelected = manufacturingApplications.some((item) => item.id === selectedApplicationId);
    if (!selectedApplicationId || !hasSelected) {
      setSelectedApplicationId(manufacturingApplications[0].id);
    }
  }, [manufacturingApplications, selectedApplicationId]);

  const selectedApplication = useMemo(() => {
    if (!manufacturingApplications.length) return null;
    return manufacturingApplications.find((item) => item.id === selectedApplicationId) || manufacturingApplications[0];
  }, [manufacturingApplications, selectedApplicationId]);

  const selectedApplicationProducts = useMemo(
    () => parseProposedProducts(selectedApplication?.proposedProductsJson),
    [selectedApplication?.proposedProductsJson]
  );

  const handleOpenStatusModal = () => {
    setStatus(manufacturer?.status || '');
    setShowStatusModal(true);
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!status) return;

    setStatusLoading(true);
    try {
      await manufacturerApi.updateManufacturerStatus(id, status);
      toast.success('Manufacturer status updated');
      setShowStatusModal(false);
      fetchManufacturer();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleIssueLicense = async () => {
    if (!selectedApplication) {
      toast.error('No application selected');
      return;
    }

    try {
      await manufacturerApi.issueManufacturerLicense(id, { applicationId: selectedApplication.id });
      toast.success('Manufacturing license issued successfully');
      fetchManufacturer();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to issue manufacturing license');
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
      await api.patch(`/manufacturing-applications/${selectedApplication.id}/status`, applicationStatusData);
      toast.success('Application status updated');
      setShowApplicationStatusModal(false);
      fetchManufacturer();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update application status');
    } finally {
      setApplicationStatusLoading(false);
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
      toast.success('License status updated. Product status synced automatically.');
      setShowLicenseStatusModal(false);
      setSelectedLicense(null);
      fetchManufacturer();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update license status');
    } finally {
      setLicenseStatusLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <LoadingSpinner text="Loading manufacturer details..." />
      </div>);

  }

  if (!manufacturer) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <p className="text-gray-500">Manufacturer not found</p>
        <Link to="/admin/manufacturers">
          <Button variant="outline">Back to Manufacturers</Button>
        </Link>
      </div>);

  }

  const productColumns = [
  { key: 'code', header: 'Code' },
  { key: 'name', header: 'Product Name' },
  { key: 'category', header: 'Category' },
  { key: 'packType', header: 'Pack Type', render: (row) => row.packType || '-' },
  { key: 'packSizeMl', header: 'Pack Size (ml)', render: (row) => row.packSizeMl || '-' },
  { key: 'alcoholStrength', header: 'ABV %', render: (row) => row.alcoholStrength ?? '-' },
  {
    key: 'isActive',
    header: 'Status',
    render: (row) => <Badge variant={row.isActive ? 'success' : 'default'}>{row.isActive ? 'ACTIVE' : 'INACTIVE'}</Badge>
  }];


  return (
    <div className="space-y-6">
      <PageHeader
        title={manufacturer.companyName || manufacturer.fullName}
        description="Manufacturer profile, application, license and products"
        actions={
        <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate(`/admin/manufacturers/${id}/edit`)}>Edit Manufacturer</Button>
            <Button variant="outline" onClick={handleOpenStatusModal}>Update Status</Button>
            <Link to="/admin/manufacturers">
              <Button variant="outline">Back</Button>
            </Link>
          </div>
        } />
      

      <div className="text-sm text-gray-500">
        <Link to="/admin/manufacturers" className="hover:text-gray-700">Manufacturers</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">Details</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">1. Manufacturer Profile</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Company</p>
                <p className="font-medium text-gray-900">{manufacturer.companyName || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Full Name</p>
                <p className="font-medium text-gray-900">{manufacturer.fullName}</p>
              </div>
              <div>
                <p className="text-gray-500">Email</p>
                <p className="font-medium text-gray-900">{manufacturer.email}</p>
              </div>
              <div>
                <p className="text-gray-500">Mobile</p>
                <p className="font-medium text-gray-900">{manufacturer.mobile || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">NIC</p>
                <p className="font-medium text-gray-900">{manufacturer.nic || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Status</p>
                <Badge variant={getStatusColor(manufacturer.status)}>{manufacturer.status}</Badge>
              </div>
              <div className="md:col-span-2">
                <p className="text-gray-500">Address</p>
                <p className="font-medium text-gray-900">{manufacturer.address || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">District</p>
                <p className="font-medium text-gray-900">{manufacturer.district || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Province</p>
                <p className="font-medium text-gray-900">{manufacturer.province || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Created</p>
                <p className="font-medium text-gray-900">{formatDate(manufacturer.createdAt)}</p>
              </div>
              <div>
                <p className="text-gray-500">Last Updated</p>
                <p className="font-medium text-gray-900">{formatDate(manufacturer.updatedAt)}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-gray-500">Notes</p>
                <p className="font-medium text-gray-900 whitespace-pre-wrap">{manufacturer.notes || '-'}</p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">2. Manufacturing Applications</h3>
            {manufacturingApplications.length ?
            <div className="overflow-x-auto border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="text-left px-3 py-2">Application No</th>
                      <th className="text-left px-3 py-2">Product Type</th>
                      <th className="text-left px-3 py-2">Manufacturing Type</th>
                      <th className="text-left px-3 py-2">Status</th>
                      <th className="text-left px-3 py-2">Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {manufacturingApplications.map((item) =>
                  <tr
                    key={item.id}
                    className={`border-t border-gray-100 cursor-pointer ${selectedApplication?.id === item.id ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
                    onClick={() => setSelectedApplicationId(item.id)}>
                    
                        <td className="px-3 py-2 font-medium text-gray-900">{item.applicationNo}</td>
                        <td className="px-3 py-2">{item.productType || '-'}</td>
                        <td className="px-3 py-2">{item.manufacturingType || '-'}</td>
                        <td className="px-3 py-2">
                          <Badge variant={getStatusColor(item.status)}>{item.status}</Badge>
                        </td>
                        <td className="px-3 py-2">{formatDate(item.submittedAt || item.createdAt)}</td>
                      </tr>
                  )}
                  </tbody>
                </table>
              </div> :

            <p className="text-sm text-gray-500">No manufacturing application found.</p>
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
                  <h4 className="font-semibold text-gray-900 mb-2">Company Information</h4>
                  <p><span className="text-gray-500">Company:</span> <span className="font-medium text-gray-900">{selectedApplication.companyName || '-'}</span></p>
                  <p><span className="text-gray-500">Registration No:</span> <span className="font-medium text-gray-900">{selectedApplication.companyRegistrationNo || '-'}</span></p>
                  <p><span className="text-gray-500">Tax ID:</span> <span className="font-medium text-gray-900">{selectedApplication.taxIdentificationNo || '-'}</span></p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Location & Premises</h4>
                  <p><span className="text-gray-500">Address:</span> <span className="font-medium text-gray-900">{selectedApplication.businessAddress || '-'}</span></p>
                  <p><span className="text-gray-500">District:</span> <span className="font-medium text-gray-900">{selectedApplication.district || '-'}</span></p>
                  <p><span className="text-gray-500">Province:</span> <span className="font-medium text-gray-900">{selectedApplication.province || '-'}</span></p>
                  <p><span className="text-gray-500">Ownership:</span> <span className="font-medium text-gray-900">{selectedApplication.premisesOwnershipType || '-'}</span></p>
                  <p><span className="text-gray-500">Deed/Lease Ref:</span> <span className="font-medium text-gray-900">{selectedApplication.deedOrLeaseReference || '-'}</span></p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Manufacturing & Approvals</h4>
                  <p><span className="text-gray-500">Product Type:</span> <span className="font-medium text-gray-900">{selectedApplication.productType || '-'}</span></p>
                  <p><span className="text-gray-500">Manufacturing Type:</span> <span className="font-medium text-gray-900">{selectedApplication.manufacturingType || '-'}</span></p>
                  <p><span className="text-gray-500">Raw Material Details:</span> <span className="font-medium text-gray-900">{selectedApplication.rawMaterialDetails || '-'}</span></p>
                  <p><span className="text-gray-500">Production Capacity:</span> <span className="font-medium text-gray-900">{selectedApplication.productionCapacity || '-'}</span></p>
                  <p><span className="text-gray-500">Environmental Approval:</span> <span className="font-medium text-gray-900">{selectedApplication.environmentalApprovalRef || '-'}</span></p>
                  <p><span className="text-gray-500">Fire Safety Approval:</span> <span className="font-medium text-gray-900">{selectedApplication.fireSafetyApprovalRef || '-'}</span></p>
                  <p><span className="text-gray-500">Other Approvals:</span> <span className="font-medium text-gray-900">{selectedApplication.otherGovernmentApprovals || '-'}</span></p>
                </div>
              </div>

              {selectedApplicationProducts.length > 0 &&
            <div className="border-t border-gray-100 pt-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Proposed Product</h4>
                  <div className="overflow-x-auto border border-gray-200">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-700">
                        <tr>
                          <th className="text-left px-3 py-2">Category</th>
                          <th className="text-left px-3 py-2">Name</th>
                          <th className="text-left px-3 py-2">Pack Type</th>
                          <th className="text-left px-3 py-2">Pack Size (ml)</th>
                          <th className="text-left px-3 py-2">Alcohol %</th>
                          <th className="text-left px-3 py-2">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedApplicationProducts.map((item, index) =>
                    <tr key={`selected-product-${index}`} className="border-t border-gray-100">
                            <td className="px-3 py-2">{item.category || '-'}</td>
                            <td className="px-3 py-2">{item.name || '-'}</td>
                            <td className="px-3 py-2">{item.packType || '-'}</td>
                            <td className="px-3 py-2">{item.packSizeMl ?? '-'}</td>
                            <td className="px-3 py-2">{item.alcoholStrength ?? '-'}</td>
                            <td className="px-3 py-2">{item.description || '-'}</td>
                          </tr>
                    )}
                      </tbody>
                    </table>
                  </div>
                </div>
            }

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
                    <p><span className="text-gray-500">Renewal Due Date:</span> <span className="font-medium text-gray-900">{formatDate(selectedApplication.issuedLicense.renewalDueDate)}</span></p>
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">4. Issued Manufacturing Licenses</h3>
            {manufacturingLicenses.length ?
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
                    {manufacturingLicenses.map((license) =>
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

            <p className="text-sm text-gray-500">No manufacturing licenses issued yet.</p>
            }
          </div>

          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">5. Products Under Manufacturing Licenses</h3>
            <Table columns={productColumns} data={products} emptyMessage="No products registered under manufacturing licenses" />
          </div>
        </div>

        <div className="space-y-6">
          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Application</span>
                <span className="font-medium text-gray-900">{manufacturingApplications.length ? `${manufacturingApplications.length} total` : 'Missing'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">License</span>
                <span className="font-medium text-gray-900">{manufacturingLicenses.length ? `${manufacturingLicenses.length} issued` : 'Not issued'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Products</span>
                <span className="font-medium text-gray-900">{products.length}</span>
              </div>
            </div>
          </div>

          {!manufacturingLicenses.length &&
          <div className="border border-amber-200 bg-amber-50 p-5">
              <p className="text-sm text-amber-800 font-medium">Product creation is disabled until a manufacturing license is issued.</p>
            </div>
          }
        </div>
      </div>

      <Modal isOpen={showStatusModal} onClose={() => setShowStatusModal(false)} title="Update Manufacturer Status" size="sm">
        <form onSubmit={handleUpdateStatus} className="space-y-4">
          <Input label="Manufacturer" value={manufacturer.companyName || manufacturer.fullName} disabled />
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
          
          <p className="text-xs text-gray-500">When status changes, linked product status updates automatically.</p>
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

export default ManufacturerDetails;