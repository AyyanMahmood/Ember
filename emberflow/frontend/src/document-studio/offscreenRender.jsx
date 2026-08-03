import { cloneElement } from 'react';
import { createRoot } from 'react-dom/client';
import { loadBrandFont } from './fonts.js';

/**
 * Mounts a document component off-screen (not display:none — that would
 * skip layout entirely — just parked outside the viewport) so it can be
 * captured by exportNodeToPdf/printNode/exportNodeToHtml from places that
 * don't already have a live preview on screen (e.g. a quick "Download PDF"
 * action from a list row). Waits for any logo <img> to finish loading
 * before resolving, since html2canvas needs the image already decoded.
 *
 * Also explicitly waits for the profile's Brand Studio font (if any) to
 * finish loading. InvoiceDocument/ProposalDocument kick off that same
 * @fontsource dynamic import themselves on mount for the on-screen preview
 * case, but a "quick download" from a list row mounts and captures this
 * offscreen copy in one shot with no prior render to have already warmed
 * it -- without this, html2canvas could snapshot the fallback font mid-FOUT.
 */
export function renderDocumentOffscreen(element) {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '-99999px';
  container.style.zIndex = '-1';
  document.body.appendChild(container);

  const root = createRoot(container);
  let nodeRef = null;

  const fontReady = Promise.resolve(loadBrandFont(element.props?.profile?.brand_font))
    .then(() => document.fonts?.ready)
    .catch(() => {});

  return new Promise((resolve, reject) => {
    root.render(cloneElement(element, { ref: (node) => { nodeRef = node; } }));

    // Two rAFs: one to let React commit, one to let layout/paint settle.
    requestAnimationFrame(() => {
      requestAnimationFrame(async () => {
        try {
          const images = Array.from(container.querySelectorAll('img'));
          const anyImageFailed = [];
          await Promise.all([
            fontReady,
            ...images.map((img) => (img.complete ? Promise.resolve() : new Promise((res) => {
              img.onload = res;
              img.onerror = () => { anyImageFailed.push(img); res(); };
            }))),
          ]);
          // A failed <img> also fires DocumentTemplate's own onError, which
          // swaps it for the initials placeholder -- but that's a React
          // state update, not yet painted at this point. Give it one more
          // settle cycle so a broken logo is captured as the placeholder,
          // not a broken-image icon, exactly like the two rAFs above do for
          // ordinary layout.
          if (anyImageFailed.length > 0) {
            await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
          }
          resolve({
            node: nodeRef,
            cleanup: () => {
              root.unmount();
              container.remove();
            },
          });
        } catch (err) {
          root.unmount();
          container.remove();
          reject(err);
        }
      });
    });
  });
}
