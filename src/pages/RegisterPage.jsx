import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { register } from '../services/api.js';
import { useAuth, useToast } from '../context/AppContext.jsx';

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Postgraduate'];
const DEPARTMENTS = [
  'Computer Science', 'Electronics Engineering', 'Mechanical Engineering',
  'Civil Engineering', 'Electrical Engineering', 'Chemical Engineering',
  'Biotechnology', 'Chemistry', 'Physics', 'Mathematics', 'Other',
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login: setAuth } = useAuth();
  const { addToast } = useToast();

  const [form, setForm] = useState({ name: '', email: '', department: '', year: '', password: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  function set(key) {
    return (e) => {
      setForm((v) => ({ ...v, [key]: e.target.value }));
      setErrors((v) => ({ ...v, [key]: '' }));
    };
  }

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required.';
    if (!form.email) e.email = 'College email is required.';
    else if (!/^.+@.+\..+$/.test(form.email)) e.email = 'Enter a valid email.';
    if (!form.department) e.department = 'Select your department.';
    if (!form.year) e.year = 'Select your year.';
    if (!form.password) e.password = 'Password is required.';
    else if (form.password.length < 6) e.password = 'Password must be at least 6 characters.';
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match.';
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const { user, token } = await register(form);
      setAuth(user, token);
      addToast('Account created! Welcome to ShareLoop.', 'success');
      navigate('/dashboard');
    } catch (err) {
      addToast(err.message || 'Registration failed.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-page__card auth-page__card--wide">
        <div className="auth-page__brand">
          <span className="logo-text">semi<em>store</em>.</span>
        </div>
        <h1 className="auth-page__heading">Join the campus exchange</h1>
        <p className="auth-page__sub">Create your account using your college email.</p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-form__row">
            <div className="form-group">
              <label htmlFor="name" className="form-label">Full Name</label>
              <input id="name" type="text" className={`form-input ${errors.name ? 'form-input--error' : ''}`}
                placeholder="Your name" value={form.name} onChange={set('name')} />
              {errors.name && <span className="form-error">{errors.name}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="reg-email" className="form-label">College Email</label>
              <input id="reg-email" type="email" className={`form-input ${errors.email ? 'form-input--error' : ''}`}
                placeholder="you@college.edu" value={form.email} onChange={set('email')} />
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>
          </div>

          <div className="auth-form__row">
            <div className="form-group">
              <label htmlFor="department" className="form-label">Department</label>
              <select id="department" className={`form-input form-select ${errors.department ? 'form-input--error' : ''}`}
                value={form.department} onChange={set('department')}>
                <option value="">Select department</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              {errors.department && <span className="form-error">{errors.department}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="year" className="form-label">Year</label>
              <select id="year" className={`form-input form-select ${errors.year ? 'form-input--error' : ''}`}
                value={form.year} onChange={set('year')}>
                <option value="">Select year</option>
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              {errors.year && <span className="form-error">{errors.year}</span>}
            </div>
          </div>

          <div className="auth-form__row">
            <div className="form-group">
              <label htmlFor="reg-password" className="form-label">Password</label>
              <div className="form-input-wrap">
                <input id="reg-password" type={showPass ? 'text' : 'password'}
                  className={`form-input ${errors.password ? 'form-input--error' : ''}`}
                  placeholder="Min. 6 characters" value={form.password} onChange={set('password')} />
                <button type="button" className="form-input-toggle" onClick={() => setShowPass((v) => !v)}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="confirm" className="form-label">Confirm Password</label>
              <input id="confirm" type={showPass ? 'text' : 'password'}
                className={`form-input ${errors.confirm ? 'form-input--error' : ''}`}
                placeholder="Repeat password" value={form.confirm} onChange={set('confirm')} />
              {errors.confirm && <span className="form-error">{errors.confirm}</span>}
            </div>
          </div>

          <button type="submit" className="btn btn--dark auth-form__submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="auth-page__switch">
          Already have an account?{' '}
          <Link to="/login" className="auth-page__link">Log in</Link>
        </p>
      </div>
    </div>
  );
}
