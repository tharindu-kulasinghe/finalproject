import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import {
  LayoutDashboard, FileText, Award, Package, Layers,
  Calculator, CreditCard, Tag, Percent, Activity, Settings,
  LogOut, X, Shield, Search, Inbox, History, Truck, Users, CircleUser, Phone } from
'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';

const navConfig = {
  ADMIN: [
  {
    section: 'Overview', items: [
    { name: 'Dashboard', path: '/admin/dashboard', icon: 'grid' }]

  },
  {
    section: 'Management', items: [
    { name: 'Excise Officers', path: '/admin/officers', icon: 'users' },
    { name: 'Manufacturers', path: '/admin/manufacturers', icon: 'truck' },
    { name: 'Retailers', path: '/admin/retailers', icon: 'users' },
    { name: 'Distributors', path: '/admin/distributors', icon: 'truck' }]

  },
  {
    section: 'Compliance', items: [
    { name: 'Licenses', path: '/admin/licenses', icon: 'award' },
    { name: 'Products', path: '/admin/products', icon: 'box' },
    { name: 'Batches', path: '/admin/batches', icon: 'layers' }]

  },
  {
    section: 'Finance', items: [
    { name: 'Duties', path: '/admin/duties', icon: 'calculator' },
    { name: 'Payments', path: '/admin/payments', icon: 'credit-card' }]

  },
  {
    section: 'Stamps', items: [
    { name: 'Stamp Requests', path: '/admin/stamp-requests', icon: 'package' },
    { name: 'Tax Stamps', path: '/admin/tax-stamps', icon: 'tag' }]

  },
  {
    section: 'System', items: [
    { name: 'Tax Rates', path: '/admin/tax-rates', icon: 'percent' },
    { name: 'Audit Logs', path: '/admin/audit-logs', icon: 'activity' },
    { name: 'Settings', path: '/admin/settings', icon: 'settings' }]

  }],

  ED_OFFICER: [
  {
    section: 'Overview', items: [
    { name: 'Dashboard', path: '/officer/dashboard', icon: 'grid' }]

  },
  {
    section: 'Management', items: [
    { name: 'Manufacturers', path: '/officer/manufacturers', icon: 'truck' },
    { name: 'Distributors', path: '/officer/distributors', icon: 'truck' },
    { name: 'Retailers', path: '/officer/retailers', icon: 'users' }]

  },
  {
    section: 'Compliance', items: [
    { name: 'Licenses', path: '/officer/licenses', icon: 'award' },
    { name: 'Batches', path: '/officer/batches', icon: 'layers' }]

  },
  {
    section: 'Finance', items: [
    { name: 'Duties', path: '/officer/duties', icon: 'calculator' },
    { name: 'Payments', path: '/officer/payments', icon: 'credit-card' }]

  },
  {
    section: 'Stamps', items: [
    { name: 'Stamp Requests', path: '/officer/stamp-requests', icon: 'package' },
    { name: 'Scan and Verify', path: '/officer/stamp-scanner', icon: 'search' },
    { name: 'Tax Stamps', path: '/officer/tax-stamps', icon: 'tag' },
    { name: 'Tax Rates', path: '/officer/tax-rates', icon: 'percent' }]

  },
  {
    section: 'Account', items: [
    { name: 'Settings', path: '/officer/settings', icon: 'settings' }]

  }],

  RETAILER: [
  {
    section: 'Overview', items: [
    { name: 'Dashboard', path: '/retail/dashboard', icon: 'grid' }]

  },
  {
    section: 'Business', items: [
    { name: 'My License', path: '/retail/my-license', icon: 'award' },
    { name: 'Apply New License', path: '/retail/apply-license', icon: 'file-text' },
    { name: 'Incoming Orders', path: '/retail/incoming-orders', icon: 'inbox' }]

  },
  {
    section: 'Tools', items: []

  },
  {
    section: 'Account', items: [
    { name: 'Settings', path: '/retail/settings', icon: 'settings' }]

  }],

  MANUFACTURER: [
  {
    section: 'Overview', items: [
    { name: 'Dashboard', path: '/manufacturer/dashboard', icon: 'grid' }]

  },
  {
    section: 'Compliance', items: [
    { name: 'My Licenses', path: '/manufacturer/my-licenses', icon: 'award' },
    { name: 'Apply New License', path: '/manufacturer/apply-license', icon: 'file-text' },
    { name: 'Products', path: '/manufacturer/products', icon: 'box' },
    { name: 'Batches', path: '/manufacturer/batches', icon: 'layers' }]

  },
  {
    section: 'Distribution', items: [
    { name: 'Distributors', path: '/manufacturer/distributors', icon: 'users' },
    { name: 'Distributions', path: '/manufacturer/distributions', icon: 'truck' },
    { name: 'Add Distribution', path: '/manufacturer/distributions/add', icon: 'truck' }]

  },
  {
    section: 'Finance', items: [
    { name: 'Payments', path: '/manufacturer/payments', icon: 'credit-card' }]

  },
  {
    section: 'Stamps', items: [
    { name: 'Stamp Requests', path: '/manufacturer/stamp-requests', icon: 'package' },
    { name: 'Tax Stamp History', path: '/manufacturer/tax-stamp-history', icon: 'tag' }]

  },
  {
    section: 'Account', items: [
    { name: 'Settings', path: '/manufacturer/settings', icon: 'settings' }]

  }],

  LICENSE_HOLDER: null,
  DISTRIBUTOR: [
  {
    section: 'Overview', items: [
    { name: 'Dashboard', path: '/distributor/dashboard', icon: 'grid' }]

  },
  {
    section: 'Licenses', items: [
    { name: 'My License', path: '/distributor/my-license', icon: 'file-text' },
    { name: 'Apply New License', path: '/distributor/apply-license', icon: 'file-text' }]

  },
  {
    section: 'Distribution', items: [
    { name: 'Incoming Orders', path: '/distributor/incoming-orders', icon: 'inbox' },
    { name: 'Create Distribution', path: '/distributor/create-distribution', icon: 'truck' },
    { name: 'Distribution History', path: '/distributor/distribution-history', icon: 'history' },
    { name: 'My Stock', path: '/distributor/stock', icon: 'layers' }]

  },
  {
    section: 'Account', items: [
    { name: 'Settings', path: '/distributor/settings', icon: 'settings' }]

  }]

};

