import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

function SignUpPage({ setUser }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('parent');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    try {
      const response = await axios.post('http://localhost:1000/api/auth/signup', {
        name,
        email,
        password,
        role
      });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user); // Update App state
      if (user.role === 'owner') {
        navigate('/owner');
      } else if (user.role === 'parent') {
        navigate('/parent');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed');
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center py-8">
    <div className="form-container border border-secondary rounded p-4 shadow-lg w-50">
  
        <h2 className="text-center">Sign Up</h2>
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="name" className="form-label">Full Name</label>
            <input
              type="text"
              className="form-control"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              required
            />
          </div>
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
            <label htmlFor="role" className="form-label">Account Type</label>
            <select
              className="form-select"
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
            >
              <option value="parent">Parent</option>
              <option value="owner">Owner</option>
            </select>
          </div>
          <div className="mb-3">
            <label htmlFor="password" className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="confirm-password" className="form-label">Confirm Password</label>
            <input
              type="password"
              className="form-control"
              id="confirm-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-2">
            <UserPlus className="h-4 w-4" />
            Sign Up
          </button>
          <p className="text-center mt-3 text-muted">
            Have an account? <Link to="/login" className="text-primary">Login</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default SignUpPage;