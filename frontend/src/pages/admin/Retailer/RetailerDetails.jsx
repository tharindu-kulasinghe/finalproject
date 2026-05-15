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
import retailerApi from '../../../services/retailerApi';
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


const outletTypeLabel = (value) => {
  const labels = {
    RETAIL: 'Retail Shop',
    BAR: 'Bar',
    RESTAURANT: 'Restaurant',
    HOTEL: 'Hotel',
    CLUB: 'Club'
  };

  return labels[value] || value || '-';
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
};

const RetailerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [retailer, setRetailer] = useState(null);
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

  const fetchRetailer = useCallback(async () => {
    setLoading(true);
    try {
      const retailerResponse = await retailerApi.getRetailerById(id);
      const retailerData = retailerResponse.data?.data || null;
      setRetailer(retailerData);

      try {
        const applicationsResponse = await retailerApi.getRetailerLicenseApplication(id);
        const payload = applicationsResponse.data?.data;
        const allApplications = Array.isArray(payload?.allApplications) ?
        payload.allApplications :
        Array.isArray(payload) ?
        payload :
        payload?.id ?
        [payload] :
        [];
        setApplications(allApplications);
      } catch (applicationsError) {
        if (applicationsError.response?.status === 404) {
          const summaryApplications = retailerData?.submittedRetailApps || [];

          if (!summaryApplications.length) {
            setApplications([]);
          } else {
            const fullApplicationResponses = await Promise.allSettled(
              summaryApplications.map((item) => retailerApi.getRetailApplicationById(item.id))
            );

            const fullApplications = fullApplicationResponses.
            filter((result) => result.status === 'fulfilled').
            map((result) => result.value?.data?.data).
            filter(Boolean);

            setApplications(fullApplications.length ? fullApplications : summaryApplications);
          }
        } else {
          throw applicationsError;
        }
      }
    } catch (err) {
      console.error('Failed to fetch retailer:', err);
      toast.error(err.response?.data?.message || 'Failed to load retailer details');
      setRetailer(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRetailer();
  }, [fetchRetailer]);

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

  const retailLicenses = retailer?.licenses || [];
  const incomingOrders = retailer?.receivedDistributions || [];

  const handleOpenStatusModal = () => {
    setStatus(retailer?.status || '');
    setShowStatusModal(true);
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!status) return;

    setStatusLoading(true);
    try {
      await retailerApi.updateRetailerStatus(id, status);
      toast.success('Retailer status updated');
      setShowStatusModal(false);
      fetchRetailer();
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
      await retailerApi.updateRetailerApplication(id, {
        applicationId: selectedApplication.id,
        status: applicationStatusData.status,
        remarks: applicationStatusData.remarks
      });
      toast.success('Application status updated');
      setShowApplicationStatusModal(false);
      fetchRetailer();
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
      await retailerApi.issueRetailerLicense(id, { applicationId: selectedApplication.id });
      toast.success('Retail license issued successfully');
      fetchRetailer();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to issue retail license');
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
      fetchRetailer();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update license status');
    } finally {
      setLicenseStatusLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <LoadingSpinner text="Loading retailer details..." />
      </div>);

  }

  if (!retailer) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-gray-500">Retailer not found</p>
        <Link to="/admin/retailers">
          <Button variant="outline">Back to Retailers</Button>
        </Link>
      </div>);

  }

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


  return (
    <div className="space-y-6">
      <PageHeader
        title={retailer.companyName || retailer.fullName}
        description="Retailer profile, application, license and incoming orders"
        actions={
        <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate(`/admin/retailers/${id}/edit`)}>Edit Retailer</Button>
            <Button variant="outline" onClick={handleOpenStatusModal}>Update Status</Button>
            <Link to="/admin/retailers">
              <Button variant="outline">Back</Button>
            </Link>
          </div>
        } />
      

      <div className="text-sm text-gray-500">
        <Link to="/admin/retailers" className="hover:text-gray-700">Retailers</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">Details</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">1. Retailer Profile</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Company</p>
                <p className="font-medium text-gray-900">{retailer.companyName || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Full Name</p>
                <p className="font-medium text-gray-900">{retailer.fullName || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Email</p>
                <p className="font-medium text-gray-900">{retailer.email || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Mobile</p>
                <p className="font-medium text-gray-900">{retailer.mobile || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">NIC</p>
                <p className="font-medium text-gray-900">{retailer.nic || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Status</p>
                <Badge variant={getStatusColor(retailer.status)}>{retailer.status}</Badge>
              </div>
              <div className="md:col-span-2">
                <p className="text-gray-500">Address</p>
                <p className="font-medium text-gray-900">{retailer.address || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">District</p>
                <p className="font-medium text-gray-900">{retailer.district || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Province</p>
                <p className="font-medium text-gray-900">{retailer.province || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Created</p>
                <p className="font-medium text-gray-900">{formatDate(retailer.createdAt)}</p>
              </div>
              <div>
                <p className="text-gray-500">Last Updated</p>
                <p className="font-medium text-gray-900">{formatDate(retailer.updatedAt)}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-gray-500">Notes</p>
                <p className="font-medium text-gray-900 whitespace-pre-wrap">{retailer.notes || '-'}</p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">2. Retail Applications</h3>
            {applications.length ?
            <div className="overflow-x-auto border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="text-left px-3 py-2">Application No</th>
                      <th className="text-left px-3 py-2">Business</th>
                      <th className="text-left px-3 py-2">Outlet Type</th>
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
                        <td className="px-3 py-2">{outletTypeLabel(item.outletType)}</td>
                        <td className="px-3 py-2">
                          <Badge variant={getStatusColor(item.status)}>{item.status}</Badge>
                        </td>
                        <td className="px-3 py-2">{formatDate(item.submittedAt || item.createdAt)}</td>
                      </tr>
                  )}
                  </tbody>
                </table>
              </div> :

            <p className="text-sm text-gray-500">No retail application found.</p>
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
                  <p><span className="text-gray-500">Address:</span> <span className="font-medium text-gray-900">{selectedApplication.businessAddress || '-'}</span></p>
                  <p><span className="text-gray-500">Outlet Type:</span> <span className="font-medium text-gray-900">{outletTypeLabel(selectedApplication.outletType)}</span></p>
                  <p><span className="text-gray-500">Tax ID:</span> <span className="font-medium text-gray-900">{selectedApplication.taxIdentificationNo || '-'}</span></p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Premises & Licenses</h4>
                  <p><span className="text-gray-500">District:</span> <span className="font-medium text-gray-900">{selectedApplication.district || '-'}</span></p>
                  <p><span className="text-gray-500">Province:</span> <span className="font-medium text-gray-900">{selectedApplication.province || '-'}</span></p>
                  <p><span className="text-gray-500">Ownership:</span> <span className="font-medium text-gray-900">{selectedApplication.premisesOwnershipType || '-'}</span></p>
                  <p><span className="text-gray-500">Deed/Lease Ref:</span> <span className="font-medium text-gray-900">{selectedApplication.deedOrLeaseReference || '-'}</span></p>
                  <p><span className="text-gray-500">Trade License Ref:</span> <span className="font-medium text-gray-900">{selectedApplication.tradeLicenseRef || '-'}</span></p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Operation Details</h4>
                  <p><span className="text-gray-500">Liquor Sale Mode:</span> <span className="font-medium text-gray-900">{selectedApplication.liquorSaleMode || '-'}</span></p>
                  <p><span className="text-gray-500">Seating Capacity:</span> <span className="font-medium text-gray-900">{selectedApplication.seatingCapacity || '-'}</span></p>
                  <p><span className="text-gray-500">Tourist Board Ref:</span> <span className="font-medium text-gray-900">{selectedApplication.touristBoardApprovalRef || '-'}</span></p>
                  <p><span className="text-gray-500">Film Corporation Ref:</span> <span className="font-medium text-gray-900">{selectedApplication.filmCorporationApprovalRef || '-'}</span></p>
                  <p><span className="text-gray-500">Club Approval Ref:</span> <span className="font-medium text-gray-900">{selectedApplication.clubApprovalRef || '-'}</span></p>
                </div>
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">4. Issued Retail Licenses</h3>
            {retailLicenses.length ?
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
                    {retailLicenses.map((license) =>
                  <tr key={license.id} className="border-t border-gray-100">
                        <td className="px-3 py-2 font-medium text-gray-900">{license.licenseNumber}</td>
                        <td className="px-3 py-2">{outletTypeLabel(license.type)}</td>
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

            <p className="text-sm text-gray-500">No retail licenses issued yet.</p>
            }
          </div>

          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">5. Recent Incoming Orders</h3>
            <Table columns={incomingOrderColumns} data={incomingOrders} emptyMessage="No incoming orders" />
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
                <span className="font-medium text-gray-900">{retailLicenses.length ? `${retailLicenses.length} issued` : 'Not issued'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Incoming Orders</span>
                <span className="font-medium text-gray-900">{incomingOrders.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={showStatusModal} onClose={() => setShowStatusModal(false)} title="Update Retailer Status" size="sm">
        <form onSubmit={handleUpdateStatus} className="space-y-4">
          <Input label="Retailer" value={retailer.companyName || retailer.fullName} disabled />
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

export default RetailerDetails;