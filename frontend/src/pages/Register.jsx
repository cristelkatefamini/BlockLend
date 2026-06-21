import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../utils/api';
import { getApiErrorMessage, validatePassword, validateUsername } from '../utils/validation';
import PublicHeader from '../components/PublicHeader';
import PasswordInput from '../components/PasswordInput';
import TermsModal from '../components/TermsModal';
import '../styles/pages/Landing.css';

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [showTerms, setShowTerms] = useState(false);
  const [formData, setFormData] = useState({
    firstName: location.state?.firstName || '',
    lastName: location.state?.lastName || '',
    username: '',
    email: location.state?.email || '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const usernameError = validateUsername(formData.username);
    if (usernameError) {
      setError(usernameError);
      return;
    }

    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!formData.acceptTerms) {
      setError('You must accept the terms and conditions');
      return;
    }

    setLoading(true);
    try {
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      const response = await authAPI.register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        full_name: fullName || formData.username,
        role: 'user',
      });

      if (response.data.user && response.data.token) {
        login(response.data.user, response.data.token);
        navigate('/home');
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Registration failed. Please try again.'));
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
              <span className="headline-box headline-box--blue">create</span>
              <span className="headline-box headline-box--orange">your account</span>
            </div>
            <div className="headline-row">
              <span className="headline-box headline-box--blue">join</span>
              <span className="headline-box headline-box--orange">your community</span>
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
                Set up your profile in minutes and start browsing shared assets on a secure,
                decentralized platform.
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
              <h2>Build Your Trust Score.</h2>
              <p>
                Earn reputation through responsible borrowing and timely returns.{' '}
                <strong className="highlight">Your data is encrypted and protected</strong> by
                blockchain-backed identity.
              </p>
            </div>
          </div>

          <div className="landing-form-wrapper">
            <div className="landing-form-header">
              <span>Let&apos;s get you started...</span>
            </div>

            <form onSubmit={handleSubmit} className="landing-form">
              {error && <div className="alert alert-danger">{error}</div>}

              <div className="landing-form-row">
                <div className="form-group">
                  <label htmlFor="firstName">First Name *</label>
                  <input
                    id="firstName"
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="lastName">Last Name *</label>
                  <input
                    id="lastName"
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="username">Username *</label>
                <input
                  id="username"
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  placeholder="Choose a username"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="landing-form-row">
                <div className="form-group">
                  <label htmlFor="password">Password *</label>
                  <PasswordInput
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                  <p className="field-hint">At least 8 characters with uppercase, lowercase, and a number.</p>
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm Password *</label>
                  <PasswordInput
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group terms-group">
                <div className="terms-row">
                  <label className="checkbox-label terms-checkbox-label">
                    <input
                      type="checkbox"
                      name="acceptTerms"
                      checked={formData.acceptTerms}
                      onChange={handleChange}
                    />
                    <span>I agree to the</span>
                  </label>
                  <button
                    type="button"
                    className="terms-link"
                    onClick={() => setShowTerms(true)}
                  >
                    Terms &amp; Conditions
                  </button>
                </div>
              </div>

              <button type="submit" className="landing-form-submit" disabled={loading}>
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>

              <p className="landing-form-footer">
                Already have an account? <Link to="/">Sign in</Link>
              </p>
            </form>
          </div>
        </div>
      </section>

      <TermsModal open={showTerms} onClose={() => setShowTerms(false)} />
    </div>
  );
}
