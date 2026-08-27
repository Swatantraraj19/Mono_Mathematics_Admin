import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Reusable accessible Modal dialog.
 */
export const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'max-w-lg',
  className = '',
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        <div
          role="dialog"
          aria-modal="true"
          className={cn(
            'relative transform overflow-hidden rounded-xl bg-white text-left shadow-modal transition-all sm:my-8 w-full border border-slate-200',
            maxWidth,
            className
          )}
        >
          {/* Header */}
          {(title || onClose) && (
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
              <div>
                {title && (
                  <h3 className="text-lg font-semibold text-slate-900">
                    {title}
                  </h3>
                )}
                {description && (
                  <p className="mt-1 text-xs text-slate-500">{description}</p>
                )}
              </div>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          )}

          {/* Body */}
          <div className="px-6 py-5">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="bg-slate-50 border-t border-slate-100 px-6 py-3.5 flex flex-row-reverse gap-3 rounded-b-xl">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
