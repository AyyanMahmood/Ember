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

export function Skeleton({ variant = 'text', width, height, className = '', animation = 'pulse', ...props }) {
  const variantClasses = {
    text: 'skeleton--text',
    textSm: 'skeleton--text-sm',
    textLg: 'skeleton--text-lg',
    heading: 'skeleton--heading',
    avatar: 'skeleton--avatar',
    button: 'skeleton--button',
    card: 'skeleton--card',
    row: 'skeleton--row',
    circle: 'skeleton--circle',
    rounded: 'skeleton--rounded',
  };

  const animationClasses = {
    pulse: 'skeleton--pulse',
    wave: 'skeleton--wave',
    none: '',
  };

  const classes = [
    'skeleton',
    variantClasses[variant],
    animationClasses[animation],
    className,
  ].filter(Boolean).join(' ');

  const style = {
    width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
    height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
  };

  return <div className={classes} style={style} {...props} aria-hidden="true" />;
}

export function SkeletonCard({ className = '', lines = 3, avatar = false, action = false, ...props }) {
  return (
    <div className={`skeleton skeleton--card ${className}`.trim()} {...props} aria-hidden="true">
      {avatar && <Skeleton variant="avatar" className="skeleton-card__avatar" />}
      <div className="skeleton-card__content">
        <Skeleton variant="heading" className="skeleton-card__title" />
        {[...Array(lines)].map((_, i) => (
          <Skeleton key={i} variant="text" className="skeleton-card__line" />
        ))}
        {action && <Skeleton variant="button" className="skeleton-card__action" />}
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 4, className = '', ...props }) {
  return (
    <div className={`skeleton-table ${className}`.trim()} {...props} aria-hidden="true">
      <div className="skeleton-table__header">
        {[...Array(columns)].map((_, i) => (
          <Skeleton key={i} variant="textSm" className="skeleton-table__cell" />
        ))}
      </div>
      <div className="skeleton-table__body">
        {[...Array(rows)].map((_, rowIndex) => (
          <div key={rowIndex} className="skeleton-table__row">
            {[...Array(columns)].map((_, colIndex) => (
              <Skeleton key={colIndex} variant="text" className="skeleton-table__cell" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonList({ items = 5, className = '', renderItem, ...props }) {
  return (
    <div className={`skeleton-list ${className}`.trim()} {...props} aria-hidden="true">
      {[...Array(items)].map((_, i) => (
        <div key={i} className="skeleton-list__item">
          {renderItem ? renderItem(i) : <Skeleton variant="row" />}
        </div>
      ))}
    </div>
  );
}