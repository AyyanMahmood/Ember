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
  const contentRef = useRef(null);
  const [scale, setScale] = useState(1);
  // DOCUMENT_PAGE_HEIGHT is a floor for the *document's* own min-height, not
  // a cap — a document with enough line items legitimately renders taller
  // than one page. Measuring the real content height (rather than assuming
  // it) is what keeps this wrapper from clipping that overflow: with a fixed
  // assumed height, longer documents would have their bottom half (often the
  // totals block and footer) silently cut off on screen while the actual
  // export — which reads the real unscaled node directly — showed it in
  // full, which is exactly the preview/export mismatch this whole rendering
  // approach exists to prevent.
  const [contentHeight, setContentHeight] = useState(DOCUMENT_PAGE_HEIGHT);

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

  useEffect(() => {
    const el = contentRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    // ResizeObserver reports the element's own (pre-transform) box size, so
    // this stays accurate regardless of the CSS scale applied below it.
    const observer = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height;
      if (height) setContentHeight(height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className={`scaled-preview ${className}`.trim()} style={{ height: contentHeight * scale }}>
      <div ref={contentRef} className="scaled-preview__inner" style={{ transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}
