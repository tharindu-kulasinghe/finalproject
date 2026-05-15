import React from 'react';

const PageHeader = ({
  title,
  description,
  actions,
  className = ''
}) => {
  return (
    <div className={`mb-6 flex flex-col gap-4 border-b border-gray-200 pb-4 sm:flex-row sm:items-end sm:justify-between ${className}`}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{title}</h1>
        {description &&
        <p className="mt-1 text-sm text-gray-600">{description}</p>
        }
      </div>
      {actions &&
      <div className="flex flex-wrap items-center gap-2">
          {actions}
        </div>
      }
    </div>);

};

export default PageHeader;