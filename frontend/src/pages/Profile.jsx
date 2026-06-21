import { useState, useEffect } from 'react';
import { userAPI } from '../utils/api';
import '../styles/pages/Profile.css';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await userAPI.getProfile();
      setProfile(response.data);
      setFormData(response.data);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      await userAPI.updateProfile(formData);
      setProfile(formData);
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSubmitting(false);
    }
  };

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
          {/* Profile Card */}
          <div className="profile-card">
            <div className="profile-header">
              <div className="profile-avatar">
                {profile?.username?.charAt(0).toUpperCase()}
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

            {/* Stats */}
            <div className="profile-stats">
              <div className="stat">
                <span className="stat-label">Trust Score</span>
                <span className="stat-value">{profile?.trustScore || 0}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Borrow Count</span>
                <span className="stat-value">{profile?.borrowCount || 0}</span>
              </div>
              <div className="stat">
                <span className="stat-label">On-Time Returns</span>
                <span className="stat-value">{profile?.onTimeReturns || 0}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Late Returns</span>
                <span className="stat-value">{profile?.lateReturns || 0}</span>
              </div>
            </div>

            {/* Profile Details */}
            <div className="profile-details">
              {isEditing ? (
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label>Full Name</label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName || ''}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      type="tel"
                      name="phoneNumber"
                      value={formData.phoneNumber || ''}
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
                    <span className="detail-value">{profile?.fullName || '-'}</span>
                  </div>

                  <div className="detail-item">
                    <span className="detail-label">Phone Number</span>
                    <span className="detail-value">{profile?.phoneNumber || '-'}</span>
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
                    <span className="detail-label">Member Since</span>
                    <span className="detail-value">
                      {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '-'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
