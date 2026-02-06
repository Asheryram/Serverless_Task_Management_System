import React, { useState, useEffect, useCallback } from 'react';
import { 
  FiUsers, 
  FiSearch, 
  FiFilter, 
  FiMail, 
  FiShield,
  FiUser,
  FiCalendar
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { userApi } from '../services/api';
import './Users.css';

function Users() {
  const { user } = useAuth();
  const isAdmin = user?.groups?.includes('Admins');

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Fetching users...');
      const response = await userApi.getAll();
      console.log('Users response:', response);
      setUsers(response.users || response || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const userRole = u.role || 'member';
    const matchesRole = roleFilter === 'all' || userRole === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Count admins and members
  const adminCount = users.filter(u => u.role === 'admin').length;
  const memberCount = users.filter(u => u.role === 'member' || !u.role).length;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRoleBadgeClass = (role) => {
    return role === 'admin' ? 'role-badge role-admin' : 'role-badge role-member';
  };

  if (!isAdmin) {
    return (
      <div className="users-page">
        <div className="access-denied">
          <FiShield size={48} />
          <h2>Access Denied</h2>
          <p>You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="users-page">
      <div className="page-header">
        <div>
          <h1>Team Members</h1>
          <p>Manage and view all team members</p>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search users..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <FiFilter className="filter-icon" />
          <select
            className="filter-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="admin">Admins</option>
            <option value="member">Members</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="user-stats">
        <div className="stat-card">
          <div className="stat-icon">
            <FiUsers />
          </div>
          <div className="stat-info">
            <span className="stat-value">{users.length}</span>
            <span className="stat-label">Total Users</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon admin">
            <FiShield />
          </div>
          <div className="stat-info">
            <span className="stat-value">{adminCount}</span>
            <span className="stat-label">Admins</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon member">
            <FiUser />
          </div>
          <div className="stat-info">
            <span className="stat-value">{memberCount}</span>
            <span className="stat-label">Members</span>
          </div>
        </div>
      </div>

      {/* Users Grid */}
      {loading ? (
        <div className="loading-state">Loading users...</div>
      ) : filteredUsers.length === 0 ? (
        <div className="empty-state">
          <FiUsers size={48} />
          <h3>No users found</h3>
          <p>Try adjusting your search or filter criteria.</p>
        </div>
      ) : (
        <div className="users-grid">
          {filteredUsers.map(userData => (
            <div key={userData.userId} className="user-card">
              <div className="user-card-header">
                <div className="user-avatar-large">
                  {userData.name?.charAt(0) || userData.email?.charAt(0) || '?'}
                </div>
                <span className={getRoleBadgeClass(userData.role)}>
                  {userData.role === 'admin' ? <FiShield /> : <FiUser />}
                  {userData.role}
                </span>
              </div>
              <div className="user-card-body">
                <h3 className="user-name">{userData.name || 'Unknown'}</h3>
                <div className="user-detail">
                  <FiMail />
                  <span>{userData.email}</span>
                </div>
                <div className="user-detail">
                  <FiCalendar />
                  <span>Joined {formatDate(userData.createdAt)}</span>
                </div>
              </div>
              <div className="user-card-footer">
                <span className="task-count">
                  {userData.assignedTasks?.length || 0} tasks assigned
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Users;