const iconMap = {
  grid: LayoutDashboard,
  'file-text': FileText,
  award: Award,
  box: Package,
  layers: Layers,
  calculator: Calculator,
  'credit-card': CreditCard,
  package: Package,
  tag: Tag,
  percent: Percent,
  activity: Activity,
  settings: Settings,
  search: Search,
  inbox: Inbox,
  history: History,
  truck: Truck,
  users: Users,
  'circle-user': CircleUser
};

const NavIcon = ({ name, className }) => {
  const Icon = iconMap[name];
  return Icon ?
  <Icon className={className} focusable={false} aria-hidden /> :

  <Settings className={className} focusable={false} aria-hidden />;

};

const getProfileImageUrl = (url) => {
  if (!url) return '';

  if (url.startsWith('//')) return url;

  if (url.startsWith('data:') || url.startsWith('blob:')) return url;

  if (url.startsWith('http://') || url.startsWith('https://')) return url;

  if (window.location.hostname === 'localhost') {
    return `http://localhost:3000${url}`;
  }

  if (url.startsWith('/')) return url;

  return '/' + url;
};

const Sidebar = ({ isOpen, onClose }) => {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        return JSON.parse(storedUser);
      } catch (_) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        return null;
      }
    }
    return null;
  });
  const [showProfileModal, setShowProfileModal] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {

    const fetchCurrentUser = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const response = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const userData = await response.json();
          setUser(userData.data);
          localStorage.setItem('user', JSON.stringify(userData.data));
        }
      } catch (_) {
      void 0;
    }
    };
    fetchCurrentUser();
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const getNavSections = () => {
    if (!user || !user.role) return [];

    let config = navConfig[user.role];


    if (!config) {
      if (user.role === 'LICENSE_HOLDER') {
        config = navConfig.MANUFACTURER;
      } else {
        config = navConfig.MANUFACTURER || [];
      }
    }


    return Array.isArray(config) ? config : [];
  };

  const sections = getNavSections();
  const isActive = (path) => location.pathname === path;

  const getRoleBadge = () => {
    if (!user) return '';
    const roleMap = {
      ADMIN: 'Admin',
      ED_OFFICER: 'Officer',
      MANUFACTURER: 'Manufacturer',
      LICENSE_HOLDER: 'License Holder',
      DISTRIBUTOR: 'Distributor',
      RETAILER: 'Retailer'
    };
    return roleMap[user.role] || user.role;
  };

  return (
    <>
      {}
      {isOpen &&
      <div
        className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        onClick={onClose} />

      }

      {}
      <aside
        data-app-sidebar
        className={clsx(
          'fixed top-0 left-0 z-50 h-full w-64 transform border-r border-gray-300 bg-white transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}>
        
        <div className="flex flex-col h-full">
          {}
          <div className="flex items-center gap-1 px-5 h-16 border-b border-gray-100 shrink-0">
            <div className="w-10 flex items-center justify-center">
              <img src="/logo.png" alt="" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-gray-900 leading-tight">IECMS</h1>
              <p className="text-[10px] text-gray-400 leading-tight tracking-wide uppercase">Excise System</p>
            </div>
            {}
            <Button variant="ghost" size="sm" onClick={onClose} className="ml-auto lg:hidden text-gray-400 hover:text-gray-600 p-1">
              <X className="w-5 h-5" focusable={false} aria-hidden />
            </Button>
          </div>

          {}
          <nav className="flex-1 px-3 py-4 overflow-y-auto scrollbar-thin">
            {sections.map((section, idx) =>
            <div key={section.section} className={idx > 0 ? 'mt-6' : ''}>
                <p className="px-3 mb-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  {section.section}
                </p>
                <div className="space-y-0.5">
                  {section.items.map((link) =>
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={onClose}
                  className={clsx(
                    'flex items-center gap-3 py-2 text-[13px] font-medium transition-colors duration-150',
                    isActive(link.path) ?
                    'border-l-4 border-primary-600 bg-primary-50 pl-2 pr-3 text-primary-700' :
                    'px-3 text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}>
                  
                      <NavIcon
                    name={link.icon}
                    className={clsx(
                      'w-[18px] h-[18px] shrink-0',
                      isActive(link.path) ? 'text-primary-600' : 'text-gray-400'
                    )} />
                  
                      <span className="truncate">{link.name}</span>
                    </Link>
                )}
                </div>
              </div>
            )}
          </nav>

          {}
          <div className="p-3 border-t border-gray-100 shrink-0">
            <button
              type="button"
              onClick={() => setShowProfileModal(true)}
              className="w-full flex items-center gap-3 px-2 py-2 hover:bg-gray-50 transition-colors">
              
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden !rounded-full border border-primary-200 bg-primary-50">
                {user?.profileImage ?
                <img
                  src={getProfileImageUrl(user.profileImage)}
                  alt="Profile"
                  className="h-full w-full !rounded-full object-cover"
                  onError={(e) => {
                    console.error('Profile image failed to load:', user.profileImage);
                    e.target.style.display = 'none';
                  }} /> :

                user?.fullName ?
                <span className="text-sm font-semibold text-primary-700">
                    {user.fullName.charAt(0).toUpperCase()}
                  </span> :

                <span className="text-sm font-semibold text-primary-700">U</span>
                }
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.fullName || 'User'}</p>
                <p className="text-[11px] text-gray-500 truncate">{getRoleBadge()}</p>
              </div>
            </button>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="mt-1 w-full justify-center gap-2 text-gray-600 hover:bg-red-50 hover:text-red-600">
              
              <LogOut className="w-4 h-4" focusable={false} aria-hidden />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      <Modal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        title="Profile Details"
        size="sm">
        
        <div className="space-y-4">
          <div className="flex flex-col items-center">
            <div className="mb-3 flex h-20 w-20 items-center justify-center overflow-hidden !rounded-full border border-primary-200 bg-primary-50">
              {user?.profileImage ?
              <img
                src={getProfileImageUrl(user.profileImage)}
                alt="Profile"
                className="h-full w-full !rounded-full object-cover"
                onError={(e) => {e.target.style.display = 'none';}} /> :

              user?.fullName ?
              <span className="text-2xl font-semibold text-primary-700">
                  {user.fullName.charAt(0).toUpperCase()}
                </span> :

              <CircleUser className="w-10 h-10 text-primary-700" />
              }
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{user?.fullName}</h3>
            <p className="text-sm text-gray-500">{user?.role?.replace(/_/g, ' ')}</p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3 text-sm">
              <Settings className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">{user?.email}</span>
            </div>
            {user?.phone &&
            <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">{user.phone}</span>
              </div>
            }
            {user?.nic &&
            <div className="flex items-center gap-3 text-sm">
                <Shield className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">NIC: {user.nic}</span>
              </div>
            }
          </div>

           <div className="pt-4 flex gap-2">
             <Button
              variant='outline'
              size="sm"
              onClick={() => {
                setShowProfileModal(false);

                const roleMap = {
                  'ADMIN': '/admin/settings',
                  'ED_OFFICER': '/officer/settings',
                  'MANUFACTURER': '/manufacturer/settings',
                  'DISTRIBUTOR': '/distributor/settings',
                  'RETAILER': '/retail/settings'
                };
                navigate(roleMap[user?.role] || '/');
              }}
              className="flex-1 justify-center">
              
               Edit Profile
             </Button>
             <Button
              variant="danger"
              size="sm"
              onClick={() => {setShowProfileModal(false);logout();}}
              className="flex-1 justify-center">
              
               Sign Out
             </Button>
           </div>
        </div>
      </Modal>
    </>);

};

export default Sidebar;