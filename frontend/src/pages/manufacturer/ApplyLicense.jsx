import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import SelectDropdown from '../../components/common/SelectDropdown';
import Textarea from '../../components/common/Textarea';
import manufacturerApi from '../../services/manufacturerApi';
import authApi from '../../services/authApi';

const createEmptyLicenseApplication = () => ({
  applicantName: '',
  applicantEmail: '',
  applicantPhone: '',
  companyName: '',
  district: '',
  province: '',
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


const ApplyLicense = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [manufacturerProfile, setManufacturerProfile] = useState(null);
  const [application, setApplication] = useState(createEmptyLicenseApplication());
  const [applicationFiles, setApplicationFiles] = useState(createEmptyApplicationFiles());

  useEffect(() => {
    const initProfile = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        let userData = null;

        if (storedUser) {
          userData = JSON.parse(storedUser);
        }

        const profileResponse = await authApi.getProfile();
        const profile = profileResponse?.data?.data || userData;

        setManufacturerProfile(profile);
        setApplication((prev) => ({
          ...prev,
          applicantName: prev.applicantName || profile?.fullName || '',
          applicantEmail: prev.applicantEmail || profile?.email || '',
          applicantPhone: prev.applicantPhone || profile?.mobile || '',
          companyName: prev.companyName || profile?.companyName || '',
          district: prev.district || profile?.district || '',
          province: prev.province || profile?.province || '',
          businessAddress: prev.businessAddress || profile?.address || ''
        }));
      } catch (_) {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const profile = JSON.parse(storedUser);
            setManufacturerProfile(profile);
            setApplication((prev) => ({
              ...prev,
              applicantName: prev.applicantName || profile?.fullName || '',
              applicantEmail: prev.applicantEmail || profile?.email || '',
              applicantPhone: prev.applicantPhone || profile?.mobile || '',
              companyName: prev.companyName || profile?.companyName || '',
              district: prev.district || profile?.district || '',
              province: prev.province || profile?.province || '',
              businessAddress: prev.businessAddress || profile?.address || ''
            }));
          } catch {
            setManufacturerProfile(null);
          }
        }
      }
    };

    initProfile();
  }, []);

  const getError = (field) => errors[field];

  const clearError = (field) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const { [field]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const handleApplicationChange = (field, value) => {
    setApplication((prev) => ({ ...prev, [field]: value }));
    clearError(field);
  };

  const handleApplicationFileChange = (category, file) => {
    const fieldByCategory = {
      BUSINESS_REGISTRATION: 'businessRegistrationFile',
      TAX_DOCUMENT: 'taxDocumentFile',
      DEED_OR_LEASE: 'deedOrLeaseFile',
      OTHER: 'otherFile'
    };

    const field = fieldByCategory[category];

    if (file && !ALLOWED_FILE_TYPES.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        [field]: 'Invalid file type. Only JPG, JPEG, PNG and WEBP images are allowed.'
      }));
      return;
    }

    if (file && file.size > MAX_UPLOAD_SIZE_BYTES) {
      setErrors((prev) => ({
        ...prev,
        [field]: 'File size exceeds 2MB limit.'
      }));
      return;
    }

    setApplicationFiles((prev) => ({ ...prev, [category]: file }));
    clearError(field);
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!application.companyName.trim()) nextErrors.companyName = 'Company name is required';
    if (!application.district.trim()) nextErrors.district = 'District is required';
    if (!application.province.trim()) nextErrors.province = 'Province is required';
    if (!application.businessAddress.trim()) nextErrors.businessAddress = 'Business address is required';
    if (!application.premisesOwnershipType.trim()) nextErrors.premisesOwnershipType = 'Premises ownership type is required';
    if (!application.productCategory.trim()) nextErrors.productCategory = 'Product category is required';
    if (!application.productName.trim()) nextErrors.productName = 'Product name is required';
    if (!application.manufacturingType.trim()) nextErrors.manufacturingType = 'Manufacturing type is required';

    if (!applicationFiles.BUSINESS_REGISTRATION) nextErrors.businessRegistrationFile = 'Business Registration file is required';
    if (!applicationFiles.TAX_DOCUMENT) nextErrors.taxDocumentFile = 'Tax Document file is required';
    if (!applicationFiles.DEED_OR_LEASE) nextErrors.deedOrLeaseFile = 'Deed or Lease file is required';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const uploadRequiredApplicationFiles = async (applicationId) => {
    const requiredUploadCategories = ['BUSINESS_REGISTRATION', 'TAX_DOCUMENT', 'DEED_OR_LEASE'];

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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!validateForm()) return;

    if (!manufacturerProfile?.id) {
      setSubmitError('Manufacturer account not found. Please login again.');
      return;
    }

    setLoading(true);

    try {
      const selectedProduct = {
        category: application.productCategory,
        name: application.productName.trim(),
        packType: application.packType || null,
        packSizeMl: application.packSizeMl ? Number(application.packSizeMl) : null,
        alcoholStrength: application.alcoholStrength ? Number(application.alcoholStrength) : null,
        description: application.productDescription.trim() || null
      };

      const payload = {
        applicantName: application.applicantName,
        applicantEmail: application.applicantEmail,
        applicantPhone: application.applicantPhone,
        companyName: application.companyName,
        companyRegistrationNo: application.companyRegistrationNo,
        taxIdentificationNo: application.taxIdentificationNo,
        businessAddress: application.businessAddress,
        district: application.district,
        province: application.province,
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

      const response = await manufacturerApi.createManufacturerApplication(manufacturerProfile.id, payload);
      const applicationId = response?.data?.data?.id;

      if (!applicationId) {
        throw new Error('Manufacturing application ID not found after creation');
      }

      await uploadRequiredApplicationFiles(applicationId);

      toast.success('Manufacturing license application submitted successfully');
      navigate('/manufacturer/my-licenses');
    } catch (error) {
      console.error('Failed to submit manufacturing application:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to submit manufacturing license application. Please try again.';
      setSubmitError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setApplication(createEmptyLicenseApplication());
    setApplicationFiles(createEmptyApplicationFiles());
    setErrors({});
    setSubmitError('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Apply New License"
        description="Submit a new manufacturing license application"
        actions={
        <Link to="/manufacturer/my-licenses">
            <Button variant="outline">Back to My Licenses</Button>
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
            <h3 className="text-lg font-medium text-gray-900 mb-4">Applicant & Company Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Applicant Name"
                value={application.applicantName}
                onChange={(e) => handleApplicationChange('applicantName', e.target.value)}
                placeholder="Default: full name" />
              
              <Input
                label="Applicant Email"
                type="email"
                value={application.applicantEmail}
                onChange={(e) => handleApplicationChange('applicantEmail', e.target.value)}
                placeholder="Default: account email" />
              
              <Input
                label="Applicant Phone"
                value={application.applicantPhone}
                onChange={(e) => handleApplicationChange('applicantPhone', e.target.value)}
                placeholder="Default: mobile" />
              
              <SelectDropdown
                label="Application Status"
                value={application.applicationStatus}
                onChange={(e) => handleApplicationChange('applicationStatus', e.target.value)}
                options={applicationStatusOptions} />
              
              <Input
                label="Company Name *"
                value={application.companyName}
                onChange={(e) => handleApplicationChange('companyName', e.target.value)}
                error={getError('companyName')}
                required />
              
              <Input
                label="District *"
                value={application.district}
                onChange={(e) => handleApplicationChange('district', e.target.value)}
                error={getError('district')}
                required />
              
              <SelectDropdown
                label="Province *"
                value={application.province}
                onChange={(e) => handleApplicationChange('province', e.target.value)}
                options={provinceOptions}
                error={getError('province')}
                required />
              
              <Input
                label="Company Registration No"
                value={application.companyRegistrationNo}
                onChange={(e) => handleApplicationChange('companyRegistrationNo', e.target.value)}
                placeholder="Enter registration number" />
              
              <Input
                label="Tax Identification No"
                value={application.taxIdentificationNo}
                onChange={(e) => handleApplicationChange('taxIdentificationNo', e.target.value)}
                placeholder="Enter TIN number" />
              
            </div>
          </div>

          <Textarea
            label="Business Address *"
            value={application.businessAddress}
            onChange={(e) => handleApplicationChange('businessAddress', e.target.value)}
            placeholder="Enter complete business address"
            rows={3}
            error={getError('businessAddress')}
            required />
          

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectDropdown
              label="Premises Ownership Type *"
              value={application.premisesOwnershipType}
              onChange={(e) => handleApplicationChange('premisesOwnershipType', e.target.value)}
              options={premisesOwnershipOptions}
              error={getError('premisesOwnershipType')}
              required />
            
            <Input
              label="Deed/Lease Reference"
              value={application.deedOrLeaseReference}
              onChange={(e) => handleApplicationChange('deedOrLeaseReference', e.target.value)}
              placeholder="Enter deed/lease reference" />
            
            <SelectDropdown
              label="Manufacturing Type *"
              value={application.manufacturingType}
              onChange={(e) => handleApplicationChange('manufacturingType', e.target.value)}
              options={manufacturingTypeOptions}
              error={getError('manufacturingType')}
              required />
            
            <Input
              label="Production Capacity"
              value={application.productionCapacity}
              onChange={(e) => handleApplicationChange('productionCapacity', e.target.value)}
              placeholder="Enter production capacity" />
            
            <Input
              label="Environmental Approval Ref"
              value={application.environmentalApprovalRef}
              onChange={(e) => handleApplicationChange('environmentalApprovalRef', e.target.value)}
              placeholder="Enter reference" />
            
            <Input
              label="Fire Safety Approval Ref"
              value={application.fireSafetyApprovalRef}
              onChange={(e) => handleApplicationChange('fireSafetyApprovalRef', e.target.value)}
              placeholder="Enter reference" />
            
          </div>

          <div className="border border-gray-200 rounded-lg p-4 space-y-4">
            <h5 className="text-sm font-semibold text-gray-800">Proposed Product *</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectDropdown
                label="Category *"
                value={application.productCategory}
                onChange={(e) => handleApplicationChange('productCategory', e.target.value)}
                options={productTypeOptions}
                error={getError('productCategory')}
                required />
              
              <Input
                label="Name *"
                value={application.productName}
                onChange={(e) => handleApplicationChange('productName', e.target.value)}
                placeholder="Enter product name"
                error={getError('productName')}
                required />
              
              <SelectDropdown
                label="Pack Type"
                value={application.packType}
                onChange={(e) => handleApplicationChange('packType', e.target.value)}
                options={packTypeOptions} />
              
              <Input
                label="Pack Size (ml)"
                type="number"
                min="0"
                value={application.packSizeMl}
                onChange={(e) => handleApplicationChange('packSizeMl', e.target.value)}
                placeholder="e.g. 750" />
              
              <Input
                label="Alcohol Strength (%)"
                type="number"
                min="0"
                step="0.1"
                value={application.alcoholStrength}
                onChange={(e) => handleApplicationChange('alcoholStrength', e.target.value)}
                placeholder="e.g. 40" />
              
              <div className="md:col-span-2">
                <Textarea
                  label="Description"
                  value={application.productDescription}
                  onChange={(e) => handleApplicationChange('productDescription', e.target.value)}
                  placeholder="Optional product notes"
                  rows={2} />
                
              </div>
            </div>
            <p className="text-xs text-gray-500">Each license application supports one product.</p>
          </div>

          <Textarea
            label="Raw Material Details"
            value={application.rawMaterialDetails}
            onChange={(e) => handleApplicationChange('rawMaterialDetails', e.target.value)}
            placeholder="Enter raw material details"
            rows={2} />
          
          <Textarea
            label="Other Government Approvals"
            value={application.otherGovernmentApprovals}
            onChange={(e) => handleApplicationChange('otherGovernmentApprovals', e.target.value)}
            placeholder="Enter other approvals"
            rows={2} />
          
          <Textarea
            label="Remarks"
            value={application.remarks}
            onChange={(e) => handleApplicationChange('remarks', e.target.value)}
            placeholder="Enter any remarks or special notes"
            rows={3} />
          

          <div>
            <h5 className="text-sm font-semibold text-gray-800 mb-3">Required Application Documents</h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Registration *</label>
                <input
                  type="file"
                  onChange={(e) => handleApplicationFileChange('BUSINESS_REGISTRATION', e.target.files?.[0] || null)}
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/jpg,image/png,image/webp"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                
                {getError('businessRegistrationFile') && <p className="text-sm text-red-600 mt-1">{getError('businessRegistrationFile')}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax Document *</label>
                <input
                  type="file"
                  onChange={(e) => handleApplicationFileChange('TAX_DOCUMENT', e.target.files?.[0] || null)}
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/jpg,image/png,image/webp"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                
                {getError('taxDocumentFile') && <p className="text-sm text-red-600 mt-1">{getError('taxDocumentFile')}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deed or Lease *</label>
                <input
                  type="file"
                  onChange={(e) => handleApplicationFileChange('DEED_OR_LEASE', e.target.files?.[0] || null)}
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/jpg,image/png,image/webp"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                
                {getError('deedOrLeaseFile') && <p className="text-sm text-red-600 mt-1">{getError('deedOrLeaseFile')}</p>}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Other Document (Optional)</label>
                <input
                  type="file"
                  onChange={(e) => handleApplicationFileChange('OTHER', e.target.files?.[0] || null)}
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/jpg,image/png,image/webp"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                
                {getError('otherFile') && <p className="text-sm text-red-600 mt-1">{getError('otherFile')}</p>}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Allowed types: JPG, JPEG, PNG, WEBP. Maximum file size: 2MB.</p>
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
                
                Submit Application
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>);

};

export default ApplyLicense;