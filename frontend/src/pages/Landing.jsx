import { Link } from 'react-router-dom';
import '../styles/pages/Landing.css';

export default function Landing() {
  return (
    <div className="landing">
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <h1>BlockLend</h1>
            <h2>Decentralized Asset Management</h2>
            <p>
              Secure, transparent, and trustless lending and asset management powered by blockchain technology.
            </p>
            <div className="hero-buttons">
              <Link to="/register" className="btn btn-primary btn-lg">
                Get Started
              </Link>
              <Link to="/login" className="btn btn-secondary btn-lg">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <h2 className="section-title">Why Choose BlockLend?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🔗</div>
              <h3>Blockchain Secured</h3>
              <p>All transactions are immutably recorded on the blockchain, ensuring transparency and trust.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔐</div>
              <h3>Secure & Transparent</h3>
              <p>End-to-end encryption with complete audit trails for every asset transaction.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⚙️</div>
              <h3>Smart Contracts</h3>
              <p>Automated borrowing rules and penalty enforcement without intermediaries.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Asset Management</h3>
              <p>Complete inventory tracking with real-time status updates and location management.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⭐</div>
              <h3>Trust Scoring</h3>
              <p>Build your reputation through responsible borrowing and timely returns.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📱</div>
              <h3>Digital Identity</h3>
              <p>Verified blockchain-based identity ensuring accountability and security.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works">
        <div className="container">
          <h2 className="section-title">How It Works</h2>
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <h3>Register & Verify</h3>
              <p>Create your account with verified identity information and blockchain digital identity.</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <h3>Browse Assets</h3>
              <p>Explore available assets registered by asset owners in your community.</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <h3>Request to Borrow</h3>
              <p>Submit a borrowing request which is automatically processed by smart contracts.</p>
            </div>
            <div className="step">
              <div className="step-number">4</div>
              <h3>Checkout & Return</h3>
              <p>Transaction recorded on blockchain with timestamps and condition verification.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="container">
          <h2>Ready to Start?</h2>
          <p>Join thousands of users managing assets securely on BlockLend</p>
          <Link to="/register" className="btn btn-primary btn-lg">
            Create Your Account
          </Link>
        </div>
      </section>
    </div>
  );
}
