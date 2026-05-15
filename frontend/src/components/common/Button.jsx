import React from 'react';
import clsx from 'clsx';
import LoadingSpinner from './LoadingSpinner';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  ...props
}) => {
  const variants = {
    primary: 'border border-primary-700 bg-primary-700 text-white hover:bg-primary-800',
    secondary: 'border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200',
    danger: 'border border-danger-700 bg-danger-700 text-white hover:bg-danger-800',
    outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
    ghost: 'border border-transparent text-gray-700 hover:bg-gray-100',
    success: 'border border-success-700 bg-success-700 text-white hover:bg-success-800'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base'
  };

  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center font-medium transition-colors duration-150 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}>
      
      {loading &&
      <LoadingSpinner inline size="sm" className="-ml-1 mr-2" />
      }
      {children}
    </button>);

};

export default Button;