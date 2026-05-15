import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import SelectDropdown from '../../components/common/SelectDropdown';
import Textarea from '../../components/common/Textarea';
import manufacturerApi from '../../services/manufacturerApi';
import distributorApi from '../../services/distributorApi';
import authApi from '../../services/authApi';

const createEmptyApplicationFiles = () => ({
  BUSINESS_REGISTRATION: null,
  TAX_DOCUMENT: null,
  DEED_OR_LEASE: null,
  OTHER: null
});

const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_UPLOAD_SIZE_BYTES = 2 * 1024 * 1024;

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


const premisesOwnershipOptions = [
{ value: '', label: 'Select premises ownership' },
{ value: 'OWNED', label: 'Owned' },
{ value: 'LEASED', label: 'Leased' },
{ value: 'RENTED', label: 'Rented' },
{ value: 'OTHER', label: 'Other' }];


const initialFormData = {
  applicantName: '',
  applicantEmail: '',
  applicantPhone: '',
  businessName: '',
  businessRegistrationNo: '',
  taxIdentificationNo: '',
  warehouseAddress: '',
  district: '',
  province: '',
  premisesOwnershipType: '',
  deedOrLeaseReference: '',
  buildingPlanReference: '',
  packingListDetails: '',
  oicCertificationRef: '',
  warehouseCapacity: '',
  transportDetails: '',
  distributionScope: '',
  manufacturerIds: [],
  retailerIds: [],
  remarks: ''
};

