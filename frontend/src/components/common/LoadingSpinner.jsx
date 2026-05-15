import { useId } from 'react';
import clsx from 'clsx';


const LoadingSpinner = ({ size = 'md', className = '', text, inline = false }) => {
  const labelId = useId();

  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  const ring =
  <svg
    className={clsx('shrink-0 animate-spin text-primary-600', sizes[size])}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden>
    
      <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      fill="none"
      stroke="currentColor"
      strokeWidth="4" />
    
      <path
      className="opacity-90"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    
    </svg>;


  if (inline) {
    return (
      <span
        className={clsx('inline-flex items-center justify-center', className)}
        role="status"
        aria-label="Loading">
        
        {ring}
      </span>);

  }

  return (
    <div
      className={clsx('flex flex-col items-center justify-center gap-3', className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-labelledby={text ? labelId : undefined}
      aria-label={text ? undefined : 'Loading'}>
      
      {ring}
      {text &&
      <p id={labelId} className="text-sm text-gray-500">
          {text}
        </p>
      }
    </div>);

};

export default LoadingSpinner;