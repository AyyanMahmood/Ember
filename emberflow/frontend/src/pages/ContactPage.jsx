import { Mail, MapPin, Clock, MessageSquare, ExternalLink } from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Seo } from '../components/Seo.jsx';
import { COMPANY } from '../data/company.js';

export default function ContactPage() {
  const siteUrl = (import.meta.env.VITE_APP_URL || window.location.origin).replace(/\/$/, '');
  const contactJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'Contact EmberFlow',
    url: `${siteUrl}/contact`,
    about: {
      '@type': 'Organization',
      name: COMPANY.name,
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: COMPANY.supportEmail,
        areaServed: 'Worldwide',
        availableLanguage: 'English',
      },
    },
  };

  return (
    <main className="legal-page">
      <Seo
        title="Contact"
        description="Get in touch with the EmberFlow team for support, billing, or general questions."
        path="/contact"
        breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Contact' }]}
        jsonLd={contactJsonLd}
      />
      <p className="eyebrow"><MessageSquare size={14} /> Contact</p>
      <h1>Get in Touch</h1>
      <p className="legal-subtitle">
        We&rsquo;re here to help. Reach out using any of the methods below and
        we&rsquo;ll get back to you within 48 hours.
      </p>

      <div className="contact-methods">
        <Card variant="default">
          <h2><Mail size={18} aria-hidden="true" /> Email</h2>
          <p>Send us a message any time.</p>
          <Button as="a" variant="primary" href={`mailto:${COMPANY.supportEmail}`}>
            {COMPANY.supportEmail}
          </Button>
        </Card>

        <Card variant="default">
          <h2><MapPin size={18} aria-hidden="true" /> Location</h2>
          <p>{COMPANY.name}<br />{COMPANY.address}</p>
        </Card>

        <Card variant="default">
          <h2><Clock size={18} aria-hidden="true" /> Response Time</h2>
          <p>We aim to respond to all inquiries within <strong>48 hours</strong> during regular business days.</p>
        </Card>
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
