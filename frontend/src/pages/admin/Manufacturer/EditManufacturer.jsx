import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import PageHeader from '../../../components/common/PageHeader';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import SelectDropdown from '../../../components/common/SelectDropdown';
import Textarea from '../../../components/common/Textarea';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import manufacturerApi from '../../../services/manufacturerApi';

const createEmptyLicenseApplication = () => ({
  id: null,
  isNew: true,
  applicationNo: '',
  applicantName: '',
  applicantEmail: '',
  applicantPhone: '',
  companyRegistrationNo: '',
  taxIdentificationNo: '',
  businessAddress: '',
  premisesOwnershipType: '',
  deedOrLeaseReference: '',
  productCategory: '',
  productName: '',
  packType: '',
  packSizeMl: '',
  alcoholStrength: '',
  productDescription: '',
  manufacturingType: '',
  rawMaterialDetails: '',
  productionCapacity: '',
  environmentalApprovalRef: '',
  fireSafetyApprovalRef: '',
  otherGovernmentApprovals: '',
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


const productTypeOptions = [
{ value: '', label: 'Select product type' },
{ value: 'ARRACK', label: 'Arrack' },
{ value: 'WHISKY', label: 'Whisky' },
{ value: 'BRANDY', label: 'Brandy' },
{ value: 'VODKA', label: 'Vodka' },
{ value: 'GIN', label: 'Gin' },
{ value: 'RUM', label: 'Rum' },
{ value: 'BEER', label: 'Beer' },
{ value: 'WINE', label: 'Wine' },
{ value: 'TODDY', label: 'Toddy' },
{ value: 'LIQUOR_BASED_PRODUCT', label: 'Liquor Based Product' },
{ value: 'TOBACCO', label: 'Tobacco' },
{ value: 'OTHER', label: 'Other' }];


const packTypeOptions = [
{ value: '', label: 'Select pack type' },
{ value: 'BOTTLE', label: 'Bottle' },
{ value: 'CAN', label: 'Can' },
{ value: 'KEG', label: 'Keg' },
{ value: 'SACHET', label: 'Sachet' },
{ value: 'OTHER', label: 'Other' }];


const manufacturingTypeOptions = [
{ value: '', label: 'Select manufacturing type' },
{ value: 'DISTILLERY', label: 'Distillery' },
{ value: 'BREWERY', label: 'Brewery' },
{ value: 'FERMENTATION', label: 'Fermentation' },
{ value: 'BLENDING', label: 'Blending' },
{ value: 'BOTTLING', label: 'Bottling' },
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


const parseProposedProduct = (rawValue, fallbackType = '') => {
  if (!rawValue) {
    return {
      productCategory: fallbackType,
      productName: '',
      packType: '',
      packSizeMl: '',
      alcoholStrength: '',
      productDescription: ''
    };
  }

  try {
    const parsed = JSON.parse(rawValue);
    const product = Array.isArray(parsed) && parsed.length ? parsed[0] : null;

    if (!product) {
      return {
        productCategory: fallbackType,
        productName: '',
        packType: '',
        packSizeMl: '',
        alcoholStrength: '',
        productDescription: ''
      };
    }

    return {
      productCategory: product.category || fallbackType || '',
      productName: product.name || '',
      packType: product.packType || '',
      packSizeMl: product.packSizeMl != null ? String(product.packSizeMl) : '',
      alcoholStrength: product.alcoholStrength != null ? String(product.alcoholStrength) : '',
      productDescription: product.description || ''
    };
  } catch {
    return {
      productCategory: fallbackType,
      productName: '',
      packType: '',
      packSizeMl: '',
      alcoholStrength: '',
      productDescription: ''
    };
  }
};

const buildApplicationFromApi = (app) => {
  const product = parseProposedProduct(app.proposedProductsJson, app.productType);

  return {
    id: app.id,
    isNew: false,
    applicationNo: app.applicationNo,
    applicantName: app.applicantName || '',
    applicantEmail: app.applicantEmail || '',
    applicantPhone: app.applicantPhone || '',
    companyRegistrationNo: app.companyRegistrationNo || '',
    taxIdentificationNo: app.taxIdentificationNo || '',
    businessAddress: app.businessAddress || '',
    premisesOwnershipType: app.premisesOwnershipType || '',
    deedOrLeaseReference: app.deedOrLeaseReference || '',
    productCategory: product.productCategory,
    productName: product.productName,
    packType: product.packType,
    packSizeMl: product.packSizeMl,
    alcoholStrength: product.alcoholStrength,
    productDescription: product.productDescription,
    manufacturingType: app.manufacturingType || '',
    rawMaterialDetails: app.rawMaterialDetails || '',
    productionCapacity: app.productionCapacity || '',
    environmentalApprovalRef: app.environmentalApprovalRef || '',
    fireSafetyApprovalRef: app.fireSafetyApprovalRef || '',
    otherGovernmentApprovals: app.otherGovernmentApprovals || '',
    applicationStatus: app.status || 'SUBMITTED',
    remarks: app.remarks || ''
  };
};

const EditManufacturer = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [manufacturerName, setManufacturerName] = useState('');

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

  const getApplicationError = (index, field) => errors[`applications.${index}.${field}`];

  const fetchManufacturer = useCallback(async () => {
    setLoading(true);
    try {
      const response = await manufacturerApi.getManufacturerById(id);
      const data = response?.data?.data;

      if (!data) {
        toast.error('Manufacturer not found');
        navigate('/admin/manufacturers');
        return;
      }

      setManufacturerName(data.companyName || data.fullName || 'Manufacturer');
      setFormData({
        fullName: data.fullName || '',
        email: data.email || '',
        mobile: data.mobile || '',
        companyName: data.companyName || '',
        nic: data.nic || '',
        address: data.address || '',
        status: data.status || 'PENDING',
        district: data.district || '',
        province: data.province || '',
        notes: data.notes || ''
      });

      const mappedApps = (data.submittedManufacturingApps || []).map(buildApplicationFromApi);
      if (mappedApps.length) {
        setLicenseApplications(mappedApps);
        setLicenseApplicationFiles(mappedApps.map(() => createEmptyApplicationFiles()));
      } else {
        setLicenseApplications([createEmptyLicenseApplication()]);
        setLicenseApplicationFiles([createEmptyApplicationFiles()]);
      }
    } catch (error) {
      console.error('Failed to load manufacturer for editing', error);
      toast.error(error.response?.data?.message || 'Failed to load manufacturer details');
      navigate('/admin/manufacturers');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchManufacturer();
  }, [fetchManufacturer]);

  const handleApplicationChange = (index, field, value) => {
    setLicenseApplications((prev) => prev.map((app, appIndex) => {
      if (appIndex !== index) return app;
      return { ...app, [field]: value };
    }));

    setErrors((prev) => {
      const key = `applications.${index}.${field}`;
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

    setLicenseApplicationFiles((prev) => prev.map((appFiles, appIndex) => {
      if (appIndex !== index) return appFiles;
      return { ...appFiles, [category]: file };
    }));

    setErrors((prev) => {
      if (!prev[errorKey]) return prev;
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
      if (!application.businessAddress.trim()) newErrors[`applications.${index}.businessAddress`] = 'Business address is required';
      if (!application.premisesOwnershipType.trim()) newErrors[`applications.${index}.premisesOwnershipType`] = 'Premises ownership type is required';
      if (!application.productCategory.trim()) newErrors[`applications.${index}.productCategory`] = 'Product category is required';
      if (!application.productName.trim()) newErrors[`applications.${index}.productName`] = 'Product name is required';
      if (!application.manufacturingType.trim()) newErrors[`applications.${index}.manufacturingType`] = 'Manufacturing type is required';

      if (application.isNew) {
        const files = licenseApplicationFiles[index] || createEmptyApplicationFiles();
        if (!files.BUSINESS_REGISTRATION) newErrors[`applications.${index}.businessRegistrationFile`] = 'Business Registration file is required for new applications';
        if (!files.TAX_DOCUMENT) newErrors[`applications.${index}.taxDocumentFile`] = 'Tax Document file is required for new applications';
        if (!files.DEED_OR_LEASE) newErrors[`applications.${index}.deedOrLeaseFile`] = 'Deed or Lease file is required for new applications';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddLicenseApplication = () => {
    setLicenseApplications((prev) => [...prev, createEmptyLicenseApplication()]);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!validateForm()) return;

    setSaving(true);

    try {
      await manufacturerApi.updateManufacturer(id, {
        fullName: formData.fullName,
        email: formData.email,
        mobile: formData.mobile,
        companyName: formData.companyName,
        nic: formData.nic,
        address: formData.address,
        status: formData.status,
        district: formData.district,
        province: formData.province,
        notes: formData.notes
      });

      const requiredUploadCategories = ['BUSINESS_REGISTRATION', 'TAX_DOCUMENT', 'DEED_OR_LEASE'];

      for (let index = 0; index < licenseApplications.length; index += 1) {
        const application = licenseApplications[index];
        const applicationFiles = licenseApplicationFiles[index] || createEmptyApplicationFiles();

        const selectedProduct = {
          category: application.productCategory,
          name: application.productName.trim(),
          packType: application.packType || null,
          packSizeMl: application.packSizeMl ? Number(application.packSizeMl) : null,
          alcoholStrength: application.alcoholStrength ? Number(application.alcoholStrength) : null,
          description: application.productDescription.trim() || null
        };

        const applicationPayload = {
          applicantName: application.applicantName,
          applicantEmail: application.applicantEmail,
          applicantPhone: application.applicantPhone,
          companyName: formData.companyName,
          companyRegistrationNo: application.companyRegistrationNo,
          taxIdentificationNo: application.taxIdentificationNo,
          businessAddress: application.businessAddress,
          district: formData.district,
          province: formData.province,
          premisesOwnershipType: application.premisesOwnershipType,
          deedOrLeaseReference: application.deedOrLeaseReference,
          productType: selectedProduct.category,
          proposedProducts: [selectedProduct],
          manufacturingType: application.manufacturingType,
          rawMaterialDetails: application.rawMaterialDetails,
          productionCapacity: application.productionCapacity,
          environmentalApprovalRef: application.environmentalApprovalRef,
          fireSafetyApprovalRef: application.fireSafetyApprovalRef,
          otherGovernmentApprovals: application.otherGovernmentApprovals,
          applicationStatus: application.applicationStatus,
          remarks: application.remarks
        };

        let applicationId = application.id;

        if (application.id) {
          await manufacturerApi.updateManufacturerApplication(id, {
            applicationId: application.id,
            ...applicationPayload
          });
        } else {
          const createResponse = await manufacturerApi.createManufacturerApplication(id, applicationPayload);
          applicationId = createResponse?.data?.data?.id;
          if (!applicationId) {
            throw new Error('Manufacturing application ID not found after adding additional application');
          }
        }

        if (application.isNew) {
          for (const category of requiredUploadCategories) {
            const uploadData = new FormData();
            uploadData.append('file', applicationFiles[category]);
            uploadData.append('category', category);
            await manufacturerApi.uploadManufacturingApplicationFile(applicationId, uploadData);
          }

          if (applicationFiles.OTHER) {
            const otherUploadData = new FormData();
            otherUploadData.append('file', applicationFiles.OTHER);
            otherUploadData.append('category', 'OTHER');
            await manufacturerApi.uploadManufacturingApplicationFile(applicationId, otherUploadData);
          }
        } else {
          for (const [category, file] of Object.entries(applicationFiles)) {
            if (!file) continue;
            const uploadData = new FormData();
            uploadData.append('file', file);
            uploadData.append('category', category);
            await manufacturerApi.uploadManufacturingApplicationFile(applicationId, uploadData);
          }
        }
      }

      toast.success('Manufacturer updated successfully');
      navigate(`/admin/manufacturers/${id}`);
    } catch (error) {
      console.error('Failed to update manufacturer', error);
      const message = error.response?.data?.message || 'Failed to update manufacturer';
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
        title={`Edit ${manufacturerName}`}
        description="Update manufacturer account and license application details"
        actions={
        <Link to={`/admin/manufacturers/${id}`}>
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
            <h3 className="text-lg font-medium text-gray-900 mb-4">Manufacturer Account Details</h3>
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
                required />
              
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
                  
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                    label="Company Registration No"
                    value={application.companyRegistrationNo}
                    onChange={(e) => handleApplicationChange(index, 'companyRegistrationNo', e.target.value)} />
                  
                    <Input
                    label="Tax Identification No"
                    value={application.taxIdentificationNo}
                    onChange={(e) => handleApplicationChange(index, 'taxIdentificationNo', e.target.value)} />
                  
                  </div>

                  <Textarea
                  label="Business Address *"
                  value={application.businessAddress}
                  onChange={(e) => handleApplicationChange(index, 'businessAddress', e.target.value)}
                  rows={3}
                  error={getApplicationError(index, 'businessAddress')}
                  required />
                

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  
                    <SelectDropdown
                    label="Manufacturing Type *"
                    value={application.manufacturingType}
                    onChange={(e) => handleApplicationChange(index, 'manufacturingType', e.target.value)}
                    options={manufacturingTypeOptions}
                    error={getApplicationError(index, 'manufacturingType')}
                    required />
                  
                    <Input
                    label="Production Capacity"
                    value={application.productionCapacity}
                    onChange={(e) => handleApplicationChange(index, 'productionCapacity', e.target.value)} />
                  
                    <Input
                    label="Environmental Approval Ref"
                    value={application.environmentalApprovalRef}
                    onChange={(e) => handleApplicationChange(index, 'environmentalApprovalRef', e.target.value)} />
                  
                    <Input
                    label="Fire Safety Approval Ref"
                    value={application.fireSafetyApprovalRef}
                    onChange={(e) => handleApplicationChange(index, 'fireSafetyApprovalRef', e.target.value)} />
                  
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                    <h5 className="text-sm font-semibold text-gray-800">Proposed Product *</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <SelectDropdown
                      label="Category *"
                      value={application.productCategory}
                      onChange={(e) => handleApplicationChange(index, 'productCategory', e.target.value)}
                      options={productTypeOptions}
                      error={getApplicationError(index, 'productCategory')}
                      required />
                    
                      <Input
                      label="Name *"
                      value={application.productName}
                      onChange={(e) => handleApplicationChange(index, 'productName', e.target.value)}
                      error={getApplicationError(index, 'productName')}
                      required />
                    
                      <SelectDropdown
                      label="Pack Type"
                      value={application.packType}
                      onChange={(e) => handleApplicationChange(index, 'packType', e.target.value)}
                      options={packTypeOptions} />
                    
                      <Input
                      label="Pack Size (ml)"
                      type="number"
                      min="0"
                      value={application.packSizeMl}
                      onChange={(e) => handleApplicationChange(index, 'packSizeMl', e.target.value)} />
                    
                      <Input
                      label="Alcohol Strength (%)"
                      type="number"
                      min="0"
                      step="0.1"
                      value={application.alcoholStrength}
                      onChange={(e) => handleApplicationChange(index, 'alcoholStrength', e.target.value)} />
                    
                      <div className="md:col-span-2">
                        <Textarea
                        label="Description"
                        value={application.productDescription}
                        onChange={(e) => handleApplicationChange(index, 'productDescription', e.target.value)}
                        rows={2} />
                      
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">Each license application supports one product.</p>
                  </div>

                  <Textarea
                  label="Raw Material Details"
                  value={application.rawMaterialDetails}
                  onChange={(e) => handleApplicationChange(index, 'rawMaterialDetails', e.target.value)}
                  rows={2} />
                
                  <Textarea
                  label="Other Government Approvals"
                  value={application.otherGovernmentApprovals}
                  onChange={(e) => handleApplicationChange(index, 'otherGovernmentApprovals', e.target.value)}
                  rows={2} />
                
                  <Textarea
                  label="Remarks"
                  value={application.remarks}
                  onChange={(e) => handleApplicationChange(index, 'remarks', e.target.value)}
                  rows={3} />
                

                  <div>
                    <h5 className="text-sm font-semibold text-gray-800 mb-3">Required Application Documents</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Business Registration *</label>
                        <input
                        type="file"
                        onChange={(e) => handleApplicationFileChange(index, 'BUSINESS_REGISTRATION', e.target.files?.[0] || null)}
                        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/jpg,image/png,image/webp"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                      
                        {getApplicationError(index, 'businessRegistrationFile') && <p className="text-sm text-red-600 mt-1">{getApplicationError(index, 'businessRegistrationFile')}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tax Document *</label>
                        <input
                        type="file"
                        onChange={(e) => handleApplicationFileChange(index, 'TAX_DOCUMENT', e.target.files?.[0] || null)}
                        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/jpg,image/png,image/webp"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                      
                        {getApplicationError(index, 'taxDocumentFile') && <p className="text-sm text-red-600 mt-1">{getApplicationError(index, 'taxDocumentFile')}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Deed or Lease *</label>
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
              <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={() => navigate(`/admin/manufacturers/${id}`)}>
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

export default EditManufacturer;