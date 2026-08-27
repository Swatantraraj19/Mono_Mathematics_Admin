import React from 'react';
import { cn } from '../../utils/cn';

/**
 * Reusable Select dropdown component.
 */
export const Select = React.forwardRef(({
  label,
  error,
  helperText,
  options = [],
  placeholder = 'Select an option',
  className = '',
  id,
  required = false,
  ...props
}, ref) => {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full flex flex-col gap-1.5 text-left">
      {label && (
        <label htmlFor={selectId} className="text-xs font-semibold text-slate-700">
          {label}
          {required && <span className="text-status-error ml-0.5">*</span>}
        </label>
      )}

      <select
        ref={ref}
        id={selectId}
        className={cn(
          'w-full block text-sm rounded-lg border bg-white px-3 py-2 text-slate-900 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
          error
            ? 'border-status-error focus:ring-red-500 focus:border-red-500 bg-red-50/20'
            : 'border-slate-300 hover:border-slate-400',
          props.disabled && 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200',
          className
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {error ? (
        <p className="text-xs text-status-error font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
});

Select.displayName = 'Select';
