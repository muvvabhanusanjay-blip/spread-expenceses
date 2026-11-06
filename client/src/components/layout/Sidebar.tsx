import { NavLink, useNavigate } from 'react-router-dom';
import {
  ChartNoAxesCombined,
  ChartPie,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  RefreshCcw,
  Settings,
  Target,
  WalletCards,
  Sparkle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../ui/Avatar';
import type { IconType } from '../../lib/categories';

interface NavItem {
  to: string;
  label: string;
  icon: IconType;
  end?: boolean;
}

const PRIMARY_NAV: NavItem[] = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/transactions', label: 'Transactions', icon: ReceiptText },
  { to: '/budgets', label: 'Budgets', icon: ChartPie },
  { to: '/goals', label: 'Goals', icon: Target },
];

const MANAGE_NAV: NavItem[] = [
  { to: '/analytics', label: 'Analytics', icon: ChartNoAxesCombined },
  { to: '/accounts', label: 'Accounts', icon: WalletCards },
  { to: '/subscriptions', label: 'Subscriptions', icon: RefreshCcw },
];

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      <div className={`sidebar-scrim ${mobileOpen ? 'is-visible' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside className={`sidebar ${mobileOpen ? 'is-open' : ''}`}>
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="20" height="20" fill="none">
              <path d="M8 20.5c2.4 2.3 6 2.8 9 1.7 2.6-1 3-3.9.7-5-3.1-1.4-7.6-.7-8.9-3.8C7.4 9.9 10.8 7 14.5 7c2.4 0 4.7.7 6.5 2.2" stroke="#05231A" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
          <div className="brand-copy">
            <span className="brand-name">Spend<span>Wise</span></span>
            <span className="brand-tag">Personal finance</span>
          </div>
          {user?.isDemo && (
            <span className="demo-pill">
              <Sparkle size={11} />
              Demo
            </span>
          )}
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          <p className="nav-group-label">Money</p>
          {PRIMARY_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) => `nav-item ${isActive ? 'is-active' : ''}`}
            >
              <item.icon size={18} strokeWidth={1.9} />
              <span>{item.label}</span>
            </NavLink>
          ))}

          <p className="nav-group-label">Manage</p>
          {MANAGE_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) => `nav-item ${isActive ? 'is-active' : ''}`}
            >
              <item.icon size={18} strokeWidth={1.9} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <NavLink
            to="/settings"
            onClick={onClose}
            className={({ isActive }) => `nav-item nav-item-subtle ${isActive ? 'is-active' : ''}`}
          >
            <Settings size={18} strokeWidth={1.9} />
            <span>Settings</span>
          </NavLink>

          <div className="user-card">
            <Avatar name={user?.name || 'SpendWise'} size={36} />
            <div className="user-copy">
              <strong>{user?.name || 'Account'}</strong>
              <span>{user?.email}</span>
            </div>
            <button type="button" className="user-logout" onClick={handleLogout} aria-label="Sign out" title="Sign out">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
