import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import SelectDropdown from '../../components/common/SelectDropdown';
import Textarea from '../../components/common/Textarea';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import retailerApi from '../../services/retailerApi';
import authApi from '../../services/authApi';
import api from '../../services/api';

const createEmptyApplication = () => ({
  applicantName: '',
  applicantEmail: '',
  applicantPhone: '',
  businessName: '',
  district: '',
  province: '',
  businessAddress: '',
  outletType: '',
  taxIdentificationNo: '',
  premisesOwnershipType: '',
  deedOrLeaseReference: '',
  touristBoardApprovalRef: '',
  filmCorporationApprovalRef: '',
  clubApprovalRef: '',
  tradeLicenseRef: '',
  liquorSaleMode: '',
  seatingCapacity: '',
  applicationStatus: 'SUBMITTED',
  remarks: ''
});

const applicationStatusOptions = [
{ value: 'DRAFT', label: 'Draft' },
{ value: 'SUBMITTED', label: 'Submitted' }];


const premisesOwnershipOptions = [
{ value: '', label: 'Select premises ownership' },
{ value: 'OWNED', label: 'Owned' },
{ value: 'LEASED', label: 'Leased' },
{ value: 'RENTED', label: 'Rented' },
{ value: 'OTHER', label: 'Other' }];


