import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import SelectDropdown from '../../components/common/SelectDropdown';

export default function ApplyDistributionLicense() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialData = location.state?.initialData || {};
  const [loading, setLoading] = useState(false);
  const [applicationFile, setApplicationFile] = useState(null);
  const [fileCategory, setFileCategory] = useState('SUPPORTING_DOCUMENT');
  const [formData, setFormData] = useState({
    applicantName: initialData.applicantName || '',
    applicantEmail: initialData.applicantEmail || '',
    applicantPhone: initialData.applicantPhone || '',
    businessName: initialData.businessName || '',
    businessRegistrationNo: initialData.businessRegistrationNo || '',
    taxIdentificationNo: initialData.taxIdentificationNo || '',
    manufacturerIds: initialData.manufacturerIds || (initialData.manufacturerId ? [initialData.manufacturerId] : []),
    warehouseAddress: initialData.warehouseAddress || '',
    district: initialData.district || '',
    province: initialData.province || '',
    premisesOwnershipType: initialData.premisesOwnershipType || '',
    deedOrLeaseReference: initialData.deedOrLeaseReference || '',
    buildingPlanReference: initialData.buildingPlanReference || '',
    packingListDetails: initialData.packingListDetails || '',
    oicCertificationRef: initialData.oicCertificationRef || '',
    warehouseCapacity: initialData.warehouseCapacity || '',
    transportDetails: initialData.transportDetails || '',
    distributionScope: initialData.distributionScope || '',
    remarks: initialData.remarks || ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [manufacturers, setManufacturers] = useState([]);
  const [manufacturerSearch, setManufacturerSearch] = useState('');

  const districts = ['Colombo', 'Galle', 'Kandy', 'Jaffna', 'Matara', 'Gampaha', 'Kalutara', 'Other'];
  const provinces = ['Western', 'Southern', 'Central', 'Northern', 'Eastern', 'North Western', 'North Central', 'Uva', 'Sabaragamuwa'];
  const premisesTypes = ['OWNED', 'LEASED', 'RENTED', 'OTHER'];
  const fileCategories = [
  'SUPPORTING_DOCUMENT',
  'BUSINESS_REGISTRATION',
  'TAX_DOCUMENT',
  'DEED_OR_LEASE',
  'APPROVAL_CERTIFICATE',
  'OTHER'];


  useEffect(() => {
    const fetchManufacturers = async () => {
      try {
        const response = await axios.get('/api/manufacturers/active');
        const items = response?.data?.data || [];
        setManufacturers(items);
      } catch {
        toast.error('Failed to load active manufacturers');
      }
    };

    fetchManufacturers();
  }, []);

  const filteredManufacturers = useMemo(() => {
    const keyword = manufacturerSearch.trim().toLowerCase();
    if (!keyword) return manufacturers;

    return manufacturers.filter((manufacturer) =>
    `${manufacturer.companyName || ''} ${manufacturer.fullName || ''} ${manufacturer.email || ''}`.
    toLowerCase().
    includes(keyword)
    );
  }, [manufacturers, manufacturerSearch]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleManufacturer = (manufacturerId) => {
    setFormData((prev) => {
      const exists = prev.manufacturerIds.includes(manufacturerId);
      const nextIds = exists ?
      prev.manufacturerIds.filter((id) => id !== manufacturerId) :
      [...prev.manufacturerIds, manufacturerId];

      return {
        ...prev,
        manufacturerIds: nextIds
      };
    });

    setFormErrors((prev) => {
      if (!prev.manufacturerIds) return prev;
      const { manufacturerIds: _manufacturerIds, ...rest } = prev;
      return rest;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!formData.applicantName) nextErrors.applicantName = 'Applicant name is required';
    if (!formData.applicantEmail) nextErrors.applicantEmail = 'Applicant email is required';
    if (!formData.businessName) nextErrors.businessName = 'Business name is required';
    if (!formData.warehouseAddress) nextErrors.warehouseAddress = 'Warehouse address is required';
    if (!formData.district) nextErrors.district = 'District is required';
    if (!formData.province) nextErrors.province = 'Province is required';
    if (!formData.premisesOwnershipType) nextErrors.premisesOwnershipType = 'Premises ownership type is required';
    if (!Array.isArray(formData.manufacturerIds) || formData.manufacturerIds.length === 0) {
      nextErrors.manufacturerIds = 'Please select at least one manufacturer';
    }

    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        manufacturerIds: formData.manufacturerIds
      };

      const response = await axios.post('/api/distribution-applications', payload);

      const applicationId = response?.data?.data?.id;
      if (applicationFile && applicationId) {
        const uploadData = new FormData();
        uploadData.append('file', applicationFile);
        uploadData.append('category', fileCategory);
        await axios.post(`/api/distribution-applications/${applicationId}/upload`, uploadData, {
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
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Distribution/Wholesale License Application</h1>
                        <p className="text-gray-600">Submit your application for a wholesale/distribution license</p>
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
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Business Information</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
                                    <input
                    type="text"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none"
                    required />
                  
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Business Registration No.</label>
                                    <input
                    type="text"
                    name="businessRegistrationNo"
                    value={formData.businessRegistrationNo}
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

                        <div className="border border-gray-200 p-6 bg-white">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Linked Manufacturer(s)</h2>
                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-gray-700">Select Manufacturer(s) *</label>
                                <input
                  type="text"
                  value={manufacturerSearch}
                  onChange={(e) => setManufacturerSearch(e.target.value)}
                  placeholder="Search by company, name, or email"
                  className="w-full px-4 py-2 border border-gray-300 focus:outline-none" />
                
                                <div className={`max-h-56 overflow-y-auto border p-3 space-y-2 ${formErrors.manufacturerIds ? 'border-red-400' : 'border-gray-300'}`}>
                                    {filteredManufacturers.map((manufacturer) =>
                  <label key={manufacturer.id} className="flex items-start gap-3 border border-gray-200 p-3 hover:bg-gray-50 cursor-pointer">
                                            <input
                      type="checkbox"
                      checked={formData.manufacturerIds.includes(manufacturer.id)}
                      onChange={() => toggleManufacturer(manufacturer.id)}
                      className="mt-1" />
                    
                                            <div className="text-sm">
                                                <p className="font-medium text-gray-800">{manufacturer.companyName || manufacturer.fullName}</p>
                                                <p className="text-gray-500">{manufacturer.email}</p>
                                                <p className="text-xs text-gray-500">License: {manufacturer.licenses?.[0]?.licenseNumber || 'Active manufacturing license'}</p>
                                            </div>
                                        </label>
                  )}
                                    {!filteredManufacturers.length && <p className="text-sm text-gray-500">No manufacturers found for the current search.</p>}
                                </div>
                                {formErrors.manufacturerIds && <p className="text-sm text-red-600">{formErrors.manufacturerIds}</p>}
                                <p className="text-xs text-gray-500">Distribution applications must link one or more active manufacturers.</p>
                            </div>
                        </div>

                        {}
                        <div className="border border-gray-200 p-6 bg-white">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Warehouse Address</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                                    <input
                    type="text"
                    name="warehouseAddress"
                    value={formData.warehouseAddress}
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
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Building Plan Reference</label>
                                    <input
                    type="text"
                    name="buildingPlanReference"
                    value={formData.buildingPlanReference}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none" />
                  
                                </div>
                            </div>
                        </div>

                        {}
                        <div className="border border-gray-200 p-6 bg-white">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Distribution Details</h2>
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse Capacity</label>
                                    <input
                    type="text"
                    name="warehouseCapacity"
                    value={formData.warehouseCapacity}
                    onChange={handleChange}
                    placeholder="e.g., 50000 units"
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none" />
                  
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Packing List Details</label>
                                    <textarea
                    name="packingListDetails"
                    value={formData.packingListDetails}
                    onChange={handleChange}
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none" />
                  
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">OIC Certification Reference</label>
                                    <input
                    type="text"
                    name="oicCertificationRef"
                    value={formData.oicCertificationRef}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none" />
                  
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Transport Details</label>
                                    <textarea
                    name="transportDetails"
                    value={formData.transportDetails}
                    onChange={handleChange}
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none" />
                  
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Distribution Scope</label>
                                    <input
                    type="text"
                    name="distributionScope"
                    value={formData.distributionScope}
                    onChange={handleChange}
                    placeholder="e.g., Island-wide, Specific regions"
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
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Document Upload (Optional)</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <SelectDropdown
                                        label="Document Category"
                                        id="fileCategory"
                                        name="fileCategory"
                                        value={fileCategory}
                                        onChange={(e) => setFileCategory(e.target.value)}
                                        options={fileCategories.map((category) => ({ value: category, label: category }))} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
                                    <input
                    type="file"
                    onChange={(e) => setApplicationFile(e.target.files?.[0] || null)}
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