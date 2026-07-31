import { EmberLogo } from './EmberLogo.jsx';

// The Ember loader family — deliberately not one loader everywhere. Each
// context gets the affordance that fits it:
//   • EmberSpinner  — premium ember arc for scoped data regions (the default)
//   • RouteProgress — thin top trickle bar for navigation / route chunks
//   • BrandLoader   — logo + ring for full-screen branded waits (auth)
//   • Button's own tiny `.spinner` — unchanged, right for inline actions
// Skeleton screens are intentionally excluded (standing design rule).

const emberSizeClasses = {
  xs: 'ember-spinner--xs',
  sm: 'ember-spinner--sm',
  md: '',
  lg: 'ember-spinner--lg',
  xl: 'ember-spinner--xl',
};

// The premium spinner itself, decoupled so it can be dropped anywhere a bare
// mark is wanted (no row/label wrapper).
export function EmberSpinner({ size = 'md', className = '' }) {
  return <span className={`ember-spinner ${emberSizeClasses[size] || ''} ${className}`.trim()} aria-hidden="true" />;
}

export function LoadingSpinner({ size = 'md', className = '', label = 'Loading...', 'aria-label': ariaLabel }) {
  return (
    <div className={`loading-row ${className}`.trim()} role="status" aria-live="polite" aria-label={ariaLabel || label}>
      <EmberSpinner size={size} />
      {label && <span className="sr-only">{label}</span>}
    </div>
  );
}

export function LoadingOverlay({ visible = true, label = 'Loading...', size = 'lg', className = '' }) {
  if (!visible) return null;

  return (
    <div className={`loading-overlay ${className}`.trim()} role="status" aria-live="polite" aria-label={label}>
      <LoadingSpinner size={size} label={label} />
    </div>
  );
}

export function PageLoader({ label = 'Loading...', size = 'lg', className = '' }) {
  return (
    <div className={`page-loader ${className}`.trim()} role="status" aria-live="polite" aria-label={label}>
      <LoadingSpinner size={size} label={label} />
    </div>
  );
}

// Navigation / route-chunk loading. A thin ember bar that trickles in at the
// very top of the viewport while a lazy route is fetched, then vanishes when
// the page mounts — the Linear/Vercel/GitHub navigation pattern, which reads
// as "moving" without a layout-shifting centered spinner. Meant to be a
// Suspense fallback: it only exists while the next chunk is in flight.
export function RouteProgress() {
  return (
    <div className="route-progress" role="status" aria-live="polite" aria-label="Loading page">
      <span className="route-progress__bar" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

// Full-screen branded wait — the logo anchored inside a slow ember ring, with
// a short label. For the handful of genuinely blank moments where showing the
// brand is right (completing an OAuth sign-in), rather than a bare spinner.
export function BrandLoader({ label = 'Loading…', className = '' }) {
  return (
    <div className={`brand-loader ${className}`.trim()} role="status" aria-live="polite">
      <span className="brand-loader__mark">
        <span className="brand-loader__ring" aria-hidden="true" />
        <EmberLogo size={40} className="brand-loader__logo" alt="" />
      </span>
      <p className="brand-loader__label">{label}</p>
    </div>
  );
}
