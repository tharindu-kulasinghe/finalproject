import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import authApi from '../../services/authApi';

const Settings = () => {
  const [user, setUser] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    mobile: '',
    companyName: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
      } catch (_) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
  }, []);

  useEffect(() => {
    if (user) {
      setProfileData({
        fullName: user.fullName || '',
        email: user.email || '',
        mobile: user.mobile || '',
        companyName: user.companyName || ''
      });
    }
  }, [user]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      const res = await authApi.updateProfile(profileData);
      const updatedUser = res.data?.data?.user || res.data?.data || { ...user, ...profileData };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      toast.success('Profile updated successfully.');
    } catch (err) {
      const msg =
      err.response?.status === 404 ?
      'Profile update not available. Contact admin to enable this feature.' :
      err.response?.data?.message || 'Failed to update profile.';
      toast.error(msg);
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }

    setPasswordLoading(true);
    try {
      await authApi.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      toast.success('Password changed successfully.');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Account Settings"
        description="Manage your profile information and security settings." />
      

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {}
        <div className="border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Profile Information</h3>
          <p className="text-sm text-gray-500 mb-6">Update your account details.</p>

          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <Input
              label="Full Name"
              value={profileData.fullName}
              onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
              placeholder="Enter your full name"
              required />
            
            <Input
              label="Email Address"
              type="email"
              value={profileData.email}
              onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
              placeholder="Enter your email"
              required />
            
            <Input
              label="Mobile Number"
              value={profileData.mobile}
              onChange={(e) => setProfileData({ ...profileData, mobile: e.target.value })}
              placeholder="Enter your mobile number" />
            
            <Input
              label="Company Name"
              value={profileData.companyName}
              onChange={(e) => setProfileData({ ...profileData, companyName: e.target.value })}
              placeholder="Enter your company name" />
            
            <div className="pt-2">
              <Button
                type="submit"
                loading={profileLoading}
                disabled={profileLoading}>
                
                Update Profile
              </Button>
            </div>
          </form>
        </div>

        {}
        <div className="border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Change Password</h3>
          <p className="text-sm text-gray-500 mb-6">Ensure your account uses a strong password.</p>

           {passwordError &&
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-sm text-red-600">
              {passwordError}
            </div>
          }
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
              placeholder="Enter current password"
              required />
            
            <Input
              label="New Password"
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              placeholder="Enter new password"
              required />
            
            <Input
              label="Confirm New Password"
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              placeholder="Confirm new password"
              required />
            
            <div className="pt-2">
              <Button
                type="submit"
                loading={passwordLoading}
                disabled={passwordLoading}>
                
                Change Password
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>);

};

export default Settings;