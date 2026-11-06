import { useLocation, Link } from 'react-router-dom';
import { Menu, Moon, Plus, Sun } from 'lucide-react';
import { format } from 'date-fns';
import { useTheme } from '../../context/ThemeContext';
import { Button, IconButton } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { useAuth } from '../../context/AuthContext';

const TITLES: Record<string, string> = {
  '/': 'Overview',
  '/transactions': 'Transactions',
  '/budgets': 'Budgets',
  '/goals': 'Goals',
  '/analytics': 'Analytics',
  '/accounts': 'Accounts',
  '/subscriptions': 'Subscriptions',
  '/settings': 'Settings',
};

interface TopbarProps {
  onMenu: () => void;
  onAdd: () => void;
}

export function Topbar({ onMenu, onAdd }: TopbarProps) {
  const { pathname } = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const title = TITLES[pathname] || 'SpendWise';

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button type="button" className="mobile-menu-btn" onClick={onMenu} aria-label="Open navigation">
          <Menu size={20} />
        </button>
        <div className="topbar-context">
          <span className="topbar-title">{title}</span>
          <span className="topbar-date">{format(new Date(), 'EEEE, MMMM d')}</span>
        </div>
      </div>

      <div className="topbar-right">
        <IconButton label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} onClick={toggleTheme}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </IconButton>
        <Button variant="primary" size="md" iconLeft={<Plus size={16} />} onClick={onAdd} className="topbar-add">
          Add transaction
        </Button>
        <Link to="/settings" className="topbar-avatar" aria-label="Open settings">
          <Avatar name={user?.name || 'SpendWise'} size={34} />
        </Link>
      </div>
    </header>
  );
}
