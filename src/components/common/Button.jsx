import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Reusable Button component aligned with PRD design system.
 */
export const Button = React.forwardRef(({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  type = 'button',
  icon: Icon,
  iconPosition = 'left',
  ...props
}, ref) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

  const variants = {
    primary: 'bg-primary-600 text-white hover:bg-primary-800 focus:ring-primary-500 shadow-sm active:bg-primary-900',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 focus:ring-slate-400 active:bg-slate-100',
    destructive: 'bg-status-error text-white hover:bg-red-700 focus:ring-red-500 shadow-sm active:bg-red-800',
    outline: 'border border-primary-600 text-primary-600 bg-transparent hover:bg-primary-50 focus:ring-primary-500',
    ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:ring-slate-400',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2.5 gap-2',
    lg: 'text-base px-5 py-3 gap-2.5',
  };

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : Icon && iconPosition === 'left' ? (
        <Icon className="w-4 h-4 shrink-0" />
      ) : null}
      
      <span>{children}</span>

      {!isLoading && Icon && iconPosition === 'right' && (
        <Icon className="w-4 h-4 shrink-0" />
      )}
    </button>
  );
});

Button.displayName = 'Button';
