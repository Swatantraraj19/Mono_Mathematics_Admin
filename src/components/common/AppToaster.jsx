import React from 'react';
import { Toaster } from 'react-hot-toast';

/**
 * Global Toast Notification Container with unified styling.
 */
export const AppToaster = () => {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#FFFFFF',
          color: '#0F172A',
          border: '1px solid #E2E8F0',
          borderRadius: '0.75rem',
          padding: '12px 16px',
          fontSize: '0.875rem',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.07)',
        },
        success: {
          iconTheme: {
            primary: '#16A34A',
            secondary: '#FFFFFF',
          },
        },
        error: {
          iconTheme: {
            primary: '#DC2626',
            secondary: '#FFFFFF',
          },
        },
      }}
    />
  );
};
