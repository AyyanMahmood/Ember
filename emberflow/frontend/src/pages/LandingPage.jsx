import { ArrowRight, Lock, ShieldCheck, SquareCode } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/Button.jsx';
import { StatusBadge } from '../components/ui/Badge.jsx';
import { PricingCard } from '../components/ui/Card.jsx';
import { Seo } from '../components/Seo.jsx';
import { FEATURES } from '../data/features.js';
import { getPublicPlans } from '../utils/plans.js';
import { scrollToId } from '../utils/scroll.js';

function Reveal({ children, className = '', delay = 0, as: Tag = 'div', ...props }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`lp-reveal ${visible ? 'lp-reveal--visible' : ''} ${className}`.trim()}
      style={{ transitionDelay: `${delay}ms` }}
      {...props}
    >
      {children}
    </Tag>
  );
}

const workflow = [
  ['Add the client', 'Start with durable client data — contact details, company, and notes.'],
  ['Send a proposal', 'Package scope, timeline, and pricing into a polished PDF.'],
  ['Create the invoice', 'Turn agreed scope into an itemized invoice in a few clicks.'],
  ['Record the payment', 'Reconcile what is owed against what has actually cleared.'],
];

const trustPoints = [
  [Lock, 'Row-level security by default', 'Every table is scoped to its owner in Postgres itself — not just enforced in application code.'],
  [SquareCode, 'PDFs render in your browser', 'Invoices and proposals are generated client-side. Nothing is sent to a third-party document service.'],
  [ShieldCheck, 'Billing state you can trust', 'Subscription status comes from signed Polar webhooks written to the database, never trusted from the client.'],
];

const faqs = [
  ['Can I deploy this on free tiers?', 'Yes. The app is designed for Vercel and Supabase, with Polar handling paid subscription checkout.'],
  ['Does invoice export depend on a third party?', 'No. PDFs are generated in the browser and never sent to an external document service.'],
  ['Is subscription state trusted from the frontend?', 'No. Polar webhooks update Supabase, and the app reads subscription status from the database.'],
  ['What happens when I hit the free plan limits?', 'You keep everything you have already created — you just upgrade to Pro to add more invoices or clients.'],
];

