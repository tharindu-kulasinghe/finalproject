import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import authApi from '../../services/authApi';

const Settings = () => {
  const [user, setUser] = useState(null);

  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    mobile: ''
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setProfileData({
          fullName: userData.fullName || '',
          email: userData.email || '',
          mobile: userData.mobile || ''
        });
      } catch (_) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
  }, []);

  const [profileLoading, setProfileLoading] = useState(false);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      const res = await authApi.updateProfile(profileData);
      const updatedUser = res.data?.data?.user || { ...user, ...profileData };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      toast.success('Profile updated successfully');
    } catch (err) {
      const msg =
      err.response?.status === 404 ?
      'Profile update not available. Contact admin to enable this feature.' :
      err.response?.data?.message || 'Failed to update profile';
      toast.error(msg);
    } finally {
      setProfileLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your account and preferences" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border border-gray-200 bg-white p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-1">Profile Information</h3>
          <p className="text-sm text-gray-500 mb-5">Update your personal details.</p>

          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <Input
              label="Full Name"
              value={profileData.fullName}
              onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
              required />
            
            <Input
              label="Email"
              type="email"
              value={profileData.email}
              onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
              required />
            
            <Input
              label="Mobile"
              type="tel"
              value={profileData.mobile}
              onChange={(e) => setProfileData({ ...profileData, mobile: e.target.value })} />
            
            <div className="flex justify-end">
              <Button type="submit" loading={profileLoading}>Save Changes</Button>
            </div>
          </form>
        </div>

        <div className="border border-gray-200 bg-white p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-1">Account Information</h3>
          <p className="text-sm text-gray-500 mb-4">Your account details.</p>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50">
              <p className="text-xs text-gray-500">Role</p>
              <p className="text-sm font-medium text-gray-900">{user?.role}</p>
            </div>
            <div className="p-3 bg-gray-50">
              <p className="text-xs text-gray-500">Account ID</p>
              <p className="text-sm font-mono text-gray-900">{user?.id || '-'}</p>
            </div>
            <div className="p-3 bg-gray-50">
              <p className="text-xs text-gray-500">Company</p>
              <p className="text-sm font-medium text-gray-900">{user?.companyName || '-'}</p>
            </div>
            <div className="p-3 bg-gray-50">
              <p className="text-xs text-gray-500">Status</p>
              <p className="text-sm font-medium text-gray-900 capitalize">{user?.status?.toLowerCase() || 'active'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>);

};

export default Settings;