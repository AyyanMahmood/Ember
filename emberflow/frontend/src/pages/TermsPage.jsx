import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Scale, ShieldCheck, AlertTriangle, Ban, FileText, CreditCard, ExternalLink } from 'lucide-react';

const sections = [
  {
    id: 'acceptance',
    title: 'Acceptance of Terms',
    content: (
      <p>By accessing or using EmberFlow (&ldquo;the Service&rdquo;), you agree to be bound by these Terms of Service. If you do not agree, you may not use the Service. These terms apply to all users, including free-tier users and paying subscribers.</p>
    ),
  },
  {
    id: 'description',
    title: 'Service Description',
    icon: FileText,
    content: (
      <p>EmberFlow is a web-based financial operations tool for freelancers and small businesses. The Service provides client management, invoicing, proposal creation, payment tracking, and revenue analytics. The Service is accessed via a web browser and requires an internet connection.</p>
    ),
  },
  {
    id: 'accounts',
    title: 'Account Registration &amp; Security',
    icon: ShieldCheck,
    content: (
      <>
        <p>You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must:</p>
        <ul>
          <li>Provide accurate, current, and complete account information.</li>
          <li>Keep your email address up to date so we can reach you about billing and security.</li>
          <li>Notify us immediately of any unauthorized use of your account.</li>
        </ul>
        <p>EmberFlow is not liable for any loss or damage arising from your failure to safeguard your account.</p>
      </>
    ),
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable Use',
    icon: AlertTriangle,
    content: (
      <>
        <p>You agree to use the Service only for lawful purposes and in compliance with all applicable laws. Prohibited activities include:</p>
        <ul>
          <li>Using the Service to store or transmit unlawful, defamatory, or fraudulent content.</li>
          <li>Attempting to bypass authentication, access another user&rsquo;s data, or circumvent row-level security.</li>
          <li>Interfering with the operation of the Service, including submitting excessive API requests or exploiting rate limits.</li>
          <li>Using automated scripts, scrapers, or bots to access the Service without prior written consent.</li>
          <li>Reselling or redistributing the Service or its functionality without authorization.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'subscriptions',
    title: 'Subscriptions &amp; Billing',
    icon: CreditCard,
    content: (
      <>
        <p>EmberFlow offers a Free plan and paid Pro plans (monthly or yearly). Billing terms:</p>
        <ul>
          <li><strong>Free plan:</strong> No payment is required. Usage is limited as described on the pricing page. EmberFlow reserves the right to modify free-tier limits at any time.</li>
          <li><strong>Pro plans:</strong> Payment is processed by <strong>Paddle</strong>. By subscribing, you authorize Paddle to charge your payment method on a recurring basis (monthly or annually, depending on your selection).</li>
          <li><strong>Automatic renewal:</strong> Subscriptions renew automatically unless cancelled before the next billing date. You can cancel at any time from the billing settings page.</li>
          <li><strong>Price changes:</strong> EmberFlow may change subscription pricing with 30 days&rsquo; notice. Price changes take effect at the start of the next billing period.</li>
        </ul>
        <p>All billing disputes and payment inquiries are handled by Paddle. Refunds are governed by the <Link to="/refund">Refund Policy</Link>.</p>
      </>
    ),
  },
  {
    id: 'cancellation',
    title: 'Cancellation &amp; Termination',
    icon: Ban,
    content: (
      <>
        <p><strong>By you:</strong> You may cancel your subscription at any time from the billing settings. Upon cancellation, your plan will revert to the Free tier at the end of the current billing period. You will retain access to your data but may lose access to Pro features.</p>
        <p><strong>By us:</strong> EmberFlow may suspend or terminate your access to the Service if:</p>
        <ul>
          <li>You violate these Terms of Service or the Acceptable Use policy.</li>
          <li>Your payment fails after multiple attempts and remains unresolved for 14 days.</li>
          <li>We are required to do so by law.</li>
        </ul>
        <p>Upon termination, your right to access the Service ceases immediately. Your data will be retained for 30 days after termination, after which it may be permanently deleted. We will provide a copy of your data upon request during this period.</p>
      </>
    ),
  },
  {
    id: 'data-ownership',
    title: 'Data Ownership',
    content: (
      <p>You retain full ownership of all data you enter into EmberFlow&mdash;including client records, invoices, proposals, payment records, and uploaded files. EmberFlow claims no intellectual property rights over your data. You grant EmberFlow a limited license to store, process, and display your data solely to provide the Service to you.</p>
    ),
  },
  {
    id: 'limitation-of-liability',
    title: 'Limitation of Liability',
    icon: Scale,
    content: (
      <>
        <p>To the maximum extent permitted by applicable law:</p>
        <ul>
          <li>EmberFlow is provided &ldquo;as is&rdquo; without warranties of any kind, express or implied, including merchantability or fitness for a particular purpose.</li>
          <li>EmberFlow is not liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service.</li>
          <li>EmberFlow&rsquo;s total liability arising from or related to the Service is limited to the amount you have paid EmberFlow in the 12 months preceding the claim.</li>
          <li>EmberFlow does not provide legal, tax, accounting, or financial advice. You should consult qualified professionals for advice specific to your situation.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'governing-law',
    title: 'Governing Law',
    content: (
      <p>These Terms are governed by the laws of <strong>the State of New York, United States</strong>, without regard to its conflict of laws principles. Any disputes arising under these Terms shall be resolved exclusively in the state or federal courts located in New York County, New York.</p>
    ),
  },
  {
    id: 'third-party',
    title: 'Third-Party Services',
    content: (
      <>
        <p>EmberFlow integrates with the following third-party services. Your use of these services is subject to their respective terms:</p>
        <ul>
          <li><a href="https://supabase.com/legal/terms" target="_blank" rel="noopener noreferrer">Supabase Terms of Service <ExternalLink size={12} /></a> &mdash; authentication and database infrastructure.</li>
          <li><a href="https://www.paddle.com/legal/terms" target="_blank" rel="noopener noreferrer">Paddle Terms of Service <ExternalLink size={12} /></a> &mdash; payment processing and subscription management.</li>
          <li><a href="https://vercel.com/legal/terms" target="_blank" rel="noopener noreferrer">Vercel Terms of Service <ExternalLink size={12} /></a> &mdash; hosting and serverless function execution.</li>
          <li><a href="https://upstash.com/terms" target="_blank" rel="noopener noreferrer">Upstash Terms of Service <ExternalLink size={12} /></a> &mdash; rate-limiting infrastructure.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'changes-to-terms',
    title: 'Changes to These Terms',
    content: (
      <p>EmberFlow may update these Terms of Service at any time. Material changes will be communicated via email to the account holder. Continued use of the Service after the effective date of any changes constitutes acceptance of the updated terms. If you do not agree, you must stop using the Service and cancel your subscription.</p>
    ),
  },
];

export default function TermsPage() {
  useEffect(() => {
    document.title = 'Terms of Service | EmberFlow';
  }, []);

  return (
    <main className="legal-page">
      <p className="eyebrow"><Scale size={14} /> Terms</p>
      <h1>Terms of Service</h1>
      <p className="legal-updated">Last updated: July 2026</p>

      {sections.map(({ id, title, icon: Icon, content }) => (
        <section key={id} id={id} className="legal-section">
          <h2>{Icon ? <Icon size={18} /> : null}{title}</h2>
          {content}
        </section>
      ))}

      <div className="legal-contact-cta">
        <p>
          Questions about these terms? <Link to="/contact">Contact us</Link> or email{' '}
          <a href="mailto:support@emberflow.com">support@emberflow.com</a>.
        </p>
      </div>
    </main>
  );
}