export default function LandingPage() {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.slice(1);
    // Wait a frame so the freshly-mounted layout has settled before measuring
    // scroll position (otherwise this can land short on first paint).
    const frame = requestAnimationFrame(() => scrollToId(id));
    return () => cancelAnimationFrame(frame);
  }, [location.hash]);

  return (
    <>
      <Seo
        description="EmberFlow is the finance operating system for freelancers — clients, invoices, proposals, and payments in one workspace."
        path="/"
      />
      <section className="lp-hero">
        <div className="lp-hero__grid">
          <Reveal>
            <p className="overline lp-hero__eyebrow">For independent professionals &amp; small agencies</p>
            <h1 className="display-lg lp-hero__title">Run your freelance business like a company.</h1>
            <p className="lp-hero__subtitle">
              Clients, invoices, proposals, payments, and revenue — in one calm workspace built for the work you
              actually do, not another dashboard you have to configure.
            </p>
            <div className="lp-hero__actions">
              <Button as={Link} to="/register" variant="primary" size="lg" rightIcon={<ArrowRight size={18} />}>
                Start free
              </Button>
              <Button as={Link} to="/features" variant="secondary" size="lg">
                Explore features
              </Button>
            </div>
            <p className="lp-hero__note">Free forever for 5 invoices a month. No card required.</p>
          </Reveal>

          <Reveal delay={120}>
            <div className="lp-glimpse" aria-hidden="true">
              <div className="lp-glimpse-card">
                <div className="lp-glimpse-card__head">
                  <span className="lp-glimpse-card__title">Recent invoices</span>
                  <span className="lp-glimpse-card__meta">This month</span>
                </div>
                <div className="lp-glimpse-row">
                  <div className="lp-glimpse-row__client">
                    <strong>Nine Studio</strong>
                    <span>INV-1042 · Design retainer</span>
                  </div>
                  <StatusBadge status="paid" size="sm" />
                </div>
                <div className="lp-glimpse-row">
                  <div className="lp-glimpse-row__client">
                    <strong>Arclight Labs</strong>
                    <span>INV-1041 · Brand system</span>
                  </div>
                  <StatusBadge status="sent" size="sm" />
                </div>
                <div className="lp-glimpse-row">
                  <div className="lp-glimpse-row__client">
                    <strong>Field &amp; Co.</strong>
                    <span>INV-1039 · Website build</span>
                  </div>
                  <StatusBadge status="overdue" size="sm" />
                </div>
              </div>

              <div className="lp-glimpse-card lp-glimpse-card--offset">
                <div className="lp-glimpse-card__head">
                  <span className="lp-glimpse-card__title">Proposal sent</span>
                  <span className="lp-glimpse-card__meta">Just now</span>
                </div>
                <div className="lp-glimpse-row">
                  <div className="lp-glimpse-row__client">
                    <strong>Quarterly retainer</strong>
                    <span>Monthly engagement</span>
                  </div>
                  <span className="lp-glimpse-row__amount">$3,000.00</span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <Reveal as="section" className="lp-section lp-section--tight">
        <div className="lp-why__grid">
          <div>
            <p className="overline">Why EmberFlow</p>
            <h2 className="heading-xl">Freelance finance shouldn't live in five different tabs.</h2>
          </div>
          <p>
            Spreadsheets, inboxes, PDF templates, bank exports, and scattered client notes make it hard to know
            what's been sent, paid, delayed, or worth following up on. EmberFlow connects your CRM, invoices,
            proposals, payments, and analytics so every financial workflow starts from the same clean data.
          </p>
        </div>
      </Reveal>

      <Reveal as="section" id="features" className="lp-section">
        <div className="lp-section__head lp-section__head--center">
          <p className="overline lp-section__eyebrow">Features</p>
          <h2 className="heading-xl lp-section__title">Built for real freelance operations.</h2>
        </div>
        <div className="lp-features__grid">
          {FEATURES.map(([title, text, Icon]) => (
            <article className="lp-feature-card" key={title}>
              <div className="lp-feature-card__icon"><Icon size={22} /></div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </Reveal>

      <Reveal as="section" className="lp-section">
        <div className="lp-section__head lp-section__head--center">
          <p className="overline lp-section__eyebrow">Workflow</p>
          <h2 className="heading-xl lp-section__title">From signed scope to paid invoice.</h2>
        </div>
        <div className="lp-workflow__grid">
          {workflow.map(([title, text], index) => (
            <div className="lp-workflow-step" key={title}>
              <span className="lp-workflow-step__index">{String(index + 1).padStart(2, '0')}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal as="section" className="lp-section">
        <div className="lp-section__head lp-section__head--center">
          <p className="overline lp-section__eyebrow">How it's built</p>
          <h2 className="heading-xl lp-section__title">Engineered with the same discipline as your invoices.</h2>
        </div>
        <div className="lp-trust__grid">
          {trustPoints.map(([Icon, title, text]) => (
            <div className="lp-trust-item" key={title}>
              <div className="lp-trust-item__icon"><Icon size={20} /></div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal as="section" id="pricing" className="lp-section">
        <div className="lp-section__head lp-section__head--center">
          <p className="overline lp-section__eyebrow">Pricing</p>
          <h2 className="heading-xl lp-section__title">Start free. Upgrade when the business needs more room.</h2>
          <p className="lp-section__lead">
            Free covers the first operating layer. Pro unlocks unlimited scale, proposals, analytics, payment
            tracking, and branding.
          </p>
        </div>
        <div className="lp-pricing__grid">
          {/* Teaser: the free tier + the highlighted paid plan, from the
              catalog. A different headline plan is a catalog flag, not an edit. */}
          {getPublicPlans()
            .filter((plan) => plan.tier === 'free' || plan.highlight)
            .map((plan) => {
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
                      {isFree ? 'Start free' : 'Start Pro'}
                    </Button>
                  }
                />
              );
            })}
        </div>
      </Reveal>

      <Reveal as="section" id="faq" className="lp-section lp-section--tight">
        <div className="lp-section__head">
          <p className="overline lp-section__eyebrow">FAQ</p>
          <h2 className="heading-xl lp-section__title">Built to launch without paid APIs.</h2>
        </div>
        <div className="lp-faq__grid">
          {faqs.map(([question, answer]) => (
            <div className="lp-faq-item" key={question}>
              <h3>{question}</h3>
              <p>{answer}</p>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal as="section" className="lp-cta">
        <div className="lp-cta__panel">
          <h2 className="heading-xl">Give your freelance business a real finance workspace.</h2>
          <Button as={Link} to="/register" variant="primary" size="lg" rightIcon={<ArrowRight size={18} />}>
            Create your workspace
          </Button>
        </div>
      </Reveal>
    </>
  );
}
