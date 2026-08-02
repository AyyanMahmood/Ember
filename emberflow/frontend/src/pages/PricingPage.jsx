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

  const siteUrl = (import.meta.env.VITE_APP_URL || window.location.origin).replace(/\/$/, '');
  // SoftwareApplication (matching the homepage's schema — same real entity,
  // same Google-documented type for software pricing), not Product: Google's
  // Product structured data is oriented toward retail/Merchant listings and
  // expects `image` plus `review`/`aggregateRating` for full rich-result
  // eligibility — EmberFlow has neither, and fabricating either is exactly
  // what this audit was told never to do. Offers are sourced from the same
  // plan catalog the pricing cards render from, so this can't silently drift
  // from what's actually charged.
  const pricingJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'EmberFlow',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: 'EmberFlow invoicing and proposal software for freelancers, with Free and Pro plans.',
    url: `${siteUrl}/pricing`,
    offers: plans.map((plan) => ({
      '@type': 'Offer',
      name: plan.name,
      // plan.priceValue is the raw number (e.g. 11) -- plan.price is the
      // pre-formatted *display* string (e.g. "$11") the pricing cards show.
      // schema.org/Offer's `price` must be a bare number; priceCurrency
      // conveys the currency separately.
      price: String(plan.priceValue),
      priceCurrency: plan.currency,
      url: `${siteUrl}/pricing`,
      availability: 'https://schema.org/InStock',
    })),
  };

  return (
    <main className="section-band">
      <Seo
        title="Pricing"
        description="Simple, transparent pricing for freelancer invoicing software — a generous free tier (5 invoices/month, 10 clients) and Pro plans starting at $11/month."
        path="/pricing"
        breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Pricing' }]}
        jsonLd={pricingJsonLd}
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
                <Button
                  as={Link}
                  variant={isFree ? 'secondary' : 'primary'}
                  to={isFree ? '/register' : `/register?plan=${plan.id}`}
                  fullWidth
                >
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
