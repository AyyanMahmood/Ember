import { useEffect } from 'react';
import { Mail, MapPin, Clock, MessageSquare, ExternalLink } from 'lucide-react';

export default function ContactPage() {
  useEffect(() => {
    document.title = 'Contact | EmberFlow';
  }, []);

  return (
    <main className="legal-page">
      <p className="eyebrow"><MessageSquare size={14} /> Contact</p>
      <h1>Get in Touch</h1>
      <p className="legal-subtitle">
        We&rsquo;re here to help. Reach out using any of the methods below and
        we&rsquo;ll get back to you within 48 hours.
      </p>

      <div className="contact-methods">
        <div className="contact-card">
          <Mail size={24} />
          <h2>Email</h2>
          <p>Send us a message any time.</p>
          <a className="button primary" href="mailto:support@emberflow.com">
            support@emberflow.com
          </a>
        </div>

        <div className="contact-card">
          <MapPin size={24} />
          <h2>Location</h2>
          <p>EmberFlow Inc.<br />New York, NY</p>
        </div>

        <div className="contact-card">
          <Clock size={24} />
          <h2>Response Time</h2>
          <p>We aim to respond to all inquiries within <strong>48 hours</strong> during regular business days.</p>
        </div>
      </div>

      <section className="legal-section">
        <h2>Before You Reach Out</h2>
        <ul>
          <li>
            <strong>Billing or subscription questions?</strong> Visit the billing
            settings page inside your account. You can view your plan, update your
            payment method, and download invoices there.
          </li>
          <li>
            <strong>Need account help?</strong> Make sure you&rsquo;re signed in
            with the correct email address and check our <a href="https://supabase.com/docs" target="_blank" rel="noopener noreferrer">platform documentation <ExternalLink size={12} /></a> for Supabase-specific issues.
          </li>
          <li>
            <strong>Report a bug?</strong> Include your browser version, steps to
            reproduce, and any error messages you see. Screenshots are helpful.
          </li>
        </ul>
      </section>
    </main>
  );
}
