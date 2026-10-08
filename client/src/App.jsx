import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import LandingPage     from './pages/LandingPage';
import LoginPage       from './pages/LoginPage';
import RegisterPage    from './pages/RegisterPage';
import AppShell        from './components/AppShell';
import DashboardPage   from './pages/DashboardPage';
import ScenariosPage   from './pages/ScenariosPage';
import SimulationPage  from './pages/SimulationPage';
import HistoryPage     from './pages/HistoryPage';
import LeaderboardPage from './pages/LeaderboardPage';
import InstructorPage  from './pages/InstructorPage';
import NotFoundPage    from './pages/NotFoundPage';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="rv-loader" style={{ minHeight: '100vh' }}>
      <div className="rv-loader-ring" />
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="rv-loader" style={{ minHeight: '100vh' }}>
      <div className="rv-loader-ring" />
    </div>
  );
  return !user ? children : <Navigate to="/dashboard" replace />;
}

function RoleRoute({ children, roles = [] }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="rv-loader"><div className="rv-loader-ring" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* ── Public ─────────────────────────── */}
        <Route path="/"         element={<LandingPage />} />
        <Route path="/login"    element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
        <Route path="/scenarios" element={<ScenariosPage />} />

        {/* ── Protected shell ────────────────── */}
        <Route path="/" element={<PrivateRoute><AppShell /></PrivateRoute>}>
          <Route path="dashboard"   element={<DashboardPage />} />
          <Route path="history"     element={<HistoryPage />} />
          <Route path="leaderboard" element={<LeaderboardPage />} />
          <Route path="instructor"  element={
            <RoleRoute roles={['instructor','admin']}>
              <InstructorPage />
            </RoleRoute>
          } />
        </Route>

        {/* ── Simulation (own full layout) ────── */}
        <Route path="/simulate/:id" element={
          <PrivateRoute><SimulationPage /></PrivateRoute>
        } />

        {/* ── 404 ────────────────────────────── */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  );
}
