import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { taskApi } from '../services/api';
import { 
  FiCheckSquare, 
  FiClock, 
  FiCheckCircle, 
  FiAlertCircle,
  FiTrendingUp,
  FiPlus
} from 'react-icons/fi';
import './Dashboard.css';

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    completed: 0,
    closed: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await taskApi.getAll();
      const taskList = response.tasks || [];
      setTasks(taskList);
      
      // Calculate stats
      setStats({
        total: taskList.length,
        open: taskList.filter(t => t.status === 'OPEN').length,
        inProgress: taskList.filter(t => t.status === 'IN_PROGRESS').length,
        completed: taskList.filter(t => t.status === 'COMPLETED').length,
        closed: taskList.filter(t => t.status === 'CLOSED').length
      });
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const recentTasks = tasks
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 5);

  const getStatusBadge = (status) => {
    const statusMap = {
      'OPEN': 'badge-open',
      'IN_PROGRESS': 'badge-in-progress',
      'COMPLETED': 'badge-completed',
      'CLOSED': 'badge-closed'
    };
    return statusMap[status] || 'badge-open';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Welcome back, {user?.name || 'User'}!</h1>
          <p>Here's an overview of your tasks</p>
        </div>
        {isAdmin && (
          <Link to="/tasks?action=create" className="btn btn-primary">
            <FiPlus />
            Create Task
          </Link>
        )}
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon total">
            <FiCheckSquare />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total Tasks</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon open">
            <FiAlertCircle />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.open}</span>
            <span className="stat-label">Open</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon in-progress">
            <FiClock />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.inProgress}</span>
            <span className="stat-label">In Progress</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon completed">
            <FiCheckCircle />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.completed}</span>
            <span className="stat-label">Completed</span>
          </div>
        </div>
      </div>

      {/* Recent Tasks */}
      <div className="dashboard-section">
        <div className="section-header">
          <h2>
            <FiTrendingUp />
            Recent Activity
          </h2>
          <Link to="/tasks" className="btn btn-secondary btn-sm">
            View All Tasks
          </Link>
        </div>

        <div className="card">
          {recentTasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-title">No tasks yet</div>
              <div className="empty-state-description">
                {isAdmin 
                  ? "Create your first task to get started"
                  : "Tasks assigned to you will appear here"
                }
              </div>
              {isAdmin && (
                <Link to="/tasks?action=create" className="btn btn-primary">
                  <FiPlus /> Create Task
                </Link>
              )}
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Due Date</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTasks.map((task) => (
                    <tr key={task.taskId}>
                      <td>
                        <Link to={`/tasks/${task.taskId}`} className="task-link">
                          {task.title}
                        </Link>
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadge(task.status)}`}>
                          {task.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <span className={`priority-${task.priority?.toLowerCase()}`}>
                          {task.priority || 'MEDIUM'}
                        </span>
                      </td>
                      <td>{formatDate(task.dueDate)}</td>
                      <td>{formatDate(task.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
