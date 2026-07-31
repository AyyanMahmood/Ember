import { useState } from 'react';

// The brand asset. Drop the real logo at frontend/public/emberflow-logo.svg
// (preferred — crisp at any size) and it is used everywhere automatically.
// Until then, EmberMark below is a graceful, on-brand fallback so nothing
// ever renders a broken image. A caller can point at a different file via
// the `src` prop (e.g. a wordmark variant).
const DEFAULT_LOGO_SRC = '/emberflow-logo.svg';

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
