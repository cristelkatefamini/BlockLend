import { useEffect } from 'react';

const TERMS_SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: 'By creating a BlockLend account, you agree to use the platform responsibly and in accordance with these Terms & Conditions, applicable campus or community policies, and all local laws.',
  },
  {
    title: '2. Account Responsibilities',
    body: 'You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. You agree to provide accurate registration information and keep your profile up to date.',
  },
  {
    title: '3. Borrowing and Lending',
    body: 'When you borrow or lend assets through BlockLend, you agree to return items on time, report damage promptly, and follow any checkout or return procedures required by asset owners or administrators.',
  },
  {
    title: '4. Trust Score and Penalties',
    body: 'Your trust score reflects your borrowing history on the platform. Late returns, damage, or policy violations may result in penalties, reduced borrowing privileges, or account restrictions.',
  },
  {
    title: '5. Privacy and Data',
    body: 'BlockLend uses blockchain-backed identity and encrypted storage to protect your data. We collect only the information needed to operate the service, verify users, and maintain transaction records.',
  },
  {
    title: '6. Platform Availability',
    body: 'We strive to keep BlockLend available and secure, but we do not guarantee uninterrupted access. Maintenance, network issues, or third-party service outages may temporarily affect the platform.',
  },
];

export default function TermsModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="terms-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="terms-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="terms-modal-header">
          <h2 id="terms-modal-title">Terms &amp; Conditions</h2>
          <button type="button" className="terms-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="terms-modal-body">
          <p className="terms-modal-intro">
            Please read these terms carefully before creating your BlockLend account.
          </p>
          {TERMS_SECTIONS.map((section) => (
            <section key={section.title} className="terms-modal-section">
              <h3>{section.title}</h3>
              <p>{section.body}</p>
            </section>
          ))}
        </div>

        <div className="terms-modal-footer">
          <button type="button" className="landing-form-submit terms-modal-accept" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
