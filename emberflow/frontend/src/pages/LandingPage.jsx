import { ArrowRight, BarChart3, BriefcaseBusiness, Clock3, FileCheck2, FileText, ShieldCheck, WalletCards } from 'lucide-react';
import { Link } from 'react-router-dom';
import PricingCard from '../components/PricingCard.jsx';
import { PLANS } from '../utils/plans.js';

const features = [
  ['Client CRM', 'Track client records, contact details, notes, and full billing history.', BriefcaseBusiness],
  ['Invoice operations', 'Create itemized invoices with tax, discounts, PDF export, and status tracking.', FileText],
  ['Payment tracking', 'Record payments, reconcile invoice balances, and monitor overdue work.', WalletCards],
  ['Revenue analytics', 'See monthly revenue, pending cash, overdue invoices, and your best clients.', BarChart3],
  ['Proposal builder', 'Package scope, timeline, and pricing into polished proposal PDFs.', FileCheck2],
  ['Secure workspace', 'Supabase Auth, PostgreSQL, and row-level security isolate every account.', ShieldCheck],
];

export default function LandingPage() {
  return (
    <>
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">Freelancer financial OS</p>
          <h1>Run your freelance business like a company.</h1>
          <p>Manage clients, invoices, payments, and revenue from one powerful workspace.</p>
          <div className="hero-actions">
            <Link className="button primary large" to="/register">
              Start free
              <ArrowRight size={18} />
            </Link>
            <Link className="button ghost large" to="/features">
              Explore features
            </Link>
          </div>
        </div>
        <div className="hero-product" aria-label="EmberFlow dashboard preview">
          <div className="preview-window product-shot">
            <div className="preview-toolbar">
              <span />
              <span />
              <span />
            </div>
            <div className="preview-grid">
              <div className="preview-card wide">
                <span>Total revenue</span>
                <strong>$42,860</strong>
              </div>
              <div className="preview-card">
                <span>Paid invoices</span>
                <strong>38</strong>
              </div>
              <div className="preview-card">
                <span>Overdue</span>
                <strong>2</strong>
              </div>
              <div className="preview-table">
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-band two-column">
        <div>
          <p className="eyebrow">Problem</p>
          <h2>Freelance finance usually lives in five disconnected places.</h2>
        </div>
        <p>
          Spreadsheets, inboxes, PDF templates, bank exports, and client notes make it hard to know what has been
          sent, paid, delayed, or worth following up.
        </p>
      </section>

      <section className="section-band two-column">
        <div>
          <p className="eyebrow">Solution</p>
          <h2>One operating system for the money side of client work.</h2>
        </div>
        <p>
          EmberFlow connects your CRM, invoices, proposals, payments, and analytics so every financial workflow starts
          from clean business data.
        </p>
      </section>

      <section id="features" className="section-band">
        <div className="section-heading">
          <p className="eyebrow">Features</p>
          <h2>Built for real freelance operations.</h2>
        </div>
        <div className="feature-grid">
          {features.map(([title, text, Icon]) => (
            <article key={title}>
              <Icon size={24} />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-band">
        <div className="section-heading">
          <p className="eyebrow">Workflow</p>
          <h2>From signed scope to paid invoice.</h2>
        </div>
        <div className="steps-grid">
          {['Add the client', 'Send proposal', 'Create invoice', 'Record payment'].map((step, index) => (
            <article className="step-card" key={step}>
              <span>{index + 1}</span>
              <h3>{step}</h3>
              <p>{index === 0 ? 'Start with durable client data.' : index === 1 ? 'Package scope and pricing.' : index === 2 ? 'Generate a professional PDF.' : 'Keep revenue accurate.'}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-band testimonials">
        <article>
          <p>“EmberFlow gives my consulting work the financial discipline of a much larger firm.”</p>
          <strong>Amina K.</strong>
          <span>Independent product consultant</span>
        </article>
        <article>
          <p>“I know which invoices are late, which clients matter most, and what cash is actually collected.”</p>
          <strong>Daniel R.</strong>
          <span>Web studio owner</span>
        </article>
      </section>

      <section id="pricing" className="pricing-section">
        <div>
          <p className="eyebrow">Pricing</p>
          <h2>Start free. Upgrade when the business needs more room.</h2>
          <p>Free covers the first operating layer. Pro unlocks unlimited scale, proposals, analytics, payment tracking, and branding.</p>
        </div>
        <div className="pricing-grid">
          <PricingCard plan={PLANS.free} actionLabel="Start free" actionTo="/register" />
          <PricingCard plan={PLANS.pro_monthly} highlight actionLabel="Start Pro" actionTo="/register" />
        </div>
      </section>

      <section className="section-band faq-grid">
        <div>
          <p className="eyebrow">FAQ</p>
          <h2>Built to launch without paid APIs.</h2>
        </div>
        <div className="faq-list">
          <article>
            <h3>Can I deploy this on free tiers?</h3>
            <p>Yes. The app is designed for Vercel and Supabase, with Paddle handling paid subscription checkout.</p>
          </article>
          <article>
            <h3>Does invoice export depend on a third party?</h3>
            <p>No. PDFs are generated in the browser and never sent to an external document service.</p>
          </article>
          <article>
            <h3>Is subscription state trusted from the frontend?</h3>
            <p>No. Paddle webhooks update Supabase, and the app reads subscription status from the database.</p>
          </article>
        </div>
      </section>

      <section className="final-cta">
        <Clock3 size={28} />
        <h2>Give your freelance business a real finance workspace.</h2>
        <Link className="button primary large" to="/register">
          Create your workspace
        </Link>
      </section>

      <footer className="marketing-footer">
        <Link to="/">EmberFlow</Link>
        <Link to="/terms">Terms</Link>
        <Link to="/privacy">Privacy</Link>
      </footer>
    </>
  );
}
