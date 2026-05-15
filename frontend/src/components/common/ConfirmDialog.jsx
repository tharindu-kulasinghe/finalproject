import Modal from './Modal';
import Button from './Button';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false
}) => {
  const iconStyles = {
    danger: {
      bg: 'bg-danger-100',
      icon: 'text-danger-600',
      iconNode: AlertTriangle
    },
    warning: {
      bg: 'bg-warning-100',
      icon: 'text-warning-600',
      iconNode: AlertCircle
    },
    info: {
      bg: 'bg-info-100',
      icon: 'text-info-600',
      iconNode: Info
    }
  };

  const style = iconStyles[variant] || iconStyles.danger;
  const Icon = style.iconNode;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" showClose={false}>
      <div className="text-center">
        <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center border border-gray-200 ${style.bg}`}>
          <Icon className={`h-6 w-6 ${style.icon}`} />
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-6">{message}</p>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={loading}>
            
            {cancelText}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            className="flex-1"
            onClick={onConfirm}
            loading={loading}>
            
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>);

};

export default ConfirmDialog;