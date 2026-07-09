import { CheckCircle2 } from 'lucide-react';
import Button from './Button.jsx';

export default function PricingCard({ plan, highlight = false, actionLabel, onAction, actionTo }) {
  const Component = actionTo ? 'a' : 'button';
  const actionProps = actionTo ? { href: actionTo } : { type: 'button', onClick: onAction };

  return (
    <article className={`pricing-card ${highlight ? 'highlight' : ''}`}>
      <span>{plan.name}</span>
      <strong>{plan.price}</strong>
      <p>{plan.cadence}</p>
      <ul>
        {plan.features.map((feature) => (
          <li key={feature}>
            <CheckCircle2 size={16} />
            {feature}
          </li>
        ))}
      </ul>
      {actionLabel ? (
        <Button as={Component} variant={highlight ? 'primary' : 'ghost'} className="full" {...actionProps}>
          {actionLabel}
        </Button>
      ) : null}
    </article>
  );
}
