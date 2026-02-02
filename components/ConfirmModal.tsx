import React from 'react';
import Modal from './Modal';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
}

/** Reusable confirmation dialog (replaces window.confirm for consistent UX and testability). */
const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
}) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const confirmClass =
    variant === 'danger'
      ? 'px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700'
      : 'px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <p className="text-sm text-slate-700 mb-6">{message}</p>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50">
          {cancelLabel}
        </button>
        <button type="button" onClick={handleConfirm} className={confirmClass}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
