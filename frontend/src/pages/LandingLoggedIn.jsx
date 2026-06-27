import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/pages/Landing.css';
import '../styles/pages/LandingLoggedIn.css';

export default function LandingLoggedIn() {
  const { user, isAdmin } = useAuth();

  return (
    <div className="landing landing--authenticated">
      <section className="landing-hero">
        <div className="landing-hero-overlay">
          <div className="landing-hero-headline">
            <div className="headline-row">
              <span className="headline-box headline-box--blue">welcome back</span>
              <span className="headline-box headline-box--orange">{user?.username}</span>
            </div>
            <div className="headline-row">
              <span className="headline-box headline-box--blue">time</span>
              <span className="headline-box headline-box--orange">for your assets</span>
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
                You&apos;re signed in to BlockLend. Browse assets, manage borrows, and track
                transactions — all secured on the blockchain.
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
                <strong className="highlight">Build your trust score through responsible borrowing</strong>{' '}
                and timely returns.
              </p>
            </div>
          </div>

          <div className="landing-form-wrapper">
            <div className="landing-form-header">
              <span>Your Dashboard</span>
            </div>

            <div className="logged-in-panel">
              <p className="logged-in-greeting">
                Hello, <strong>{user?.full_name || user?.username}</strong>
              </p>
              <p className="logged-in-sub">
                {isAdmin
                  ? 'Manage assets, users, and borrow requests from your admin tools.'
                  : 'Jump back into browsing assets or check your borrowing activity.'}
              </p>

              <div className="logged-in-actions">
                <Link
                  to={isAdmin ? '/admin/dashboard' : '/home'}
                  className="logged-in-action logged-in-action--primary"
                >
                  Go to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
