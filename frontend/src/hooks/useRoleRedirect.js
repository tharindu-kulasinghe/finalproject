import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';




const useRoleRedirect = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const roleRoutes = {
      ADMIN: '/admin/dashboard',
      ED_OFFICER: '/officer/dashboard',
      MANUFACTURER: '/manufacturer/dashboard',
      LICENSE_HOLDER: '/manufacturer/dashboard',
      DISTRIBUTOR: '/distributor/dashboard',
      RETAILER: '/retail/dashboard'
    };

    const target = roleRoutes[user.role];
    if (target) navigate(target, { replace: true });
  }, [user, isAuthenticated, navigate]);
};

export default useRoleRedirect;