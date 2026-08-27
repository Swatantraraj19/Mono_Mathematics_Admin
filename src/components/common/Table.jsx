import React from 'react';
import { SkeletonLoader } from './SkeletonLoader';
import { EmptyState } from './EmptyState';
import { cn } from '../../utils/cn';

/**
 * Reusable Table container component.
 */
export const Table = ({
  columns = [],
  children,
  isLoading = false,
  isEmpty = false,
  emptyTitle,
  emptyDescription,
  emptyActionLabel,
  onEmptyAction,
  className = '',
}) => {
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
            ) : (
              children
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
