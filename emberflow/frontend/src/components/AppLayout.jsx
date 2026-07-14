import { BarChart3, FileText, Home, LineChart, LogOut, Menu, Settings, Users, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useProfile } from '../hooks/useProfile.js';

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
  const initials = (profile?.full_name || user?.email || 'U').slice(0, 2).toUpperCase();

  async function handleLogout() {
    await signOut();
    navigate('/');
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="brand-row">
          <NavLink to="/app" className="brand-mark" onClick={() => setOpen(false)}>
            EmberFlow
          </NavLink>
          <button className="icon-button mobile-only" onClick={() => setOpen(false)} aria-label="Close navigation">
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
          <div className="account-summary">
            {profile?.avatar_url ? (
              <img className="avatar-preview" src={profile.avatar_url} alt="Profile avatar" />
            ) : (
              <span className="avatar-fallback">{initials}</span>
            )}
            <div className="account-copy">
              <strong className="truncate">{profile?.full_name || 'Account'}</strong>
              <span className="muted small truncate">{user?.email}</span>
            </div>
          </div>
          <button className="button ghost full" onClick={handleLogout}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-only" onClick={() => setOpen(true)} aria-label="Open navigation">
            <Menu size={20} />
          </button>
          <div>
            <p className="eyebrow">Freelancer finance workspace</p>
            <h1>EmberFlow</h1>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
