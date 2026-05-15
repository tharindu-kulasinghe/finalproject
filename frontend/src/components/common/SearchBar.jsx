import { useState } from 'react';
import clsx from 'clsx';
import { Search, X } from 'lucide-react';

const SearchBar = ({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
  onClear
}) => {
  const [focused, setFocused] = useState(false);

  return (
    <div className={clsx('relative', className)}>
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
        <Search
          className={clsx(
            'w-4 h-4 transition-colors',
            focused ? 'text-primary-500' : 'text-gray-400'
          )} />
        
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        className="w-full border border-gray-300 bg-white py-2.5 pl-10 pr-10 text-sm transition-colors duration-150 hover:border-gray-400 focus:outline-none" />
      
      {value &&
      <button
        type="button"
        onClick={() => {
          onChange('');
          onClear?.();
        }}
        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none">
        
          <X className="h-4 w-4" />
        </button>
      }
    </div>);

};

export default SearchBar;