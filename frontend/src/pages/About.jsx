import '../styles/pages/About.css';

export default function About() {
  return (
    <div className="about-container">
      {/* Hero Section */}
      <section className="about-hero">
        <div className="container">
          <h1>About BlockLend</h1>
          <p>Revolutionizing asset management through blockchain technology</p>
        </div>
      </section>

      {/* Main Content */}
      <div className="container">
        {/* Mission Section */}
        <section className="about-section">
          <h2>Our Mission</h2>
          <p>
            BlockLend aims to innovate how communities, organizations, and institutions track, lend,
            and return physical assets. By leveraging blockchain technology, we provide transparent,
            trustless, and immutable records of every asset transaction.
          </p>
        </section>

        {/* Problem Section */}
        <section className="about-section">
          <h2>The Problem</h2>
          <p>
            Current asset management systems are susceptible to:
          </p>
          <ul className="problem-list">
            <li><strong>Human Error:</strong> Manual record-keeping and tracking</li>
            <li><strong>Data Loss:</strong> Unreliable storage and backup systems</li>
            <li><strong>Disputes:</strong> Disagreements about asset condition and ownership</li>
            <li><strong>Limited Accountability:</strong> Reliance on paper logs and spreadsheets</li>
            <li><strong>Inefficiency:</strong> Centralized databases require intermediaries</li>
          </ul>
        </section>

        {/* Solution Section */}
        <section className="about-section">
          <h2>Our Solution</h2>
          <p>
            BlockLend provides a decentralized platform that:
          </p>
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
              <p>Multi-factor authentication with blockchain-based digital identities</p>
            </div>
            <div className="feature-item">
              <h4>📦 Asset Management</h4>
              <p>Complete inventory tracking with real-time status and location updates</p>
            </div>
            <div className="feature-item">
              <h4>🔄 Smart Borrowing</h4>
              <p>Automated approval/denial based on smart contract rules</p>
            </div>
            <div className="feature-item">
              <h4>📊 Analytics & Reporting</h4>
              <p>Trust scores, borrowing patterns, and comprehensive audit trails</p>
            </div>
            <div className="feature-item">
              <h4>⛓️ Blockchain Security</h4>
              <p>Immutable audit trail on blockchain for complete transparency</p>
            </div>
            <div className="feature-item">
              <h4>💼 Admin Dashboard</h4>
              <p>Centralized management of assets, users, and borrowing requests</p>
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
              <p>Users create verified accounts as borrowers or asset owners</p>
            </div>
            <div className="workflow-arrow">→</div>
            <div className="workflow-step">
              <div className="step-number">2</div>
              <h4>Register Assets</h4>
              <p>Asset owners register items with unique blockchain identifiers</p>
            </div>
            <div className="workflow-arrow">→</div>
            <div className="workflow-step">
              <div className="step-number">3</div>
              <h4>Browse & Request</h4>
              <p>Borrowers browse available assets and submit requests</p>
            </div>
            <div className="workflow-arrow">→</div>
            <div className="workflow-step">
              <div className="step-number">4</div>
              <h4>Auto-Process</h4>
              <p>Smart contracts automatically approve or deny requests</p>
            </div>
            <div className="workflow-arrow">→</div>
            <div className="workflow-step">
              <div className="step-number">5</div>
              <h4>Checkout & Return</h4>
              <p>Transaction recorded on blockchain with proof of custody</p>
            </div>
          </div>
        </section>

        {/* Technology Stack */}
        <section className="about-section">
          <h2>Technology Stack</h2>
          <div className="tech-grid">
            <div className="tech-card">
              <h4>Frontend</h4>
              <p>React with Vite for fast, responsive user interface</p>
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
              <p>web3.py for blockchain interaction and transactions</p>
            </div>
            <div className="tech-card">
              <h4>Development</h4>
              <p>Ganache for local blockchain testing and development</p>
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
              <p>All transactions are visible and verifiable</p>
            </div>
            <div className="benefit-card">
              <span className="benefit-icon">✓</span>
              <h4>Security</h4>
              <p>Blockchain ensures data immutability and integrity</p>
            </div>
            <div className="benefit-card">
              <span className="benefit-icon">✓</span>
              <h4>Accountability</h4>
              <p>Clear responsibility with proof of custody</p>
            </div>
            <div className="benefit-card">
              <span className="benefit-icon">✓</span>
              <h4>Efficiency</h4>
              <p>Automated processes reduce manual work</p>
            </div>
            <div className="benefit-card">
              <span className="benefit-icon">✓</span>
              <h4>Cost Reduction</h4>
              <p>Eliminates intermediaries and reduces overhead</p>
            </div>
            <div className="benefit-card">
              <span className="benefit-icon">✓</span>
              <h4>Trust Building</h4>
              <p>Track record promotes responsible borrowing</p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="about-section cta-section">
          <h2>Ready to Join BlockLend?</h2>
          <p>Start managing assets securely with blockchain technology</p>
          <a href="/register" className="btn btn-primary btn-lg">
            Get Started Today
          </a>
        </section>
      </div>
    </div>
  );
}
