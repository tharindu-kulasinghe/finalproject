import React, { useMemo, useState } from 'react';
import clsx from 'clsx';
import { FileText } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

const Table = ({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = 'No data available',
  onRowClick,
  className = '',
  pageSize = 15,
  pagination = true
}) => {
  const safePageSize = Math.max(1, Number(pageSize) || 15);
  const shouldPaginate = Boolean(pagination) && data.length > safePageSize;

  const [page, setPage] = useState(1);

  const totalPages = shouldPaginate ? Math.max(1, Math.ceil(data.length / safePageSize)) : 1;

  const currentPage = Math.min(Math.max(1, page), totalPages);

  const pagedData = useMemo(() => {
    if (!shouldPaginate) return data;
    const start = (currentPage - 1) * safePageSize;
    return data.slice(start, start + safePageSize);
  }, [data, shouldPaginate, currentPage, safePageSize]);

  const rangeText = useMemo(() => {
    if (!shouldPaginate) return null;
    const start = (currentPage - 1) * safePageSize + 1;
    const end = Math.min(currentPage * safePageSize, data.length);
    return `Showing ${start}-${end} of ${data.length}`;
  }, [shouldPaginate, currentPage, safePageSize, data.length]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>);

  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <FileText className="mb-3 h-12 w-12 text-gray-300" />
        <p>{emptyMessage}</p>
      </div>);

  }

  return (
    <div className={clsx('overflow-x-auto border border-gray-200 bg-white', className)}>
      <table className="w-full min-w-max">
        <thead>
          <tr className="border-b border-gray-200">
            {columns.map((column, index) =>
            <th
              key={index}
              className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
              style={{ width: column.width }}>
              
                {column.header}
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {pagedData.map((row, rowIndex) =>
          <tr
            key={rowIndex}
            onClick={() => onRowClick?.(row)}
            className={clsx(
              'hover:bg-gray-50 transition-colors',
              onRowClick && 'cursor-pointer'
            )}>
            
              {columns.map((column, colIndex) =>
            <td
              key={colIndex}
              className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
              
                  {column.render ? column.render(row) : row[column.key]}
                </td>
            )}
            </tr>
          )}
        </tbody>
      </table>

      {shouldPaginate &&
      <div className="flex items-center justify-between gap-3 border-t border-gray-200 bg-white px-4 py-3">
          <p className="text-xs text-gray-500 whitespace-nowrap">{rangeText}</p>

          <div className="flex items-center gap-2">
            <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className={clsx(
              'px-3 py-1.5 text-xs font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
              currentPage <= 1 && 'opacity-50 cursor-not-allowed'
            )}>
            
              Prev
            </button>
            <p className="text-xs text-gray-600 whitespace-nowrap">
              Page <span className="font-semibold text-gray-900">{currentPage}</span> / {totalPages}
            </p>
            <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className={clsx(
              'px-3 py-1.5 text-xs font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
              currentPage >= totalPages && 'opacity-50 cursor-not-allowed'
            )}>
            
              Next
            </button>
          </div>
        </div>
      }
    </div>);

};

export default Table;