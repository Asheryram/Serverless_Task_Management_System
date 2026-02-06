import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { taskApi, userApi } from '../services/api';
import { toast } from 'react-toastify';
import { 
  FiPlus, 
  FiFilter,
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiX,
  FiUsers
} from 'react-icons/fi';
import './Tasks.css';

const Tasks = () => {
  const { isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [searchTerm, setSearchTerm] = useState('');

  // Form state for creating task
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    dueDate: ''
  });

  // Selected members for assignment
  const [selectedMembers, setSelectedMembers] = useState([]);

  useEffect(() => {
    fetchTasks();
    if (isAdmin) {
      fetchUsers();
    }
    
    // Check if action=create is in URL
    if (searchParams.get('action') === 'create' && isAdmin) {
      setShowCreateModal(true);
      searchParams.delete('action');
      setSearchParams(searchParams);
    }
  }, [statusFilter]);

  const fetchTasks = async () => {
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const response = await taskApi.getAll(params);
      setTasks(response.tasks || []);
    } catch (error) {
      toast.error('Failed to fetch tasks');
      console.error('Error fetching tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      // Fetch all users and filter out admins on the client side
      const response = await userApi.getAll();
      console.log('All users response:', response);
      // For now, show all users except the current admin
      setUsers(response.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await taskApi.create(formData);
      toast.success('Task created successfully!');
      setShowCreateModal(false);
      setFormData({ title: '', description: '', priority: 'MEDIUM', dueDate: '' });
      fetchTasks();
    } catch (error) {
      toast.error(error.message || 'Failed to create task');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    
    try {
      await taskApi.delete(taskId);
      toast.success('Task deleted successfully!');
      fetchTasks();
    } catch (error) {
      toast.error(error.message || 'Failed to delete task');
    }
  };

  const handleAssignTask = async (e) => {
    e.preventDefault();
    if (selectedMembers.length === 0) {
      toast.error('Please select at least one member');
      return;
    }

    try {
      await taskApi.assign(selectedTask.taskId, selectedMembers);
      toast.success('Task assigned successfully!');
      setShowAssignModal(false);
      setSelectedTask(null);
      setSelectedMembers([]);
      fetchTasks();
    } catch (error) {
      toast.error(error.message || 'Failed to assign task');
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await taskApi.updateStatus(taskId, newStatus);
      toast.success('Status updated successfully!');
      fetchTasks();
    } catch (error) {
      toast.error(error.message || 'Failed to update status');
    }
  };

  const openAssignModal = (task) => {
    setSelectedTask(task);
    setSelectedMembers(task.assignedMembers || []);
    setShowAssignModal(true);
  };

  const toggleMemberSelection = (userId) => {
    setSelectedMembers(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

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

  // Filter tasks by search term
  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="tasks-page">
      <div className="page-header">
        <div>
          <h1>Tasks</h1>
          <p>{filteredTasks.length} tasks found</p>
        </div>
        {isAdmin && (
          <button 
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <FiPlus />
            Create Task
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <FiFilter className="filter-icon" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </div>

      {/* Tasks List */}
      <div className="card">
        {filteredTasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">No tasks found</div>
            <div className="empty-state-description">
              {searchTerm || statusFilter
                ? "Try adjusting your filters"
                : isAdmin
                  ? "Create your first task to get started"
                  : "Tasks assigned to you will appear here"
              }
            </div>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Assigned</th>
                  <th>Due Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => (
                  <tr key={task.taskId}>
                    <td>
                      <Link to={`/tasks/${task.taskId}`} className="task-title-link">
                        <strong>{task.title}</strong>
                        {task.description && (
                          <span className="task-description">{task.description.substring(0, 60)}...</span>
                        )}
                      </Link>
                    </td>
                    <td>
                      <select
                        value={task.status}
                        onChange={(e) => handleStatusChange(task.taskId, e.target.value)}
                        className={`status-select ${getStatusBadge(task.status)}`}
                      >
                        <option value="OPEN">Open</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                        {isAdmin && <option value="CLOSED">Closed</option>}
                      </select>
                    </td>
                    <td>
                      <span className={`priority-${task.priority?.toLowerCase()}`}>
                        {task.priority || 'MEDIUM'}
                      </span>
                    </td>
                    <td>
                      <span className="assigned-count">
                        {task.assignedMembers?.length || 0} member(s)
                      </span>
                    </td>
                    <td>{formatDate(task.dueDate)}</td>
                    <td>
                      <div className="action-buttons">
                        {isAdmin && (
                          <>
                            <button
                              className="action-btn"
                              onClick={() => openAssignModal(task)}
                              title="Assign Members"
                            >
                              <FiUsers />
                            </button>
                            <Link
                              to={`/tasks/${task.taskId}`}
                              className="action-btn"
                              title="Edit"
                            >
                              <FiEdit2 />
                            </Link>
                            <button
                              className="action-btn danger"
                              onClick={() => handleDeleteTask(task.taskId)}
                              title="Delete"
                            >
                              <FiTrash2 />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create New Task</h3>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                <FiX />
              </button>
            </div>
            <form onSubmit={handleCreateTask}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter task title"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-textarea"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter task description"
                    rows={4}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select
                      className="form-select"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Due Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Task Modal */}
      {showAssignModal && selectedTask && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Assign Task: {selectedTask.title}</h3>
              <button className="modal-close" onClick={() => setShowAssignModal(false)}>
                <FiX />
              </button>
            </div>
            <form onSubmit={handleAssignTask}>
              <div className="modal-body">
                <p className="assign-description">Select team members to assign this task:</p>
                <div className="member-list">
                  {users.length === 0 ? (
                    <p className="no-members">No members available</p>
                  ) : (
                    users.map((member) => (
                      <label key={member.userId} className="member-item">
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(member.userId)}
                          onChange={() => toggleMemberSelection(member.userId)}
                        />
                        <span className="member-avatar">
                          {(member.name || member.email).charAt(0).toUpperCase()}
                        </span>
                        <div className="member-info">
                          <span className="member-name">{member.name}</span>
                          <span className="member-email">{member.email}</span>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAssignModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Assign ({selectedMembers.length})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
