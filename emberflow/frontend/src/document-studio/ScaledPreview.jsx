import { useEffect, useRef, useState } from 'react';
import { DOCUMENT_PAGE_WIDTH, DOCUMENT_PAGE_HEIGHT } from './DocumentTemplate.jsx';

/**
 * Wraps a fixed-true-size document (DOCUMENT_PAGE_WIDTH/HEIGHT) and scales it
 * down purely visually (CSS transform) to fit whatever width is actually
 * available — the split editor pane on desktop, the full column on mobile,
 * a tiny thumbnail slot, etc. The document itself never changes size, so
 * exporting it (PDF/print/HTML) always captures the true, unscaled render —
 * this is what keeps the preview and the export pixel-identical regardless
 * of how small the screen showing the preview is.
 *
 * Deliberately does NOT own the export ref itself — attach `ref` directly to
 * the document component you pass as `children` (InvoiceDocument /
 * ProposalDocument already forward it to the real .doc-page node). An extra
 * wrapper div here would give exporters a generic full-width box to capture
 * instead of the document's own bounds.
 */
export function ScaledPreview({ children, maxScale = 1, className = '' }) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setScale(Math.min(maxScale, width / DOCUMENT_PAGE_WIDTH));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [maxScale]);

  return (
    <div ref={containerRef} className={`scaled-preview ${className}`.trim()} style={{ height: DOCUMENT_PAGE_HEIGHT * scale }}>
      <div className="scaled-preview__inner" style={{ transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}
