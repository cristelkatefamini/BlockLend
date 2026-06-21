import { Link } from 'react-router-dom';
import '../styles/pages/Landing.css';

export default function PublicHeader() {
  return (
    <header className="landing-header">
      <div className="landing-header-inner">
        <Link to="/" className="landing-logo">
          <svg className="landing-logo-icon" viewBox="0 0 32 36" aria-hidden="true">
            <path
              d="M16 1L2 8v12c0 9.5 6.2 18.3 14 21 7.8-2.7 14-11.5 14-21V8L16 1z"
              fill="currentColor"
            />
          </svg>
          <span className="landing-logo-text">BlockLend</span>
        </Link>
        <p className="landing-tagline">secure. transparent. decentralized.</p>
      </div>
    </header>
  );
}