const ApplyLicense = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [manufacturers, setManufacturers] = useState([]);
  const [retailers, setRetailers] = useState([]);
  const [manufacturerSearch, setManufacturerSearch] = useState('');
  const [retailerSearch, setRetailerSearch] = useState('');
  const [applicationFiles, setApplicationFiles] = useState(createEmptyApplicationFiles());

  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    loadSelectionOptions();
    loadProfileDefaults();
  }, []);

  const loadSelectionOptions = async () => {
    try {
      const [manufacturerResponse, retailerResponse] = await Promise.all([
      manufacturerApi.getActiveManufacturers(),
      distributorApi.getAvailableRetailers()]
      );

      setManufacturers(manufacturerResponse?.data?.data || []);
      setRetailers(retailerResponse?.data?.data || []);
    } catch (error) {
      setSubmitError(error.response?.data?.message || 'Failed to load manufacturer and retailer options');
    }
  };

  const loadProfileDefaults = async () => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setFormData((prev) => ({
          ...prev,
          applicantName: prev.applicantName || parsedUser?.fullName || '',
          applicantEmail: prev.applicantEmail || parsedUser?.email || '',
          applicantPhone: prev.applicantPhone || parsedUser?.mobile || '',
          businessName: prev.businessName || parsedUser?.companyName || '',
          district: prev.district || parsedUser?.district || '',
          province: prev.province || parsedUser?.province || ''
        }));
      }

      const profileResponse = await authApi.getProfile();
      const profileUser = profileResponse?.data?.data;

      if (profileUser) {
        setFormData((prev) => ({
          ...prev,
          applicantName: prev.applicantName || profileUser?.fullName || '',
          applicantEmail: prev.applicantEmail || profileUser?.email || '',
          applicantPhone: prev.applicantPhone || profileUser?.mobile || '',
          businessName: prev.businessName || profileUser?.companyName || '',
          district: prev.district || profileUser?.district || '',
          province: prev.province || profileUser?.province || ''
        }));
      }
    } catch (_) {
      void 0;
    }
  };

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

  const clearError = (field) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const { [field]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    clearError(field);
  };

  const toggleManufacturer = (manufacturerId) => {
    setFormData((prev) => {
      const exists = prev.manufacturerIds.includes(manufacturerId);
      const manufacturerIds = exists ?
      prev.manufacturerIds.filter((id) => id !== manufacturerId) :
      [...prev.manufacturerIds, manufacturerId];

      return {
        ...prev,
        manufacturerIds
      };
    });

    clearError('manufacturerIds');
  };

  const toggleRetailer = (retailerId) => {
    setFormData((prev) => {
      const exists = prev.retailerIds.includes(retailerId);
      const retailerIds = exists ?
      prev.retailerIds.filter((id) => id !== retailerId) :
      [...prev.retailerIds, retailerId];

      return {
        ...prev,
        retailerIds
      };
    });

    clearError('retailerIds');
  };

  const handleApplicationFileChange = (category, file) => {
    const fieldByCategory = {
      BUSINESS_REGISTRATION: 'businessRegistrationFile',
      TAX_DOCUMENT: 'taxDocumentFile',
      DEED_OR_LEASE: 'deedOrLeaseFile',
      OTHER: 'otherFile'
    };

    const errorKey = fieldByCategory[category];

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

    setApplicationFiles((prev) => ({ ...prev, [category]: file }));
    clearError(errorKey);
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!formData.applicantName.trim()) nextErrors.applicantName = 'Applicant name is required';
    if (!formData.applicantEmail.trim()) nextErrors.applicantEmail = 'Applicant email is required';else
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.applicantEmail)) nextErrors.applicantEmail = 'Invalid email format';
    if (!formData.businessName.trim()) nextErrors.businessName = 'Business name is required';
    if (!formData.warehouseAddress.trim()) nextErrors.warehouseAddress = 'Warehouse address is required';
    if (!formData.district.trim()) nextErrors.district = 'District is required';
    if (!formData.province.trim()) nextErrors.province = 'Province is required';
    if (!formData.premisesOwnershipType.trim()) nextErrors.premisesOwnershipType = 'Premises ownership type is required';
    if (!formData.manufacturerIds.length) nextErrors.manufacturerIds = 'Select at least one manufacturer';
    if (!formData.retailerIds.length) nextErrors.retailerIds = 'Select at least one retailer';

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
      await distributorApi.uploadDistributionApplicationFile(applicationId, uploadData);
    }

    if (applicationFiles.OTHER) {
      const otherUploadData = new FormData();
      otherUploadData.append('file', applicationFiles.OTHER);
      otherUploadData.append('category', 'OTHER');
      await distributorApi.uploadDistributionApplicationFile(applicationId, otherUploadData);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!validateForm()) return;

    setLoading(true);

    try {
      const storedUser = localStorage.getItem('user');
      if (!storedUser) {
        throw new Error('User session not found. Please login again.');
      }

      const parsedUser = JSON.parse(storedUser);
      const distributorId = parsedUser?.id;
      if (!distributorId) {
        throw new Error('Distributor account not found. Please login again.');
      }

      const payload = {
        applicantName: formData.applicantName,
        applicantEmail: formData.applicantEmail,
        applicantPhone: formData.applicantPhone,
        businessName: formData.businessName,
        businessRegistrationNo: formData.businessRegistrationNo,
        taxIdentificationNo: formData.taxIdentificationNo,
        warehouseAddress: formData.warehouseAddress,
        district: formData.district,
        province: formData.province,
        premisesOwnershipType: formData.premisesOwnershipType,
        deedOrLeaseReference: formData.deedOrLeaseReference,
        buildingPlanReference: formData.buildingPlanReference,
        packingListDetails: formData.packingListDetails,
        oicCertificationRef: formData.oicCertificationRef,
        warehouseCapacity: formData.warehouseCapacity,
        transportDetails: formData.transportDetails,
        distributionScope: formData.distributionScope,
        manufacturerIds: formData.manufacturerIds,
        retailerIds: formData.retailerIds,
        remarks: formData.remarks,
        applicationStatus: 'SUBMITTED'
      };

      const response = await distributorApi.createDistributorApplication(distributorId, payload);
      const applicationId = response?.data?.data?.id;

      if (!applicationId) {
        throw new Error('Distribution application ID not found after submit');
      }

      await uploadRequiredApplicationFiles(applicationId);

      toast.success('Distribution license application submitted successfully');
      navigate('/distributor/my-license');
    } catch (error) {
      console.error('Failed to submit distribution license application:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to submit application';
      setSubmitError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData(initialFormData);
    setApplicationFiles(createEmptyApplicationFiles());
    setManufacturerSearch('');
    setRetailerSearch('');
    setErrors({});
    setSubmitError('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Apply New License"
        description="Submit a new distribution license application"
        actions={
        <Link to="/distributor/my-license">
            <Button variant="outline">Back to My License</Button>
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
            <h3 className="text-lg font-medium text-gray-900 mb-4">Applicant Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Applicant Name *"
                value={formData.applicantName}
                onChange={(e) => handleChange('applicantName', e.target.value)}
                error={errors.applicantName}
                required />
              
              <Input
                label="Applicant Email *"
                type="email"
                value={formData.applicantEmail}
                onChange={(e) => handleChange('applicantEmail', e.target.value)}
                error={errors.applicantEmail}
                required />
              
              <Input
                label="Applicant Phone"
                value={formData.applicantPhone}
                onChange={(e) => handleChange('applicantPhone', e.target.value)} />
              
              <Input
                label="Business Name *"
                value={formData.businessName}
                onChange={(e) => handleChange('businessName', e.target.value)}
                error={errors.businessName}
                required />
              
              <Input
                label="Business Registration No"
                value={formData.businessRegistrationNo}
                onChange={(e) => handleChange('businessRegistrationNo', e.target.value)} />
              
              <Input
                label="Tax Identification No"
                value={formData.taxIdentificationNo}
                onChange={(e) => handleChange('taxIdentificationNo', e.target.value)} />
              
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Warehouse & Premises</h3>
            <div className="space-y-4">
              <Textarea
                label="Warehouse Address *"
                value={formData.warehouseAddress}
                onChange={(e) => handleChange('warehouseAddress', e.target.value)}
                rows={3}
                error={errors.warehouseAddress}
                required />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="District *"
                  value={formData.district}
                  onChange={(e) => handleChange('district', e.target.value)}
                  error={errors.district}
                  required />
                
                <SelectDropdown
                  label="Province *"
                  value={formData.province}
                  onChange={(e) => handleChange('province', e.target.value)}
                  options={provinceOptions}
                  error={errors.province}
                  required />
                
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SelectDropdown
                  label="Premises Ownership Type *"
                  value={formData.premisesOwnershipType}
                  onChange={(e) => handleChange('premisesOwnershipType', e.target.value)}
                  options={premisesOwnershipOptions}
                  error={errors.premisesOwnershipType}
                  required />
                
                <Input
                  label="Deed/Lease Reference"
                  value={formData.deedOrLeaseReference}
                  onChange={(e) => handleChange('deedOrLeaseReference', e.target.value)} />
                
                <Input
                  label="Building Plan Reference"
                  value={formData.buildingPlanReference}
                  onChange={(e) => handleChange('buildingPlanReference', e.target.value)} />
                
                <Input
                  label="Warehouse Capacity"
                  value={formData.warehouseCapacity}
                  onChange={(e) => handleChange('warehouseCapacity', e.target.value)} />
                
                <Input
                  label="OIC Certification Ref"
                  value={formData.oicCertificationRef}
                  onChange={(e) => handleChange('oicCertificationRef', e.target.value)} />
                
              </div>
              <Textarea
                label="Transport Details"
                value={formData.transportDetails}
                onChange={(e) => handleChange('transportDetails', e.target.value)}
                rows={2} />
              
              <Textarea
                label="Distribution Scope"
                value={formData.distributionScope}
                onChange={(e) => handleChange('distributionScope', e.target.value)}
                rows={2} />
              
              <Textarea
                label="Packing List Details"
                value={formData.packingListDetails}
                onChange={(e) => handleChange('packingListDetails', e.target.value)}
                rows={2} />
              
              <Textarea
                label="Remarks"
                value={formData.remarks}
                onChange={(e) => handleChange('remarks', e.target.value)}
                rows={3} />
              
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Linked Manufacturer(s) *</label>
            <input
              type="text"
              value={manufacturerSearch}
              onChange={(e) => setManufacturerSearch(e.target.value)}
              placeholder="Search by company, name, or email"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            
            <div className={`mt-2 max-h-56 overflow-y-auto border p-3 space-y-2 rounded-lg ${errors.manufacturerIds ? 'border-red-400' : 'border-gray-300'}`}>
              {filteredManufacturers.map((manufacturer) =>
              <label key={manufacturer.id} className="flex items-start gap-3 rounded-md border border-gray-200 p-3 hover:bg-gray-50 cursor-pointer">
                  <input
                  type="checkbox"
                  checked={formData.manufacturerIds.includes(manufacturer.id)}
                  onChange={() => toggleManufacturer(manufacturer.id)}
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
            {errors.manufacturerIds && <p className="text-sm text-red-600 mt-1">{errors.manufacturerIds}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Linked Retailer(s) *</label>
            <input
              type="text"
              value={retailerSearch}
              onChange={(e) => setRetailerSearch(e.target.value)}
              placeholder="Search by company, name, or email"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            
            <div className={`mt-2 max-h-56 overflow-y-auto border p-3 space-y-2 rounded-lg ${errors.retailerIds ? 'border-red-400' : 'border-gray-300'}`}>
              {filteredRetailers.map((retailer) =>
              <label key={retailer.id} className="flex items-start gap-3 rounded-md border border-gray-200 p-3 hover:bg-gray-50 cursor-pointer">
                  <input
                  type="checkbox"
                  checked={formData.retailerIds.includes(retailer.id)}
                  onChange={() => toggleRetailer(retailer.id)}
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
            {errors.retailerIds && <p className="text-sm text-red-600 mt-1">{errors.retailerIds}</p>}
          </div>

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
                
                {errors.businessRegistrationFile && <p className="text-sm text-red-600 mt-1">{errors.businessRegistrationFile}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax Document *</label>
                <input
                  type="file"
                  onChange={(e) => handleApplicationFileChange('TAX_DOCUMENT', e.target.files?.[0] || null)}
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/jpg,image/png,image/webp"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                
                {errors.taxDocumentFile && <p className="text-sm text-red-600 mt-1">{errors.taxDocumentFile}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deed or Lease *</label>
                <input
                  type="file"
                  onChange={(e) => handleApplicationFileChange('DEED_OR_LEASE', e.target.files?.[0] || null)}
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/jpg,image/png,image/webp"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                
                {errors.deedOrLeaseFile && <p className="text-sm text-red-600 mt-1">{errors.deedOrLeaseFile}</p>}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Other Document</label>
                <input
                  type="file"
                  onChange={(e) => handleApplicationFileChange('OTHER', e.target.files?.[0] || null)}
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/jpg,image/png,image/webp"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                
                {errors.otherFile && <p className="text-sm text-red-600 mt-1">{errors.otherFile}</p>}
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