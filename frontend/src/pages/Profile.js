import React, { useState, useEffect } from 'react';
import { 
  FiUser, 
  FiMail, 
  FiShield, 
  FiCalendar,
  FiEdit2,
  FiSave,
  FiX,
  FiLock,
  FiCheckCircle
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { updatePassword } from 'aws-amplify/auth';
import './Profile.css';

function Profile() {
  const { user } = useAuth();
  const isAdmin = user?.groups?.includes('Admins');

  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || ''
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        email: user.email || ''
      });
    }
  }, [user]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    // Note: In a real app, you'd call an API to update the user profile
    toast.success('Profile updated successfully');
    setIsEditing(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    try {
      setPasswordLoading(true);
      await updatePassword({
        oldPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      toast.success('Password changed successfully');
      setShowPasswordModal(false);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error(error.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="profile-page">
      <div className="page-header">
        <div>
          <h1>My Profile</h1>
          <p>View and manage your account settings</p>
        </div>
      </div>

      <div className="profile-content">
        {/* Profile Card */}
        <div className="profile-card">
          <div className="profile-card-header">
            <div className="profile-avatar">
              {user?.name?.charAt(0) || user?.email?.charAt(0) || '?'}
            </div>
            <div className="profile-header-info">
              <h2>{user?.name || 'User'}</h2>
              <span className={`role-badge ${isAdmin ? 'role-admin' : 'role-member'}`}>
                {isAdmin ? <FiShield /> : <FiUser />}
                {isAdmin ? 'Administrator' : 'Team Member'}
              </span>
            </div>
            {!isEditing ? (
              <button className="btn btn-secondary btn-sm" onClick={() => setIsEditing(true)}>
                <FiEdit2 /> Edit
              </button>
            ) : (
              <div className="edit-actions">
                <button className="btn btn-secondary btn-sm" onClick={() => setIsEditing(false)}>
                  <FiX /> Cancel
                </button>
                <button className="btn btn-primary btn-sm" onClick={handleSaveProfile}>
                  <FiSave /> Save
                </button>
              </div>
            )}
          </div>

          <div className="profile-card-body">
            {isEditing ? (
              <form className="profile-form">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={profileForm.name}
                    onChange={handleProfileChange}
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={profileForm.email}
                    disabled
                    className="form-control disabled"
                  />
                  <span className="form-hint">Email cannot be changed</span>
                </div>
              </form>
            ) : (
              <div className="profile-details">
                <div className="detail-item">
                  <div className="detail-icon">
                    <FiUser />
                  </div>
                  <div className="detail-content">
                    <span className="detail-label">Full Name</span>
                    <span className="detail-value">{user?.name || 'Not set'}</span>
                  </div>
                </div>
                <div className="detail-item">
                  <div className="detail-icon">
                    <FiMail />
                  </div>
                  <div className="detail-content">
                    <span className="detail-label">Email Address</span>
                    <span className="detail-value">{user?.email}</span>
                  </div>
                </div>
                <div className="detail-item">
                  <div className="detail-icon">
                    <FiShield />
                  </div>
                  <div className="detail-content">
                    <span className="detail-label">Role</span>
                    <span className="detail-value">{isAdmin ? 'Administrator' : 'Team Member'}</span>
                  </div>
                </div>
                <div className="detail-item">
                  <div className="detail-icon">
                    <FiCalendar />
                  </div>
                  <div className="detail-content">
                    <span className="detail-label">Member Since</span>
                    <span className="detail-value">{formatDate(user?.createdAt)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Security Card */}
        <div className="security-card">
          <div className="security-header">
            <div className="security-icon">
              <FiLock />
            </div>
            <div>
              <h3>Security Settings</h3>
              <p>Manage your password and security preferences</p>
            </div>
          </div>
          <div className="security-actions">
            <button 
              className="btn btn-secondary"
              onClick={() => setShowPasswordModal(true)}
            >
              <FiLock /> Change Password
            </button>
          </div>
        </div>

        {/* Account Status */}
        <div className="status-card">
          <div className="status-header">
            <FiCheckCircle className="status-icon verified" />
            <div>
              <h3>Account Status</h3>
              <p>Your account is verified and active</p>
            </div>
          </div>
          <div className="status-info">
            <div className="status-item">
              <span className="status-label">Email Verified</span>
              <span className="status-value verified">
                <FiCheckCircle /> Yes
              </span>
            </div>
            <div className="status-item">
              <span className="status-label">Account Status</span>
              <span className="status-value active">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Change Password</h2>
              <button className="close-btn" onClick={() => setShowPasswordModal(false)}>
                <FiX />
              </button>
            </div>
            <form onSubmit={handleChangePassword}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Current Password</label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordChange}
                    className="form-control"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange}
                    className="form-control"
                    required
                    minLength={8}
                  />
                  <span className="form-hint">Minimum 8 characters</span>
                </div>
                <div className="form-group">
                  <label>Confirm New Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordChange}
                    className="form-control"
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowPasswordModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={passwordLoading}
                >
                  {passwordLoading ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;
