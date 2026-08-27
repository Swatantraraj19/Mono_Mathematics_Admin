import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

/**
 * Reusable Confirmation Dialog for destructive or sensitive administrative actions.
 */
export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone. Please confirm to proceed.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'destructive', // 'destructive' | 'primary'
  isLoading = false,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-md"
      footer={
        <>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'primary'}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-4">
        <div className={`p-2.5 rounded-full shrink-0 ${variant === 'destructive' ? 'bg-red-100 text-status-error' : 'bg-indigo-100 text-primary-600'}`}>
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-base font-semibold text-slate-900">{title}</h4>
          <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">{message}</p>
        </div>
      </div>
    </Modal>
  );
};
