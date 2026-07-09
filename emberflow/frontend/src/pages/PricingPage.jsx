import PricingCard from '../components/PricingCard.jsx';
import { PLANS } from '../utils/plans.js';

export default function PricingPage() {
  return (
    <main className="section-band">
      <div className="section-heading">
        <p className="eyebrow">Pricing</p>
        <h1>Simple plans for independent businesses.</h1>
      </div>
      <div className="pricing-grid three">
        <PricingCard plan={PLANS.free} actionLabel="Start free" actionTo="/register" />
        <PricingCard plan={PLANS.pro_monthly} highlight actionLabel="Start monthly" actionTo="/register" />
        <PricingCard plan={PLANS.pro_yearly} actionLabel="Start yearly" actionTo="/register" />
      </div>
    </main>
  );
}
