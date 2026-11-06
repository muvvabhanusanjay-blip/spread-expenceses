import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck, Sparkle, User as UserIcon, TrendingUp, ChartPie, Target,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Forms';
import { ApiError } from '../lib/api';
import { useDocumentTitle } from '../lib/hooks';

interface AuthPageProps {
  mode: 'login' | 'register';
}

export function AuthPage({ mode }: AuthPageProps) {
  const isLogin = mode === 'login';
  useDocumentTitle(isLogin ? 'Sign in' : 'Create account');
  const { login, register, loginDemo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const destination = (location.state as { from?: string } | null)?.from || '/';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (!isLogin && name.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setSubmitting(true);
    try {
      if (isLogin) await login(email.trim(), password);
      else await register(name.trim(), email.trim(), password);
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemo = async () => {
    setError('');
    setDemoLoading(true);
    try {
      await loginDemo();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not open the demo workspace.');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <section className="auth-visual" aria-hidden="true">
        <div className="auth-grid" />
        <div className="auth-orb auth-orb-one" />
        <div className="auth-orb auth-orb-two" />

        <div className="auth-brand">
          <span className="brand-mark brand-mark-lg">
            <svg viewBox="0 0 32 32" width="24" height="24" fill="none">
              <path d="M8 20.5c2.4 2.3 6 2.8 9 1.7 2.6-1 3-3.9.7-5-3.1-1.4-7.6-.7-8.9-3.8C7.4 9.9 10.8 7 14.5 7c2.4 0 4.7.7 6.5 2.2" stroke="#05231A" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </span>
          <span className="auth-brand-name">Spend<span>Wise</span></span>
        </div>

        <div className="auth-hero">
          <p className="auth-kicker">Clarity, by design</p>
          <h2>Every dollar,<br />in perfect focus.</h2>
          <p className="auth-lede">
            One calm workspace for spending, budgets, goals and the subscriptions that quietly add up.
          </p>
          <ul className="auth-features">
            <li><span><TrendingUp size={15} /></span>Live cash-flow across every account</li>
            <li><span><ChartPie size={15} /></span>Budgets that adapt to real life</li>
            <li><span><Target size={15} /></span>Goals with visible momentum</li>
          </ul>
        </div>

        <div className="auth-mock">
          <div className="mock-card mock-balance">
            <div className="mock-card-top">
              <span>Total net worth</span>
              <span className="mock-pill"><TrendingUp size={11} />+18.4%</span>
            </div>
            <strong>$106,095</strong>
            <div className="mock-bars">
              {[38, 52, 44, 66, 58, 78, 92].map((height, index) => (
                <span key={index} style={{ height: `${height}%` }} className={index === 6 ? 'is-hot' : ''} />
              ))}
            </div>
            <div className="mock-axis"><span>May</span><span>Nov</span></div>
          </div>

          <div className="mock-card mock-budget">
            <div className="mock-card-top">
              <span>Dining budget</span>
              <span className="mock-muted">November</span>
            </div>
            <div className="mock-budget-row">
              <strong>$214</strong>
              <span>of $330</span>
            </div>
            <div className="mock-progress"><span style={{ width: '65%' }} /></div>
            <div className="mock-note"><Sparkle size={12} /> On track — $116 left</div>
          </div>
        </div>

        <p className="auth-visual-foot">Built for people who like their money calm.</p>
      </section>

      <section className="auth-panel">
        <div className="auth-panel-inner">
          <div className="auth-mobile-brand">
            <span className="brand-mark">
              <svg viewBox="0 0 32 32" width="20" height="20" fill="none">
                <path d="M8 20.5c2.4 2.3 6 2.8 9 1.7 2.6-1 3-3.9.7-5-3.1-1.4-7.6-.7-8.9-3.8C7.4 9.9 10.8 7 14.5 7c2.4 0 4.7.7 6.5 2.2" stroke="#05231A" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </span>
            <span className="brand-name">Spend<span>Wise</span></span>
          </div>

          <header className="auth-heading">
            <h1>{isLogin ? 'Welcome back' : 'Create your workspace'}</h1>
            <p>{isLogin ? 'Pick up right where your money left off.' : 'A calmer way to see where every dollar goes.'}</p>
          </header>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {!isLogin && (
              <Field label="Full name">
                <Input
                  icon={UserIcon}
                  type="text"
                  placeholder="Aarav Mehta"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  required
                />
              </Field>
            )}

            <Field label="Email">
              <Input
                icon={Mail}
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </Field>

            <Field label="Password" hint={isLogin ? undefined : 'At least 8 characters'}>
              <div className="password-field">
                <Input
                  icon={Lock}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </Field>

            {error && <div className="form-error">{error}</div>}

            <Button type="submit" variant="primary" size="lg" block loading={submitting} iconRight={!submitting ? <ArrowRight size={16} /> : undefined}>
              {isLogin ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          <div className="auth-divider"><span>or</span></div>

          <Button variant="secondary" size="lg" block onClick={handleDemo} loading={demoLoading} iconLeft={<Sparkle size={16} />}>
            Explore the demo workspace
          </Button>
          <p className="auth-demo-hint">No sign-up needed · demo@spendwise.app / demo1234</p>

          <p className="auth-switch">
            {isLogin ? 'New to SpendWise?' : 'Already have an account?'}{' '}
            <Link to={isLogin ? '/register' : '/login'}>{isLogin ? 'Create an account' : 'Sign in'}</Link>
          </p>

          <p className="auth-secure"><ShieldCheck size={14} /> Your data stays private. Passwords are salted and hashed.</p>
        </div>
      </section>
    </div>
  );
}
