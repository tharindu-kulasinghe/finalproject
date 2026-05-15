import React from 'react';
import clsx from 'clsx';
import LoadingSpinner from './LoadingSpinner';

const SelectDropdown = ({
  label,
  error,
  options = [],
  className = '',
  placeholder = '',
  disabled = false,
  loading = false,
  size = 'md',
  helperText,
  value,
  onChange,
  id,
  name,
  required = false,
  sectionLabel = 'Options',
  showSection = false,
  ...props
}) => {
  const handleChange = (e) => {
    if (onChange) {
      onChange(e);
    }
  };

  const groupedOptions = showSection ? options.reduce((acc, option) => {
    const section = option.section || 'General';
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(option);
    return acc;
  }, {}) : { [sectionLabel]: options };

  const selectOptions = showSection ?
  Object.entries(groupedOptions).flatMap(([section, sectionOptions]) => [
  { value: `section-${section}`, label: section, disabled: true },
  ...sectionOptions]
  ) :
  options;

  const sizes = {
    sm: 'px-2.5 py-1.5 text-sm',
    md: 'px-3 py-2.5 text-sm',
    lg: 'px-4 py-3 text-base'
  };

  return (
    <div className={className}>
      {label &&
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      }
      <div className="relative">
        <select
          className={clsx(
            'w-full appearance-none border bg-white transition-colors duration-150',
            'focus:outline-none',
            sizes[size],
            error ?
            'border-danger-500' :
            'border-gray-300 hover:border-gray-400',
            disabled && 'opacity-50 cursor-not-allowed bg-gray-50',
            loading && 'pr-10'
          )}
          disabled={disabled || loading}
          aria-invalid={!!error}
          aria-describedby={error ? `${id || 'select'}-error` : helperText ? `${id || 'select'}-helper` : undefined}
          value={value ?? ''}
          onChange={handleChange}
          id={id}
          name={name}
          required={required}
          {...props}>
          
          {placeholder && placeholder !== '' && <option value="">{placeholder}</option>}
          {selectOptions.map((option) =>
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}>
            
              {option.label}
            </option>
          )}
        </select>
        {loading &&
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <LoadingSpinner inline size="sm" />
          </div>
        }
      </div>
      {error &&
      <p id={`${id || 'select'}-error`} className="mt-1.5 text-sm text-danger-600">
          {error}
        </p>
      }
      {helperText && !error &&
      <p id={`${id || 'select'}-helper`} className="mt-1.5 text-sm text-gray-500">
          {helperText}
        </p>
      }
    </div>);

};

export default SelectDropdown;