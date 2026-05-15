import { Link } from 'react-router-dom';
import { CircleX } from 'lucide-react';
import Button from '../../components/common/Button';

const NotFound = () => {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-10rem)] w-full max-w-5xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="w-full max-w-xl border border-gray-200 bg-white p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center border border-danger-200 bg-danger-50 text-danger-700">
          <CircleX className="h-7 w-7" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Error 404</p>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">Page not found</h1>
        <p className="mt-2 text-sm text-gray-600">
          The page you requested does not exist or has been moved.
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <Link to="/">
            <Button>Go to Home</Button>
          </Link>
        </div>
      </div>
    </div>);

};

export default NotFound;