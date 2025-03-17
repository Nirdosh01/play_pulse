import React, { useState } from 'react';
import { LogIn } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

function LoginPage({ setUser }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotStep, setForgotStep] = useState(1); // 1: email, 2: code, 3: new password
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:1000/api/auth/login', { email, password });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);

      if (user.role === 'owner') {
        navigate('/owner');
      } else if (user.role === 'parent') {
        navigate('/parent');
      } else if (user.role === 'coach') {
        navigate('/coach');
      } else {
        setError('Unknown user role');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    try {
      if (forgotStep === 1) {
        const response = await axios.post('http://localhost:1000/api/auth/forgot-password', { email: forgotEmail });
        setError('');
        setForgotStep(2);
      } else if (forgotStep === 2) {
        const response = await axios.post('http://localhost:1000/api/auth/verify-reset-code', { 
          email: forgotEmail, 
          code: resetCode 
        });
        setError('');
        setForgotStep(3);
      } else if (forgotStep === 3) {
        const response = await axios.post('http://localhost:1000/api/auth/reset-password', { 
          email: forgotEmail, 
          code: resetCode, 
          newPassword 
        });
        setError('');
        setShowForgotPassword(false);
        setForgotStep(1);
        setForgotEmail('');
        setResetCode('');
        setNewPassword('');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error in password reset process');
    }
  };

  const cancelForgotPassword = () => {
    setShowForgotPassword(false);
    setForgotStep(1);
    setForgotEmail('');
    setResetCode('');
    setNewPassword('');
    setError('');
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center py-8">
      <div className="form-container border border-secondary rounded p-4 shadow-lg w-50">
        <h2 className="text-center">Login</h2>
        {error && <div className="alert alert-danger">{error}</div>}
        
        {/* Login Form */}
        {!showForgotPassword && (
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="email" className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor="password" className="form-label">Password</label>
              <input
                type="password"
                className="form-control"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-2"
            >
              <LogIn className="h-4 w-4" />
              Login
            </button>
            <p className="text-center mt-3 text-muted">
              New here? <Link to="/signup" className="text-primary">Sign Up</Link>
            </p>
            <button
              type="button"
              className="btn btn-link w-100"
              onClick={() => setShowForgotPassword(true)}
            >
              Forgot Password?
            </button>
          </form>
        )}

        {/* Forgot Password Popup */}
        {showForgotPassword && (
          <form onSubmit={handleForgotPassword}>
            {forgotStep === 1 && (
              <>
                <h4>Reset Password</h4>
                <div className="mb-3">
                  <label htmlFor="forgotEmail" className="form-label">Enter your email</label>
                  <input
                    type="email"
                    className="form-control"
                    id="forgotEmail"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="Your email"
                    required
                  />
                </div>
              </>
            )}
            {forgotStep === 2 && (
              <>
                <h4>Enter Reset Code</h4>
                <div className="mb-3">
                  <label htmlFor="resetCode" className="form-label">6-digit code sent to your email</label>
                  <input
                    type="text"
                    className="form-control"
                    id="resetCode"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    placeholder="Enter code"
                    required
                  />
                </div>
              </>
            )}
            {forgotStep === 3 && (
              <>
                <h4>Set New Password</h4>
                <div className="mb-3">
                  <label htmlFor="newPassword" className="form-label">New Password</label>
                  <input
                    type="password"
                    className="form-control"
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password"
                    required
                  />
                </div>
              </>
            )}
            <div className="d-flex justify-content-between">
              <button type="submit" className="btn btn-primary">
                {forgotStep === 1 ? 'Send Code' : forgotStep === 2 ? 'Verify Code' : 'Reset Password'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={cancelForgotPassword}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default LoginPage;