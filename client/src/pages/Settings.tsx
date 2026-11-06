import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Database, KeyRound, LogOut, Moon, RefreshCcw, ShieldCheck, Sparkle, Sun, UserRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { api, ApiError } from '../lib/api';
import { CURRENCIES } from '../lib/categories';
import { useDocumentTitle } from '../lib/hooks';
import { formatDate } from '../lib/format';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { Avatar } from '../components/ui/Avatar';
import { Field, Input, Select } from '../components/ui/Forms';
import { ConfirmModal } from '../components/ui/ConfirmModal';

export function Settings() {
  useDocumentTitle('Settings');
  const { user, updateProfile, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || '');
  const [currency, setCurrency] = useState(user?.currency || 'USD');
  const [profileError, setProfileError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleProfile = async () => {
    setProfileError('');
    if (name.trim().length < 2) {
      setProfileError('Your name needs at least two characters.');
      return;
    }
    setSavingProfile(true);
    try {
      await updateProfile({ name: name.trim(), currency });
      toast.success('Profile updated', 'Your preferences were saved.');
    } catch (err) {
      setProfileError(err instanceof ApiError ? err.message : 'Could not save your profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePassword = async () => {
    setPasswordError('');
    if (!currentPassword) {
      setPasswordError('Enter your current password.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Your new password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('The new passwords do not match.');
      return;
    }
    setSavingPassword(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      toast.success('Password changed', 'Use your new password next time you sign in.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : 'Could not change your password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleResetDemo = async () => {
    setResetting(true);
    try {
      await api.resetDemo();
      toast.success('Demo rebuilt', 'A fresh 25-month demo workspace is ready.');
      setResetOpen(false);
      window.dispatchEvent(new Event('spendwise:data-changed'));
    } catch (err) {
      toast.error('Could not reset demo data', err instanceof ApiError ? err.message : undefined);
      throw err;
    } finally {
      setResetting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      <PageHeader
        eyebrow="Your workspace"
        title="Settings"
        subtitle="Profile, security and the little details that make SpendWise yours."
      />

      <div className="settings-grid">
        <Card className="settings-card">
          <CardHeader
            title="Profile"
            subtitle="How you appear inside SpendWise"
          />
          <div className="profile-head">
            <Avatar name={user?.name || 'SpendWise'} size={64} />
            <div>
              <strong>{user?.name}</strong>
              <span>{user?.email}</span>
              <span className="profile-meta">
                <ShieldCheck size={13} />
                Member since {user ? formatDate(user.createdAt.slice(0, 10), 'MMMM yyyy') : '—'}
              </span>
            </div>
          </div>
          <div className="form-stack">
            {profileError && <div className="form-error">{profileError}</div>}
            <Field label="Full name">
              <Input
                icon={UserRound}
                value={name}
                maxLength={60}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
            <Field label="Email">
              <Input value={user?.email || ''} disabled />
            </Field>
            <Field label="Currency" hint="Applies across the workspace">
              <Select value={currency} onChange={(event) => setCurrency(event.target.value)}>
                {CURRENCIES.map((option) => (
                  <option key={option.code} value={option.code}>{option.code} · {option.label}</option>
                ))}
              </Select>
            </Field>
            <div className="settings-actions">
              <Button variant="primary" onClick={handleProfile} loading={savingProfile}>Save profile</Button>
            </div>
          </div>
        </Card>

        <div className="settings-stack">
          <Card className="settings-card">
            <CardHeader
              title="Appearance"
              subtitle="Choose the mood you want to work in"
            />
            <div className="theme-options">
              <button
                type="button"
                className={`theme-choice ${theme === 'dark' ? 'is-active' : ''}`}
                onClick={() => setTheme('dark')}
              >
                <span className="theme-preview theme-preview-dark">
                  <span /><span /><span />
                </span>
                <span className="theme-choice-copy">
                  <Moon size={15} />
                  <strong>Midnight</strong>
                  <small>Dark, focused, low-glare</small>
                </span>
              </button>
              <button
                type="button"
                className={`theme-choice ${theme === 'light' ? 'is-active' : ''}`}
                onClick={() => setTheme('light')}
              >
                <span className="theme-preview theme-preview-light">
                  <span /><span /><span />
                </span>
                <span className="theme-choice-copy">
                  <Sun size={15} />
                  <strong>Daylight</strong>
                  <small>Bright, airy, easy reading</small>
                </span>
              </button>
            </div>
          </Card>

          <Card className="settings-card">
            <CardHeader
              title="Security"
              subtitle="Change the password for your account"
            />
            <div className="form-stack">
              {passwordError && <div className="form-error">{passwordError}</div>}
              <Field label="Current password">
                <Input
                  icon={KeyRound}
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
              </Field>
              <div className="form-grid">
                <Field label="New password" hint="8+ characters">
                  <Input
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                  />
                </Field>
                <Field label="Confirm new password">
                  <Input
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                </Field>
              </div>
              <div className="settings-actions">
                <Button variant="secondary" onClick={handlePassword} loading={savingPassword}>
                  Update password
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {user?.isDemo && (
          <Card className="settings-card">
            <CardHeader
              title="Demo workspace"
              subtitle="This account is loaded with 25 months of sample data"
            />
            <div className="info-panel">
              <span className="info-panel-icon"><Sparkle size={18} /></span>
              <div>
                <strong>Explore freely</strong>
                <p>Add, edit and delete anything. Reset whenever you want a clean slate — your demo login stays the same.</p>
              </div>
            </div>
            <div className="settings-actions">
              <Button variant="secondary" iconLeft={<RefreshCcw size={15} />} onClick={() => setResetOpen(true)}>
                Reset demo data
              </Button>
            </div>
          </Card>
        )}

        <Card className="settings-card">
          <CardHeader
            title="About & session"
            subtitle="Where your data lives and how to sign out"
          />
          <div className="about-list">
            <div className="about-row">
              <Database size={16} />
              <div>
                <strong>Local MongoDB</strong>
                <span>Your data is stored on this device in the spendwise database.</span>
              </div>
            </div>
            <div className="about-row">
              <ShieldCheck size={16} />
              <div>
                <strong>Private by default</strong>
                <span>Requests are authenticated with a personal access token.</span>
              </div>
            </div>
            <div className="about-row">
              <Sparkle size={16} />
              <div>
                <strong>SpendWise 1.0</strong>
                <span>Premium personal finance workspace.</span>
              </div>
            </div>
          </div>
          <div className="settings-actions">
            <Button variant="danger" iconLeft={<LogOut size={15} />} onClick={handleLogout}>
              Sign out
            </Button>
          </div>
        </Card>
      </div>

      <ConfirmModal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={handleResetDemo}
        tone="primary"
        title="Reset demo workspace?"
        message={(
          <p>
            All of your current changes will be replaced with a fresh set of demo accounts, transactions, budgets, goals and subscriptions.
            {resetting ? ' Rebuilding now…' : ' This usually takes a couple of seconds.'}
          </p>
        )}
        confirmLabel="Reset demo data"
        busyLabel="Rebuilding…"
      />
    </>
  );
}
