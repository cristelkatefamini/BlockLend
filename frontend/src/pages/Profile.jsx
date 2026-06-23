import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../utils/api';
import PasswordInput from '../components/PasswordInput';
import '../styles/pages/Profile.css';

function maskEmail(email) {
  if (!email) return '-';
  const at = email.indexOf('@');
  if (at <= 0) return email;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const visible = local.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(3, local.length - 2))}@${domain}`;
}

function maskPhone(phone) {
  if (!phone) return '-';
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 2) return phone;
  return `${'*'.repeat(Math.max(7, digits.length - 2))}${digits.slice(-2)}`;
}

function maskDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '**/**/****';
  return `**/**/${d.getFullYear()}`;
}

export default function Profile() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const fileInputRef = useRef(null);
  const [profile, setProfile] = useState(null);
  const [activeSection, setActiveSection] = useState('profile');
  const [formData, setFormData] = useState({});
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await userAPI.getProfile();
      const data = response.data || {};
      setProfile(data);
      setFormData({
        full_name: data.full_name || '',
        phone_number: data.phone_number || '',
      });
    } catch (err) {
      setError('Failed to load profile');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
    setSuccess('');
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const response = await userAPI.updateProfile(formData);
      setProfile(response.data || response);
      setSuccess('Profile updated successfully!');
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (passwordData.new_password !== passwordData.confirm_password) {
      setError('New passwords do not match');
      return;
    }

    setPasswordSubmitting(true);
    try {
      await userAPI.changePassword({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });
      setSuccess('Password changed successfully!');
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    try {
      await userAPI.deleteAccount();
      logout();
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.message || 'Failed to delete account');
    }
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-page-inner">
        {error && <div className="alert alert-danger profile-alert">{error}</div>}
        {success && <div className="alert alert-success profile-alert">{success}</div>}

        <div className="profile-layout">
          <aside className="profile-sidebar">
            <div className="sidebar-user">
              <div className="sidebar-avatar">{profile?.username?.charAt(0).toUpperCase()}</div>
              <div className="sidebar-user-info">
                <span className="sidebar-username">{profile?.username}</span>
                <button
                  type="button"
                  className="sidebar-edit-link"
                  onClick={() => setActiveSection('profile')}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Edit Profile
                </button>
              </div>
            </div>

            <nav className="sidebar-nav">
              <div className="sidebar-nav-group">
                <div className="sidebar-nav-heading">
                  <svg className="sidebar-nav-icon sidebar-nav-icon--blue" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                  My Account
                </div>
                <ul>
                  <li>
                    <button
                      type="button"
                      className={`sidebar-nav-link ${activeSection === 'profile' ? 'sidebar-nav-link--active' : ''}`}
                      onClick={() => setActiveSection('profile')}
                    >
                      Profile
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      className={`sidebar-nav-link ${activeSection === 'password' ? 'sidebar-nav-link--active' : ''}`}
                      onClick={() => setActiveSection('password')}
                    >
                      Change Password
                    </button>
                  </li>
                  <li>
                    <button type="button" className="sidebar-nav-link" onClick={handleDeleteAccount}>
                      Delete Account
                    </button>
                  </li>
                </ul>
              </div>

              <div className="sidebar-nav-group">
                <div className="sidebar-nav-heading">
                  <svg className="sidebar-nav-icon sidebar-nav-icon--blue" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z" />
                  </svg>
                  My Activity
                </div>
                <ul>
                  <li>
                    <Link to="/borrow-history" className="sidebar-nav-link">Borrow History</Link>
                  </li>
                  <li>
                    <Link to="/transactions" className="sidebar-nav-link">Transactions</Link>
                  </li>
                </ul>
              </div>
            </nav>
          </aside>

          <section className="profile-main">
            {activeSection === 'profile' ? (
              <div className="profile-card">
                <div className="profile-card-header">
                  <h1>My Profile</h1>
                  <p>Manage and protect your account</p>
                </div>

                <div className="profile-card-divider" />

                <form className="profile-form" onSubmit={handleSubmit}>
                  <div className="profile-form-body">
                    <div className="profile-form-fields">
                      <div className="profile-field-row">
                        <label className="profile-field-label">Username</label>
                        <div className="profile-field-value profile-field-value--static">
                          {profile?.username}
                        </div>
                      </div>

                      <div className="profile-field-row">
                        <label className="profile-field-label" htmlFor="full_name">Name</label>
                        <div className="profile-field-value">
                          <input
                            id="full_name"
                            type="text"
                            name="full_name"
                            value={formData.full_name || ''}
                            onChange={handleChange}
                            placeholder="Enter your name"
                          />
                        </div>
                      </div>

                      <div className="profile-field-row">
                        <label className="profile-field-label">Email</label>
                        <div className="profile-field-value profile-field-value--masked">
                          <span>{maskEmail(profile?.email)}</span>
                          <button type="button" className="profile-change-link" disabled title="Contact support to change email">
                            Change
                          </button>
                        </div>
                      </div>

                      <div className="profile-field-row">
                        <label className="profile-field-label" htmlFor="phone_number">Phone Number</label>
                        <div className="profile-field-value">
                          <input
                            id="phone_number"
                            type="tel"
                            name="phone_number"
                            value={formData.phone_number || ''}
                            onChange={handleChange}
                            placeholder="Enter phone number"
                          />
                        </div>
                      </div>

                      <div className="profile-field-row">
                        <label className="profile-field-label">
                          Member Since
                          <span className="profile-info-icon" title="Account creation date">ⓘ</span>
                        </label>
                        <div className="profile-field-value profile-field-value--static">
                          <span>{maskDate(profile?.created_at)}</span>
                          {profile?.kyc_verified && (
                            <p className="profile-field-note">
                              You have already done KYC. Some account details cannot be changed.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="profile-form-divider" />

                    <div className="profile-avatar-section">
                      <div className="profile-avatar-large">
                        {profile?.username?.charAt(0).toUpperCase()}
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png"
                        className="profile-file-input"
                        aria-hidden="true"
                        tabIndex={-1}
                      />
                      <button
                        type="button"
                        className="profile-select-image"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Select Image
                      </button>
                      <p className="profile-avatar-note">
                        File size: maximum 1 MB<br />
                        File extension: .JPEG, .PNG
                      </p>
                    </div>
                  </div>

                  <div className="profile-form-actions">
                    <button type="submit" className="profile-save-btn" disabled={submitting}>
                      {submitting ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="profile-card">
                <div className="profile-card-header">
                  <h1>Change Password</h1>
                  <p>Ensure your account is using a strong password</p>
                </div>

                <div className="profile-card-divider" />

                <form className="profile-password-form" onSubmit={handleChangePassword}>
                  <div className="profile-field-row">
                    <label className="profile-field-label" htmlFor="current_password">Current Password</label>
                    <div className="profile-field-value">
                      <PasswordInput
                        id="current_password"
                        name="current_password"
                        value={passwordData.current_password}
                        onChange={handlePasswordChange}
                        required
                        autoComplete="current-password"
                      />
                    </div>
                  </div>

                  <div className="profile-field-row">
                    <label className="profile-field-label" htmlFor="new_password">New Password</label>
                    <div className="profile-field-value">
                      <PasswordInput
                        id="new_password"
                        name="new_password"
                        value={passwordData.new_password}
                        onChange={handlePasswordChange}
                        required
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  <div className="profile-field-row">
                    <label className="profile-field-label" htmlFor="confirm_password">Confirm Password</label>
                    <div className="profile-field-value">
                      <PasswordInput
                        id="confirm_password"
                        name="confirm_password"
                        value={passwordData.confirm_password}
                        onChange={handlePasswordChange}
                        required
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  <div className="profile-form-actions">
                    <button type="submit" className="profile-save-btn" disabled={passwordSubmitting}>
                      {passwordSubmitting ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
