import React from 'react';
import { cn } from '../../utils/cn';

/**
 * Reusable Badge component for states, streams, roles, and status flags.
 */
export const Badge = ({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  className = '',
}) => {
  const variants = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    inactive: 'bg-slate-100 text-slate-600 border-slate-200',
    scheduled: 'bg-amber-50 text-amber-700 border-amber-200',
    live: 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse',
    completed: 'bg-blue-50 text-blue-700 border-blue-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
    primary: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const dotColors = {
    active: 'bg-emerald-500',
    inactive: 'bg-slate-400',
    scheduled: 'bg-amber-500',
    live: 'bg-rose-500',
    completed: 'bg-blue-500',
    cancelled: 'bg-red-500',
    primary: 'bg-indigo-500',
    neutral: 'bg-slate-400',
  };

  const sizes = {
    sm: 'text-[10px] px-1.5 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-0.5 font-medium',
    lg: 'text-sm px-3 py-1 font-semibold',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border',
        variants[variant] || variants.neutral,
        sizes[size],
        className
      )}
    >
      {dot && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full shrink-0',
            dotColors[variant] || dotColors.neutral
          )}
        />
      )}
      {children}
    </span>
  );
};
