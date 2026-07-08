import { ArrowRight, CheckCircle2, FileText, ShieldCheck, WalletCards } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="marketing-page">
      <header className="marketing-nav">
        <Link className="brand-mark" to="/">
          EmberFlow
        </Link>
        <nav>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <Link className="button ghost" to="/login">
            Login
          </Link>
          <Link className="button primary" to="/signup">
            Start free
          </Link>
        </nav>
      </header>

      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">Freelance finance, kept clean</p>
          <h1>EmberFlow</h1>
          <p>
            Manage clients, invoices, proposals, and payments in one calm workspace built for independent
            professionals.
          </p>
          <div className="hero-actions">
            <Link className="button primary large" to="/signup">
              Create your workspace
              <ArrowRight size={18} />
            </Link>
            <Link className="button ghost large" to="/login">
              Sign in
            </Link>
          </div>
        </div>
        <div className="hero-product" aria-label="EmberFlow dashboard preview">
          <div className="preview-window">
            <div className="preview-toolbar">
              <span />
              <span />
              <span />
            </div>
            <div className="preview-grid">
              <div className="preview-card wide">
                <span>Total revenue</span>
                <strong>$18,420</strong>
              </div>
              <div className="preview-card">
                <span>Paid</span>
                <strong>24</strong>
              </div>
              <div className="preview-card">
                <span>Pending</span>
                <strong>6</strong>
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

      <section id="features" className="section-band">
        <div className="section-heading">
          <p className="eyebrow">Everything connected</p>
          <h2>From first proposal to paid invoice.</h2>
        </div>
        <div className="feature-grid">
          <article>
            <WalletCards size={24} />
            <h3>Revenue dashboard</h3>
            <p>Track paid revenue, pending invoices, client count, and recent activity from live Supabase data.</p>
          </article>
          <article>
            <FileText size={24} />
            <h3>Invoices and PDFs</h3>
            <p>Create itemized invoices with taxes, due dates, status tracking, and professional PDF export.</p>
          </article>
          <article>
            <ShieldCheck size={24} />
            <h3>Secure by default</h3>
            <p>Supabase Auth and row-level security keep every freelancer's workspace isolated.</p>
          </article>
        </div>
      </section>

      <section id="pricing" className="pricing-section">
        <div>
          <p className="eyebrow">Simple pricing</p>
          <h2>Free to run on free-tier infrastructure.</h2>
          <p>Deploy to Vercel and connect Supabase. No paid APIs, no external billing dependency, no AI services.</p>
        </div>
        <div className="pricing-card">
          <span>Starter</span>
          <strong>$0</strong>
          <p>For freelancers getting organized.</p>
          <ul>
            <li>
              <CheckCircle2 size={16} /> Clients
            </li>
            <li>
              <CheckCircle2 size={16} /> Invoices
            </li>
            <li>
              <CheckCircle2 size={16} /> Proposals
            </li>
          </ul>
          <Link className="button primary full" to="/signup">
            Start free
          </Link>
        </div>
      </section>
    </div>
  );
}
