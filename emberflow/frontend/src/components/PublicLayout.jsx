import { Link, Outlet } from 'react-router-dom';
import { ThemeToggle } from './ui/ThemeToggle.jsx';

export default function PublicLayout() {
  return (
    <div className="marketing-page">
      <header className="marketing-nav">
        <Link className="brand-mark" to="/">
          EmberFlow
        </Link>
        <nav>
          <Link to="/features">Features</Link>
          <Link to="/pricing">Pricing</Link>
          <ThemeToggle />
          <Link to="/login">Login</Link>
          <Link className="button primary" to="/register">
            Register
          </Link>
        </nav>
      </header>
      <Outlet />
      <footer className="marketing-footer">
        <Link to="/">EmberFlow</Link>
        <Link to="/terms">Terms</Link>
        <Link to="/privacy">Privacy</Link>
        <Link to="/refund">Refunds</Link>
        <Link to="/contact">Contact</Link>
      </footer>
    </div>
  );
}
