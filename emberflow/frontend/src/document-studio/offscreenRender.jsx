import { cloneElement } from 'react';
import { createRoot } from 'react-dom/client';

/**
 * Mounts a document component off-screen (not display:none — that would
 * skip layout entirely — just parked outside the viewport) so it can be
 * captured by exportNodeToPdf/printNode/exportNodeToHtml from places that
 * don't already have a live preview on screen (e.g. a quick "Download PDF"
 * action from a list row). Waits for any logo <img> to finish loading
 * before resolving, since html2canvas needs the image already decoded.
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

  return new Promise((resolve, reject) => {
    root.render(cloneElement(element, { ref: (node) => { nodeRef = node; } }));

    // Two rAFs: one to let React commit, one to let layout/paint settle.
    requestAnimationFrame(() => {
      requestAnimationFrame(async () => {
        try {
          const images = Array.from(container.querySelectorAll('img'));
          await Promise.all(images.map((img) => (img.complete ? Promise.resolve() : new Promise((res) => {
            img.onload = res;
            img.onerror = res;
          }))));
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
