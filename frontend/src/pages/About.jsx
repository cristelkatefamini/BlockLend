import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/pages/About.css';

const DEVELOPERS = [
  {
    name: 'Famini, Cristel Kate M.',
    photo: '/team/famini.jpg',
    initials: 'CF',
    color: '#1b365d',
  },
  {
    name: 'Celetaria, Flint Axl L.',
    photo: '/team/celetaria.jpg',
    initials: 'FC',
    color: '#e87722',
  },
  {
    name: 'Leaño, Maricarl C.',
    photo: '/team/leano.jpg',
    initials: 'ML',
    color: '#4a7ba7',
  },
  {
    name: 'Moreno, Chynna F.',
    photo: '/team/moreno.jpg',
    initials: 'CM',
    color: '#27ae60',
  },
];

function DevCard({ dev }) {
  return (
    <div className="dev-card">
      <div className="dev-photo-wrapper">
        <img
          src={dev.photo}
          alt={dev.name}
          className="dev-photo"
          onError={(e) => {
            // Try placeholder SVG first, then fall back to initials div
            if (!e.currentTarget.src.includes('placeholder.svg')) {
              e.currentTarget.src = '/team/placeholder.svg';
            } else {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextSibling.style.display = 'flex';
            }
          }}
        />
        <div
          className="dev-photo-fallback"
          style={{ background: dev.color, display: 'none' }}
          aria-hidden="true"
        >
          {dev.initials}
        </div>
      </div>
      <div className="dev-name">{dev.name}</div>
    </div>
  );
}

