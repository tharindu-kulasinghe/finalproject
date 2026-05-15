import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Bell, ChevronDown, Settings, LogOut, CircleUser, Mail, Phone, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../common/Modal';
import Button from '../common/Button';
import notificationApi from '../../services/notificationApi';
import { formatRelativeTime } from '../../utils/formatDate';

const getProfileImageUrl = (url) => {
  if (!url) return '';

  if (url.startsWith('//')) return url;

  if (url.startsWith('data:') || url.startsWith('blob:')) return url;

  if (url.startsWith('http://') || url.startsWith('https://')) return url;

  if (url.startsWith('/')) return url;

  return '/' + url;
};

const getWsUrl = (token) => {
  const explicit = import.meta.env.VITE_WS_URL;
  if (explicit && String(explicit).trim()) {
    const u = String(explicit).trim().replace(/\/?$/, '');
    return `${u}?token=${encodeURIComponent(token)}`;
  }
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const isDev = Boolean(import.meta.env.DEV);
  const configuredPort = String(import.meta.env.VITE_WS_PORT || '').trim();
  const fallbackPort = configuredPort || '3000';
  const hostname = window.location.hostname;
  const host = isDev ? `${hostname}:${fallbackPort}` : window.location.host;
  const base = `${proto}//${host}/ws`;
  return `${base}?token=${encodeURIComponent(token)}`;
};

