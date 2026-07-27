export function LoadingSpinner({ size = 'md', className = '', label = 'Loading...', 'aria-label': ariaLabel }) {
  const sizeClasses = {
    xs: 'spinner--xs',
    sm: 'spinner--sm',
    md: '',
    lg: 'spinner--lg',
    xl: 'spinner--xl',
  };

  return (
    <div className={`loading-row ${className}`.trim()} role="status" aria-live="polite" aria-label={ariaLabel || label}>
      <span className={`spinner ${sizeClasses[size]}`.trim()} aria-hidden="true" />
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

