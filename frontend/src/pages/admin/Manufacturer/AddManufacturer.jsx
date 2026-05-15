import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import PageHeader from '../../../components/common/PageHeader';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import SelectDropdown from '../../../components/common/SelectDropdown';
import Textarea from '../../../components/common/Textarea';
import manufacturerApi from '../../../services/manufacturerApi';

const createEmptyLicenseApplication = () => ({
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

const AddManufacturer = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [licenseApplications, setLicenseApplications] = useState([createEmptyLicenseApplication()]);
  const [licenseApplicationFiles, setLicenseApplicationFiles] = useState([createEmptyApplicationFiles()]);

  const [formData, setFormData] = useState({

    fullName: '',
    email: '',
    mobile: '',
    password: '',
    companyName: '',
    nic: '',
    address: '',
    status: 'PENDING',
    district: '',
    province: '',
    notes: ''
  });

  const getApplicationError = (index, field) => errors[`applications.${index}.${field}`];

  const validateForm = () => {
    const newErrors = {};


    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';else
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (!formData.password) newErrors.password = 'Password is required';else
    if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';


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

      const applicationFiles = licenseApplicationFiles[index] || createEmptyApplicationFiles();
      if (!applicationFiles.BUSINESS_REGISTRATION) newErrors[`applications.${index}.businessRegistrationFile`] = 'Business Registration file is required';
      if (!applicationFiles.TAX_DOCUMENT) newErrors[`applications.${index}.taxDocumentFile`] = 'Tax Document file is required';
      if (!applicationFiles.DEED_OR_LEASE) newErrors[`applications.${index}.deedOrLeaseFile`] = 'Deed or Lease file is required';
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const [firstApplication, ...additionalApplications] = licenseApplications;
      const [firstApplicationFiles, ...additionalApplicationFiles] = licenseApplicationFiles;
      const selectedProduct = {
        category: firstApplication.productCategory,
        name: firstApplication.productName.trim(),
        packType: firstApplication.packType || null,
        packSizeMl: firstApplication.packSizeMl ? Number(firstApplication.packSizeMl) : null,
        alcoholStrength: firstApplication.alcoholStrength ? Number(firstApplication.alcoholStrength) : null,
        description: firstApplication.productDescription.trim() || null
      };


      const payload = {

        fullName: formData.fullName,
        email: formData.email,
        mobile: formData.mobile,
        password: formData.password,
        companyName: formData.companyName,
        nic: formData.nic,
        address: formData.address,
        status: formData.status,
        district: formData.district,
        province: formData.province,
        notes: formData.notes,


        applicantName: firstApplication.applicantName,
        applicantEmail: firstApplication.applicantEmail,
        applicantPhone: firstApplication.applicantPhone,
        companyRegistrationNo: firstApplication.companyRegistrationNo,
        taxIdentificationNo: firstApplication.taxIdentificationNo,
        businessAddress: firstApplication.businessAddress,
        premisesOwnershipType: firstApplication.premisesOwnershipType,
        deedOrLeaseReference: firstApplication.deedOrLeaseReference,
        productType: selectedProduct.category,
        proposedProducts: [selectedProduct],
        manufacturingType: firstApplication.manufacturingType,
        rawMaterialDetails: firstApplication.rawMaterialDetails,
        productionCapacity: firstApplication.productionCapacity,
        environmentalApprovalRef: firstApplication.environmentalApprovalRef,
        fireSafetyApprovalRef: firstApplication.fireSafetyApprovalRef,
        otherGovernmentApprovals: firstApplication.otherGovernmentApprovals,
        applicationStatus: firstApplication.applicationStatus,
        remarks: firstApplication.remarks
      };

      const response = await manufacturerApi.createManufacturer(payload);

      const applicationId = response?.data?.data?.manufacturingApplication?.id;
      const manufacturerId = response?.data?.data?.user?.id;
      if (!applicationId) {
        throw new Error('Manufacturing application ID not found after creation');
      }
      if (!manufacturerId) {
        throw new Error('Manufacturer ID not found after creation');
      }

      const requiredUploadCategories = ['BUSINESS_REGISTRATION', 'TAX_DOCUMENT', 'DEED_OR_LEASE'];
      for (const category of requiredUploadCategories) {
        const uploadData = new FormData();
        uploadData.append('file', firstApplicationFiles[category]);
        uploadData.append('category', category);
        await manufacturerApi.uploadManufacturingApplicationFile(applicationId, uploadData);
      }

      if (firstApplicationFiles.OTHER) {
        const otherUploadData = new FormData();
        otherUploadData.append('file', firstApplicationFiles.OTHER);
        otherUploadData.append('category', 'OTHER');
        await manufacturerApi.uploadManufacturingApplicationFile(applicationId, otherUploadData);
      }

      for (let index = 0; index < additionalApplications.length; index += 1) {
        const application = additionalApplications[index];
        const applicationFiles = additionalApplicationFiles[index] || createEmptyApplicationFiles();
        const additionalProduct = {
          category: application.productCategory,
          name: application.productName.trim(),
          packType: application.packType || null,
          packSizeMl: application.packSizeMl ? Number(application.packSizeMl) : null,
          alcoholStrength: application.alcoholStrength ? Number(application.alcoholStrength) : null,
          description: application.productDescription.trim() || null
        };

        const additionalPayload = {
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
          productType: additionalProduct.category,
          proposedProducts: [additionalProduct],
          manufacturingType: application.manufacturingType,
          rawMaterialDetails: application.rawMaterialDetails,
          productionCapacity: application.productionCapacity,
          environmentalApprovalRef: application.environmentalApprovalRef,
          fireSafetyApprovalRef: application.fireSafetyApprovalRef,
          otherGovernmentApprovals: application.otherGovernmentApprovals,
          applicationStatus: application.applicationStatus,
          remarks: application.remarks
        };

        const additionalResponse = await manufacturerApi.createManufacturerApplication(manufacturerId, additionalPayload);
        const additionalApplicationId = additionalResponse?.data?.data?.id;

        if (!additionalApplicationId) {
          throw new Error('Manufacturing application ID not found after adding additional application');
        }

        for (const category of requiredUploadCategories) {
          const uploadData = new FormData();
          uploadData.append('file', applicationFiles[category]);
          uploadData.append('category', category);
          await manufacturerApi.uploadManufacturingApplicationFile(additionalApplicationId, uploadData);
        }

        if (applicationFiles.OTHER) {
          const otherUploadData = new FormData();
          otherUploadData.append('file', applicationFiles.OTHER);
          otherUploadData.append('category', 'OTHER');
          await manufacturerApi.uploadManufacturingApplicationFile(additionalApplicationId, otherUploadData);
        }
      }

      toast.success(`Manufacturer created with ${licenseApplications.length} license application(s) successfully`);


      navigate('/admin/manufacturers');

    } catch (error) {
      console.error('Failed to create manufacturer:', error);
      const errorMsg = error.response?.data?.message || 'Failed to create manufacturer. Please try again.';
      setSubmitError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      fullName: '',
      email: '',
      mobile: '',
      password: '',
      companyName: '',
      nic: '',
      address: '',
      status: 'PENDING',
      district: '',
      province: '',
      notes: ''

    });
    setLicenseApplications([createEmptyLicenseApplication()]);
    setLicenseApplicationFiles([createEmptyApplicationFiles()]);
    setErrors({});
    setSubmitError('');
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

  const handleAddLicenseApplication = () => {
    setLicenseApplications((prev) => [...prev, createEmptyLicenseApplication()]);
    setLicenseApplicationFiles((prev) => [...prev, createEmptyApplicationFiles()]);
  };

  const handleRemoveLicenseApplication = (indexToRemove) => {
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
  { value: 'REJECTED', label: 'Rejected' }];


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


  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Manufacturer"
        description="Create manufacturer account and submit manufacturing license application"
        actions={
        <Link to="/admin/manufacturers">
            <Button variant="outline">Back to Manufacturers</Button>
          </Link>
        } />
      

      {submitError &&
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-red-700">
            <p className="font-medium">{submitError}</p>
          </div>
        </div>
      }

      <div className="border border-gray-200 bg-white">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Manufacturer Account Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Full Name *"
                name="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Enter full name"
                error={errors.fullName}
                required />
              
              <Input
                label="Email *"
                name="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email address"
                error={errors.email}
                required />
              
              <Input
                label="Mobile"
                name="mobile"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                placeholder="Enter mobile number" />
              
              <Input
                label="Password *"
                name="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter password"
                error={errors.password}
                required />
              
              <Input
                label="Company Name"
                name="companyName"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="Enter company name" />
              
              <Input
                label="NIC"
                name="nic"
                value={formData.nic}
                onChange={(e) => setFormData({ ...formData, nic: e.target.value })}
                placeholder="Enter NIC number" />
              
              <SelectDropdown
                label="Account Status"
                name="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                options={statusOptions} />
              
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Address Information</h3>
            <div className="space-y-4">
              <Textarea
                label="Address"
                name="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Enter complete address"
                rows={3} />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="District"
                  name="district"
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  placeholder="Enter district" />
                
                <SelectDropdown
                  label="Province"
                  name="province"
                  value={formData.province}
                  onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                  options={provinceOptions} />
                
              </div>
              <Textarea
                label="Notes"
                name="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Enter any additional notes or comments"
                rows={3} />
              
            </div>
          </div>

          <div>
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900">License Application Details</h3>
            </div>
            {errors.applications &&
            <p className="text-sm text-red-600 mb-3">{errors.applications}</p>
            }
            <div className="space-y-6">
              {licenseApplications.map((application, index) =>
              <div key={`application-${index}`} className="border border-gray-200 rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold text-gray-800">Application {index + 1}</h4>
                    {licenseApplications.length > 1 &&
                  <Button type="button" variant="outline" onClick={() => handleRemoveLicenseApplication(index)}>
                        Remove
                      </Button>
                  }
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                    label="Applicant Name"
                    name={`applicantName-${index}`}
                    value={application.applicantName}
                    onChange={(e) => handleApplicationChange(index, 'applicantName', e.target.value)}
                    placeholder="Default: full name" />
                  
                    <Input
                    label="Applicant Email"
                    name={`applicantEmail-${index}`}
                    type="email"
                    value={application.applicantEmail}
                    onChange={(e) => handleApplicationChange(index, 'applicantEmail', e.target.value)}
                    placeholder="Default: account email" />
                  
                    <Input
                    label="Applicant Phone"
                    name={`applicantPhone-${index}`}
                    value={application.applicantPhone}
                    onChange={(e) => handleApplicationChange(index, 'applicantPhone', e.target.value)}
                    placeholder="Default: mobile" />
                  
                    <SelectDropdown
                    label="Application Status"
                    name={`applicationStatus-${index}`}
                    value={application.applicationStatus}
                    onChange={(e) => handleApplicationChange(index, 'applicationStatus', e.target.value)}
                    options={applicationStatusOptions} />
                  
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                    label="Company Registration No"
                    name={`companyRegistrationNo-${index}`}
                    value={application.companyRegistrationNo}
                    onChange={(e) => handleApplicationChange(index, 'companyRegistrationNo', e.target.value)}
                    placeholder="Enter registration number" />
                  
                    <Input
                    label="Tax Identification No"
                    name={`taxIdentificationNo-${index}`}
                    value={application.taxIdentificationNo}
                    onChange={(e) => handleApplicationChange(index, 'taxIdentificationNo', e.target.value)}
                    placeholder="Enter TIN number" />
                  
                  </div>

                  <Textarea
                  label="Business Address *"
                  name={`businessAddress-${index}`}
                  value={application.businessAddress}
                  onChange={(e) => handleApplicationChange(index, 'businessAddress', e.target.value)}
                  placeholder="Enter complete business address"
                  rows={3}
                  error={getApplicationError(index, 'businessAddress')}
                  required />
                

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SelectDropdown
                    label="Premises Ownership Type *"
                    name={`premisesOwnershipType-${index}`}
                    value={application.premisesOwnershipType}
                    onChange={(e) => handleApplicationChange(index, 'premisesOwnershipType', e.target.value)}
                    options={premisesOwnershipOptions}
                    error={getApplicationError(index, 'premisesOwnershipType')}
                    required />
                  
                    <Input
                    label="Deed/Lease Reference"
                    name={`deedOrLeaseReference-${index}`}
                    value={application.deedOrLeaseReference}
                    onChange={(e) => handleApplicationChange(index, 'deedOrLeaseReference', e.target.value)}
                    placeholder="Enter deed/lease reference" />
                  
                    <SelectDropdown
                    label="Manufacturing Type *"
                    name={`manufacturingType-${index}`}
                    value={application.manufacturingType}
                    onChange={(e) => handleApplicationChange(index, 'manufacturingType', e.target.value)}
                    options={manufacturingTypeOptions}
                    error={getApplicationError(index, 'manufacturingType')}
                    required />
                  
                    <Input
                    label="Production Capacity"
                    name={`productionCapacity-${index}`}
                    value={application.productionCapacity}
                    onChange={(e) => handleApplicationChange(index, 'productionCapacity', e.target.value)}
                    placeholder="Enter production capacity" />
                  
                    <Input
                    label="Environmental Approval Ref"
                    name={`environmentalApprovalRef-${index}`}
                    value={application.environmentalApprovalRef}
                    onChange={(e) => handleApplicationChange(index, 'environmentalApprovalRef', e.target.value)}
                    placeholder="Enter reference" />
                  
                    <Input
                    label="Fire Safety Approval Ref"
                    name={`fireSafetyApprovalRef-${index}`}
                    value={application.fireSafetyApprovalRef}
                    onChange={(e) => handleApplicationChange(index, 'fireSafetyApprovalRef', e.target.value)}
                    placeholder="Enter reference" />
                  
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                    <h5 className="text-sm font-semibold text-gray-800">Proposed Product *</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <SelectDropdown
                      label="Category *"
                      name={`productCategory-${index}`}
                      value={application.productCategory}
                      onChange={(e) => handleApplicationChange(index, 'productCategory', e.target.value)}
                      options={productTypeOptions}
                      error={getApplicationError(index, 'productCategory')}
                      required />
                    
                      <Input
                      label="Name *"
                      name={`productName-${index}`}
                      value={application.productName}
                      onChange={(e) => handleApplicationChange(index, 'productName', e.target.value)}
                      placeholder="Enter product name"
                      error={getApplicationError(index, 'productName')}
                      required />
                    
                      <SelectDropdown
                      label="Pack Type"
                      name={`packType-${index}`}
                      value={application.packType}
                      onChange={(e) => handleApplicationChange(index, 'packType', e.target.value)}
                      options={packTypeOptions} />
                    
                      <Input
                      label="Pack Size (ml)"
                      name={`packSizeMl-${index}`}
                      type="number"
                      min="0"
                      value={application.packSizeMl}
                      onChange={(e) => handleApplicationChange(index, 'packSizeMl', e.target.value)}
                      placeholder="e.g. 750" />
                    
                      <Input
                      label="Alcohol Strength (%)"
                      name={`alcoholStrength-${index}`}
                      type="number"
                      min="0"
                      step="0.1"
                      value={application.alcoholStrength}
                      onChange={(e) => handleApplicationChange(index, 'alcoholStrength', e.target.value)}
                      placeholder="e.g. 40" />
                    
                      <div className="md:col-span-2">
                        <Textarea
                        label="Description"
                        name={`productDescription-${index}`}
                        value={application.productDescription}
                        onChange={(e) => handleApplicationChange(index, 'productDescription', e.target.value)}
                        placeholder="Optional product notes"
                        rows={2} />
                      
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">Each license application supports one product.</p>
                  </div>

                  <Textarea
                  label="Raw Material Details"
                  name={`rawMaterialDetails-${index}`}
                  value={application.rawMaterialDetails}
                  onChange={(e) => handleApplicationChange(index, 'rawMaterialDetails', e.target.value)}
                  placeholder="Enter raw material details"
                  rows={2} />
                
                  <Textarea
                  label="Other Government Approvals"
                  name={`otherGovernmentApprovals-${index}`}
                  value={application.otherGovernmentApprovals}
                  onChange={(e) => handleApplicationChange(index, 'otherGovernmentApprovals', e.target.value)}
                  placeholder="Enter other approvals"
                  rows={2} />
                
                  <Textarea
                  label="Remarks"
                  name={`remarks-${index}`}
                  value={application.remarks}
                  onChange={(e) => handleApplicationChange(index, 'remarks', e.target.value)}
                  placeholder="Enter any remarks or special notes for this application"
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">Other Document (Optional)</label>
                        <input
                        type="file"
                        onChange={(e) => handleApplicationFileChange(index, 'OTHER', e.target.files?.[0] || null)}
                        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/jpg,image/png,image/webp"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                      
                        {getApplicationError(index, 'otherFile') && <p className="text-sm text-red-600 mt-1">{getApplicationError(index, 'otherFile')}</p>}
                      </div>
                    </div>
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
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                className="flex-1 sm:flex-none">
                
                Reset Form
              </Button>
              <Button
                type="submit"
                loading={loading}
                className="flex-1 sm:flex-none">
                
                Save Manufacturer
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>);

};

export default AddManufacturer;