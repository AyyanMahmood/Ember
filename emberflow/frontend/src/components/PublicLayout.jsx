import { Link, Outlet } from 'react-router-dom';

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
          <Link to="/login">Login</Link>
          <Link className="button primary" to="/register">
            Register
          </Link>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
