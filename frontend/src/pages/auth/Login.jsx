import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, BadgeCheck } from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import authApi from '../../services/authApi';
import { UserStatus } from '../../constants/statusConstants';

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ email: '', password: '' });



  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await authApi.login(formData);
      const { user, token } = res.data?.data || {};

      if (!user || !token) throw new Error('Invalid server response');

      if (user.status && user.status !== UserStatus.ACTIVE) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        throw new Error(`Account is ${user.status}. Please contact administrator.`);
      }


      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      const redirect = {
        ADMIN: '/admin/dashboard',
        ED_OFFICER: '/officer/dashboard',
        MANUFACTURER: '/manufacturer/dashboard',
        LICENSE_HOLDER: '/manufacturer/dashboard',
        DISTRIBUTOR: '/distributor/dashboard',
        RETAILER: '/retail/dashboard'
      };
      navigate(redirect[user.role] || '/login', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const set = (field) => (e) => setFormData((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-[420px]">

        {}
        <div className="border border-gray-200 bg-white p-8">

          {}
          <div className="mb-8">
             <div className="mb-5 flex h-12 w-12 items-center justify-center border border-primary-700 bg-primary-700 text-white">
              <BadgeCheck className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 leading-tight">Welcome back</h2>
            <p className="mt-1.5 text-sm text-gray-500">Sign in to continue</p>
          </div>

          {}
          {error &&
          <div className="mb-5 flex items-start gap-3 p-3.5 bg-red-50 border border-red-200  text-sm text-red-600">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          }

          {}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              value={formData.email}
              onChange={set('email')}
              placeholder="you@company.com"
              required
              autoComplete="email" />
            

            <Input
              label="Password"
              type="password"
              value={formData.password}
              onChange={set('password')}
              placeholder="••••••••"
              required
              autoComplete="current-password" />
            

            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer group">
                 <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:outline-none" />
                
                <span className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
              Sign in
            </Button>
          </form>

          {}
          <p className="mt-6 text-center text-sm text-gray-500">
            Need an account? Contact system administration.
          </p>
        </div>

        {}
        <p className="mt-6 text-center text-sm text-gray-400">
          Need to verify a stamp?{' '}
          <Link to="/verify" className="text-gray-600 hover:text-gray-800 font-medium underline underline-offset-2">
            Verify without login
          </Link>
        </p>

      </div>
    </div>);

};

export default Login;