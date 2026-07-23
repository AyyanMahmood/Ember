import { ChevronDown, Download, Lock } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { canUseExportFormat } from '../utils/plans.js';

const FORMATS = [
  { id: 'pdf', label: 'PDF (quick download)' },
  { id: 'print', label: 'Print / Save as PDF (best quality)' },
  { id: 'html', label: 'HTML' },
  { id: 'markdown', label: 'Markdown' },
  { id: 'json', label: 'JSON' },
  { id: 'csv', label: 'CSV (line items)' },
  { id: 'txt', label: 'Plain text' },
  { id: 'docx', label: 'Word (.docx)' },
];

export function ExportMenu({ isPro, busyFormat, onExport, onRequestUpgrade }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function handleClick(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setOpen(false);
    }
    function handleKey(event) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  function handleSelect(format) {
    if (!canUseExportFormat(format.id, isPro)) {
      onRequestUpgrade?.();
      return;
    }
    setOpen(false);
    onExport(format.id);
  }

  return (
    <div className="export-menu" ref={wrapperRef}>
      <button type="button" className="button button--secondary button--md" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open}>
        <Download size={16} />
        Export
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="export-menu__panel" role="menu">
          {FORMATS.map((format) => {
            const locked = !canUseExportFormat(format.id, isPro);
            return (
              <button
                key={format.id}
                type="button"
                role="menuitem"
                className="export-menu__item"
                onClick={() => handleSelect(format)}
                disabled={busyFormat === format.id}
              >
                <span>{format.label}</span>
                {locked ? <Lock size={13} /> : busyFormat === format.id ? <span className="spinner spinner--xs" /> : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
