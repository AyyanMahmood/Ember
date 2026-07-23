import { Link, Outlet } from 'react-router-dom';
import { ThemeToggle } from './ui/ThemeToggle.jsx';

const year = new Date().getFullYear();

export default function PublicLayout() {
  return (
    <div className="marketing-page">
      <header className="marketing-nav">
        <div className="marketing-nav__inner">
          <Link className="brand-mark" to="/">
            EmberFlow
          </Link>
          <nav aria-label="Main">
            <Link to="/features">Features</Link>
            <Link to="/pricing">Pricing</Link>
            <ThemeToggle />
            <Link to="/login">Log in</Link>
            <Link className="button primary" to="/register">
              Start free
            </Link>
          </nav>
        </div>
      </header>
      <Outlet />
      <footer className="marketing-footer">
        <div className="marketing-footer__grid">
          <div className="marketing-footer__brand">
            <Link to="/" className="brand-mark">EmberFlow</Link>
            <p>The finance workspace for independent professionals and small agencies.</p>
          </div>
          <div className="marketing-footer__col">
            <span className="marketing-footer__heading">Product</span>
            <Link to="/features">Features</Link>
            <Link to="/pricing">Pricing</Link>
          </div>
          <div className="marketing-footer__col">
            <span className="marketing-footer__heading">Account</span>
            <Link to="/login">Log in</Link>
            <Link to="/register">Start free</Link>
          </div>
          <div className="marketing-footer__col">
            <span className="marketing-footer__heading">Legal</span>
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/refund">Refunds</Link>
            <Link to="/contact">Contact</Link>
          </div>
        </div>
        <div className="marketing-footer__bottom">
          <span>© {year} EmberFlow. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
