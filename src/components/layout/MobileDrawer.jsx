import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Sidebar } from './Sidebar';

/**
 * Slide-out Mobile Navigation Drawer.
 * Optimized with Dynamic Viewport Height (100dvh) and safe-area insets.
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
    <div className="fixed inset-0 z-50 lg:hidden flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Drawer Container */}
      <div className="relative w-[280px] max-w-[85vw] h-[100dvh] bg-white shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
        {/* Close Button Header */}
        <div className="absolute top-2.5 right-2.5 z-20">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Full Height Sidebar inside Drawer */}
        <Sidebar className="w-full h-full border-r-0" onItemClick={onClose} />
      </div>
    </div>
  );
};
