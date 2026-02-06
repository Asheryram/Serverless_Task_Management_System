import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FiMail, FiLock, FiUser, FiEye, FiEyeOff } from 'react-icons/fi';
import './Login.css';

const Login = () => {
  const { login, register, confirmRegistration, completeNewPassword } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isNewPasswordRequired, setIsNewPasswordRequired] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmationCode: '',
    newPassword: '',
    confirmNewPassword: ''
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateEmail = (email) => {
    const allowedDomains = ['amalitech.com', 'amalitechtraining.org'];
    const domain = email.split('@')[1]?.toLowerCase();
    return allowedDomains.includes(domain);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    try {
      if (isNewPasswordRequired) {
        // Complete new password challenge
        if (formData.newPassword !== formData.confirmNewPassword) {
          setErrors({ confirmNewPassword: 'Passwords do not match' });
          setIsLoading(false);
          return;
        }
        if (formData.newPassword.length < 8) {
          setErrors({ newPassword: 'Password must be at least 8 characters' });
          setIsLoading(false);
          return;
        }
        const result = await completeNewPassword(formData.newPassword);
        if (result.success) {
          toast.success('Password changed successfully! Welcome!');
          setIsNewPasswordRequired(false);
        }
      } else if (isConfirming) {
        // Confirm registration
        await confirmRegistration(formData.email, formData.confirmationCode);
        toast.success('Email verified! You can now log in.');
        setIsConfirming(false);
        setIsLogin(true);
        setFormData(prev => ({ ...prev, confirmationCode: '' }));
      } else if (isLogin) {
        // Login
        const result = await login(formData.email, formData.password);
        if (result.success) {
          toast.success('Welcome back!');
        } else if (result.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
          setIsNewPasswordRequired(true);
          toast.info('Please set a new password');
        }
      } else {
        // Register
        if (!validateEmail(formData.email)) {
          setErrors({ email: 'Only @amalitech.com and @amalitechtraining.org emails are allowed' });
          setIsLoading(false);
          return;
        }

        const result = await register(formData.email, formData.password, formData.name);
        if (result.success) {
          toast.success('Registration successful! Please check your email for verification code.');
          setIsConfirming(true);
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      
      let errorMessage = error.message || 'An error occurred';
      
      if (error.name === 'UserNotConfirmedException') {
        setIsConfirming(true);
        errorMessage = 'Please verify your email first';
      } else if (error.name === 'NotAuthorizedException') {
        errorMessage = 'Invalid email or password';
      } else if (error.name === 'UsernameExistsException') {
        errorMessage = 'An account with this email already exists';
      } else if (error.name === 'InvalidPasswordException') {
        errorMessage = 'Password must be at least 8 characters with uppercase, lowercase, number, and symbol';
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const renderConfirmation = () => (
    <form onSubmit={handleSubmit} className="login-form">
      <div className="form-header">
        <h2>Verify Your Email</h2>
        <p>We sent a verification code to {formData.email}</p>
      </div>

      <div className="form-group">
        <label className="form-label">Verification Code</label>
        <div className="input-wrapper">
          <input
            type="text"
            name="confirmationCode"
            value={formData.confirmationCode}
            onChange={handleChange}
            className="form-input"
            placeholder="Enter 6-digit code"
            required
          />
        </div>
      </div>

      <button type="submit" className="btn btn-primary btn-lg" disabled={isLoading}>
        {isLoading ? 'Verifying...' : 'Verify Email'}
      </button>

      <p className="form-footer">
        <button 
          type="button" 
          className="link-button"
          onClick={() => setIsConfirming(false)}
        >
          Back to Login
        </button>
      </p>
    </form>
  );

  const renderNewPasswordForm = () => (
    <form onSubmit={handleSubmit} className="login-form">
      <div className="form-header">
        <h2>Set New Password</h2>
        <p>Please create a new password for your account</p>
      </div>

      <div className="form-group">
        <label className="form-label">New Password</label>
        <div className="input-wrapper">
          <FiLock className="input-icon" />
          <input
            type={showPassword ? 'text' : 'password'}
            name="newPassword"
            value={formData.newPassword}
            onChange={handleChange}
            className={`form-input with-icon ${errors.newPassword ? 'error' : ''}`}
            placeholder="Enter new password"
            required
          />
          <button 
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <FiEyeOff /> : <FiEye />}
          </button>
        </div>
        {errors.newPassword && <span className="form-error">{errors.newPassword}</span>}
        <span className="form-hint">Min 8 chars with uppercase, lowercase, number & symbol</span>
      </div>

      <div className="form-group">
        <label className="form-label">Confirm New Password</label>
        <div className="input-wrapper">
          <FiLock className="input-icon" />
          <input
            type={showPassword ? 'text' : 'password'}
            name="confirmNewPassword"
            value={formData.confirmNewPassword}
            onChange={handleChange}
            className={`form-input with-icon ${errors.confirmNewPassword ? 'error' : ''}`}
            placeholder="Confirm new password"
            required
          />
        </div>
        {errors.confirmNewPassword && <span className="form-error">{errors.confirmNewPassword}</span>}
      </div>

      <button type="submit" className="btn btn-primary btn-lg" disabled={isLoading}>
        {isLoading ? 'Setting Password...' : 'Set Password'}
      </button>
    </form>
  );

  const renderForm = () => (
    <form onSubmit={handleSubmit} className="login-form">
      <div className="form-header">
        <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
        <p>{isLogin ? 'Sign in to your account' : 'Sign up for a new account'}</p>
      </div>

      {!isLogin && (
        <div className="form-group">
          <label className="form-label">Full Name</label>
          <div className="input-wrapper">
            <FiUser className="input-icon" />
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="form-input with-icon"
              placeholder="Enter your full name"
              required={!isLogin}
            />
          </div>
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Email Address</label>
        <div className="input-wrapper">
          <FiMail className="input-icon" />
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={`form-input with-icon ${errors.email ? 'error' : ''}`}
            placeholder="name@amalitech.com"
            required
          />
        </div>
        {errors.email && <span className="form-error">{errors.email}</span>}
        {!isLogin && (
          <span className="form-hint">Only @amalitech.com and @amalitechtraining.org emails allowed</span>
        )}
      </div>

      <div className="form-group">
        <label className="form-label">Password</label>
        <div className="input-wrapper">
          <FiLock className="input-icon" />
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="form-input with-icon"
            placeholder="Enter your password"
            required
          />
          <button 
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <FiEyeOff /> : <FiEye />}
          </button>
        </div>
        {!isLogin && (
          <span className="form-hint">Min 8 chars with uppercase, lowercase, number & symbol</span>
        )}
      </div>

      <button type="submit" className="btn btn-primary btn-lg" disabled={isLoading}>
        {isLoading ? (isLogin ? 'Signing in...' : 'Creating account...') : (isLogin ? 'Sign In' : 'Create Account')}
      </button>

      <p className="form-footer">
        {isLogin ? "Don't have an account? " : "Already have an account? "}
        <button 
          type="button" 
          className="link-button"
          onClick={() => {
            setIsLogin(!isLogin);
            setErrors({});
          }}
        >
          {isLogin ? 'Sign Up' : 'Sign In'}
        </button>
      </p>
    </form>
  );

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-brand">
          <span className="login-logo">📋</span>
          <h1>Task Management System</h1>
          <p>Manage your tasks efficiently with role-based access control</p>
        </div>
        
        <div className="login-card">
          {isNewPasswordRequired ? renderNewPasswordForm() : isConfirming ? renderConfirmation() : renderForm()}
        </div>

        <div className="login-footer">
          <p>© 2026 AmaliTech. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
