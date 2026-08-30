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
  subtitle,
  children,
  footer,
  maxWidth = 'max-w-md',
  closeOnBackdropClick = true,
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
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const subText = description || subtitle;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-200"
        onClick={closeOnBackdropClick ? onClose : undefined}
        aria-hidden="true"
      />

      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        <div
          role="dialog"
          aria-modal="true"
          className={cn(
            'relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 w-full border border-slate-200',
            maxWidth,
            className
          )}
        >
          {/* Header */}
          {(title || onClose) && (
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                {title && (
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    {title}
                  </h3>
                )}
                {subText && (
                  <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">{subText}</p>
                )}
              </div>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          )}

          {/* Body */}
          <div className="px-5 py-4">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="bg-slate-50/70 border-t border-slate-100 px-5 py-3 flex flex-row-reverse gap-2 rounded-b-2xl">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
