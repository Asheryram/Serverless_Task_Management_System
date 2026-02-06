import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  FiArrowLeft, 
  FiEdit2, 
  FiTrash2, 
  FiCalendar, 
  FiFlag, 
  FiUsers,
  FiClock,
  FiCheckCircle,
  FiSave,
  FiX
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { taskApi, userApi } from '../services/api';
import './TaskDetail.css';

function TaskDetail() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.groups?.includes('Admins');

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [members, setMembers] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);

  const fetchTask = useCallback(async () => {
    try {
      setLoading(true);
      const response = await taskApi.getTask(taskId);
      setTask(response.data.task);
      setEditForm(response.data.task);
    } catch (error) {
      toast.error('Failed to load task');
      navigate('/tasks');
    } finally {
      setLoading(false);
    }
  }, [taskId, navigate]);

  const fetchMembers = useCallback(async () => {
    if (isAdmin) {
      try {
        const response = await userApi.getUsers();
        const membersList = response.data.users.filter(u => u.role === 'member');
        setMembers(membersList);
      } catch (error) {
        console.error('Error fetching members:', error);
      }
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchTask();
    fetchMembers();
  }, [fetchTask, fetchMembers]);

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      await taskApi.updateTask(taskId, {
        title: editForm.title,
        description: editForm.description,
        priority: editForm.priority,
        dueDate: editForm.dueDate
      });
      toast.success('Task updated successfully');
      setIsEditing(false);
      fetchTask();
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await taskApi.updateStatus(taskId, newStatus);
      toast.success('Status updated');
      fetchTask();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async () => {
    try {
      await taskApi.deleteTask(taskId);
      toast.success('Task deleted successfully');
      navigate('/tasks');
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  const handleAssignToggle = (memberId) => {
    setSelectedMembers(prev => 
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleAssignSubmit = async () => {
    try {
      await taskApi.assignTask(taskId, selectedMembers);
      toast.success('Task assigned successfully');
      setShowAssignModal(false);
      fetchTask();
    } catch (error) {
      toast.error('Failed to assign task');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadgeClass = (status) => {
    const statusClasses = {
      'open': 'badge-open',
      'in-progress': 'badge-in-progress',
      'completed': 'badge-completed',
      'closed': 'badge-closed'
    };
    return `status-badge ${statusClasses[status] || 'badge-open'}`;
  };

  const getPriorityBadgeClass = (priority) => {
    const priorityClasses = {
      'low': 'priority-low',
      'medium': 'priority-medium',
      'high': 'priority-high'
    };
    return `priority-badge ${priorityClasses[priority] || 'priority-medium'}`;
  };

  if (loading) {
    return (
      <div className="task-detail-page">
        <div className="loading-state">Loading task...</div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="task-detail-page">
        <div className="error-state">Task not found</div>
      </div>
    );
  }

  return (
    <div className="task-detail-page">
      {/* Header */}
      <div className="detail-header">
        <Link to="/tasks" className="back-link">
          <FiArrowLeft /> Back to Tasks
        </Link>
        <div className="header-actions">
          {isAdmin && (
            <>
              {isEditing ? (
                <>
                  <button className="btn btn-secondary" onClick={() => setIsEditing(false)}>
                    <FiX /> Cancel
                  </button>
                  <button className="btn btn-primary" onClick={handleSave}>
                    <FiSave /> Save Changes
                  </button>
                </>
              ) : (
                <>
                  <button className="btn btn-secondary" onClick={() => setShowAssignModal(true)}>
                    <FiUsers /> Assign
                  </button>
                  <button className="btn btn-secondary" onClick={() => setIsEditing(true)}>
                    <FiEdit2 /> Edit
                  </button>
                  <button className="btn btn-danger" onClick={() => setShowDeleteModal(true)}>
                    <FiTrash2 /> Delete
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Task Content */}
      <div className="task-content">
        <div className="task-main">
          {isEditing ? (
            <div className="edit-form">
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  name="title"
                  value={editForm.title || ''}
                  onChange={handleEditChange}
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={editForm.description || ''}
                  onChange={handleEditChange}
                  className="form-control"
                  rows={6}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Priority</label>
                  <select
                    name="priority"
                    value={editForm.priority || 'medium'}
                    onChange={handleEditChange}
                    className="form-control"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Due Date</label>
                  <input
                    type="date"
                    name="dueDate"
                    value={editForm.dueDate?.split('T')[0] || ''}
                    onChange={handleEditChange}
                    className="form-control"
                  />
                </div>
              </div>
            </div>
          ) : (
            <>
              <h1 className="task-title">{task.title}</h1>
              <div className="task-badges">
                <span className={getStatusBadgeClass(task.status)}>{task.status}</span>
                <span className={getPriorityBadgeClass(task.priority)}>
                  <FiFlag /> {task.priority}
                </span>
              </div>
              <div className="task-description-content">
                <h3>Description</h3>
                <p>{task.description || 'No description provided.'}</p>
              </div>
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="task-sidebar">
          <div className="sidebar-section">
            <h4>Status</h4>
            <select
              value={task.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className={`status-select-full ${getStatusBadgeClass(task.status)}`}
            >
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div className="sidebar-section">
            <h4><FiCalendar /> Due Date</h4>
            <p className="sidebar-value">{formatDate(task.dueDate)}</p>
          </div>

          <div className="sidebar-section">
            <h4><FiClock /> Created</h4>
            <p className="sidebar-value">{formatDate(task.createdAt)}</p>
          </div>

          <div className="sidebar-section">
            <h4><FiCheckCircle /> Updated</h4>
            <p className="sidebar-value">{formatDate(task.updatedAt)}</p>
          </div>

          <div className="sidebar-section">
            <h4><FiUsers /> Assigned Members</h4>
            {task.assignedMembers?.length > 0 ? (
              <ul className="assigned-list">
                {task.assignedMembers.map((member, index) => (
                  <li key={index} className="assigned-member">
                    <div className="member-avatar-small">
                      {member.name?.charAt(0) || member.email?.charAt(0) || '?'}
                    </div>
                    <span>{member.name || member.email}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="no-assigned">No members assigned</p>
            )}
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete Task</h2>
              <button className="close-btn" onClick={() => setShowDeleteModal(false)}>
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              <p className="delete-warning">
                Are you sure you want to delete <strong>"{task.title}"</strong>? 
                This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDelete}>
                Delete Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Assign Task</h2>
              <button className="close-btn" onClick={() => setShowAssignModal(false)}>
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              <p className="assign-description">
                Select team members to assign to this task:
              </p>
              <div className="member-list">
                {members.length > 0 ? (
                  members.map(member => (
                    <label key={member.userId} className="member-item">
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(member.userId)}
                        onChange={() => handleAssignToggle(member.userId)}
                      />
                      <div className="member-avatar">
                        {member.name?.charAt(0) || member.email?.charAt(0) || '?'}
                      </div>
                      <div className="member-info">
                        <span className="member-name">{member.name}</span>
                        <span className="member-email">{member.email}</span>
                      </div>
                    </label>
                  ))
                ) : (
                  <p className="no-members">No members available</p>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAssignModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleAssignSubmit}>
                Assign Selected
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TaskDetail;
