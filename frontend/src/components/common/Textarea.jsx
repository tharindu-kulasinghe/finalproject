import React from 'react';
import clsx from 'clsx';

const Textarea = ({
  label,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className={className}>
      {label &&
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      }
      <textarea
        className={clsx(
          'w-full px-3 py-2.5 border  transition-all duration-200 resize-none',
          'focus:outline-none',
          error ?
          'border-danger-500' :
          'border-gray-300 hover:border-gray-400'
        )}
        rows={4}
        {...props} />
      
      {error &&
      <p className="mt-1.5 text-sm text-danger-600">{error}</p>
      }
    </div>);

};

export default Textarea;