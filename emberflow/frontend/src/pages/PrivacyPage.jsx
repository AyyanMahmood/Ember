import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Database, CreditCard, Cookie, BarChart3, FileText, ExternalLink } from 'lucide-react';

const sections = [
  {
    id: 'information-we-collect',
    title: 'Information We Collect',
    content: (
      <>
        <p>EmberFlow collects and stores only the data necessary to operate the product:</p>
        <ul>
          <li><strong>Account information</strong> &mdash; name, email address, and authentication credentials (handled via Supabase Auth).</li>
          <li><strong>Business profile</strong> &mdash; business name, branding preferences, address, phone number, and currency settings you choose to provide.</li>
          <li><strong>Client data</strong> &mdash; names, email addresses, phone numbers, company names, and notes you add while managing your client relationships.</li>
          <li><strong>Invoice and proposal data</strong> &mdash; itemized line items, amounts, tax rates, discount totals, invoice status, and proposal scope generated through the product.</li>
          <li><strong>Payment records</strong> &mdash; amounts, dates, methods, and references you record against invoices.</li>
          <li><strong>Subscription and billing data</strong> &mdash; plan type, billing cycle, and subscription status (processed through Paddle).</li>
          <li><strong>Usage analytics</strong> &mdash; monthly invoice and client counts for entitlement enforcement.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'how-we-use-your-data',
    title: 'How We Use Your Data',
    content: (
      <>
        <p>Your data is used exclusively to deliver and improve EmberFlow:</p>
        <ul>
          <li>Operate your account, authenticate sessions, and enforce plan limits.</li>
          <li>Display your clients, invoices, proposals, payments, and analytics in the dashboard.</li>
          <li>Generate PDF exports of invoices and proposals you initiate.</li>
          <li>Process subscription payments and manage billing through Paddle.</li>
          <li>Send account-related emails (password reset, billing updates).</li>
        </ul>
        <p>We do not sell, rent, or share your personal data with third parties for their own marketing purposes. We do not train AI models on your data.</p>
      </>
    ),
  },
  {
    id: 'authentication',
    title: 'Authentication',
    icon: Shield,
    content: (
      <>
        <p>Authentication is handled by <strong>Supabase Auth</strong>. EmberFlow stores only the user UUID returned by Supabase; your password is never transmitted to or stored by EmberFlow. Session tokens are managed via HTTP-only cookies or localStorage by the Supabase client library, depending on your browser configuration.</p>
        <p>You can revoke active sessions at any time by signing out or updating your password.</p>
      </>
    ),
  },
  {
    id: 'invoices',
    title: 'Invoices',
    icon: FileText,
    content: (
      <>
        <p>Invoice data&mdash;including line items, amounts, client information, and status&mdash;is stored in your private database schema and isolated by row-level security. Only authenticated users who own the invoice can view or modify it.</p>
        <p>PDF exports are generated entirely in your browser using client-side JavaScript. No invoice data is sent to any external document service.</p>
      </>
    ),
  },
  {
    id: 'payments',
    title: 'Payments',
    icon: CreditCard,
    content: (
      <>
        <p>Payment records you enter (amounts, dates, methods, references) are stored in your private database. EmberFlow does not process or handle credit card numbers. All subscription billing and payment transactions are processed by <strong>Paddle</strong>, our payment processor.</p>
        <p>Paddle receives your email address, name, and billing details at checkout. Their use of your data is governed by the <a href="https://www.paddle.com/legal/privacy" target="_blank" rel="noopener noreferrer">Paddle Privacy Policy <ExternalLink size={12} /></a>.</p>
      </>
    ),
  },
  {
    id: 'analytics',
    title: 'Analytics',
    icon: BarChart3,
    content: (
      <>
        <p>Dashboard analytics (revenue totals, invoice counts, payment summaries, client activity) are computed from your own data and displayed to you only. EmberFlow does not send usage telemetry, click tracking, or behavioral analytics to any third party.</p>
        <p>Infrastructure-level metrics (request counts, error rates, response times) may be collected by Vercel and Supabase for platform operations. These are not tied to individual user records.</p>
      </>
    ),
  },
  {
    id: 'cookies',
    title: 'Cookies',
    icon: Cookie,
    content: (
      <>
        <p>EmberFlow uses minimal cookies and local storage:</p>
        <ul>
          <li><strong>Supabase Auth session</strong> &mdash; a token stored in localStorage or a session cookie to maintain your authenticated session. This is essential for the product to function.</li>
          <li><strong>No tracking cookies</strong> &mdash; we do not deploy analytics scripts, advertising cookies, or third-party tracking pixels.</li>
        </ul>
        <p>You can clear session data by signing out. No cookie consent banner is displayed because EmberFlow does not place non-essential cookies.</p>
      </>
    ),
  },
  {
    id: 'data-storage',
    title: 'Data Storage &amp; Security',
    icon: Database,
    content: (
      <>
        <p>Your data is stored in a <strong>PostgreSQL</strong> database hosted by <strong>Supabase</strong>. Supabase encrypts data at rest and in transit. EmberFlow applies row-level security policies to ensure every query respects ownership boundaries.</p>
        <p>Database backups are managed by Supabase under their standard retention policy. Production operators are responsible for reviewing Supabase's compliance certifications and configuring retention to match their obligations.</p>
      </>
    ),
  },
  {
    id: 'third-party-services',
    title: 'Third-Party Services',
    content: (
      <>
        <p>EmberFlow relies on the following third-party services. Each service processes data only as necessary to deliver its function:</p>
        <ul>
          <li><strong><a href="https://supabase.com/legal/privacy" target="_blank" rel="noopener noreferrer">Supabase <ExternalLink size={12} /></a></strong> &mdash; authentication, database, and file storage. Your account credentials, business data, and uploaded files reside in Supabase infrastructure.</li>
          <li><strong><a href="https://www.paddle.com/legal/privacy" target="_blank" rel="noopener noreferrer">Paddle <ExternalLink size={12} /></a></strong> &mdash; subscription checkout, billing, invoicing, and payment processing. Paddle receives your email, name, and billing details when you purchase a subscription.</li>
          <li><strong><a href="https://vercel.com/legal/privacy" target="_blank" rel="noopener noreferrer">Vercel <ExternalLink size={12} /></a></strong> &mdash; hosting and serverless function execution. Vercel processes HTTP request data and may collect platform-level metrics.</li>
          <li><strong><a href="https://upstash.com/privacy" target="_blank" rel="noopener noreferrer">Upstash <ExternalLink size={12} /></a></strong> &mdash; Redis-based rate limiting. Ephemeral request counters are stored; no personal data is retained.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'data-retention',
    title: 'Data Retention &amp; Deletion',
    content: (
      <>
        <p>Your data is retained for as long as your account is active. If you cancel your subscription, your data remains accessible in read or export capacity until you choose to delete your account.</p>
        <p>Account deletion removes your profile, clients, invoices, proposals, payments, and uploaded files from the active database. Backup copies may persist in Supabase snapshots for up to 30 days. Subscription records held by Paddle are subject to Paddle's retention policy.</p>
        <p>To request account deletion, contact support from your account email.</p>
      </>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to This Policy',
    content: (
      <>
        <p>If this privacy policy is updated, the revision date at the top of this page will change. Continued use of EmberFlow after a revision constitutes acceptance of the updated policy. Material changes may be communicated via email to the account holder.</p>
      </>
    ),
  },
];

export default function PrivacyPage() {
  useEffect(() => {
    document.title = 'Privacy Policy | EmberFlow';
  }, []);

  return (
    <main className="legal-page">
      <p className="eyebrow"><Shield size={14} /> Privacy</p>
      <h1>Privacy Policy</h1>
      <p className="legal-updated">Last updated: July 2026</p>

      {sections.map(({ id, title, icon: Icon, content }) => (
        <section key={id} id={id} className="legal-section">
          <h2>{Icon ? <Icon size={18} /> : null}{title}</h2>
          {content}
        </section>
      ))}

      <div className="legal-contact-cta">
        <p>
          Questions about this policy? <Link to="/contact">Contact us</Link> or email{' '}
          <a href="mailto:support@emberflow.com">support@emberflow.com</a>.
        </p>
      </div>
    </main>
  );
}
