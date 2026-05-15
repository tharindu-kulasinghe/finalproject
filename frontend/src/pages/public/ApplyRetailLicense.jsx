import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import SelectDropdown from '../../components/common/SelectDropdown';

export default function ApplyRetailLicense() {
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
    businessAddress: initialData.businessAddress || '',
    district: initialData.district || '',
    province: initialData.province || '',
    outletType: initialData.outletType || '',
    taxIdentificationNo: initialData.taxIdentificationNo || '',
    premisesOwnershipType: initialData.premisesOwnershipType || '',
    deedOrLeaseReference: initialData.deedOrLeaseReference || '',
    touristBoardApprovalRef: initialData.touristBoardApprovalRef || '',
    filmCorporationApprovalRef: initialData.filmCorporationApprovalRef || '',
    clubApprovalRef: initialData.clubApprovalRef || '',
    tradeLicenseRef: initialData.tradeLicenseRef || '',
    liquorSaleMode: initialData.liquorSaleMode || '',
    seatingCapacity: initialData.seatingCapacity || '',
    remarks: initialData.remarks || ''
  });

  const districts = ['Colombo', 'Galle', 'Kandy', 'Jaffna', 'Matara', 'Gampaha', 'Kalutara', 'Other'];
  const provinces = ['Western', 'Southern', 'Central', 'Northern', 'Eastern', 'North Western', 'North Central', 'Uva', 'Sabaragamuwa'];
  const outletTypes = ['RETAIL', 'BAR', 'RESTAURANT', 'HOTEL', 'CLUB'];
  const premisesTypes = ['OWNED', 'LEASED', 'RENTED', 'OTHER'];
  const salesModes = ['ON_PREMISE', 'OFF_PREMISE', 'BOTH', 'DELIVERY'];
  const fileCategories = [
  'SUPPORTING_DOCUMENT',
  'BUSINESS_REGISTRATION',
  'TAX_DOCUMENT',
  'DEED_OR_LEASE',
  'APPROVAL_CERTIFICATE',
  'OTHER'];


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nextErrors = {};
    if (!formData.applicantName) nextErrors.applicantName = 'Applicant name is required';
    if (!formData.applicantEmail) nextErrors.applicantEmail = 'Applicant email is required';
    if (!formData.businessName) nextErrors.businessName = 'Business name is required';
    if (!formData.businessAddress) nextErrors.businessAddress = 'Business address is required';
    if (!formData.district) nextErrors.district = 'District is required';
    if (!formData.province) nextErrors.province = 'Province is required';
    if (!formData.outletType) nextErrors.outletType = 'Outlet type is required';
    if (!formData.premisesOwnershipType) nextErrors.premisesOwnershipType = 'Premises ownership type is required';

    if (Object.keys(nextErrors).length > 0) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/retail-applications', formData);

      const applicationId = response?.data?.data?.id;
      if (applicationFile && applicationId) {
        const uploadData = new FormData();
        uploadData.append('file', applicationFile);
        uploadData.append('category', fileCategory);
        await axios.post(`/api/retail-applications/${applicationId}/upload`, uploadData, {
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Retail/Bar/Restaurant/Hotel License Application</h1>
            <p className="text-gray-600">Submit your application for a retail outlet license</p>
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
                <div className="md:col-span-2">
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
                  <SelectDropdown
                    label="Outlet Type *"
                    id="outletType"
                    name="outletType"
                    value={formData.outletType}
                    onChange={handleChange}
                    placeholder="Select Outlet Type"
                    required
                    options={outletTypes.map((t) => ({ value: t, label: t }))} />
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
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Outlet Details</h2>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <SelectDropdown
                    label="Liquor Sale Mode"
                    id="liquorSaleMode"
                    name="liquorSaleMode"
                    value={formData.liquorSaleMode}
                    onChange={handleChange}
                    placeholder="Select Sale Mode"
                    options={salesModes.map((m) => ({ value: m, label: m }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Seating Capacity</label>
                  <input
                    type="text"
                    name="seatingCapacity"
                    value={formData.seatingCapacity}
                    onChange={handleChange}
                    placeholder="e.g., 50 persons"
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none" />
                  
                </div>
              </div>
            </div>

            {}
            <div className="border border-gray-200 p-6 bg-white">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Special Approvals (if applicable)</h2>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tourist Board Approval Reference</label>
                  <input
                    type="text"
                    name="touristBoardApprovalRef"
                    value={formData.touristBoardApprovalRef}
                    onChange={handleChange}
                    placeholder="For hotels/tourist facilities"
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none" />
                  
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Film Corporation Approval Reference</label>
                  <input
                    type="text"
                    name="filmCorporationApprovalRef"
                    value={formData.filmCorporationApprovalRef}
                    onChange={handleChange}
                    placeholder="If venue hosts film events"
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none" />
                  
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Club Approval Reference</label>
                  <input
                    type="text"
                    name="clubApprovalRef"
                    value={formData.clubApprovalRef}
                    onChange={handleChange}
                    placeholder="If venue is a registered club"
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none" />
                  
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trade License Reference</label>
                  <input
                    type="text"
                    name="tradeLicenseRef"
                    value={formData.tradeLicenseRef}
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