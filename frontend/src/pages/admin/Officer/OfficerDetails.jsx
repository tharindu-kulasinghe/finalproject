import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import PageHeader from '../../../components/common/PageHeader';
import Badge from '../../../components/common/Badge';
import Button from '../../../components/common/Button';
import Modal from '../../../components/common/Modal';
import Input from '../../../components/common/Input';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import getStatusColor from '../../../utils/getStatusColor';
import officerApi from '../../../services/officerApi';
import { UserStatus } from '../../../constants/statusConstants';

const STATUS_OPTIONS = [
{ value: UserStatus.ACTIVE, label: 'Active' },
{ value: UserStatus.INACTIVE, label: 'Inactive' },
{ value: UserStatus.SUSPENDED, label: 'Suspended' },
{ value: UserStatus.PENDING, label: 'Pending' }];


const formatPosition = (value) => {
  if (!value) return '-';
  return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-LK', { year: 'numeric', month: 'long', day: 'numeric' });
};

export default function OfficerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [officer, setOfficer] = useState(null);
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const fetchOfficer = useCallback(async () => {
    setLoading(true);
    try {
      const response = await officerApi.getOfficerById(id);
      setOfficer(response?.data || null);
    } catch (error) {
      console.error('Error fetching officer:', error);
      toast.error(error.response?.data?.message || 'Failed to load officer details');
      setOfficer(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchActivitySummary = useCallback(async () => {
    try {
      const response = await officerApi.getOfficerActivitySummary(id);
      setActivity(response?.data || null);
    } catch (error) {
      console.error('Error fetching activity:', error);
      setActivity(null);
    }
  }, [id]);

  useEffect(() => {
    fetchOfficer();
    fetchActivitySummary();
  }, [fetchOfficer, fetchActivitySummary]);

  const handleStatusChange = async (newStatus) => {
    setStatusLoading(true);
    try {
      await officerApi.updateOfficerStatus(id, newStatus);
      setShowStatusModal(false);
      toast.success('Officer status updated');
      fetchOfficer();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(error.response?.data?.message || 'Error updating status');
    } finally {
      setStatusLoading(false);
    }
  };

  const handlePasswordReset = async (newPassword) => {
    setPasswordLoading(true);
    try {
      await officerApi.resetOfficerPassword(id, newPassword);
      setShowPasswordModal(false);
      toast.success('Password reset successfully');
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error(error.response?.data?.message || 'Error resetting password');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <LoadingSpinner />
      </div>);

  }

  if (!officer) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <p className="text-gray-500">Officer not found</p>
        <Link to="/admin/officers">
          <Button variant="outline">Back to Officers</Button>
        </Link>
      </div>);

  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={officer.fullName}
        description="Officer profile and account details"
        actions={
        <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate(`/admin/officers/${id}/edit`)}>Edit Officer</Button>
            <Button variant="outline" onClick={() => setShowStatusModal(true)}>Update Status</Button>
            <Button variant="secondary" onClick={() => setShowPasswordModal(true)}>Reset Password</Button>
            <Link to="/admin/officers">
              <Button variant="outline">Back</Button>
            </Link>
          </div>
        } />
      

      <div className="text-sm text-gray-500">
        <Link to="/admin/officers" className="hover:text-gray-700">Officers</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">Details</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="border border-gray-200 bg-white p-6">
            <div className="text-center">
              <div className="w-28 h-28 !rounded-full border border-primary-200 bg-primary-50 flex items-center justify-center mx-auto mb-4 overflow-hidden">
                {officer.profileImage ?
                <img src={officer.profileImage} alt="" className="h-full w-full !rounded-full object-cover" /> :

                <span className="text-3xl font-semibold text-primary-700">
                    {officer.fullName?.split(' ').map((name) => name[0]).join('').toUpperCase().slice(0, 2)}
                  </span>
                }
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mt-4">{officer.fullName}</h2>
              <p className="text-sm text-gray-500 mt-1">{formatPosition(officer.position)}</p>
              <div className="mt-3">
                <Badge variant={getStatusColor(officer.status)}>{officer.status || UserStatus.PENDING}</Badge>
              </div>
            </div>
          </div>

          {activity &&
          <div className="border border-gray-200 bg-white p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Activity Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Recent Logins</span>
                  <span className="text-sm font-semibold text-gray-900">{activity.recentLogins || 0}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Applications Reviewed</span>
                  <span className="text-sm font-semibold text-gray-900">{activity.applicationsReviewed || 0}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Payments Verified</span>
                  <span className="text-sm font-semibold text-gray-900">{activity.paymentsVerified || 0}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-sm text-gray-600">Batches Verified</span>
                  <span className="text-sm font-semibold text-gray-900">{activity.batchesVerified || 0}</span>
                </div>
              </div>
            </div>
          }
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Official Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-gray-500">Employee Number</p><p className="text-sm font-medium">{officer.employeeNo || '-'}</p></div>
              <div><p className="text-xs text-gray-500">NIC</p><p className="text-sm font-medium">{officer.nic || '-'}</p></div>
              <div><p className="text-xs text-gray-500">Position</p><p className="text-sm font-medium">{formatPosition(officer.position)}</p></div>
              <div><p className="text-xs text-gray-500">Department</p><p className="text-sm font-medium">{officer.department || '-'}</p></div>
              <div><p className="text-xs text-gray-500">Office Name</p><p className="text-sm font-medium">{officer.officeName || '-'}</p></div>
              <div><p className="text-xs text-gray-500">District</p><p className="text-sm font-medium">{officer.district || '-'}</p></div>
              <div><p className="text-xs text-gray-500">Province</p><p className="text-sm font-medium">{officer.province || '-'}</p></div>
              <div><p className="text-xs text-gray-500">Employment Type</p><p className="text-sm font-medium">{officer.employmentType || '-'}</p></div>
              <div><p className="text-xs text-gray-500">Appointment Date</p><p className="text-sm font-medium">{formatDate(officer.appointmentDate)}</p></div>
            </div>
          </div>

          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Contact Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-gray-500">Email</p><p className="text-sm font-medium">{officer.email}</p></div>
              <div><p className="text-xs text-gray-500">Mobile</p><p className="text-sm font-medium">{officer.mobile || '-'}</p></div>
              <div><p className="text-xs text-gray-500">Official Email</p><p className="text-sm font-medium">{officer.officialEmail || '-'}</p></div>
              <div><p className="text-xs text-gray-500">Official Phone</p><p className="text-sm font-medium">{officer.officialPhone || '-'}</p></div>
              <div className="col-span-2"><p className="text-xs text-gray-500">Address</p><p className="text-sm font-medium">{officer.address || '-'}</p></div>
            </div>
          </div>

          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Personal Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-gray-500">Gender</p><p className="text-sm font-medium">{officer.gender || '-'}</p></div>
              <div><p className="text-xs text-gray-500">Date of Birth</p><p className="text-sm font-medium">{formatDate(officer.dateOfBirth)}</p></div>
              <div><p className="text-xs text-gray-500">Emergency Contact Name</p><p className="text-sm font-medium">{officer.emergencyContactName || '-'}</p></div>
              <div><p className="text-xs text-gray-500">Emergency Contact Phone</p><p className="text-sm font-medium">{officer.emergencyContactPhone || '-'}</p></div>
              <div className="col-span-2"><p className="text-xs text-gray-500">Notes</p><p className="text-sm font-medium">{officer.notes || '-'}</p></div>
            </div>
          </div>

          <div className="border border-gray-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Account Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-gray-500">System Role</p><p className="text-sm font-medium">{officer.role}</p></div>
              <div><p className="text-xs text-gray-500">Account Status</p><Badge variant={getStatusColor(officer.status)}>{officer.status || UserStatus.PENDING}</Badge></div>
              <div><p className="text-xs text-gray-500">Created At</p><p className="text-sm font-medium">{formatDate(officer.createdAt)}</p></div>
              <div><p className="text-xs text-gray-500">Last Updated</p><p className="text-sm font-medium">{formatDate(officer.updatedAt)}</p></div>
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={showStatusModal} onClose={() => setShowStatusModal(false)} title="Change Status" size="md">
        <p className="text-sm text-gray-600 mb-4">Select new status for {officer.fullName}</p>
        <div className="space-y-2">
          {STATUS_OPTIONS.map((status) =>
          <Button
            key={status.value}
            variant={officer.status === status.value ? 'primary' : 'outline'}
            onClick={() => handleStatusChange(status.value)}
            className="w-full justify-center"
            loading={statusLoading}>
            
              {status.label}
            </Button>
          )}
        </div>
      </Modal>

      <Modal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} title="Reset Password" size="md">
        <form onSubmit={(e) => {e.preventDefault();handlePasswordReset(e.target.newPassword.value);}} className="space-y-4">
          <Input label="New Password" name="newPassword" type="password" required minLength={6} />
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => setShowPasswordModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" loading={passwordLoading} className="flex-1">Reset Password</Button>
          </div>
        </form>
      </Modal>
    </div>);

}