import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import PageHeader from '../../../components/common/PageHeader';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import SelectDropdown from '../../../components/common/SelectDropdown';
import Textarea from '../../../components/common/Textarea';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import distributorApi from '../../../services/distributorApi';
import manufacturerApi from '../../../services/manufacturerApi';

const createEmptyDistributionApplication = () => ({
  id: null,
  isNew: true,
  applicationNo: '',
  applicantName: '',
  applicantEmail: '',
  applicantPhone: '',
  businessName: '',
  businessRegistrationNo: '',
  taxIdentificationNo: '',
  manufacturerIds: [],
  retailerIds: [],
  warehouseAddress: '',
  premisesOwnershipType: '',
  deedOrLeaseReference: '',
  buildingPlanReference: '',
  packingListDetails: '',
  oicCertificationRef: '',
  warehouseCapacity: '',
  transportDetails: '',
  distributionScope: '',
  applicationStatus: 'SUBMITTED',
  remarks: ''
});

const createEmptyApplicationFiles = () => ({
  BUSINESS_REGISTRATION: null,
  TAX_DOCUMENT: null,
  DEED_OR_LEASE: null,
  OTHER: null
});

const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_UPLOAD_SIZE_BYTES = 2 * 1024 * 1024;

const statusOptions = [
{ value: 'PENDING', label: 'Pending' },
{ value: 'ACTIVE', label: 'Active' },
{ value: 'INACTIVE', label: 'Inactive' },
{ value: 'SUSPENDED', label: 'Suspended' }];


const applicationStatusOptions = [
{ value: 'DRAFT', label: 'Draft' },
{ value: 'SUBMITTED', label: 'Submitted' },
{ value: 'UNDER_REVIEW', label: 'Under Review' },
{ value: 'APPROVED', label: 'Approved' },
{ value: 'REJECTED', label: 'Rejected' },
{ value: 'RETURNED', label: 'Returned' }];


const premisesOwnershipOptions = [
{ value: '', label: 'Select premises ownership' },
{ value: 'OWNED', label: 'Owned' },
{ value: 'LEASED', label: 'Leased' },
{ value: 'RENTED', label: 'Rented' },
{ value: 'OTHER', label: 'Other' }];


const provinceOptions = [
{ value: '', label: 'Select province' },
{ value: 'WESTERN', label: 'Western' },
{ value: 'CENTRAL', label: 'Central' },
{ value: 'SOUTHERN', label: 'Southern' },
{ value: 'NORTHERN', label: 'Northern' },
{ value: 'EASTERN', label: 'Eastern' },
{ value: 'NORTH_WESTERN', label: 'North Western' },
{ value: 'NORTH_CENTRAL', label: 'North Central' },
{ value: 'UVA', label: 'Uva' },
{ value: 'SABARAGAMUWA', label: 'Sabaragamuwa' }];


const buildApplicationFromApi = (application) => ({
  id: application.id,
  isNew: false,
  applicationNo: application.applicationNo || '',
  applicantName: application.applicantName || '',
  applicantEmail: application.applicantEmail || '',
  applicantPhone: application.applicantPhone || '',
  businessName: application.businessName || '',
  businessRegistrationNo: application.businessRegistrationNo || '',
  taxIdentificationNo: application.taxIdentificationNo || '',
  manufacturerIds: (application.selectedManufacturers || []).
  map((item) => item.manufacturerId || item.manufacturer?.id).
  filter(Boolean),
  retailerIds: (application.selectedRetailers || []).
  map((item) => item.retailerId || item.retailer?.id).
  filter(Boolean),
  warehouseAddress: application.warehouseAddress || '',
  premisesOwnershipType: application.premisesOwnershipType || '',
  deedOrLeaseReference: application.deedOrLeaseReference || '',
  buildingPlanReference: application.buildingPlanReference || '',
  packingListDetails: application.packingListDetails || '',
  oicCertificationRef: application.oicCertificationRef || '',
  warehouseCapacity: application.warehouseCapacity || '',
  transportDetails: application.transportDetails || '',
  distributionScope: application.distributionScope || '',
  applicationStatus: application.status || 'SUBMITTED',
  remarks: application.remarks || ''
});

