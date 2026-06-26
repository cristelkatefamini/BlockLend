import { useState, useEffect } from 'react';

import { useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

import { userAPI } from '../utils/api';

import '../styles/pages/Profile.css';



export default function Profile() {

  const navigate = useNavigate();

  const { logout } = useAuth();

  const [profile, setProfile] = useState(null);

  const [isEditing, setIsEditing] = useState(false);

  const [showPasswordModal, setShowPasswordModal] = useState(false);

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

  const [avatarUploading, setAvatarUploading] = useState(false);



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

        address: data.address || '',

        department: data.department || '',

        section: data.section || '',

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

    setFormData(prev => ({ ...prev, [name]: value }));

  };



  const handlePasswordChange = (e) => {

    const { name, value } = e.target;

    setPasswordData(prev => ({ ...prev, [name]: value }));

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

      setIsEditing(false);

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

      setShowPasswordModal(false);

    } catch (err) {

      setError(err.response?.data?.detail || err.response?.data?.message || 'Failed to change password');

    } finally {

      setPasswordSubmitting(false);

    }

  };



  const handleAvatarChange = async (e) => {

    const file = e.target.files?.[0];

    if (!file) return;



    if (!file.type.startsWith('image/')) {

      setError('Please select an image file');

      return;

    }



    setError('');

    setSuccess('');

    setAvatarUploading(true);



    try {

      const response = await userAPI.uploadProfileImage(file);

      setProfile(response.data || response);

      setSuccess('Profile photo updated!');

    } catch (err) {

      setError(err.response?.data?.detail || err.response?.data?.message || 'Failed to upload profile photo');

    } finally {

      setAvatarUploading(false);

      e.target.value = '';

    }

  };



  const handleDeleteAccount = async () => {

    if (!window.confirm(
      'Are you sure you want to permanently delete your account?\n\nThis will remove your profile, borrow history, trust points, notifications, and all related data. This action cannot be undone.'
    )) {

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



  const closePasswordModal = () => {

    setShowPasswordModal(false);

    setPasswordData({ current_password: '', new_password: '', confirm_password: '' });

  };



  const warningCount = profile?.warning_count || 0;

  const maxWarnings = profile?.max_warnings || 3;

  const hasWarnings = warningCount > 0;

  const trustScore = profile?.trust_score ?? profile?.credit_score ?? 0;

  const lowTrustScore = trustScore < 0;

  const showTrustAlert = lowTrustScore || hasWarnings;



  if (loading) {

    return (

      <div className="loading">

        <div className="spinner"></div>

      </div>

    );

  }



  return (

    <div className="profile-container">

      <div className="container">

        {error && <div className="alert alert-danger">{error}</div>}

        {success && <div className="alert alert-success">{success}</div>}



        <div className="profile-wrapper">

          <div className="profile-card">

            <div className="profile-header">

              <div className="profile-avatar-wrapper">

                <div className="profile-avatar">

                  {profile?.profile_image ? (

                    <img src={profile.profile_image} alt={profile.username} className="profile-avatar-img" />

                  ) : (

                    profile?.username?.charAt(0).toUpperCase()

                  )}

                </div>

                <label className="profile-avatar-upload" title="Change profile photo">

                  <input

                    type="file"

                    accept="image/*"

                    onChange={handleAvatarChange}

                    disabled={avatarUploading}

                    hidden

                  />

                  {avatarUploading ? '...' : '📷'}

                </label>

              </div>

              <div className="profile-info">

                <h1>{profile?.username}</h1>

                <p className="profile-email">{profile?.email}</p>

                <span className="profile-role">{profile?.role}</span>

              </div>

              <button

                className="btn btn-secondary btn-sm"

                onClick={() => setIsEditing(!isEditing)}

              >

                {isEditing ? 'Cancel' : 'Edit Profile'}

              </button>

            </div>



            {profile?.role !== 'admin' && (

              <>

                {lowTrustScore && (
                  <div className="profile-warning-banner profile-trust-banner">
                    <span className="warning-icon">⚠</span>
                    <div>
                      <strong>Low Trust Score: {trustScore}</strong>
                      <p>Your trust score is below 0. Each warning is issued when your score reaches -25 (then resets to 0). Return items on time and in good condition to recover.</p>
                    </div>
                  </div>
                )}

                {hasWarnings && (

                  <div className="profile-warning-banner">

                    <span className="warning-icon">⚠</span>

                    <div>

                      <strong>Warning: {warningCount} of {maxWarnings}</strong>

                      <p>
                        {warningCount >= 2
                          ? 'You have 2 warnings. If your trust score reaches -25 again, your account will be permanently banned.'
                          : 'Your trust score reached -25 and was reset to 0. Avoid dropping to -25 again to prevent a ban.'}
                      </p>

                    </div>

                  </div>

                )}



                <div className={`profile-stats ${showTrustAlert ? 'profile-stats--warned' : ''}`}>

                  <div className={`stat ${showTrustAlert ? 'stat--warning' : ''}`}>

                    <span className="stat-label">Trust Score</span>

                    <span className={`stat-value ${showTrustAlert ? 'stat-value--danger' : ''}`}>

                      {trustScore}

                    </span>

                    {showTrustAlert && <span className="stat-warning-badge">⚠</span>}

                  </div>

                  <div className="stat">

                    <span className="stat-label">Borrow Count</span>

                    <span className="stat-value">{profile?.borrow_count || 0}</span>

                  </div>

                  <div className="stat">

                    <span className="stat-label">On-Time Returns</span>

                    <span className="stat-value">{profile?.on_time_returns || 0}</span>

                  </div>

                  <div className="stat">

                    <span className="stat-label">Late Returns</span>

                    <span className={`stat-value ${(profile?.late_returns || 0) > 0 ? 'stat-value--danger' : ''}`}>

                      {profile?.late_returns || 0}

                    </span>

                  </div>

                </div>

              </>

            )}



            <div className="profile-details">

              {isEditing ? (

                <form onSubmit={handleSubmit}>

                  <div className="form-group">

                    <label>Full Name</label>

                    <input

                      type="text"

                      name="full_name"

                      value={formData.full_name || ''}

                      onChange={handleChange}

                    />

                  </div>



                  <div className="form-group">

                    <label>Phone Number</label>

                    <input

                      type="tel"

                      name="phone_number"

                      value={formData.phone_number || ''}

                      onChange={handleChange}

                    />

                  </div>



                  <div className="form-group">

                    <label>Address</label>

                    <textarea

                      name="address"

                      value={formData.address || ''}

                      onChange={handleChange}

                    />

                  </div>



                  <div className="form-group">

                    <label>Department</label>

                    <input

                      type="text"

                      name="department"

                      value={formData.department || ''}

                      onChange={handleChange}

                    />

                  </div>



                  <div className="form-group">

                    <label>Section</label>

                    <input

                      type="text"

                      name="section"

                      value={formData.section || ''}

                      onChange={handleChange}

                    />

                  </div>



                  <div className="form-actions">

                    <button

                      type="button"

                      className="btn btn-secondary"

                      onClick={() => setIsEditing(false)}

                    >

                      Cancel

                    </button>

                    <button

                      type="submit"

                      className="btn btn-primary"

                      disabled={submitting}

                    >

                      {submitting ? 'Saving...' : 'Save Changes'}

                    </button>

                  </div>

                </form>

              ) : (

                <div className="details-view">

                  <div className="detail-item">

                    <span className="detail-label">Full Name</span>

                    <span className="detail-value">{profile?.full_name || '-'}</span>

                  </div>



                  <div className="detail-item">

                    <span className="detail-label">Phone Number</span>

                    <span className="detail-value">{profile?.phone_number || '-'}</span>

                  </div>



                  <div className="detail-item">

                    <span className="detail-label">Address</span>

                    <span className="detail-value">{profile?.address || '-'}</span>

                  </div>



                  <div className="detail-item">

                    <span className="detail-label">Department</span>

                    <span className="detail-value">{profile?.department || '-'}</span>

                  </div>



                  <div className="detail-item">

                    <span className="detail-label">Section</span>

                    <span className="detail-value">{profile?.section || '-'}</span>

                  </div>



                  <div className="detail-item">

                    <span className="detail-label">Member Since</span>

                    <span className="detail-value">

                      {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '-'}

                    </span>

                  </div>

                </div>

              )}

            </div>



            <div className="profile-details" style={{ borderTop: '1px solid #eef2f7' }}>

              <div className="form-actions">

                <button

                  type="button"

                  className="btn btn-secondary"

                  onClick={() => setIsEditing(true)}

                >

                  Edit Profile

                </button>

                <button

                  type="button"

                  className="btn btn-primary"

                  onClick={() => setShowPasswordModal(true)}

                >

                  Change Password

                </button>

                <button

                  type="button"

                  className="btn btn-danger"

                  onClick={handleDeleteAccount}

                >

                  Delete Account

                </button>

              </div>

            </div>

          </div>

        </div>

      </div>



      {showPasswordModal && (

        <div className="modal-overlay" onClick={closePasswordModal}>

          <div className="modal-content profile-modal" onClick={(e) => e.stopPropagation()}>

            <div className="modal-header">

              <h2>Change Password</h2>

              <button type="button" className="close-btn" onClick={closePasswordModal}>✕</button>

            </div>

            <div className="modal-body">

              <form onSubmit={handleChangePassword}>

                <div className="form-group">

                  <label>Current Password</label>

                  <input

                    type="password"

                    name="current_password"

                    value={passwordData.current_password}

                    onChange={handlePasswordChange}

                    required

                  />

                </div>

                <div className="form-group">

                  <label>New Password</label>

                  <input

                    type="password"

                    name="new_password"

                    value={passwordData.new_password}

                    onChange={handlePasswordChange}

                    required

                  />

                </div>

                <div className="form-group">

                  <label>Confirm New Password</label>

                  <input

                    type="password"

                    name="confirm_password"

                    value={passwordData.confirm_password}

                    onChange={handlePasswordChange}

                    required

                  />

                </div>

                <div className="modal-footer">

                  <button type="button" className="btn btn-secondary" onClick={closePasswordModal}>

                    Cancel

                  </button>

                  <button type="submit" className="btn btn-primary" disabled={passwordSubmitting}>

                    {passwordSubmitting ? 'Saving...' : 'Update Password'}

                  </button>

                </div>

              </form>

            </div>

          </div>

        </div>

      )}

    </div>

  );

}


