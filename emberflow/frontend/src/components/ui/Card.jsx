import { forwardRef } from 'react';

export const Card = forwardRef(function Card({
  children,
  className = '',
  variant = 'default',
  padding = true,
  ...props
}, ref) {
  const variantClasses = {
    default: 'panel',
    strong: 'panel panel--strong',
    elevated: 'panel panel--elevated',
    interactive: 'panel panel--interactive',
    none: '',
  };

  const classes = [
    variantClasses[variant] || variantClasses.default,
    padding ? '' : 'p-0',
    className,
  ].filter(Boolean).join(' ');

  return (
    <section ref={ref} className={classes} {...props}>
      {children}
    </section>
  );
});

Card.displayName = 'Card';

export const CardHeader = forwardRef(function CardHeader({
  title,
  subtitle,
  action,
  className = '',
  ...props
}, ref) {
  return (
    <div ref={ref} className={`panel__header ${className}`.trim()} {...props}>
      <div>
        {title && <h3 className="panel__title">{title}</h3>}
        {subtitle && <p className="panel__subtitle">{subtitle}</p>}
      </div>
      {action && <div className="panel__actions">{action}</div>}
    </div>
  );
});

CardHeader.displayName = 'CardHeader';

export const CardBody = forwardRef(function CardBody({
  children,
  className = '',
  ...props
}, ref) {
  return (
    <div ref={ref} className={`panel__body ${className}`.trim()} {...props}>
      {children}
    </div>
  );
});

CardBody.displayName = 'CardBody';

export const CardFooter = forwardRef(function CardFooter({
  children,
  className = '',
  ...props
}, ref) {
  return (
    <div ref={ref} className={`panel__footer ${className}`.trim()} {...props}>
      {children}
    </div>
  );
});

CardFooter.displayName = 'CardFooter';

export const StatCard = function StatCard({
  label,
  value,
  note,
  trend,
  trendLabel,
  className = '',
  ...props
}) {
  const trendClass = trend ? `stat-card__trend stat-card__trend--${trend}` : '';

  return (
    <article className={`stat-card ${className}`.trim()} {...props}>
      <span className="stat-card__label">{label}</span>
      <strong className="stat-card__value">{value}</strong>
      {note && <small className="stat-card__note">{note}</small>}
      {(trend || trendLabel) && (
        <span className={trendClass}>
          {trend && <span aria-hidden="true">{trend === 'positive' ? '▲' : trend === 'negative' ? '▼' : '—'}</span>}
          {trendLabel}
        </span>
      )}
    </article>
  );
};

export const FeatureCard = function FeatureCard({
  icon,
  title,
  description,
  children,
  className = '',
  ...props
}) {
  return (
    <article className={`feature-card ${className}`.trim()} {...props}>
      {icon && <div className="feature-card__icon" aria-hidden="true">{icon}</div>}
      {title && <h4 className="feature-card__title">{title}</h4>}
      {description && <p className="feature-card__description">{description}</p>}
      {children}
    </article>
  );
};

export const PricingCard = function PricingCard({
  name,
  price,
  period,
  features = [],
  highlight = false,
  cta,
  className = '',
  ...props
}) {
  return (
    <article className={`pricing-card ${highlight ? 'pricing-card--highlight' : ''} ${className}`.trim()} {...props}>
      <header>
        <h3 className="pricing-card__name">{name}</h3>
        <div className="pricing-card__price">
          {price}
          {period && <span className="pricing-card__period">/{period}</span>}
        </div>
      </header>
      <ul className="pricing-card__features">
        {features.map((feature, index) => (
          <li key={index}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {feature}
          </li>
        ))}
      </ul>
      {cta && <div className="pricing-card__cta">{cta}</div>}
    </article>
  );
};