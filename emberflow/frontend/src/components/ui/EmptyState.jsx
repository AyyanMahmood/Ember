import { Link } from 'react-router-dom';
import { Button } from './Button.jsx';

export function EmptyState({
  title,
  message,
  icon,
  actionLabel,
  actionTo,
  actionHref,
  actionOnClick,
  variant = 'default',
  className = '',
  children,
  illustration,
}) {
  const variantClasses = {
    default: '',
    success: 'empty-state--success',
    warning: 'empty-state--warning',
    danger: 'empty-state--danger',
  };

  const handleAction = (e) => {
    if (actionOnClick) {
      e.preventDefault();
      actionOnClick(e);
    }
  };

  return (
    <div className={`empty-state ${variantClasses[variant]} ${className}`.trim()} role="status" aria-live="polite">
      {(illustration || icon) && (
        <div className="empty-state__icon" aria-hidden="true">
          {illustration ? (
            <img src={illustration} alt="" className="empty-state__illustration" />
          ) : (
            icon
          )}
        </div>
      )}
      <div className="empty-state__content">
        {title && <h3 className="empty-state__title">{title}</h3>}
        {message && <p className="empty-state__message">{message}</p>}
        {children && <div className="empty-state__children">{children}</div>}
        {(actionLabel && (actionTo || actionHref || actionOnClick)) && (
          <div className="empty-state__action">
            {actionHref ? (
              <a href={actionHref} className="button button--primary" onClick={handleAction}>
                {actionLabel}
              </a>
            ) : actionTo ? (
              <Link to={actionTo} className="button button--primary" onClick={handleAction}>
                {actionLabel}
              </Link>
            ) : (
              <Button variant="primary" onClick={handleAction}>
                {actionLabel}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function EmptyStateIllustration({ variant = 'default', className = '' }) {
  const illustrations = {
    default: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8" />
        <path d="M12 17v4" />
      </svg>
    ),
    inbox: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
    users: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    document: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    chart: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    search: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
    lock: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    notification: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  };

  return (
    <div className={`empty-state__icon ${className}`.trim()} aria-hidden="true">
      {illustrations[variant] || illustrations.default}
    </div>
  );
}