export default function About() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="about-container">
      {/* Hero */}
      <section className="about-hero">
        <div className="container">
          <h1>About BlockLend</h1>
          <p>Revolutionizing asset management through blockchain technology</p>
        </div>
      </section>

      <div className="container">

        {/* Mission */}
        <section className="about-section">
          <h2>Our Mission</h2>
          <p>
            BlockLend aims to innovate how communities, organizations, and institutions track, lend,
            and return physical assets. By leveraging blockchain technology, we provide transparent,
            trustless, and immutable records of every asset transaction.
          </p>
        </section>

        {/* Problem */}
        <section className="about-section">
          <h2>The Problem</h2>
          <p>Current asset management systems are susceptible to:</p>
          <ul className="problem-list">
            <li><strong>Human Error:</strong> Manual record-keeping and tracking</li>
            <li><strong>Data Loss:</strong> Unreliable storage and backup systems</li>
            <li><strong>Disputes:</strong> Disagreements about asset condition and ownership</li>
            <li><strong>Limited Accountability:</strong> Reliance on paper logs and spreadsheets</li>
            <li><strong>Inefficiency:</strong> Centralized databases require intermediaries</li>
          </ul>
        </section>

        {/* Solution */}
        <section className="about-section">
          <h2>Our Solution</h2>
          <p>BlockLend provides a decentralized platform that:</p>
          <ul className="solution-list">
            <li><strong>Digital Registration:</strong> Assets are logged and digitally indicated on the blockchain</li>
            <li><strong>Smart Contracts:</strong> Automated borrowing requests, approvals, and penalties</li>
            <li><strong>Immutable Records:</strong> Every transaction is documented with timestamps and condition notes</li>
            <li><strong>Proof of Custody:</strong> Transfer of responsibility is recorded transparently</li>
            <li><strong>Trust Scoring:</strong> Borrowers build reputation based on responsible borrowing</li>
            <li><strong>Automated Penalties:</strong> Late returns and damages are enforced by smart contracts</li>
          </ul>
        </section>

        {/* Key Features */}
        <section className="about-section">
          <h2>Key Features</h2>
          <div className="features-list">
            <div className="feature-item">
              <h4>🔐 Secure Authentication</h4>
              <p>Email-verified accounts with JWT-based session management</p>
            </div>
            <div className="feature-item">
              <h4>📦 Asset Management</h4>
              <p>Complete inventory tracking with real-time status and location updates</p>
            </div>
            <div className="feature-item">
              <h4>🔄 Smart Borrowing</h4>
              <p>Admin-controlled approval flow with automated due-date tracking</p>
            </div>
            <div className="feature-item">
              <h4>📊 Analytics &amp; Reporting</h4>
              <p>Trust scores, borrowing patterns, and PDF audit reports</p>
            </div>
            <div className="feature-item">
              <h4>⛓️ Blockchain Security</h4>
              <p>Every borrow event is recorded on Ganache with a verifiable tx hash</p>
            </div>
            <div className="feature-item">
              <h4>💬 Support Messaging</h4>
              <p>Users can message admins directly through the built-in chat</p>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="about-section">
          <h2>How It Works</h2>
          <div className="workflow">
            <div className="workflow-step">
              <div className="step-number">1</div>
              <h4>Register</h4>
              <p>Create a verified account and confirm your email</p>
            </div>
            <div className="workflow-arrow">→</div>
            <div className="workflow-step">
              <div className="step-number">2</div>
              <h4>Browse Assets</h4>
              <p>Explore available items and check stock quantities</p>
            </div>
            <div className="workflow-arrow">→</div>
            <div className="workflow-step">
              <div className="step-number">3</div>
              <h4>Request</h4>
              <p>Submit a borrow request with duration and reason</p>
            </div>
            <div className="workflow-arrow">→</div>
            <div className="workflow-step">
              <div className="step-number">4</div>
              <h4>Admin Approves</h4>
              <p>Admin reviews and approves; a blockchain record is created</p>
            </div>
            <div className="workflow-arrow">→</div>
            <div className="workflow-step">
              <div className="step-number">5</div>
              <h4>Return</h4>
              <p>Submit return; admin inspects condition and confirms</p>
            </div>
          </div>
        </section>

        {/* Technology Stack */}
        <section className="about-section">
          <h2>Technology Stack</h2>
          <div className="tech-grid">
            <div className="tech-card">
              <h4>Frontend</h4>
              <p>React 19 + Vite for a fast, responsive user interface</p>
            </div>
            <div className="tech-card">
              <h4>Backend</h4>
              <p>Python FastAPI for high-performance REST APIs</p>
            </div>
            <div className="tech-card">
              <h4>Database</h4>
              <p>MongoDB for flexible asset and user data storage</p>
            </div>
            <div className="tech-card">
              <h4>Blockchain</h4>
              <p>Solidity smart contracts on Ethereum-compatible networks</p>
            </div>
            <div className="tech-card">
              <h4>Web3</h4>
              <p>web3.py for blockchain interaction and transaction signing</p>
            </div>
            <div className="tech-card">
              <h4>Development</h4>
              <p>Ganache for local blockchain simulation and testing</p>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="about-section">
          <h2>Benefits</h2>
          <div className="benefits-grid">
            <div className="benefit-card">
              <span className="benefit-icon">✓</span>
              <h4>Transparency</h4>
              <p>All transactions are visible and verifiable on-chain</p>
            </div>
            <div className="benefit-card">
              <span className="benefit-icon">✓</span>
              <h4>Security</h4>
              <p>Blockchain ensures data immutability and integrity</p>
            </div>
            <div className="benefit-card">
              <span className="benefit-icon">✓</span>
              <h4>Accountability</h4>
              <p>Clear responsibility with proof of custody at every step</p>
            </div>
            <div className="benefit-card">
              <span className="benefit-icon">✓</span>
              <h4>Efficiency</h4>
              <p>Automated processes reduce manual administrative work</p>
            </div>
            <div className="benefit-card">
              <span className="benefit-icon">✓</span>
              <h4>Trust Building</h4>
              <p>Trust scores promote responsible borrowing behavior</p>
            </div>
            <div className="benefit-card">
              <span className="benefit-icon">✓</span>
              <h4>PDF Reports</h4>
              <p>Exportable reports for assets, users, and borrow records</p>
            </div>
          </div>
        </section>

        {/* ── MEET THE DEVELOPERS ── */}
        <section className="about-section dev-section">
          <h2>Meet the Developers</h2>
          <p className="dev-subtitle">
            BlockLend was designed and built by a team of fourth-year IT students.
          </p>
          <div className="dev-grid">
            {DEVELOPERS.map((dev) => (
              <DevCard key={dev.name} dev={dev} />
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="about-section cta-section">
          <h2>Ready to Join BlockLend?</h2>
          <p>Start managing assets securely with blockchain technology</p>
          {isAuthenticated ? (
            <Link to="/assets" className="btn btn-primary btn-lg">Browse Assets</Link>
          ) : (
            <Link to="/register" className="btn btn-primary btn-lg">Get Started Today</Link>
          )}
        </section>

      </div>
    </div>
  );
}
