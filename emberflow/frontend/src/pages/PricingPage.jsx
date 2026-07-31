import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button.jsx';
import { PricingCard } from '../components/ui/Card.jsx';
import { Seo } from '../components/Seo.jsx';
import { getPublicPlans } from '../utils/plans.js';

export default function PricingPage() {
  // Rendered from the plan catalog, not a hardcoded set of cards — a new
  // public plan appears here automatically (the grid layout is the only thing
  // a very different plan count would ever need a CSS tweak for).
  const plans = getPublicPlans();

  return (
    <main className="section-band">
      <Seo
        title="Pricing"
        description="Simple, transparent pricing for freelancers and small agencies — a generous free tier and Pro plans starting at $11/month."
        path="/pricing"
      />
      <div className="section-heading">
        <p className="eyebrow">Pricing</p>
        <h1>Simple plans for independent businesses.</h1>
      </div>
      <h2 className="sr-only">Plans</h2>
      <div className="pricing-grid pricing-grid--three">
        {plans.map((plan) => {
          const isFree = plan.tier === 'free';
          return (
            <PricingCard
              key={plan.id}
              name={plan.name}
              price={plan.price}
              period={plan.cadence}
              features={plan.features}
              highlight={plan.highlight}
              cta={
                <Button as={Link} variant={isFree ? 'secondary' : 'primary'} to="/register" fullWidth>
                  {isFree ? 'Start free' : `Start ${plan.shortName.toLowerCase()}`}
                </Button>
              }
            />
          );
        })}
      </div>
    </main>
  );
}
