import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  FiHome, 
  FiCheckSquare, 
  FiUsers, 
  FiSettings,
  FiLogOut 
} from 'react-icons/fi';
import './Header.css';

const Header = () => {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header className="header">
      <div className="header-left">
        <Link to="/dashboard" className="header-logo">
          <span className="logo-icon">📋</span>
          <span className="logo-text">Task Manager</span>
        </Link>
      </div>

      <nav className="header-nav">
        <Link 
          to="/dashboard" 
          className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
        >
          <FiHome />
          <span>Dashboard</span>
        </Link>
        <Link 
          to="/tasks" 
          className={`nav-link ${location.pathname.startsWith('/tasks') ? 'active' : ''}`}
        >
          <FiCheckSquare />
          <span>Tasks</span>
        </Link>
        {isAdmin && (
          <Link 
            to="/users" 
            className={`nav-link ${location.pathname === '/users' ? 'active' : ''}`}
          >
            <FiUsers />
            <span>Users</span>
          </Link>
        )}
      </nav>

      <div className="header-right">
        <div className="user-menu">
          <div className="user-info">
            <span className="user-name">{user?.name || user?.email}</span>
            <span className="user-role">{isAdmin ? 'Admin' : 'Member'}</span>
          </div>
          <div className="user-avatar">
            {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="user-dropdown">
            <Link to="/profile" className="dropdown-item">
              <FiSettings />
              <span>Profile</span>
            </Link>
            <button onClick={handleLogout} className="dropdown-item">
              <FiLogOut />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
