import { BarChart3, FileText, Home, LineChart, LogOut, Menu, Settings, Users, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useProfile } from '../hooks/useProfile.js';
import { Avatar } from './ui/Avatar.jsx';
import { Button } from './ui/Button.jsx';
import { ThemeToggle } from './ui/ThemeToggle.jsx';

const navItems = [
  { to: '/app', label: 'Dashboard', icon: Home, end: true },
  { to: '/app/clients', label: 'Clients', icon: Users },
  { to: '/app/invoices', label: 'Invoices', icon: FileText },
  { to: '/app/proposals', label: 'Proposals', icon: BarChart3 },
  { to: '/app/analytics', label: 'Analytics', icon: LineChart },
  { to: '/app/settings', label: 'Settings', icon: Settings },
];

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const { signOut, user } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const menuButtonRef = useRef(null);
  const closeButtonRef = useRef(null);

  const activeNavItem = navItems.find((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  );
  const pageTitle = activeNavItem?.label || 'Dashboard';

  useEffect(() => {
    if (!open) return undefined;

    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      menuButtonRef.current?.focus();
    };
  }, [open]);

  async function handleLogout() {
    await signOut();
    navigate('/');
  }

  return (
    <div className="app-shell">
      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? 'sidebar--open' : ''}`}>
        <div className="brand-row">
          <NavLink to="/app" className="brand-mark" onClick={() => setOpen(false)}>
            EmberFlow
          </NavLink>
          <button
            ref={closeButtonRef}
            className="icon-button mobile-only"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>
        <nav className="side-nav" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <NavLink to="/app/settings" className="account-summary" onClick={() => setOpen(false)}>
            <Avatar
              src={profile?.avatar_url}
              name={profile?.full_name}
              size="md"
              alt="Profile avatar"
            />
            <div className="account-copy">
              <strong className="truncate">{profile?.full_name || 'Account'}</strong>
              <span className="muted small truncate">{user?.email}</span>
            </div>
          </NavLink>
          <Button variant="ghost" fullWidth onClick={handleLogout} className="sidebar__logout">
            <LogOut size={16} />
            Logout
          </Button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <button
            ref={menuButtonRef}
            className="icon-button mobile-only"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
          <div className="topbar__left">
            <h1 className="topbar__title">{pageTitle}</h1>
          </div>
          <div className="topbar__right">
            <ThemeToggle />
            <NavLink to="/app/settings" className="topbar__avatar-link" aria-label="Go to settings">
              <Avatar
                src={profile?.avatar_url}
                name={profile?.full_name}
                size="md"
                alt="Profile avatar"
              />
            </NavLink>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
