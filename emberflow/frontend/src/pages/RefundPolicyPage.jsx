import { Link } from 'react-router-dom';
import { RotateCcw, CreditCard, CalendarX, HelpCircle } from 'lucide-react';
import { Seo } from '../components/Seo.jsx';
import { COMPANY } from '../data/company.js';

export default function RefundPolicyPage() {
  return (
    <main className="legal-page">
      <Seo
        title="Refund Policy"
        description="EmberFlow's refund policy for Pro subscriptions and billing disputes."
        path="/refund"
        breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Refund Policy' }]}
      />
      <p className="eyebrow"><RotateCcw size={14} /> Refunds</p>
      <h1>Refund Policy</h1>
      <p className="legal-updated">Last updated: August 2026</p>

      <section className="legal-section">
        <h2><CreditCard size={18} /> 7-Day Refund Window</h2>
        <p>
          EmberFlow offers both monthly and yearly subscription plans. If you're not
          satisfied, you can request a full refund within <strong>7 calendar days of
          your purchase date</strong> &mdash; this applies equally to monthly and
          yearly subscriptions, and to your first payment as well as any renewal
          charge. <strong>After 7 days, that charge is no longer eligible for a
          refund.</strong> Cancelling your subscription is always free and available
          at any time (see Cancellations below); it just doesn't return money outside
          this window.
        </p>
        <p>
          Refunds aren't self-service &mdash; there's no automatic "refund" button.
          Request one from EmberFlow Support (or, where available, directly through
          Polar, our billing provider) and we'll process it by hand. See "How to
          Request a Refund" below.
        </p>
      </section>

      <section className="legal-section">
        <h2><CalendarX size={18} /> Cancellations</h2>
        <p>
          You can cancel your subscription at any time from the billing settings page
          inside the application &mdash; independent of, and not required for, a
          refund request. Upon cancellation:
        </p>
        <ul>
          <li>Your subscription remains active until the end of the current billing period.</li>
          <li>Your account reverts to the Free plan at the end of the billing period.</li>
          <li>No further charges will be made.</li>
          <li>You retain full access to your data. Pro features will be disabled.</li>
        </ul>
        <p>
          Cancelling on its own does not issue a refund for the current period. If
          you're within 7 days of the charge and want your money back, request a
          refund instead (or in addition).
        </p>
      </section>

      <section className="legal-section">
        <h2><HelpCircle size={18} /> Billing Errors &amp; Duplicate Charges</h2>
        <p>
          Separately from the refund window above, if we charge you in error &mdash;
          a duplicate charge or a billing system mistake &mdash; we'll always correct
          it, regardless of how much time has passed. This is a correction of our
          mistake, not a discretionary refund. Contact support with your account
          details and the circumstances of the issue.
        </p>
      </section>

      <section className="legal-section">
        <h2>Free Plan</h2>
        <p>
          The Free plan has no associated charges. No refunds apply because no
          payment is collected.
        </p>
      </section>

      <section className="legal-section">
        <h2>How to Request a Refund</h2>
        <p>
          Email <a href={`mailto:${COMPANY.supportEmail}`}>{COMPANY.supportEmail}</a> from
          the email address associated with your account, within 7 calendar days of
          the charge. Include your account details and the charge you'd like
          refunded. We'll confirm eligibility and process it manually (through Polar,
          our billing provider) &mdash; we'll respond within 48 hours.
        </p>
      </section>

      <div className="legal-contact-cta">
        <p>
          Have billing questions? Visit our <Link to="/contact">Contact page</Link> or{' '}
          <Link to="/terms">Terms of Service</Link>.
        </p>
      </div>
    </main>
  );
}
