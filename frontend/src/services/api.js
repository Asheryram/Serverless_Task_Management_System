import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';

const API_URL = process.env.REACT_APP_API_URL || 'https://q60vvgkbq2.execute-api.eu-central-1.amazonaws.com/dev';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      
      if (status === 401) {
        // Redirect to login
        window.location.href = '/login';
      }
      
      // Return error message from API
      const message = data?.message || 'An error occurred';
      return Promise.reject(new Error(message));
    }
    
    return Promise.reject(error);
  }
);

// ============================================================================
// TASK API
// ============================================================================

export const taskApi = {
  // Get all tasks
  getAll: async (params = {}) => {
    const response = await api.get('/tasks', { params });
    return response.data;
  },

  // Get single task
  getById: async (taskId) => {
    const response = await api.get(`/tasks/${taskId}`);
    return response.data;
  },

  // Create task (Admin only)
  create: async (taskData) => {
    const response = await api.post('/tasks', taskData);
    return response.data;
  },

  // Update task (Admin only)
  update: async (taskId, taskData) => {
    const response = await api.put(`/tasks/${taskId}`, taskData);
    return response.data;
  },

  // Delete task (Admin only)
  delete: async (taskId) => {
    const response = await api.delete(`/tasks/${taskId}`);
    return response.data;
  },

  // Assign task (Admin only)
  assign: async (taskId, memberIds) => {
    const response = await api.post(`/tasks/${taskId}/assign`, { memberIds });
    return response.data;
  },

  // Update task status
  updateStatus: async (taskId, status) => {
    const response = await api.put(`/tasks/${taskId}/status`, { status });
    return response.data;
  }
};

// ============================================================================
// USER API
// ============================================================================

export const userApi = {
  // Get all users (Admin only)
  getAll: async (params = {}) => {
    const response = await api.get('/users', { params });
    return response.data;
  },

  // Get users by group
  getByGroup: async (group) => {
    const response = await api.get('/users', { params: { group } });
    return response.data;
  },

  // Get members only
  getMembers: async () => {
    const response = await api.get('/users', { params: { group: 'Members' } });
    return response.data;
  }
};

export default api;
