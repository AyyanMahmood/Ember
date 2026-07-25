import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ThemeToggle } from './ui/ThemeToggle.jsx';
import { scrollToId } from '../utils/scroll.js';

const year = new Date().getFullYear();
const SECTION_IDS = ['features', 'pricing'];

export default function PublicLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    if (!isHome || typeof IntersectionObserver === 'undefined') {
      setActiveSection('');
      return undefined;
    }
    const elements = SECTION_IDS.map((id) => document.getElementById(id)).filter(Boolean);
    if (elements.length === 0) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [isHome, location.pathname]);

  function handleSectionNav(id) {
    return (event) => {
      if (isHome) {
        event.preventDefault();
        scrollToId(id);
        navigate(`/#${id}`, { replace: true });
      }
    };
  }

  return (
    <div className="marketing-page">
      <header className="marketing-nav">
        <div className="marketing-nav__inner">
          <Link className="brand-mark" to="/">
            EmberFlow
          </Link>
          <nav aria-label="Main">
            <Link
              to="/#features"
              onClick={handleSectionNav('features')}
              className={activeSection === 'features' ? 'active' : ''}
              aria-current={activeSection === 'features' ? 'true' : undefined}
            >
              Features
            </Link>
            <Link
              to="/#pricing"
              onClick={handleSectionNav('pricing')}
              className={activeSection === 'pricing' ? 'active' : ''}
              aria-current={activeSection === 'pricing' ? 'true' : undefined}
            >
              Pricing
            </Link>
            <Link to="/login">Log in</Link>
            <Link className="button primary" to="/register">
              Start free
            </Link>
            <ThemeToggle className="marketing-nav__theme-toggle" />
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
