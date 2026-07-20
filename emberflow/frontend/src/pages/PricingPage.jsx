import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button.jsx';
import { PricingCard } from '../components/ui/Card.jsx';
import { PLANS } from '../utils/plans.js';

export default function PricingPage() {
  return (
    <main className="section-band">
      <div className="section-heading">
        <p className="eyebrow">Pricing</p>
        <h1>Simple plans for independent businesses.</h1>
      </div>
      <div className="pricing-grid--three">
        <PricingCard
          name={PLANS.free.name}
          price={PLANS.free.price}
          period={PLANS.free.cadence}
          features={PLANS.free.features}
          cta={<Button as={Link} variant="secondary" to="/register" fullWidth>Start free</Button>}
        />
        <PricingCard
          name={PLANS.pro_monthly.name}
          price={PLANS.pro_monthly.price}
          period={PLANS.pro_monthly.cadence}
          features={PLANS.pro_monthly.features}
          highlight
          cta={<Button as={Link} variant="primary" to="/register" fullWidth>Start monthly</Button>}
        />
        <PricingCard
          name={PLANS.pro_yearly.name}
          price={PLANS.pro_yearly.price}
          period={PLANS.pro_yearly.cadence}
          features={PLANS.pro_yearly.features}
          cta={<Button as={Link} variant="primary" to="/register" fullWidth>Start yearly</Button>}
        />
      </div>
    </main>
  );
}
