import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, AlertCircle } from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import authApi from '../../services/authApi';

const ForgotPassword = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authApi.forgotPassword({ email });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-[420px]">
          <div className="bg-white shadow-lg p-8 border border-gray-100">
            <div className="text-center mb-6">
               <div className="w-12 h-12 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
                 <Mail className="w-6 h-6 text-success-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Check your email</h2>
              <p className="mt-2 text-sm text-gray-500">
                We've sent a password reset link to <span className="font-medium text-gray-700">{email}</span>
              </p>
            </div>
            <div className="space-y-3">
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
                
                <ArrowLeft className="w-4 h-4" />
                Back to login
              </Link>
            </div>
          </div>
        </div>
      </div>);

  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-[420px]">
        <div className="bg-white shadow-lg p-8 border border-gray-100">
          <div className="mb-6">
             <div className="w-12 h-12 border border-primary-700 bg-primary-700 flex items-center justify-center mb-5 shadow-md shadow-primary-600/20">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 leading-tight">Forgot password?</h2>
            <p className="mt-1.5 text-sm text-gray-500">No worries, we'll send you reset instructions.</p>
          </div>

          {error &&
          <div className="mb-5 flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </div>
          }

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              autoComplete="email" />
            

            <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
              Send reset link
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/login" className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>);

};

export default ForgotPassword;