import React from 'react';
import { cn } from '../../utils/cn';

/**
 * Reusable Input component with label, error, and icon slots.
 */
export const Input = React.forwardRef(({
  label,
  error,
  helperText,
  className = '',
  id,
  type = 'text',
  icon: Icon,
  trailingIcon: TrailingIcon,
  onTrailingIconClick,
  required = false,
  ...props
}, ref) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full flex flex-col gap-1 text-left">
      {label && (
        <label htmlFor={inputId} className="text-xs font-semibold text-slate-700">
          {label}
          {required && <span className="text-status-error ml-0.5">*</span>}
        </label>
      )}

      <div className="relative rounded-lg shadow-xs">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Icon className="w-4 h-4 shrink-0" />
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          type={type}
          className={cn(
            'w-full block text-sm rounded-lg border bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
            Icon && 'pl-9',
            TrailingIcon && 'pr-9',
            error
              ? 'border-status-error focus:ring-red-500 focus:border-red-500 bg-red-50/20'
              : 'border-slate-300 hover:border-slate-400',
            props.disabled && 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200',
            className
          )}
          {...props}
        />

        {TrailingIcon && (
          <button
            type="button"
            tabIndex={onTrailingIconClick ? 0 : -1}
            onClick={onTrailingIconClick}
            className={cn(
              'absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 focus:outline-none',
              onTrailingIconClick ? 'cursor-pointer hover:text-slate-600' : 'pointer-events-none'
            )}
            aria-label="Toggle input view"
          >
            <TrailingIcon className="w-4 h-4 shrink-0" />
          </button>
        )}
      </div>

      {error ? (
        <p className="text-[11px] text-status-error font-medium leading-tight mt-0.5">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-slate-500 leading-tight mt-0.5">{helperText}</p>
      ) : null}
    </div>
  );
});

Input.displayName = 'Input';
