import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import clsx from 'clsx';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      setSidebarOpen(desktop);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMenuClick = () => {
    setSidebarOpen((prev) => !prev);
  };

  const handleSidebarClose = () => {
    if (isDesktop) {
      setSidebarOpen(true);
    } else {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={handleSidebarClose} />
      

      <div className={clsx('flex min-h-screen flex-col transition-all duration-300', sidebarOpen ? 'lg:pl-64' : 'lg:pl-0')}>
        <Topbar onMenuClick={handleMenuClick} />

        <main className="flex-1 p-4 md:p-6">
          <div className="mx-auto animate-fade-in">
            <Outlet />
          </div>
        </main>

        <footer className="border-t border-gray-200 bg-white px-4 py-3 md:px-6">
          <p className="text-center text-xs text-gray-500 sm:text-sm">
            &copy; {new Date().getFullYear()} Arumadura Kulasinghe
          </p>
        </footer>
      </div>
    </div>);

};

export default DashboardLayout;