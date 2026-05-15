import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import PageHeader from '../../../components/common/PageHeader';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import SelectDropdown from '../../../components/common/SelectDropdown';
import Textarea from '../../../components/common/Textarea';
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


const STATUS_OPTIONS = [
{ value: 'ACTIVE', label: 'Active' },
{ value: 'INACTIVE', label: 'Inactive' },
{ value: 'SUSPENDED', label: 'Suspended' },
{ value: 'PENDING', label: 'Pending' }];


const EMPLOYMENT_TYPE_OPTIONS = [
{ value: 'PERMANENT', label: 'Permanent' },
{ value: 'CONTRACT', label: 'Contract' },
{ value: 'TEMPORARY', label: 'Temporary' },
{ value: 'PROBATION', label: 'Probation' }];


const GENDER_OPTIONS = [
{ value: 'MALE', label: 'Male' },
{ value: 'FEMALE', label: 'Female' },
{ value: 'OTHER', label: 'Other' }];


const PROVINCE_OPTIONS = [
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


const ROLE_OPTIONS = [
{ value: 'ED_OFFICER', label: 'Excise Officer' },
{ value: 'ADMIN', label: 'Admin' }];


const formatPosition = (pos) => {
  if (!pos) return '-';
  return pos.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
};

const AddOfficer = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobile: '',
    password: '',
    employeeNo: '',
    nic: '',
    position: '',
    department: '',
    officeName: '',
    district: '',
    province: '',
    appointmentDate: '',
    employmentType: '',
    gender: '',
    dateOfBirth: '',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    officialEmail: '',
    officialPhone: '',
    notes: '',
    status: 'PENDING',
    role: 'ED_OFFICER'
  });

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';else
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (!formData.password) newErrors.password = 'Password is required';else
    if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (!formData.employeeNo.trim()) newErrors.employeeNo = 'Employee number is required';
    if (!formData.position) newErrors.position = 'Position is required';
    if (!formData.officeName.trim()) newErrors.officeName = 'Office name is required';

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
      const payload = {
        fullName: formData.fullName,
        email: formData.email,
        mobile: formData.mobile,
        password: formData.password,
        employeeNo: formData.employeeNo,
        nic: formData.nic,
        position: formData.position,
        department: formData.department,
        officeName: formData.officeName,
        district: formData.district,
        province: formData.province,
        appointmentDate: formData.appointmentDate,
        employmentType: formData.employmentType,
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth,
        address: formData.address,
        emergencyContactName: formData.emergencyContactName,
        emergencyContactPhone: formData.emergencyContactPhone,
        officialEmail: formData.officialEmail,
        officialPhone: formData.officialPhone,
        notes: formData.notes,
        status: formData.status,
        role: formData.role
      };

      await officerApi.createOfficer(payload);

      toast.success('Officer created successfully');

      navigate('/admin/officers');

    } catch (error) {
      console.error('Failed to create officer:', error);
      const errorMsg = error.response?.data?.message || 'Failed to create officer. Please try again.';
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
      employeeNo: '',
      nic: '',
      position: '',
      department: '',
      officeName: '',
      district: '',
      province: '',
      appointmentDate: '',
      employmentType: '',
      gender: '',
      dateOfBirth: '',
      address: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      officialEmail: '',
      officialPhone: '',
      notes: '',
      status: 'PENDING',
      role: 'ED_OFFICER'
    });
    setErrors({});
    setSubmitError('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Officer"
        description="Create excise department officer account"
        actions={
        <Link to="/admin/officers">
            <Button variant="outline">Back to Officers</Button>
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
            <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
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
                label="NIC"
                name="nic"
                value={formData.nic}
                onChange={(e) => setFormData({ ...formData, nic: e.target.value })}
                placeholder="Enter NIC number" />
              
              <SelectDropdown
                label="Gender"
                name="gender"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                options={[{ value: '', label: 'Select gender' }, ...GENDER_OPTIONS]} />
              
              <Input
                label="Date of Birth"
                name="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} />
              
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Employment Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Employee No *"
                name="employeeNo"
                value={formData.employeeNo}
                onChange={(e) => setFormData({ ...formData, employeeNo: e.target.value })}
                placeholder="Enter employee number"
                error={errors.employeeNo}
                required />
              
              <SelectDropdown
                label="Position *"
                name="position"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                options={[{ value: '', label: 'Select position' }, ...POSITIONS.map((p) => ({ value: p, label: formatPosition(p) }))]}
                error={errors.position}
                required />
              
              <Input
                label="Department"
                name="department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="Enter department" />
              
              <Input
                label="Office Name *"
                name="officeName"
                value={formData.officeName}
                onChange={(e) => setFormData({ ...formData, officeName: e.target.value })}
                placeholder="Enter office name"
                error={errors.officeName}
                required />
              
              <SelectDropdown
                label="Employment Type"
                name="employmentType"
                value={formData.employmentType}
                onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                options={[{ value: '', label: 'Select employment type' }, ...EMPLOYMENT_TYPE_OPTIONS]} />
              
              <Input
                label="Appointment Date"
                name="appointmentDate"
                type="date"
                value={formData.appointmentDate}
                onChange={(e) => setFormData({ ...formData, appointmentDate: e.target.value })} />
              
              <SelectDropdown
                label="Account Status"
                name="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                options={STATUS_OPTIONS} />
              
              <SelectDropdown
                label="Role"
                name="role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                options={ROLE_OPTIONS} />
              
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
                  options={PROVINCE_OPTIONS} />
                
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Official Email"
                name="officialEmail"
                type="email"
                value={formData.officialEmail}
                onChange={(e) => setFormData({ ...formData, officialEmail: e.target.value })}
                placeholder="Enter official email" />
              
              <Input
                label="Official Phone"
                name="officialPhone"
                value={formData.officialPhone}
                onChange={(e) => setFormData({ ...formData, officialPhone: e.target.value })}
                placeholder="Enter official phone" />
              
              <Input
                label="Emergency Contact Name"
                name="emergencyContactName"
                value={formData.emergencyContactName}
                onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                placeholder="Enter emergency contact name" />
              
              <Input
                label="Emergency Contact Phone"
                name="emergencyContactPhone"
                value={formData.emergencyContactPhone}
                onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                placeholder="Enter emergency contact phone" />
              
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h3>
            <div className="space-y-4">
              <Textarea
                label="Notes"
                name="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Enter any additional notes or comments"
                rows={3} />
              
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
                
                Save Officer
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>);

};

export default AddOfficer;