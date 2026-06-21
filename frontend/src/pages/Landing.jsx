import { useState } from 'react';

import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

import { authAPI } from '../utils/api';
import { getApiErrorMessage } from '../utils/validation';
import PublicHeader from '../components/PublicHeader';
import PasswordInput from '../components/PasswordInput';

import '../styles/pages/Landing.css';

export default function Landing() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(formData.email, formData.password);
      login(response.data.user, response.data.token);
      navigate('/home');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Login failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing">
      <PublicHeader />

      <section className="landing-hero">
        <div className="landing-hero-overlay">
          <div className="landing-hero-headline">
            <div className="headline-row">
              <span className="headline-box headline-box--blue">time</span>
              <span className="headline-box headline-box--orange">for my assets</span>
            </div>
            <div className="headline-row">
              <span className="headline-box headline-box--blue">time</span>
              <span className="headline-box headline-box--orange">for my community</span>
            </div>
          </div>

          <div className="landing-hero-banner">
            <div className="landing-hero-banner-inner">
              <svg className="landing-banner-icon" viewBox="0 0 32 36" aria-hidden="true">
                <path
                  d="M16 1L2 8v12c0 9.5 6.2 18.3 14 21 7.8-2.7 14-11.5 14-21V8L16 1z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
              <p>
                At BlockLend, you own your identity. You control your assets. Borrow on your terms.
                The only gatekeeper is the blockchain.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-main">
        <div className="landing-main-inner">
          <div className="landing-info">
            <p className="landing-intro">
              With a decentralized platform built for asset sharing, we offer lending solutions
              tailor-made for your <strong>community and campus</strong>.
            </p>

            <div className="info-section">
              <h2>Blockchain Secured and Trusted.</h2>
              <p>
                BlockLend is a <strong className="highlight">leader in transparent asset management</strong>{' '}
                powered by smart contracts. Every transaction is immutably recorded and verifiable
                on the blockchain.
              </p>
            </div>

            <div className="info-section">
              <h2>Flexible and Everywhere.</h2>
              <p>
                BlockLend is the ideal way to borrow and lend shared assets. You{' '}
                <strong className="highlight">are not required to be on-site at a specific time</strong>.
                Request, checkout, and return from anywhere you happen to be.
              </p>
            </div>

            <div className="info-section">
              <h2>Real-Time Availability.</h2>
              <p>
                Assets are updated <strong className="highlight">instantly when borrowed or returned</strong>.
                This gives you the flexibility to find what you need, when you need it, without
                waiting on manual approvals.
              </p>
            </div>

            <div className="info-section">
              <h2>Open Access.</h2>
              <p>
                BlockLend welcomes all verified users.{' '}
                <strong className="highlight">Create your account and start browsing assets today</strong>.
                Build your trust score through responsible borrowing and timely returns.
              </p>
            </div>
          </div>

          <div className="landing-form-wrapper">
            <div className="landing-form-header">
              <span>Sign in to your account</span>
            </div>

            <form className="landing-form" onSubmit={handleSignIn}>
              {error && <div className="alert alert-danger">{error}</div>}

              <div className="form-group">
                <label htmlFor="signInEmail">Email *</label>
                <input
                  id="signInEmail"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="your@email.com"
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password *</label>
                <PasswordInput
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                />
              </div>

              <button type="submit" className="landing-form-submit" disabled={loading}>
                {loading ? 'Signing In...' : 'Sign In'}
              </button>

              <p className="landing-form-footer">
                Don&apos;t have an account? <Link to="/register">Create one</Link>
              </p>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
