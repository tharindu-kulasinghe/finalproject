import React, { useState } from 'react';
import clsx from 'clsx';
import { Eye, EyeOff } from 'lucide-react';

const Input = ({
  label,
  error,
  className = '',
  type = 'text',
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className={className}>
      {label &&
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      }
      <div className="relative">
        <input
          type={isPassword && showPassword ? 'text' : type}
          className={clsx(
            'w-full border border-gray-300 bg-white px-3 py-2.5 text-sm transition-colors duration-150',
            'focus:outline-none',
            isPassword && 'pr-10',
            error ?
            'border-danger-500' :
            'border-gray-300 hover:border-gray-400'
          )}
          {...props} />
        
        {isPassword &&
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none">
          
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        }
      </div>
      {error &&
      <p className="mt-1.5 text-sm text-danger-600">{error}</p>
      }
    </div>);

};

export default Input;