import React from 'react';
import { SkeletonLoader } from './SkeletonLoader';
import { EmptyState } from './EmptyState';
import { cn } from '../../utils/cn';

/**
 * Reusable Table container with compound subcomponents.
 */
export const Table = ({
  columns = [],
  data = [],
  children,
  isLoading = false,
  isEmpty = false,
  emptyTitle,
  emptyDescription,
  emptyActionLabel,
  onEmptyAction,
  className = '',
}) => {
  // If compound children are provided (Table.Header, Table.Body)
  if (children && columns.length === 0) {
    return (
      <div className={cn('w-full overflow-hidden bg-white border border-slate-200 rounded-xl shadow-card', className)}>
        <div className="overflow-x-auto">
          <table className="admin-table">
            {children}
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('w-full overflow-hidden bg-white border border-slate-200 rounded-xl shadow-card', className)}>
      <div className="overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={cn(
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                    col.className
                  )}
                  style={{ width: col.width }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <SkeletonLoader variant="table-row" rows={4} />
            ) : isEmpty ? (
              <tr>
                <td colSpan={columns.length} className="p-0 border-none">
                  <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                    actionLabel={emptyActionLabel}
                    onAction={onEmptyAction}
                    className="border-none rounded-none py-12"
                  />
                </td>
              </tr>
            ) : data && data.length > 0 ? (
              data.map((row, rowIdx) => (
                <tr key={row.id || rowIdx} className="hover:bg-slate-50/80 transition-colors">
                  {columns.map((col, colIdx) => (
                    <td
                      key={colIdx}
                      className={cn(
                        'px-4 py-3.5 text-xs sm:text-sm text-slate-700 align-middle',
                        col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                        col.className
                      )}
                    >
                      {col.cell ? col.cell(row) : row[col.accessorKey]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              children
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

Table.Header = ({ children, className = '' }) => (
  <thead className={cn('bg-slate-50/80 border-b border-slate-200', className)}>
    {children}
  </thead>
);

Table.Body = ({ children, className = '' }) => (
  <tbody className={cn('divide-y divide-slate-100 bg-white', className)}>
    {children}
  </tbody>
);

Table.Row = ({ children, className = '', onClick }) => (
  <tr
    onClick={onClick}
    className={cn(
      'transition-colors duration-150 hover:bg-slate-50/80',
      onClick && 'cursor-pointer',
      className
    )}
  >
    {children}
  </tr>
);

Table.Head = ({ children, className = '', style }) => (
  <th
    style={style}
    className={cn(
      'px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider select-none',
      className
    )}
  >
    {children}
  </th>
);

Table.Cell = ({ children, className = '', colSpan, onClick }) => (
  <td
    colSpan={colSpan}
    onClick={onClick}
    className={cn('px-4 py-3.5 text-xs sm:text-sm text-slate-700 align-middle', className)}
  >
    {children}
  </td>
);
