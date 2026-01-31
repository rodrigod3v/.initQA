import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Projects from './pages/Projects';
import Requests from './pages/Requests';
import Comparison from './pages/Comparison';
import Layout from './components/Layout';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null;

  return isAuthenticated ? <Layout>{children}</Layout> : <Navigate to="/login" />;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/projects"
        element={
          <ProtectedRoute>
            <Projects />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:projectId/requests"
        element={
          <ProtectedRoute>
            <Requests />
          </ProtectedRoute>
        }
      />
      {/* Redirect root to projects or login */}
      <Route path="/" element={<Navigate to="/projects" replace />} />
      {/* Fallback for requests/comparison placeholder */}
      <Route path="/requests" element={<Navigate to="/projects" replace />} />
      <Route path="/comparison" element={<ProtectedRoute><Comparison /></ProtectedRoute>} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
};

export default App;
