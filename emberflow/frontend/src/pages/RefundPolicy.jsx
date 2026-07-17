import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { RotateCcw, CreditCard, CalendarX, HelpCircle } from 'lucide-react';

export default function RefundPolicy() {
  useEffect(() => {
    document.title = 'Refund Policy | EmberFlow';
  }, []);

  return (
    <main className="legal-page">
      <p className="eyebrow"><RotateCcw size={14} /> Refunds</p>
      <h1>Refund Policy</h1>
      <p className="legal-updated">Last updated: July 2026</p>

      <section className="legal-section">
        <h2><CreditCard size={18} /> Subscription Refunds</h2>
        <p>
          EmberFlow offers both monthly and yearly subscription plans. Because the
          Service is delivered immediately upon payment, all subscription charges
          are <strong>non-refundable</strong> except as described below.
        </p>
        <ul>
          <li>
            <strong>Monthly subscriptions:</strong> If you cancel your monthly
            subscription, access to Pro features continues until the end of the
            current billing period. No partial or prorated refunds are issued for
            the remaining days in the billing period.
          </li>
          <li>
            <strong>Yearly subscriptions:</strong> If you cancel your yearly
            subscription, access to Pro features continues until the end of the
            current billing period. No partial or prorated refunds are issued for
            the remaining months in the billing period.
          </li>
        </ul>
      </section>

      <section className="legal-section">
        <h2><CalendarX size={18} /> Cancellations</h2>
        <p>
          You can cancel your subscription at any time from the billing settings page
          inside the application. Upon cancellation:
        </p>
        <ul>
          <li>Your subscription remains active until the end of the current billing period.</li>
          <li>Your account reverts to the Free plan at the end of the billing period.</li>
          <li>No further charges will be made.</li>
          <li>You retain full access to your data. Pro features will be disabled.</li>
        </ul>
      </section>

      <section className="legal-section">
        <h2><HelpCircle size={18} /> Exceptional Circumstances</h2>
        <p>
          In the event of a billing error, duplicate charge, or extended Service
          outage (more than 48 consecutive hours of core functionality being
          unavailable), we may issue a refund at our discretion. Please contact
          support with your account details and the circumstances of the issue.
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
          To request a refund under the exceptional circumstances described above,
          email <a href="mailto:support@emberflow.com">support@emberflow.com</a> from
          the email address associated with your account. Include your account details
          and a description of the issue. We will respond within 48 hours.
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
