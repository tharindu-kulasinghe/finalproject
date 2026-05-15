import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import SelectDropdown from '../../components/common/SelectDropdown';

export default function ApplyManufacturingLicense() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [requiredFiles, setRequiredFiles] = useState({
    BUSINESS_REGISTRATION: null,
    TAX_DOCUMENT: null,
    DEED_OR_LEASE: null
  });
  const [otherDocumentFile, setOtherDocumentFile] = useState(null);
  const [formData, setFormData] = useState({
    applicantName: '',
    applicantEmail: '',
    applicantPhone: '',
    companyName: '',
    companyRegistrationNo: '',
    taxIdentificationNo: '',
    businessAddress: '',
    district: '',
    province: '',
    premisesOwnershipType: '',
    deedOrLeaseReference: '',
    productCategory: '',
    productName: '',
    packType: '',
    packSizeMl: '',
    alcoholStrength: '',
    productDescription: '',
    proposedProducts: [],
    manufacturingType: '',
    rawMaterialDetails: '',
    productionCapacity: '',
    environmentalApprovalRef: '',
    fireSafetyApprovalRef: '',
    otherGovernmentApprovals: '',
    remarks: ''
  });

  const districts = ['Colombo', 'Galle', 'Kandy', 'Jaffna', 'Matara', 'Gampaha', 'Kalutara', 'Other'];
  const provinces = ['Western', 'Southern', 'Central', 'Northern', 'Eastern', 'North Western', 'North Central', 'Uva', 'Sabaragamuwa'];
  const premisesTypes = ['OWNED', 'LEASED', 'RENTED', 'OTHER'];
  const manufacturingTypes = ['DISTILLERY', 'BREWERY', 'FERMENTATION', 'BLENDING', 'BOTTLING', 'OTHER'];
  const productTypes = ['ARRACK', 'WHISKY', 'BRANDY', 'VODKA', 'GIN', 'RUM', 'BEER', 'WINE', 'TODDY', 'LIQUOR_BASED_PRODUCT', 'TOBACCO', 'OTHER'];
  const packTypes = ['BOTTLE', 'CAN', 'KEG', 'SACHET', 'OTHER'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRequiredFileChange = (category, file) => {
    setRequiredFiles((prev) => ({
      ...prev,
      [category]: file
    }));

    setErrors((prev) => {
      const keyByCategory = {
        BUSINESS_REGISTRATION: 'businessRegistrationFile',
        TAX_DOCUMENT: 'taxDocumentFile',
        DEED_OR_LEASE: 'deedOrLeaseFile'
      };
      const errorKey = keyByCategory[category];
      if (!errorKey || !prev[errorKey]) return prev;
      const { [errorKey]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const handleAddProduct = () => {
    if (formData.proposedProducts.length >= 1) {
      setErrors((prev) => ({ ...prev, proposedProducts: 'Only one product can be added per license application' }));
      return;
    }

    if (!formData.productCategory || !formData.productName.trim()) {
      setErrors((prev) => ({ ...prev, proposedProducts: 'Category and name are required to add a product' }));
      return;
    }

    const duplicate = formData.proposedProducts.some(
      (item) =>
      item.category === formData.productCategory &&
      item.name.trim().toLowerCase() === formData.productName.trim().toLowerCase() &&
      (item.packType || '') === (formData.packType || '')
    );

    if (duplicate) {
      setErrors((prev) => ({ ...prev, proposedProducts: 'This proposed product is already added' }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      proposedProducts: [
      ...prev.proposedProducts,
      {
        category: prev.productCategory,
        name: prev.productName.trim(),
        packType: prev.packType || null,
        packSizeMl: prev.packSizeMl ? Number(prev.packSizeMl) : null,
        alcoholStrength: prev.alcoholStrength ? Number(prev.alcoholStrength) : null,
        description: prev.productDescription.trim() || null
      }],

      productCategory: '',
      productName: '',
      packType: '',
      packSizeMl: '',
      alcoholStrength: '',
      productDescription: ''
    }));

    setErrors((prev) => {
      const { proposedProducts: _proposedProducts, ...rest } = prev;
      return rest;
    });
  };

  const handleRemoveProduct = (indexToRemove) => {
    setFormData((prev) => ({
      ...prev,
      proposedProducts: prev.proposedProducts.filter((_, index) => index !== indexToRemove)
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.applicantName.trim()) newErrors.applicantName = 'Applicant name is required';
    if (!formData.applicantEmail.trim()) newErrors.applicantEmail = 'Applicant email is required';
    if (!formData.companyName.trim()) newErrors.companyName = 'Company name is required';
    if (!formData.businessAddress.trim()) newErrors.businessAddress = 'Business address is required';
    if (!formData.district.trim()) newErrors.district = 'District is required';
    if (!formData.province.trim()) newErrors.province = 'Province is required';
    if (!formData.premisesOwnershipType.trim()) newErrors.premisesOwnershipType = 'Premises ownership type is required';
    if (!formData.manufacturingType.trim()) newErrors.manufacturingType = 'Manufacturing type is required';
    if (formData.proposedProducts.length !== 1) newErrors.proposedProducts = 'Exactly one proposed product is required';

    if (!requiredFiles.BUSINESS_REGISTRATION) newErrors.businessRegistrationFile = 'Business Registration file is required';
    if (!requiredFiles.TAX_DOCUMENT) newErrors.taxDocumentFile = 'Tax Document file is required';
    if (!requiredFiles.DEED_OR_LEASE) newErrors.deedOrLeaseFile = 'Deed or Lease file is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const selectedProduct = formData.proposedProducts[0];
      const payload = {
        applicantName: formData.applicantName,
        applicantEmail: formData.applicantEmail,
        applicantPhone: formData.applicantPhone,
        companyName: formData.companyName,
        companyRegistrationNo: formData.companyRegistrationNo,
        taxIdentificationNo: formData.taxIdentificationNo,
        businessAddress: formData.businessAddress,
        district: formData.district,
        province: formData.province,
        premisesOwnershipType: formData.premisesOwnershipType,
        deedOrLeaseReference: formData.deedOrLeaseReference,
        productType: selectedProduct?.category || '',
        proposedProducts: selectedProduct ? [selectedProduct] : [],
        manufacturingType: formData.manufacturingType,
        rawMaterialDetails: formData.rawMaterialDetails,
        productionCapacity: formData.productionCapacity,
        environmentalApprovalRef: formData.environmentalApprovalRef,
        fireSafetyApprovalRef: formData.fireSafetyApprovalRef,
        otherGovernmentApprovals: formData.otherGovernmentApprovals,
        remarks: formData.remarks
      };

      const response = await axios.post('/api/manufacturing-applications', payload);

      const applicationId = response?.data?.data?.id;
      if (!applicationId) {
        throw new Error('Application ID not found after submit');
      }

      const requiredUploadCategories = ['BUSINESS_REGISTRATION', 'TAX_DOCUMENT', 'DEED_OR_LEASE'];
      for (const category of requiredUploadCategories) {
        const uploadData = new FormData();
        uploadData.append('file', requiredFiles[category]);
        uploadData.append('category', category);
        await axios.post(`/api/manufacturing-applications/${applicationId}/upload`, uploadData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      if (otherDocumentFile) {
        const otherUploadData = new FormData();
        otherUploadData.append('file', otherDocumentFile);
        otherUploadData.append('category', 'OTHER');
        await axios.post(`/api/manufacturing-applications/${applicationId}/upload`, otherUploadData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      toast.success('Application submitted successfully!');
      setTimeout(() => navigate('/'), 2000);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error submitting application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white border border-gray-200 p-8">
          {}
          <div className="mb-8 border-b pb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Manufacturing License Application</h1>
            <p className="text-gray-600">Submit your application for a manufacturing/distillery license</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {}
            <div className="border border-gray-200 p-6 bg-white">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Applicant Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    name="applicantName"
                    value={formData.applicantName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none"
                    required />
                  
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    name="applicantEmail"
                    value={formData.applicantEmail}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none"
                    required />
                  
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    name="applicantPhone"
                    value={formData.applicantPhone}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none" />
                  
                </div>
              </div>
            </div>

            {}
            <div className="border border-gray-200 p-6 bg-white">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Company Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none"
                    required />
                  
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Registration No.</label>
                  <input
                    type="text"
                    name="companyRegistrationNo"
                    value={formData.companyRegistrationNo}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none" />
                  
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax Identification No.</label>
                  <input
                    type="text"
                    name="taxIdentificationNo"
                    value={formData.taxIdentificationNo}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none" />
                  
                </div>
              </div>
            </div>

            {}
            <div className="border border-gray-200 p-6 bg-white">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Business Address</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                  <input
                    type="text"
                    name="businessAddress"
                    value={formData.businessAddress}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none"
                    required />
                  
                </div>
                <div>
                  <SelectDropdown
                    label="District *"
                    id="district"
                    name="district"
                    value={formData.district}
                    onChange={handleChange}
                    placeholder="Select District"
                    required
                    options={districts.map((d) => ({ value: d, label: d }))} />
                </div>
                <div>
                  <SelectDropdown
                    label="Province *"
                    id="province"
                    name="province"
                    value={formData.province}
                    onChange={handleChange}
                    placeholder="Select Province"
                    required
                    options={provinces.map((p) => ({ value: p, label: p }))} />
                </div>
              </div>
            </div>

            {}
            <div className="border border-gray-200 p-6 bg-white">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Premises Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <SelectDropdown
                    label="Premises Ownership Type *"
                    id="premisesOwnershipType"
                    name="premisesOwnershipType"
                    value={formData.premisesOwnershipType}
                    onChange={handleChange}
                    placeholder="Select Type"
                    required
                    options={premisesTypes.map((t) => ({ value: t, label: t }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deed/Lease Reference</label>
                  <input
                    type="text"
                    name="deedOrLeaseReference"
                    value={formData.deedOrLeaseReference}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none" />
                  
                </div>
              </div>
            </div>

            {}
            <div className="border border-gray-200 p-6 bg-white">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Manufacturing Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <SelectDropdown
                    label="Product Category *"
                    id="productCategory"
                    name="productCategory"
                    value={formData.productCategory}
                    onChange={handleChange}
                    placeholder="Select Product Category"
                    options={productTypes.map((t) => ({ value: t, label: t }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    name="productName"
                    value={formData.productName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none" />
                  
                </div>
                <div>
                  <SelectDropdown
                    label="Manufacturing Type"
                    id="manufacturingType"
                    name="manufacturingType"
                    value={formData.manufacturingType}
                    onChange={handleChange}
                    placeholder="Select Manufacturing Type"
                    options={manufacturingTypes.map((t) => ({ value: t, label: t }))} />
                </div>
                <div>
                  <SelectDropdown
                    label="Pack Type"
                    id="packType"
                    name="packType"
                    value={formData.packType}
                    onChange={handleChange}
                    placeholder="Select Pack Type"
                    options={packTypes.map((t) => ({ value: t, label: t }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pack Size (ml)</label>
                  <input
                    type="number"
                    min="0"
                    name="packSizeMl"
                    value={formData.packSizeMl}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none" />
                  
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Alcohol Strength (%)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    name="alcoholStrength"
                    value={formData.alcoholStrength}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none" />
                  
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    name="productDescription"
                    value={formData.productDescription}
                    onChange={handleChange}
                    rows="2"
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none" />
                  
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Production Capacity</label>
                  <input
                    type="text"
                    name="productionCapacity"
                    value={formData.productionCapacity}
                    onChange={handleChange}
                    placeholder="e.g., 10000 liters/month"
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none" />
                  
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Raw Material Details</label>
                  <input
                    type="text"
                    name="rawMaterialDetails"
                    value={formData.rawMaterialDetails}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none" />
                  
                </div>
              </div>
              <div className="mt-4 border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-gray-600">Only one product can be added per license application.</p>
                  <button
                    type="button"
                    onClick={handleAddProduct}
                    disabled={formData.proposedProducts.length >= 1}
                    className="px-4 py-2 border border-gray-300 font-medium text-gray-700 hover:bg-gray-100 transition">
                    
                    Add Product
                  </button>
                </div>
                {errors.proposedProducts && <p className="text-sm text-red-600 mt-2">{errors.proposedProducts}</p>}
                {formData.proposedProducts.length > 0 &&
                <div className="overflow-x-auto border border-gray-200 rounded-md mt-3">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 text-gray-700">
                        <tr>
                          <th className="text-left px-3 py-2">Category</th>
                          <th className="text-left px-3 py-2">Name</th>
                          <th className="text-left px-3 py-2">Pack Type</th>
                          <th className="text-left px-3 py-2">Pack Size (ml)</th>
                          <th className="text-left px-3 py-2">Alcohol %</th>
                          <th className="text-left px-3 py-2">Description</th>
                          <th className="text-left px-3 py-2">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.proposedProducts.map((item, index) =>
                      <tr key={`${item.category}-${item.name}-${index}`} className="border-t border-gray-200">
                            <td className="px-3 py-2">{item.category}</td>
                            <td className="px-3 py-2">{item.name}</td>
                            <td className="px-3 py-2">{item.packType || '-'}</td>
                            <td className="px-3 py-2">{item.packSizeMl ?? '-'}</td>
                            <td className="px-3 py-2">{item.alcoholStrength ?? '-'}</td>
                            <td className="px-3 py-2">{item.description || '-'}</td>
                            <td className="px-3 py-2">
                              <button
                            type="button"
                            onClick={() => handleRemoveProduct(index)}
                            className="text-red-600 hover:text-red-800">
                            
                                Remove
                              </button>
                            </td>
                          </tr>
                      )}
                      </tbody>
                    </table>
                  </div>
                }
              </div>
            </div>

            {}
            <div className="border border-gray-200 p-6 bg-white">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Government Approvals</h2>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Environmental Approval Reference</label>
                  <input
                    type="text"
                    name="environmentalApprovalRef"
                    value={formData.environmentalApprovalRef}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none" />
                  
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fire Safety Approval Reference</label>
                  <input
                    type="text"
                    name="fireSafetyApprovalRef"
                    value={formData.fireSafetyApprovalRef}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none" />
                  
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Other Government Approvals</label>
                  <input
                    type="text"
                    name="otherGovernmentApprovals"
                    value={formData.otherGovernmentApprovals}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none" />
                  
                </div>
              </div>
            </div>

            {}
            <div className="border border-gray-200 p-6 bg-white">
              <label className="block text-sm font-medium text-gray-700 mb-1">Additional Remarks</label>
              <textarea
                name="remarks"
                value={formData.remarks}
                onChange={handleChange}
                rows="4"
                className="w-full px-4 py-2 border border-gray-300 focus:outline-none" />
              
            </div>

            <div className="border border-gray-200 p-6 bg-white">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Required Documents</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Registration *</label>
                  <input
                    type="file"
                    onChange={(e) => handleRequiredFileChange('BUSINESS_REGISTRATION', e.target.files?.[0] || null)}
                    className="w-full px-4 py-2 border border-gray-300" />
                  
                  {errors.businessRegistrationFile && <p className="text-sm text-red-600 mt-1">{errors.businessRegistrationFile}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax Document *</label>
                  <input
                    type="file"
                    onChange={(e) => handleRequiredFileChange('TAX_DOCUMENT', e.target.files?.[0] || null)}
                    className="w-full px-4 py-2 border border-gray-300" />
                  
                  {errors.taxDocumentFile && <p className="text-sm text-red-600 mt-1">{errors.taxDocumentFile}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deed or Lease *</label>
                  <input
                    type="file"
                    onChange={(e) => handleRequiredFileChange('DEED_OR_LEASE', e.target.files?.[0] || null)}
                    className="w-full px-4 py-2 border border-gray-300" />
                  
                  {errors.deedOrLeaseFile && <p className="text-sm text-red-600 mt-1">{errors.deedOrLeaseFile}</p>}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Other Document (Optional)</label>
                  <input
                    type="file"
                    onChange={(e) => setOtherDocumentFile(e.target.files?.[0] || null)}
                    className="w-full px-4 py-2 border border-gray-300" />
                  
                </div>
              </div>
            </div>

            {}
            <div className="flex gap-4 pt-6 border-t">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="flex-1 px-6 py-3 border border-gray-300 font-medium text-gray-700 hover:bg-white transition">
                
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-primary-600 text-white font-medium hover:bg-primary-700 transition disabled:opacity-50">
                
                {loading ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>);

}