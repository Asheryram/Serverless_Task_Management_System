import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layout
import Header from './components/Layout/Header';
import Sidebar from './components/Layout/Sidebar';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import TaskDetail from './pages/TaskDetail';
import Users from './pages/Users';
import Profile from './pages/Profile';

// Styles
import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, isAuthenticated, isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      {isAuthenticated ? (
        <>
          <Header />
          <div className="app-layout">
            <Sidebar />
            <main className="main-content">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/tasks"
                  element={
                    <ProtectedRoute>
                      <Tasks />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/tasks/:taskId"
                  element={
                    <ProtectedRoute>
                      <TaskDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/users"
                  element={
                    <ProtectedRoute adminOnly>
                      <Users />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </main>
          </div>
        </>
      ) : (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      )}
    </div>
  );
}

export default App;