const EditDistributor = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [distributorName, setDistributorName] = useState('');
  const [currentStatus, setCurrentStatus] = useState('');
  const [manufacturers, setManufacturers] = useState([]);
  const [retailers, setRetailers] = useState([]);
  const [manufacturerSearch, setManufacturerSearch] = useState('');
  const [retailerSearch, setRetailerSearch] = useState('');

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobile: '',
    companyName: '',
    nic: '',
    address: '',
    status: 'PENDING',
    district: '',
    province: '',
    notes: ''
  });

  const [licenseApplications, setLicenseApplications] = useState([]);
  const [licenseApplicationFiles, setLicenseApplicationFiles] = useState([]);

  const filteredManufacturers = useMemo(() => {
    const keyword = manufacturerSearch.trim().toLowerCase();
    if (!keyword) return manufacturers;

    return manufacturers.filter((manufacturer) =>
    `${manufacturer.companyName || ''} ${manufacturer.fullName || ''} ${manufacturer.email || ''}`.
    toLowerCase().
    includes(keyword)
    );
  }, [manufacturers, manufacturerSearch]);

  const filteredRetailers = useMemo(() => {
    const keyword = retailerSearch.trim().toLowerCase();
    if (!keyword) return retailers;

    return retailers.filter((retailer) =>
    `${retailer.companyName || ''} ${retailer.fullName || ''} ${retailer.email || ''}`.
    toLowerCase().
    includes(keyword)
    );
  }, [retailers, retailerSearch]);

  const getApplicationError = (index, field) => errors[`applications.${index}.${field}`];

  const fetchDistributor = useCallback(async () => {
    setLoading(true);
    try {
      const [distributorResponse, manufacturerResponse, retailerResponse] = await Promise.all([
      distributorApi.getDistributorById(id),
      manufacturerApi.getActiveManufacturers(),
      distributorApi.getAvailableRetailers()]
      );

      const distributor = distributorResponse?.data?.data;
      if (!distributor) {
        toast.error('Distributor not found');
        navigate('/admin/distributors');
        return;
      }

      setManufacturers(manufacturerResponse?.data?.data || []);
      setRetailers(retailerResponse?.data?.data || []);
      setDistributorName(distributor.companyName || distributor.fullName || 'Distributor');

      setFormData({
        fullName: distributor.fullName || '',
        email: distributor.email || '',
        mobile: distributor.mobile || '',
        companyName: distributor.companyName || '',
        nic: distributor.nic || '',
        address: distributor.address || '',
        status: distributor.status || 'PENDING',
        district: distributor.district || '',
        province: distributor.province || '',
        notes: distributor.notes || ''
      });
      setCurrentStatus(distributor.status || 'PENDING');

      const submittedAppSummaries = distributor.submittedDistributionApps || [];
      if (!submittedAppSummaries.length) {
        setLicenseApplications([createEmptyDistributionApplication()]);
        setLicenseApplicationFiles([createEmptyApplicationFiles()]);
        return;
      }

      try {
        const applicationResponse = await distributorApi.getDistributorLicenseApplication(id);
        const applications = applicationResponse?.data?.data?.allApplications || [];

        if (applications.length) {
          const mappedApplications = applications.map(buildApplicationFromApi);
          setLicenseApplications(mappedApplications);
          setLicenseApplicationFiles(mappedApplications.map(() => createEmptyApplicationFiles()));
        } else {
          setLicenseApplications([createEmptyDistributionApplication()]);
          setLicenseApplicationFiles([createEmptyApplicationFiles()]);
        }
      } catch (applicationError) {
        if (applicationError.response?.status === 404) {
          setLicenseApplications([createEmptyDistributionApplication()]);
          setLicenseApplicationFiles([createEmptyApplicationFiles()]);
        } else {
          throw applicationError;
        }
      }
    } catch (error) {
      console.error('Failed to load distributor for editing', error);
      toast.error(error.response?.data?.message || 'Failed to load distributor details');
      navigate('/admin/distributors');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchDistributor();
  }, [fetchDistributor]);

  const handleApplicationChange = (index, field, value) => {
    setLicenseApplications((prev) => prev.map((application, applicationIndex) => {
      if (applicationIndex !== index) return application;
      return {
        ...application,
        [field]: value
      };
    }));

    setErrors((prev) => {
      const key = `applications.${index}.${field}`;
      if (!prev[key]) return prev;
      const { [key]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const toggleManufacturer = (index, manufacturerId) => {
    setLicenseApplications((prev) => prev.map((application, appIndex) => {
      if (appIndex !== index) return application;
      const exists = application.manufacturerIds.includes(manufacturerId);
      const nextManufacturerIds = exists ?
      application.manufacturerIds.filter((id) => id !== manufacturerId) :
      [...application.manufacturerIds, manufacturerId];

      return {
        ...application,
        manufacturerIds: nextManufacturerIds
      };
    }));

    setErrors((prev) => {
      const key = `applications.${index}.manufacturerIds`;
      if (!prev[key]) return prev;
      const { [key]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const toggleRetailer = (index, retailerId) => {
    setLicenseApplications((prev) => prev.map((application, appIndex) => {
      if (appIndex !== index) return application;
      const exists = application.retailerIds.includes(retailerId);
      const nextRetailerIds = exists ?
      application.retailerIds.filter((id) => id !== retailerId) :
      [...application.retailerIds, retailerId];

      return {
        ...application,
        retailerIds: nextRetailerIds
      };
    }));

    setErrors((prev) => {
      const key = `applications.${index}.retailerIds`;
      if (!prev[key]) return prev;
      const { [key]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const handleApplicationFileChange = (index, category, file) => {
    const fieldByCategory = {
      BUSINESS_REGISTRATION: 'businessRegistrationFile',
      TAX_DOCUMENT: 'taxDocumentFile',
      DEED_OR_LEASE: 'deedOrLeaseFile',
      OTHER: 'otherFile'
    };
    const field = fieldByCategory[category];
    const errorKey = `applications.${index}.${field}`;

    if (file && !ALLOWED_FILE_TYPES.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        [errorKey]: 'Invalid file type. Only JPG, JPEG, PNG and WEBP images are allowed.'
      }));
      return;
    }

    if (file && file.size > MAX_UPLOAD_SIZE_BYTES) {
      setErrors((prev) => ({
        ...prev,
        [errorKey]: 'File size exceeds 2MB limit.'
      }));
      return;
    }

    setLicenseApplicationFiles((prev) => prev.map((applicationFiles, applicationIndex) => {
      if (applicationIndex !== index) return applicationFiles;
      return {
        ...applicationFiles,
        [category]: file
      };
    }));

    setErrors((prev) => {
      if (!errorKey || !prev[errorKey]) return prev;
      const { [errorKey]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';else
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (!formData.companyName.trim()) newErrors.companyName = 'Company name is required';
    if (!formData.district.trim()) newErrors.district = 'District is required';
    if (!formData.province.trim()) newErrors.province = 'Province is required';

    if (!licenseApplications.length) {
      newErrors.applications = 'At least one license application is required';
    }

    licenseApplications.forEach((application, index) => {
      if (!application.businessName.trim()) newErrors[`applications.${index}.businessName`] = 'Business name is required';
      if (!application.warehouseAddress.trim()) newErrors[`applications.${index}.warehouseAddress`] = 'Warehouse address is required';
      if (!application.premisesOwnershipType.trim()) newErrors[`applications.${index}.premisesOwnershipType`] = 'Premises ownership type is required';
      if (!application.manufacturerIds.length) newErrors[`applications.${index}.manufacturerIds`] = 'Select at least one manufacturer';
      if (!application.retailerIds.length) newErrors[`applications.${index}.retailerIds`] = 'Select at least one retailer';

      if (application.isNew) {
        const applicationFiles = licenseApplicationFiles[index] || createEmptyApplicationFiles();
        if (!applicationFiles.BUSINESS_REGISTRATION) newErrors[`applications.${index}.businessRegistrationFile`] = 'Business Registration file is required for new applications';
        if (!applicationFiles.TAX_DOCUMENT) newErrors[`applications.${index}.taxDocumentFile`] = 'Tax Document file is required for new applications';
        if (!applicationFiles.DEED_OR_LEASE) newErrors[`applications.${index}.deedOrLeaseFile`] = 'Deed or Lease file is required for new applications';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddLicenseApplication = () => {
    setLicenseApplications((prev) => [...prev, createEmptyDistributionApplication()]);
    setLicenseApplicationFiles((prev) => [...prev, createEmptyApplicationFiles()]);
  };

  const handleRemoveLicenseApplication = (indexToRemove) => {
    const target = licenseApplications[indexToRemove];
    if (!target?.isNew) {
      toast.error('Only newly added applications can be removed here');
      return;
    }

    setLicenseApplications((prev) => prev.filter((_, index) => index !== indexToRemove));
    setLicenseApplicationFiles((prev) => prev.filter((_, index) => index !== indexToRemove));

    setErrors((prev) => {
      const nextErrors = {};
      Object.entries(prev).forEach(([key, value]) => {
        if (!key.startsWith('applications.')) {
          nextErrors[key] = value;
          return;
        }

        const match = key.match(/^applications\.(\d+)\.(.+)$/);
        if (!match) {
          nextErrors[key] = value;
          return;
        }

        const currentIndex = Number(match[1]);
        const field = match[2];
        if (currentIndex === indexToRemove) return;
        const newIndex = currentIndex > indexToRemove ? currentIndex - 1 : currentIndex;
        nextErrors[`applications.${newIndex}.${field}`] = value;
      });

      return nextErrors;
    });
  };

  const buildApplicationPayload = (application) => ({
    applicantName: application.applicantName,
    applicantEmail: application.applicantEmail,
    applicantPhone: application.applicantPhone,
    businessName: application.businessName,
    businessRegistrationNo: application.businessRegistrationNo,
    taxIdentificationNo: application.taxIdentificationNo,
    warehouseAddress: application.warehouseAddress,
    district: formData.district,
    province: formData.province,
    premisesOwnershipType: application.premisesOwnershipType,
    deedOrLeaseReference: application.deedOrLeaseReference,
    buildingPlanReference: application.buildingPlanReference,
    packingListDetails: application.packingListDetails,
    oicCertificationRef: application.oicCertificationRef,
    warehouseCapacity: application.warehouseCapacity,
    transportDetails: application.transportDetails,
    distributionScope: application.distributionScope,
    manufacturerIds: application.manufacturerIds,
    retailerIds: application.retailerIds,
    remarks: application.remarks,
    status: application.applicationStatus
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!validateForm()) return;

    setSaving(true);

    try {
      await distributorApi.updateDistributor(id, {
        fullName: formData.fullName,
        mobile: formData.mobile,
        companyName: formData.companyName,
        nic: formData.nic,
        address: formData.address,
        district: formData.district,
        province: formData.province,
        notes: formData.notes
      });

      if (formData.status && formData.status !== currentStatus) {
        await distributorApi.updateDistributorStatus(id, formData.status);
      }

      const requiredUploadCategories = ['BUSINESS_REGISTRATION', 'TAX_DOCUMENT', 'DEED_OR_LEASE'];

      for (let index = 0; index < licenseApplications.length; index += 1) {
        const application = licenseApplications[index];
        const applicationFiles = licenseApplicationFiles[index] || createEmptyApplicationFiles();
        const applicationPayload = buildApplicationPayload(application);

        let applicationId = application.id;

        if (application.id) {
          await distributorApi.updateDistributionApplication(application.id, applicationPayload);
        } else {
          const createResponse = await distributorApi.createDistributorApplication(id, {
            ...applicationPayload,
            applicationStatus: application.applicationStatus
          });
          applicationId = createResponse?.data?.data?.id;
          if (!applicationId) {
            throw new Error('Distribution application ID not found after adding additional application');
          }
        }

        if (application.isNew) {
          for (const category of requiredUploadCategories) {
            const uploadData = new FormData();
            uploadData.append('file', applicationFiles[category]);
            uploadData.append('category', category);
            await distributorApi.uploadDistributionApplicationFile(applicationId, uploadData);
          }

          if (applicationFiles.OTHER) {
            const otherUploadData = new FormData();
            otherUploadData.append('file', applicationFiles.OTHER);
            otherUploadData.append('category', 'OTHER');
            await distributorApi.uploadDistributionApplicationFile(applicationId, otherUploadData);
          }
        } else {
          for (const [category, file] of Object.entries(applicationFiles)) {
            if (!file) continue;
            const uploadData = new FormData();
            uploadData.append('file', file);
            uploadData.append('category', category);
            await distributorApi.uploadDistributionApplicationFile(applicationId, uploadData);
          }
        }
      }

      toast.success('Distributor updated successfully');
      navigate(`/admin/distributors/${id}`);
    } catch (error) {
      console.error('Failed to update distributor', error);
      const message = error.response?.data?.message || 'Failed to update distributor';
      setSubmitError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <LoadingSpinner />
      </div>);

  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${distributorName}`}
        description="Update distributor account and license application details"
        actions={
        <Link to={`/admin/distributors/${id}`}>
            <Button variant="outline">Back to Details</Button>
          </Link>
        } />
      

      {submitError &&
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <p className="font-medium">{submitError}</p>
        </div>
      }

      <div className="border border-gray-200 bg-white">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Distributor Account Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Full Name *"
                value={formData.fullName}
                onChange={(e) => setFormData((prev) => ({ ...prev, fullName: e.target.value }))}
                error={errors.fullName}
                required />
              
              <Input
                label="Email *"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                error={errors.email}
                required
                disabled />
              
              <Input
                label="Mobile"
                value={formData.mobile}
                onChange={(e) => setFormData((prev) => ({ ...prev, mobile: e.target.value }))} />
              
              <Input
                label="Company Name *"
                value={formData.companyName}
                onChange={(e) => setFormData((prev) => ({ ...prev, companyName: e.target.value }))}
                error={errors.companyName}
                required />
              
              <Input
                label="NIC"
                value={formData.nic}
                onChange={(e) => setFormData((prev) => ({ ...prev, nic: e.target.value }))} />
              
              <SelectDropdown
                label="Account Status"
                value={formData.status}
                onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
                options={statusOptions} />
              
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Address Information</h3>
            <div className="space-y-4">
              <Textarea
                label="Address"
                value={formData.address}
                onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                rows={3} />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="District *"
                  value={formData.district}
                  onChange={(e) => setFormData((prev) => ({ ...prev, district: e.target.value }))}
                  error={errors.district}
                  required />
                
                <SelectDropdown
                  label="Province *"
                  value={formData.province}
                  onChange={(e) => setFormData((prev) => ({ ...prev, province: e.target.value }))}
                  options={provinceOptions}
                  error={errors.province}
                  required />
                
              </div>
              <Textarea
                label="Notes"
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                rows={3} />
              
            </div>
          </div>

          <div>
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900">License Application Details</h3>
            </div>

            {errors.applications && <p className="text-sm text-red-600 mb-3">{errors.applications}</p>}

            <div className="space-y-6">
              {licenseApplications.map((application, index) =>
              <div key={`application-${application.id || index}`} className="border border-gray-200 rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold text-gray-800">
                      Application {index + 1}{application.applicationNo ? ` - ${application.applicationNo}` : ''}
                    </h4>
                    {application.isNew && licenseApplications.length > 1 &&
                  <Button type="button" variant="outline" onClick={() => handleRemoveLicenseApplication(index)}>
                        Remove
                      </Button>
                  }
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                    label="Applicant Name"
                    value={application.applicantName}
                    onChange={(e) => handleApplicationChange(index, 'applicantName', e.target.value)} />
                  
                    <Input
                    label="Applicant Email"
                    type="email"
                    value={application.applicantEmail}
                    onChange={(e) => handleApplicationChange(index, 'applicantEmail', e.target.value)} />
                  
                    <Input
                    label="Applicant Phone"
                    value={application.applicantPhone}
                    onChange={(e) => handleApplicationChange(index, 'applicantPhone', e.target.value)} />
                  
                    <SelectDropdown
                    label="Application Status"
                    value={application.applicationStatus}
                    onChange={(e) => handleApplicationChange(index, 'applicationStatus', e.target.value)}
                    options={applicationStatusOptions} />
                  
                    <Input
                    label="Business Name *"
                    value={application.businessName}
                    onChange={(e) => handleApplicationChange(index, 'businessName', e.target.value)}
                    error={getApplicationError(index, 'businessName')}
                    required />
                  
                    <Input
                    label="Business Registration No"
                    value={application.businessRegistrationNo}
                    onChange={(e) => handleApplicationChange(index, 'businessRegistrationNo', e.target.value)} />
                  
                    <Input
                    label="Tax Identification No"
                    value={application.taxIdentificationNo}
                    onChange={(e) => handleApplicationChange(index, 'taxIdentificationNo', e.target.value)} />
                  
                    <SelectDropdown
                    label="Premises Ownership Type *"
                    value={application.premisesOwnershipType}
                    onChange={(e) => handleApplicationChange(index, 'premisesOwnershipType', e.target.value)}
                    options={premisesOwnershipOptions}
                    error={getApplicationError(index, 'premisesOwnershipType')}
                    required />
                  
                    <Input
                    label="Deed/Lease Reference"
                    value={application.deedOrLeaseReference}
                    onChange={(e) => handleApplicationChange(index, 'deedOrLeaseReference', e.target.value)} />
                  
                    <Input
                    label="Warehouse Capacity"
                    value={application.warehouseCapacity}
                    onChange={(e) => handleApplicationChange(index, 'warehouseCapacity', e.target.value)} />
                  
                    <Input
                    label="OIC Certification Ref"
                    value={application.oicCertificationRef}
                    onChange={(e) => handleApplicationChange(index, 'oicCertificationRef', e.target.value)} />
                  
                  </div>

                  <Textarea
                  label="Warehouse Address *"
                  value={application.warehouseAddress}
                  onChange={(e) => handleApplicationChange(index, 'warehouseAddress', e.target.value)}
                  rows={3}
                  error={getApplicationError(index, 'warehouseAddress')}
                  required />
                

                  <Textarea
                  label="Building Plan Reference"
                  value={application.buildingPlanReference}
                  onChange={(e) => handleApplicationChange(index, 'buildingPlanReference', e.target.value)}
                  rows={2} />
                
                  <Textarea
                  label="Packing List Details"
                  value={application.packingListDetails}
                  onChange={(e) => handleApplicationChange(index, 'packingListDetails', e.target.value)}
                  rows={2} />
                
                  <Textarea
                  label="Transport Details"
                  value={application.transportDetails}
                  onChange={(e) => handleApplicationChange(index, 'transportDetails', e.target.value)}
                  rows={2} />
                
                  <Textarea
                  label="Distribution Scope"
                  value={application.distributionScope}
                  onChange={(e) => handleApplicationChange(index, 'distributionScope', e.target.value)}
                  rows={2} />
                
                  <Textarea
                  label="Remarks"
                  value={application.remarks}
                  onChange={(e) => handleApplicationChange(index, 'remarks', e.target.value)}
                  rows={3} />
                

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Linked Manufacturer(s) *</label>
                    <input
                    type="text"
                    value={manufacturerSearch}
                    onChange={(e) => setManufacturerSearch(e.target.value)}
                    placeholder="Search by company, name, or email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  
                    <div className={`mt-2 max-h-56 overflow-y-auto border p-3 space-y-2 rounded-lg ${getApplicationError(index, 'manufacturerIds') ? 'border-red-400' : 'border-gray-300'}`}>
                      {filteredManufacturers.map((manufacturer) =>
                    <label key={`${index}-${manufacturer.id}`} className="flex items-start gap-3 rounded-md border border-gray-200 p-3 hover:bg-gray-50 cursor-pointer">
                          <input
                        type="checkbox"
                        checked={application.manufacturerIds.includes(manufacturer.id)}
                        onChange={() => toggleManufacturer(index, manufacturer.id)}
                        className="mt-1" />
                      
                          <div className="text-sm">
                            <p className="font-medium text-gray-800">{manufacturer.companyName || manufacturer.fullName}</p>
                            <p className="text-gray-500">{manufacturer.email}</p>
                            <p className="text-xs text-gray-500">
                              Licenses: {manufacturer.licenses?.length ?
                          manufacturer.licenses.map((license) => license.licenseNumber).join(', ') :
                          'Active manufacturing license'}
                            </p>
                          </div>
                        </label>
                    )}
                      {!filteredManufacturers.length && <p className="text-sm text-gray-500">No manufacturers found for the current search.</p>}
                    </div>
                    {getApplicationError(index, 'manufacturerIds') && <p className="text-sm text-red-600 mt-1">{getApplicationError(index, 'manufacturerIds')}</p>}
                    <p className="text-xs text-gray-500 mt-1">A distributor application must link one or more active manufacturers.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Linked Retailer(s) *</label>
                    <input
                    type="text"
                    value={retailerSearch}
                    onChange={(e) => setRetailerSearch(e.target.value)}
                    placeholder="Search by company, name, or email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  
                    <div className={`mt-2 max-h-56 overflow-y-auto border p-3 space-y-2 rounded-lg ${getApplicationError(index, 'retailerIds') ? 'border-red-400' : 'border-gray-300'}`}>
                      {filteredRetailers.map((retailer) =>
                    <label key={`${index}-${retailer.id}`} className="flex items-start gap-3 rounded-md border border-gray-200 p-3 hover:bg-gray-50 cursor-pointer">
                          <input
                        type="checkbox"
                        checked={application.retailerIds.includes(retailer.id)}
                        onChange={() => toggleRetailer(index, retailer.id)}
                        className="mt-1" />
                      
                          <div className="text-sm">
                            <p className="font-medium text-gray-800">{retailer.companyName || retailer.fullName}</p>
                            <p className="text-gray-500">{retailer.email}</p>
                            <p className="text-xs text-gray-500">
                              License: {retailer.license?.licenseNumber || 'Active retail license'}
                            </p>
                          </div>
                        </label>
                    )}
                      {!filteredRetailers.length && <p className="text-sm text-gray-500">No retailers found for the current search.</p>}
                    </div>
                    {getApplicationError(index, 'retailerIds') && <p className="text-sm text-red-600 mt-1">{getApplicationError(index, 'retailerIds')}</p>}
                    <p className="text-xs text-gray-500 mt-1">A distributor application can link multiple retailers under one license application.</p>
                  </div>

                  <div>
                    <h5 className="text-sm font-semibold text-gray-800 mb-3">Required Application Documents</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Business Registration {application.isNew ? '*' : ''}</label>
                        <input
                        type="file"
                        onChange={(e) => handleApplicationFileChange(index, 'BUSINESS_REGISTRATION', e.target.files?.[0] || null)}
                        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/jpg,image/png,image/webp"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                      
                        {getApplicationError(index, 'businessRegistrationFile') && <p className="text-sm text-red-600 mt-1">{getApplicationError(index, 'businessRegistrationFile')}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tax Document {application.isNew ? '*' : ''}</label>
                        <input
                        type="file"
                        onChange={(e) => handleApplicationFileChange(index, 'TAX_DOCUMENT', e.target.files?.[0] || null)}
                        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/jpg,image/png,image/webp"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                      
                        {getApplicationError(index, 'taxDocumentFile') && <p className="text-sm text-red-600 mt-1">{getApplicationError(index, 'taxDocumentFile')}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Deed or Lease {application.isNew ? '*' : ''}</label>
                        <input
                        type="file"
                        onChange={(e) => handleApplicationFileChange(index, 'DEED_OR_LEASE', e.target.files?.[0] || null)}
                        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/jpg,image/png,image/webp"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                      
                        {getApplicationError(index, 'deedOrLeaseFile') && <p className="text-sm text-red-600 mt-1">{getApplicationError(index, 'deedOrLeaseFile')}</p>}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Other Document</label>
                        <input
                        type="file"
                        onChange={(e) => handleApplicationFileChange(index, 'OTHER', e.target.files?.[0] || null)}
                        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/jpg,image/png,image/webp"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                      
                        {getApplicationError(index, 'otherFile') && <p className="text-sm text-red-600 mt-1">{getApplicationError(index, 'otherFile')}</p>}
                      </div>
                    </div>

                    {!application.isNew &&
                  <p className="text-xs text-gray-500 mt-2">For existing applications, uploading files here is optional and will add new documents.</p>
                  }
                    <p className="text-xs text-gray-500 mt-2">Allowed types: JPG, JPEG, PNG, WEBP. Maximum file size: 2MB.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <Button type="button" variant="outline" onClick={handleAddLicenseApplication}>Add License Application</Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              <span className="font-medium">Required fields are marked with *</span>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={() => navigate(`/admin/distributors/${id}`)}>
                Cancel
              </Button>
              <Button type="submit" loading={saving} className="flex-1 sm:flex-none">
                Save Changes
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>);

};

export default EditDistributor;