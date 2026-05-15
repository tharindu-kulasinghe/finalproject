import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const PublicLayout = () => {
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { to: '/verify', label: 'Verify Stamp', active: () => isActive('/verify') },
    { to: '/login', label: 'Sign In', active: () => isActive('/login') }
  ];

  const closeMobileNav = () => setMobileNavOpen(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <header className="sticky top-0 z-50 border-b border-gray-300 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2 sm:px-6 sm:py-0 lg:px-8 min-h-[3.5rem] sm:h-16 sm:min-h-0">
          <Link
            to="/"
            onClick={closeMobileNav}
            className="flex min-w-0 flex-1 items-center gap-2 group sm:flex-initial sm:gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center sm:h-12 sm:w-12">
              <img src="/logo.png" alt="" className="max-h-full max-w-full object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-gray-900 leading-tight sm:text-lg">IECMS</h1>
              <p className="hidden truncate text-[11px] text-gray-500 leading-tight sm:block">
                Excise Compliance System
              </p>
            </div>
          </Link>

          <nav
            className="hidden items-center gap-1 md:flex md:gap-2"
            aria-label="Main">
            {navLinks.map(({ to, label, active }) =>
              <Link
                key={to}
                to={to}
                className={`whitespace-nowrap rounded px-3 py-2 text-sm font-medium transition-colors ${active() ?
                'text-primary-700 bg-primary-50' :
                'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`
                }>
                {label}
              </Link>
            )}
          </nav>

          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-gray-200 text-gray-700 hover:bg-gray-50 md:hidden"
            aria-expanded={mobileNavOpen}
            aria-controls="public-mobile-nav"
            aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileNavOpen((o) => !o)}>
            {mobileNavOpen ?
              <X className="h-5 w-5" aria-hidden /> :
              <Menu className="h-5 w-5" aria-hidden />}
          </button>
        </div>

        {mobileNavOpen ? (
          <div className="border-t border-gray-200 bg-white px-3 py-3 md:hidden" id="public-mobile-nav">
            <nav className="flex flex-col gap-1" aria-label="Main mobile">
              {navLinks.map(({ to, label, active }) =>
                <Link
                  key={to}
                  to={to}
                  onClick={closeMobileNav}
                  className={`rounded px-3 py-3 text-sm font-medium ${active() ?
                  'bg-primary-50 text-primary-700' :
                  'text-gray-700 hover:bg-gray-50'}`
                  }>
                  {label}
                </Link>
              )}
            </nav>
          </div>
        ) : null}
      </header>

      <main className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </main>

      <footer className="border-t border-gray-300 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
          <p className="text-center text-xs text-gray-500 sm:text-sm">
            &copy; {new Date().getFullYear()} Arumadura Kulasinghe
          </p>
        </div>
      </footer>
    </div>);

};

export default PublicLayout;
