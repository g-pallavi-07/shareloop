import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { login } from '../services/api.js';
import { useAuth, useToast } from '../context/AppContext.jsx';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login: setAuth } = useAuth();
  const { addToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  function validate() {
    const e = {};
    if (!email) e.email = 'Email is required.';
    else if (!/^.+@.+\..+$/.test(email)) e.email = 'Enter a valid email.';
    if (!password) e.password = 'Password is required.';
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const { user, token } = await login({ email, password });
      setAuth(user, token);
      addToast('Welcome back!', 'success');
      navigate('/dashboard');
    } catch (err) {
      addToast(err.message || 'Login failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-page__card">
        <div className="auth-page__brand">
          <span className="logo-text">semi<em>store</em>.</span>
        </div>
        <h1 className="auth-page__heading">Welcome back</h1>
        <p className="auth-page__sub">Log in with your college email to continue.</p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="email" className="form-label">College Email</label>
            <input
              id="email"
              type="email"
              className={`form-input ${errors.email ? 'form-input--error' : ''}`}
              placeholder="you@college.edu"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrors((v) => ({ ...v, email: '' })); }}
            />
            {errors.email && <span className="form-error">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <div className="form-input-wrap">
              <input
                id="password"
                type={showPass ? 'text' : 'password'}
                className={`form-input ${errors.password ? 'form-input--error' : ''}`}
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors((v) => ({ ...v, password: '' })); }}
              />
              <button
                type="button"
                className="form-input-toggle"
                onClick={() => setShowPass((v) => !v)}
                aria-label={showPass ? 'Hide password' : 'Show password'}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <span className="form-error">{errors.password}</span>}
          </div>

          <button type="submit" className="btn btn--dark auth-form__submit" disabled={loading}>
            {loading ? 'Logging in…' : 'Log In'}
          </button>
        </form>

        <p className="auth-page__switch">
          Don't have an account?{' '}
          <Link to="/register" className="auth-page__link">Register here</Link>
        </p>
        <p className="auth-page__note">
          <em>Demo: use any @college.edu address + any password.</em>
        </p>
      </div>
    </div>
  );
}
