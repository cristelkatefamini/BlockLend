import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authAPI } from '../utils/api';
import PublicHeader from '../components/PublicHeader';
import '../styles/pages/Landing.css';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Verifying your email address...');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('Verification link is invalid or missing a token.');
      return;
    }

    authAPI.verifyEmail(token)
      .then((response) => {
        setStatus('success');
        setMessage(response.data.message || 'Email verified successfully.');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(
          err.response?.data?.detail
            || err.response?.data?.message
            || 'Verification failed. The link may be invalid or expired.'
        );
      });
  }, [searchParams]);

  return (
    <div className="landing">
      <PublicHeader />

      <section className="landing-main">
        <div className="landing-main-inner" style={{ justifyContent: 'center' }}>
          <div className="landing-form-wrapper" style={{ maxWidth: '520px' }}>
            <div className="landing-form-header">
              <span>Email Verification</span>
            </div>

            <div className="landing-form">
              {status === 'loading' && (
                <>
                  <div className="spinner" style={{ margin: '1rem auto' }} />
                  <p>{message}</p>
                </>
              )}

              {status === 'success' && (
                <>
                  <div className="alert alert-success">{message}</div>
                  <p className="landing-form-footer">
                    <Link to="/">Sign in to your account</Link>
                  </p>
                </>
              )}

              {status === 'error' && (
                <>
                  <div className="alert alert-danger">{message}</div>
                  <p className="landing-form-footer">
                    <Link to="/">Back to sign in</Link>
                    {' · '}
                    <Link to="/register">Create a new account</Link>
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
