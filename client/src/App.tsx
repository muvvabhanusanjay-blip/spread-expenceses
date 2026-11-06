import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AppShell } from './components/layout/AppShell';
import { AuthPage } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { Budgets } from './pages/Budgets';
import { Goals } from './pages/Goals';
import { Accounts } from './pages/Accounts';
import { Analytics } from './pages/Analytics';
import { Subscriptions } from './pages/Subscriptions';
import { Settings } from './pages/Settings';

function Splash() {
  return (
    <div className="app-splash">
      <div className="splash-brand">
        <span className="brand-mark brand-mark-lg" aria-hidden="true">
          <svg viewBox="0 0 32 32" width="24" height="24" fill="none">
            <path d="M8 20.5c2.4 2.3 6 2.8 9 1.7 2.6-1 3-3.9.7-5-3.1-1.4-7.6-.7-8.9-3.8C7.4 9.9 10.8 7 14.5 7c2.4 0 4.7.7 6.5 2.2" stroke="#05231A" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </span>
        <span className="splash-name">Spend<span>Wise</span></span>
      </div>
      <span className="splash-loader" aria-hidden="true" />
      <p>Opening your workspace…</p>
    </div>
  );
}

function Protected() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Splash />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

function GuestOnly() {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}

export function App() {
  return (
    <Routes>
      <Route element={<GuestOnly />}>
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
      </Route>

      <Route element={<Protected />}>
        <Route element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/budgets" element={<Budgets />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/subscriptions" element={<Subscriptions />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
