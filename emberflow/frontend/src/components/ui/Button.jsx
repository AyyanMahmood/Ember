import { forwardRef } from 'react';

const variantClasses = {
  primary: 'button--primary',
  secondary: 'button--secondary',
  ghost: 'button--ghost',
  danger: 'button--danger',
  success: 'button--success',
  warning: 'button--warning',
};

const sizeClasses = {
  sm: 'button--sm',
  md: 'button--md',
  lg: 'button--lg',
};

export const Button = forwardRef(function Button({
  as: Component = 'button',
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  disabled,
  loading,
  leftIcon,
  rightIcon,
  children,
  ...props
}, ref) {
  const classes = [
    'button',
    variantClasses[variant] || variantClasses.primary,
    sizeClasses[size] || sizeClasses.md,
    fullWidth ? 'button--full' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <Component
      ref={ref}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <span className="spinner spinner--sm" role="status" aria-label="Loading" />
      ) : (
        <>
          {leftIcon && <span aria-hidden="true">{leftIcon}</span>}
          {children}
          {rightIcon && <span aria-hidden="true">{rightIcon}</span>}
        </>
      )}
    </Component>
  );
});

Button.displayName = 'Button';

export const IconButton = forwardRef(function IconButton({
  size = 'md',
  className = '',
  children,
  'aria-label': ariaLabel,
  ...props
}, ref) {
  const sizeMap = {
    sm: 'icon-button--sm',
    md: '',
    lg: 'icon-button--lg',
  };

  const classes = ['icon-button', sizeMap[size], className].filter(Boolean).join(' ');

  return (
    <button
      ref={ref}
      className={classes}
      aria-label={ariaLabel}
      {...props}
    >
      {children}
    </button>
  );
});

IconButton.displayName = 'IconButton';