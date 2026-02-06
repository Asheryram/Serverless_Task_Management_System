import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  FiHome, 
  FiCheckSquare, 
  FiUsers, 
  FiUser,
  FiPlusCircle,
  FiList,
  FiClock,
  FiCheckCircle
} from 'react-icons/fi';
import './Sidebar.css';

const Sidebar = () => {
  const { isAdmin } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <div className="nav-section">
          <span className="nav-section-title">Menu</span>
          <Link 
            to="/dashboard" 
            className={`sidebar-link ${isActive('/dashboard') ? 'active' : ''}`}
          >
            <FiHome className="sidebar-icon" />
            <span>Dashboard</span>
          </Link>
          <Link 
            to="/tasks" 
            className={`sidebar-link ${isActive('/tasks') ? 'active' : ''}`}
          >
            <FiCheckSquare className="sidebar-icon" />
            <span>All Tasks</span>
          </Link>
        </div>

        <div className="nav-section">
          <span className="nav-section-title">Quick Filters</span>
          <Link 
            to="/tasks?status=OPEN" 
            className="sidebar-link"
          >
            <FiList className="sidebar-icon" />
            <span>Open Tasks</span>
          </Link>
          <Link 
            to="/tasks?status=IN_PROGRESS" 
            className="sidebar-link"
          >
            <FiClock className="sidebar-icon" />
            <span>In Progress</span>
          </Link>
          <Link 
            to="/tasks?status=COMPLETED" 
            className="sidebar-link"
          >
            <FiCheckCircle className="sidebar-icon" />
            <span>Completed</span>
          </Link>
        </div>

        {isAdmin && (
          <div className="nav-section">
            <span className="nav-section-title">Admin</span>
            <Link 
              to="/tasks?action=create" 
              className="sidebar-link"
            >
              <FiPlusCircle className="sidebar-icon" />
              <span>Create Task</span>
            </Link>
            <Link 
              to="/users" 
              className={`sidebar-link ${isActive('/users') ? 'active' : ''}`}
            >
              <FiUsers className="sidebar-icon" />
              <span>Manage Users</span>
            </Link>
          </div>
        )}

        <div className="nav-section">
          <span className="nav-section-title">Account</span>
          <Link 
            to="/profile" 
            className={`sidebar-link ${isActive('/profile') ? 'active' : ''}`}
          >
            <FiUser className="sidebar-icon" />
            <span>Profile</span>
          </Link>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;
