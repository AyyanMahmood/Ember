import { useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button.jsx';
import { useFocusTrap } from '../../hooks/useFocusTrap.js';

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className = '',
}) {
  const modalRef = useRef(null);

  useFocusTrap(modalRef, { isOpen, onClose, closeOnEscape });

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'modal-card--sm',
    md: '',
    lg: 'modal-card--lg',
    xl: 'modal-card--xl',
    full: 'modal-card--full',
  };

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && closeOnOverlayClick) {
          onClose();
        }
      }}
    >
      <section
        ref={modalRef}
        className={`modal-card ${sizeClasses[size]} ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {(title || showCloseButton) && (
          <div className="modal-header">
            {title && <h3 id="modal-title" className="modal-header__title">{title}</h3>}
            {showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                className="modal-close"
                onClick={onClose}
                aria-label="Close modal"
              >
                <X size={18} />
              </Button>
            )}
          </div>
        )}
        <div className="modal-body">{children}</div>
      </section>
    </div>
  );
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      {message && <p className="confirm-dialog__message">{message}</p>}
      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button variant={variant} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export function ModalFooter({ children, className = '', align = 'end' }) {
  const alignClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div className={`modal-footer ${alignClasses[align]} ${className}`.trim()}>
      {children}
    </div>
  );
}

export function Drawer({
  isOpen,
  onClose,
  title,
  children,
  side = 'right',
  size = 'md',
  closeOnEscape = true,
  className = '',
}) {
  const drawerRef = useRef(null);

  useFocusTrap(drawerRef, { isOpen, onClose, closeOnEscape });

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full',
  };

  return (
    <>
      <div
        className="drawer-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        ref={drawerRef}
        className={`drawer drawer--${side} ${sizeClasses[size]} ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'drawer-title' : undefined}
        tabIndex={-1}
      >
        {(title || true) && (
          <div className="drawer-header">
            {title && <h3 id="drawer-title" className="drawer-title">{title}</h3>}
            <Button
              variant="ghost"
              size="sm"
              className="drawer-close"
              onClick={onClose}
              aria-label="Close drawer"
            >
              <X size={18} />
            </Button>
          </div>
        )}
        <div className="drawer-body">{children}</div>
      </aside>
    </>
  );
}

export function DrawerFooter({ children, className = '', align = 'end' }) {
  const alignClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div className={`drawer-footer ${alignClasses[align]} ${className}`.trim()}>
      {children}
    </div>
  );
}