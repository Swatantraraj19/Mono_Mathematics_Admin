import React from 'react';
import { cn } from '../../utils/cn';

/**
 * Reusable Skeleton loader for clean loading states.
 */
export const SkeletonLoader = ({
  variant = 'text', // 'text' | 'rect' | 'circle' | 'table-row' | 'card'
  rows = 1,
  className = '',
}) => {
  if (variant === 'table-row') {
    return (
      <>
        {Array.from({ length: rows }).map((_, i) => (
          <tr key={i} className="animate-pulse">
            <td className="px-4 py-4"><div className="h-4 bg-slate-200 rounded-md w-24"></div></td>
            <td className="px-4 py-4"><div className="h-4 bg-slate-200 rounded-md w-40"></div></td>
            <td className="px-4 py-4"><div className="h-4 bg-slate-200 rounded-md w-16"></div></td>
            <td className="px-4 py-4"><div className="h-4 bg-slate-200 rounded-md w-20"></div></td>
            <td className="px-4 py-4 text-right"><div className="h-4 bg-slate-200 rounded-md w-12 ml-auto"></div></td>
          </tr>
        ))}
      </>
    );
  }

  if (variant === 'card') {
    return (
      <div className={cn('admin-card animate-pulse space-y-4', className)}>
        <div className="flex items-center justify-between">
          <div className="h-4 bg-slate-200 rounded-md w-1/3"></div>
          <div className="h-8 w-8 bg-slate-200 rounded-lg"></div>
        </div>
        <div className="h-7 bg-slate-200 rounded-md w-1/2"></div>
        <div className="h-3 bg-slate-200 rounded-md w-2/3"></div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'animate-pulse bg-slate-200',
        variant === 'circle' && 'rounded-full',
        variant === 'rect' && 'rounded-lg',
        variant === 'text' && 'h-4 rounded-md w-full',
        className
      )}
    />
  );
};
