import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Home from './pages/Home';
import Projects from './pages/Projects';
import ProjectHub from './pages/ProjectHub';
import HttpRequestPage from './pages/HttpRequest';
import Comparison from './pages/Comparison';
import WebScenarios from './pages/WebScenarios';
import LoadTests from './pages/LoadTests';
import Layout from '@/shared/ui/Layout';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null;

  return isAuthenticated ? <Layout>{children}</Layout> : <Navigate to="/login" />;
};

const AppRoutes: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // When the component first mounts (on reload), 
    // if we are not at root, redirect to root.
    if (location.pathname !== '/') {
      navigate('/', { replace: true });
    }
  }, []); // Only run once on mount

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
        path="/projects/:projectId"
        element={
          <ProtectedRoute>
            <ProjectHub />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:projectId/requests"
        element={
          <ProtectedRoute>
            <HttpRequestPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:projectId/web"
        element={
          <ProtectedRoute>
            <WebScenarios />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:projectId/load"
        element={
          <ProtectedRoute>
            <LoadTests />
          </ProtectedRoute>
        }
      />
      <Route
        path="/automation"
        element={
          <ProtectedRoute>
            <WebScenarios />
          </ProtectedRoute>
        }
      />
      <Route
        path="/performance"
        element={
          <ProtectedRoute>
            <LoadTests />
          </ProtectedRoute>
        }
      />
      <Route
        path="/requests"
        element={
          <ProtectedRoute>
            <HttpRequestPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/comparison"
        element={
          <ProtectedRoute>
            <Comparison />
          </ProtectedRoute>
        }
      />
      {/* Home page as default route */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
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
