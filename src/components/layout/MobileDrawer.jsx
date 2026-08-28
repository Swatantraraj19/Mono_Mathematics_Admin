import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { cn } from '../../utils/cn';

/**
 * Slide-out Mobile Navigation Drawer.
 */
export const MobileDrawer = ({ isOpen, onClose }) => {
  // Lock body scroll and handle Escape key dismiss
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

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Container */}
      <div className="fixed inset-y-0 left-0 max-w-xs w-full bg-white shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
        {/* Close Button Header */}
        <div className="absolute top-3.5 right-3.5 z-20">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Component inside Drawer */}
        <Sidebar className="w-full border-r-0" onItemClick={onClose} />
      </div>
    </div>
  );
};
