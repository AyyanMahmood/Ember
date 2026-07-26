import { Eye, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/**
 * Shared open/close state for the phone-only preview bottom sheet used by
 * InvoiceFormPage and ProposalFormPage. The sheet itself is the same
 * .studio-preview element that's a static stacked panel on tablet and a
 * sticky column on desktop — CSS repositions it into a fixed bottom sheet
 * only under --bp-md (680px); this hook just owns whether it's open and
 * applies the same escape/scroll-lock/focus behavior as the app's other
 * overlays (the mobile sidebar drawer in AppLayout.jsx).
 */
export function useMobilePreviewSheet() {
  const [open, setOpen] = useState(false);
  const fabRef = useRef(null);
  const closeButtonRef = useRef(null);
  const sheetRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const trapFocus = (event) => {
      const focusableElements = sheetRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusableElements?.length) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
      if (event.key === 'Tab') trapFocus(event);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      fabRef.current?.focus();
    };
  }, [open]);

  return {
    open,
    openSheet: () => setOpen(true),
    closeSheet: () => setOpen(false),
    fabRef,
    closeButtonRef,
    sheetRef,
  };
}

export function MobilePreviewFab({ onClick, fabRef }) {
  return (
    <button type="button" ref={fabRef} className="preview-fab" onClick={onClick}>
      <Eye size={18} />
      Preview
    </button>
  );
}

export function MobilePreviewHeader({ title = 'Live preview', onClose, closeButtonRef }) {
  return (
    <div className="studio-preview__header">
      <span>{title}</span>
      <button type="button" ref={closeButtonRef} className="icon-button" onClick={onClose} aria-label="Close preview">
        <X size={18} />
      </button>
    </div>
  );
}

export function MobilePreviewBackdrop({ onClick }) {
  return <div className="studio-preview-backdrop" onClick={onClick} />;
}
