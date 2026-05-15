import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import PageHeader from '../../../components/common/PageHeader';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import SelectDropdown from '../../../components/common/SelectDropdown';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import officerApi from '../../../services/officerApi';

const POSITIONS = [
'OIC',
'INSPECTOR',
'ASSISTANT_EXCISE_SUPERINTENDENT',
'EXCISE_SUPERINTENDENT',
'ASSISTANT_COMMISSIONER',
'DEPUTY_COMMISSIONER',
'COMMISSIONER',
'INVESTIGATION_OFFICER',
'FIELD_OFFICER',
'DATA_ENTRY_OFFICER',
'CLERK',
'OTHER'];


const EMPLOYMENT_TYPES = ['PERMANENT', 'CONTRACT', 'TEMPORARY', 'TRAINEE'];

const toDateInputValue = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
};

const formatPosition = (position) => {
  if (!position) return '-';
  return position.
  replace(/_/g, ' ').
  toLowerCase().
  replace(/\b\w/g, (char) => char.toUpperCase());
};

export default function OfficerEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [officer, setOfficer] = useState(null);
  const [formData, setFormData] = useState({});
  const [profileImage, setProfileImage] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchOfficer = useCallback(async () => {
    setLoading(true);
    try {
      const response = await officerApi.getOfficerById(id);
      const officerData = response.data;
      setOfficer(officerData);
      const { lastPromotionDate: _omitPromotion, ...officerFields } = officerData;
      setFormData({
        ...officerFields,
        appointmentDate: toDateInputValue(officerData.appointmentDate),
        dateOfBirth: toDateInputValue(officerData.dateOfBirth)
      });
    } catch (error) {
      console.error('Error fetching officer:', error);
      toast.error('Failed to load officer profile');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOfficer();
  }, [fetchOfficer]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB');
      return;
    }

    setProfileImage(file);
    setProfileImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await officerApi.updateOfficer(id, formData);

      if (profileImage) {
        const imageFormData = new FormData();
        imageFormData.append('profileImage', profileImage);
        await officerApi.uploadProfileImage(id, imageFormData);
      }

      toast.success('Officer updated successfully');
      navigate(`/admin/officers/${id}`);
    } catch (error) {
      console.error('Error updating officer:', error);
      toast.error(error.response?.data?.message || 'Failed to update officer');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>);

  }

  if (!officer) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Officer not found</p>
        <Link to="/admin/officers" className="text-primary-600 hover:underline mt-2 inline-block">
          Back to Officers
        </Link>
      </div>);

  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${officer.fullName}`}
        description="Update officer profile and account details"
        actions={
        <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate(`/admin/officers/${id}`)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={saving}>
              Save Changes
            </Button>
          </div>
        } />
      

      <form onSubmit={handleSubmit} className="border border-gray-200 bg-white p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full border border-primary-200 bg-primary-50 flex items-center justify-center overflow-hidden">
            {profileImagePreview ?
            <img src={profileImagePreview} alt="Preview" className="h-full w-full !rounded-full object-cover" /> :
            officer.profileImage ?
            <img src={officer.profileImage} alt="Current" className="h-full w-full !rounded-full object-cover" /> :

            <span className="text-2xl font-semibold text-primary-700">
                {officer.fullName?.split(' ').map((name) => name[0]).join('').toUpperCase().slice(0, 2)}
              </span>
            }
          </div>
          <div>
            <label className="inline-flex items-center px-4 py-2 bg-white border border-gray-200 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 cursor-pointer">
              Browse Image
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} className="hidden" />
            </label>
            <p className="text-xs text-gray-500 mt-1">JPG, PNG or WebP (max 2MB)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Full Name" name="fullName" value={formData.fullName || ''} onChange={handleInputChange} required />
          <Input label="Mobile" name="mobile" value={formData.mobile || ''} onChange={handleInputChange} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Employee No" name="employeeNo" value={formData.employeeNo || ''} onChange={handleInputChange} />
          <Input label="NIC" name="nic" value={formData.nic || ''} onChange={handleInputChange} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Email" name="email" type="email" value={formData.email || ''} onChange={handleInputChange} required />
          <Input label="Official Email" name="officialEmail" value={formData.officialEmail || ''} onChange={handleInputChange} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Official Phone" name="officialPhone" value={formData.officialPhone || ''} onChange={handleInputChange} />
          <Input label="Department" name="department" value={formData.department || ''} onChange={handleInputChange} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Office Name" name="officeName" value={formData.officeName || ''} onChange={handleInputChange} />
          <Input label="District" name="district" value={formData.district || ''} onChange={handleInputChange} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Province" name="province" value={formData.province || ''} onChange={handleInputChange} />
          <Input label="Address" name="address" value={formData.address || ''} onChange={handleInputChange} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectDropdown
            label="Position"
            name="position"
            value={formData.position || ''}
            onChange={handleInputChange}
            options={[{ value: '', label: 'Select Position' }, ...POSITIONS.map((p) => ({ value: p, label: formatPosition(p) }))]} />
          
          <SelectDropdown
            label="Employment Type"
            name="employmentType"
            value={formData.employmentType || ''}
            onChange={handleInputChange}
            options={[{ value: '', label: 'Select Type' }, ...EMPLOYMENT_TYPES.map((type) => ({ value: type, label: type }))]} />
          
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectDropdown
            label="Gender"
            name="gender"
            value={formData.gender || ''}
            onChange={handleInputChange}
            options={[
            { value: '', label: 'Select Gender' },
            { value: 'MALE', label: 'Male' },
            { value: 'FEMALE', label: 'Female' }]
            } />
          
          <Input label="Date of Birth" name="dateOfBirth" type="date" value={formData.dateOfBirth || ''} onChange={handleInputChange} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Appointment Date" name="appointmentDate" type="date" value={formData.appointmentDate || ''} onChange={handleInputChange} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Emergency Contact Name"
            name="emergencyContactName"
            value={formData.emergencyContactName || ''}
            onChange={handleInputChange} />
          
          <Input
            label="Emergency Contact Phone"
            name="emergencyContactPhone"
            value={formData.emergencyContactPhone || ''}
            onChange={handleInputChange} />
          
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate(`/admin/officers/${id}`)} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" loading={saving} className="flex-1">
            Save Changes
          </Button>
        </div>
      </form>
    </div>);

}