const Topbar = ({ onMenuClick }) => {
  const [user, _setUser] = useState(() => {
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
  const location = useLocation();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const menuRef = useRef(null);
  const notifRef = useRef(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const wsRef = useRef(null);
  const connectTimerRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const mountedRef = useRef(false);




  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await notificationApi.list({ limit: 30 });
      if (!mountedRef.current) return;
      setNotifications(res.data?.data?.notifications || []);
    } catch (_) {
      void 0;
    }
  }, []);

  const connectWs = useCallback(function connect() {
    if (!mountedRef.current) return;
    const token = localStorage.getItem('token');
    if (!token) return;


    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const ws = new WebSocket(getWsUrl(token));
      wsRef.current = ws;

      ws.onmessage = (ev) => {
        if (!mountedRef.current) return;
        try {
          const msg = JSON.parse(ev.data);
          if (msg?.type === 'NOTIFICATION' && msg?.data) {
            const n = msg.data;
            setNotifications((prev) => {
              if (prev.some((x) => x.id === n.id)) return prev;
              return [n, ...prev].slice(0, 50);
            });
            toast.success(n.title || 'New notification');
          }
        } catch (_) {
      void 0;
    }
      };

      ws.onclose = () => {
        if (wsRef.current !== ws) return;
        wsRef.current = null;
        if (!mountedRef.current) return;
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      ws.onerror = () => {
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.close();
          } catch (_) {
      void 0;
    }
        }
      };
    } catch (_) {
      void 0;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connectTimerRef.current = setTimeout(() => {
      fetchNotifications();
      connectWs();
    }, 120);
    return () => {
      mountedRef.current = false;
      if (connectTimerRef.current) clearTimeout(connectTimerRef.current);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch (_) {
      void 0;
    }
        wsRef.current = null;
      }
    };
  }, [connectWs, fetchNotifications]);

  useEffect(() => {
    const resume = () => {
      if (document.visibilityState !== 'visible') return;
      if (!mountedRef.current) return;
      if (!localStorage.getItem('token')) return;
      const s = wsRef.current?.readyState;
      if (s === WebSocket.CLOSED || s === WebSocket.CLOSING || wsRef.current == null) {
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = setTimeout(() => connectWs(), 200);
      }
    };
    const onOnline = () => resume();
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('online', onOnline);
    window.addEventListener('pageshow', resume);
    return () => {
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('pageshow', resume);
    };
  }, [connectWs]);

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, readAt: n.readAt || new Date().toISOString() })));
    } catch (_) {
      toast.error('Failed to mark all as read');
    }
  };

  const handleOpenNotification = async (notif) => {
    if (!notif) return;
    if (!notif.isRead) {
      try {
        await notificationApi.markRead(notif.id);
        setNotifications((prev) => prev.map((n) => n.id === notif.id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n));
      } catch (_) {
      void 0;
    }
    }
    setShowNotifications(false);
    if (notif.link) navigate(notif.link);
  };

  const getPageTitle = () => {
    const path = location.pathname;
    const segments = path.split('/').filter(Boolean);
    const pageNames = {
      'dashboard': 'Dashboard',
      'license-applications': 'License Applications',
      'licenses': 'Licenses',
      'my-licenses': 'My Licenses',
      'products': 'Products',
      'batches': 'Production Batches',
      'duties': 'Duty Assessments',
      'payments': 'Payments',
      'stamp-requests': 'Stamp Requests',
      'tax-stamps': 'Tax Stamps',
      'tax-stamp-history': 'Tax Stamp History',
      'tax-rates': 'Tax Rates',
      'audit-logs': 'Audit Logs',
      'settings': 'Settings',
      'incoming-orders': 'Incoming Orders',
      'distribution-history': 'Distribution History',
      'my-license': 'My License',
      'apply-license': 'Apply New License',
      'officers': 'Excise Officers',
      'officer-details': 'Officer Details'
    };
    return segments.length >= 2 ? pageNames[segments[1]] || 'Dashboard' : 'Dashboard';
  };



  const getSettingsPath = () => {
    const prefix = location.pathname.split('/')[1];
    if (prefix === 'admin') return '/admin/settings';
    if (prefix === 'officer') return '/officer/settings';
    if (prefix === 'manufacturer') return '/manufacturer/settings';
    if (prefix === 'distributor') return '/distributor/settings';
    return '#';
  };

  const handleLogout = () => {
    setShowUserMenu(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 border-b border-gray-300 bg-white">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {}
        <div className="flex items-center gap-2">
          {}
          <button
            onClick={onMenuClick}
            className="p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            aria-label="Open menu">
            
            <Menu className="w-5 h-5" />
          </button>

          {}
          <div className="ml-2 hidden items-center gap-2 lg:flex">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-900">{getPageTitle()}</h2>
            </div>
          </div>
        </div>

        {}
        <div className="flex items-center gap-1">
          {}
          <div className="md:relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors">
              
              <Bell className="w-5 h-5" />
              {unreadCount > 0 &&
              <span className="absolute right-1.5 top-1.5 h-2 w-2 bg-primary-600 ring-1 ring-white" />
              }
            </button>
            {showNotifications &&
            <div className="absolute right-0 z-50 mt-2 w-72 border border-gray-300 bg-white py-1">
                <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">Notifications</p>
                  {unreadCount > 0 &&
                <span className="text-xs text-primary-600">{unreadCount} new</span>
                }
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length > 0 ?
                notifications.map((notif) =>
                <button
                  type="button"
                  key={notif.id}
                  onClick={() => handleOpenNotification(notif)}
                  className={`block w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 ${!notif.isRead ? 'bg-primary-50/50' : ''}`}>
                  
                        <p className="text-sm font-medium text-gray-900">{notif.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{notif.message}</p>
                        <p className="text-xs text-gray-400 mt-1">{formatRelativeTime(notif.createdAt)}</p>
                      </button>
                ) :

                <div className="px-4 py-6 text-center text-sm text-gray-400">No notifications</div>
                }
                </div>
                <div className="px-4 py-2 border-t border-gray-100">
                  <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllRead}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium p-0">
                  
                    Mark all as read
                  </Button>
                </div>
              </div>
            }
          </div>

          {}
          <div className="md:relative" ref={menuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2.5 p-1.5 hover:bg-gray-100 transition-colors">
              
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden !rounded-full border border-primary-200 bg-primary-50">
                {user?.profileImage ?
                <img
                  src={getProfileImageUrl(user.profileImage)}
                  alt="Profile"
                  className="h-full w-full !rounded-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }} /> :

                user?.fullName ?
                <span className="text-sm font-semibold text-primary-700">
                    {user.fullName.charAt(0).toUpperCase()}
                  </span> :

                <CircleUser className="w-5 h-5 text-primary-700" />
                }
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-700 leading-tight">{user?.fullName || 'User'}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {}
            {showUserMenu &&
            <div className="absolute right-0 z-50 mt-2 w-56 border border-gray-300 bg-white py-1">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">{user?.fullName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{user?.email}</p>
                </div>
                <div className="py-1">
                  <button
                  onClick={() => {setShowUserMenu(false);setShowProfileModal(true);}}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  
                    <CircleUser className="w-4 h-4 text-gray-400" />
                    Profile
                  </button>
                  <Link
                  to={getSettingsPath()}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={() => setShowUserMenu(false)}>
                  
                    <Settings className="w-4 h-4 text-gray-400" />
                    Settings
                  </Link>
                </div>
                <div className="border-t border-gray-100 py-1">
                  <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                  
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      </div>

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
              <Mail className="w-4 h-4 text-gray-400" />
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
              onClick={() => {setShowProfileModal(false);handleLogout();}}
              className="flex-1 justify-center">
              
               Sign Out
             </Button>
           </div>
        </div>
      </Modal>
    </header>);

};

export default Topbar;