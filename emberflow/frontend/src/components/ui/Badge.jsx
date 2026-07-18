import { forwardRef } from 'react';

export const Badge = forwardRef(function Badge({
  variant = 'default',
  size = 'md',
  dot = false,
  className = '',
  children,
  ...props
}, ref) {
  const variantClasses = {
    default: 'badge--default',
    blue: 'badge--blue',
    success: 'badge--success',
    warning: 'badge--warning',
    danger: 'badge--danger',
    draft: 'badge--draft',
    outline: 'badge--outline',
  };

  const sizeClasses = {
    sm: 'badge--sm',
    md: '',
    lg: 'badge--lg',
  };

  const classes = [
    'badge',
    variantClasses[variant] || variantClasses.default,
    sizeClasses[size] || '',
    dot ? 'badge--dot' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <span ref={ref} className={classes} {...props}>
      {children}
    </span>
  );
});

Badge.displayName = 'Badge';

export const StatusBadge = function StatusBadge({ status, className = '', size = 'md', ...props }) {
  const statusMap = {
    draft: 'draft',
    sent: 'blue',
    paid: 'success',
    overdue: 'danger',
    pending: 'warning',
    void: 'default',
    cancelled: 'default',
    failed: 'danger',
  };

  const variant = statusMap[status] || 'default';

  return (
    <Badge variant={variant} size={size} className={className} {...props}>
      {status?.charAt(0).toUpperCase() + status?.slice(1)}
    </Badge>
  );
};

export const Chip = forwardRef(function Chip({
  variant = 'default',
  removable = false,
  onRemove,
  removeAriaLabel = 'Remove',
  className = '',
  children,
  ...props
}, ref) {
  const variantClasses = {
    default: 'chip',
    success: 'chip chip--success',
    warning: 'chip chip--warning',
    danger: 'chip chip--danger',
    draft: 'chip chip--draft',
    muted: 'chip chip--muted',
  };

  const classes = [variantClasses[variant] || variantClasses.default, className].filter(Boolean).join(' ');

  return (
    <span ref={ref} className={classes} {...props}>
      <span className="chip__content">{children}</span>
      {removable && (
        <button
          type="button"
          className="chip__remove"
          onClick={onRemove}
          aria-label={removeAriaLabel}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </span>
  );
});

Chip.displayName = 'Chip';