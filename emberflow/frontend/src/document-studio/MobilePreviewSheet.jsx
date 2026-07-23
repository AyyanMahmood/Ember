import { Eye, X } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * Shared open/close state for the phone-only preview bottom sheet used by
 * InvoiceFormPage and ProposalFormPage. The sheet itself is the same
 * .studio-preview element that's a static stacked panel on tablet and a
 * sticky column on desktop — CSS repositions it into a fixed bottom sheet
 * only under --bp-md (680px); this hook just owns whether it's open and
 * applies the same escape/scroll-lock behavior as the app's other overlays.
 */
export function useMobilePreviewSheet() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open]);

  return { open, openSheet: () => setOpen(true), closeSheet: () => setOpen(false) };
}

export function MobilePreviewFab({ onClick }) {
  return (
    <button type="button" className="preview-fab" onClick={onClick}>
      <Eye size={18} />
      Preview
    </button>
  );
}

export function MobilePreviewHeader({ title = 'Live preview', onClose }) {
  return (
    <div className="studio-preview__header">
      <span>{title}</span>
      <button type="button" className="icon-button" onClick={onClose} aria-label="Close preview">
        <X size={18} />
      </button>
    </div>
  );
}

export function MobilePreviewBackdrop({ onClick }) {
  return <div className="studio-preview-backdrop" onClick={onClick} />;
}