const outletTypeOptions = [
{ value: '', label: 'Select outlet type' },
{ value: 'RETAIL', label: 'Retail' },
{ value: 'BAR', label: 'Bar' },
{ value: 'RESTAURANT', label: 'Restaurant' },
{ value: 'HOTEL', label: 'Hotel' },
{ value: 'CLUB', label: 'Club' }];


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
  const [initialLoading, setInitialLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [retailerProfile, setRetailerProfile] = useState(null);
  const [application, setApplication] = useState(createEmptyApplication());
  const [availableDistributors, setAvailableDistributors] = useState([]);
  const [selectedDistributorIds, setSelectedDistributorIds] = useState([]);

  useEffect(() => {
    const init = async () => {
      setInitialLoading(true);
      try {
        const [profileRes, distributorsRes] = await Promise.all([
        authApi.getProfile(),
        api.get('/distributors/available/for-retailer')]
        );

        const profile = profileRes?.data?.data || null;
        setRetailerProfile(profile);
        setAvailableDistributors(distributorsRes?.data?.data || []);

        setApplication((prev) => ({
          ...prev,
          applicantName: prev.applicantName || profile?.fullName || '',
          applicantEmail: prev.applicantEmail || profile?.email || '',
          applicantPhone: prev.applicantPhone || profile?.mobile || '',
          businessName: prev.businessName || profile?.companyName || profile?.fullName || '',
          district: prev.district || profile?.district || '',
          province: prev.province || profile?.province || '',
          businessAddress: prev.businessAddress || profile?.address || ''
        }));
      } catch (error) {
        console.error('Failed to initialize retailer profile/apply options:', error);
        setSubmitError('Failed to load profile or distributor options. Please refresh and try again.');
      } finally {
        setInitialLoading(false);
      }
    };

    init();
  }, []);

  const getError = (field) => errors[field];

  const clearError = (field) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const { [field]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const handleChange = (field, value) => {
    setApplication((prev) => ({ ...prev, [field]: value }));
    clearError(field);
  };

  const toggleDistributor = (id) => {
    setSelectedDistributorIds((prev) =>
    prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!application.businessName.trim()) nextErrors.businessName = 'Business name is required';
    if (!application.district.trim()) nextErrors.district = 'District is required';
    if (!application.province.trim()) nextErrors.province = 'Province is required';
    if (!application.businessAddress.trim()) nextErrors.businessAddress = 'Business address is required';
    if (!application.premisesOwnershipType.trim()) nextErrors.premisesOwnershipType = 'Premises ownership type is required';
    if (!application.outletType.trim()) nextErrors.outletType = 'Outlet type is required';

    if (application.seatingCapacity && Number(application.seatingCapacity) < 0) {
      nextErrors.seatingCapacity = 'Seating capacity must be 0 or greater';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');

    if (!validateForm()) return;

    if (!retailerProfile?.id) {
      setSubmitError('Retailer account not found. Please login again.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        applicantName: application.applicantName,
        applicantEmail: application.applicantEmail,
        applicantPhone: application.applicantPhone,
        businessName: application.businessName,
        businessAddress: application.businessAddress,
        district: application.district,
        province: application.province,
        outletType: application.outletType,
        taxIdentificationNo: application.taxIdentificationNo,
        premisesOwnershipType: application.premisesOwnershipType,
        deedOrLeaseReference: application.deedOrLeaseReference,
        touristBoardApprovalRef: application.touristBoardApprovalRef,
        filmCorporationApprovalRef: application.filmCorporationApprovalRef,
        clubApprovalRef: application.clubApprovalRef,
        tradeLicenseRef: application.tradeLicenseRef,
        liquorSaleMode: application.liquorSaleMode,
        seatingCapacity: application.seatingCapacity,
        applicationStatus: application.applicationStatus,
        distributorIds: selectedDistributorIds,
        remarks: application.remarks
      };

      await retailerApi.createRetailerApplication(retailerProfile.id, payload);

      toast.success('Retail license application submitted successfully');
      navigate('/retail/my-license');
    } catch (error) {
      console.error('Failed to submit retail application:', error);
      const errorMsg = error.response?.data?.message || 'Failed to submit retail license application. Please try again.';
      setSubmitError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setApplication(createEmptyApplication());
    setSelectedDistributorIds([]);
    setErrors({});
    setSubmitError('');
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <LoadingSpinner />
      </div>);

  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Apply New License"
        description="Submit a new retail license application"
        actions={
        <Link to="/retail/my-license">
            <Button variant="outline">Back to My License</Button>
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
            <h3 className="text-lg font-medium text-gray-900 mb-4">Applicant & Business Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Applicant Name"
                value={application.applicantName}
                onChange={(e) => handleChange('applicantName', e.target.value)}
                placeholder="Default: full name" />
              
              <Input
                label="Applicant Email"
                type="email"
                value={application.applicantEmail}
                onChange={(e) => handleChange('applicantEmail', e.target.value)}
                placeholder="Default: account email" />
              
              <Input
                label="Applicant Phone"
                value={application.applicantPhone}
                onChange={(e) => handleChange('applicantPhone', e.target.value)}
                placeholder="Default: mobile" />
              
              <SelectDropdown
                label="Application Status"
                value={application.applicationStatus}
                onChange={(e) => handleChange('applicationStatus', e.target.value)}
                options={applicationStatusOptions} />
              
              <Input
                label="Business Name *"
                value={application.businessName}
                onChange={(e) => handleChange('businessName', e.target.value)}
                error={getError('businessName')}
                required />
              
              <Input
                label="District *"
                value={application.district}
                onChange={(e) => handleChange('district', e.target.value)}
                error={getError('district')}
                required />
              
              <SelectDropdown
                label="Province *"
                value={application.province}
                onChange={(e) => handleChange('province', e.target.value)}
                options={provinceOptions}
                error={getError('province')}
                required />
              
              <SelectDropdown
                label="Outlet Type *"
                value={application.outletType}
                onChange={(e) => handleChange('outletType', e.target.value)}
                options={outletTypeOptions}
                error={getError('outletType')}
                required />
              
              <Input
                label="Tax Identification No"
                value={application.taxIdentificationNo}
                onChange={(e) => handleChange('taxIdentificationNo', e.target.value)}
                placeholder="Enter TIN number" />
              
              <SelectDropdown
                label="Premises Ownership Type *"
                value={application.premisesOwnershipType}
                onChange={(e) => handleChange('premisesOwnershipType', e.target.value)}
                options={premisesOwnershipOptions}
                error={getError('premisesOwnershipType')}
                required />
              
            </div>
          </div>

          <Textarea
            label="Business Address *"
            value={application.businessAddress}
            onChange={(e) => handleChange('businessAddress', e.target.value)}
            placeholder="Enter complete business address"
            rows={3}
            error={getError('businessAddress')}
            required />
          

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Deed/Lease Reference"
              value={application.deedOrLeaseReference}
              onChange={(e) => handleChange('deedOrLeaseReference', e.target.value)}
              placeholder="Enter deed/lease reference" />
            
            <Input
              label="Trade License Reference"
              value={application.tradeLicenseRef}
              onChange={(e) => handleChange('tradeLicenseRef', e.target.value)}
              placeholder="Enter trade license reference" />
            
            <Input
              label="Tourist Board Approval Ref"
              value={application.touristBoardApprovalRef}
              onChange={(e) => handleChange('touristBoardApprovalRef', e.target.value)}
              placeholder="Enter reference" />
            
            <Input
              label="Film Corporation Approval Ref"
              value={application.filmCorporationApprovalRef}
              onChange={(e) => handleChange('filmCorporationApprovalRef', e.target.value)}
              placeholder="Enter reference" />
            
            <Input
              label="Club Approval Ref"
              value={application.clubApprovalRef}
              onChange={(e) => handleChange('clubApprovalRef', e.target.value)}
              placeholder="Enter reference" />
            
            <Input
              label="Liquor Sale Mode"
              value={application.liquorSaleMode}
              onChange={(e) => handleChange('liquorSaleMode', e.target.value)}
              placeholder="e.g. On-premise / Off-premise" />
            
            <Input
              label="Seating Capacity"
              type="number"
              min="0"
              value={application.seatingCapacity}
              onChange={(e) => handleChange('seatingCapacity', e.target.value)}
              placeholder="Enter seating capacity"
              error={getError('seatingCapacity')} />
            
          </div>

          <div className="border border-gray-200 rounded-lg p-4 space-y-4">
            <h5 className="text-sm font-semibold text-gray-800">Preferred Distributors (Optional)</h5>
            {availableDistributors.length ?
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availableDistributors.map((distributor) => {
                const isChecked = selectedDistributorIds.includes(distributor.id);
                return (
                  <label
                    key={distributor.id}
                    className="flex items-start gap-3 p-3 border border-gray-200 bg-white cursor-pointer">
                    
                      <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleDistributor(distributor.id)}
                      className="mt-1" />
                    
                      <div>
                        <p className="text-sm font-medium text-gray-900">{distributor.companyName || distributor.fullName}</p>
                        <p className="text-xs text-gray-500">{distributor.email || '-'}</p>
                      </div>
                    </label>);

              })}
              </div> :

            <p className="text-sm text-gray-500">No active distributors available currently.</p>
            }
          </div>

          <Textarea
            label="Remarks"
            value={application.remarks}
            onChange={(e) => handleChange('remarks', e.target.value)}
            placeholder="Enter any remarks or special notes"
            rows={3} />
          

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