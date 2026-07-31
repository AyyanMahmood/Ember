import { forwardRef } from 'react';
import { AlertOctagon, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

// Per-variant default icon. Callers can override with `icon={<Node />}` or
// suppress entirely with `icon={false}` (e.g. when the copy is self-evident).
const VARIANT_ICON = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertOctagon,
  neutral: Info,
};

// Danger/warning interrupt the user (a failed payment, a destructive
// consequence) so they announce assertively; the rest are polite. Any caller
// can override with an explicit `role`.
const VARIANT_ROLE = {
  danger: 'alert',
  warning: 'alert',
};

/**
 * Ember Alert — an inline notice for state the user should read but that
 * isn't a modal interruption: billing warnings, failed payments, success
 * confirmations, empty-context hints.
 *
 * Synthesized from Tremor Callout (title/icon/body API), shadcn/ui Alert
 * (composable action slot), Mantine Alert (dismissible + a11y role), and
 * HeroUI Alert (BEM slot structure) — rebuilt on EmberFlow's soft/strong
 * semantic tokens so it stays calm and dark-first rather than adopting any
 * reference library's louder palette.
 *
 * Props:
 *  - variant: 'info' | 'success' | 'warning' | 'danger' | 'neutral'
 *  - title:   short headline (ReactNode)
 *  - icon:    ReactNode to override the default; `false` to suppress
 *  - action:  ReactNode slot for buttons/links under the copy
 *  - onDismiss: optional; when set, renders a close button
 *  - role:    override the derived aria role
 */
export const Alert = forwardRef(function Alert(
  {
    variant = 'info',
    title,
    icon,
    action,
    onDismiss,
    dismissLabel = 'Dismiss',
    role,
    className = '',
    children,
    ...props
  },
  ref
) {
  const DefaultIcon = VARIANT_ICON[variant] || Info;
  const resolvedRole = role || VARIANT_ROLE[variant] || 'status';
  const showIcon = icon !== false;

  const classes = ['alert', `alert--${variant}`, className].filter(Boolean).join(' ');

  return (
    <div ref={ref} className={classes} role={resolvedRole} {...props}>
      {showIcon && (
        <span className="alert__icon" aria-hidden="true">
          {icon || <DefaultIcon size={18} />}
        </span>
      )}
      <div className="alert__body">
        {title ? <p className="alert__title">{title}</p> : null}
        {children ? <div className="alert__description">{children}</div> : null}
        {action ? <div className="alert__action">{action}</div> : null}
      </div>
      {onDismiss ? (
        <button type="button" className="alert__dismiss" onClick={onDismiss} aria-label={dismissLabel}>
          <X size={16} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
});

Alert.displayName = 'Alert';
