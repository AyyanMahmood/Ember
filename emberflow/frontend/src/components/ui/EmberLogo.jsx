import { useState } from 'react';

// The brand mark — the square EmberFlow hex symbol, transparent-background,
// extracted from the supplied logo lockup. Used everywhere a square mark fits
// (app entrance, sidebar, activation ring, auth loader), so the same mark
// anchors every "this is EmberFlow" moment. The full horizontal lockup lives
// at /emberflow-logo.png for wide/marketing contexts. EmberMark below is a
// graceful fallback so nothing renders broken if the asset is ever missing.
const DEFAULT_LOGO_SRC = '/emberflow-mark.png';

// Inline fallback mark — a warm rounded-square ember monogram. Deliberately
// self-contained (no external asset, theme-aware via tokens) so it holds up
// on its own at large sizes in the activation/entrance experiences if the
// real logo hasn't been placed yet.
export function EmberMark({ size = 40, className = '', title = 'EmberFlow', ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label={title}
      className={`ember-mark ${className}`.trim()}
      {...props}
    >
      <rect width="32" height="32" rx="9" className="ember-mark__plate" />
      {/* A minimal ember flame — a single warm silhouette, no gradient. */}
      <path
        className="ember-mark__flame"
        d="M16 6.5c.9 2.6 2.5 3.9 3.9 5.6 1.3 1.6 2.4 3.3 2.4 5.6a6.3 6.3 0 0 1-12.6 0c0-1.6.6-3 1.6-4.3.4 1.2 1.3 1.9 2.3 1.9 1.4 0 2.1-1 2.1-2.6 0-1.9-1.2-3.6-1.2-5.4 0-1.4.6-2.6 1.5-3.4z"
      />
    </svg>
  );
}

export function EmberLogo({
  src = DEFAULT_LOGO_SRC,
  size = 40,
  alt = 'EmberFlow',
  className = '',
  draggable = false,
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <EmberMark size={size} className={className} title={alt} />;
  }

  return (
    <img
      src={src}
      width={size}
      height={size}
      alt={alt}
      draggable={draggable}
      className={`ember-logo ${className}`.trim()}
      onError={() => setFailed(true)}
    />
  );
}
